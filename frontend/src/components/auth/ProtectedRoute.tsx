import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, roleHomeRoute } from '@/contexts/AuthContext';
import type { Role } from '@/types';
import { AuthLoadingScreen } from '@/screens/auth/AuthLoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Signed in but on another role's portal: send them to their own. The backend
  // enforces access as well; this only keeps the navigation consistent.
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleHomeRoute(user.role)} replace />;
  }

  return <>{children}</>;
}
