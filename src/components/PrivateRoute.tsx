import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-Based Redirection Logic (on landing at root or specific triggers)
  if (location.pathname === '/') {
    switch (user.role) {
      case 'SECURITY_GUARD':
        return <Navigate to="/terminal" replace />;
      case 'HOD':
        return <Navigate to="/approvals" replace />;
      case 'HR_MANAGER':
        return <Navigate to="/hr-center" replace />;
      case 'FACILITY_ADMIN':
        return <Navigate to="/admin-dashboard" replace />;
      case 'SUPER_ADMIN':
        return <Navigate to="/super-admin" replace />;
      case 'STAFF':
        return <Navigate to="/staff-dashboard" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  // Force Password Change Check (if not already on the change password page)
  if (user.firstLogin && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
