import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { employeeApi } from '../../api/employees';
import type { Employee } from '../../types';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { ProfileAvatar } from '../../components/ui/ProfileAvatar';
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react';

export default function Employees() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isAdmin } = useAuth();

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await employeeApi.getAll();
      if (response.success && response.data) {
        setEmployees(response.data);
      } else {
        showToast('error', response.message || t('employees.toasts.loadFailed'));
      }
    } catch {
      showToast('error', t('employees.toasts.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    setIsDeleting(true);
    try {
      const response = await employeeApi.delete(deleteModal.id);
      if (response.success) {
        showToast('success', t('employees.toasts.deleted'));
        setEmployees((prev) => prev.filter((e) => e.id !== deleteModal.id));
      } else {
        showToast('error', response.message || t('employees.toasts.deleteFailed'));
      }
    } catch {
      showToast('error', t('employees.toasts.deleteFailed'));
    } finally {
      setIsDeleting(false);
      setDeleteModal(null);
    }
  };

  const filtered = employees.filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      emp.department.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('employees.title')}</h1>
          <p className="text-sm text-gray-500">{t('employees.registeredCount', { count: employees.length })}</p>
        </div>
        <Button onClick={() => navigate('/employees/new')} icon={<Plus className="h-4 w-4" />}>{t('employees.addEmployee')}</Button>
      </div>

      <div className="max-w-sm">
        <Input placeholder={t('employees.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="h-4 w-4" />} />
      </div>

      {filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('employees.table.id')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('employees.table.fullName')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('employees.table.division')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('employees.table.jobTitle')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('employees.table.department')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('employees.table.phone')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('employees.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{emp.employeeId}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProfileAvatar name={emp.fullName} src={emp.profilePicturePath} size="sm" />
                      <span className="font-medium text-gray-900">{emp.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.division}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.jobTitle}</td>
                  <td className="px-4 py-3"><span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded">{emp.department}</span></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{emp.phoneNumber}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/employees/${emp.id}/edit`)}
                        className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title={t('employees.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeleteModal({ id: emp.id, name: emp.fullName })}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title={t('employees.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<Users className="h-8 w-8" />} title={search ? t('employees.empty.noSearch') : t('employees.empty.noEmployees')}
          description={search ? t('employees.empty.tryDifferent') : t('employees.empty.registerFirst')}
          action={!search ? <Button onClick={() => navigate('/employees/new')} icon={<Plus className="h-4 w-4" />}>{t('employees.registerEmployee')}</Button> : undefined} />
      )}

      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title={t('employees.deleteModal.title')} size="sm">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
          <ProfileAvatar
            name={deleteModal?.name}
            src={employees.find((e) => e.id === deleteModal?.id)?.profilePicturePath}
            size="sm"
          />
          <p className="text-sm text-red-700">{t('employees.deleteModal.confirmBefore')} <strong>{deleteModal?.name}</strong>{t('employees.deleteModal.confirmAfter')}</p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteModal(null)}>{t('common.cancel')}</Button>
          <Button variant="danger" isLoading={isDeleting} onClick={handleDelete}>{t('employees.delete')}</Button>
        </div>
      </Modal>
    </div>
  );
}
