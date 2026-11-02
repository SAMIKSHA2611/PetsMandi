const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseRequest', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  amount: { type: Number, required: true },
  amountPaise: { type: Number, required: true, min: 1 },
  paymentId: { type: String, required: true, unique: true, index: true },
  paymentMethod: { type: String, enum: ['UPI', 'BANK_TRANSFER'], required: true },
  status: {
    type: String,
    enum: ['PAYMENT_IN_PROGRESS', 'PAYMENT_CONFIRMED', 'PAYMENT_NOT_VERIFIED'],
    default: 'PAYMENT_IN_PROGRESS'
  },
  submittedAt: { type: Date, default: Date.now },
  confirmedAt: Date,
  rejectedAt: Date,
  rejectionReason: String,
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verificationAudit: [{
    action: String,
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

paymentRequestSchema.pre('validate', function () {
  if ((!Number.isFinite(this.amountPaise) || this.amountPaise < 1) && Number.isFinite(Number(this.amount))) {
    this.amountPaise = Math.round(Number(this.amount) * 100);
  }
  if (!this.paymentId) this.paymentId = `PMP-${new mongoose.Types.ObjectId().toString().toUpperCase()}`;
});

paymentRequestSchema.index({ orderId: 1 }, { unique: true });
paymentRequestSchema.index({ sellerId: 1, status: 1 });

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);
