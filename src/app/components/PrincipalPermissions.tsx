import React, { useState } from 'react';
import { ArrowLeft, Search, Filter, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';

interface PrincipalPermissionsProps {
  onBack: () => void;
}

interface PermissionRequest {
  id: string;
  studentName: string;
  studentId: string;
  type: string;
  typeLabel: string;
  date: string;
  time: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  remark?: string;
}

export function PrincipalPermissions({ onBack }: PrincipalPermissionsProps) {
  const [requests, setRequests] = useState<PermissionRequest[]>([
    {
      id: '#PRM10089',
      studentName: 'Hemanth Kumar',
      studentId: '21CS101',
      type: 'general',
      typeLabel: 'General Permission',
      date: 'Dec 25, 2024',
      time: '9:00 AM',
      reason: 'Requesting permission to attend a technical workshop organized by IEEE at another college campus.',
      status: 'pending',
      submittedDate: 'Dec 19, 2024',
    },
    {
      id: '#PRM10090',
      studentName: 'Priya Sharma',
      studentId: '21CS102',
      type: 'late-entry',
      typeLabel: 'Late Entry Permission',
      date: 'Dec 21, 2024',
      time: '10:00 AM',
      reason: 'I have a dentist appointment early morning. I have attached the appointment slip.',
      status: 'pending',
      submittedDate: 'Dec 19, 2024',
    },
    {
      id: '#PRM10091',
      studentName: 'Rahul Verma',
      studentId: '21CS103',
      type: 'early-leave',
      typeLabel: 'Early Leave Permission',
      date: 'Dec 20, 2024',
      time: '3:00 PM',
      reason: 'Need to attend my sister\'s wedding reception. Family event.',
      status: 'pending',
      submittedDate: 'Dec 19, 2024',
    },
    {
      id: '#PRM10251',
      studentName: 'Hemanth Kumar',
      studentId: '21CS101',
      type: 'late-entry',
      typeLabel: 'Late Entry Permission',
      date: 'Dec 22, 2024',
      time: '10:30 AM',
      reason: 'I had a medical appointment at the hospital which took longer than expected. I have attached the medical certificate for verification.',
      status: 'approved',
      submittedDate: 'Dec 21, 2024',
      remark: 'Approved. Please show this to security at gate.',
    },
    {
      id: '#PRM10198',
      studentName: 'Hemanth Kumar',
      studentId: '21CS101',
      type: 'early-leave',
      typeLabel: 'Early Leave Permission',
      date: 'Dec 20, 2024',
      time: '2:00 PM',
      reason: 'I have a family emergency and need to leave early today. My grandmother is unwell and I need to visit the hospital.',
      status: 'approved',
      submittedDate: 'Dec 20, 2024',
      remark: 'Approved for emergency. Stay safe.',
    },
  ]);

  const [selectedRequest, setSelectedRequest] = useState<PermissionRequest | null>(null);
  const [actionRemark, setActionRemark] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const handleApprove = () => {
    if (selectedRequest) {
      setRequests(requests.map(req => 
        req.id === selectedRequest.id 
          ? { ...req, status: 'approved' as const, remark: actionRemark || 'Approved by Principal' }
          : req
      ));
      setSelectedRequest(null);
      setActionRemark('');
    }
  };

  const handleReject = () => {
    if (selectedRequest) {
      setRequests(requests.map(req => 
        req.id === selectedRequest.id 
          ? { ...req, status: 'rejected' as const, remark: actionRemark || 'Request rejected' }
          : req
      ));
      setSelectedRequest(null);
      setActionRemark('');
    }
  };

  const filteredRequests = requests.filter(req => 
    filterStatus === 'all' ? true : req.status === filterStatus
  );

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

  if (selectedRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 font-['Poppins',sans-serif]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 px-4 py-4 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedRequest(null);
                setActionRemark('');
              }}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-white">Review Permission</h1>
              <p className="text-sm text-indigo-100">{selectedRequest.id}</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-4">
          <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-200 mb-4">
            {/* Student Info */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-4 border border-indigo-200">
              <p className="text-sm text-gray-600 mb-1">Student Details</p>
              <p className="text-lg text-gray-900">{selectedRequest.studentName}</p>
              <p className="text-sm text-gray-600">ID: {selectedRequest.studentId}</p>
            </div>

            {/* Permission Type */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">Permission Type</p>
              <p className="text-gray-900">{selectedRequest.typeLabel}</p>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Requested Date</p>
                <p className="text-gray-900">{selectedRequest.date}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Requested Time</p>
                <p className="text-gray-900">{selectedRequest.time}</p>
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
          </div>

          {/* Action Section */}
          {selectedRequest.status === 'pending' && (
            <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-200 mb-4">
              <h3 className="text-gray-900 mb-3">Add Remark (Optional)</h3>
              <textarea
                value={actionRemark}
                onChange={(e) => setActionRemark(e.target.value)}
                placeholder="Add any remarks or instructions for the student..."
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none mb-4"
                rows={3}
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleReject}
                  className="bg-red-500 text-white rounded-xl py-3 hover:bg-red-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  className="bg-green-500 text-white rounded-xl py-3 hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Approve
                </button>
              </div>
            </div>
          )}

          {/* Already Actioned */}
          {selectedRequest.status !== 'pending' && (
            <div className={`rounded-2xl p-5 border-2 ${
              selectedRequest.status === 'approved' 
                ? 'bg-green-50 border-green-300' 
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(selectedRequest.status)}
                <p className="text-gray-900">
                  {selectedRequest.status === 'approved' ? 'Request Approved' : 'Request Rejected'}
                </p>
              </div>
              {selectedRequest.remark && (
                <p className="text-sm text-gray-700 mt-2">Remark: {selectedRequest.remark}</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 px-4 py-4 shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white">Permission Requests</h1>
            <p className="text-sm text-indigo-100">Review and approve student permissions</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 text-center">
            <p className="text-2xl text-gray-900 mb-1">{requests.length}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-3 shadow-sm border border-yellow-200 text-center">
            <p className="text-2xl text-yellow-600 mb-1">
              {requests.filter((r) => r.status === 'pending').length}
            </p>
            <p className="text-xs text-gray-600">Pending</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 shadow-sm border border-green-200 text-center">
            <p className="text-2xl text-green-600 mb-1">
              {requests.filter((r) => r.status === 'approved').length}
            </p>
            <p className="text-xs text-gray-600">Approved</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${
                filterStatus === status
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && (
                <span className="ml-1">
                  ({requests.filter(r => r.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Requests List */}
        <div className="space-y-3">
          {filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <button
                key={request.id}
                onClick={() => setSelectedRequest(request)}
                className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 transition-all active:scale-98 text-left"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-gray-900">{request.studentName}</p>
                    <p className="text-xs text-gray-500">{request.studentId} • {request.id}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs border ${getStatusBadge(request.status)}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-2 mb-2">
                  <p className="text-sm text-gray-900 mb-1">{request.typeLabel}</p>
                  <p className="text-xs text-gray-600">{request.date} • {request.time}</p>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 mb-2">{request.reason}</p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Submitted: {request.submittedDate}</span>
                  <span className="text-indigo-600">View Details →</span>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-1">No {filterStatus} requests</p>
              <p className="text-sm text-gray-400">Permission requests will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
