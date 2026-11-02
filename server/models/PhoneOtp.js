const mongoose = require('mongoose');

const phoneOtpSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  purpose: { type: String, required: true, default: 'registration' },
  otpHash: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  expiresAt: { type: Date, required: true },
  resendAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  resendCount: { type: Number, default: 0 },
  consumed: { type: Boolean, default: false }
}, { timestamps: true });

phoneOtpSchema.index({ phone: 1, purpose: 1 }, { unique: true });
phoneOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PhoneOtp', phoneOtpSchema);
