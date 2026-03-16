import React, { useState } from 'react';
import { ArrowLeft, X, Bell } from 'lucide-react';
import { useNotices } from '../context/NoticesContext';

interface NoticeBoardPageProps {
  onBack: () => void;
  theme?: 'blue' | 'red';
}

interface Notice {
  id: number;
  title: string;
  date: string;
  preview: string;
  fullDescription: string;
  color: string;
}

export function NoticeBoardPage({ onBack, theme = 'blue' }: NoticeBoardPageProps) {
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const { notices } = useNotices();

  const themeStyles = {
    blue: {
      bg: 'from-gray-50 to-blue-50',
      header: 'bg-blue-600',
      titleColor: 'text-blue-600',
      hoverBg: 'hover:bg-blue-50'
    },
    red: {
      bg: 'from-gray-50 to-red-50',
      header: 'bg-gradient-to-r from-red-400 to-red-400',
      titleColor: 'text-blue-600',
      hoverBg: 'hover:bg-red-50'
    }
  };

  const currentTheme = themeStyles[theme];

  const handleNoticeClick = (notice: Notice) => {
    setSelectedNotice(notice);
  };

  const closeModal = () => {
    setSelectedNotice(null);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b ${currentTheme.bg} font-['Poppins',sans-serif]`}>
      {/* Header */}
      <div className={`${currentTheme.header} shadow-sm sticky top-0 z-10`}>
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-red-200 flex items-center justify-center transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <Bell className="w-5 h-5 text-white" />
            <h2 className="text-white">Notice Board</h2>
          </div>
        </div>
      </div>

      {/* Notice Cards List */}
      <div className="px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {notices.map((notice) => (
            <button
              key={notice.id}
              onClick={() => handleNoticeClick(notice)}
              className={`w-full ${notice.color} border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left`}
            >
              {/* Date and Time */}
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs text-gray-500">{notice.date}</p>
                {notice.time && (
                  <>
                    <span className="text-xs text-gray-400">•</span>
                    <p className="text-xs text-gray-500">{notice.time}</p>
                  </>
                )}
              </div>
              
              {/* Title */}
              <h3 className="text-gray-900 mb-2">{notice.title}</h3>
              
              {/* Preview */}
              <p className="text-sm text-gray-600 line-clamp-2">{notice.preview}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Modal Popup */}
      {selectedNotice && (
        <>
          {/* Backdrop - Dimmed background */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
            onClick={closeModal}
          />

          {/* Modal Content */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 pointer-events-auto animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={closeModal}
                  className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors active:scale-95"
                >
                  <X className="w-6 h-6 text-gray-700" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="space-y-4">
                {/* Title */}
                <h2 className={currentTheme.titleColor}>{selectedNotice.title}</h2>

                {/* Date and Time */}
                <div className="flex items-center gap-2">
                  <p className="text-gray-500">{selectedNotice.date}</p>
                  {selectedNotice.time && (
                    <>
                      <span className="text-gray-400">•</span>
                      <p className="text-gray-500">{selectedNotice.time}</p>
                    </>
                  )}
                </div>

                {/* Full Description */}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-gray-700 leading-relaxed">{selectedNotice.fullDescription}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Animations */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}