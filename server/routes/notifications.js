const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

router.get('/', auth, async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100);
  res.json(notifications);
});

router.patch('/:id/read', auth, async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user.id }, { $set: { read: true } });
  res.json({ success: true });
});

module.exports = router;
