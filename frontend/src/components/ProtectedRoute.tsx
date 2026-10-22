import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { User } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  roles?: Array<User['role']>;
}

/**
 * Jujur: halaman sensitif (checkout, tiket, scanner, dashboard EO)
 * tidak lagi terbuka untuk "Budi Santoso" bayangan.
 * - Belum login -> lempar ke /login (ingat halaman tujuan).
 * - Role tidak cocok (mis. penonton buka /scanner) -> lempar ke beranda.
 */
export const ProtectedRoute: React.FC<Props> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};
