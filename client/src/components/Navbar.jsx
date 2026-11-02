import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Search, MapPin, Plus, User as UserIcon, LogOut, Heart, MessageSquare } from 'lucide-react';

export default function Navbar({ search, setSearch, location, setLocation, handleSearch }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <header className="bg-olxLightGray border-b border-gray-300 sticky top-0 z-50">
      {/* Top Main OLX Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        {/* OLX Styled Logo */}
        <Link to="/" className="flex items-center gap-1">
          <span className="text-3xl font-extrabold tracking-tighter text-olxNavy flex items-center">
            Pets<span className="text-olxYellow bg-olxNavy px-1 py-0.5 rounded ml-0.5 text-2xl">Mandi</span>
          </span>
        </Link>

        {/* Search Bar Group Exact OLX Style */}
        <div className="flex-1 max-w-4xl flex items-center gap-2">
          {/* Location Input Box */}
          <div className="w-1/3 bg-white border-2 border-olxNavy rounded px-3 py-2 flex items-center gap-2 shadow-sm focus-within:ring-2 focus-within:ring-cyan-500">
            <Search size={18} className="text-olxNavy" />
            <input
              type="text"
              placeholder="India"
              value={location}
              onChange={(e) => setLocation && setLocation(e.target.value)}
              className="w-full text-sm font-semibold outline-none text-olxNavy placeholder-gray-500"
            />
            <MapPin size={18} className="text-olxNavy cursor-pointer" />
          </div>

          {/* Search Term Box with Button */}
          <div className="flex-1 bg-white border-2 border-olxNavy rounded flex items-center shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-cyan-500">
            <input
              type="text"
              placeholder="Find Dogs, Cats, Birds, Fishes and more..."
              value={search}
              onChange={(e) => setSearch && setSearch(e.target.value)}
              className="w-full px-4 py-2 text-sm text-olxNavy outline-none"
            />
            <button
              onClick={handleSearch}
              className="bg-olxNavy text-white px-5 py-2.5 hover:bg-black transition flex items-center justify-center"
            >
              <Search size={20} />
            </button>
          </div>
        </div>

        {/* Right User Actions */}
        <div className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-5">
              <Link to="/profile" className="flex items-center gap-1.5 font-bold text-olxNavy hover:underline text-sm">
                <UserIcon size={20} />
                <span>{user.name.split(' ')[0]}</span>
              </Link>
              <button onClick={() => { logout(); navigate('/login'); }} title="Logout" className="text-olxNavy hover:text-red-600">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="font-bold text-olxNavy hover:underline border-b-2 border-olxNavy text-sm">
              Login
            </Link>
          )}

          {/* Distinctive OLX "+ SELL" Multi-Color Button */}
          <Link
            to="/sell"
            className="relative bg-white border-4 border-t-yellow-400 border-r-cyan-400 border-b-blue-600 border-l-teal-500 text-olxNavy font-extrabold px-5 py-1.5 rounded-full flex items-center gap-1 shadow-md hover:shadow-lg transition transform hover:scale-105"
          >
            <Plus size={18} className="stroke-[3]" />
            <span className="tracking-wide text-sm">SELL</span>
          </Link>
        </div>
      </div>

      {/* OLX Sub-Category Header Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center gap-6 text-sm font-semibold text-olxNavy overflow-x-auto">
          <span className="uppercase font-extrabold text-xs tracking-wider flex items-center gap-1 text-gray-500">
            ALL CATEGORIES
          </span>
          <Link to="/?category=Dog" className="hover:text-cyan-600 transition">Dogs</Link>
          <Link to="/?category=Cat" className="hover:text-cyan-600 transition">Cats</Link>
          <Link to="/?category=Bird" className="hover:text-cyan-600 transition">Birds</Link>
          <Link to="/?category=Fish" className="hover:text-cyan-600 transition">Fishes</Link>
          <Link to="/?category=Other" className="hover:text-cyan-600 transition">Other Pets</Link>
        </div>
      </div>
    </header>
  );
}