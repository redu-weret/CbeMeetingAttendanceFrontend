import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { userApi } from '../../api/users';
import type { UserDto } from '../../types';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { ProfileAvatar } from '../../components/ui/ProfileAvatar';
import { Users as UsersIcon, Shield, Trash2, Mail, Lock, UserCog, AlertTriangle } from 'lucide-react';

export default function Users() {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [roleModal, setRoleModal] = useState<{ user: UserDto; action: 'assign' | 'change' | 'remove' } | null>(null);
  const [roleName, setRoleName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [passwordModal, setPasswordModal] = useState<{ user: UserDto } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ user: UserDto } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await userApi.getAll();
      if (res.success && res.data) setUsers(res.data);
    } catch { showToast('error', t('users.toasts.loadFailed')); }
    finally { setIsLoading(false); }
  }, [showToast, t]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleAction = async () => {
    if (!roleModal) return;
    setIsProcessing(true);
    try {
      let res;
      if (roleModal.action === 'assign') res = await userApi.assignRole({ userId: roleModal.user.id, roleName });
      else if (roleModal.action === 'change') res = await userApi.changeRole({ userId: roleModal.user.id, currentRole: roleName, newRole });
      else res = await userApi.removeRole({ userId: roleModal.user.id, roleName });
      if (res.success) {
        showToast('success', res.message || t('users.toasts.roleUpdated'));
        fetchUsers(); setRoleModal(null); setRoleName(''); setNewRole('');
      } else showToast('error', res.message || t('users.toasts.roleUpdateFailed'));
    } catch { showToast('error', t('users.toasts.roleUpdateFailed')); }
    finally { setIsProcessing(false); }
  };

  const handleResetPassword = async () => {
    if (!passwordModal) return;
    setIsProcessing(true);
    try {
      const res = await userApi.resetPassword({ userId: passwordModal.user.id, newPassword });
      if (res.success) { showToast('success', t('users.toasts.passwordReset')); setPasswordModal(null); setNewPassword(''); }
      else showToast('error', res.message || t('users.toasts.passwordResetFailed'));
    } catch { showToast('error', t('users.toasts.passwordResetFailed')); }
    finally { setIsProcessing(false); }
  };

  const handleDeleteUser = async () => {
    if (!deleteModal) return;
    setIsProcessing(true);
    try {
      const res = await userApi.deleteUser(deleteModal.user.id);
      if (res.success) {
        showToast('success', t('users.toasts.userDeleted'));
        setUsers((prev) => prev.filter((u) => u.id !== deleteModal.user.id));
        setDeleteModal(null);
      } else showToast('error', res.message || t('users.toasts.deleteFailed'));
    } catch { showToast('error', t('users.toasts.deleteFailed')); }
    finally { setIsProcessing(false); }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) { case 'Admin': return 'danger' as const; case 'Manager': return 'warning' as const; default: return 'default' as const; }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('users.registeredCount', { count: users.length })}</p>
      </div>

      {users.length > 0 ? (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id} hover>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <ProfileAvatar name={user.userName} src={user.profilePicturePath} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{user.userName}</h3>
                        <div className="flex gap-1.5">{user.roles.map((role) => (<Badge key={role} variant={getRoleBadgeVariant(role)}>{role}</Badge>))}</div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{user.email || t('users.noEmail')}</span>
                        {user.employee && (<><span className="text-gray-300">•</span><span className="flex items-center gap-1"><UserCog className="h-3 w-3" />{user.employee.fullName}</span></>)}
                      </div>
                      {user.lockoutEnabled && user.lockoutEnd && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{t('users.lockedUntil', { date: new Date(user.lockoutEnd).toLocaleDateString(i18n.resolvedLanguage) })}</p>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2 shrink-0 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => { setRoleModal({ user, action: 'assign' }); setRoleName(''); }} icon={<Shield className="h-3.5 w-3.5" />}>{t('users.assignRole')}</Button>
                      <Button variant="outline" size="sm" onClick={() => { setRoleModal({ user, action: 'change' }); setRoleName(''); setNewRole(''); }} icon={<Shield className="h-3.5 w-3.5" />}>{t('users.changeRole')}</Button>
                      <Button variant="outline" size="sm" onClick={() => { setRoleModal({ user, action: 'remove' }); setRoleName(''); }} icon={<Shield className="h-3.5 w-3.5" />}>{t('users.removeRole')}</Button>
                      <Button variant="outline" size="sm" onClick={() => setPasswordModal({ user })} icon={<Lock className="h-3.5 w-3.5" />}>{t('users.resetPassword')}</Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ user })} className="text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<UsersIcon className="h-8 w-8" />} title={t('users.empty.title')} description={t('users.empty.description')} />
      )}

      <Modal isOpen={!!roleModal} onClose={() => setRoleModal(null)} title={roleModal?.action === 'assign' ? t('users.modal.assignTitle') : roleModal?.action === 'change' ? t('users.modal.changeTitle') : t('users.modal.removeTitle')} size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <ProfileAvatar name={roleModal?.user.userName} src={roleModal?.user.profilePicturePath} size="sm" />
            <div><p className="text-sm font-medium text-gray-900">{roleModal?.user.userName}</p><p className="text-xs text-gray-500">{roleModal?.user.email}</p></div>
          </div>
          <p className="text-sm text-gray-600">
            {roleModal?.action === 'assign' && t('users.modal.assignText', { name: roleModal?.user.userName })}
            {roleModal?.action === 'change' && t('users.modal.changeText', { name: roleModal?.user.userName })}
            {roleModal?.action === 'remove' && t('users.modal.removeText', { name: roleModal?.user.userName })}
          </p>
          <Input label={t('users.roleName')} placeholder={t('users.roleNamePlaceholder')} value={roleName} onChange={(e) => setRoleName(e.target.value)} required />
          {roleModal?.action === 'change' && <Input label={t('users.newRole')} placeholder={t('users.newRolePlaceholder')} value={newRole} onChange={(e) => setNewRole(e.target.value)} required />}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setRoleModal(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleRoleAction} isLoading={isProcessing}>{roleModal?.action === 'assign' ? t('users.assignBtn') : roleModal?.action === 'change' ? t('users.changeBtn') : t('users.removeBtn')}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!passwordModal} onClose={() => setPasswordModal(null)} title={t('users.passwordModal.title')} size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-700"><Lock className="h-4 w-4" /></div>
            <div><p className="text-sm font-medium text-gray-900">{t('users.passwordModal.forUser')} <strong>{passwordModal?.user.userName}</strong></p><p className="text-xs text-gray-500">{t('users.passwordModal.hint')}</p></div>
          </div>
          <Input label={t('users.newPassword')} type="password" placeholder={t('users.newPasswordPlaceholder')} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} icon={<Lock className="h-4 w-4" />} required minLength={6} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setPasswordModal(null)}>{t('common.cancel')}</Button>
            <Button onClick={handleResetPassword} isLoading={isProcessing} disabled={!newPassword || newPassword.length < 6}>{t('users.resetBtn')}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title={t('users.deleteModal.title')} size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{t('users.deleteModal.confirmBefore')} <strong>{deleteModal?.user.userName}</strong>{t('users.deleteModal.confirmAfter')}</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteModal(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" isLoading={isProcessing} onClick={handleDeleteUser}>{t('users.deleteUserBtn')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
