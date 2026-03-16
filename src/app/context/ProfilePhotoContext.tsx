import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ProfilePhotoModal } from '@/app/components/ProfilePhotoModal';

interface ProfilePhotoContextType {
  showProfilePhoto: (userName: string, photoUrl?: string, themeColor?: 'blue' | 'green' | 'red', onViewProfile?: () => void) => void;
}

const ProfilePhotoContext = createContext<ProfilePhotoContextType | undefined>(undefined);

export function ProfilePhotoProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    userName: string;
    photoUrl?: string;
    themeColor?: 'blue' | 'green' | 'red';
    onViewProfile?: () => void;
  }>({
    isOpen: false,
    userName: '',
  });

  const showProfilePhoto = (userName: string, photoUrl?: string, themeColor?: 'blue' | 'green' | 'red', onViewProfile?: () => void) => {
    setModalState({
      isOpen: true,
      userName,
      photoUrl,
      themeColor,
      onViewProfile,
    });
  };

  const closeProfilePhoto = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <ProfilePhotoContext.Provider value={{ showProfilePhoto }}>
      {children}
      {modalState.isOpen && (
        <ProfilePhotoModal
          userName={modalState.userName}
          photoUrl={modalState.photoUrl}
          themeColor={modalState.themeColor}
          onViewProfile={modalState.onViewProfile}
          onClose={closeProfilePhoto}
        />
      )}
    </ProfilePhotoContext.Provider>
  );
}

export function useProfilePhoto() {
  const context = useContext(ProfilePhotoContext);
  if (context === undefined) {
    throw new Error('useProfilePhoto must be used within a ProfilePhotoProvider');
  }
  return context;
}
