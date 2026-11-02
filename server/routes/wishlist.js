const express = require('express');
const auth = require('../middleware/auth');
const Pet = require('../models/Pet');
const Wishlist = require('../models/Wishlist');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const items = await Wishlist.find({ user: req.user.id })
    .populate('pet')
    .sort({ createdAt: -1 });
  res.json(items.map((item) => item.pet).filter(Boolean));
});

router.get('/:petId', async (req, res) => {
  res.json({ saved: Boolean(await Wishlist.exists({ user: req.user.id, pet: req.params.petId })) });
});

router.put('/:petId', async (req, res) => {
  if (!await Pet.exists({ _id: req.params.petId })) return res.status(404).json({ message: 'Pet listing not found.' });
  await Wishlist.updateOne(
    { user: req.user.id, pet: req.params.petId },
    { $setOnInsert: { user: req.user.id, pet: req.params.petId } },
    { upsert: true }
  );
  res.json({ saved: true });
});

router.delete('/:petId', async (req, res) => {
  await Wishlist.deleteOne({ user: req.user.id, pet: req.params.petId });
  res.json({ saved: false });
});

module.exports = router;
