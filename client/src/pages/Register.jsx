import { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', paymentPreference: 'UPI', upiId: '', accountHolder: '', accountNumber: '', ifsc: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sampleOtp, setSampleOtp] = useState('');
  const [verified, setVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const update = (field, value) => setForm({ ...form, [field]: value });
  const validate = () => {
    if (!/^[A-Za-z\s]+$/.test(form.name.trim())) return 'Full Name must contain letters and spaces only.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email address.';
    if (!/^([6-9]\d{9})$/.test(form.phone)) return 'Enter a valid 10-digit Indian mobile number.';
    if (form.password.length < 12 || !/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) || !/\d/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) return 'Password must be 12+ characters with uppercase, lowercase, number and special character.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (form.paymentPreference === 'UPI' && !/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(form.upiId)) return 'Enter a valid UPI ID.';
    if (form.paymentPreference === 'BANK_TRANSFER' && (!form.accountHolder.trim() || !/^\d{9,18}$/.test(form.accountNumber) || !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(form.ifsc))) return 'Enter valid bank account details.';
    return '';
  };

  const sendOtp = async () => {
    const validationError = validate();
    if (validationError) return setError(validationError);
    setError('');
    try {
      const response = await axios.post('http://localhost:5000/api/auth/send-otp', form);
      setOtpSent(true);
      setSampleOtp(response.data?.devOtp || '');
      setMessage(response.data?.devOtp ? `Sample OTP for verification: ${response.data.devOtp}` : response.data?.message || 'OTP sent successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send OTP.');
    }
  };

  const verifyOtp = async () => {
    setError('');
    try {
      await axios.post('http://localhost:5000/api/auth/verify-email-otp', { email: form.email, otp });
      setVerified(true);
      setMessage('Email verified successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) return setError(validationError);
    if (!verified) return setError('Please verify your email before creating an account.');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', form);
      login(res.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-olxLightGray flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded border border-gray-300 shadow-md">
        <div className="text-center mb-6">
          <Link to="/" className="text-3xl font-extrabold text-olxNavy">Pets<span className="bg-olxNavy text-olxYellow px-1.5 py-0.5 rounded ml-0.5">Mandi</span></Link>
          <h2 className="text-xl font-bold text-olxNavy mt-4">Create Your Account</h2>
        </div>
        {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 text-xs rounded mb-4">{error}</div>}
        {message && <div className="p-3 bg-green-100 border border-green-400 text-green-700 text-xs rounded mb-4">{message}</div>}
        {sampleOtp && <div className="flex items-center justify-between p-3 border border-olxNavy rounded mb-3 bg-gray-50">
          <span className="text-xs font-bold text-olxNavy">Sample Verification OTP</span>
          <button type="button" onClick={() => setOtp(sampleOtp)} className="text-lg font-black tracking-widest text-olxNavy underline">{sampleOtp}</button>
        </div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" placeholder="Full Name" required value={form.name} className="w-full border-2 border-olxNavy p-2.5 rounded text-sm outline-none" onChange={(e) => update('name', e.target.value)} />
          <div className="flex">
            <input type="email" placeholder="Email Address" required value={form.email} className="min-w-0 w-full border-2 border-olxNavy p-2.5 rounded-l text-sm outline-none" onChange={(e) => update('email', e.target.value)} />
            <button type="button" onClick={sendOtp} className="border-2 border-l-0 border-olxNavy px-3 rounded-r text-xs font-bold text-olxNavy">Send OTP</button>
          </div>
          <input type="text" inputMode="numeric" maxLength="10" placeholder="Mobile Number" required value={form.phone} className="w-full border-2 border-olxNavy p-2.5 rounded text-sm outline-none" onChange={(e) => update('phone', e.target.value.replace(/\D/g, ''))} />
          <div>
            <label className="block text-xs font-bold text-olxNavy uppercase mb-1">Preferred Payment Method</label>
            <select value={form.paymentPreference} onChange={(e) => update('paymentPreference', e.target.value)} className="w-full border-2 border-olxNavy p-2.5 rounded text-sm">
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>
          {form.paymentPreference === 'UPI' && <input placeholder="UPI ID" value={form.upiId} className="w-full border-2 border-olxNavy p-2.5 rounded text-sm outline-none" onChange={(e) => update('upiId', e.target.value)} />}
          {form.paymentPreference === 'BANK_TRANSFER' && <>
            <input placeholder="Account Holder Name" value={form.accountHolder} className="w-full border-2 border-olxNavy p-2.5 rounded text-sm outline-none" onChange={(e) => update('accountHolder', e.target.value)} />
            <input inputMode="numeric" placeholder="Bank Account Number" value={form.accountNumber} className="w-full border-2 border-olxNavy p-2.5 rounded text-sm outline-none" onChange={(e) => update('accountNumber', e.target.value.replace(/\D/g, ''))} />
            <input placeholder="IFSC Code" value={form.ifsc} maxLength="11" className="w-full border-2 border-olxNavy p-2.5 rounded text-sm uppercase outline-none" onChange={(e) => update('ifsc', e.target.value.toUpperCase())} />
          </>}
          <div className="flex">
            <input type={showPassword ? 'text' : 'password'} placeholder="Password" required value={form.password} className="w-full border-2 border-olxNavy p-2.5 rounded-l text-sm outline-none" onChange={(e) => update('password', e.target.value)} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="border-2 border-l-0 border-olxNavy px-3 rounded-r text-xs font-bold">{showPassword ? 'Hide' : 'Show'}</button>
          </div>
          <div className="flex">
            <input type={showConfirm ? 'text' : 'password'} placeholder="Confirm Password" required value={form.confirmPassword} className="w-full border-2 border-olxNavy p-2.5 rounded-l text-sm outline-none" onChange={(e) => update('confirmPassword', e.target.value)} />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="border-2 border-l-0 border-olxNavy px-3 rounded-r text-xs font-bold">{showConfirm ? 'Hide' : 'Show'}</button>
          </div>
          {otpSent && !verified && <div className="flex"><input inputMode="numeric" maxLength="6" placeholder="6-digit OTP" value={otp} className="min-w-0 w-full border-2 border-olxNavy p-2.5 rounded-l text-sm outline-none" onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} /><button type="button" onClick={verifyOtp} className="border-2 border-l-0 border-olxNavy px-3 rounded-r text-xs font-bold text-olxNavy">Verify OTP</button></div>}
          {verified && <p className="text-xs font-bold text-green-700">✓ Email verified</p>}
          <button type="submit" className="w-full bg-olxNavy text-white font-extrabold py-3 rounded hover:bg-black transition mt-2">REGISTER</button>
        </form>
        <p className="mt-6 text-center text-xs text-gray-600">Already have an account? <Link to="/login" className="text-cyan-700 font-bold underline">Login</Link></p>
      </div>
    </div>
  );
}
