import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useApiError } from '../../hooks/useApiError';
import { LanguageSelector } from '../../i18n/LanguageSelector';
import { DemoModeBanner } from '../../components/ui/DemoModeBanner';
import { Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const { t } = useTranslation();
  const [emailOrUserName, setEmailOrUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    emailorusername?: string;
    password?: string;
  }>({});
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { parseError } = useApiError();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setFieldErrors({});

    // Client-side validation
    if (!emailOrUserName.trim()) {
      setFieldErrors({ emailorusername: t('login.errors.emailRequired') });
      return;
    }
    if (!password) {
      setFieldErrors((prev) => ({ ...prev, password: t('login.errors.passwordRequired') }));
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.login({
        emailOrUserName: emailOrUserName.trim(),
        password,
      });

      if (response.success && response.data) {
        login(response.data.token, response.data.refreshToken, response.data.user);
        showToast('success', t('login.welcomeBack'));
        navigate('/dashboard');
      } else {
        // API returned success: false with a message
        const msg = response.message || t('login.errors.loginFailed');
        const inferred = inferFieldFromMessage(msg, t);
        if (Object.keys(inferred).length > 0) {
          setFieldErrors(inferred);
        } else {
          setGeneralError(msg);
        }
      }
    } catch (err: unknown) {
      const parsed = parseError(err);
      setGeneralError(parsed.general);
      setFieldErrors(parsed.fields);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4">
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
          <h1 className="text-2xl font-bold text-gray-900">{t('app.name')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('login.subtitle')}</p>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('login.emailLabel')}
              type="text"
              placeholder={t('login.emailPlaceholder')}
              value={emailOrUserName}
              onChange={(e) => {
                setEmailOrUserName(e.target.value);
                if (fieldErrors.emailorusername) {
                  setFieldErrors((prev) => ({ ...prev, emailorusername: undefined }));
                }
              }}
              icon={<Mail className="h-4 w-4" />}
              error={fieldErrors.emailorusername}
              required
              autoComplete="username"
            />

            <Input
              label={t('login.passwordLabel')}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('login.passwordPlaceholder')}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
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
              autoComplete="current-password"
            />

            {generalError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{generalError}</p>
              </div>
            )}

            <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
              {t('login.signIn')}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          {t('login.noAccount')}{' '}
          <Link
            to="/register"
            className="font-medium text-blue-700 hover:text-blue-800 transition-colors"
          >
            {t('login.registerHere')}
          </Link>
        </p>
      </div>
    </div>
  );
}

function inferFieldFromMessage(
  msg: string,
  t: TFunction
): { emailorusername?: string; password?: string } {
  const lower = msg.toLowerCase();
  const fields: { emailorusername?: string; password?: string } = {};

  if (lower.includes('password') || lower.includes('pass')) {
    fields['password'] = msg;
  }
  if (lower.includes('username') || lower.includes('user name') || lower.includes('email')) {
    fields['emailorusername'] = msg;
  }
  if (lower.includes('credentials')) {
    fields['emailorusername'] = t('login.errors.emailInvalid');
    fields['password'] = t('login.errors.passwordInvalid');
  }
  if (lower.includes('not found') || lower.includes('does not exist')) {
    fields['emailorusername'] = msg;
  }

  return fields;
}
