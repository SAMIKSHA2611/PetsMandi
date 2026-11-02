import { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.email.trim() || !formData.password) {
      setError('Email Address or Mobile Number and password are required.');
      return;
    }
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        identifier: formData.email.trim(),
        password: formData.password
      });
      login(res.data);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-olxLightGray flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded border border-gray-300 shadow-md">
        <div className="text-center mb-6">
          <Link to="/" className="text-3xl font-extrabold text-olxNavy">
            Pets<span className="bg-olxNavy text-olxYellow px-1.5 py-0.5 rounded ml-0.5">Mandi</span>
          </Link>
          <h2 className="text-xl font-bold text-olxNavy mt-4">Welcome Back</h2>
        </div>
        {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 text-xs rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-olxNavy uppercase mb-1">Email Address or Mobile Number</label>
            <input required className="w-full border-2 border-olxNavy p-2.5 rounded text-sm outline-none focus:ring-2 focus:ring-cyan-500" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-olxNavy uppercase mb-1">Password</label>
            <div className="flex">
              <input type={showPassword ? 'text' : 'password'} required className="w-full border-2 border-olxNavy p-2.5 rounded-l text-sm outline-none focus:ring-2 focus:ring-cyan-500" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="border-2 border-l-0 border-olxNavy px-3 rounded-r text-xs font-bold">{showPassword ? 'Hide' : 'Show'}</button>
            </div>
          </div>
          <div className="text-right"><Link to="/forgot-password" className="text-cyan-700 text-xs font-bold underline">Forgot Password?</Link></div>
          <button type="submit" className="w-full bg-olxNavy text-white font-extrabold py-3 rounded hover:bg-black transition">LOG IN</button>
        </form>
        <p className="mt-6 text-center text-xs text-gray-600">New to PetsMandi? <Link to="/register" state={{ from: returnTo }} className="text-cyan-700 font-bold underline">Create an Account</Link></p>
      </div>
    </div>
  );
}
