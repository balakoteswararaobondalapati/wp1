import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Eye,
  File,
  FileText,
  Filter,
  ImageIcon,
  Mail,
  Paperclip,
  Phone,
  Search,
  Send,
  X,
} from 'lucide-react';
import { complaintsAPI } from '../api';
import { ProfileAvatar } from './ProfileAvatar';
import { StudentProfileModal } from './StudentProfileModal';

interface AdminComplaintsManagementProps {
  onBack: () => void;
}

type ComplaintStatus = 'pending' | 'in-review' | 'resolved';

interface ComplaintAttachment {
  id: string;
  name: string;
  type: string;
  data?: string;
  size?: number;
}

interface ComplaintMessage {
  id: string;
  text: string;
  sender: 'student' | 'admin';
  timestamp: string;
  senderName?: string;
  attachments?: ComplaintAttachment[];
}

interface AdminComplaint {
  id: string;
  dbId: number;
  subject: string;
  preview: string;
  date: string;
  status: ComplaintStatus;
  categoryIcon: string;
  categoryName: string;
  attachments: ComplaintAttachment[];
  messages: ComplaintMessage[];
  studentCanReply: boolean;
  studentInfo: {
    name: string;
    rollNo: string;
    semester: string;
    section: string;
    phone: string;
    email: string;
  };
}

const formatStatus = (status: string): ComplaintStatus => {
  if (status === 'resolved') return 'resolved';
  if (status === 'in-review' || status === 'open' || status === 'assigned') return 'in-review';
  return 'pending';
};

  const normalizeComplaint = (row: any): AdminComplaint => {
    const created = row.created_at ? new Date(row.created_at) : new Date();
    const studentName = row.student_name || row.student_full_name || row.student_username || row.student_email || `Student ${row.student_id ?? ''}`.trim();
    const studentEmail = row.student_email || '';
  const studentAttachments = (() => {
    try {
      return JSON.parse(row.student_attachments || '[]') || [];
    } catch {
      return [];
    }
  })();
  const adminAttachments = (() => {
    try {
      return JSON.parse(row.admin_attachments || '[]') || [];
    } catch {
      return [];
    }
  })();
  const adminMedia = [...adminAttachments];
  const conversation = (() => {
    try {
      const parsed = JSON.parse(row.conversation || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const conversationMessages = conversation.length
    ? conversation.map((msg: any) => ({
        id: msg.id || `${msg.sender || 'm'}-${Math.random()}`,
        text: msg.text || '',
        sender: msg.sender === 'admin' ? 'admin' : 'student',
        timestamp: msg.timestamp
          ? new Date(String(msg.timestamp)).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : created.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        senderName: msg.sender === 'admin' ? 'Admin Team' : studentName,
        attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
      }))
    : [
        {
          id: `s-${row.id}`,
          text: row.description || '',
          sender: 'student',
          timestamp: created.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          senderName: studentName,
          attachments: studentAttachments,
        },
        ...(row.reply || adminMedia.length > 0
          ? [
              {
                id: `a-${row.id}`,
                text: String(row.reply || 'Admin response'),
                sender: 'admin' as const,
                timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                senderName: 'Admin Team',
                attachments: adminMedia,
              },
            ]
          : []),
      ];

  return {
    id: row.complaint_code || `CMP-${row.id}`,
    dbId: Number(row.id),
    subject: row.subject || 'Complaint',
    preview: row.description || '',
    date: created.toLocaleDateString(),
    status: formatStatus(String(row.status || 'pending')),
    categoryIcon: '??',
    categoryName: 'Complaint',
    attachments: studentAttachments,
    messages: conversationMessages,
    studentCanReply: Boolean(row.student_can_reply),
    studentInfo: {
      name: studentName,
      rollNo: row.student_roll_number || row.roll_number || '-',
      semester: String(row.student_semester || row.semester || '-'),
      section: String(row.student_section || row.section || '-'),
      phone: row.student_phone || '-',
      email: studentEmail,
    },
  };
};

export function AdminComplaintsManagement({ onBack }: AdminComplaintsManagementProps) {
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [selectedComplaint, setSelectedComplaint] = useState<AdminComplaint | null>(null);
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | ComplaintStatus>('all');
  const [messageInput, setMessageInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [lightboxItem, setLightboxItem] = useState<ComplaintAttachment | null>(null);
  const [showStudentProfile, setShowStudentProfile] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileStudentData, setProfileStudentData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchComplaints = async () => {
    try {
      const rows = await complaintsAPI.getAll();
      const normalized = (rows || []).map(normalizeComplaint).sort((a, b) => b.dbId - a.dbId);
      setComplaints(normalized);
      if (selectedComplaint) {
        const updated = normalized.find((x) => x.dbId === selectedComplaint.dbId);
        if (updated) setSelectedComplaint(updated);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setComplaints([]);
    }
  };

  useEffect(() => {
    void fetchComplaints();
    const interval = setInterval(() => void fetchComplaints(), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedComplaint?.messages]);

  const filteredComplaints = complaints.filter((complaint) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      complaint.subject.toLowerCase().includes(q) ||
      complaint.id.toLowerCase().includes(q) ||
      complaint.studentInfo.name.toLowerCase().includes(q) ||
      complaint.studentInfo.rollNo.toLowerCase().includes(q);
    const matchesFilter = filterStatus === 'all' || complaint.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files || [])]);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleSendMessage = async () => {
    if (!selectedComplaint || selectedComplaint.status === 'resolved' || (!messageInput.trim() && attachments.length === 0)) return;

    try {
      const encodedFiles = await Promise.all(attachments.map(async (f) => ({
        id: `${f.name}-${f.size}-${f.lastModified}`,
        name: f.name,
        type: f.type,
        size: f.size,
        data: await fileToBase64(f),
      })));

      await complaintsAPI.reply(selectedComplaint.dbId, {
        reply: messageInput,
        status: 'in-review',
        attachments: encodedFiles,
      });
      await fetchComplaints();
      setMessageInput('');
      setAttachments([]);
      window.dispatchEvent(new CustomEvent('complaintUpdated', { detail: { complaintId: selectedComplaint.dbId, status: 'in-review' } }));
    } catch (error) {
      console.error('Error replying to complaint:', error);
    }
  };


  const handleMarkResolved = async () => {
    if (!selectedComplaint) return;

    try {
      await complaintsAPI.update(selectedComplaint.dbId, { status: 'resolved' });
      await fetchComplaints();
      window.dispatchEvent(new CustomEvent('complaintUpdated', { detail: { complaintId: selectedComplaint.dbId, status: 'resolved' } }));
    } catch (error) {
      console.error('Error marking complaint as resolved:', error);
    }
  };

  const handleToggleStudentChat = async (enabled: boolean) => {
    if (!selectedComplaint || selectedComplaint.status === 'resolved') return;

    try {
      await complaintsAPI.update(selectedComplaint.dbId, { student_can_reply: enabled });
      await fetchComplaints();
      window.dispatchEvent(new CustomEvent('complaintUpdated', { detail: { complaintId: selectedComplaint.dbId, studentCanReply: enabled } }));
    } catch (error) {
      console.error('Error updating complaint chat state:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'in-review':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'resolved':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'in-review':
        return <AlertCircle className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (view === 'chat' && selectedComplaint) {
    const isResolved = selectedComplaint.status === 'resolved';
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 font-['Poppins',sans-serif] flex flex-col">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 shadow-md sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <button onClick={() => setView('list')} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95">
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedComplaint.categoryIcon}</span>
                  <div>
                    <h2 className="text-white text-sm sm:text-base line-clamp-1">{selectedComplaint.categoryName}</h2>
                    <p className="text-xs text-green-100">ID: {selectedComplaint.id}</p>
                  </div>
                </div>
              </div>
            </div>

            <ProfileAvatar userName={selectedComplaint.studentInfo.name} themeColor="green" onClick={() => setShowStudentProfile(!showStudentProfile)} className="ml-2" size="sm" />
          </div>

          <div className="flex items-center gap-2 mt-3">
            <span className={`px-3 py-1 rounded-full text-xs border font-medium flex items-center gap-1 ${getStatusBadge(selectedComplaint.status)}`}>
              {getStatusIcon(selectedComplaint.status)}
              {selectedComplaint.status.charAt(0).toUpperCase() + selectedComplaint.status.slice(1).replace('-', ' ')}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs border font-medium ${selectedComplaint.studentCanReply ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>
              {selectedComplaint.studentCanReply ? 'Chat Enabled' : 'Chat Locked'}
            </span>
            {!isResolved && (
              <button onClick={() => void handleToggleStudentChat(!selectedComplaint.studentCanReply)} className="px-3 py-1 rounded-full text-xs bg-white text-green-600 hover:bg-green-50 transition-all active:scale-95 font-medium">
                {selectedComplaint.studentCanReply ? 'Disable Chat' : 'Enable Chat'}
              </button>
            )}
            {selectedComplaint.status !== 'resolved' && (
              <button onClick={handleMarkResolved} className="px-3 py-1 rounded-full text-xs bg-white text-green-600 hover:bg-green-50 transition-all active:scale-95 font-medium">
                Mark Resolved
              </button>
            )}
          </div>
        </div>

        {showStudentProfile && (
          <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-gray-900 mb-3 flex items-center gap-2">
                <ProfileAvatar userName={selectedComplaint.studentInfo.name} size="sm" themeColor="green" className="w-6 h-6" />
                Student Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">Name</p><p className="text-sm text-gray-900 font-medium">{selectedComplaint.studentInfo.name}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">Roll Number</p><p className="text-sm text-gray-900 font-medium">{selectedComplaint.studentInfo.rollNo}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">Semester</p><p className="text-sm text-gray-900 font-medium">{selectedComplaint.studentInfo.semester}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">Section</p><p className="text-sm text-gray-900 font-medium">{selectedComplaint.studentInfo.section}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" />Phone</p><p className="text-sm text-gray-900 font-medium">{selectedComplaint.studentInfo.phone}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Mail className="w-3 h-3" />Email</p><p className="text-sm text-gray-900 font-medium truncate">{selectedComplaint.studentInfo.email || '-'}</p></div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {selectedComplaint.messages.map((message, index) => (
              <div key={message.id ?? `msg-${index}`} className="flex items-end gap-2">
                {message.sender !== 'admin' && (
                  <ProfileAvatar userName={selectedComplaint.studentInfo.name} themeColor="green" onClick={() => setShowProfileModal(true)} size="sm" />
                )}

                <div className={`max-w-[75%] sm:max-w-[65%] rounded-2xl p-4 shadow-sm ${message.sender === 'admin' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>
                  {message.senderName && (
                    <p className={`text-xs mb-1 ${message.sender === 'admin' ? 'text-green-100' : 'text-gray-500'}`}>{message.senderName}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>

                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.attachments.map((att, attIndex) => (
                        <div
                          key={att.id ?? `att-${attIndex}`}
                          className={`px-3 py-2 rounded-lg ${message.sender === 'admin' ? 'bg-white/20' : 'bg-gray-50'}`}
                        >
                          {att.type.startsWith('image/') && att.data ? (
                            <div className="space-y-2">
                              <button type="button" onClick={() => setLightboxItem({ ...att })} className="block">
                                <img src={att.data} alt={att.name} className="w-48 h-32 object-cover rounded" />
                              </button>
                              <div className="flex items-center justify-between">
                                <span className="text-xs truncate block">{att.name}</span>
                                <a href={att.data} download={att.name} className="text-xs underline">Download</a>
                              </div>
                            </div>
                          ) : att.type.startsWith('video/') && att.data ? (
                            <div className="space-y-2">
                              <video controls src={att.data} className="w-48 rounded" />
                              <div className="flex items-center justify-between">
                                <span className="text-xs truncate block">{att.name}</span>
                                <a href={att.data} download={att.name} className="text-xs underline">Download</a>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <File className="w-4 h-4 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs truncate block">{att.name}</span>
                                {att.size && <span className="text-xs opacity-70">{(att.size / 1024).toFixed(1)} KB</span>}
                              </div>
                              {att.data && (
                                <a href={att.data} download={att.name} className="text-xs underline">Download</a>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <p className={`text-xs mt-2 ${message.sender === 'admin' ? 'text-green-100' : 'text-gray-400'}`}>{message.timestamp}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {attachments.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
            <div className="max-w-4xl mx-auto">
              <p className="text-xs text-gray-500 mb-2">Attachments:</p>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 text-xs border border-gray-200">
                    <Paperclip className="w-3 h-3 text-gray-500" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button onClick={() => handleRemoveAttachment(index)} className="text-red-500 hover:text-red-700">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}


        <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            {isResolved && (
              <div className="mb-3 rounded-xl bg-green-50 border border-green-200 p-3 text-green-800 text-xs font-semibold">
                Complaint resolved. Reply is disabled, chat is read-only.
              </div>
            )}
            {!isResolved && !selectedComplaint.studentCanReply && (
              <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 text-xs font-semibold">
                Student chat is locked. Enable chat if you want to allow exactly one more student message.
              </div>
            )}
            <div className="flex items-end gap-2">
              <button onClick={() => fileInputRef.current?.click()} disabled={isResolved} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-95 flex-shrink-0 disabled:opacity-50">
                <Paperclip className="w-5 h-5 text-gray-600" />
              </button>

              <input ref={fileInputRef} type="file" multiple accept="image/*,audio/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileSelect} />

              <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-green-400 transition-all">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder="Type your response..."
                  className="w-full bg-transparent px-4 py-3 focus:outline-none resize-none text-sm"
                  rows={1}
                  disabled={isResolved}
                />
              </div>

              <button
                onClick={() => void handleSendMessage()}
                disabled={isResolved || (!messageInput.trim() && attachments.length === 0)}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {showProfileModal && selectedComplaint && (
          <StudentProfileModal
            student={{
              name: selectedComplaint.studentInfo.name,
              rollNo: selectedComplaint.studentInfo.rollNo,
              semester: selectedComplaint.studentInfo.semester,
              section: selectedComplaint.studentInfo.section,
              phone: selectedComplaint.studentInfo.phone,
              email: selectedComplaint.studentInfo.email,
            }}
            onClose={() => setShowProfileModal(false)}
            themeColor="green"
          />
        )}

        {lightboxItem && lightboxItem.data && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setLightboxItem(null)}>
            <div className="max-w-3xl w-full bg-white rounded-2xl p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold truncate">{lightboxItem.name}</div>
                <button className="text-sm" onClick={() => setLightboxItem(null)}>Close</button>
              </div>
              {lightboxItem.type.startsWith('image/') && (
                <img src={lightboxItem.data} alt={lightboxItem.name} className="w-full max-h-[70vh] object-contain rounded" />
              )}
              <div className="mt-3 text-right">
                <a href={lightboxItem.data} download={lightboxItem.name} className="text-blue-600 underline">Download</a>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 font-['Poppins',sans-serif]">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-4 shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-white">Student Complaints</h1>
            <p className="text-sm text-green-100">Manage and respond to complaints</p>
          </div>
        </div>
      </div>

      <div className="relative mt-4 px-4">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, roll number, or ID..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-300 bg-white shadow-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
        />
      </div>

      <div className="p-4">
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 text-center"><p className="text-2xl text-gray-900 mb-1">{complaints.length}</p><p className="text-xs text-gray-500">Total</p></div>
          <div className="bg-yellow-50 rounded-xl p-3 shadow-sm border border-yellow-200 text-center"><p className="text-2xl text-yellow-600 mb-1">{complaints.filter((c) => c.status === 'pending').length}</p><p className="text-xs text-gray-600">Pending</p></div>
          <div className="bg-blue-50 rounded-xl p-3 shadow-sm border border-blue-200 text-center"><p className="text-2xl text-blue-600 mb-1">{complaints.filter((c) => c.status === 'in-review').length}</p><p className="text-xs text-gray-600">In Review</p></div>
          <div className="bg-green-50 rounded-xl p-3 shadow-sm border border-green-200 text-center"><p className="text-2xl text-green-600 mb-1">{complaints.filter((c) => c.status === 'resolved').length}</p><p className="text-xs text-gray-600">Resolved</p></div>
        </div>

        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${filterStatus === 'all' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>All ({complaints.length})</button>
          <button onClick={() => setFilterStatus('pending')} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${filterStatus === 'pending' ? 'bg-yellow-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>Pending ({complaints.filter((c) => c.status === 'pending').length})</button>
          <button onClick={() => setFilterStatus('in-review')} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${filterStatus === 'in-review' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>In Review ({complaints.filter((c) => c.status === 'in-review').length})</button>
          <button onClick={() => setFilterStatus('resolved')} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${filterStatus === 'resolved' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>Resolved ({complaints.filter((c) => c.status === 'resolved').length})</button>
        </div>

        <div>
          <h2 className="text-gray-900 mb-3">{filterStatus === 'all' ? 'All Complaints' : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1).replace('-', ' ')} Complaints`}</h2>
          {filteredComplaints.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No complaints found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredComplaints.map((complaint) => (
                <button
                  key={complaint.id}
                  onClick={() => {
                    setSelectedComplaint(complaint);
                    setView('chat');
                  }}
                  className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all active:scale-98 text-left"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-2xl">{complaint.categoryIcon}</span>
                      <div className="flex-1">
                        <h3 className="text-gray-900 text-sm line-clamp-1">{complaint.subject}</h3>
                        <p className="text-xs text-gray-500">ID: {complaint.id}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs border flex-shrink-0 flex items-center gap-1 ${getStatusBadge(complaint.status)}`}>
                      {getStatusIcon(complaint.status)}
                      {complaint.status === 'in-review' ? 'Review' : complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{complaint.preview}</p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfileStudentData({
                          name: complaint.studentInfo.name,
                          rollNo: complaint.studentInfo.rollNo,
                          semester: complaint.studentInfo.semester,
                          section: complaint.studentInfo.section,
                          phone: complaint.studentInfo.phone,
                          email: complaint.studentInfo.email,
                        });
                        setShowProfileModal(true);
                      }}
                      className="flex items-center gap-1 hover:text-green-600 transition-colors cursor-pointer"
                    >
                      <ProfileAvatar userName={complaint.studentInfo.name} size="sm" themeColor="green" className="w-5 h-5" />
                      <span>{complaint.studentInfo.name}</span>
                      <span className="mx-1">.</span>
                      <span>{complaint.studentInfo.rollNo}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{complaint.date}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showProfileModal && profileStudentData && (
        <StudentProfileModal
          student={profileStudentData}
          onClose={() => {
            setShowProfileModal(false);
            setProfileStudentData(null);
          }}
          themeColor="green"
        />
      )}
    </div>
  );
}
