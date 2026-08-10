import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { attendanceApi } from '../../api/attendance';
import type { DashboardData } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { QrCodeCard } from '../../components/QrCodeCard';
import {
  Users,
  Sun,
  Moon,
  ClipboardCheck,
  Clock,
  Sunrise,
  Sunset,
} from 'lucide-react';

export default function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await attendanceApi.getDashboard();
      if (response.success && response.data) {
        setData(response.data);
      }
    } catch {
      showToast('error', t('dashboard.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Users} label={t('dashboard.totalEmployees')} value={data?.totalEmployees ?? 0} color="blue" />
        <StatCard icon={Sun} label={t('dashboard.morningAttendance')} value={data?.todayMorningCount ?? 0} color="amber" />
        <StatCard icon={Moon} label={t('dashboard.afternoonAttendance')} value={data?.todayAfternoonCount ?? 0} color="indigo" />
      </div>

      {/* QR code: scan to open the app on a phone */}
      <QrCodeCard />

      {/* Recent Attendances */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.recentAttendances')}</h2>
        </CardHeader>
        <CardContent>
          {data?.recentAttendances && data.recentAttendances.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard.table.employee')}</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard.table.department')}</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard.table.date')}</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard.table.session')}</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard.table.time')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.recentAttendances.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                            {record.employeeFullName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{record.employeeFullName}</p>
                            <p className="text-xs text-gray-500">{record.employeeUniqueId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{record.department}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{record.meetingDate}</td>
                      <td className="px-3 py-3 whitespace-nowrap"><SessionBadge session={record.session} /></td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          {new Date(record.attendanceTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={<ClipboardCheck className="h-8 w-8 text-gray-400" />} title={t('dashboard.empty.title')} description={t('dashboard.empty.description')} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  };
  return (
    <Card className="relative overflow-hidden">
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ring-2 ${colorMap[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionBadge({ session }: { session: string }) {
  const { t } = useTranslation();
  const isMorning = session === 'Morning' || session === 'morning';
  return (
    <Badge variant={isMorning ? 'warning' : 'info'}>
      <span className="flex items-center gap-1.5">
        {isMorning ? <Sunrise className="h-3.5 w-3.5" /> : <Sunset className="h-3.5 w-3.5" />}
        {isMorning ? t('dashboard.session.morning') : t('dashboard.session.afternoon')}
      </span>
    </Badge>
  );
}
