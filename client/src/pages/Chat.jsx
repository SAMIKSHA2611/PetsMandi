import { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const socket = io('http://localhost:5000');

export default function Chat() {
  const { petId, otherUserId } = useParams();
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [pet, setPet] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:5000/api/chat/${petId}/${otherUserId}`)
      .then((res) => setMessages(res.data))
      .catch((err) => console.error(err));
    axios.get(`http://localhost:5000/api/pets/${petId}`)
      .then((res) => setPet(res.data))
      .catch((err) => console.error(err));

    socket.emit('join_chat', { petId, userId: user.id });

    socket.on(`receive_message_${petId}`, (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    socket.on('chat_error', (error) => {
      alert(error.message);
    });

    return () => {
      socket.off(`receive_message_${petId}`);
      socket.off('chat_error');
    };
  }, [petId, otherUserId]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    socket.emit('send_message', {
      sender: user.id,
      receiver: otherUserId,
      pet: petId,
      content: text
    });
    setText('');
  };

  return (
    <div className="min-h-screen bg-olxLightGray flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col">
        <div className="bg-white border border-gray-300 rounded shadow-sm flex flex-col h-[600px] overflow-hidden">
          <div className="bg-olxNavy text-white p-4 font-extrabold text-lg flex items-center justify-between">
            <span>In-App Pet Enquiry Chat</span>
            <span className="text-xs bg-cyan-700 px-2 py-1 rounded">Live Socket.IO</span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-olxLightGray">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === user.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-lg max-w-xs text-sm ${m.sender === user.id ? 'bg-olxNavy text-white' : 'bg-white border text-olxNavy shadow-xs'}`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          {pet?.isSold && String(pet.owner?._id) !== String(user?.id) ? (
            <div className="p-4 bg-red-50 border-t border-red-200 text-sm text-red-700 font-bold text-center">
              This post has been sold. New enquiries are no longer accepted.
            </div>
          ) : (
          <form onSubmit={sendMessage} className="p-3 bg-white border-t flex gap-2">
            <input
              type="text"
              className="flex-1 border-2 border-olxNavy rounded px-3 py-2 text-sm outline-none"
              placeholder="Ask pet owner a question..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="bg-olxYellow text-olxNavy font-extrabold px-6 py-2 rounded hover:bg-olxHoverYellow transition">
              Send
            </button>
          </form>
          )}
        </div>
      </main>
    </div>
  );
}