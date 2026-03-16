import React, { useState, useEffect } from 'react';
import { Calendar, FileText, Bell, House, User, ClipboardCheck, MessageSquareWarning, FileCheck } from 'lucide-react';
import { MaterialsPage } from './MaterialsPage';
import { ProfilePage } from './ProfilePage';
import { SubjectMaterialsPage } from './SubjectMaterialsPage';
import { TimetablePage } from './TimetablePage';
import { NoticeBoardPage } from './NoticeBoardPage';
import { AttendanceOverviewPage } from './AttendanceOverviewPage';
import { ComplaintBox } from './ComplaintBox';
import { PermissionsPage } from './PermissionsPage';
import { PermissionRequestForm, PermissionRequestData } from './PermissionRequestForm';
import { PermissionHistory } from './PermissionHistory';
import { ProfileAvatar } from './ProfileAvatar';
import { NoticeModal, Notice } from './NoticeModal';
import { useNotices } from '../context/NoticesContext';
import { StudentLinksPage } from './StudentLinksPage';
import { appStorage } from './';
import { formatHeaderDate } from '../utils/headerDateTime';
import { resolveHolidayBlock } from '../utils/holidayUtils';
import { getLocalDateISO } from '../utils/date';
import { attendanceAPI, authAPI, complaintsAPI, timetableAPI, quotesAPI } from '../api';

interface StudentDashboardProps {
  onLogout: () => void;
}

type NavItem = 'home' | 'profile';
type Page = 'home' | 'materials' | 'profile' | 'subject-materials' | 'timetable' | 'noticeboard' | 'attendance' | 'complaints' | 'permissions' | 'permission-form' | 'permission-history' | 'links';

export function StudentDashboard({ onLogout }: StudentDashboardProps) {
  const [activeNav, setActiveNav] = useState<NavItem>('home');
  const [liveHeaderTime, setLiveHeaderTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  );
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedPermissionType, setSelectedPermissionType] = useState<string>('');
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const { notices, loadNotices } = useNotices();
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render when attendance updates
  const [todayTimetable, setTodayTimetable] = useState<any[]>([]); // State for today's timetable
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [hasComplaintReplies, setHasComplaintReplies] = useState(false);
  const [replyComplaintIds, setReplyComplaintIds] = useState<number[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [quoteDateKey, setQuoteDateKey] = useState(() => getLocalDateISO());
  const [studentInfo, setStudentInfo] = useState({
    course: 'BCA',
    section: 'B1',
    semester: '1',
    rollNumber: '',
  });

  const formatQuoteAuthor = (raw: any) => {
    const value = String(raw || '').trim();
    if (!value) return '';
    const normalized = value.toLowerCase();
    if (normalized === 'unknown' || normalized === 'anonymous' || normalized === 'n/a') {
      return '';
    }
    return value;
  };

  // Load student notices on mount
  useEffect(() => {
    console.log('🎓 StudentDashboard: Loading student notices');
    loadNotices('student');
  }, []);

  // Listen for real-time attendance updates
  useEffect(() => {
    const handleAttendanceUpdate = () => {
      console.log('📊 Attendance updated - refreshing student dashboard');
      setRefreshKey(prev => prev + 1); // Force re-render
    };

    // Listen for custom event from faculty attendance marking
    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);
    window.addEventListener('facultyAttendanceUpdated', handleAttendanceUpdate);
    window.addEventListener('facultyScheduleUpdated', handleAttendanceUpdate);
    window.addEventListener('timetableUpdated', handleAttendanceUpdate);
    
    // Listen for storage event (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'student_attendance_records' || e.key === 'faculty_attendance_records' || e.key === 'faculty_date_schedules' || e.key === 'timetableUpdated') {
        handleAttendanceUpdate();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
      window.removeEventListener('facultyAttendanceUpdated', handleAttendanceUpdate);
      window.removeEventListener('facultyScheduleUpdated', handleAttendanceUpdate);
      window.removeEventListener('timetableUpdated', handleAttendanceUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Get today's date in YYYY-MM-DD format
  const today = getLocalDateISO();
  
  // Load holiday data from appStorage
  const todayHolidayData = resolveHolidayBlock(today, {
    course: studentInfo.course,
    section: studentInfo.section,
    semester: studentInfo.semester,
  });

  useEffect(() => {
    const updateLiveHeaderTime = () => {
      setLiveHeaderTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    updateLiveHeaderTime();
    const intervalId = window.setInterval(updateLiveHeaderTime, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Load student profile from backend for accurate timetable filtering.
  useEffect(() => {
    const loadStudentInfo = async () => {
      try {
        const me = await authAPI.me();
        setStudentInfo({
          course: String(me.course || me.department || 'BCA'),
          section: String(me.section || 'B1'),
          semester: String(me.semester || '1'),
          rollNumber: String(me.roll_number || ''),
        });
      } catch (error) {
        console.error('Failed to load student info from backend', error);
      }
    };
    void loadStudentInfo();
  }, []);

  useEffect(() => {
    const loadQuotes = async () => {
      try {
        const rows = await quotesAPI.getAll();
        setQuotes(Array.isArray(rows) ? rows : []);
      } catch (error) {
        console.error('Failed to load quotes', error);
        setQuotes([]);
      }
    };

    loadQuotes();

    const intervalId = setInterval(loadQuotes, 60000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadQuotes();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    let timeoutId = 0;
    let cancelled = false;

    const scheduleMidnightUpdate = () => {
      if (cancelled) return;
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
      const delay = nextMidnight.getTime() - now.getTime();

      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        setQuoteDateKey(getLocalDateISO());
        scheduleMidnightUpdate();
      }, delay);
    };

    setQuoteDateKey(getLocalDateISO());
    scheduleMidnightUpdate();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  // Get current day name
  const getCurrentDayName = () => {
    const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay();
    const currentDay = dayMap[today];
    // If it's Sunday, default to Monday
    return currentDay === 'Sun' ? 'Mon' : currentDay;
  };

  const todayDayName = getCurrentDayName();

  const apiDayToDay: Record<string, string> = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
  };

  // Load today's timetable from backend
  const loadTodayTimetable = async () => {
    try {
      const todayDayName = getCurrentDayName();
      const rows = await timetableAPI.getAll({
        course: studentInfo.course,
        section: studentInfo.section,
        semester: String(studentInfo.semester),
      });
      const finalSchedule = (rows || [])
        .filter((row: any) => (apiDayToDay[row.day_of_week] || row.day_of_week?.slice(0, 3)) === todayDayName)
        .map((row: any) => ({
          periodNumber: Number(row.period_number),
          subject: row.subject || '',
          time: row.time || '',
          faculty: row.faculty_name || '',
          room: row.room || '',
        }))
        .sort((a: any, b: any) => a.periodNumber - b.periodNumber);
      
      if (finalSchedule.length === 0) {
        console.log('📅 No timetable found for:', { 
          course: studentInfo.course, 
          section: studentInfo.section, 
          semester: studentInfo.semester, 
          day: todayDayName
        });
        return [];
      }
      
      console.log('📅 Loaded timetable for today (including ad-hoc):', finalSchedule);
      return finalSchedule;
    } catch (error) {
      console.error('Failed to load timetable', error);
      return [];
    }
  };

  // Load today's timetable on mount and when refreshKey changes
  useEffect(() => {
    const load = async () => {
      const schedule = await loadTodayTimetable();
      setTodayTimetable(schedule);
    };
    void load();
  }, [refreshKey, studentInfo.course, studentInfo.section, studentInfo.semester]);

  // Track date changes and reload timetable when date changes (e.g., at midnight)
  useEffect(() => {
    let currentDate = getLocalDateISO();
    
    // Check every minute if the date has changed
    const intervalId = setInterval(async () => {
      const newDate = getLocalDateISO();
      if (newDate !== currentDate) {
        console.log(`📅 Date changed from ${currentDate} to ${newDate}, reloading timetable`);
        currentDate = newDate;
        const schedule = await loadTodayTimetable();
        setTodayTimetable(schedule);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, []);

  // Check if there are admin replies in complaints from backend
  useEffect(() => {
    const loadComplaintReplyFlag = async () => {
      try {
        const all = await complaintsAPI.getAll();
        const repliedIds = (all || []).filter((c: any) => Boolean(c.reply)).map((c: any) => Number(c.id));
        setReplyComplaintIds(repliedIds);
        const seenIds = JSON.parse(appStorage.getItem('complaint_reply_seen_ids') || '[]');
        const hasUnread = repliedIds.some((id: number) => !seenIds.includes(id));
        setHasComplaintReplies(hasUnread);
      } catch (error) {
        console.error('Failed to check admin replies', error);
        setHasComplaintReplies(false);
      }
    };
    void loadComplaintReplyFlag();
  }, [refreshKey]);

  useEffect(() => {
    if (currentPage !== 'complaints') return;
    if (replyComplaintIds.length === 0) {
      setHasComplaintReplies(false);
      return;
    }
    const seenIds = JSON.parse(appStorage.getItem('complaint_reply_seen_ids') || '[]');
    const merged = Array.from(new Set([...seenIds, ...replyComplaintIds]));
    appStorage.setItem('complaint_reply_seen_ids', JSON.stringify(merged));
    setHasComplaintReplies(false);
  }, [currentPage, replyComplaintIds]);
  useEffect(() => {
    const refreshComplaintFlag = () => setRefreshKey((prev) => prev + 1);
    window.addEventListener('complaintUpdated', refreshComplaintFlag as EventListener);
    return () => window.removeEventListener('complaintUpdated', refreshComplaintFlag as EventListener);
  }, []);

  // Load attendance records from backend
  useEffect(() => {
    const loadAttendanceRecords = async () => {
      try {
        const rows = await attendanceAPI.getAll();
        setAttendanceRecords(rows || []);
      } catch (error) {
        console.error('Failed to load attendance records', error);
        setAttendanceRecords([]);
      }
    };
    void loadAttendanceRecords();
  }, [refreshKey]);

  // Build attendance array from timetable with actual attendance status
  const attendance = [];
  
  // Check if entire day is holiday
  const isHoliday = todayHolidayData?.isHoliday || false;
  const isClosed = todayHolidayData?.isClosed || false;

  // If it's a full holiday or college is closed, don't show any periods
  const isFullDayOff = isHoliday || isClosed;

  // Build attendance from timetable if not a full day off
  if (!isFullDayOff && todayTimetable.length > 0) {
    todayTimetable.forEach((period: any) => {
      // Determine which session this student belongs to (for blocked period check)
      // BCA and BCom = Morning sessions
      // BSC = Afternoon sessions
      const sessionType = (studentInfo.course === 'BCA' || studentInfo.course === 'BCOM') ? 'morning' : 'afternoon';
      const periodIndex = period.periodNumber - 1;
      const isBlocked = todayHolidayData?.sessions?.[sessionType]?.[periodIndex]?.isBlocked || false;
      
      // Find attendance record for this specific period
      const periodRecord = attendanceRecords.find((record: any) =>
        record.date === today &&
        Number(record.period_number) === Number(period.periodNumber) &&
        record.student_roll_number === studentInfo.rollNumber
      );
      
      // Debug: Log what we're looking for and what records exist
      if (!periodRecord) {
        console.log(`🔍 Looking for attendance:`, {
          date: today,
          periodId: `P${period.periodNumber}`,
          course: studentInfo.course,
          section: studentInfo.section,
          semester: studentInfo.semester,
          rollNumber: studentInfo.rollNumber
        });
        
        const matchingDateRecords = attendanceRecords.filter(
          (r: any) => r.date === today && r.student_roll_number === studentInfo.rollNumber,
        );
        if (matchingDateRecords.length > 0) {
          console.log(`📅 Found ${matchingDateRecords.length} records for today:`, 
            matchingDateRecords.map((r: any) => ({
              periodId: r.period_number,
              status: r.status,
            }))
          );
        } else {
          console.log('❌ No attendance records found for today');
        }
      }
      
      let status = 'unmarked'; // Default status
      
      if (isBlocked) {
        status = 'blocked';
      } else if (periodRecord) {
        status = periodRecord.status || 'unmarked';
        
        console.log(`✅ Found attendance for ${today} P${period.periodNumber}:`, {
          status: periodRecord.status,
          subject: period.subject,
          faculty: period.faculty
        });
      }

      attendance.push({
        period: `P${period.periodNumber}`,
        subject: period.subject,
        faculty: period.faculty,
        time: period.time,
        status: status,
        room: period.room
      });
    });
  }

  // Calculate attendance percentage
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const markedCount = attendance.filter(a => a.status !== 'unmarked').length;
  const attendancePercentage = markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 0;

  const currentDate = '12/11/2025';
  const formattedDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const handleNavClick = (nav: NavItem) => {
    setActiveNav(nav);
    if (nav === 'profile') {
      setCurrentPage('profile');
    }
  };

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-500 text-white border-green-600';
      case 'absent':
        return 'bg-red-500 text-white border-red-600';
      case 'holiday':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'blocked':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'closed':
        return 'bg-gray-400 text-white border-gray-500';
      case 'permission':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'unmarked':
        return 'bg-white text-gray-400 border-gray-300';
      default:
        return 'bg-white text-gray-400 border-gray-300';
    }
  };

  // Get current logged-in student's name
  const getCurrentStudentName = () => {
    try {
      const currentUser = JSON.parse(appStorage.getItem('current_user') || '{}');
      return currentUser.name || 'Student';
    } catch (error) {
      return 'Student';
    }
  };

  const studentName = getCurrentStudentName();

  // Render different pages based on currentPage state
  if (currentPage === 'materials') {
    return <MaterialsPage onBack={() => setCurrentPage('home')} onSubjectClick={(subject) => {
      setSelectedSubject(subject);
      setCurrentPage('subject-materials');
    }} />;
  }

  if (currentPage === 'subject-materials' && selectedSubject) {
    return <SubjectMaterialsPage subjectName={selectedSubject} onBack={() => setCurrentPage('materials')} />;
  }

  if (currentPage === 'profile') {
    return <ProfilePage onBack={() => setCurrentPage('home')} onLogout={onLogout} />;
  }

  if (currentPage === 'timetable') {
    return <TimetablePage onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'noticeboard') {
    return <NoticeBoardPage onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'attendance') {
    return <AttendanceOverviewPage onBack={() => setCurrentPage('home')} key={refreshKey} />;
  }

  if (currentPage === 'complaints') {
    return <ComplaintBox onBack={() => setCurrentPage('home')} userName={studentName} />;
  }

  if (currentPage === 'permissions') {
    return <PermissionsPage 
      onBack={() => setCurrentPage('home')}
      onRequestPermission={(type) => {
        setSelectedPermissionType(type);
        setCurrentPage('permission-form');
      }}
      onViewHistory={() => setCurrentPage('permission-history')}
    />;
  }

  if (currentPage === 'permission-form' && selectedPermissionType) {
    return <PermissionRequestForm 
      permissionType={selectedPermissionType}
      onBack={() => setCurrentPage('permissions')}
      onSubmit={(data: PermissionRequestData) => {
        console.log('Permission request submitted:', data);
        setCurrentPage('permissions');
      }}
    />;
  }

  if (currentPage === 'permission-history') {
    return <PermissionHistory onBack={() => setCurrentPage('permissions')} />;
  }

  if (currentPage === 'links') {
    return <StudentLinksPage onBack={() => setCurrentPage('home')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 pb-20 font-['Poppins',sans-serif]">
      {/* Header with Profile Avatar */}
      <div className="bg-blue-600 shadow-sm sticky top-0 z-10">
  {/* Header content */}
  <div className="px-4 py-4 flex items-center justify-between">
    
    {/* Left: Greeting */}
    <div>
      <h1 className="text-white text-lg">Hello, {studentName}</h1>
      <p className="text-sm text-blue-100">Welcome to your Dashboard</p>
    </div>

    {/* Right: Date/Time & Profile Avatar */}
    <div className="flex items-center gap-3">
      {/* Custom Date & Time */}
      {(() => {
        const customDate = appStorage.getItem('customHeaderDate');
        if (customDate) {
          const formattedDate = formatHeaderDate(customDate);
          if (!formattedDate) return null;
          return (
            <div className="hidden sm:block text-right mr-2">
              <p className="text-white text-sm font-medium">{formattedDate}</p>
              <p className="text-blue-100 text-xs">{liveHeaderTime}</p>
            </div>
          );
        }
        return null;
      })()}
      <ProfileAvatar
        userName={studentName}
        onClick={() => setCurrentPage('profile')}
        themeColor="blue"
        className="border-white"
      />
    </div>
  </div>

  {/* Blue bottom border */}
  <div className="h-1 bg-blue-900"></div>
</div>

      {/* Quote of the Day Section */}
      {(() => {
        const availableQuotes = Array.isArray(quotes) ? quotes : [];
        if (availableQuotes.length > 0) {
          const [year, month, day] = quoteDateKey.split('-').map(Number);
          const dateSeed = (year || 0) * 10000 + (month || 0) * 100 + (day || 0);
          const quoteIndex = Math.abs((dateSeed * 17 + 23) % availableQuotes.length);
          const todaysQuote = availableQuotes[quoteIndex];
          const bgColor = todaysQuote.bg_color || todaysQuote.bgColor || '#3B82F6';
          const textColor = todaysQuote.text_color || todaysQuote.textColor || '#FFFFFF';
          const fontSize = todaysQuote.font_size || todaysQuote.fontSize || 14;
          const author = formatQuoteAuthor(todaysQuote.author);

          return (
            <div className="px-4 pt-4">
              <div
                className="rounded-2xl p-5 shadow-lg border-2"
                style={{
                  backgroundColor: bgColor,
                  borderColor: `${bgColor}40`,
                  color: textColor
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl opacity-80 flex-shrink-0">"</div>
                  <div className="flex-1">
                    <p
                      className="italic leading-relaxed mb-2"
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {todaysQuote.text}
                    </p>
                    {author && (
                      <p
                        className="text-right opacity-90"
                        style={{ fontSize: `${Math.max(10, fontSize - 2)}px` }}
                      >
                        — {author}
                      </p>
                    )}
                  </div>
                  <div className="text-3xl opacity-80 flex-shrink-0 self-end">"</div>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Main Content */}
      <div className="px-4 pt-6 pb-4">
        {/* Greeting */}


        {/* Notice Board Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900">Notice Board</h2>
            <button
              onClick={() => setCurrentPage('noticeboard')}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span className="text-sm">View All</span>
            </button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {notices.slice(0, 3).map((notice) => (
              <button
                key={notice.id}
                onClick={() => setSelectedNotice(notice)}
                className={`flex-shrink-0 w-72 ${notice.color} border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow text-left`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-gray-900 pr-2">{notice.title}</h3>
                  <div className="flex flex-col items-end text-xs text-gray-500 whitespace-nowrap">
                    <span>{notice.date}</span>
                    {notice.time && <span>{notice.time}</span>}
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{notice.preview}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setCurrentPage('timetable')}
              className="bg-white rounded-2xl p-4 active:scale-95 transition-transform"
            >
              <div className="w-14 h-14 mx-auto mb-2">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Calendar body */}
                  <rect x="11" y="14" width="34" height="30" rx="2" fill="white" stroke="#000000" strokeWidth="2.5"/>
                  {/* Calendar header */}
                  <rect x="11" y="14" width="34" height="9" rx="2" fill="#DC2626"/>
                  <path d="M11 21 H45" stroke="#DC2626" strokeWidth="2"/>
                  {/* Binding rings */}
                  <circle cx="18" cy="18.5" r="2" fill="white"/>
                  <circle cx="28" cy="18.5" r="2" fill="white"/>
                  <circle cx="38" cy="18.5" r="2" fill="white"/>
                  {/* Grid lines */}
                  <line x1="11" y1="28" x2="45" y2="28" stroke="#E5E7EB" strokeWidth="1.5"/>
                  <line x1="11" y1="34" x2="45" y2="34" stroke="#E5E7EB" strokeWidth="1.5"/>
                  <line x1="11" y1="40" x2="45" y2="40" stroke="#E5E7EB" strokeWidth="1.5"/>
                  <line x1="20" y1="23" x2="20" y2="44" stroke="#E5E7EB" strokeWidth="1.5"/>
                  <line x1="28" y1="23" x2="28" y2="44" stroke="#E5E7EB" strokeWidth="1.5"/>
                  <line x1="36" y1="23" x2="36" y2="44" stroke="#E5E7EB" strokeWidth="1.5"/>
                </svg>
              </div>
              <p className="text-sm text-gray-700 text-center">Timetable</p>
            </button>

            <button
              onClick={() => setCurrentPage('materials')}
              className="bg-white rounded-2xl p-4 active:scale-95 transition-transform"
            >
              <div className="w-14 h-14 mx-auto mb-2">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Bottom book - Green */}
                  <rect x="16" y="32" width="24" height="8" rx="1" fill="#10B981" stroke="#000000" strokeWidth="2"/>
                  <rect x="16" y="32" width="4" height="8" fill="#059669"/>
                  <line x1="21" y1="34" x2="36" y2="34" stroke="#000000" strokeWidth="0.8" opacity="0.3"/>
                  <line x1="21" y1="36.5" x2="34" y2="36.5" stroke="#000000" strokeWidth="0.8" opacity="0.3"/>
                  
                  {/* Middle book - Orange */}
                  <rect x="18" y="23" width="24" height="8" rx="1" fill="#F97316" stroke="#000000" strokeWidth="2"/>
                  <rect x="18" y="23" width="4" height="8" fill="#EA580C"/>
                  <line x1="23" y1="25" x2="38" y2="25" stroke="#000000" strokeWidth="0.8" opacity="0.3"/>
                  <line x1="23" y1="27.5" x2="36" y2="27.5" stroke="#000000" strokeWidth="0.8" opacity="0.3"/>
                  
                  {/* Top book - Blue */}
                  <rect x="14" y="14" width="24" height="8" rx="1" fill="#3B82F6" stroke="#000000" strokeWidth="2"/>
                  <rect x="14" y="14" width="4" height="8" fill="#2563EB"/>
                  <line x1="19" y1="16" x2="34" y2="16" stroke="#000000" strokeWidth="0.8" opacity="0.3"/>
                  <line x1="19" y1="18.5" x2="32" y2="18.5" stroke="#000000" strokeWidth="0.8" opacity="0.3"/>
                </svg>
              </div>
              <p className="text-sm text-gray-700 text-center">Materials</p>
            </button>

            <button
              onClick={() => setCurrentPage('links')}
              className="bg-white rounded-2xl p-4 active:scale-95 transition-transform"
            >
              <div className="w-14 h-14 mx-auto mb-2">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Link icon - Chain links */}
                  <path d="M30 21L36 15C38.2091 12.7909 41.7909 12.7909 44 15C46.2091 17.2091 46.2091 20.7909 44 23L38 29" 
                    stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" fill="none"/>
                  <path d="M26 35L20 41C17.7909 43.2091 14.2091 43.2091 12 41C9.79086 38.7909 9.79086 35.2091 12 33L18 27" 
                    stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" fill="none"/>
                  <path d="M23 33L33 23" 
                    stroke="#A78BFA" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm text-gray-700 text-center">Links</p>
            </button>

            <button
              onClick={() => setCurrentPage('attendance')}
              className="bg-white rounded-2xl p-4 active:scale-95 transition-transform"
            >
              <div className="w-14 h-14 mx-auto mb-2">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Square background */}
                  <rect x="14" y="14" width="28" height="28" rx="3" fill="#22C55E" stroke="#000000" strokeWidth="2.5"/>
                  {/* Checkmark */}
                  <path d="M20 28L26 34L36 22" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm text-gray-700 text-center">Attendance</p>
            </button>
          </div>
        </div>

        {/* Today's Attendance */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900">Today's Attendance</h2>
            <button
              onClick={() => setCurrentPage('attendance')}
              className="text-sm text-blue-600 hover:text-blue-600 transition-colors"
            >
              View Details
            </button>
          </div>

          {/* Attendance Overview Card */}
          <div className="bg-white rounded-2xl p-4 shadow-md mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-500 mb-1">{formattedDate}</p>
                <p className="text-2xl text-gray-900">{attendancePercentage}%</p>
                <p className="text-sm text-gray-600">Overall Attendance</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white text-xl">{presentCount}/{markedCount}</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${attendancePercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Period-by-Period Attendance */}
          <div className="space-y-2">
            {isFullDayOff ? (
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 shadow-sm text-center border-2 border-red-200">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-gray-900 mb-2">
                  {isHoliday ? 'Holiday' : 'College Closed'}
                </h3>
                <p className="text-sm text-gray-600">
                  {isHoliday 
                    ? 'No classes scheduled today. Enjoy your holiday!' 
                    : 'The college is closed today.'}
                </p>
              </div>
            ) : attendance.length === 0 ? (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 shadow-sm text-center border-2 border-blue-200">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ClipboardCheck className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-gray-900 mb-2">No Classes Scheduled</h3>
                <p className="text-sm text-gray-600">
                  You don't have any classes scheduled for your session today.
                </p>
              </div>
            ) : (
              attendance.map((item, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${getAttendanceColor(item.status)}`}>
                      <span className="text-sm">{item.period}</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-800">{item.subject}</p>
                      <p className="text-xs text-gray-900">
                        {item.faculty} • {item.time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        item.status === 'present'
                          ? 'bg-green-100 text-green-700'
                          : item.status === 'absent'
                          ? 'bg-red-100 text-red-700'
                          : item.status === 'holiday'
                          ? 'bg-red-100 text-red-700'
                          : item.status === 'blocked'
                          ? 'bg-orange-100 text-orange-700'
                          : item.status === 'closed'
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {item.status === 'present' 
                        ? 'Present' 
                        : item.status === 'absent' 
                        ? 'Absent' 
                        : item.status === 'holiday'
                        ? 'Holiday'
                        : item.status === 'blocked'
                        ? 'Blocked'
                        : item.status === 'closed'
                        ? 'Closed'
                        : 'Unmarked'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around py-3 px-4 max-w-md mx-auto">
          {/* Complaint Box */}
          <button
            onClick={() => setCurrentPage('complaints')}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors relative"
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-blue-100 transition-all">
              <MessageSquareWarning className="w-5 h-5" />
            </div>
            <span className="text-xs">Complaints</span>
            {/* Notification Badge - Only show if there are admin replies */}
            {hasComplaintReplies && (
              <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div>
            )}
          </button>

          {/* Home */}
          <button
            onClick={() => {
              setActiveNav('home');
              setCurrentPage('home');
            }}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeNav === 'home' ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                activeNav === 'home' ? 'bg-blue-100' : ''
              }`}
            >
              <House className="w-5 h-5" />
            </div>
            <span className="text-xs">Home</span>
          </button>

          {/* Permissions */}
          <button
            onClick={() => setCurrentPage('permissions')}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors relative"
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-blue-100 transition-all">
              <FileCheck className="w-5 h-5" />
            </div>
            <span className="text-xs">Permissions</span>
          </button>
        </div>
      </div>

      {/* Notice Modal */}
      {selectedNotice && (
        <NoticeModal notice={selectedNotice} onClose={() => setSelectedNotice(null)} />
      )}
    </div>
  );
}
