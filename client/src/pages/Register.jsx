import { useContext, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', paymentPreference: 'UPI', upiId: '', accountHolder: '', accountNumber: '', ifsc: '' });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpScreen, setOtpScreen] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [developmentOtp, setDevelopmentOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const otpInputs = useRef([]);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from || '/';

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
    setSending(true);
    try {
      const response = await axios.post('http://localhost:5000/api/auth/send-otp', form);
      setOtp(['', '', '', '', '', '']);
      setOtpScreen(true);
      setDevelopmentOtp(response.data?.devOtp || '');
      setMessage(response.data?.message || 'Verification code generated.');
      window.setTimeout(() => otpInputs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send OTP.');
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) return setError('Enter the complete 6-digit verification code.');
    setError('');
    setVerifying(true);
    try {
      await axios.post('http://localhost:5000/api/auth/verify-mobile-otp', { phone: form.phone, otp: code });
      setVerified(true);
      setOtpScreen(false);
      setMessage('Mobile number verified successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP.');
    } finally {
      setVerifying(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) otpInputs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) otpInputs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (event) => {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    if (!digits.length) return;
    event.preventDefault();
    setOtp(Array.from({ length: 6 }, (_, index) => digits[index] || ''));
    otpInputs.current[Math.min(digits.length, 5)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) return setError(validationError);
    if (!verified) {
      await sendOtp();
      return;
    }
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', form);
      login(res.data);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  if (otpScreen) {
    return (
      <div className="min-h-screen bg-white flex justify-center">
        <div className="w-full max-w-xl px-6 pt-6 pb-10">
          <button type="button" aria-label="Back" onClick={() => { setOtpScreen(false); setError(''); }} className="text-4xl leading-none text-gray-900 mb-10">←</button>
          <div className="h-px bg-gray-900" />
          <h1 className="mt-12 text-center text-3xl font-bold text-gray-950">Enter verification code</h1>
          <p className="mt-8 text-center text-lg text-gray-800">
            We sent a 6-digit code to <strong>+91 {form.phone}</strong>
          </p>
          {error && <p className="mt-6 rounded bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>}
          {message && !error && <p className="mt-6 text-center text-sm text-green-700">{message}</p>}
          {developmentOtp && (
            <button type="button" onClick={() => setOtp(developmentOtp.split(''))} className="mx-auto mt-3 block text-sm font-bold text-blue-600 underline">
              Development OTP: {developmentOtp}
            </button>
          )}
          <div className="mt-9 flex justify-between gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(element) => { otpInputs.current[index] = element; }}
                value={digit}
                onChange={(event) => handleOtpChange(index, event.target.value)}
                onKeyDown={(event) => handleOtpKeyDown(index, event)}
                onPaste={handleOtpPaste}
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength="1"
                aria-label={`Verification code digit ${index + 1}`}
                className={`h-20 w-[15%] border text-center text-3xl outline-none ${index === otp.findIndex((item) => item === '') || (index === 5 && otp.every(Boolean)) ? 'border-blue-600 shadow-[inset_0_-4px_0_#2563eb]' : 'border-gray-400'}`}
              />
            ))}
          </div>
          <button type="button" disabled={verifying} onClick={verifyOtp} className="mt-10 w-full rounded bg-olxNavy py-3 font-bold text-white disabled:opacity-60">
            {verifying ? 'VERIFYING...' : 'VERIFY'}
          </button>
          <button type="button" disabled={sending} onClick={sendOtp} className="mt-8 text-lg font-medium text-blue-600">Resend code by SMS</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-olxLightGray flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded border border-gray-300 shadow-md">
        <div className="text-center mb-6">
          <Link to="/" className="text-3xl font-extrabold text-olxNavy">Pets<span className="bg-olxNavy text-olxYellow px-1.5 py-0.5 rounded ml-0.5">Mandi</span></Link>
          <h2 className="text-xl font-bold text-olxNavy mt-4">Create Your Account</h2>
        </div>
        {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 text-xs rounded mb-4">{error}</div>}
        {message && <div className="p-3 bg-green-100 border border-green-400 text-green-700 text-xs rounded mb-4">{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" placeholder="Full Name" required value={form.name} className="w-full border-2 border-olxNavy p-2.5 rounded text-sm outline-none" onChange={(e) => update('name', e.target.value)} />
          <input type="email" placeholder="Email Address" required value={form.email} className="w-full border-2 border-olxNavy p-2.5 rounded text-sm outline-none" onChange={(e) => update('email', e.target.value)} />
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
          {verified && <p className="text-xs font-bold text-green-700">✓ Mobile number verified</p>}
          <button type="submit" disabled={sending} className="w-full bg-olxNavy text-white font-extrabold py-3 rounded hover:bg-black transition mt-2 disabled:opacity-60">
            {sending ? 'SENDING OTP...' : verified ? 'REGISTER' : 'VERIFY MOBILE & REGISTER'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-gray-600">Already have an account? <Link to="/login" className="text-cyan-700 font-bold underline">Login</Link></p>
      </div>
    </div>
  );
}
