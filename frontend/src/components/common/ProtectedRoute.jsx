import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const ProtectedRoute = ({ children, roleRequired }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="min-h-screen bg-primary flex items-center justify-center text-white">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (roleRequired && user.role !== roleRequired) {
    // Redirect based on actual role
    if (user.role === 'admin') return <Navigate to="/admin" />;
    if (user.role === 'franchise') return <Navigate to="/franchise" />;
  }

  return children;
};

export default ProtectedRoute;
