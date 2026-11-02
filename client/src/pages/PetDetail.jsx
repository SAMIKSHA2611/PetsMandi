import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Phone, MessageCircle, ShieldCheck, ChevronRight, Share2, Heart } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function PetDetail() {
  const { id } = useParams();
  const [pet, setPet] = useState(null);
  const [showPhone, setShowPhone] = useState(false);
  const [order, setOrder] = useState(null);
  const [wishlisted, setWishlisted] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`http://localhost:5000/api/pets/${id}`)
      .then((res) => setPet(res.data))
      .catch((err) => console.error(err));
  }, [id]);

  useEffect(() => {
    if (!user || !pet?._id) return;
    axios.get(`http://localhost:5000/api/purchase-requests/for-listing/${pet._id}`)
      .then((res) => setOrder(res.data))
      .catch(() => setOrder(null));
    axios.get(`http://localhost:5000/api/wishlist/${pet._id}`)
      .then((res) => setWishlisted(res.data.saved))
      .catch(() => setWishlisted(false));
  }, [user, pet?._id]);

  const toggleWishlist = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const response = wishlisted
        ? await axios.delete(`http://localhost:5000/api/wishlist/${pet._id}`)
        : await axios.put(`http://localhost:5000/api/wishlist/${pet._id}`);
      setWishlisted(response.data.saved);
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to update wishlist.');
    }
  };

  const statusLabel = {
    PENDING_PAYMENT: 'Order Created - Payment Pending',
    AWAITING_SELLER_PAYMENT_CONFIRMATION: 'Payment In Progress',
    CONFIRMED: 'Payment Confirmed',
    PAYMENT_NOT_VERIFIED: 'Payment Needs Resolution',
    COMPLETED: 'Order Completed'
  };

  const handleBuyNow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/purchase-requests', { petId: pet._id, amount: pet.price });
      navigate('/profile');
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to send purchase request.');
    }
  };

  if (!pet) return <div className="text-center py-20 font-bold text-olxNavy">Loading pet details...</div>;

  return (
    <div className="min-h-screen bg-olxLightGray pb-12">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-gray-500 flex items-center gap-1">
        <Link to="/" className="hover:underline">Home</Link>
        <ChevronRight size={12} />
        <span>{pet.category}s</span>
        <ChevronRight size={12} />
        <span className="font-semibold text-olxNavy truncate">{pet.title}</span>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-2 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Gallery & Overview */}
        <div className="md:col-span-2 space-y-4">
          {/* Image Display */}
          <div className="bg-black rounded overflow-hidden h-[420px] relative flex items-center justify-center">
            <img
              src={pet.images[0] || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600'}
              alt={pet.title}
              className="max-h-full max-w-full object-contain"
            />
            {pet.isSold && (
              <span className="absolute top-4 left-4 bg-red-600 text-white font-extrabold text-sm px-3 py-1 rounded shadow">
                SOLD OUT
              </span>
            )}
          </div>

          {/* Details Card */}
          <div className="bg-white p-6 rounded border border-gray-300 space-y-4">
            <h2 className="text-xl font-bold text-olxNavy border-b pb-3">Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Category</p>
                <p className="font-semibold text-olxNavy">{pet.category}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Breed</p>
                <p className="font-semibold text-olxNavy">{pet.breed}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Age</p>
                <p className="font-semibold text-olxNavy">{pet.age} Years</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Location</p>
                <p className="font-semibold text-olxNavy">{pet.location}</p>
              </div>
            </div>

            <hr />

            <h2 className="text-xl font-bold text-olxNavy">Description</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{pet.description}</p>
          </div>
        </div>

        {/* Right Action Sidebar */}
        <div className="space-y-4">
          {/* Price Box */}
          <div className="bg-white p-6 rounded border border-gray-300 relative shadow-xs">
            <div className="flex justify-between items-start">
              <h1 className="text-3xl font-extrabold text-olxNavy mb-1">
                ₹ {pet.price.toLocaleString('en-IN')}
              </h1>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-full text-olxNavy"><Share2 size={20} /></button>
                <button
                  onClick={toggleWishlist}
                  className={`p-2 hover:bg-gray-100 rounded-full ${wishlisted ? 'text-red-600' : 'text-olxNavy'}`}
                  title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <Heart size={20} fill={wishlisted ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-700 font-medium mb-3">{pet.title}</p>
            <div className="text-xs text-gray-500 flex justify-between pt-2 border-t">
              <span>{pet.location}</span>
              <span>{new Date(pet.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Seller Profile & Communication Options */}
          <div className="bg-white p-6 rounded border border-gray-300 space-y-4 shadow-xs">
            <h3 className="font-bold text-olxNavy text-lg">Seller Details</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-olxNavy text-yellow-300 font-extrabold text-xl rounded-full flex items-center justify-center">
                {pet.owner?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="font-bold text-olxNavy">{pet.owner?.name || 'Pet Owner'}</p>
                <p className="text-xs text-gray-500">Member since 2024</p>
              </div>
            </div>

            {/* Mobile Contact Button */}
            <button
              onClick={() => setShowPhone(!showPhone)}
              className="w-full bg-olxNavy text-white font-extrabold py-3 rounded border-2 border-olxNavy flex items-center justify-center gap-2 hover:bg-black transition"
            >
              <Phone size={18} />
              {showPhone ? pet.owner?.phone : 'Show Mobile Number'}
            </button>

            {/* Direct buyer-to-seller request */}
            {order && (
              <div className={`rounded border p-3 text-sm font-bold ${
                order.orderStatus === 'AWAITING_SELLER_PAYMENT_CONFIRMATION'
                  ? 'bg-orange-50 border-orange-400 text-orange-700'
                  : order.orderStatus === 'CONFIRMED'
                    ? 'bg-green-50 border-green-500 text-green-700'
                    : 'bg-white border-gray-300 text-olxNavy'
              }`}>
                <div>{statusLabel[order.orderStatus] || order.paymentStatus?.replaceAll('_', ' ') || 'Order Pending'}</div>
                <Link to="/profile" className="text-xs underline mt-1 inline-block">View transaction</Link>
              </div>
            )}
            {user && user.id !== pet.owner?._id && !pet.isSold && (
              <button
                onClick={handleBuyNow}
                className="w-full bg-olxYellow text-olxNavy font-extrabold py-3 rounded flex items-center justify-center gap-2 hover:bg-olxHoverYellow transition shadow"
              >
                Buy Now - Contact Seller
              </button>
            )}

            {/* In-App Direct Chat Button */}
            {user && user.id !== pet.owner?._id && (
              <button
                onClick={() => navigate(`/chat/${pet._id}/${pet.owner._id}`)}
                className="w-full bg-white border-2 border-olxNavy text-olxNavy font-extrabold py-3 rounded flex items-center justify-center gap-2 hover:bg-gray-100 transition"
              >
                <MessageCircle size={18} />
                Chat with Owner
              </button>
            )}
            {user && user.id !== pet.owner?._id && !pet.isSold && (
              <p className="text-xs text-gray-600">
                Payments are made directly between the buyer and seller. The website does not process or independently verify these payments.
              </p>
            )}
          </div>

          {/* Safety Tips Card */}
          <div className="bg-white p-4 rounded border border-gray-300 flex items-start gap-3">
            <ShieldCheck size={28} className="text-cyan-700 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-600">
              <p className="font-bold text-olxNavy mb-0.5">Safety Tips for Buyers</p>
              <p>Meet in person at a public place before paying. Inspect the pet's health card carefully.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}