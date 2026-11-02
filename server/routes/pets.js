const express = require('express');
const router = express.Router();
const Pet = require('../models/Pet');
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { category, search, location } = req.query;
    let query = {};
    if (category && category !== 'All') query.category = category;
    if (search) query.title = { $regex: search, $options: 'i' };
    if (location) query.location = { $regex: location, $options: 'i' };

    const pets = await Pet.find(query).populate('owner', 'name phone city').sort({ createdAt: -1 });
    res.json(pets.map((pet) => {
      if (pet.isSold || pet.status === 'SOLD') {
        pet.owner.phone = undefined;
      }
      return pet;
    }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my-pets', auth, async (req, res) => {
  try {
    const pets = await Pet.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json(pets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id).populate('owner', 'name phone city email');
    if (!pet) return res.status(404).json({ message: 'Pet not found' });
    if (pet.isSold || pet.status === 'SOLD') {
      pet.owner.phone = undefined;
    }
    res.json(pet);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, category, breed, age, price, location, description, images } = req.body;
    const pet = new Pet({
      title,
      category,
      breed,
      age: Number(age),
      price: Number(price),
      location,
      description,
      images: images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600'],
      owner: req.user.id
    });
    await pet.save();
    res.status(201).json(pet);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;