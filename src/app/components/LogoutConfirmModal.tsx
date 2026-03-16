import React from 'react';
import { LogOut } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  colorTheme?: 'blue' | 'red'; // Add color theme prop
}

export function LogoutConfirmModal({ isOpen, onClose, onConfirm, colorTheme = 'blue' }: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  // Define color classes based on theme
  const colors = {
    blue: {
      iconBg: 'from-blue-200 to-blue-200',
      iconColor: 'text-blue-600',
      buttonBg: 'from-blue-500 to-blue-600',
      buttonHover: 'hover:from-blue-600 hover:to-blue-700'
    },
    red: {
      iconBg: 'from-red-200 to-red-200',
      iconColor: 'text-red-600',
      buttonBg: 'from-red-500 to-red-600',
      buttonHover: 'hover:from-red-600 hover:to-red-700'
    }
  };

  const currentColors = colors[colorTheme];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-[#F5F1E8] to-[#FFF9E6] rounded-3xl shadow-2xl w-full max-w-md p-8 transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 bg-gradient-to-br ${currentColors.iconBg} rounded-full flex items-center justify-center`}>
            <LogOut className={`w-10 h-10 ${currentColors.iconColor}`} strokeWidth={2.5} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-center text-gray-800 mb-3">
          Confirm Logout
        </h2>

        {/* Message */}
        <p className="text-center text-gray-500 mb-8">
          Are you sure you want to log out?
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6">
          {/* Cancel Button */}
          <button
            onClick={onClose}
            className="px-8 py-3 text-gray-600 hover:text-gray-800 transition-all duration-200 transform active:scale-95"
          >
            Cancel
          </button>

          {/* Logout Button */}
          <button
            onClick={onConfirm}
            className={`px-12 py-3 bg-gradient-to-r ${currentColors.buttonBg} text-white rounded-2xl ${currentColors.buttonHover} transition-all duration-200 transform active:scale-95 shadow-lg hover:shadow-xl`}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}