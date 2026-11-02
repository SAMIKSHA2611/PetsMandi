const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Pet = require('../models/Pet');
const PurchaseRequest = require('../models/PurchaseRequest');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.post('/setup', async (req, res) => {
  if (await User.exists({ role: 'ADMIN' })) return res.status(409).json({ message: 'Admin account already configured.' });
  if (!process.env.ADMIN_SETUP_TOKEN || req.headers['x-admin-setup-token'] !== process.env.ADMIN_SETUP_TOKEN) {
    return res.status(403).json({ message: 'Invalid admin setup token.' });
  }
  const { name, email, password } = req.body;
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') || !password || password.length < 12) {
    return res.status(400).json({ message: 'Provide a name, valid email and a password of at least 12 characters.' });
  }
  const existing = await User.findOne({ email: email.trim().toLowerCase() });
  if (existing) return res.status(409).json({ message: 'Email already registered.' });
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ name: name.trim(), email: email.trim().toLowerCase(), phone: `A${Date.now()}`.slice(-10), password: passwordHash, role: 'ADMIN', emailVerified: true });
  res.status(201).json({ success: true });
});

router.use(auth, admin);
router.get('/stats', async (req, res) => {
  res.json({
    users: await User.countDocuments(),
    pets: await Pet.countDocuments(),
    orders: await PurchaseRequest.countDocuments(),
    pendingListings: await Pet.countDocuments({ status: 'PENDING_APPROVAL' })
  });
});
router.get('/users', async (req, res) => res.json(await User.find().select('-password').sort({ createdAt: -1 }).lean()));
router.patch('/pets/:id/approve', async (req, res) => {
  const pet = await Pet.findByIdAndUpdate(req.params.id, { $set: { status: 'AVAILABLE', isSold: false } }, { new: true });
  if (!pet) return res.status(404).json({ message: 'Pet not found.' });
  res.json(pet);
});

module.exports = router;
