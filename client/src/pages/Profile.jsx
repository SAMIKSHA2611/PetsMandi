import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Profile() {
  const { user } = useContext(AuthContext);
  const [myPets, setMyPets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [payment, setPayment] = useState({ paymentPreference: 'UPI' });
  const [sellerPayments, setSellerPayments] = useState([]);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [editingPayment, setEditingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/pets/my-pets')
      .then((res) => setMyPets(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    axios.get('http://localhost:5000/api/purchase-requests').then((res) => setTransactions(res.data)).catch(() => {});
    axios.get('http://localhost:5000/api/auth/payment-preference').then((res) => setPayment(res.data)).catch(() => {});
    axios.get('http://localhost:5000/api/purchase-requests/payment-requests/seller').then((res) => setSellerPayments(res.data)).catch(() => {});
    axios.get('http://localhost:5000/api/wishlist').then((res) => setWishlist(res.data)).catch(() => {});
  }, []);

  const transactionAction = async (transaction, action) => {
    const details = action === 'REPORT_PAYMENT'
      ? (await axios.get(`http://localhost:5000/api/purchase-requests/${transaction._id}/payment-details`).catch(() => null))?.data
      : null;
    const request = action === 'REPORT_PAYMENT'
      ? axios.post(`http://localhost:5000/api/purchase-requests/${transaction._id}/payment-made`, { paymentMethod: details?.paymentPreference || 'UPI' })
      : axios.patch(`http://localhost:5000/api/purchase-requests/${transaction._id}/status`, { action });
    await request;
    const refreshed = await axios.get('http://localhost:5000/api/purchase-requests');
    setTransactions(refreshed.data);
  };

  const loadPaymentDetails = async (transactionId) => {
    try {
      const result = await axios.get(`http://localhost:5000/api/purchase-requests/${transactionId}/payment-details`);
      setPaymentDetails(result.data);
    } catch (err) {
      setPaymentDetails(null);
      setPaymentMessage(err.response?.data?.message || 'Payment details are not available yet.');
    }
  };

  const savePaymentPreference = async () => {
    try {
      await axios.put('http://localhost:5000/api/auth/payment-preference', payment);
      setPaymentMessage('Payment preference saved.');
      setEditingPayment(false);
    } catch (err) {
      setPaymentMessage(err.response?.data?.message || 'Unable to save payment preference.');
    }
  };

  return (
    <div className="min-h-screen bg-olxLightGray pb-12">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white p-6 rounded border border-gray-300 shadow-xs flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-olxNavy">{user?.name}</h1>
            <p className="text-sm text-gray-600">Email: {user?.email}</p>
            <p className="text-sm text-gray-600">Mobile: {user?.phone}</p>
            <p className="text-sm text-gray-600">City: {user?.city}</p>
          </div>
          <Link to="/sell" className="bg-olxYellow text-olxNavy font-extrabold px-5 py-2 rounded shadow">
            Post New Ad
          </Link>
        </div>

        <div>
          <div className="bg-white p-4 rounded border border-gray-300 mb-4">
            <div className="flex justify-between items-center">
              <div><p className="font-bold text-olxNavy">Payment preference</p><p className="text-sm text-gray-600">{payment.paymentPreference?.replaceAll('_', ' ')}</p></div>
              <button onClick={() => setEditingPayment(!editingPayment)} className="text-cyan-700 font-bold text-sm underline">Edit</button>
            </div>
            {editingPayment && <div className="mt-3 space-y-2">
              <select value={payment.paymentPreference} onChange={(e) => setPayment({ ...payment, paymentPreference: e.target.value })} className="w-full border-2 border-olxNavy p-2 rounded">
                <option value="UPI">UPI</option><option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
              <input value={payment.upiQrCode || ''} onChange={(e) => setPayment({ ...payment, upiQrCode: e.target.value })} placeholder="UPI QR code image URL (optional)" className="w-full border-2 border-olxNavy p-2 rounded" />
              {payment.paymentPreference === 'UPI' && <input value={payment.upiId || ''} onChange={(e) => setPayment({ ...payment, upiId: e.target.value })} placeholder="UPI ID" className="w-full border-2 border-olxNavy p-2 rounded" />}
              {payment.paymentPreference === 'BANK_TRANSFER' && <>
                <input value={payment.accountHolder || ''} onChange={(e) => setPayment({ ...payment, accountHolder: e.target.value })} placeholder="Account holder name" className="w-full border-2 border-olxNavy p-2 rounded" />
                <input value={payment.accountNumber || ''} onChange={(e) => setPayment({ ...payment, accountNumber: e.target.value.replace(/\D/g, '') })} placeholder="Account number" className="w-full border-2 border-olxNavy p-2 rounded" />
                <input value={payment.ifsc || ''} onChange={(e) => setPayment({ ...payment, ifsc: e.target.value.toUpperCase() })} placeholder="IFSC" className="w-full border-2 border-olxNavy p-2 rounded uppercase" />
              </>}
              <button onClick={savePaymentPreference} className="bg-olxNavy text-white px-4 py-2 rounded font-bold">Save</button>
            </div>}
            {paymentMessage && <p className="text-xs mt-2 text-gray-700">{paymentMessage}</p>}
          </div>
          <h2 className="text-xl font-extrabold text-olxNavy mb-4">My Transactions</h2>
          {sellerPayments.length > 0 && <div className="bg-white p-4 rounded border border-gray-300 mb-4">
            <h3 className="font-bold text-olxNavy mb-3">Payment Requests</h3>
            {sellerPayments.map((paymentRequest) => (
              <div key={paymentRequest._id} className="border-t py-3 text-sm">
                <p><b>Payment ID:</b> {paymentRequest.paymentId}</p>
                <p><b>Buyer:</b> {paymentRequest.buyerId?.name}</p>
                <p><b>Pet:</b> {paymentRequest.listingId?.title}</p>
                <p><b>Amount:</b> ₹{paymentRequest.amount}</p>
                <p><b>Method:</b> {paymentRequest.paymentMethod}</p>
                <p><b>Status:</b> {paymentRequest.status}</p>
                {paymentRequest.status === 'PAYMENT_IN_PROGRESS' && <div className="flex gap-2 mt-2">
                  <button onClick={async () => { await axios.patch(`http://localhost:5000/api/purchase-requests/${paymentRequest.orderId}/payment-confirmation`, { confirmed: true }); window.location.reload(); }} className="bg-green-700 text-white px-3 py-1 rounded">Payment Received</button>
                  <button onClick={async () => { if (window.confirm('Confirm that this payment was not received?')) { await axios.patch(`http://localhost:5000/api/purchase-requests/${paymentRequest.orderId}/payment-confirmation`, { confirmed: false }); window.location.reload(); } }} className="border border-red-600 text-red-700 px-3 py-1 rounded">Payment Not Received</button>
                </div>}
              </div>
            ))}
          </div>}
          {paymentDetails && <div className="bg-white p-4 rounded border border-gray-300 mb-4 text-sm"><p className="font-bold text-olxNavy">Seller payment instructions</p><p>Method: {paymentDetails.paymentPreference}</p>{paymentDetails.upiId && <p>UPI: {paymentDetails.upiId}</p>}{paymentDetails.accountHolder && <p>Account holder: {paymentDetails.accountHolder}</p>}{paymentDetails.accountNumber && <p>Account number: {paymentDetails.accountNumber}</p>}{paymentDetails.bankIfsc && <p>IFSC: {paymentDetails.bankIfsc}</p>}<p className="mt-2 text-xs text-gray-600">{paymentDetails.warning}</p></div>}
          <div className="space-y-3 mb-6">
            {transactions.map((transaction) => (
              <div key={transaction._id} className="bg-white p-4 rounded border border-gray-300 text-sm">
                <p className="font-bold text-olxNavy">{transaction.pet?.title}</p>
                <p>Status: {transaction.status}</p>
                <p>Agreed price: ₹{transaction.amount}</p>
                {user?.id === transaction.seller?._id && (
                  <div className="flex gap-2 mt-2">
                    {transaction.status === 'PENDING' && <><button onClick={() => axios.patch(`http://localhost:5000/api/purchase-requests/${transaction._id}/approve`).then(() => window.location.reload())} className="bg-olxNavy text-white px-3 py-1 rounded">Accept</button><button onClick={() => axios.patch(`http://localhost:5000/api/purchase-requests/${transaction._id}/reject`).then(() => window.location.reload())} className="border px-3 py-1 rounded">Reject</button></>}
                    {transaction.status === 'APPROVED' && <button onClick={async () => { await axios.post(`http://localhost:5000/api/purchase-requests/${transaction._id}/share-payment`); }} className="bg-olxYellow px-3 py-1 rounded">Share Payment Details</button>}
                    {transaction.status === 'PAYMENT_MARKED' && <p className="text-orange-700 font-bold">Buyer has notified the payment. Verify in your account.</p>}
                  </div>
                )}
                {user?.id === transaction.buyer?._id && transaction.status === 'APPROVED' && <button onClick={() => { if (window.confirm('Confirm that you have completed the direct payment?')) transactionAction(transaction, 'REPORT_PAYMENT'); }} className="mt-2 bg-olxYellow px-3 py-1 rounded text-xs">I Have Made the Payment</button>}
                {user?.id === transaction.buyer?._id && transaction.status === 'APPROVED' && <button onClick={() => loadPaymentDetails(transaction._id)} className="ml-2 mt-2 border px-3 py-1 rounded text-xs">View Payment Details</button>}
                {user?.id === transaction.buyer?._id && transaction.status === 'PAYMENT_MARKED' && <p className="mt-2 text-orange-700 font-bold">Payment notification sent. Waiting for seller verification.</p>}
                {user?.id === transaction.buyer?._id && transaction.status === 'PAYMENT_CONFIRMED' && <button onClick={async () => { await axios.patch(`http://localhost:5000/api/purchase-requests/${transaction._id}/handover`); window.location.reload(); }} className="mt-2 bg-green-700 text-white px-3 py-1 rounded text-xs">I Received the Pet</button>}
                {(user?.id === transaction.seller?._id || user?.id === transaction.buyer?._id) &&
                  !['COMPLETED', 'PAYMENT_CONFIRMED'].includes(transaction.status) &&
                  !['COMPLETED', 'CONFIRMED', 'CANCELLED'].includes(transaction.orderStatus) &&
                  <button onClick={() => transactionAction(transaction, 'CANCEL')} className="ml-2 mt-2 border px-3 py-1 rounded text-xs">Cancel</button>}
              </div>
            ))}
          </div>
          <h2 className="text-xl font-extrabold text-olxNavy mb-4">My Wishlist ({wishlist.length})</h2>
          {wishlist.length === 0 ? <div className="bg-white p-4 rounded border border-gray-300 mb-6 text-sm text-gray-600">No saved pets yet.</div> :
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {wishlist.map((pet) => (
                <Link key={pet._id} to={`/pet/${pet._id}`} className="bg-white border border-gray-300 rounded overflow-hidden">
                  <img src={pet.images?.[0] || '/placeholder-pet.jpg'} alt={pet.title} className="w-full h-40 object-cover" />
                  <div className="p-3"><p className="font-bold text-olxNavy">{pet.title}</p><p className="text-sm">₹{Number(pet.price).toLocaleString('en-IN')}</p></div>
                </Link>
              ))}
            </div>}
          <h2 className="text-xl font-extrabold text-olxNavy mb-4">My Posted Ads ({myPets.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {myPets.map((pet) => (
              <Link to={`/pet/${pet._id}`} key={pet._id} className="bg-white border border-gray-300 rounded overflow-hidden shadow-xs">
                <img src={pet.images[0]} alt={pet.title} className="w-full h-40 object-cover" />
                <div className="p-3">
                  <h3 className="text-lg font-extrabold text-olxNavy">₹ {pet.price.toLocaleString('en-IN')}</h3>
                  <p className="text-sm text-gray-800 line-clamp-1">{pet.title}</p>
                  {pet.isSold && <span className="inline-block mt-2 text-xs bg-red-600 text-white px-2 py-0.5 rounded font-bold">SOLD</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}