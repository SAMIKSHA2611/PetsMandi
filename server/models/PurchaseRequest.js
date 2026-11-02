const mongoose = require('mongoose');

const purchaseRequestSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  amount: { type: Number, required: true, min: 1 },
  amountPaise: { type: Number, required: true, min: 1 },
  orderId: { type: String, required: true, unique: true, index: true },
  paymentMethod: { type: String, enum: ['UPI', 'BANK_TRANSFER'] },
  paymentSubmittedAt: Date,
  paymentConfirmedAt: Date,
  paymentRejectedAt: Date,
  paymentDetailsShared: { type: Boolean, default: false },
  paymentRejectionReason: String,
  paymentConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  handoverConfirmedAt: Date,
  handoverConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderStatus: { type: String, enum: ['PENDING_PAYMENT', 'AWAITING_SELLER_PAYMENT_CONFIRMATION', 'CONFIRMED', 'PAYMENT_NOT_VERIFIED', 'COMPLETED', 'CANCELLED'], default: 'PENDING_PAYMENT' },
  paymentStatus: {
    type: String,
    enum: ['PAYMENT_PENDING', 'CASH_PAYMENT_PENDING', 'PAYMENT_IN_PROGRESS', 'PAYMENT_CONFIRMED', 'PAYMENT_NOT_VERIFIED', 'PAYMENT_REJECTED', 'ORDER_COMPLETED', 'ORDER_CANCELLED'],
    default: 'PAYMENT_PENDING'
  },
  statusHistory: [{
    status: String,
    note: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAYMENT_MARKED', 'PAYMENT_CONFIRMED', 'PAYMENT_NOT_VERIFIED', 'COMPLETED'],
    default: 'PENDING'
  },
  auditLog: [{
    action: { type: String, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

purchaseRequestSchema.pre('validate', function () {
  if ((!Number.isFinite(this.amountPaise) || this.amountPaise < 1) && Number.isFinite(Number(this.amount))) {
    this.amountPaise = Math.round(Number(this.amount) * 100);
  }
  if (!this.orderId) this.orderId = `PMO-${new mongoose.Types.ObjectId().toString().toUpperCase()}`;
});

purchaseRequestSchema.index(
  { pet: 1 },
  { unique: true, partialFilterExpression: { status: 'APPROVED' } }
);

module.exports = mongoose.model('PurchaseRequest', purchaseRequestSchema);