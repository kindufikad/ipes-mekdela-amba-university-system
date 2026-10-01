import { useContext, useEffect, useRef, useState } from 'react';
import { ChevronDown, KeyRound, LayoutDashboard, LogOut, Menu, MoonStar, Settings, SunMedium, UserCircle, UserRound, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/useAuth';
import { LanguageContext } from '../context/LanguageContext';
import { useTranslation } from '../context/useTranslation';
import { ThemeContext } from '../context/ThemeContextValue';
import { adminApi, authApi, evaluationApi } from '../services/api';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';

const dashboardRoutes = {
  systemadmin: '/admin/dashboard',
  admin: '/admin/dashboard',
  depthead: '/dept-head/dashboard',
  dept_head: '/dept-head/dashboard',
  college_dean: '/dean/dashboard',
  dean: '/dean/dashboard',
  academic_directorate: '/directorate/dashboard',
  academic_director: '/directorate/dashboard',
  directorate: '/directorate/dashboard',
  instructor: '/instructor-dashboard',
  student: '/student-dashboard',
  lab_assistant: '/lab-assistant/dashboard',
};

const roleLabels = {
  systemadmin: 'systemadmin',
  system_admin: 'systemadmin',
  admin: 'systemadmin',
  depthead: 'depthead',
  dept_head: 'depthead',
  college_dean: 'college_dean',
  dean: 'college_dean',
  academic_directorate: 'academic_directorate',
  academic_director: 'academic_directorate',
  directorate: 'academic_directorate',
  instructor: 'instructor',
  student: 'student',
  lab_assistant: 'lab_assistant',
};

const settingsStorageKey = 'ipes-dashboard-settings';
const formatForInput = (isoDate) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16);
};

const Header = ({ isMobileMenuOpen, setIsMobileMenuOpen, hasMobileNavigation }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage } = useContext(LanguageContext);
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [deadlineSettings, setDeadlineSettings] = useState({ deadlineAt: '', autoLock: true });
  const [deadlineSaving, setDeadlineSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [settingsState, setSettingsState] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(settingsStorageKey) || '{}');
      return {
        emailNotifications: saved.emailNotifications ?? true,
        systemNotifications: saved.systemNotifications ?? true,
        language: saved.language ?? language,
        theme: saved.theme ?? (isDark ? 'dark' : 'light'),
      };
    } catch (error) {
      return {
        emailNotifications: true,
        systemNotifications: true,
        language,
        theme: isDark ? 'dark' : 'light',
      };
    }
  });
  const menuRef = useRef(null);

  let storedUser = {};
  if (typeof window !== 'undefined') {
    try {
      storedUser = JSON.parse(window.localStorage.getItem('user') || '{}');
    } catch {
      storedUser = {};
    }
  }

  useEffect(() => {
    const closeMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isMobileMenuOpen]);

  const normalizedRole = String(user?.role || role || storedUser?.role || '').trim().toLowerCase();
  const currentUser = { ...storedUser, ...user };
  const dashboardPath = dashboardRoutes[normalizedRole] || '/login';
  const displayName = currentUser.name || currentUser.full_name || currentUser.fullName || currentUser.username || currentUser.email || 'User';
  const email = currentUser.email || currentUser.username || 'user@university.edu';
  const roleLabel = t(`roles.${roleLabels[normalizedRole] || 'user'}`);

  useEffect(() => {
    try {
      const nextSettings = {
        ...settingsState,
        language,
      };
      window.localStorage.setItem(settingsStorageKey, JSON.stringify(nextSettings));
    } catch (error) {
      console.warn('Unable to save dashboard settings:', error);
    }
  }, [language, settingsState]);

  const handleLogout = async () => {
    setIsOpen(false);
    setIsMobileMenuOpen(false);
    if (typeof window !== 'undefined') window.localStorage.clear();
    await logout();
  };

  const navigateAndClose = (path) => {
    setIsOpen(false);
    setIsMobileMenuOpen(false);
    navigate(path);
  };

  const resetPasswordForm = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const closePasswordModal = () => {
    resetPasswordForm();
    setIsChangePasswordOpen(false);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('header.fillPasswordFields'));
      return;
    }

    if (newPassword.length < 8) {
      toast.error(t('header.passwordMinLength'));
      return;
    }

    if (newPassword === currentPassword) {
      toast.error(t('header.passwordMustDiffer'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('header.passwordMismatch'));
      return;
    }

    try {
      setIsSubmittingPassword(true);
      const changePassword = ['admin', 'systemadmin', 'system_admin'].includes(normalizedRole)
        ? adminApi.changePassword
        : authApi.changePassword;
      const response = await changePassword({ currentPassword, newPassword, confirmPassword });
      const nextToken = response?.token || response?.data?.token || null;
      const updatedUser = response?.user || response?.data?.user || null;

      if (nextToken && updatedUser) {
        const normalizedUser = { ...currentUser, ...updatedUser, role: updatedUser.role || user?.role || role };
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('token', nextToken);
          window.localStorage.setItem('ipesAuthToken', nextToken);
          window.localStorage.setItem('user', JSON.stringify(normalizedUser));
        }
      }

      toast.success(t('header.passwordUpdated'));
      closePasswordModal();
    } catch (error) {
      toast.error(error?.message || t('header.passwordUpdateError'));
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleSettingToggle = (field) => {
    setSettingsState((current) => ({ ...current, [field]: !current[field] }));
  };

  const handleSettingsSave = () => {
    setLanguage(settingsState.language);
    if ((settingsState.theme === 'dark') !== isDark) toggleTheme();
    setIsSettingsOpen(false);
    toast.success(t('header.settingsSaved'));
  };

  useEffect(() => {
    if (!isSettingsOpen || !['dept_head', 'depthead', 'department_head'].includes(normalizedRole)) return;
    evaluationApi.getEvaluationDeadline().then((settings) => setDeadlineSettings({ deadlineAt: formatForInput(settings?.currentDeadline || settings?.deadlineAt), autoLock: settings?.autoLock !== false })).catch((error) => toast.error(error?.message || t('header.deadlineLoadError')));
  }, [isSettingsOpen, normalizedRole]);

  const extendDeadline = (days) => {
    const base = deadlineSettings.deadlineAt ? new Date(deadlineSettings.deadlineAt) : new Date();
    base.setDate(base.getDate() + days);
    setDeadlineSettings((current) => ({ ...current, deadlineAt: formatForInput(base) }));
  };

  const saveEvaluationDeadline = async () => {
    if (!deadlineSettings.deadlineAt) return toast.error(t('header.deadlineRequired'));
    setDeadlineSaving(true);
    try {
      await evaluationApi.updateEvaluationDeadline(deadlineSettings);
      toast.success(t('header.deadlineSaved'));
    } catch (error) { toast.error(error?.message || t('header.deadlineError')); }
    finally { setDeadlineSaving(false); }
  };

  return (
    <>
    <header className="fixed inset-x-0 top-0 z-[60] h-16 bg-[#1e3a8a] text-white shadow-lg">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4 lg:px-8">
        <Link to={dashboardPath} className="flex min-w-0 items-center gap-3" aria-label={t('header.dashboardAria')}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#facc15] text-sm font-extrabold text-[#1e3a8a] shadow-sm">(IPES)</span>
          <span className="hidden min-w-0 leading-tight sm:block">
            <span className="block truncate text-sm font-bold sm:text-base">{t('header.productName')}</span>
            <span className="block truncate text-[11px] text-blue-100 sm:text-xs">{t('header.university')}</span>
          </span>
        </Link>

        <div id="header-mobile-controls" className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2 md:gap-4">
          <LanguageSwitcher />
          <NotificationBell />
          <div className="hidden h-8 w-px bg-white/20 md:block" />
          <div ref={menuRef} className="relative">
            <button type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/10">
              {currentUser.profile_picture ? (
                <img src={currentUser.profile_picture} alt="" className="h-7 w-7 rounded-full border border-white/50 object-cover" />
              ) : (
                <UserCircle className="h-6 w-6" />
              )}
              <span className="hidden max-w-36 truncate text-sm font-semibold sm:block">{email}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-700">
                  <p className="font-semibold">{displayName}</p>
                  <p className="mt-1 truncate text-sm text-slate-500">{email}</p>
                  <span className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{roleLabel}</span>
                </div>
                <nav className="p-2" aria-label={t('header.accountMenuAria')}>
                  <button type="button" onClick={() => navigateAndClose(dashboardPath)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"><LayoutDashboard className="h-4 w-4" /> {t('header.myDashboard')}</button>
                  <button type="button" onClick={() => navigateAndClose('/profile')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"><UserRound className="h-4 w-4" /> {t('header.viewProfile')}</button>
                  <button type="button" onClick={() => { setIsOpen(false); setIsMobileMenuOpen(false); setIsChangePasswordOpen(true); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"><KeyRound className="h-4 w-4" /> {t('header.changePassword')}</button>
                  <button type="button" onClick={() => { setIsOpen(false); setIsMobileMenuOpen(false); setIsSettingsOpen(true); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"><Settings className="h-4 w-4" /> {t('header.dashboardSettings')}</button>
                  <button type="button" onClick={handleLogout} className="mt-1 flex w-full items-center gap-3 border-t border-slate-100 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:border-slate-700 dark:hover:bg-red-950/40"><LogOut className="h-4 w-4" /> {t('header.signOut')}</button>
                </nav>
              </div>
            )}
          </div>
        </div>
        {hasMobileNavigation && <button type="button" onClick={() => setIsMobileMenuOpen((open) => !open)} className="shrink-0 rounded-lg p-2 text-white hover:bg-white/10 md:hidden" aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={isMobileMenuOpen} aria-controls="dashboard-mobile-drawer">
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>}
      </div>
    </header>

    {isChangePasswordOpen && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">{t('header.security')}</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-800">{t('header.changePassword')}</h2>
            </div>
            <button type="button" aria-label={t('header.close')} onClick={closePasswordModal} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('header.currentPassword')}</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder={t('header.enterCurrentPassword')}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('header.newPassword')}</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder={t('header.enterNewPassword')}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('header.confirmPassword')}</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder={t('header.confirmNewPassword')}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closePasswordModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">{t('header.cancel')}</button>
              <button type="submit" disabled={isSubmittingPassword} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
                {isSubmittingPassword ? t('header.updating') : t('header.updatePassword')}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {isSettingsOpen && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
        <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl custom-scrollbar">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">{t('header.preferences')}</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-800">{t('header.dashboardSettings')}</h2>
            </div>
            <button type="button" aria-label={t('header.close')} onClick={() => setIsSettingsOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div>
                <p className="font-medium text-slate-800">{t('header.systemTheme')}</p>
                <p className="text-sm text-slate-500">{t('header.lightDark')}</p>
              </div>
              <button type="button" onClick={() => { toggleTheme(); setSettingsState((current) => ({ ...current, theme: isDark ? 'light' : 'dark' })); }} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                {isDark ? t('header.dark') : t('header.light')}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <p className="font-medium text-slate-800">{t('header.notifications')}</p>
              <div className="mt-3 space-y-3">
                <label className="flex items-center justify-between text-sm text-slate-700">
                  <span>{t('header.emailNotifications')}</span>
                  <input type="checkbox" checked={settingsState.emailNotifications} onChange={() => handleSettingToggle('emailNotifications')} className="h-4 w-4 accent-blue-600" />
                </label>
                <label className="flex items-center justify-between text-sm text-slate-700">
                  <span>{t('header.systemNotifications')}</span>
                  <input type="checkbox" checked={settingsState.systemNotifications} onChange={() => handleSettingToggle('systemNotifications')} className="h-4 w-4 accent-blue-600" />
                </label>
              </div>
            </div>

            {['dept_head', 'depthead', 'department_head'].includes(normalizedRole) && <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <div><p className="font-semibold text-slate-800">{t('header.evaluationPeriod')}</p><p className="mt-1 text-sm text-slate-500">{t('header.deadlineDescription')}</p></div>
              <label className="mt-4 block text-sm font-medium text-slate-700">{t('header.academicDeadline')}<input type="datetime-local" value={deadlineSettings.deadlineAt} onChange={(event) => setDeadlineSettings((current) => ({ ...current, deadlineAt: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" /></label>
              <div className="mt-3 flex flex-wrap gap-2"><span className="self-center text-xs font-semibold text-slate-500">{t('header.quickExtension')}</span>{[3, 7, 14].map((days) => <button key={days} type="button" onClick={() => extendDeadline(days)} className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">+{days} {t('header.days')}</button>)}</div>
              <label className="mt-4 flex items-center justify-between text-sm font-medium text-slate-700"><span>{t('header.autoLock')}</span><input type="checkbox" checked={deadlineSettings.autoLock} onChange={(event) => setDeadlineSettings((current) => ({ ...current, autoLock: event.target.checked }))} className="h-4 w-4 accent-blue-600" /></label>
              <button type="button" onClick={saveEvaluationDeadline} disabled={deadlineSaving} className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{deadlineSaving ? t('header.savingDeadline') : t('header.saveDeadline')}</button>
            </div>}

            <div className="rounded-xl border border-slate-200 p-3">
              <p className="font-medium text-slate-800">{t('header.language')}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setSettingsState((current) => ({ ...current, language: 'en' }))} className={`rounded-xl border px-3 py-2 text-sm font-medium ${settingsState.language === 'en' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
                  {t('header.english')}
                </button>
                <button type="button" onClick={() => setSettingsState((current) => ({ ...current, language: 'am' }))} className={`rounded-xl border px-3 py-2 text-sm font-medium ${settingsState.language === 'am' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
                  {t('header.amharic')}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setIsSettingsOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">{t('header.close')}</button>
            <button type="button" onClick={handleSettingsSave} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">{t('header.saveSettings')}</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Header;
