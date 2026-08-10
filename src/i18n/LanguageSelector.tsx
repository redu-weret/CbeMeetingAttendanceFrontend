import { useTranslation } from 'react-i18next';
import { Select } from '../components/ui/Select';
import { SUPPORTED_LANGUAGES } from './i18n';
import { cn } from '../lib/utils';

interface LanguageSelectorProps {
  /** Compact styling for the sidebar */
  compact?: boolean;
  className?: string;
  /** Accessible label (defaults to the translated "Language" label) */
  ariaLabel?: string;
}

/** Dropdown that switches the active language instantly (no page reload). */
export function LanguageSelector({ compact, className, ariaLabel }: LanguageSelectorProps) {
  const { i18n, t } = useTranslation();

  const current = SUPPORTED_LANGUAGES.some((l) => l.code === i18n.resolvedLanguage)
    ? (i18n.resolvedLanguage as string)
    : 'en';

  return (
    <Select
      aria-label={ariaLabel ?? t('language.label')}
      value={current}
      options={SUPPORTED_LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
      onChange={(e) => {
        void i18n.changeLanguage(e.target.value);
      }}
      className={cn('min-w-0', compact && 'py-1.5 text-xs', className)}
    />
  );
}
