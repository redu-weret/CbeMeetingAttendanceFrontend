import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { useToast } from '../../components/ui/Toast';
import {
  profileApi,
  profilePictureUrl,
  validateProfilePicture,
} from '../../api/profileService';
import { ProfileAvatar } from '../../components/ui/ProfileAvatar';
import { ImageCropper } from '../../components/ui/ImageCropper';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useApiError } from '../../hooks/useApiError';
import {
  Trash2,
  ImagePlus,
  AlertTriangle,
  CheckCircle2,
  Mail,
  IdCard,
  UserCircle,
  Shield,
} from 'lucide-react';

export default function Profile() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const { parseError } = useApiError();

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Keep the live preview URL in a ref so the unmount cleanup can revoke it reliably
  const previewUrlRef = useRef<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  // Revoke any pending preview object URL when the page unmounts
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  if (!user) return null;

  const hasPicture = !!user.profilePicturePath;
  const currentSrc = profilePictureUrl(user.profilePicturePath);

  const handleFileSelect = (file: File | undefined | null) => {
    setError('');
    if (!file) return;

    const validationMessage = validateProfilePicture(file);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    // Revoke previous preview object URL to avoid leaks
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);

    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
  };

  const handleUpload = async (fileToUpload: File) => {
    if (!user || !fileToUpload) return;

    setIsUploading(true);
    setError('');
    try {
      // Upload = first picture, Update = replace existing
      const response = hasPicture
        ? await profileApi.update(user.userId, fileToUpload)
        : await profileApi.upload(user.userId, fileToUpload);

      if (response.success) {
        // Immediately update auth state — no logout / refresh required
        if (response.data?.profilePicturePath) {
          updateUser({ profilePicturePath: response.data.profilePicturePath });
        } else {
          // Backend saved the picture but didn't echo the user — pull the
          // freshest copy so the sidebar/avatar still update instantly.
          try {
            const me = await authApi.getCurrentUser();
            if (me.success && me.data?.user) updateUser(me.data.user);
          } catch {
            /* best-effort refresh */
          }
        }
        showToast('success', hasPicture ? t('profile.toasts.updated') : t('profile.toasts.uploaded'));
        cancelSelection();
        // Reset the input so selecting the same file again fires onChange
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setError(response.message || t('profile.toasts.uploadFailed'));
      }
    } catch (err: unknown) {
      const parsed = parseError(err);
      setError(parsed.general || t('profile.toasts.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    setIsDeleting(true);
    setError('');
    try {
      const response = await profileApi.remove(user.userId);
      if (response.success) {
        updateUser({ profilePicturePath: null });
        showToast('success', t('profile.toasts.removed'));
        setSelectedFile(null);
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setError(response.message || t('profile.toasts.removeFailed'));
      }
    } catch (err: unknown) {
      const parsed = parseError(err);
      setError(parsed.general || t('profile.toasts.removeFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelSelection = () => {
    setSelectedFile(null);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    setError('');
  };

  const displaySrc = previewUrl ?? currentSrc;
  const displayName = user.userName || t('common.user');

  return (
    <div className="space-y-6 animate-fadeIn max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('profile.subtitle')}</p>
      </div>

      {/* Profile Picture Card */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">{t('profile.pictureTitle')}</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar preview */}
            <div className="flex flex-col items-center gap-3 shrink-0 mx-auto sm:mx-0">
              <ProfileAvatar name={displayName} src={displaySrc} size="xl" />
              <div className="flex gap-2">
                {user.roles.map((role) => (
                  <Badge key={role} variant={role === 'Admin' ? 'danger' : 'default'}>
                    {role}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="flex-1 w-full">
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {selectedFile && previewUrl ? (
                // Adjust (zoom / reposition) the photo, then upload
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-blue-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · {selectedFile.type || t('profile.unknownType')}
                    </p>
                  </div>
                  <ImageCropper
                    imageUrl={previewUrl}
                    fileName={selectedFile.name}
                    fileType={selectedFile.type}
                    isProcessing={isUploading}
                    onConfirm={handleUpload}
                    onCancel={cancelSelection}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    {hasPicture
                      ? t('profile.pictureIntro')
                      : t('profile.pictureIntroNone')}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      icon={<ImagePlus className="h-4 w-4" />}
                    >
                      {hasPicture ? t('profile.chooseNewPicture') : t('profile.choosePicture')}
                    </Button>
                    {hasPicture && (
                      <Button
                        variant="danger"
                        onClick={handleDelete}
                        isLoading={isDeleting}
                        icon={<Trash2 className="h-4 w-4" />}
                      >
                        {t('profile.removePicture')}
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-gray-400">
                    {t('profile.allowedTypes')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Details Card */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">{t('profile.accountDetails')}</h2>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailItem icon={<UserCircle className="h-4 w-4" />} label={t('profile.username')} value={user.userName || '—'} />
            <DetailItem icon={<Mail className="h-4 w-4" />} label={t('profile.email')} value={user.email || '—'} />
            <DetailItem
              icon={<IdCard className="h-4 w-4" />}
              label={t('profile.employee')}
              value={user.employee?.fullName || '—'}
            />
            <DetailItem icon={<Shield className="h-4 w-4" />} label={t('profile.role')} value={user.roles.join(', ') || t('common.user')} />
          </dl>
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files?.[0])}
      />
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-gray-50 border border-gray-100 p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-gray-200 text-blue-700 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
        <dd className="text-sm font-medium text-gray-900 truncate">{value}</dd>
      </div>
    </div>
  );
}
