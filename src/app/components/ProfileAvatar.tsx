import React from 'react';
import { useProfilePhoto } from '@/app/context/ProfilePhotoContext';

interface ProfileAvatarProps {
  userName: string;
  profileImage?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  themeColor?: 'blue' | 'green' | 'red';
}

export function ProfileAvatar({
  userName,
  profileImage,
  size = 'md',
  onClick,
  className = '',
  themeColor = 'blue',
}: ProfileAvatarProps) {
  const { showProfilePhoto } = useProfilePhoto();

  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-11 h-11 text-base',
    lg: 'w-32 h-32 text-3xl',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    showProfilePhoto(userName, profileImage, themeColor, onClick);
  };

  const getThemeClasses = () => {
    switch (themeColor) {
      case 'green':
        return 'from-green-500 to-emerald-600 border-green-100';
      case 'red':
        return 'from-red-500 to-orange-600 border-red-100';
      default:
        return 'from-blue-500 to-indigo-600 border-blue-100';
    }
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${getThemeClasses()} flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 transition-all active:scale-95 border-2 overflow-hidden flex-shrink-0 ${className}`}
    >
      {profileImage ? (
        <img
          src={profileImage}
          alt={userName}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-white font-medium">{getInitials(userName)}</span>
      )}
    </button>
  );
}
