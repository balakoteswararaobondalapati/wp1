import React from 'react';
import { X } from 'lucide-react';

export interface Notice {
  id: number;
  title: string;
  date: string;
  preview: string;
  fullDescription: string;
  color: string;
}

interface NoticeModalProps {
  notice: Notice;
  onClose: () => void;
}

export function NoticeModal({ notice, onClose }: NoticeModalProps) {
  return (
    <>
      {/* Backdrop - Dimmed background */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
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
              onClick={onClose}
              className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors active:scale-95"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="space-y-4">
            {/* Title */}
            <h2 className="text-blue-600">{notice.title}</h2>

            {/* Date */}
            <p className="text-gray-500">{notice.date}</p>

            {/* Full Description */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-gray-700 leading-relaxed">{notice.fullDescription}</p>
            </div>
          </div>
        </div>
      </div>

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
      `}</style>
    </>
  );
}
