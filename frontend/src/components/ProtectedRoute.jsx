import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ProtectedRoute — guards routes by auth state and optional role
export default function ProtectedRoute({ children, roles }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) {
    // Contact users redirect to their portal
    if (user?.role === 'contact') return <Navigate to="/portal" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
