import React, { useState } from 'react';
import { ArrowLeft, Clock, FileCheck, LogOut, DoorOpen, ClipboardList, ClipboardEdit, History, Info, ChevronRight } from 'lucide-react';

interface PermissionsPageProps {
  onBack: () => void;
  onRequestPermission: (type: string) => void;
  onViewHistory: () => void;
}

interface PermissionType {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

export function PermissionsPage({ onBack, onRequestPermission, onViewHistory }: PermissionsPageProps) {
  const [showTypeSelection, setShowTypeSelection] = useState(false);

  const permissionTypes: PermissionType[] = [
    {
      id: 'late-entry',
      title: 'Late Entry Permission',
      subtitle: 'Gate Pass',
      description: 'For students entering the college late through the main gate',
      icon: <Clock className="w-6 h-6" />,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      id: 'early-leave',
      title: 'Early Leave Permission',
      subtitle: 'Leaving Class',
      description: 'For students leaving the class or college before regular time',
      icon: <LogOut className="w-6 h-6" />,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      id: 'midday-exit',
      title: 'Midday Exit Permission',
      subtitle: 'Temporary Exit',
      description: 'For leaving the campus temporarily during college hours',
      icon: <DoorOpen className="w-6 h-6" />,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      id: 'general',
      title: 'Other / General Permission',
      subtitle: 'Special Request',
      description: 'For random or special student requests',
      icon: <FileCheck className="w-6 h-6" />,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
  ];

  if (showTypeSelection) {
    return (
      <div className="min-h-screen bg-gray-50 font-['Poppins',sans-serif]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-600 px-4 py-4 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTypeSelection(false)}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-white">New Permission Request</h1>
              <p className="text-sm text-blue-100">Select the type of permission you need</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 pb-24">
          

          {/* Select Permission Type Heading */}
          <h2 className="text-gray-900 mb-4">Select Permission Type</h2>

          {/* Permission Type Cards */}
          <div className="space-y-3 mb-6">
            {permissionTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => onRequestPermission(type.id)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all active:scale-98 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${type.iconBg} flex items-center justify-center flex-shrink-0 ${type.iconColor}`}>
                    {type.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-gray-900">{type.title}</h3>
                      <span className="text-sm text-gray-500">• {type.subtitle}</span>
                    </div>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>

          {/* Important Note */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-gray-900 mb-1">Important Note</p>
              <p className="text-sm text-gray-600">
                All permission requests require Principal approval. You will be notified once your request is reviewed. 
                Please ensure you provide accurate information and valid reasons.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 font-['Poppins',sans-serif] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-600 px-4 py-4 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-white">Permissions</h1>
            <p className="text-sm text-blue-100"></p>
          </div>
        </div>
      </div>

      {/* Centered Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        {/* Icon */}
        <div className="w-24 h-24 mb-6 relative">
          <div className="absolute inset-0 bg-white rounded-2xl shadow-lg"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg 
              width="60" 
              height="60" 
              viewBox="0 0 60 60" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Clipboard */}
              <rect x="12" y="8" width="36" height="48" rx="4" fill="#E5E7EB" stroke="#6B7280" strokeWidth="2"/>
              <rect x="20" y="4" width="20" height="8" rx="2" fill="#9CA3AF"/>
              {/* Lines */}
              <line x1="20" y1="20" x2="40" y2="20" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
              <line x1="20" y1="28" x2="40" y2="28" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
              <line x1="20" y1="36" x2="35" y2="36" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
              {/* Pen */}
              <path d="M42 40L48 46L52 42L46 36L42 40Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5"/>
              <line x1="42" y1="40" x2="38" y2="44" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-gray-900 mb-2 text-center">Permissions</h2>
        <p className="text-gray-600 text-center mb-8 max-w-xs">
          Request and track permissions approved by the Principal
        </p>

        {/* Action Buttons */}
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => setShowTypeSelection(true)}
            className="w-full bg-blue-600 hover:bg-blue-600 text-white rounded-xl py-4 shadow-lg hover:shadow-xl transition-all active:scale-98"
          >
            New Permission Request
          </button>

          <button
            onClick={onViewHistory}
            className="w-full bg-white text-gray-700 border border-gray-300 rounded-xl py-4 shadow-md hover:shadow-lg transition-all active:scale-98"
          >
            View Permission History
          </button>
        </div>
      </div>
    </div>
  );
}