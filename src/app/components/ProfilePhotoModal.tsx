import React from 'react';
import { X, User } from 'lucide-react';

interface ProfilePhotoModalProps {
  userName?: string;
  name?: string;
  photoUrl?: string;
  photo?: string;
  themeColor?: 'blue' | 'green' | 'red';
  onViewProfile?: () => void;
  onClose: () => void;
}

export function ProfilePhotoModal({
  userName,
  name,
  photoUrl,
  photo,
  themeColor = 'blue',
  onViewProfile,
  onClose
}: ProfilePhotoModalProps) {
  const displayName = userName || name || 'User';
  const displayPhoto = photoUrl || photo;

  // Theme color classes
  const themeColors = {
    blue: 'bg-blue-600 text-white',
    green: 'bg-green-600 text-white',
    red: 'bg-red-600 text-white',
  };

  const buttonColors = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    red: 'bg-red-600 hover:bg-red-700',
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${themeColors[themeColor]} px-6 py-4 flex items-center justify-between`}>
          <h3 className="font-medium">Profile Photo</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Photo Display */}
        <div className="p-8 flex flex-col items-center">
          <div className="w-64 h-64 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center mb-4">
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${themeColors[themeColor]}`}>
                <User className="w-32 h-32" />
              </div>
            )}
          </div>

          <h4 className="font-medium text-lg text-gray-900 mb-6">{displayName}</h4>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            {onViewProfile && (
              <button
                onClick={() => {
                  onViewProfile();
                  onClose();
                }}
                className={`flex-1 py-2.5 rounded-xl ${buttonColors[themeColor]} text-white transition-colors`}
              >
                View Profile
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
