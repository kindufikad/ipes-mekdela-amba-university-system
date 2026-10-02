import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, isAuthLoading, user, role } = useAuth();
  const location = useLocation();
  let storedUser = {};
  if (typeof window !== 'undefined') {
    try {
      storedUser = JSON.parse(window.localStorage.getItem('user') || '{}');
    } catch {
      storedUser = {};
    }
  }
  const normalizeRole = (value) => String(value || '').trim().toLowerCase();
  const normalizedRole = normalizeRole(user?.role || role || storedUser?.role);
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

  if (isAuthLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading your dashboard...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (normalizedAllowedRoles.length && !normalizedAllowedRoles.includes(normalizedRole)) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />;
  }

  const firstLoginValue = user?.isFirstLogin ?? user?.is_first_login ?? storedUser?.isFirstLogin ?? storedUser?.is_first_login;
  const isFirstLogin = firstLoginValue === true || Number(firstLoginValue) === 1;
  const isChangePasswordRoute = location.pathname === '/change-password';

  if (isFirstLogin && !isChangePasswordRoute) {
    return <Navigate to="/change-password" replace state={{ from: location }} />;
  }

  if (!isFirstLogin && isChangePasswordRoute) {
    const redirectTarget = ['depthead', 'dept_head'].includes(normalizedRole)
      ? '/dept-head-dashboard'
      : ['systemadmin', 'system_admin', 'admin'].includes(normalizedRole)
        ? '/system-admin-dashboard'
        : ['college_dean', 'dean'].includes(normalizedRole)
          ? '/dean/dashboard'
          : ['academic_directorate', 'academic_director', 'directorate'].includes(normalizedRole)
            ? '/directorate/dashboard'
            : normalizedRole === 'academic_vice_president'
              ? '/vice-president-dashboard'
        : normalizedRole === 'instructor'
          ? '/instructor-dashboard'
          : normalizedRole === 'lab_assistant'
            ? '/lab-assistant/dashboard'
            : '/student-dashboard';

    return <Navigate to={redirectTarget} replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
