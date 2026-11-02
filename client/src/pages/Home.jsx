import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { Heart, MapPin } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function Home() {
  const [pets, setPets] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const selectedCategory = searchParams.get('category') || '';

  const fetchPets = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/pets?category=${selectedCategory}&search=${search}&location=${location}`);
      setPets(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPets();
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-olxLightGray pb-12">
      <Navbar
        search={search}
        setSearch={setSearch}
        location={location}
        setLocation={setLocation}
        handleSearch={fetchPets}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Banner Section */}
        <div className="bg-white p-6 rounded border border-gray-200 mb-8 flex items-center justify-between shadow-xs">
          <div>
            <h1 className="text-2xl font-black text-olxNavy mb-1">Buy & Sell Pets Near You in India</h1>
            <p className="text-sm text-gray-600">OLX Style Marketplace for Verified Pet Owners & Breeders</p>
          </div>
          <Link to="/sell" className="hidden md:block bg-olxYellow text-olxNavy font-extrabold px-6 py-2.5 rounded hover:bg-olxHoverYellow transition shadow">
            Post an Ad
          </Link>
        </div>

        {/* Fresh Recommendations Heading */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-olxNavy tracking-tight">Fresh recommendations</h2>
          {selectedCategory && (
            <button
              onClick={() => setSearchParams({})}
              className="text-xs font-bold text-cyan-700 underline"
            >
              Clear Category Filter
            </button>
          )}
        </div>

        {/* Pet Listings Grid (Exact OLX Card Format) */}
        {pets.length === 0 ? (
          <div className="bg-white p-12 text-center rounded border border-gray-200 my-8">
            <h3 className="text-lg font-bold text-olxNavy mb-2">No pet ads found</h3>
            <p className="text-sm text-gray-500 mb-4">Be the first to post a pet listing in this category!</p>
            <Link to="/sell" className="bg-olxNavy text-white font-bold px-6 py-2 rounded hover:bg-black transition">
              Post Pet Ad
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pets.map((pet) => (
              <Link
                to={`/pet/${pet._id}`}
                key={pet._id}
                className="bg-white border border-gray-300 rounded overflow-hidden shadow-xs hover:shadow-md transition relative flex flex-col group"
              >
                {/* Image Container with Heart Icon */}
                <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
                  <img
                    src={pet.images[0] || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600'}
                    alt={pet.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  {pet.isSold && (
                    <span className="absolute top-2 left-2 bg-red-600 text-white font-black text-xs px-2 py-1 rounded">
                      SOLD
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); }}
                    className="absolute top-3 right-3 bg-white p-1.5 rounded-full shadow hover:bg-gray-100 text-olxNavy"
                  >
                    <Heart size={18} />
                  </button>
                </div>

                {/* Card Content Details */}
                <div className="p-3.5 flex-1 flex flex-col justify-between border-l-4 border-transparent group-hover:border-olxYellow">
                  <div>
                    <h3 className="text-xl font-extrabold text-olxNavy mb-0.5">
                      ₹ {pet.price.toLocaleString('en-IN')}
                    </h3>
                    <p className="text-sm text-gray-700 font-normal line-clamp-1 mb-1">
                      {pet.title}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {pet.breed} • {pet.age} {pet.age === 1 ? 'year' : 'years'} old
                    </p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="flex items-center gap-0.5 truncate max-w-[150px]">
                      <MapPin size={12} className="text-gray-400 shrink-0" />
                      {pet.location}
                    </span>
                    <span>{new Date(pet.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}