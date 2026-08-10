import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../api/users';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ProfileAvatar } from '../../components/ui/ProfileAvatar';
import { LanguageSelector } from '../../i18n/LanguageSelector';
import { QrCodeCard } from '../../components/QrCodeCard';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ClipboardCheck,
  FileBarChart,
  UserCog,
  LogOut,
  Menu,
  X,
  Building2,
  ChevronRight,
  KeyRound,
  Eye,
  EyeOff,
  Settings,
  AlertTriangle,
  CircleUserRound,
  QrCode,
} from 'lucide-react';

const navigation = [
  { key: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard, adminOnly: true },
  { key: 'nav.takeAttendance', href: '/attendance', icon: ClipboardCheck },
  { key: 'nav.myProfile', href: '/profile', icon: CircleUserRound },
  { key: 'nav.employees', href: '/employees', icon: Users, adminOnly: true },
  { key: 'nav.registerEmployee', href: '/employees/new', icon: UserPlus, adminOnly: true },
  { key: 'nav.reports', href: '/reports', icon: FileBarChart, adminOnly: true },
  { key: 'nav.users', href: '/users', icon: UserCog, adminOnly: true },
];

export function Sidebar() {
  const { t } = useTranslation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout, isAdmin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Change Password state
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwdField, setShowConfirmPwdField] = useState(false);

  // Delete Account state
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleChangePassword = async () => {
    setPwdError('');
    if (!currentPassword) { setPwdError(t('password.errors.currentRequired')); return; }
    if (!newPassword || newPassword.length < 6) { setPwdError(t('password.errors.minLength')); return; }
    if (newPassword !== confirmPwd) { setPwdError(t('password.errors.mismatch')); return; }

    setIsChangingPwd(true);
    try {
      const res = await userApi.changePassword({
        userId: user?.userId || '',
        currentPassword,
        newPassword,
      });
      if (res.success) {
        showToast('success', t('password.success'));
        setShowChangePwd(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPwd('');
      } else {
        setPwdError(res.message || t('password.failed'));
      }
    } catch {
      setPwdError(t('password.failedRetry'));
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const res = await userApi.deleteCurrentUser();
      if (res.success) {
        showToast('success', t('deleteAccount.success'));
        setShowDeleteAccount(false);
        await logout();
        navigate('/login');
      } else {
        showToast('error', res.message || t('deleteAccount.failed'));
      }
    } catch {
      showToast('error', t('deleteAccount.failed'));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const filteredNav = navigation.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 rounded-lg p-2 bg-white border border-gray-200 shadow-sm lg:hidden"
        aria-label={t('nav.toggleMenu')}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-white border-r border-gray-200',
          'transition-transform duration-300 ease-in-out lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-gray-100 bg-blue-700">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">CBE</h1>
            <p className="text-[10px] text-blue-100 leading-tight">{t('app.tagline')}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  'hover:bg-gray-100 group',
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900'
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{t(item.key)}</span>
              <ChevronRight className="h-4 w-4 opacity-0 -ml-2 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <LanguageSelector compact className="flex-1" />
            <button
              onClick={() => setShowQr(true)}
              className="flex items-center justify-center rounded-lg border border-gray-300 bg-white p-2 text-gray-500 hover:bg-gray-50 hover:text-blue-700 transition-colors"
              title={t('qr.title')}
              aria-label={t('qr.title')}
            >
              <QrCode className="h-4 w-4" />
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <ProfileAvatar name={user?.userName} src={user?.profilePicturePath} size="sm" />
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.userName || t('common.user')}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
              </div>
              <Settings className="h-4 w-4 text-gray-400" />
            </button>

            {/* User Settings Menu */}
            {showUserMenu && (
              <div ref={userMenuRef} className="mb-2 rounded-lg bg-gray-50 border border-gray-200 p-1.5 space-y-0.5 animate-fadeIn">
                <button
                  onClick={() => { navigate('/profile'); setShowUserMenu(false); }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-white hover:shadow-sm transition-all"
                >
                  <CircleUserRound className="h-4 w-4 text-gray-400" />
                  {t('userMenu.myProfile')}
                </button>
                <button
                  onClick={() => { setShowChangePwd(true); setShowUserMenu(false); }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-white hover:shadow-sm transition-all"
                >
                  <KeyRound className="h-4 w-4 text-gray-400" />
                  {t('userMenu.changePassword')}
                </button>
                <button
                  onClick={() => { setShowDeleteAccount(true); setShowUserMenu(false); }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-white hover:shadow-sm transition-all"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {t('userMenu.deleteAccount')}
                </button>
                <div className="border-t border-gray-200 my-1" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-white hover:shadow-sm transition-all"
                >
                  <LogOut className="h-4 w-4 text-gray-400" />
                  {t('userMenu.signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* QR Code Modal */}
      <Modal isOpen={showQr} onClose={() => setShowQr(false)} title={t('qr.title')} size="md">
        <QrCodeCard />
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={showChangePwd} onClose={() => { setShowChangePwd(false); setPwdError(''); setCurrentPassword(''); setNewPassword(''); setConfirmPwd(''); }} title={t('password.title')} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }} className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
            <KeyRound className="h-5 w-5 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-700">{t('password.hint')}</p>
          </div>
          <Input
            label={t('password.current')}
            type={showCurrentPwd ? 'text' : 'password'}
            placeholder={t('password.currentPlaceholder')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            icon={<KeyRound className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                tabIndex={-1}
              >
                {showCurrentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            required
          />
          <Input
            label={t('password.new')}
            type={showNewPwd ? 'text' : 'password'}
            placeholder={t('password.newPlaceholder')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            icon={<KeyRound className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowNewPwd(!showNewPwd)}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                tabIndex={-1}
              >
                {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            required
            minLength={6}
          />
          <Input
            label={t('password.confirm')}
            type={showConfirmPwdField ? 'text' : 'password'}
            placeholder={t('password.confirmPlaceholder')}
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            icon={<KeyRound className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirmPwdField(!showConfirmPwdField)}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                tabIndex={-1}
              >
                {showConfirmPwdField ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            required
          />
          {pwdError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{pwdError}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => { setShowChangePwd(false); setPwdError(''); setCurrentPassword(''); setNewPassword(''); setConfirmPwd(''); }}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={isChangingPwd}>
              {t('password.title')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Account Modal */}
      <Modal isOpen={showDeleteAccount} onClose={() => setShowDeleteAccount(false)} title={t('deleteAccount.title')} size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">{t('deleteAccount.warning')}</p>
              <p className="text-sm text-red-600 mt-1">
                {t('deleteAccount.description')}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteAccount(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" isLoading={isDeletingAccount} onClick={handleDeleteAccount}>
              {t('deleteAccount.confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
