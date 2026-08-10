import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { APP_URL } from '../config';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { QrCode, Copy, Check, Link2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface QrCodeCardProps {
  className?: string;
  /** Hide the copy button for compact embedding */
  showCopyButton?: boolean;
}

/** Responsive card that renders the homepage URL as a scannable QR code. */
export function QrCodeCard({ className, showCopyButton = true }: QrCodeCardProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard API unavailable (e.g. insecure context) - ignore */
    }
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent>
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
          <div className="shrink-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <QRCodeSVG value={APP_URL} size={132} level="M" marginSize={1} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-900 sm:justify-start">
              <QrCode className="h-5 w-5 shrink-0 text-blue-700" />
              {t('qr.title')}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{t('qr.description')}</p>
            <p className="mt-3 flex items-center justify-center gap-1.5 break-all rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 sm:justify-start">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              {APP_URL}
            </p>
            {showCopyButton && (
              <Button variant="outline" size="sm" className="mt-3" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? t('qr.copied') : t('qr.copyUrl')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
