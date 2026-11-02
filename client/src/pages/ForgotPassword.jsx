import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resetting, setResetting] = useState(false);

  const requestOtp = async (event) => {
    event.preventDefault();
    setError('');
    if (!email.trim()) return setError('Enter your registered email address.');
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      setStep(2);
      setDevOtp(response.data?.devOtp || '');
      setMessage(response.data?.message || 'Verification OTP sent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the complete 6-digit OTP.');
      return;
    }
    setVerifying(true);
    try {
      await axios.post('http://localhost:5000/api/auth/verify-reset-otp', { email, otp });
      setStep(3);
      setMessage('Identity verified. Create your new password.');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP.');
    } finally {
      setVerifying(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return setError('Password must be 12+ characters with uppercase, lowercase, number and special character.');
    }
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setResetting(true);
    try {
      await axios.post('http://localhost:5000/api/auth/reset-password', { email, password, confirmPassword });
      setStep(4);
      setMessage('Password reset successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset password.');
    } finally {
      setResetting(false);
    }
  };

  const passwordField = (value, setter, placeholder) => (
    <div className="flex">
      <input type={showPassword ? 'text' : 'password'} required placeholder={placeholder} value={value} className="w-full border-2 border-olxNavy p-2.5 rounded-l text-sm outline-none" onChange={(e) => setter(e.target.value)} />
      <button type="button" onClick={() => setShowPassword(!showPassword)} className="border-2 border-l-0 border-olxNavy px-3 rounded-r text-xs font-bold">{showPassword ? 'Hide' : 'Show'}</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-olxLightGray flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded border border-gray-300 shadow-md">
        <div className="text-center mb-6">
          <Link to="/" className="text-3xl font-extrabold text-olxNavy">Pets<span className="bg-olxNavy text-olxYellow px-1.5 py-0.5 rounded ml-0.5">Mandi</span></Link>
          <h2 className="text-xl font-bold text-olxNavy mt-4">{step === 4 ? 'Password Reset' : 'Forgot Password?'}</h2>
        </div>
        {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 text-xs rounded mb-4">{error}</div>}
        {message && <div className="p-3 bg-green-100 border border-green-400 text-green-700 text-xs rounded mb-4">{message}</div>}
        {step === 1 && <form onSubmit={requestOtp} noValidate className="space-y-3">
          <input type="email" placeholder="Registered Email Address" value={email} onChange={(e) => setEmail(e.target.value.trim())} className="w-full border-2 border-olxNavy p-2.5 rounded text-sm outline-none" />
          <button disabled={loading} className="w-full bg-olxNavy text-white font-extrabold py-3 rounded hover:bg-black transition disabled:opacity-60">{loading ? 'SENDING...' : 'SEND OTP'}</button>
        </form>}
        {step === 2 && <form onSubmit={verifyOtp} noValidate className="space-y-3">
          {devOtp && <div className="rounded border border-amber-400 bg-amber-50 p-3 text-center">
            <p className="text-xs font-bold text-gray-700">Your verification OTP</p>
            <p className="mt-1 text-2xl font-extrabold tracking-[0.35em] text-olxNavy">{devOtp}</p>
          </div>}
          <input inputMode="numeric" maxLength="6" required placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="w-full border-2 border-olxNavy p-2.5 rounded text-sm outline-none" />
          <button disabled={verifying} className="w-full bg-olxNavy text-white font-extrabold py-3 rounded hover:bg-black transition disabled:opacity-60">{verifying ? 'VERIFYING...' : 'VERIFY OTP'}</button>
          <button type="button" onClick={() => { setStep(1); setOtp(''); setDevOtp(''); setMessage(''); }} className="w-full text-sm font-bold text-cyan-700 underline">Change email</button>
        </form>}
        {step === 3 && <form onSubmit={resetPassword} className="space-y-3">{passwordField(password, setPassword, 'New Password')}{passwordField(confirmPassword, setConfirmPassword, 'Confirm Password')}<button disabled={resetting} className="w-full bg-olxNavy text-white font-extrabold py-3 rounded hover:bg-black transition disabled:opacity-60">{resetting ? 'SAVING...' : 'SAVE NEW PASSWORD'}</button></form>}
        {step === 4 && <Link to="/login" className="block w-full bg-olxNavy text-white text-center font-extrabold py-3 rounded hover:bg-black transition">LOGIN</Link>}
        <p className="mt-6 text-center text-xs text-gray-600"><Link to="/login" className="text-cyan-700 font-bold underline">Back to Login</Link></p>
      </div>
    </div>
  );
}
