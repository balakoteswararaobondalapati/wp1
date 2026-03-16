import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  File,
} from "lucide-react";
import { PermissionRequest } from "../data/permissions";
import { StudentProfileModal } from "./StudentProfileModal";

interface AdminPermissionManagementProps {
  onBack: () => void;
  permissions: PermissionRequest[];
  onApprove: (id: string, remark: string) => void;
  onReject: (id: string, remark: string) => void;
}

export function AdminPermissionManagement({
  onBack,
  permissions,
  onApprove,
  onReject,
}: AdminPermissionManagementProps) {
  const [selectedRequest, setSelectedRequest] =
    useState<PermissionRequest | null>(null);
  const [showApprovalModal, setShowApprovalModal] =
    useState(false);
  const [showRejectionModal, setShowRejectionModal] =
    useState(false);
  const [remark, setRemark] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [showStudentProfile, setShowStudentProfile] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  useEffect(() => {
    setPreviewFileId(null);
  }, [selectedRequest]);

  // Filter permissions based on status and search
  const filteredPermissions = permissions.filter(
    (permission) => {
      const matchesStatus =
        filterStatus === "all" ||
        permission.status === filterStatus;
      const matchesSearch =
        permission.studentName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        permission.rollNumber
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        permission.id
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    },
  );

  const handleApprove = () => {
    if (selectedRequest && remark.trim()) {
      onApprove(selectedRequest.id, remark);
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setRemark("");
    }
  };

  const handleReject = () => {
    if (selectedRequest && remark.trim()) {
      onReject(selectedRequest.id, remark);
      setShowRejectionModal(false);
      setSelectedRequest(null);
      setRemark("");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "approved":
        return (
          <CheckCircle className="w-5 h-5 text-green-600" />
        );
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "approved":
        return "bg-green-100 text-green-700 border-green-300";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "border-yellow-300 bg-yellow-50";
      case "approved":
        return "border-green-300 bg-green-50";
      case "rejected":
        return "border-red-300 bg-red-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  // Detail View
  if (selectedRequest) {
    const getStudentData = () => ({
      name: selectedRequest.studentName || 'Student',
      rollNo: selectedRequest.rollNumber || 'N/A',
      semester: selectedRequest.semester || 'N/A',
      section: selectedRequest.section || 'N/A',
      phone: 'N/A',
      email: selectedRequest.studentEmail || 'N/A',
      stream: selectedRequest.course || selectedRequest.department || 'Student',
    });

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 font-['Poppins',sans-serif]">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-4 shadow-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedRequest(null)}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-white">Permission Details</h1>
              <p className="text-sm text-green-100">
                {selectedRequest.id}
              </p>
            </div>
          </div>
        </div>

        {/* Details Content */}
        <div className="p-4 pb-24">
          {/* Student Info Card */}
          <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-200 mb-4">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
              <button
                onClick={() => setShowStudentProfile(true)}
                className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
              >
                <User className="w-6 h-6 text-white" />
              </button>
              <div className="flex-1">
                <button
                  onClick={() => setShowStudentProfile(true)}
                  className="text-left hover:text-green-600 transition-colors"
                >
                  <h3 className="text-gray-900">
                    {selectedRequest.studentName}
                  </h3>
                </button>
                <p className="text-sm text-gray-600">
                  {selectedRequest.rollNumber}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm border ${getStatusBadge(selectedRequest.status)}`}
              >
                {selectedRequest.status
                  .charAt(0)
                  .toUpperCase() +
                  selectedRequest.status.slice(1)}
              </span>
            </div>

            {/* Class Details */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  Semester
                </p>
                <p className="text-gray-900">
                  {selectedRequest.semester}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  Section
                </p>
                <p className="text-gray-900">
                  {selectedRequest.section}
                </p>
              </div>
            </div>
          </div>

          {/* Permission Details Card */}
          <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-200 mb-4">
            <h3 className="text-gray-900 mb-4">
              Permission Information
            </h3>

            {/* Permission Type */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">
                Permission Type
              </p>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <p className="text-gray-900">
                  {selectedRequest.typeLabel}
                </p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  Date
                </p>
                <div className="flex items-center gap-2 text-gray-900">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{selectedRequest.date}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  Time
                </p>
                <div className="flex items-center gap-2 text-gray-900">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{selectedRequest.time}</span>
                </div>
              </div>
            </div>

            {/* Submitted Date */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">
                Submitted On
              </p>
              <p className="text-gray-900">
                {selectedRequest.submittedDate}
              </p>
            </div>

            {/* Reason */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">
                Reason
              </p>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedRequest.reason}
                </p>
              </div>
            </div>

            {/* Attachments */}
            {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">
                  Attachments
                </p>
                <div className="space-y-3">
                  {selectedRequest.attachments.map((file) => {
                    const fileId = String(file.id || file.name);
                    const isImage = Boolean(file.type?.startsWith('image/'));
                    const canPreview = isImage && Boolean(file.data);
                    const isPreviewing = previewFileId === fileId;

                    return (
                    <div
                      key={fileId}
                      className="bg-blue-50 rounded-xl p-4 border border-blue-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          {isImage ? (
                            <Eye className="w-6 h-6 text-blue-600" />
                          ) : (
                            <File className="w-6 h-6 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 font-medium truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {file.size || 'File'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {canPreview && (
                            <button
                              onClick={() => {
                                setPreviewFileId(isPreviewing ? null : fileId);
                              }}
                              className="w-9 h-9 rounded-full bg-white border border-blue-200 flex items-center justify-center hover:bg-blue-100 transition-colors"
                              title={isPreviewing ? 'Hide preview' : 'Preview'}
                            >
                              <Eye className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          {file.data ? (
                            <a
                              href={file.data}
                              download={file.name}
                              className="w-9 h-9 rounded-full bg-white border border-blue-200 flex items-center justify-center hover:bg-blue-100 transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4 text-blue-600" />
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">No file data</span>
                          )}
                        </div>
                      </div>
                      {canPreview && isPreviewing && (
                        <div className="mt-3 rounded-lg overflow-hidden border-2 border-blue-200 bg-gray-50 max-h-80 flex items-center justify-center">
                          <img
                            src={file.data}
                            alt={file.name}
                            className="w-full h-auto max-h-80 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              </div>
            )}
          </div>

          {/* Remark Card (if exists) */}
          {selectedRequest.remark && (
            <div
              className={`rounded-2xl p-5 border-2 shadow-md ${getStatusColor(selectedRequest.status)}`}
            >
              <p className="text-sm text-gray-600 mb-2">
                Principal's Remark
              </p>
              <p className="text-gray-900">
                {selectedRequest.remark}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons (only show if pending) */}
        {selectedRequest.status === "pending" && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectionModal(true)}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                <div className="flex items-center justify-center gap-2">
                  <XCircle className="w-5 h-5" />
                  <span>Reject</span>
                </div>
              </button>
              <button
                onClick={() => setShowApprovalModal(true)}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Approve</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Student Profile Modal */}
        {showStudentProfile && (
          <StudentProfileModal
            student={getStudentData()}
            onClose={() => setShowStudentProfile(false)}
            themeColor="green"
          />
        )}

        {/* Approval Modal */}
        {showApprovalModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 rounded-t-3xl">
                <h3 className="text-white text-xl">
                  Approve Permission
                </h3>
                <p className="text-green-100 text-sm">
                  Add a remark for the student
                </p>
              </div>
              <div className="p-6">
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Enter your remark... (e.g., Approved. Please show this to security at gate.)"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowApprovalModal(false);
                      setRemark("");
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={!remark.trim()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {showRejectionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5 rounded-t-3xl">
                <h3 className="text-white text-xl">
                  Reject Permission
                </h3>
                <p className="text-red-100 text-sm">
                  Provide reason for rejection
                </p>
              </div>
              <div className="p-6">
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Enter reason for rejection... (e.g., Bank work can be done after college hours.)"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRejectionModal(false);
                      setRemark("");
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!remark.trim()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List View
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-4 shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-white">
              Permission Management
            </h1>
            <p className="text-sm text-green-100">
              Review and approve student requests
            </p>
          </div>
        </div>

      </div>
      
 {/* Search Bar */}
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
  <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search by name, roll number, or ID..."
    className="
      w-full
      pl-10 pr-4 py-3
      rounded-xl
      border-2 border-gray-300
      bg-white
      shadow-sm
      focus:outline-none
      focus:border-green-500
      focus:ring-2 focus:ring-green-200
      transition-all
    "
  />
</div>


      {/* Content */}
      <div className="p-4">
        {/* Statistics */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 text-center">
            <p className="text-2xl text-gray-900 mb-1">
              {permissions.length}
            </p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-3 shadow-sm border border-yellow-200 text-center">
            <p className="text-2xl text-yellow-600 mb-1">
              {
                permissions.filter(
                  (r) => r.status === "pending",
                ).length
              }
            </p>
            <p className="text-xs text-gray-600">Pending</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 shadow-sm border border-green-200 text-center">
            <p className="text-2xl text-green-600 mb-1">
              {
                permissions.filter(
                  (r) => r.status === "approved",
                ).length
              }
            </p>
            <p className="text-xs text-gray-600">Approved</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 shadow-sm border border-red-200 text-center">
            <p className="text-2xl text-red-600 mb-1">
              {
                permissions.filter(
                  (r) => r.status === "rejected",
                ).length
              }
            </p>
            <p className="text-xs text-gray-600">Rejected</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setFilterStatus("pending")}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
              filterStatus === "pending"
                ? "bg-yellow-600 text-white shadow-md"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Pending (
            {
              permissions.filter((r) => r.status === "pending")
                .length
            }
            )
          </button>
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
              filterStatus === "all"
                ? "bg-green-600 text-white shadow-md"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus("approved")}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
              filterStatus === "approved"
                ? "bg-green-600 text-white shadow-md"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilterStatus("rejected")}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
              filterStatus === "rejected"
                ? "bg-red-600 text-white shadow-md"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Rejected
          </button>
        </div>

        {/* Requests List */}
        <div>
          <h2 className="text-gray-900 mb-3">
            {filterStatus === "all"
              ? "All Requests"
              : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Requests`}
          </h2>
          {filteredPermissions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                No permission requests found
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPermissions.map((request) => (
                <button
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className={`w-full bg-white rounded-xl p-4 shadow-sm border-2 hover:shadow-md transition-all active:scale-98 text-left ${getStatusColor(request.status)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-gray-900">
                          {request.studentName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {request.rollNumber} •{" "}
                          {request.semester}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs border flex-shrink-0 ${getStatusBadge(request.status)}`}
                    >
                      {request.status.charAt(0).toUpperCase() +
                        request.status.slice(1)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(request.status)}
                    <span className="text-gray-900">
                      {request.typeLabel}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {request.reason}
                  </p>

                  {request.attachments?.length ? (
                    <p className="text-xs text-blue-600">
                      📎 {request.attachments.length} file(s)
                    </p>
                  ) : null}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {request.date} • {request.time}
                    </span>
                    <span className="text-gray-400">
                      {request.id}
                    </span>
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
