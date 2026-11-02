const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const EmailOtp = require('../models/EmailOtp');
const { encrypt } = require('../utils/paymentEncryption');
const { decrypt } = require('../utils/paymentEncryption');

const router = express.Router();
const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const loginAttempts = new Map();

function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

function isStrongPassword(password = '') {
  return password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) &&
    /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

function validateRegistration(body) {
  const name = (body.name || '').trim();
  const email = normalizeEmail(body.email);
  const phone = String(body.phone || '').trim();
  if (!/^[A-Za-z\s]+$/.test(name)) return 'Enter a valid full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  if (!/^([6-9]\d{9})$/.test(phone)) return 'Enter a valid 10-digit Indian mobile number.';
  if (!isStrongPassword(body.password || '')) return 'Password does not meet the security requirements.';
  if (body.password !== body.confirmPassword) return 'Passwords do not match.';
  if (!['UPI', 'BANK_TRANSFER'].includes(body.paymentPreference)) return 'Choose a valid digital payment preference.';
  if (body.paymentPreference === 'UPI' && !/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(body.upiId || '')) return 'Enter a valid UPI ID.';
  if (body.paymentPreference === 'BANK_TRANSFER') {
    if (!/^[A-Za-z\s]{2,}$/.test(body.accountHolder || '')) return 'Enter a valid account holder name.';
    if (!/^\d{9,18}$/.test(body.accountNumber || '')) return 'Enter a valid bank account number.';
    if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(body.ifsc || '')) return 'Enter a valid IFSC code.';
  }
  return null;
}

function otpHash(email, purpose, otp) {
  return crypto.createHash('sha256').update(`${email}:${purpose}:${otp}`).digest('hex');
}

function createToken(user) {
  return jwt.sign({ id: user._id, name: user.name, role: user.role || 'USER' }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function sendOtpEmail(email, otp, purpose) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { delivered: false, devOtp: process.env.NODE_ENV === 'production' ? undefined : otp };
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: purpose === 'registration' ? 'Verify your PetsMandi account' : 'Reset your PetsMandi password',
    text: `Your PetsMandi verification code is ${otp}. It expires in 5 minutes and can be used once.`,
    html: `<p>Your PetsMandi verification code is <strong>${otp}</strong>.</p><p>It expires in 5 minutes and can be used once.</p>`
  });
  return { delivered: true };
}

async function issueOtp(email, purpose, payload = {}) {
  const now = new Date();
  const existing = await EmailOtp.findOne({ email, purpose });
  if (existing?.resendAt > now) {
    if (existing.resendCount >= 5) {
      const error = new Error('OTP resend limit reached. Please try again later.');
      error.status = 429;
      throw error;
    }
    const error = new Error('Please wait before requesting another OTP.');
    error.status = 429;
    throw error;
  }

  const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await EmailOtp.findOneAndUpdate(
    { email, purpose },
    {
      otpHash: otpHash(email, purpose, otp),
      payload,
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      resendAt: new Date(now.getTime() + RESEND_COOLDOWN_MS),
      attempts: 0,
      resendCount: (existing?.resendCount || 0) + 1,
      consumed: false
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const delivery = await sendOtpEmail(email, otp, purpose);
  return delivery;
}

router.post('/send-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (await User.exists({ email })) return res.status(409).json({ message: 'Email is already registered.' });
    if (req.body.phone && await User.exists({ phone: String(req.body.phone).trim() })) {
      return res.status(409).json({ message: 'Mobile number is already registered.' });
    }
    const delivery = await issueOtp(email, 'registration', {
      name: (req.body.name || '').trim(),
      phone: String(req.body.phone || '').trim(),
      password: req.body.password || '',
      confirmPassword: req.body.confirmPassword || ''
    });
    res.json({
      success: true,
      message: delivery?.delivered ? 'OTP sent successfully.' : 'System OTP generated. Enter the code below.',
      ...(delivery?.devOtp ? { devOtp: delivery.devOtp } : {})
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Unable to send OTP.' });
  }
});

router.post('/verify-email-otp', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || '');
  const record = await EmailOtp.findOne({ email, purpose: 'registration' });
  if (!record || record.consumed) return res.status(400).json({ message: 'Please request a new OTP.' });
  if (record.expiresAt <= new Date()) return res.status(400).json({ message: 'OTP expired.' });
  if (record.attempts >= MAX_ATTEMPTS) return res.status(429).json({ message: 'Too many incorrect OTP attempts. Please request a new OTP.' });
  if (!/^\d{6}$/.test(otp)) return res.status(400).json({ message: 'Invalid OTP.' });
  if (record.otpHash !== otpHash(email, 'registration', otp)) {
    record.attempts += 1;
    await record.save();
    return res.status(400).json({ message: 'Invalid OTP.' });
  }
  record.consumed = true;
  await record.save();
  res.json({ success: true, message: 'Email verified successfully.' });
});

router.post('/register', async (req, res) => {
  try {
    const validationError = validateRegistration(req.body);
    if (validationError) return res.status(400).json({ message: validationError });
    const email = normalizeEmail(req.body.email);
    const phone = String(req.body.phone).trim();
    if (await User.exists({ email })) return res.status(409).json({ message: 'Email already registered.' });
    if (await User.exists({ phone })) return res.status(409).json({ message: 'Mobile number already registered.' });
    const verification = await EmailOtp.findOne({ email, purpose: 'registration', consumed: true });
    if (!verification || verification.payload?.phone !== phone) {
      return res.status(403).json({ message: 'Please verify your email before creating an account.' });
    }
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await User.create({
      name: req.body.name.trim(),
      email,
      phone,
      password: passwordHash,
      emailVerified: true,
      paymentPreference: req.body.paymentPreference,
      upiIdEncrypted: req.body.paymentPreference === 'UPI' ? encrypt(req.body.upiId.trim()) : '',
      bankHolderEncrypted: req.body.paymentPreference === 'BANK_TRANSFER' ? encrypt(req.body.accountHolder.trim()) : '',
      bankAccountEncrypted: req.body.paymentPreference === 'BANK_TRANSFER' ? encrypt(req.body.accountNumber.trim()) : '',
      bankIfscEncrypted: req.body.paymentPreference === 'BANK_TRANSFER' ? encrypt(req.body.ifsc.trim().toUpperCase()) : ''
    });
    await EmailOtp.deleteOne({ _id: verification._id });
    const token = createToken(user);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (err) {
    res.status(409).json({ message: err.code === 11000 ? 'Email or mobile number already registered.' : err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || '').trim().toLowerCase();
    const key = identifier || req.ip;
    const now = Date.now();
    const attempt = loginAttempts.get(key);
    if (attempt && attempt.count >= 10 && now < attempt.until) {
      return res.status(429).json({ message: 'Too many login attempts. Please try again later.' });
    }
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }]
    });
    if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) {
      const next = !attempt || now >= attempt.until ? { count: 1, until: now + 15 * 60 * 1000 } : { ...attempt, count: attempt.count + 1 };
      loginAttempts.set(key, next);
      return res.status(401).json({ message: 'Invalid email/mobile or password.' });
    }
    if (user.emailVerified === false) return res.status(403).json({ message: 'Please verify your email before logging in.' });
    loginAttempts.delete(key);
    const token = createToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role || 'USER' } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const user = await User.findOne({ email });
  if (user) {
    try {
      const delivery = await issueOtp(email, 'password-reset');
      if (delivery?.devOtp) {
        return res.json({
          success: true,
          message: 'System OTP generated. Enter the code below.',
          devOtp: delivery.devOtp
        });
      }
    } catch (err) {
      if (err.status) return res.status(err.status).json({ message: err.message });
      throw err;
    }
  }
  res.json({ success: true, message: 'If the email is registered, a verification OTP has been sent.' });
});

router.post('/verify-reset-otp', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || '');
  const record = await EmailOtp.findOne({ email, purpose: 'password-reset' });
  if (!record || record.consumed) return res.status(400).json({ message: 'Please request a new reset OTP.' });
  if (record.expiresAt <= new Date()) return res.status(400).json({ message: 'OTP expired.' });
  if (record.attempts >= MAX_ATTEMPTS) return res.status(429).json({ message: 'Too many incorrect OTP attempts.' });
  if (!/^\d{6}$/.test(otp) || record.otpHash !== otpHash(email, 'password-reset', otp)) {
    record.attempts += 1;
    await record.save();
    return res.status(400).json({ message: 'Invalid OTP.' });
  }
  record.consumed = true;
  await record.save();
  res.json({ success: true, message: 'Identity verified.' });
});

router.post('/reset-password', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = req.body.password || '';
  if (!isStrongPassword(password)) return res.status(400).json({ message: 'Password does not meet the security requirements.' });
  if (password !== req.body.confirmPassword) return res.status(400).json({ message: 'Passwords do not match.' });
  const verification = await EmailOtp.findOne({ email, purpose: 'password-reset', consumed: true });
  if (!verification) return res.status(403).json({ message: 'Verify the reset OTP before changing your password.' });
  await User.updateOne({ email }, { $set: { password: await bcrypt.hash(password, 12) } });
  await EmailOtp.deleteOne({ _id: verification._id });
  res.json({ success: true, message: 'Password reset successfully.' });
});

router.get('/payment-preference', async (req, res) => {
  const auth = require('../middleware/auth');
  return auth(req, res, async () => {
    const user = await User.findById(req.user.id).select('paymentPreference upiIdEncrypted bankHolderEncrypted bankAccountEncrypted bankIfscEncrypted upiQrCode acceptedPaymentMethods');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({
      paymentPreference: ['UPI', 'BANK_TRANSFER'].includes(user.paymentPreference) ? user.paymentPreference : 'UPI',
      upiId: decrypt(user.upiIdEncrypted),
      accountHolder: decrypt(user.bankHolderEncrypted),
      accountNumber: decrypt(user.bankAccountEncrypted),
      ifsc: decrypt(user.bankIfscEncrypted),
      upiQrCode: user.upiQrCode || '',
      acceptedPaymentMethods: user.acceptedPaymentMethods || []
    });
  });
});

router.put('/payment-preference', async (req, res) => {
  const auth = require('../middleware/auth');
  return auth(req, res, async () => {
    const { paymentPreference, upiId, accountHolder, accountNumber, ifsc, upiQrCode, acceptedPaymentMethods } = req.body;
    if (!['UPI', 'BANK_TRANSFER'].includes(paymentPreference)) return res.status(400).json({ message: 'Cash on delivery is not available. Choose UPI or bank transfer.' });
    if (paymentPreference === 'UPI' && !/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(upiId || '')) return res.status(400).json({ message: 'Enter a valid UPI ID.' });
    if (paymentPreference === 'BANK_TRANSFER' && (!/^[A-Za-z\s]{2,}$/.test(accountHolder || '') || !/^\d{9,18}$/.test(accountNumber || '') || !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifsc || ''))) {
      return res.status(400).json({ message: 'Enter valid bank account details.' });
    }
    await User.findByIdAndUpdate(req.user.id, {
      paymentPreference,
      upiIdEncrypted: paymentPreference === 'UPI' ? encrypt(upiId.trim()) : '',
      bankHolderEncrypted: paymentPreference === 'BANK_TRANSFER' ? encrypt(accountHolder.trim()) : '',
      bankAccountEncrypted: paymentPreference === 'BANK_TRANSFER' ? encrypt(accountNumber.trim()) : '',
      bankIfscEncrypted: paymentPreference === 'BANK_TRANSFER' ? encrypt(ifsc.trim().toUpperCase()) : '',
      upiQrCode: typeof upiQrCode === 'string' ? upiQrCode.trim() : '',
      acceptedPaymentMethods: Array.isArray(acceptedPaymentMethods) ? acceptedPaymentMethods.filter((method) => ['UPI', 'BANK_TRANSFER'].includes(method)) : [paymentPreference]
    });
    res.json({ success: true, message: 'Payment preference saved.' });
  });
});

module.exports = router;
