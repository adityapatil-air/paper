import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requiredRole = null, allowedRoles = null }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Redirect to appropriate dashboard based on user role
    const dashboardPath = user.role === 'author' ? '/author-dashboard' :
                         user.role === 'reviewer' ? '/reviewer-dashboard' :
                         user.role === 'admin' ? '/admin-dashboard' : '/';
    return <Navigate to={dashboardPath} replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const dashboardPath = user.role === 'author' ? '/author-dashboard' :
                         user.role === 'reviewer' ? '/reviewer-dashboard' :
                         user.role === 'admin' ? '/admin-dashboard' : '/';
    return <Navigate to={dashboardPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
