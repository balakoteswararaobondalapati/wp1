import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle, XCircle, FileText, Calendar } from 'lucide-react';
import { authAPI, permissionsAPI } from '../api';

interface PermissionHistoryProps {
  onBack: () => void;
}

interface PermissionRequest {
  id: string;
  type: string;
  typeLabel: string;
  date: string;
  time: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  remark?: string;
  studentEmail?: string;
  attachments?: {
    id: string;
    name: string;
    type: string;
    data?: string;
  }[];
}

export function PermissionHistory({ onBack }: PermissionHistoryProps) {
  const [selectedRequest, setSelectedRequest] = useState<PermissionRequest | null>(null);
  const [requests, setRequests] = useState<PermissionRequest[]>([]);

  useEffect(() => {
    void loadPermissions();

    const handlePermissionsUpdate = () => {
      console.log('Permissions updated - refreshing history');
      void loadPermissions();
    };

    window.addEventListener('permissionsUpdated', handlePermissionsUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === 'permissionsUpdated') {
        handlePermissionsUpdate();
      }
    });

    return () => {
      window.removeEventListener('permissionsUpdated', handlePermissionsUpdate);
    };
  }, []);

  const loadPermissions = async () => {
    try {
      const me = await authAPI.me();
      const allPermissions = await permissionsAPI.getAll();
      const parseAttachments = (raw: any) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };
      const studentPermissions = (allPermissions || [])
        .filter((p: any) => Number(p.student_id) === Number(me.id))
        .map((p: any) => {
          const rawReason = String(p.reason || '');
          const parts = rawReason.split('|').map((x) => x.trim());
          const typeLabel = parts.length >= 3 ? parts[0] : 'Permission Request';
          const dateTime = parts.length >= 3 ? parts[1] : '';
          const reasonText = parts.length >= 3 ? parts.slice(2).join(' | ') : rawReason;
          const [reqDate = '', reqTime = ''] = dateTime.split(' ');
          return {
            id: `#${p.id}`,
            type: typeLabel.toLowerCase().replace(/\s+/g, '-'),
            typeLabel,
            date: reqDate || (p.from_date || ''),
            time: reqTime || '',
            reason: reasonText,
            status: (p.status || 'pending') as 'pending' | 'approved' | 'rejected',
            submittedDate: p.created_at
              ? new Date(p.created_at).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '',
            remark: (p as any).remark || undefined,
            studentEmail: me.email,
            attachments: parseAttachments(p.attachments),
          } as PermissionRequest;
        })
        .sort((a: PermissionRequest, b: PermissionRequest) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());

      setRequests(studentPermissions);
      console.log('Loaded permissions for student:', studentPermissions.length);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setRequests([]);
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-yellow-300 bg-yellow-50';
      case 'approved':
        return 'border-green-300 bg-green-50';
      case 'rejected':
        return 'border-red-300 bg-red-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  if (selectedRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 font-['Poppins',sans-serif]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-600 px-4 py-4 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedRequest(null)}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-white">Permission Details</h1>
              <p className="text-sm text-blue-100">{selectedRequest.id}</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-4">
          <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-200 mb-4">
            {/* Status */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedRequest.status)}
                <span className="text-gray-900">Status</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm border ${getStatusBadge(selectedRequest.status)}`}>
                {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
              </span>
            </div>

            {/* Permission Type */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">Permission Type</p>
              <p className="text-gray-900">{selectedRequest.typeLabel}</p>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Date</p>
                <div className="flex items-center gap-2 text-gray-900">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{selectedRequest.date}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Time</p>
                <div className="flex items-center gap-2 text-gray-900">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{selectedRequest.time}</span>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">Reason</p>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <p className="text-sm text-gray-700">{selectedRequest.reason}</p>
              </div>
            </div>

            {/* Submitted Date */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">Submitted On</p>
              <p className="text-gray-900">{selectedRequest.submittedDate}</p>
            </div>

            {/* 🔥 Attachments */}
{selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
  <div className="mb-4">
    <p className="text-sm text-gray-500 mb-2">Attachments</p>

    <div className="space-y-2">
      {selectedRequest.attachments.map((file) => (
        <a
          key={file.id}
          href={file.data}
          download={file.name}
          target="_blank"
          className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-100 transition"
        >
          <span>
            {file.type?.startsWith('image/') ? '🖼️' : '📎'}
          </span>
          <span className="text-xs truncate">{file.name}</span>
        </a>
      ))}
    </div>
  </div>
)}


            {/* Remark (if exists) */}
            {selectedRequest.remark && (
              <div className={`rounded-xl p-4 border-2 ${getStatusColor(selectedRequest.status)}`}>
                <p className="text-sm text-gray-600 mb-1">Principal's Remark</p>
                <p className="text-gray-900">{selectedRequest.remark}</p>
              </div>
            )}

            {/* Gate Pass (if approved) */}
            {selectedRequest.status === 'approved' && (
              <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-300">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-900">Gate Pass Issued</p>
                </div>
                <p className="text-sm text-green-700">Show this approval to security at the gate</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-600 px-4 py-4 shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-white">Permission History</h1>
            <p className="text-sm text-blue-100">Track all your permission requests</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 text-center">
            <p className="text-2xl text-gray-900 mb-1">{requests.length}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 shadow-sm border border-green-200 text-center">
            <p className="text-2xl text-green-600 mb-1">
              {requests.filter((r) => r.status === 'approved').length}
            </p>
            <p className="text-xs text-gray-600">Approved</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-3 shadow-sm border border-yellow-200 text-center">
            <p className="text-2xl text-yellow-600 mb-1">
              {requests.filter((r) => r.status === 'pending').length}
            </p>
            <p className="text-xs text-gray-600">Pending</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 shadow-sm border border-red-200 text-center">
            <p className="text-2xl text-red-600 mb-1">
              {requests.filter((r) => r.status === 'rejected').length}
            </p>
            <p className="text-xs text-gray-600">Rejected</p>
          </div>
        </div>

        {/* Requests List */}
        <div>
          <h2 className="text-gray-900 mb-3">All Requests</h2>
          {requests.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center border border-gray-200">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">No permission requests yet</p>
              <p className="text-sm text-gray-400">Your permission requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <button
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className={`w-full bg-white rounded-xl p-4 shadow-sm border-2 hover:shadow-md transition-all active:scale-98 text-left ${getStatusColor(request.status)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      <span className="text-sm text-gray-600">{request.id}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs border ${getStatusBadge(request.status)}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>

                  <h3 className="text-gray-900 mb-1">{request.typeLabel}</h3>
                  
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{request.reason}</p>

                  {request.attachments?.length > 0 && (
  <p className="text-xs text-blue-600">📎 {request.attachments.length} file(s)</p>
)}


                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{request.date} • {request.time}</span>
                    <span>Submitted: {request.submittedDate}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

