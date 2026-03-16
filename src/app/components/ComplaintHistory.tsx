import React from 'react';
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
} from 'lucide-react';

/* =====================================================
   TYPES
===================================================== */

export interface Complaint {
  id: string;
  categoryName: string;
  categoryIcon: string;
  subject: string;
  preview: string;
  date: string;
  status: 'pending' | 'in-review' | 'resolved';
  attachments?: {
    id: string;
    name: string;
    type: string;
  }[];
}

interface ComplaintHistoryProps {
  onBack: () => void;
  onComplaintClick?: (complaintId: string) => void;

  // ⭐ DATA COMES FROM PARENT ONLY (backend ready)
  complaints: Complaint[];
}

/* =====================================================
   COMPONENT
===================================================== */

export function ComplaintHistory({
  onBack,
  onComplaintClick,
  complaints,
}: ComplaintHistoryProps) {
  /* ================= Status Badge ================= */

  const getStatusBadge = (status: Complaint['status']) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-4 h-4" />,
          badge: 'bg-yellow-100 text-yellow-700',
          label: 'Pending',
        };

      case 'in-review':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          badge: 'bg-blue-100 text-blue-700',
          label: 'In Review',
        };

      case 'resolved':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          badge: 'bg-green-100 text-green-700',
          label: 'Resolved',
        };

      default:
        return {
          icon: <Clock className="w-4 h-4" />,
          badge: 'bg-gray-100 text-gray-700',
          label: 'Unknown',
        };
    }
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-['Poppins',sans-serif]">
      {/* ================= Header ================= */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-4 shadow-md text-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h1 className="font-semibold text-lg">
              My Complaints ({complaints.length})
            </h1>
            <p className="text-xs text-blue-100">
              Track your complaint status
            </p>
          </div>
        </div>
      </div>

      {/* ================= List ================= */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {complaints.length === 0 ? (
          /* Empty State */
          <div className="text-center text-gray-400 py-20">
            <FileText className="mx-auto mb-3 w-12 h-12" />
            <p className="text-sm">No complaints yet</p>
          </div>
        ) : (
          complaints.map((complaint) => {
            const status = getStatusBadge(complaint.status);

            return (
              <button
                key={complaint.id}
                onClick={() => onComplaintClick?.(complaint.id)}
                className="w-full bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg hover:border-blue-300 transition-all active:scale-98 text-left"
              >
                {/* Top Row */}
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    {status.icon}
                    <span className="text-xs text-gray-500 font-mono">
                      {complaint.id}
                    </span>
                  </div>

                  <span
                    className={`text-xs px-3 py-1 rounded-full font-semibold ${status.badge}`}
                  >
                    {status.label}
                  </span>
                </div>

                {/* Subject */}
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  {complaint.subject}
                </p>

                {/* Preview */}
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                  {complaint.preview}
                </p>

                {/* Bottom Row */}
                <div className="flex justify-between text-xs text-gray-400">
                  <span>
                    {complaint.categoryIcon} {complaint.categoryName}
                  </span>

                  <span>{complaint.date}</span>
                </div>

                {/* Attachments */}
                {complaint.attachments &&
                  complaint.attachments.length > 0 && (
                    <div className="mt-3 text-xs text-blue-600">
                      📎 {complaint.attachments.length} attachment(s)
                    </div>
                  )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
