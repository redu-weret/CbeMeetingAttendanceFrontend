import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { profilePictureUrl } from '../../api/profileService';
import { UserCircle } from 'lucide-react';

interface ProfileAvatarProps {
  name?: string | null;
  /** Stored profile picture path (relative or absolute URL) */
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Show the user icon instead of initials when no picture exists */
  iconFallback?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
};

const ringSize = {
  sm: 'ring-2',
  md: 'ring-2',
  lg: 'ring-2',
  xl: 'ring-4',
};

/**
 * Displays the user's profile picture, falling back to a colored initials
 * circle (or user icon) when no picture exists or the image fails to load.
 */
export function ProfileAvatar({
  name,
  src,
  size = 'md',
  className,
  iconFallback = false,
}: ProfileAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const url = profilePictureUrl(src);

  // Reset the error state whenever the source URL changes so a newly
  // uploaded picture is not hidden by a previous failed load.
  useEffect(() => {
    setImgError(false);
  }, [url]);

  const showImage = !!url && !imgError;
  const initials = (name || 'U').trim().charAt(0).toUpperCase() || 'U';

  if (showImage) {
    return (
      <img
        src={url!}
        alt={`${name || 'User'} avatar`}
        onError={() => setImgError(true)}
        className={cn(
          'shrink-0 rounded-full object-cover bg-gray-100 ring-white shadow-sm',
          sizeClasses[size],
          ringSize[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 font-bold text-white ring-white shadow-sm',
        sizeClasses[size],
        ringSize[size],
        className
      )}
      aria-label={`${name || 'User'} avatar`}
    >
      {iconFallback ? <UserCircle className="h-2/3 w-2/3" /> : initials}
    </div>
  );
}
