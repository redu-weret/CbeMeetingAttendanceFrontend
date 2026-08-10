import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { attendanceApi } from '../../api/attendance';
import { employeeApi } from '../../api/employees';
import type { AttendanceCheckResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  Briefcase,
  Phone,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';

export default function Attendance() {
  const { t } = useTranslation();
  const [employeeId, setEmployeeId] = useState('');
  const [session, setSession] = useState('');
  const [checkResult, setCheckResult] = useState<AttendanceCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isTaking, setIsTaking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const { user } = useAuth();
  const { showToast } = useToast();

  // Auto-detect the logged-in user's employee ID on mount
  useEffect(() => {
    const myEmployeeId = user?.employee?.employeeId;
    if (myEmployeeId) {
      setEmployeeId(myEmployeeId);
      // Auto-trigger the check for this employee
      setIsChecking(true);
      setCheckError('');
      setCheckResult(null);

      employeeApi.checkStatus(myEmployeeId).then((res) => {
        if (res.success && res.data) {
          setCheckResult(res.data);
        } else {
          setCheckError(res.message || t('attendance.errors.noEmployeeFound', { id: myEmployeeId }));
        }
      }).catch(() => {
        setCheckError(t('attendance.errors.checkFailed'));
      }).finally(() => {
        setIsChecking(false);
      });
    }
  }, [user?.employee?.employeeId, t]);

  const handleTakeAttendance = async () => {
    if (!checkResult) return;

    setIsTaking(true);
    try {
      const res = await attendanceApi.take({
        employeeId: checkResult.employeeId,
        session: session || undefined,
      });
      if (res.success) {
        showToast('success', t('attendance.toasts.recordedFor', { name: checkResult.fullName }));
        setCheckResult({
          ...checkResult,
          isAttended: true,
          attendanceTime: new Date().toISOString(),
          session: session || checkResult.session,
        });
      } else {
        showToast('error', res.message || t('attendance.toasts.takeFailed'));
      }
    } catch {
      showToast('error', t('attendance.toasts.takeFailed'));
    } finally {
      setIsTaking(false);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  // If no employee linked to the user account
  if (!user?.employee?.employeeId) {
    return (
      <div className="max-w-lg mx-auto mt-16 animate-fadeIn">
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-amber-50 p-4">
                <ShieldCheck className="h-10 w-10 text-amber-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{t('attendance.noEmployee.title')}</h2>
              <p className="text-sm text-gray-500 max-w-sm">
                {t('attendance.noEmployee.description')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('attendance.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('attendance.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your Info */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              {t('attendance.identityTitle')}
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                label={t('attendance.employeeId')}
                value={employeeId}
                icon={<ShieldCheck className="h-4 w-4" />}
                disabled
                readOnly
              />
              <Select
                label={t('attendance.sessionOptional')}
                placeholder={t('attendance.sessionAutoDetect')}
                value={session}
                onChange={(e) => setSession(e.target.value)}
                options={[
                  { value: 'Morning', label: t('attendance.sessionMorning') },
                  { value: 'Afternoon', label: t('attendance.sessionAfternoon') },
                ]}
              />

              {isChecking && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-center gap-3">
                  <Spinner size="sm" />
                  <p className="text-sm text-blue-700">{t('attendance.checking')}</p>
                </div>
              )}

              {checkError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 animate-slide-up">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                    <p className="text-sm text-red-700">{checkError}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attendance Status */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              {checkResult ? t('attendance.statusTitle') : t('attendance.awaitingCheck')}
            </h2>
          </CardHeader>
          <CardContent>
            {checkResult ? (
              <div className="space-y-5 animate-slide-up">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-xl shadow-lg shadow-blue-200">
                    {checkResult.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{checkResult.fullName}</h3>
                    <p className="text-sm text-gray-500">{t('attendance.id', { id: checkResult.employeeId })}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50">
                    <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                    <div><p className="text-xs text-gray-500">{t('attendance.division')}</p><p className="font-medium text-gray-900">{checkResult.division}</p></div>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50">
                    <Briefcase className="h-4 w-4 text-gray-400 shrink-0" />
                    <div><p className="text-xs text-gray-500">{t('attendance.jobTitle')}</p><p className="font-medium text-gray-900">{checkResult.jobTitle}</p></div>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50">
                    <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                    <div><p className="text-xs text-gray-500">{t('attendance.department')}</p><p className="font-medium text-gray-900">{checkResult.department}</p></div>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <div><p className="text-xs text-gray-500">{t('attendance.phone')}</p><p className="font-medium text-gray-900">{checkResult.phoneNumber}</p></div>
                  </div>
                </div>

                <div className={`rounded-xl p-5 border-2 transition-all duration-300 ${checkResult.isAttended ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      {checkResult.isAttended ? <CheckCircle className="h-6 w-6 text-green-600" /> : <XCircle className="h-6 w-6 text-amber-600" />}
                      <div>
                        <span className={`font-semibold ${checkResult.isAttended ? 'text-green-800' : 'text-amber-800'}`}>
                          {checkResult.isAttended ? t('attendance.alreadyAttended') : t('attendance.notYetAttended')}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">{checkResult.meetingDate} — {checkResult.session}</p>
                      </div>
                    </div>
                    {checkResult.attendanceTime && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-white rounded-lg px-3 py-1.5 shadow-sm">
                        <Clock className="h-3.5 w-3.5" />{formatTime(checkResult.attendanceTime)}
                      </div>
                    )}
                  </div>
                </div>

                {isChecking ? (
                  <div className="flex justify-center py-3">
                    <Spinner size="sm" />
                  </div>
                ) : !checkResult.isAttended ? (
                  <Button onClick={handleTakeAttendance} isLoading={isTaking} icon={<ClipboardCheck className="h-5 w-5" />} className="w-full" size="lg">{t('attendance.recordAttendance')}</Button>
                ) : (
                  <Badge variant="success" className="w-full justify-center py-3 text-sm">✅ {t('attendance.attendanceCompleted')}</Badge>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-gray-50 p-4 mb-4"><UserIcon className="h-10 w-10 text-gray-300" /></div>
                <p className="text-sm font-medium text-gray-900">{t('attendance.checkingStatus')}</p>
                <p className="text-sm text-gray-500 mt-1 max-w-xs">{t('attendance.checkingStatusDesc')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
