const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

router.get('/:petId/:otherUserId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      pet: req.params.petId,
      $or: [
        { sender: req.user.id, receiver: req.params.otherUserId },
        { sender: req.params.otherUserId, receiver: req.user.id }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;