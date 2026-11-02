const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  city: { type: String, default: '' },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
  emailVerified: { type: Boolean, default: true },
  paymentPreference: { type: String, enum: ['UPI', 'BANK_TRANSFER'], default: 'UPI' },
  upiQrCode: { type: String, default: '' },
  acceptedPaymentMethods: [{ type: String, enum: ['UPI', 'BANK_TRANSFER'] }],
  upiIdEncrypted: String,
  bankHolderEncrypted: String,
  bankAccountEncrypted: String,
  bankIfscEncrypted: String,
  sharePaymentDetails: { type: Boolean, default: false },
  loginAttempts: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);