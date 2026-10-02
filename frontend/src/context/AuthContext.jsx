import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { AuthContext } from './authContextStore';

const normalizeRole = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  if (normalizedValue === 'dept_head' || normalizedValue === 'depthead') return 'depthead';
  if (normalizedValue === 'system_admin' || normalizedValue === 'systemadmin' || normalizedValue === 'admin') return 'systemadmin';
  if (normalizedValue === 'college_dean' || normalizedValue === 'dean') return 'college_dean';
  if (normalizedValue === 'academic_directorate' || normalizedValue === 'academic_director' || normalizedValue === 'directorate') return 'academic_directorate';
  if (['academic_vice_president', 'vice_president', 'vice-president', 'vice president'].includes(normalizedValue)) return 'academic_vice_president';
  if (normalizedValue === 'lab_assistant') return 'lab_assistant';
  if (normalizedValue === 'instructor') return 'instructor';
  return 'student';
};

const normalizeProfilePhoto = (value) => {
  const candidate = String(value || '').trim();
  if (!candidate) return null;
  if (candidate.startsWith('http://') || candidate.startsWith('https://') || candidate.startsWith('data:')) {
    return candidate;
  }
  if (candidate.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${candidate}`;
    }
    return candidate;
  }
  return candidate;
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(() => Boolean(typeof window !== 'undefined' && (window.localStorage.getItem('ipesAuthToken') || window.localStorage.getItem('token'))));

  const [authToken, setAuthToken] = useState(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('ipesAuthToken') || window.localStorage.getItem('token');
  });

  const [role, setRole] = useState(() => {
    if (typeof window === 'undefined') return null;
    return normalizeRole(window.localStorage.getItem('role'));
  });

  const [accounts, setAccounts] = useState([]);

  const navigate = useNavigate();
  const user = session?.name ? session : null;
  const userRole = session?.role || role || null;
  const isFirstLogin = Boolean(session?.isFirstLogin ?? session?.is_first_login ?? false);

  useEffect(() => {
    if (!authToken) {
      setSession(null);
      setRole(null);
      setIsAuthLoading(false);
      return;
    }

    const loadUserProfile = async () => {
      try {
        const profile = await authApi.me();
        const profilePhoto = normalizeProfilePhoto(profile.profile_photo || profile.profile_picture || profile.avatar);
        const normalizedProfileRole = normalizeRole(profile.role);
        const hydratedUser = {
          ...profile,
          name: profile.full_name || profile.name || profile.username,
          username: profile.username || profile.email,
          role: normalizedProfileRole,
          profile_photo: profilePhoto,
          profile_picture: profilePhoto,
          avatar: profilePhoto,
          isFirstLogin: Boolean(profile.isFirstLogin ?? profile.is_first_login ?? false),
        };
        setSession(hydratedUser);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('user', JSON.stringify(hydratedUser));
          window.localStorage.setItem('userData', JSON.stringify(hydratedUser));
        }
        setRole(normalizedProfileRole);
      } catch {
        setAuthToken(null);
        setRole(null);
        setSession(null);
      } finally {
        setIsAuthLoading(false);
      }
    };

    loadUserProfile();
  }, [authToken]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (authToken) {
      window.localStorage.setItem('ipesAuthToken', authToken);
      window.localStorage.setItem('token', authToken);
    } else {
      window.localStorage.removeItem('ipesAuthToken');
      window.localStorage.removeItem('token');
    }
  }, [authToken]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedUser = window.localStorage.getItem('user');
    if (!storedUser) return;

    try {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser && (parsedUser.username || parsedUser.first_name || parsedUser.last_name || parsedUser.full_name)) {
        const storedPhoto = normalizeProfilePhoto(parsedUser.profile_photo || parsedUser.profile_picture || parsedUser.avatar);
        const hydratedStoredUser = {
          ...parsedUser,
          role: normalizeRole(parsedUser.role),
          profile_photo: storedPhoto,
          profile_picture: storedPhoto,
          avatar: storedPhoto,
          isFirstLogin: Boolean(parsedUser.isFirstLogin ?? parsedUser.is_first_login ?? false),
          name: parsedUser.full_name || `${parsedUser.first_name || ''} ${parsedUser.last_name || ''}`.trim() || parsedUser.username,
        };
        setSession(hydratedStoredUser);
        setRole(normalizeRole(parsedUser.role));
      }
    } catch (error) {
      console.warn('Unable to parse stored user profile:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (role) {
      window.localStorage.setItem('role', role);
    } else {
      window.localStorage.removeItem('role');
    }
  }, [role]);

  const login = (username, password) => {
    const normalizedUsername = username.trim().toLowerCase();
    const account = accounts.find(
      (acct) => acct.username.trim().toLowerCase() === normalizedUsername && acct.password === password
    );

    if (!account) {
      return null;
    }

    const normalizedRole = normalizeRole(account.role);
    setSession({
      name: account.name || account.username,
      username: account.username,
      role: normalizedRole,
    });
    setRole(normalizedRole);

    return account;
  };

  const setAuthSession = (token, user) => {
    if (!token || !user) return false;
    const normalizedRole = normalizeRole(user.role);
    const photo = normalizeProfilePhoto(user.profile_photo || user.profile_picture || user.avatar);
    const fullUser = {
      ...user,
      id: user.id ?? user.user_id ?? null,
      username: user.username ?? null,
      first_name: user.first_name || user.firstName || null,
      last_name: user.last_name || user.lastName || null,
      full_name: user.full_name || [user.first_name || user.firstName, user.last_name || user.lastName].filter(Boolean).join(' ') || user.username || null,
      role: normalizedRole,
      profile_photo: photo,
      profile_picture: photo,
      avatar: photo,
      isFirstLogin: Boolean(user.isFirstLogin ?? user.is_first_login ?? false),
    };

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ipesAuthToken', token);
      window.localStorage.setItem('token', token);
      window.localStorage.setItem('role', normalizedRole);
      window.localStorage.setItem('user', JSON.stringify(fullUser));
      window.localStorage.setItem('userData', JSON.stringify(fullUser));
    }
    setAuthToken(token);
    setRole(normalizedRole);
    setSession(fullUser);
    return true;
  };

  const updateUser = (updates) => {
    if (!session || !updates || typeof updates !== 'object') return false;
    const photo = normalizeProfilePhoto(updates.profile_photo || updates.profile_picture || updates.avatar || session.profile_photo || session.profile_picture || session.avatar);
    const updatedUser = {
      ...session,
      ...updates,
      profile_photo: photo,
      profile_picture: photo,
      avatar: photo,
    };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('user', JSON.stringify(updatedUser));
      window.localStorage.setItem('userData', JSON.stringify(updatedUser));
    }
    setSession(updatedUser);
    return true;
  };

  const registerUser = (newAccount) => {
    const username = (newAccount.username || '').trim().toLowerCase();
    const email = (newAccount.email || '').trim().toLowerCase();
    const candidate = username || email;

    if (!candidate) {
      return false;
    }

    const alreadyExists = accounts.some((acct) => {
      const acctUsername = (acct.username || '').trim().toLowerCase();
      const acctEmail = (acct.email || '').trim().toLowerCase();
      return acctUsername === candidate || acctEmail === candidate;
    });

    if (alreadyExists) {
      return false;
    }

    setAccounts((current) => [
      ...current,
      {
        ...newAccount,
        username: username || email,
        email: email || undefined,
      },
    ]);

    return true;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.warn('Logout request failed:', error?.message || error);
    }

    if (typeof window !== 'undefined') {
      const keysToClear = ['isLoggedIn', 'userData', 'user', 'ipesAuthToken', 'token', 'role'];
      keysToClear.forEach((key) => {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      });
    }

    setSession(null);
    setAuthToken(null);
    setRole(null);
    navigate('/login', { replace: true });
  };

  const value = useMemo(
    () => ({
      user,
      role: userRole,
      accounts,
      authToken,
      isAuthenticated: Boolean(session),
      isAuthLoading,
      isFirstLogin,
      login,
      logout,
      registerUser,
      setAuthSession,
      updateUser,
    }),
    [authToken, userRole, user, accounts, isFirstLogin, isAuthLoading, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
