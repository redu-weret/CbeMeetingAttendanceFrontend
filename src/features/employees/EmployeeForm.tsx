import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { employeeApi } from '../../api/employees';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
import { PageSpinner } from '../../components/ui/Spinner';
import { ProfileAvatar } from '../../components/ui/ProfileAvatar';
import { ArrowLeft, Save } from 'lucide-react';

interface FormData {
  employeeId: string;
  fullName: string;
  division: string;
  jobTitle: string;
  department: string;
  phoneNumber: string;
}

const emptyForm: FormData = {
  employeeId: '',
  fullName: '',
  division: '',
  jobTitle: '',
  department: '',
  phoneNumber: '',
};

export default function EmployeeForm() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  // Linked user's profile picture (admin view of the employee)
  const [picturePath, setPicturePath] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && id) {
      employeeApi.getById(id).then((res) => {
        if (res.success && res.data) {
          setForm({
            employeeId: res.data.employeeId,
            fullName: res.data.fullName,
            division: res.data.division,
            jobTitle: res.data.jobTitle,
            department: res.data.department,
            phoneNumber: res.data.phoneNumber,
          });
          setPicturePath(res.data.profilePicturePath ?? null);
        } else {
          showToast('error', t('employeeForm.toasts.notFound'));
          navigate('/employees');
        }
      }).catch(() => {
        showToast('error', t('employeeForm.toasts.loadFailed'));
        navigate('/employees');
      }).finally(() => setIsLoading(false));
    }
  }, [id, isEdit, navigate, showToast, t]);

  const validate = () => {
    const errs: Partial<FormData> = {};
    if (!isEdit && !form.employeeId.trim()) errs.employeeId = t('employeeForm.errors.employeeIdRequired');
    if (!form.fullName.trim()) errs.fullName = t('employeeForm.errors.fullNameRequired');
    if (!form.division.trim()) errs.division = t('employeeForm.errors.divisionRequired');
    if (!form.jobTitle.trim()) errs.jobTitle = t('employeeForm.errors.jobTitleRequired');
    if (!form.department.trim()) errs.department = t('employeeForm.errors.departmentRequired');
    if (!form.phoneNumber.trim()) {
      errs.phoneNumber = t('employeeForm.errors.phoneRequired');
    } else {
      const digitsOnly = form.phoneNumber.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 11) {
        errs.phoneNumber = t('employeeForm.errors.phoneInvalid');
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      if (isEdit && id) {
        const res = await employeeApi.update(id, {
          fullName: form.fullName.trim(),
          division: form.division.trim(),
          jobTitle: form.jobTitle.trim(),
          department: form.department.trim(),
          phoneNumber: form.phoneNumber.trim(),
        });
        if (res.success) {
          showToast('success', t('employeeForm.toasts.updated'));
          navigate('/employees');
        } else {
          showToast('error', res.message || t('employeeForm.toasts.updateFailed'));
        }
      } else {
        const res = await employeeApi.register({
          employeeId: form.employeeId.trim(),
          fullName: form.fullName.trim(),
          division: form.division.trim(),
          jobTitle: form.jobTitle.trim(),
          department: form.department.trim(),
          phoneNumber: form.phoneNumber.trim(),
        });
        if (res.success) {
          showToast('success', t('employeeForm.toasts.registered'));
          navigate('/employees');
        } else {
          showToast('error', res.message || t('employeeForm.toasts.registerFailed'));
        }
      }
    } catch {
      showToast('error', isEdit ? t('employeeForm.toasts.updateFailed') : t('employeeForm.toasts.registerFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/employees')} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {isEdit && <ProfileAvatar name={form.fullName || 'Employee'} src={picturePath} size="lg" />}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? t('employeeForm.editTitle') : t('employeeForm.registerTitle')}</h1>
          <p className="text-sm text-gray-500 mt-1">{isEdit ? t('employeeForm.editSubtitle') : t('employeeForm.registerSubtitle')}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {!isEdit && (
                <Input label={t('employeeForm.employeeId')} placeholder={t('employeeForm.employeeIdPlaceholder')} value={form.employeeId} onChange={(e) => updateField('employeeId', e.target.value)} error={errors.employeeId} required />
              )}
              <div className={isEdit ? 'sm:col-span-2' : ''}>
                <Input label={t('employeeForm.fullName')} placeholder={t('employeeForm.fullNamePlaceholder')} value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} error={errors.fullName} required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input label={t('employeeForm.division')} placeholder={t('employeeForm.divisionPlaceholder')} value={form.division} onChange={(e) => updateField('division', e.target.value)} error={errors.division} required />
              <Input label={t('employeeForm.jobTitle')} placeholder={t('employeeForm.jobTitlePlaceholder')} value={form.jobTitle} onChange={(e) => updateField('jobTitle', e.target.value)} error={errors.jobTitle} required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input label={t('employeeForm.department')} placeholder={t('employeeForm.departmentPlaceholder')} value={form.department} onChange={(e) => updateField('department', e.target.value)} error={errors.department} required />
              <Input label={t('employeeForm.phoneNumber')} type="tel" placeholder={t('employeeForm.phoneNumberPlaceholder')} value={form.phoneNumber} onChange={(e) => updateField('phoneNumber', e.target.value)} error={errors.phoneNumber} required />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/employees')}>{t('common.cancel')}</Button>
              <Button type="submit" isLoading={isSaving} icon={<Save className="h-4 w-4" />}>{isEdit ? t('employeeForm.updateBtn') : t('employeeForm.registerBtn')}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
