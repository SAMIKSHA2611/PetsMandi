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
  const [buyerPayments, setBuyerPayments] = useState([]);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [paymentDetailsTransactionId, setPaymentDetailsTransactionId] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
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
    axios.get('http://localhost:5000/api/purchase-requests/payment-requests/buyer').then((res) => setBuyerPayments(res.data)).catch(() => {});
    axios.get('http://localhost:5000/api/wishlist').then((res) => setWishlist(res.data)).catch(() => {});
  }, []);

  const transactionAction = async (transaction, action) => {
    const details = action === 'REPORT_PAYMENT'
      ? (await axios.get(`http://localhost:5000/api/purchase-requests/${transaction._id}/payment-details`).catch(() => null))?.data
      : null;
    const request = action === 'REPORT_PAYMENT'
      ? axios.post(`http://localhost:5000/api/purchase-requests/${transaction._id}/payment-made`, { paymentMethod: selectedPaymentMethod || details?.paymentPreference || details?.paymentMethods?.[0] || 'UPI' })
      : axios.patch(`http://localhost:5000/api/purchase-requests/${transaction._id}/status`, { action });
    await request;
    const refreshed = await axios.get('http://localhost:5000/api/purchase-requests');
    setTransactions(refreshed.data);
  };

  const loadPaymentDetails = async (transactionId) => {
    try {
      const result = await axios.get(`http://localhost:5000/api/purchase-requests/${transactionId}/payment-details`);
      setPaymentDetails(result.data);
      setPaymentDetailsTransactionId(transactionId);
      setSelectedPaymentMethod(result.data.paymentPreference || result.data.paymentMethods?.[0] || '');
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

  const listingId = (listing) => String(listing?._id || listing || '');
  const postedTransactions = myPets.map((pet) => ({
    pet,
    requests: transactions.filter((transaction) => listingId(transaction.pet) === pet._id)
  }));
  const purchasedTransactions = transactions.filter((transaction) => transaction.buyer?._id === user?.id);

  const transactionStatus = (transaction) => {
    if (transaction.status === 'PENDING') return 'Waiting for seller acceptance';
    if (transaction.status === 'REJECTED') return 'Request declined';
    if (transaction.orderStatus === 'COMPLETED') return 'Completed';
    if (transaction.orderStatus === 'CANCELLED') return 'Cancelled';
    if (transaction.paymentStatus === 'PAYMENT_NOT_VERIFIED') return 'Payment needs verification';
    if (transaction.paymentStatus === 'PAYMENT_CONFIRMED') return 'Payment confirmed';
    if (transaction.paymentStatus === 'PAYMENT_IN_PROGRESS') return 'Payment awaiting seller confirmation';
    return 'Payment pending';
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
          {purchasedTransactions.length > 0 && <h2 className="text-xl font-extrabold text-olxNavy mb-4">My Purchases</h2>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {purchasedTransactions.map((transaction) => (
              <article key={transaction._id} className="bg-white rounded border border-gray-300 overflow-hidden">
                <Link to={`/pet/${listingId(transaction.pet)}`} className="flex gap-4 p-4 hover:bg-gray-50">
                  <img src={transaction.pet?.images?.[0]} alt={transaction.pet?.title} className="w-24 h-24 rounded object-cover bg-gray-100" />
                  <div className="min-w-0">
                    <p className="font-bold text-olxNavy truncate">{transaction.pet?.title}</p>
                    <p className="text-sm">₹{Number(transaction.amount).toLocaleString('en-IN')}</p>
                    <p className="mt-2 text-xs font-bold text-cyan-700">{transactionStatus(transaction)}</p>
                  </div>
                </Link>
                <div className="border-t px-4 py-3 text-sm">
                  <p className="text-xs text-gray-500">Seller: {transaction.seller?.name}</p>
                  <p className="mt-1 break-all text-xs text-gray-500">Transaction: {transaction.orderId}</p>
                  <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-3">
                    <p><b>Payment:</b> {transactionStatus(transaction)}</p>
                    {buyerPayments.filter((paymentRequest) => String(paymentRequest.orderId) === String(transaction._id)).map((paymentRequest) => (
                      <div key={paymentRequest._id} className="mt-2 border-t pt-2">
                        <p><b>Payment ID:</b> {paymentRequest.paymentId}</p>
                        <p><b>Method:</b> {paymentRequest.paymentMethod}</p>
                        <p><b>Amount:</b> ₹{Number(paymentRequest.amount).toLocaleString('en-IN')}</p>
                        <p><b>Status:</b> {paymentRequest.status?.replaceAll('_', ' ')}</p>
                      </div>
                    ))}
                    {!transaction.paymentSubmittedAt && <p className="mt-1 text-xs text-gray-500">Payment has not been submitted yet.</p>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {transaction.status === 'APPROVED' && <button onClick={() => loadPaymentDetails(transaction._id)} className="border px-3 py-1.5 rounded text-xs font-bold">Payment Details</button>}
                    {transaction.status === 'PAYMENT_CONFIRMED' && <button onClick={async () => { await axios.patch(`http://localhost:5000/api/purchase-requests/${transaction._id}/handover`); window.location.reload(); }} className="bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold">I Received the Pet</button>}
                    {!['COMPLETED', 'PAYMENT_CONFIRMED'].includes(transaction.status) && !['COMPLETED', 'CONFIRMED', 'CANCELLED'].includes(transaction.orderStatus) && <button onClick={() => transactionAction(transaction, 'CANCEL')} className="border border-red-400 text-red-700 px-3 py-1.5 rounded text-xs font-bold">Cancel</button>}
                  </div>
                  {paymentDetails && paymentDetailsTransactionId === transaction._id && (
                    <div className="mt-3 rounded border border-cyan-300 bg-cyan-50 p-3 text-sm">
                      <p className="font-bold text-olxNavy">Seller payment method</p>
                      {(paymentDetails.paymentMethods || [paymentDetails.paymentPreference]).length > 1 && (
                        <select value={selectedPaymentMethod} onChange={(e) => setSelectedPaymentMethod(e.target.value)} className="mt-2 w-full border border-olxNavy rounded p-2 bg-white">
                          {(paymentDetails.paymentMethods || []).map((method) => <option key={method} value={method}>{method.replaceAll('_', ' ')}</option>)}
                        </select>
                      )}
                      {(paymentDetails.paymentMethods || [paymentDetails.paymentPreference]).length === 1 && <p className="mt-1"><b>{paymentDetails.paymentPreference.replaceAll('_', ' ')}</b></p>}
                      {selectedPaymentMethod === 'UPI' && paymentDetails.upiId && <p className="mt-2 break-all"><b>UPI ID:</b> {paymentDetails.upiId}</p>}
                      {selectedPaymentMethod === 'BANK_TRANSFER' && <>
                        {paymentDetails.accountHolder && <p className="mt-2"><b>Account holder:</b> {paymentDetails.accountHolder}</p>}
                        {paymentDetails.accountNumber && <p><b>Account number:</b> {paymentDetails.accountNumber}</p>}
                        {paymentDetails.bankIfsc && <p><b>IFSC:</b> {paymentDetails.bankIfsc}</p>}
                      </>}
                      <button onClick={() => { if (window.confirm('Confirm that you have completed the direct payment using the selected method?')) transactionAction(transaction, 'REPORT_PAYMENT'); }} className="mt-3 bg-olxYellow text-olxNavy px-3 py-1.5 rounded text-xs font-bold">I Have Paid</button>
                    </div>
                  )}
                </div>
              </article>
            ))}
            {purchasedTransactions.length === 0 && <div className="md:col-span-2 bg-white p-5 rounded border text-sm text-gray-600">No purchases yet. Listings you buy will appear here with their payment updates.</div>}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {postedTransactions.map(({ pet, requests }) => (
              <article key={pet._id} className="bg-white border border-gray-300 rounded overflow-hidden">
                <Link to={`/pet/${pet._id}`} className="flex gap-4 p-4 hover:bg-gray-50">
                  <img src={pet.images?.[0]} alt={pet.title} className="w-28 h-28 rounded object-cover bg-gray-100" />
                  <div>
                    <p className="font-bold text-olxNavy">{pet.title}</p>
                    <p className="text-lg font-extrabold text-olxNavy">₹{Number(pet.price).toLocaleString('en-IN')}</p>
                  </div>
                </Link>
                <div className="border-t">
                  {requests.map((transaction) => (
                    <div key={transaction._id} className="p-4 border-b last:border-b-0 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-olxNavy">{transaction.buyer?.name}</p>
                        <span className="text-xs font-bold text-gray-600">{transactionStatus(transaction)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{transaction.orderId}</p>
                      {sellerPayments.filter((paymentRequest) => String(paymentRequest.orderId) === String(transaction._id)).map((paymentRequest) => (
                        <div key={paymentRequest._id} className="mt-3 rounded border border-gray-300 bg-gray-50 p-3">
                          <p className="font-bold text-olxNavy">Payment Request</p>
                          <p className="mt-2 break-all"><b>Payment ID:</b> {paymentRequest.paymentId}</p>
                          <p><b>Buyer:</b> {paymentRequest.buyerId?.name}</p>
                          <p><b>Pet:</b> {paymentRequest.listingId?.title || pet.title}</p>
                          <p><b>Amount:</b> ₹{Number(paymentRequest.amount).toLocaleString('en-IN')}</p>
                          <p><b>Method:</b> {paymentRequest.paymentMethod}</p>
                          <p><b>Status:</b> {paymentRequest.status?.replaceAll('_', ' ')}</p>
                          {paymentRequest.status === 'PAYMENT_IN_PROGRESS' && <div className="mt-3 flex flex-wrap gap-2">
                            <button onClick={async () => { await axios.patch(`http://localhost:5000/api/purchase-requests/${paymentRequest.orderId}/payment-confirmation`, { confirmed: true }); window.location.reload(); }} className="bg-green-700 text-white px-3 py-1.5 rounded font-bold">Payment Received</button>
                            <button onClick={async () => { if (window.confirm('Confirm that this payment was not received?')) { await axios.patch(`http://localhost:5000/api/purchase-requests/${paymentRequest.orderId}/payment-confirmation`, { confirmed: false }); window.location.reload(); } }} className="border border-red-600 text-red-700 px-3 py-1.5 rounded font-bold">Payment Not Received</button>
                          </div>}
                        </div>
                      ))}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {transaction.status === 'PENDING' && <>
                          <button onClick={async () => { await axios.patch(`http://localhost:5000/api/purchase-requests/${transaction._id}/approve`); window.location.reload(); }} className="bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold">Accept Request</button>
                          <button onClick={async () => { await axios.patch(`http://localhost:5000/api/purchase-requests/${transaction._id}/reject`); window.location.reload(); }} className="border border-red-600 text-red-700 px-3 py-1.5 rounded text-xs font-bold">Reject Request</button>
                        </>}
                        {transaction.status === 'APPROVED' && <button onClick={async () => { await axios.post(`http://localhost:5000/api/purchase-requests/${transaction._id}/share-payment`); }} className="bg-olxYellow px-3 py-1.5 rounded text-xs font-bold">Payment Details Shared</button>}
                        {transaction.status === 'PAYMENT_MARKED' && <p className="text-xs font-bold text-orange-700">Buyer reported payment. Verify it below.</p>}
                        {!['COMPLETED', 'PAYMENT_CONFIRMED'].includes(transaction.status) && !['COMPLETED', 'CONFIRMED', 'CANCELLED'].includes(transaction.orderStatus) && <button onClick={() => transactionAction(transaction, 'CANCEL')} className="border border-red-400 text-red-700 px-3 py-1.5 rounded text-xs font-bold">Cancel enquiry</button>}
                      </div>
                    </div>
                  ))}
                  {requests.length === 0 && <p className="p-4 text-sm text-gray-500">No buyer enquiries for this post yet.</p>}
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}