import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function PostPet() {
  const [formData, setFormData] = useState({
    title: '', category: 'Dog', breed: '', age: '', price: '', location: '', description: '', images: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        images: formData.images ? [formData.images] : ['https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600']
      };
      await axios.post('http://localhost:5000/api/pets', payload);
      navigate('/');
    } catch (err) {
      alert('Failed to post pet listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-olxLightGray pb-12">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white p-8 rounded border border-gray-300 shadow-sm">
          <h1 className="text-2xl font-extrabold text-olxNavy uppercase tracking-wide text-center mb-6 pb-2 border-b">
            POST YOUR AD
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-olxNavy uppercase mb-1">Ad Title</label>
              <input
                type="text"
                placeholder="e.g. Purebred Golden Retriever Puppy 3 Months Old"
                required
                className="w-full border-2 border-olxNavy p-2.5 rounded text-sm outline-none"
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-olxNavy uppercase mb-1">Category</label>
                <select
                  className="w-full border-2 border-olxNavy p-2.5 rounded text-sm bg-white outline-none"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                  <option value="Bird">Bird</option>
                  <option value="Fish">Fish</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-olxNavy uppercase mb-1">Breed</label>
                <input
                  type="text"
                  placeholder="e.g. Persian, Lab, Kamfa"
                  required
                  className="w-full border-2 border-olxNavy p-2.5 rounded text-sm outline-none"
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-olxNavy uppercase mb-1">Age (Years)</label>
                <input
                  type="number"
                  placeholder="e.g. 1"
                  required
                  className="w-full border-2 border-olxNavy p-2.5 rounded text-sm outline-none"
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-olxNavy uppercase mb-1">Price (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  required
                  className="w-full border-2 border-olxNavy p-2.5 rounded text-sm outline-none"
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-olxNavy uppercase mb-1">Location / City</label>
              <input
                type="text"
                placeholder="e.g. Pune, Maharashtra"
                required
                className="w-full border-2 border-olxNavy p-2.5 rounded text-sm outline-none"
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-olxNavy uppercase mb-1">Photo Image URL</label>
              <input
                type="text"
                placeholder="Paste Image Link (Optional)"
                className="w-full border-2 border-olxNavy p-2.5 rounded text-sm outline-none"
                onChange={(e) => setFormData({ ...formData, images: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-olxNavy uppercase mb-1">Description</label>
              <textarea
                placeholder="Include condition, vaccination details, health record, temperament..."
                required
                className="w-full border-2 border-olxNavy p-2.5 rounded text-sm h-28 outline-none"
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-olxYellow text-olxNavy font-extrabold py-3 rounded text-base hover:bg-olxHoverYellow transition shadow mt-4"
            >
              {loading ? 'Posting...' : 'POST NOW'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}