import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, Plus, Send, Clock, AlertCircle, CheckCircle, 
  FileText, User, ChevronRight, Phone, Mail, ShieldAlert
} from 'lucide-react';
import { complaintsAPI } from '../api';
import { ProfileAvatar } from './ProfileAvatar';
import { toast } from 'sonner';

/* ======================= COMPLETE DATA RESTORED ======================= */

const categories = [
  { id: 'facilities', name: 'Facilities', icon: '🏢' },
  { id: 'harassment', name: 'Harassment', icon: '⚠️' },
  { id: 'academics', name: 'Academics', icon: '📚' },
  { id: 'faculty', name: 'Faculty', icon: '🧑‍🏫' },
  { id: 'transport', name: 'Transport', icon: '🚌' },
  { id: 'other', name: 'Other', icon: '📝' },
];

const categoryFAQs: Record<string, any[]> = {
  facilities: [
    { id: 'wifi', question: 'WiFi not working', autoMessage: 'The WiFi is not working properly in the campus.' },
    { id: 'water', question: 'Water / washroom issue', autoMessage: 'There is a water or washroom maintenance issue.' },
  ],
  academics: [
    { id: 'attendance', question: 'Attendance issue', autoMessage: 'My attendance was marked absent even though I was present.' },
    { id: 'marks', question: 'Marks not updated', autoMessage: 'My internal marks are not updated in the portal.' },
  ],
  faculty: [
    { id: 'behavior', question: 'Faculty behavior', autoMessage: 'I want to report an issue related to faculty behavior.' },
    { id: 'teaching', question: 'Teaching quality', autoMessage: 'I have concerns regarding teaching quality.' },
  ],
  harassment: [
    { id: 'verbal', question: 'Verbal harassment', autoMessage: 'I want to report a verbal harassment incident.' },
    { id: 'online', question: 'Online harassment', autoMessage: 'I am facing harassment through online platforms.' },
  ],
  transport: [
    { id: 'bus', question: 'Bus delay', autoMessage: 'The college bus is frequently delayed.' },
    { id: 'route', question: 'Bus route issue', autoMessage: 'There is an issue with the current bus route.' },
  ],
  other: [
    { id: 'general', question: 'General issue', autoMessage: 'I want to report a general issue.' },
  ],
};
const normalizeStatus = (rawStatus: string): 'pending' | 'in-review' | 'resolved' => {
  const status = String(rawStatus || 'pending').toLowerCase();
  if (status === 'resolved') return 'resolved';
  if (status === 'in-review' || status === 'open' || status === 'assigned') return 'in-review';
  return 'pending';
};

const getCategoryFromSubject = (subject: string | undefined) => {
  const safeSubject = String(subject || '').toLowerCase();
  return (
    categories.find((cat) => safeSubject.startsWith(`${cat.name.toLowerCase()}:`)) ||
    categories.find((cat) => safeSubject.includes(cat.name.toLowerCase())) ||
    categories.find((cat) => cat.id === 'other')!
  );
};
export function ComplaintBox({ onBack, userRole, userName }: { onBack: () => void, userRole?: string, userName: string }) {
  const [view, setView] = useState<'home' | 'chat' | 'history'>('home');
  const [activeComplaint, setActiveComplaint] = useState<any | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [complaints, setComplaints] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [lightboxItem, setLightboxItem] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const timeNow = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // Load complaints for this specific student
  const loadHistory = async () => {
    try {
      const all = await complaintsAPI.getAll();
      const normalized = (all || []).map((c: any) => {
        const category = getCategoryFromSubject(c.subject);
        const createdTimestamp = c.created_at
          ? new Date(c.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          : timeNow();
        const studentAttachments = (() => {
          try {
            return JSON.parse(c.student_attachments || '[]') || [];
          } catch {
            return [];
          }
        })();
        const adminAttachments = (() => {
          try {
            return JSON.parse(c.admin_attachments || '[]') || [];
          } catch {
            return [];
          }
        })();
        const adminMedia = [...adminAttachments];
        const conversation = (() => {
          try {
            const parsed = JSON.parse(c.conversation || '[]');
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
                ? new Date(String(msg.timestamp)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                : createdTimestamp,
              attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
            }))
          : [
              { id: 's1', text: c.description || '', sender: 'student', timestamp: createdTimestamp, attachments: studentAttachments },
              ...((c.reply || adminMedia.length > 0)
                ? [{ id: 'a1', text: c.reply || 'Admin response', sender: 'admin', timestamp: createdTimestamp, attachments: adminMedia }]
                : []),
            ];

        return {
          id: `CMP-${c.id}`,
          dbId: c.id,
          categoryId: category.id,
          categoryName: category.name,
          categoryIcon: category.icon,
          subject: c.subject || 'Complaint',
          preview: c.description || '',
          date: c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
          status: normalizeStatus(c.status),
          studentCanReply: Boolean(c.student_can_reply),
          studentInfo: { rollNo: userName, name: userName },
          messages: conversationMessages,
        };
      });
      setComplaints(normalized.sort((a: any, b: any) => (b.dbId || 0) - (a.dbId || 0)));
      
      if (activeComplaint) {
        const updated = normalized.find((c: any) => c.id === activeComplaint.id);
        if (updated) setActiveComplaint(updated);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadHistory(); }, [userName, view]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
    });
  };

  const handleSend = async () => {
    if (activeComplaint?.status === 'resolved') {
      toast.error('Complaint is resolved. You can view the chat history only.');
      return;
    }
    if (activeComplaint && !activeComplaint.studentCanReply) {
      toast.error('Wait for admin to enable chat before sending another message.');
      return;
    }
    if (!messageInput.trim() && attachments.length === 0) return;

    const encodedFiles = await Promise.all(attachments.map(async (f) => ({
      name: f.name,
      type: f.type,
      data: await fileToBase64(f)
    })));

    const newMessage = {
      id: Date.now().toString(),
      text: messageInput,
      sender: 'student',
      timestamp: timeNow(),
      attachments: encodedFiles
    };

    if (activeComplaint) {
      // Student follow-up on existing complaint
      try {
        await complaintsAPI.reply(activeComplaint.dbId || activeComplaint.id, { reply: messageInput, status: 'in-review', attachments: encodedFiles });
        const updated = { ...activeComplaint, status: 'in-review', studentCanReply: false, messages: [...activeComplaint.messages, newMessage] };
        setActiveComplaint(updated);
        window.dispatchEvent(new CustomEvent('complaintUpdated'));
      } catch (error) {
        console.error('Failed to update complaint:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to update complaint. Please try again.');
        return;
      }
    } else {
      const cat = categories.find(c => c.id === categoryId);
      try {
        await complaintsAPI.create({
          subject: `${cat?.name || 'Complaint'}: ${messageInput.slice(0, 60)}`,
          description: messageInput,
          attachments: encodedFiles,
        });
        toast.success("Complaint Registered Successfully");
        window.dispatchEvent(new CustomEvent('complaintUpdated'));
        setView('history');
      } catch (error) {
        console.error('Failed to create complaint:', error);
        toast.error('Failed to register complaint. Please try again.');
        return;
      }
    }
    await loadHistory();
    setMessageInput('');
    setAttachments([]);
  };

  /* --- VIEW 1: HOME (CATEGORY GRID) --- */
  if (view === 'home') return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="bg-blue-600 p-4 text-white flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 active:scale-90 transition-transform"><ArrowLeft/></button>
          <h1 className="font-bold text-lg">Complaint Box</h1>
        </div>
        <button onClick={() => setView('history')} className="bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-full text-xs font-bold transition-colors">
          MY COMPLAINTS ({complaints.length})
        </button>
      </div>

      <div className="p-4 grid grid-cols-2 gap-4 overflow-y-auto">
        {categories.map(c => (
          <button key={c.id} onClick={() => { setCategoryId(c.id); setActiveComplaint(null); setView('chat'); }} 
            className="bg-white p-6 rounded-3xl shadow-sm border-b-4 border-gray-100 flex flex-col items-center gap-3 active:scale-95 transition-all hover:shadow-md">
            <span className="text-5xl">{c.icon}</span>
            <span className="font-bold text-gray-700">{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );

  /* --- VIEW 2: CHAT (FOR BOTH NEW & HISTORY) --- */
  if (view === 'chat') return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* RESTORED: PRINCIPAL HEADER */}
      <div className="bg-blue-600 p-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setView(activeComplaint ? 'history' : 'home')} className="p-2 bg-white/20 rounded-full text-white"><ArrowLeft size={20}/></button>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">
              {activeComplaint ? activeComplaint.categoryName : categories.find(c => c.id === categoryId)?.name}
            </h2>
            <p className="text-blue-100 text-xs">Direct Support Channel</p>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">👤</div>
          <div className="flex-1">
            <p className="text-white text-sm font-bold">Principal: Ram Chand</p>
            <div className="flex gap-3 mt-0.5">
              <span className="text-blue-100 text-[10px] flex items-center gap-1"><Phone size={10}/> +91 98765 00001</span>
              <span className="text-blue-100 text-[10px] flex items-center gap-1"><Mail size={10}/> principal@college.edu</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHAT MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeComplaint?.messages.map((m: any) => (
          <div key={m.id} className={`flex items-end gap-2 ${m.sender === 'student' ? 'flex-row-reverse' : 'flex-row'}`}>
            {m.sender !== 'system' && <ProfileAvatar userName={m.sender === 'student' ? userName : 'Admin'} size="sm" />}
            <div className={`max-w-[75%] p-3 rounded-2xl shadow-sm ${
              m.sender === 'student' ? 'bg-blue-600 text-white rounded-br-none' : 
              m.sender === 'system' ? 'bg-gray-200 text-gray-500 text-center mx-auto text-xs italic' : 
              'bg-white text-gray-800 rounded-bl-none border'
            }`}>
              <p className="text-sm leading-relaxed">{m.text}</p>
              {m.attachments?.map((file: any, i: number) => (
                <div key={i} className="mt-2 bg-black/10 rounded-lg p-2 text-xs">
                  {m.sender === 'admin' ? (
                    <div className="flex items-center gap-2">
                      <FileText size={14}/> <span className="truncate w-32">{file.name}</span>
                      {file.data && (
                        <a href={file.data} download={file.name} className="ml-auto text-blue-200 hover:text-white">Download</a>
                      )}
                    </div>
                  ) : file.type && file.type.startsWith('image/') && file.data ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setLightboxItem({ ...file, kind: 'image' })}
                        className="block"
                      >
                        <img src={file.data} alt={file.name} className="w-48 h-32 object-cover rounded" />
                      </button>
                      <div className="flex items-center justify-between">
                        <span className="truncate w-40">{file.name}</span>
                      </div>
                    </div>
                  ) : file.type && file.type.startsWith('video/') && file.data ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setLightboxItem({ ...file, kind: 'video' })}
                        className="block"
                      >
                        <video controls={false} src={file.data} className="w-48 rounded" />
                      </button>
                      <div className="flex items-center justify-between">
                        <span className="truncate w-40">{file.name}</span>
                      </div>
                    </div>
                  ) : file.type && file.type.startsWith('audio/') && file.data ? (
                    <div className="space-y-2">
                      <audio controls src={file.data} className="w-48" />
                      <div className="flex items-center justify-between">
                        <span className="truncate w-40">{file.name}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FileText size={14}/> <span className="truncate w-32">{file.name}</span>
                    </div>
                  )}
                </div>
              ))}
              <p className={`text-[9px] mt-1 ${m.sender === 'student' ? 'text-blue-200' : 'text-gray-400'}`}>{m.timestamp}</p>
            </div>
          </div>
        ))}

        {/* RESTORED: FAQ CHIPS (New complaints only) */}
        {!activeComplaint && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categoryFAQs[categoryId!]?.map(f => (
              <button key={f.id} onClick={() => setMessageInput(f.autoMessage)} className="whitespace-nowrap bg-white border-2 border-blue-100 text-blue-600 px-4 py-2 rounded-full text-xs font-bold active:bg-blue-600 active:text-white transition-all">
                {f.question}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* INPUT AREA */}
      <div className="p-4 bg-white border-t-2 border-gray-100">
        {activeComplaint?.status === 'resolved' && (
          <div className="mb-2 rounded-xl bg-green-50 border border-green-200 p-3 text-green-800 text-xs font-semibold">
            Complaint resolved. Chat is read-only.
          </div>
        )}
        {activeComplaint && activeComplaint.status !== 'resolved' && !activeComplaint.studentCanReply && (
          <div className="mb-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 text-xs font-semibold">
            You have already sent your message. Wait until admin enables chat to send the next one.
          </div>
        )}
        <div className="flex gap-2 mb-2 overflow-x-auto">
          {attachments.map((f, i) => (
            <div key={i} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] flex items-center gap-2 border border-blue-100 font-bold shrink-0">
              {f.name} <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}>✕</button>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-2 bg-gray-50 p-2 rounded-3xl border focus-within:border-blue-400 transition-all">
          <button onClick={() => fileInputRef.current?.click()} disabled={activeComplaint?.status === 'resolved' || (Boolean(activeComplaint) && !activeComplaint.studentCanReply)} className="p-3 bg-white rounded-full shadow-sm text-blue-600 active:scale-90 transition-transform disabled:opacity-50"><Plus/></button>
          <input type="file" ref={fileInputRef} hidden multiple accept="image/*,audio/*,.pdf,.doc,.docx" onChange={(e) => setAttachments([...attachments, ...Array.from(e.target.files || [])])} />
          <textarea value={messageInput} onChange={e => setMessageInput(e.target.value)} placeholder={activeComplaint && !activeComplaint.studentCanReply ? 'Admin must enable chat before you can reply...' : 'Explain your issue...'} 
            className="flex-1 bg-transparent px-2 py-2 text-sm focus:outline-none resize-none max-h-32" rows={2} disabled={activeComplaint?.status === 'resolved' || (Boolean(activeComplaint) && !activeComplaint.studentCanReply)} />
          <button onClick={handleSend} disabled={activeComplaint?.status === 'resolved' || (Boolean(activeComplaint) && !activeComplaint.studentCanReply)} className="p-3 bg-blue-600 text-white rounded-full shadow-lg active:scale-90 transition-transform disabled:opacity-50"><Send size={20}/></button>
        </div>
      </div>

      {lightboxItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setLightboxItem(null)}>
          <div className="max-w-3xl w-full bg-white rounded-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold truncate">{lightboxItem.name}</div>
              <button className="text-sm" onClick={() => setLightboxItem(null)}>Close</button>
            </div>
            {lightboxItem.kind === 'image' && (
              <img src={lightboxItem.data} alt={lightboxItem.name} className="w-full max-h-[70vh] object-contain rounded" />
            )}
            {lightboxItem.kind === 'video' && (
              <video controls src={lightboxItem.data} className="w-full max-h-[70vh] rounded" />
            )}
          </div>
        </div>
      )}
    </div>
  );

  /* --- VIEW 3: HISTORY (CLICKABLE LIST) --- */
  if (view === 'history') return (
    <div className="h-screen bg-white flex flex-col">
      <div className="bg-blue-600 p-4 text-white flex items-center gap-3 shadow-md">
        <button onClick={() => setView('home')}><ArrowLeft/></button>
        <h1 className="font-bold text-lg">My Complaints</h1>
      </div>

      {/* RESTORED: AUDIT RECORD BANNER */}
      <div className="bg-amber-50 border-b border-amber-100 p-4 flex gap-3 items-center">
        <ShieldAlert className="text-amber-600 shrink-0" size={24}/>
        <div>
          <p className="text-xs font-black text-amber-900 uppercase tracking-tighter">Official Audit Record</p>
          <p className="text-[11px] text-amber-700 leading-tight">These complaints are part of the college's permanent record and cannot be deleted by the student or faculty.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {complaints.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 gap-3">
            <FileText size={60}/> <p className="font-bold">No complaints found</p>
          </div>
        ) : (
          complaints.map(c => (
            <div key={c.id} onClick={() => { setActiveComplaint(c); setCategoryId(c.categoryId); setView('chat'); }} 
              className="group bg-white p-5 rounded-3xl shadow-sm border-2 border-gray-50 flex items-center gap-4 active:bg-blue-50 transition-all cursor-pointer">
              <div className="text-4xl bg-slate-50 w-16 h-16 flex items-center justify-center rounded-2xl group-active:scale-90 transition-transform">
                {c.categoryIcon}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-gray-800 text-sm line-clamp-1">{c.subject}</h3>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                    c.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                  }`}>{c.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1 font-medium">{c.preview}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-gray-400 font-mono">#{c.id}</span>
                  <span className="text-[10px] text-blue-500 font-bold flex items-center gap-1"><Clock size={10}/> {c.date}</span>
                </div>
              </div>
              <ChevronRight className="text-gray-300" size={20}/>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

