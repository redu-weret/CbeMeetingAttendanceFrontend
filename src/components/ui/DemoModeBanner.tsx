import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import { isMockMode } from '../../api/client';

/**
 * Shown only while the app runs in demo (mock) mode. Demo mode is opt-in
 * (localStorage use_mock === 'true'); by default the app connects to the real
 * backend and request payloads are encrypted. In demo mode there is no backend
 * to exchange keys with, so payloads are NOT encrypted — the banner makes that
 * state obvious.
 */
export function DemoModeBanner() {
  const { t } = useTranslation();

  if (!isMockMode()) {
    return null;
  }

  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <p>
        <span className="font-semibold">{t('demoMode.title')}:</span>{' '}
        {t('demoMode.description')}
      </p>
    </div>
  );
}
