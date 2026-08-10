import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { attendanceApi } from '../../api/attendance';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import { Download, FileSpreadsheet, FileType, File as FilePdf } from 'lucide-react';

export default function Reports() {
  const { t } = useTranslation();
  const [format, setFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await attendanceApi.exportData(format as 'excel' | 'csv' | 'pdf');
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;

      const ext = format === 'excel' ? 'xlsx' : format;
      a.download = `AttendanceReport_${new Date().toISOString().slice(0, 10)}.${ext}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('success', t('reports.toasts.downloaded'));
    } catch {
      showToast('error', t('reports.toasts.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('reports.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormatCard icon={FileSpreadsheet} label={t('reports.formats.csv')} description={t('reports.formats.csvDesc')} selected={format === 'csv'} onClick={() => setFormat('csv')} />
        <FormatCard icon={FileType} label={t('reports.formats.excel')} description={t('reports.formats.excelDesc')} selected={format === 'excel'} onClick={() => setFormat('excel')} />
        <FormatCard icon={FilePdf} label={t('reports.formats.pdf')} description={t('reports.formats.pdfDesc')} selected={format === 'pdf'} onClick={() => setFormat('pdf')} />
      </div>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900">{t('reports.settingsTitle')}</h2></CardHeader>
        <CardContent className="space-y-4">
          <Select label={t('reports.formatLabel')} value={format} onChange={(e) => setFormat(e.target.value)}
            options={[
              { value: 'csv', label: `${t('reports.formats.csv')} (.csv)` },
              { value: 'excel', label: `${t('reports.formats.excel')} (.xlsx)` },
              { value: 'pdf', label: `${t('reports.formats.pdf')} (.pdf)` },
            ]} />
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-700">{t('reports.infoText')}</p>
          </div>
          <Button onClick={handleExport} isLoading={isExporting} icon={<Download className="h-4 w-4" />} size="lg" className="w-full sm:w-auto">{t('reports.download')}</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function FormatCard({ icon: Icon, label, description, selected, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; description: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border-2 p-5 text-left transition-all duration-200 ${selected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl mb-3 ${selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-gray-900">{label}</h3>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </button>
  );
}
