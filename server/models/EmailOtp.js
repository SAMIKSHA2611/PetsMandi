const mongoose = require('mongoose');

const emailOtpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  purpose: { type: String, enum: ['registration', 'password-reset'], required: true, default: 'registration' },
  otpHash: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  expiresAt: { type: Date, required: true },
  resendAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  resendCount: { type: Number, default: 0 },
  consumed: { type: Boolean, default: false }
}, { timestamps: true });

emailOtpSchema.index({ email: 1, purpose: 1 }, { unique: true });
emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmailOtp', emailOtpSchema);
