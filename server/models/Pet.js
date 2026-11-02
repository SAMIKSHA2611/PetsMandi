const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true, enum: ['Dog', 'Cat', 'Bird', 'Fish', 'Other'] },
  breed: { type: String, required: true },
  age: { type: Number, required: true },
  price: { type: Number, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  images: [{ type: String }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['AVAILABLE', 'RESERVED', 'SOLD'], default: 'AVAILABLE' },
  isSold: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Pet', petSchema);