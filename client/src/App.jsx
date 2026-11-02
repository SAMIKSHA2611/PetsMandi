import { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import PetDetail from './pages/PetDetail';
import PostPet from './pages/PostPet';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import ForgotPassword from './pages/ForgotPassword';

function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);
  return user ? children : <Navigate to="/login" state={{ from: '/sell' }} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/pet/:id" element={<PetDetail />} />
          <Route path="/sell" element={<ProtectedRoute><PostPet /></ProtectedRoute>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/chat/:petId/:otherUserId" element={<Chat />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}