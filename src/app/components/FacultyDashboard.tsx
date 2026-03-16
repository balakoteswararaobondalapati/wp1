import React, { useState, useEffect } from 'react';
import { Calendar, FileText, House, ClipboardCheck, Users, User, BookOpen, Upload, Bell, Plus, Radio, Ban, X, Info } from 'lucide-react';
import { ProfileAvatar } from './ProfileAvatar';
import { NoticeBoardPage } from './NoticeBoardPage';
import { FacultyTimetablePage } from './FacultyTimetablePage';
import { FacultyProfilePage } from './FacultyProfilePage';
import { NoticeModal, Notice } from './NoticeModal';
import { useNotices } from '../context/NoticesContext';
import { getTodayStatus, isPeriodBlocked, canAccessAttendance } from '../utils/holidayUtils';
import { getLocalDateISO } from '../utils/date';
import { AddMaterialsPage } from './AddMaterialsPage';
import { AddAttendancePage } from './AddAttendancePage';
import { appStorage } from './';
import { facultyStatusAPI, timetableAPI } from '../api';

interface FacultyDashboardProps {
  onLogout: () => void;
}

type NavItem = 'timetable' | 'home' | 'attendance';
type Page = 'home' | 'noticeboard' | 'timetable' | 'add-materials' | 'add-attendance' | 'profile';

interface ScheduleItem {
  period: string;
  subject: string;
  class: string;
  time: string;
  room: string;
}

const normalizeFacultyKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

export function FacultyDashboard({ onLogout }: FacultyDashboardProps) {
  const [activeNav, setActiveNav] = useState<NavItem>('home');
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [activePeriod, setActivePeriod] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] = useState<ScheduleItem | null>(null);
  const [markedPeriods, setMarkedPeriods] = useState<Set<string>>(new Set());
  const [disabledPeriods, setDisabledPeriods] = useState<Set<string>>(new Set());
  const [completedPeriods, setCompletedPeriods] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0); // For force refresh
  const [todaysSchedule, setTodaysSchedule] = useState<ScheduleItem[]>([]); // Dynamic schedule from faculty timetable
  const [isBlockedToday, setIsBlockedToday] = useState(false); // Check if faculty is blocked for today
  const { notices, loadNotices } = useNotices();

  // Load faculty notices on mount
  useEffect(() => {
    console.log('👨‍🏫 FacultyDashboard: Loading faculty notices');
    loadNotices('faculty');
  }, []);

  // Get faculty info from appStorage
  const getFacultyInfo = () => {
    const currentUser = appStorage.getItem('current_user');
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        return {
          employeeId: user.userId || user.employeeId || 'EMPFAC001',
          name: user.name || 'Faculty'
        };
      } catch (error) {
        console.error('Error loading faculty info:', error);
      }
    }
    return { employeeId: 'EMPFAC001', name: 'Faculty' };
  };

  const facultyInfo = getFacultyInfo();
  const facultyId = facultyInfo.employeeId;
  const facultyName = facultyInfo.name;

  // Check for inactive faculty assignment
  const [inactiveFacultyAssignment, setInactiveFacultyAssignment] = useState<any | null>(null);

  useEffect(() => {
    // Check if current faculty has an inactive faculty assignment
    try {
      const assignments = JSON.parse(appStorage.getItem('inactive_faculty_assignments') || '[]');
      const currentAssignment = assignments.find(
        (assignment: any) => assignment.employeeId === facultyId || assignment.facultyId === facultyId
      );
      setInactiveFacultyAssignment(currentAssignment || null);
      console.log('📋 Inactive faculty assignment:', currentAssignment);
    } catch (error) {
      console.error('Error loading inactive faculty assignment:', error);
    }
  }, [facultyId]);

  // Function to get faculty schedule for today
  const loadFacultyScheduleForToday = async () => {
    try {
      const apiDaysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const apiToday = new Date();
      const apiCurrentDay = apiDaysOfWeek[apiToday.getDay()];
      const todayIso = getLocalDateISO(apiToday);
      const apiScheduleMap = new Map<number, ScheduleItem>();
      const rows = await timetableAPI.getAll();
      (rows || []).forEach((row: any) => {
        const rowDay = String(row.day_of_week || '').slice(0, 3);
        const rowFaculty = normalizeFacultyKey(String(row.faculty_name || ''));
        if (rowDay === apiCurrentDay && rowFaculty === normalizeFacultyKey(facultyName) && row.subject) {
          apiScheduleMap.set(Number(row.period_number), {
            period: `P${Number(row.period_number)}`,
            subject: row.subject,
            class: `${row.course} ${row.section} - Sem ${row.semester}`,
            time: row.time || '-',
            room: row.room || '-',
          });
        }
      });

      // Merge date-specific overrides saved by admin "Today's Schedule".
      try {
        const raw = appStorage.getItem('faculty_date_schedules');
        const allDateSchedules = raw ? JSON.parse(raw) : {};
        const matchingKey = Object.keys(allDateSchedules).find(
          (key) => normalizeFacultyKey(key) === normalizeFacultyKey(facultyName),
        );
        const dateSpecificSchedule = matchingKey ? (allDateSchedules[matchingKey]?.[todayIso] || []) : [];
        (dateSpecificSchedule || []).forEach((period: any) => {
          const periodNumber = Number(period.periodNumber);
          if (!Number.isFinite(periodNumber)) return;
          apiScheduleMap.set(periodNumber, {
            period: `P${periodNumber}`,
            subject: String(period.subject || ''),
            class: String(period.class || '-'),
            time: String(period.time || '-'),
            room: String(period.room || '-'),
          });
        });
      } catch (error) {
        console.error('Error merging date-specific faculty schedules:', error);
      }

      const apiFinalSchedule = Array.from(apiScheduleMap.values()).sort((a, b) => {
        const periodA = parseInt(a.period.replace('P', ''));
        const periodB = parseInt(b.period.replace('P', ''));
        return periodA - periodB;
      });
      setTodaysSchedule(apiFinalSchedule);
    } catch (error) {
      console.error('Error loading faculty schedule:', error);
      setTodaysSchedule([]);
    }
  };

  // Load schedule on mount and when timetable updates
  useEffect(() => {
    loadFacultyScheduleForToday();
    
    // Listen for timetable updates
    const handleTimetableUpdate = () => {
      console.log('📅 Timetable updated, reloading faculty schedule');
      loadFacultyScheduleForToday();
    };

    window.addEventListener('timetableUpdated', handleTimetableUpdate);
    window.addEventListener('facultyScheduleUpdated', handleTimetableUpdate);

    return () => {
      window.removeEventListener('timetableUpdated', handleTimetableUpdate);
      window.removeEventListener('facultyScheduleUpdated', handleTimetableUpdate);
    };
  }, [facultyName]); // Reload when faculty name changes

  // Track date changes and reload schedule when date changes (e.g., at midnight)
  useEffect(() => {
    let currentDate = getLocalDateISO();
    
    // Check every minute if the date has changed
    const intervalId = setInterval(() => {
      const newDate = getLocalDateISO();
      if (newDate !== currentDate) {
        console.log(`📅 Date changed from ${currentDate} to ${newDate}, reloading schedule`);
        currentDate = newDate;
        loadFacultyScheduleForToday();
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [facultyName]);

  // Listen for holiday data updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'holiday_attendance_data') {
        setRefreshKey((prev) => prev + 1);
      }
    };

    const handleCustomStorageChange = () => {
      setRefreshKey((prev) => prev + 1);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('holidayDataUpdated', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('holidayDataUpdated', handleCustomStorageChange);
    };
  }, []);

  // Check if faculty is blocked for today from DB faculty-status.
  useEffect(() => {
    const checkBlockStatus = async () => {
      try {
        const todayIso = getLocalDateISO();
        const rows = await facultyStatusAPI.getByDate(todayIso);
        const myRow = (rows || []).find(
          (r: any) =>
            String(r.employee_id || '') === String(facultyInfo.employeeId || '') ||
            String(r.faculty_name || '').trim().toLowerCase() === String(facultyName).trim().toLowerCase(),
        );
        const blocked = Boolean(myRow && ['blocked', 'absent', 'leave'].includes(String(myRow.status || '').toLowerCase()));
        setIsBlockedToday(blocked);
      } catch (error) {
        console.error('Error checking block status:', error);
        setIsBlockedToday(false);
      }
    };

    const handleAttendanceRefresh = () => {
      void checkBlockStatus();
    };

    void checkBlockStatus();
    window.addEventListener('facultyBlockUpdated', handleAttendanceRefresh);
    window.addEventListener('facultyAttendanceUpdated', handleAttendanceRefresh);

    return () => {
      window.removeEventListener('facultyBlockUpdated', handleAttendanceRefresh);
      window.removeEventListener('facultyAttendanceUpdated', handleAttendanceRefresh);
    };
  }, [facultyInfo.employeeId, facultyName]);

  if (currentPage === 'noticeboard') {
    return <NoticeBoardPage onBack={() => setCurrentPage('home')} theme="red" />;
  }

  if (currentPage === 'timetable') {
    return <FacultyTimetablePage onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'profile') {
    return <FacultyProfilePage onBack={() => setCurrentPage('home')} onLogout={onLogout} />;
  }

  if (currentPage === 'add-materials') {
    return <AddMaterialsPage onBack={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'add-attendance') {
    return (
      <AddAttendancePage
        onBack={() => {
          setCurrentPage('home');
          setAttendanceData(null);
        }}
        autoFillData={attendanceData}
        onAttendanceMarked={(periodId) => {
          setMarkedPeriods((prev) => new Set(prev).add(periodId));
        }}
      />
    );
  }

  const todayStatus = getTodayStatus();
  const accessStatus = canAccessAttendance();
  const filteredSchedule = todaysSchedule.filter((item) => {
    if (item.subject === 'Free Period') return true;
    if (!accessStatus.allowed) return false;
    const periodNum = parseInt(item.period.replace('P', ''));
    if (periodNum <= 3) return !isPeriodBlocked('morning', periodNum);
    return !isPeriodBlocked('afternoon', periodNum - 3);
  });

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const handleNavClick = (nav: NavItem) => {
    setActiveNav(nav);
    if (nav === 'home') {
      setCurrentPage('home');
    } else if (nav === 'timetable') {
      setCurrentPage('timetable');
    } else if (nav === 'attendance') {
      // For now, stay on home. Can be extended later.
      setCurrentPage('home');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-red-50 pb-20 font-['Poppins',sans-serif]">
      {/* Header with Profile Avatar - Light Red Background */}
      <div className="bg-gradient-to-r from-red-400 to-red-400 shadow-md sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          {/* Left: Greeting */}
          <div>
            <h1 className="text-white text-lg">Hello, {facultyName}</h1>
            <p className="text-sm text-red-50">Welcome to your Dashboard</p>
          </div>

          {/*  Profile Avatar */}
          <div className="flex items-center gap-3">
           

            {/* Profile Avatar */}
            <ProfileAvatar
              userName={facultyName}
              onClick={() => setCurrentPage('profile')}
              themeColor="red"
              className="border-white"
            />
          </div>
        </div>

        {/* Red bottom border */}
        <div className="h-1 bg-red-600"></div>
      </div>

      {/* Main Content */}
      <div className="px-4 pt-4 pb-24 space-y-4">
        
        {/* Notice Board Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-gray-900">Notice Board</h2>
            <button
              onClick={() => setCurrentPage('noticeboard')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </button>
          </div>

          {/* Horizontal Scrollable Notice Cards */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
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

        {/* Quick Actions Section */}
        <div>
          <h2 className="text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Add Materials Card */}
            <button
              onClick={() => setCurrentPage('add-materials')}
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:border-green-300 transition-all active:scale-98 flex flex-col items-center gap-3"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-md">
                <Upload className="w-7 h-7 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-800">Add Materials</span>
            </button>
               {/*Timetable */}
         {/* Time Table Card */}
<button
  onClick={() => {
    setActiveNav('timetable');
    setCurrentPage('timetable');
  }}
  className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:border-red-300 transition-all active:scale-98 flex flex-col items-center gap-3"
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
  <span className="text-sm font-medium text-gray-800">Time Table</span>
</button>

            
          </div>
        </div>

        {/* Today's Schedule Section */}
        <div>
          <div className="mb-3">
            <h2 className="text-gray-900">Today's Schedule</h2>
            <p className="text-xs text-gray-500">{formattedDate}</p>
          </div>

          {/* Inactive Faculty Assignment Card */}
          {inactiveFacultyAssignment && (
            <div className="mb-3 p-5 rounded-2xl bg-purple-50 border-2 border-purple-300 shadow-md">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-6 h-6 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">✨ Special Assignment</h3>
                </div>
              </div>
              <p className="text-sm text-purple-800 mb-3">
                You have been assigned to take attendance for a specific class:
              </p>
              <div className="bg-white border-2 border-purple-200 rounded-xl p-4 mb-3">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Course</p>
                    <p className="font-semibold text-purple-900">{inactiveFacultyAssignment.course}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Section</p>
                    <p className="font-semibold text-purple-900">{inactiveFacultyAssignment.section}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Semester</p>
                    <p className="font-semibold text-purple-900">Sem {inactiveFacultyAssignment.semester}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  // Create attendance data for the assigned class
                  const assignmentData = {
                    period: 'Special',
                    subject: 'Assigned Class',
                    class: `${inactiveFacultyAssignment.course} ${inactiveFacultyAssignment.section} - Sem ${inactiveFacultyAssignment.semester}`,
                    time: '',
                    room: ''
                  };
                  setAttendanceData(assignmentData);
                  setCurrentPage('add-attendance');
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 font-medium"
              >
                <ClipboardCheck className="w-5 h-5" />
                Take Attendance
              </button>
            </div>
          )}

          {/* Info Banner - Schedule synced from Faculty Teaching Schedule */}
          {todaysSchedule.length > 0 && (
            <div className="mb-3 p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-blue-800">
                <strong>Auto-synced:</strong> Your schedule is automatically loaded from the Faculty Teaching Schedule in the admin portal. Any changes made there will reflect here instantly.
              </p>
            </div>
          )}

          {/* Holiday/Closed Banner */}
          {!accessStatus.allowed && (
            <div className={`mb-3 p-4 rounded-2xl border-2 flex items-center gap-3 ${
              todayStatus.isHoliday 
                ? 'bg-red-50 border-red-300' 
                : 'bg-gray-100 border-gray-300'
            }`}>
              {todayStatus.isHoliday ? (
                <Ban className="w-10 h-10 text-red-600 flex-shrink-0" />
              ) : (
                <X className="w-10 h-10 text-gray-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${
                  todayStatus.isHoliday ? 'text-red-900' : 'text-gray-900'
                }`}>
                  {todayStatus.isHoliday ? '🎉 Holiday' : 'College Closed'}
                </h3>
                <p className="text-sm text-gray-600">
                  {todayStatus.isHoliday 
                    ? 'No classes scheduled for today. Enjoy your holiday!' 
                    : 'The college is closed today. No attendance required.'}
                </p>
              </div>
            </div>
          )}

          {/* Partial Block Info */}
          {accessStatus.allowed && (todayStatus.hasBlockedMorning || todayStatus.hasBlockedAfternoon) && filteredSchedule.length < todaysSchedule.length && (
            <div className="mb-3 p-3 rounded-2xl bg-orange-50 border border-orange-300 flex items-center gap-2">
              <Ban className="w-6 h-6 text-orange-600 flex-shrink-0" />
              <p className="text-sm text-orange-800">
                <strong>Note:</strong> Some periods have been blocked by admin and are hidden from the schedule.
              </p>
            </div>
          )}

          {/* Faculty Blocked Warning Banner */}
          {isBlockedToday && (
            <div className="mb-3 p-4 rounded-2xl bg-red-50 border-2 border-red-300 flex items-center gap-3">
              <Ban className="w-10 h-10 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1 text-red-900">
                  ⚠️ Attendance Blocked
                </h3>
                <p className="text-sm text-red-800">
                  You have been blocked from marking attendance today by the admin. Please contact the administration for more details.
                </p>
              </div>
            </div>
          )}

          {/* Period Cards - Vertical List */}
          <div className="space-y-3">
            {filteredSchedule.length === 0 ? (
              // Empty state when no schedule
              <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <h3 className="text-gray-700 font-semibold mb-2">No Classes Today</h3>
                <p className="text-sm text-gray-500">
                  {todaysSchedule.length === 0 
                    ? "You don't have any classes scheduled for today. Check your timetable for more details."
                    : "All periods for today have been blocked."}
                </p>
              </div>
            ) : (
              filteredSchedule.map((period, index) => {
                const isFree = period.subject === 'Free Period';
                const isActive = activePeriod === period.period;
                const isMarked = markedPeriods.has(period.period);
                const isDisabled = disabledPeriods.has(period.period);
                const isCompleted = completedPeriods.has(period.period);
                const showCompletedButton = isMarked && !isCompleted;
                
                // Check if this period can be activated
                // First period (P1) or first non-free period can always be activated
                // Other periods can only be activated if the previous period is completed
                const previousPeriod = index > 0 ? filteredSchedule[index - 1] : null;
                const canActivate = index === 0 || 
                                    !previousPeriod || 
                                    previousPeriod.subject === 'Free Period' ||
                                    completedPeriods.has(previousPeriod.period);
                
                return (
                  <div
                    key={index}
                    className={`bg-white border rounded-2xl p-4 shadow-sm ${
                      isFree ? 'border-gray-200 opacity-60' : 'border-gray-200 hover:shadow-md transition-shadow'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Period Badge */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-white shadow-md flex-shrink-0 ${
                        isFree ? 'bg-gray-400' : isMarked ? 'bg-green-500' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                      }`}>
                        {period.period}
                      </div>

                      {/* Period Details */}
                      <div className="flex-1">
                        <h3 className={`text-sm font-semibold mb-1 ${isFree ? 'text-gray-500' : 'text-gray-900'}`}>
                          {period.subject}
                        </h3>
                        {!isFree && (
                          <>
                            <p className="text-xs text-gray-600 mb-1">{period.class}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {period.time}
                              </span>
                              <span>📍 {period.room}</span>
                            </div>
                            {isMarked && (
                              <span className="inline-block mt-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                ✓ Attendance Marked
                              </span>
                            )}
                          </>
                        )}
                        {isFree && (
                          <p className="text-xs text-gray-500">{period.time}</p>
                        )}
                      </div>

                      {/* Action Buttons Container */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Mark as Active Button - Activates the period */}
                        {!isFree && (
                          <button
                            onClick={() => {
                              if (!isActive && !isDisabled && canActivate && !isBlockedToday) {
                                // When activating a new period, disable the previous active period
                                if (activePeriod) {
                                  setDisabledPeriods(prev => new Set(prev).add(activePeriod));
                                }
                                setActivePeriod(period.period);
                              }
                              // Don't allow deactivating - it stays active until next period is activated
                            }}
                            disabled={isDisabled || !canActivate || isBlockedToday}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                              isDisabled || isBlockedToday
                                ? 'bg-gray-300 cursor-not-allowed opacity-50'
                                : !canActivate
                                ? 'bg-gray-200 cursor-not-allowed opacity-50'
                                : isActive
                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg animate-pulse active:scale-95'
                                : 'bg-gray-200 hover:bg-gray-300 active:scale-95'
                            }`}
                            title={
                              isBlockedToday
                                ? 'You are blocked from marking attendance today'
                                : isDisabled
                                ? 'Period Completed'
                                : !canActivate
                                ? 'Complete previous period first'
                                : isActive 
                                ? 'Currently Active Class' 
                                : 'Click to Mark as Active'
                            }
                          >
                            <Radio className={`w-4 h-4 ${isActive || isDisabled ? 'text-white' : 'text-gray-500'}`} />
                          </button>
                        )}
                        
                        {/* Plus Button - Only enabled when period is active and not marked */}
                        <button
                          onClick={() => {
                            if (!isActive || isMarked || isBlockedToday) return;

                            setAttendanceData(period);
                            setCurrentPage('add-attendance');
                          }}
                          disabled={isFree || !isActive || isMarked || isBlockedToday}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                            isFree || !isActive || isMarked || isBlockedToday
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-br from-red-500 to-red-600 hover:shadow-lg text-white shadow-md'
                          }`}
                          title={
                            isBlockedToday
                              ? 'You are blocked from marking attendance today'
                              : isMarked
                              ? 'Attendance already marked'
                              : isActive
                              ? 'Click to Mark Attendance'
                              : 'Activate class first to mark attendance'
                          }
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                        
                        {/* Completed Button - Shows for all periods after attendance is marked */}
                        {!isFree && showCompletedButton && (
                          <button
                            onClick={() => {
                              setCompletedPeriods(prev => new Set(prev).add(period.period));
                              setDisabledPeriods(prev => new Set(prev).add(period.period));
                            }}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-medium shadow-md hover:shadow-lg active:scale-95 transition-all"
                          >
                            Completed
                          </button>
                        )}
                        
                        {/* Completed Button - Grey state after clicked */}
                        {!isFree && isCompleted && (
                          <button
                            disabled
                            className="px-3 py-1.5 rounded-lg bg-gray-300 text-gray-500 text-xs font-medium cursor-not-allowed"
                          >
                            Completed
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-between px-6 py-3 max-w-md mx-auto">
          
          

          
        </div>
      </div>

      {/* Notice Modal */}
      {selectedNotice && (
        <NoticeModal
          notice={selectedNotice}
          onClose={() => setSelectedNotice(null)}
        />
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

