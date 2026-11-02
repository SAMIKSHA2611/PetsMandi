const express = require('express');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Pet = require('../models/Pet');
const User = require('../models/User');
const PurchaseRequest = require('../models/PurchaseRequest');
const PaymentRequest = require('../models/PaymentRequest');
const Notification = require('../models/Notification');
const { decrypt } = require('../utils/paymentEncryption');

const router = express.Router();
router.use(auth);

const rupeesToPaise = (amount) => Math.round(Number(amount) * 100);
const publicId = (prefix) => `${prefix}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

router.get('/', async (req, res) => {
  const requests = await PurchaseRequest.find({ $or: [{ buyer: req.user.id }, { seller: req.user.id }] })
    .populate('buyer', 'name email phone')
    .populate('seller', 'name email')
    .populate('pet', 'title price images owner isSold status')
    .sort({ createdAt: -1 });
  res.json(requests);
});

router.get('/for-listing/:petId', async (req, res) => {
  const request = await PurchaseRequest.findOne({
    pet: req.params.petId,
    $or: [{ buyer: req.user.id }, { seller: req.user.id }],
    status: { $nin: ['REJECTED', 'COMPLETED'] }
  }).sort({ createdAt: -1 });
  res.json(request || null);
});

router.post('/', async (req, res) => {
  try {
    const pet = await Pet.findById(req.body.petId);
    if (!pet) return res.status(404).json({ message: 'Pet listing not found.' });
    if (pet.owner.toString() === req.user.id) return res.status(403).json({ message: 'You cannot request your own listing.' });
    if (pet.isSold || pet.status === 'SOLD' || pet.status === 'RESERVED') return res.status(409).json({ message: 'This pet is not available for new orders.' });

    const reserved = await Pet.findOneAndUpdate(
      { _id: pet._id, owner: { $ne: req.user.id }, isSold: { $ne: true }, status: { $ne: 'RESERVED' } },
      { $set: { status: 'RESERVED' } },
      { new: true }
    );
    if (!reserved) return res.status(409).json({ message: 'This pet was reserved by another buyer.' });

    const amount = Number(pet.price);
    const order = await PurchaseRequest.create({
      buyer: req.user.id,
      seller: pet.owner,
      pet: pet._id,
      amount,
      amountPaise: rupeesToPaise(amount),
      orderId: publicId('PMO'),
      status: 'APPROVED',
      paymentStatus: 'PAYMENT_PENDING',
      orderStatus: 'PENDING_PAYMENT',
      statusHistory: [{ status: 'Accepted', note: 'Listing reserved and payment order created.', changedBy: req.user.id }],
      auditLog: [{ action: 'ORDER_CREATED', actor: req.user.id, note: 'Order created and listing reserved atomically.' }]
    });

    await Notification.create({
      user: pet.owner,
      title: 'New purchase request',
      message: `A buyer placed an order for ${pet.title}.`,
      type: 'ORDER',
      link: '/profile'
    });
    res.status(201).json(order);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'An active order already exists for this listing.' });
    res.status(500).json({ message: err.message });
  }
});

router.get('/:requestId/payment-details', async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.requestId);
  if (!request || ![request.buyer.toString(), request.seller.toString()].includes(req.user.id)) return res.status(403).json({ message: 'You cannot view these transaction details.' });
  const seller = await User.findById(request.seller).select('name paymentPreference upiIdEncrypted bankHolderEncrypted bankAccountEncrypted bankIfscEncrypted upiQrCode acceptedPaymentMethods');
  const methods = (seller.acceptedPaymentMethods || []).filter((value) => ['UPI', 'BANK_TRANSFER'].includes(value));
  if (!methods.length && ['UPI', 'BANK_TRANSFER'].includes(seller.paymentPreference)) methods.push(seller.paymentPreference);
  const paymentPreference = methods[0] || (seller.paymentPreference === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'UPI');
  const response = {
    orderId: request.orderId,
    amount: request.amount,
    sellerName: seller.name,
    paymentMethods: methods.length ? methods : [paymentPreference],
    paymentPreference,
    upiQrCode: seller.upiQrCode || ''
  };
  if (methods.includes('UPI')) response.upiId = decrypt(seller.upiIdEncrypted);
  if (methods.includes('BANK_TRANSFER')) {
    response.accountHolder = decrypt(seller.bankHolderEncrypted);
    response.accountNumber = decrypt(seller.bankAccountEncrypted);
    response.bankIfsc = decrypt(seller.bankIfscEncrypted);
  }
  response.warning = 'Pay directly to the seller. PetsMandi never requests your UPI PIN, banking password or OTP.';
  res.json(response);
});

router.post('/:requestId/payment-made', async (req, res) => {
  const request = await PurchaseRequest.findOne({ _id: req.params.requestId, buyer: req.user.id });
  if (!request) return res.status(404).json({ message: 'Order not found.' });
  if (!['APPROVED', 'PAYMENT_NOT_VERIFIED'].includes(request.status)) return res.status(409).json({ message: 'Payment has already been submitted or the order cannot accept payment.' });
  if (request.paymentStatus === 'PAYMENT_IN_PROGRESS') return res.status(409).json({ message: 'Payment request is already awaiting seller verification.' });

  const paymentMethod = String(req.body.paymentMethod || '').toUpperCase();
  if (!['UPI', 'BANK_TRANSFER'].includes(paymentMethod)) return res.status(400).json({ message: 'Select UPI or bank transfer.' });

  let payment;
  try {
    payment = await PaymentRequest.create({
      orderId: request._id,
      buyerId: request.buyer,
      sellerId: request.seller,
      listingId: request.pet,
      amount: request.amount,
      amountPaise: Number.isFinite(request.amountPaise) ? request.amountPaise : rupeesToPaise(request.amount),
      paymentId: publicId('PMP'),
      paymentMethod,
      status: 'PAYMENT_IN_PROGRESS',
      submittedAt: new Date(),
      verificationAudit: [{ action: 'BUYER_PAYMENT_CLAIMED', actor: req.user.id }]
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'This payment request already exists.' });
    throw err;
  }

  request.status = 'PAYMENT_MARKED';
  request.paymentStatus = 'PAYMENT_IN_PROGRESS';
  request.orderStatus = 'AWAITING_SELLER_PAYMENT_CONFIRMATION';
  request.paymentMethod = paymentMethod;
  request.paymentSubmittedAt = payment.submittedAt;
  request.auditLog.push({ action: 'BUYER_PAYMENT_CLAIMED', actor: req.user.id });
  await request.save();
  await Notification.create({
    user: request.seller,
    title: 'Payment notification received',
    message: `The buyer claims payment for order ${request.orderId}. Verify it in your account.`,
    type: 'PAYMENT',
    link: '/profile'
  });
  res.json({ success: true, order: request, payment });
});

router.get('/payment-requests/seller', async (req, res) => {
  const payments = await PaymentRequest.find({ sellerId: req.user.id })
    .populate('buyerId', 'name email phone')
    .populate('listingId', 'title price')
    .sort({ createdAt: -1 });
  res.json(payments);
});

router.patch('/:requestId/payment-confirmation', async (req, res) => {
  const request = await PurchaseRequest.findOne({ _id: req.params.requestId, seller: req.user.id, status: 'PAYMENT_MARKED' });
  if (!request) return res.status(404).json({ message: 'Payment request not found.' });
  const payment = await PaymentRequest.findOne({ orderId: request._id });
  if (!payment || payment.status !== 'PAYMENT_IN_PROGRESS') return res.status(409).json({ message: 'This payment request cannot be verified.' });
  const verified = req.body.confirmed === true;

  const now = new Date();
  payment.status = verified ? 'PAYMENT_CONFIRMED' : 'PAYMENT_NOT_VERIFIED';
  payment.verificationAudit.push({ action: verified ? 'PAYMENT_RECEIVED' : 'PAYMENT_NOT_RECEIVED', actor: req.user.id });
  if (verified) {
    payment.confirmedAt = now;
    payment.confirmedBy = req.user.id;
  } else {
    payment.rejectedAt = now;
    payment.rejectionReason = String(req.body.reason || 'Seller did not receive payment.');
  }
  await payment.save();

  if (verified) {
    const sold = await Pet.findOneAndUpdate(
      { _id: request.pet, status: { $ne: 'SOLD' } },
      { $set: { status: 'SOLD', isSold: true } },
      { new: true }
    );
    if (!sold) return res.status(409).json({ message: 'Listing has already been sold.' });
  }

  request.status = verified ? 'PAYMENT_CONFIRMED' : 'PAYMENT_NOT_VERIFIED';
  request.paymentStatus = verified ? 'PAYMENT_CONFIRMED' : 'PAYMENT_NOT_VERIFIED';
  request.orderStatus = verified ? 'CONFIRMED' : 'PAYMENT_NOT_VERIFIED';
  request.paymentConfirmedAt = verified ? now : undefined;
  request.paymentConfirmedBy = verified ? req.user.id : undefined;
  request.paymentRejectedAt = verified ? undefined : now;
  request.paymentRejectionReason = verified ? undefined : String(req.body.reason || '');
  request.auditLog.push({ action: verified ? 'PAYMENT_RECEIVED' : 'PAYMENT_NOT_RECEIVED', actor: req.user.id });
  await request.save();
  await Notification.create({
    user: request.buyer,
    title: verified ? 'Payment confirmed' : 'Payment needs resolution',
    message: verified ? `Payment confirmed for order ${request.orderId}.` : `The seller could not verify payment for order ${request.orderId}.`,
    type: verified ? 'PAYMENT' : 'PAYMENT_NOT_VERIFIED',
    link: '/profile'
  });
  res.json({ success: true, order: request, payment });
});

router.patch('/:requestId/handover', async (req, res) => {
  const request = await PurchaseRequest.findOne({ _id: req.params.requestId, buyer: req.user.id, status: 'PAYMENT_CONFIRMED' });
  if (!request) return res.status(404).json({ message: 'Only the buyer can confirm a verified handover.' });
  request.status = 'COMPLETED';
  request.paymentStatus = 'ORDER_COMPLETED';
  request.orderStatus = 'COMPLETED';
  request.handoverConfirmedAt = new Date();
  request.handoverConfirmedBy = req.user.id;
  request.auditLog.push({ action: 'PET_RECEIVED', actor: req.user.id });
  await request.save();
  await Notification.create({ user: request.seller, title: 'Pet handover confirmed', message: `The buyer confirmed receipt for order ${request.orderId}.`, type: 'ORDER', link: '/profile' });
  res.json(request);
});

router.patch('/:requestId/status', async (req, res) => {
  if (req.body.action !== 'CANCEL') return res.status(400).json({ message: 'Invalid transaction action.' });
  const request = await PurchaseRequest.findOne({
    _id: req.params.requestId,
    $or: [{ buyer: req.user.id }, { seller: req.user.id }],
    status: { $nin: ['COMPLETED', 'PAYMENT_CONFIRMED', 'REJECTED'] },
    orderStatus: { $nin: ['COMPLETED', 'CONFIRMED', 'CANCELLED'] }
  });
  if (!request) return res.status(409).json({ message: 'Completed or confirmed orders cannot be cancelled.' });

  request.status = 'REJECTED';
  request.paymentStatus = 'ORDER_CANCELLED';
  request.orderStatus = 'CANCELLED';
  request.auditLog.push({ action: 'ORDER_CANCELLED', actor: req.user.id });
  await request.save();
  await Pet.updateOne(
    { _id: request.pet, status: 'RESERVED' },
    { $set: { status: 'AVAILABLE', isSold: false } }
  );
  res.json(request);
});

router.patch('/:requestId/:decision', async (req, res) => {
  if (!['approve', 'reject'].includes(req.params.decision)) return res.status(400).json({ message: 'Invalid decision.' });
  res.status(409).json({ message: 'New orders are reserved immediately. This purchase-request decision is no longer required.' });
});

module.exports = router;
