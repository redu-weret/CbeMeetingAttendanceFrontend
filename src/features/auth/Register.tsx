import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useApiError } from '../../hooks/useApiError';
import { LanguageSelector } from '../../i18n/LanguageSelector';
import { DemoModeBanner } from '../../components/ui/DemoModeBanner';
import { Mail, User, Lock, IdCard, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface FormState {
  email: string;
  userName: string;
  password: string;
  confirmPassword: string;
  employeeId: string;
}

interface FormFieldErrors {
  email?: string;
  userName?: string;
  password?: string;
  confirmPassword?: string;
  employeeId?: string;
}

const initialForm: FormState = {
  email: '',
  userName: '',
  password: '',
  confirmPassword: '',
  employeeId: '',
};

export default function Register() {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});

  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { parseError } = useApiError();

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field as keyof FormFieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setFieldErrors({});

    // Client-side validation
    const clientErrors: FormFieldErrors = {};
    if (!form.email.trim()) clientErrors.email = t('register.errors.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(form.email)) clientErrors.email = t('register.errors.emailInvalid');
    if (!form.userName.trim()) clientErrors.userName = t('register.errors.usernameRequired');
    if (!form.employeeId.trim()) clientErrors.employeeId = t('register.errors.employeeIdRequired');
    if (!form.password) clientErrors.password = t('register.errors.passwordRequired');
    else if (form.password.length < 6) clientErrors.password = t('register.errors.passwordMin');
    if (!form.confirmPassword) clientErrors.confirmPassword = t('register.errors.confirmRequired');
    else if (form.password !== form.confirmPassword) clientErrors.confirmPassword = t('register.errors.confirmMismatch');

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.register({
        email: form.email.trim(),
        userName: form.userName.trim(),
        password: form.password,
        employeeId: form.employeeId.trim(),
      });

      if (response.success && response.data) {
        login(response.data.token, response.data.refreshToken, response.data.user);
        showToast('success', t('register.success'));
        navigate('/dashboard');
      } else {
        const msg = response.message || t('register.failed');
        const inferred = inferFieldFromMessage(msg);
        if (Object.keys(inferred).length > 0) {
          setFieldErrors(inferred);
        } else {
          setGeneralError(msg);
        }
      }
    } catch (err: unknown) {
      const parsed = parseError(err);
      setGeneralError(parsed.general);
      // Map parsed field errors to form field names
      if (parsed.fields) {
        const mapped: FormFieldErrors = {};
        if (parsed.fields['email']) mapped.email = parsed.fields['email'];
        if (parsed.fields['username']) mapped.userName = parsed.fields['username'];
        if (parsed.fields['password']) mapped.password = parsed.fields['password'];
        if (parsed.fields['employeeid']) mapped.employeeId = parsed.fields['employeeid'];
        setFieldErrors(mapped);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4 py-8">
      <DemoModeBanner />
      {/* Language selector */}
      <div className="absolute top-4 right-4 w-40 sm:w-44">
        <LanguageSelector ariaLabel={t('language.label')} />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-lg shadow-blue-100 overflow-hidden">
              <img src="/cbe-logo.png" alt="CBE" className="h-14 w-14 object-contain" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('register.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('register.subtitle')}</p>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('register.emailLabel')}
              type="email"
              placeholder={t('register.emailPlaceholder')}
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              icon={<Mail className="h-4 w-4" />}
              error={fieldErrors.email}
              required
            />

            <Input
              label={t('register.usernameLabel')}
              type="text"
              placeholder={t('register.usernamePlaceholder')}
              value={form.userName}
              onChange={(e) => updateField('userName', e.target.value)}
              icon={<User className="h-4 w-4" />}
              error={fieldErrors.userName}
              required
            />

            <Input
              label={t('register.employeeIdLabel')}
              type="text"
              placeholder={t('register.employeeIdPlaceholder')}
              value={form.employeeId}
              onChange={(e) => updateField('employeeId', e.target.value)}
              icon={<IdCard className="h-4 w-4" />}
              error={fieldErrors.employeeId}
              required
            />

            <Input
              label={t('register.passwordLabel')}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('register.passwordPlaceholder')}
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              error={fieldErrors.password}
              required
              minLength={6}
            />

            <Input
              label={t('register.confirmLabel')}
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={t('register.confirmPlaceholder')}
              value={form.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              error={fieldErrors.confirmPassword}
              required
            />

            {generalError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{generalError}</p>
              </div>
            )}

            <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
              {t('register.title')}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          {t('register.haveAccount')}{' '}
          <Link
            to="/login"
            className="font-medium text-blue-700 hover:text-blue-800 transition-colors"
          >
            {t('register.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}

function inferFieldFromMessage(msg: string): FormFieldErrors {
  const lower = msg.toLowerCase();
  const fields: FormFieldErrors = {};

  if (lower.includes('password') || lower.includes('pass')) {
    fields.password = msg;
  }
  if (lower.includes('email') || lower.includes('already taken') || lower.includes('already exists')) {
    fields.email = msg;
  }
  if (lower.includes('username') || lower.includes('user name')) {
    fields.userName = msg;
  }
  if (lower.includes('employee') || lower.includes('employeeid') || lower.includes('employee id')) {
    fields.employeeId = msg;
  }

  return fields;
}
