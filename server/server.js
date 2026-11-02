const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Message = require('./models/Message');
const Pet = require('./models/Pet');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/pets', require('./routes/pets'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/purchase-requests', require('./routes/purchaseRequests'));
app.use('/api/wishlist', require('./routes/wishlist'));

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  socket.on('join_chat', ({ petId, userId }) => {
    socket.join(`${petId}_${userId}`);
  });

  socket.on('send_message', async (data) => {
    const { sender, receiver, pet, content } = data;
    const listing = await Pet.findById(pet);
    if (!listing) return socket.emit('chat_error', { message: 'This post is no longer available.' });
    if (listing.isSold && listing.owner.toString() !== sender.toString()) {
      return socket.emit('chat_error', { message: 'This post has been sold. New enquiries are no longer accepted.' });
    }
    const newMessage = new Message({ sender, receiver, pet, content });
    await newMessage.save();

    io.emit(`receive_message_${pet}`, newMessage);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`PetsMandi Server running on port ${PORT}`));