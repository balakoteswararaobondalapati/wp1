import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { normalizeDepartmentName, isMorningSession } from '@/app/utils/departmentUtils';
import { attendanceAPI, authAPI, timetableAPI } from '../api';
import { appStorage } from './';
import { resolveHolidayBlock } from '../utils/holidayUtils';
import { getLocalDateISO } from '../utils/date';

interface MonthlyAttendanceCalendarProps {
  onBack: () => void;
}

interface Period {
  periodNumber: number;
  subject: string;
  faculty: string;  
  status: 'present' | 'absent' | 'blocked';
}

interface DateAttendance {
  date: number;
  status: 'present' | 'absent' | 'partial' | 'holiday' | null;
  periods: Period[];
}

export function MonthlyAttendanceCalendar({ onBack }: MonthlyAttendanceCalendarProps) {
  // Get current date for default display
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<DateAttendance | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh when needed
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);
  const [timetableRows, setTimetableRows] = useState<any[]>([]);
  const [studentInfo, setStudentInfo] = useState({
    rollNumber: '',
    course: 'BCA',
    section: 'B1',
    semester: '1',
    department: 'BCA',
  });

  // Listen for appStorage changes to refresh calendar when admin updates holidays
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'holiday_attendance_data') {
        // Force refresh by updating the key
        setRefreshKey(prev => prev + 1);
      }
    };

    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events within the same tab
    const handleCustomStorageChange = () => {
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('holidayDataUpdated', handleCustomStorageChange);
    
    // Listen for attendance updates
    const handleAttendanceUpdate = () => {
      console.log('🔔 [MonthlyAttendanceCalendar] Received attendanceUpdated event! Refreshing calendar...');
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('holidayDataUpdated', handleCustomStorageChange);
      window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
    };
  }, []);

  // Load attendance + timetable from backend
  useEffect(() => {
    const load = async () => {
      try {
        const me = await authAPI.me();
        const course = me.course || me.department || 'BCA';
        const section = me.section || 'B1';
        const semester = String(me.semester || '1');
        const rollNumber = me.roll_number || me.register_number || me.username || '';
        const department = normalizeDepartmentName(me.department || me.course || course);
        setStudentInfo({ rollNumber, course, section, semester, department });

        const [attendance, timetable] = await Promise.all([
          attendanceAPI.getAll(),
          timetableAPI.getAll({ course, section, semester }),
        ]);
        setAttendanceRows(Array.isArray(attendance) ? attendance : []);
        setTimetableRows(Array.isArray(timetable) ? timetable : []);
      } catch (error) {
        console.error('Failed to load monthly attendance data from backend:', error);
        setAttendanceRows([]);
        setTimetableRows([]);
      }
    };

    void load();

    const handleAttendanceUpdate = () => {
      void load();
    };
    const handleTimetableUpdate = () => {
      void load();
    };

    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);
    window.addEventListener('timetableUpdated', handleTimetableUpdate);
    return () => {
      window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
      window.removeEventListener('timetableUpdated', handleTimetableUpdate);
    };
  }, []);

  // Calendar days array - needed for timetable lookup
  const calendarDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const attendanceTimeMap: Record<string, string> = {
    P1: '9:00–10:00',
    P2: '10:00–11:00',
    P3: '11:00–12:00',
    P4: '12:00–1:00',
    P5: '2:00–3:00',
  };

  // Generate attendance data for the month
  const generateMonthData = React.useCallback((year: number, month: number): DateAttendance[] => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const data: DateAttendance[] = [];
    
    // Load holiday data from appStorage
    const studentRollNumber = studentInfo.rollNumber || '';
    const studentDepartment = studentInfo.department || studentInfo.course || 'BCA';
    const studentSection = studentInfo.section || 'B1';
    const studentSemester = studentInfo.semester || '1';

    const attendanceRecords = (attendanceRows || []).filter(
      (record: any) => String(record.student_roll_number || '') === String(studentRollNumber || ''),
    );

    console.log('🎓 [MonthlyAttendanceCalendar] Student Info:', {
      rollNumber: studentRollNumber,
      department: studentDepartment,
      section: studentSection,
      semester: studentSemester,
      totalAttendanceRecords: attendanceRecords.length
    });

    // Determine which session the student belongs to
    const isMorningStudent = isMorningSession(studentDepartment);
    
    const apiDayToDay: Record<string, string> = {
      Monday: 'Mon',
      Tuesday: 'Tue',
      Wednesday: 'Wed',
      Thursday: 'Thu',
      Friday: 'Fri',
      Saturday: 'Sat',
    };

    const studentTimetable: Record<string, Array<{ periodNumber: number; subject: string; faculty: string }>> = {};
    (timetableRows || []).forEach((row: any) => {
      const day = apiDayToDay[row.day_of_week] || row.day_of_week?.slice(0, 3) || 'Mon';
      if (!studentTimetable[day]) studentTimetable[day] = [];
      studentTimetable[day].push({
        periodNumber: Number(row.period_number),
        subject: row.subject || '',
        faculty: row.faculty_name || '',
      });
    });
    Object.keys(studentTimetable).forEach((day) => {
      studentTimetable[day].sort((a, b) => a.periodNumber - b.periodNumber);
    });

    for (let i = 1; i <= daysInMonth; i++) {
      const dayOfWeek = new Date(year, month, i).getDay();
      
      // Format date to YYYY-MM-DD for lookup (using padded values for consistency)
      const dateObj = new Date(year, month, i);
      const currentDate = getLocalDateISO(dateObj);
      const dayHolidayData = resolveHolidayBlock(currentDate, {
        course: studentDepartment,
        section: studentSection,
        semester: studentSemester,
      });
      
      // Sunday = 0, so mark as holiday
      if (dayOfWeek === 0) {
        data.push({ date: i, status: 'holiday', periods: [] });
        continue;
      }
      
      // Check if this date has holiday data (locked or not locked for real-time updates)
      if (dayHolidayData) {
        // If it's marked as holiday or closed (regardless of lock status for display purposes)
        if (dayHolidayData.isHoliday || dayHolidayData.isClosed) {
          data.push({ date: i, status: 'holiday', periods: [] });
          continue;
        }
        
        // Check for partial blocks (blocked periods)
        const sessionType = isMorningStudent ? 'morning' : 'afternoon';
        let blockedCount = 0;
        
        if (dayHolidayData.sessions?.[sessionType]) {
          dayHolidayData.sessions[sessionType].forEach((period: any) => {
            if (period.isBlocked) {
              blockedCount++;
            }
          });
        }
        
        // If all 5 periods are blocked, show as partial holiday
        if (blockedCount === 5) {
          data.push({ date: i, status: 'partial', periods: [] });
          continue;
        }
      }
      
      const dayAttendanceRecords = attendanceRecords.filter((record: any) => record.date === currentDate);
      // Only mark days that actually have attendance records.
      if (dayAttendanceRecords.length === 0) {
        data.push({ date: i, status: null, periods: [] });
        continue;
      }

      // Get the day name for timetable lookup (optional metadata source).
      const dayName = calendarDays[dayOfWeek];
      const daySchedule = studentTimetable[dayName] || [];
      const dayScheduleMap = new Map(daySchedule.map((p) => [p.periodNumber, p]));

      // Generate periods based on attendance records first, then enrich from timetable.
      const periods: Period[] = [];
      let presentCount = 0;
      let totalNonBlockedPeriods = 0;

      const candidatePeriods = new Set<number>();
      dayAttendanceRecords.forEach((record: any) => {
        const p = Number(record.period_number);
        if (Number.isFinite(p) && p > 0) candidatePeriods.add(p);
      });
      daySchedule.forEach((row) => {
        const p = Number(row.periodNumber);
        if (Number.isFinite(p) && p > 0) candidatePeriods.add(p);
      });

      const sortedPeriods = Array.from(candidatePeriods).sort((a, b) => a - b);

      for (const p of sortedPeriods) {
        const periodRecord = dayAttendanceRecords.find((record: any) =>
          record.date === currentDate &&
          Number(record.period_number) === Number(p) &&
          String(record.student_roll_number || '') === String(studentRollNumber || '')
        );

        // If we don't even have attendance and timetable for this period, skip it.
        if (!periodRecord && !dayScheduleMap.get(p)) {
          continue;
        }

        const periodIndex = p - 1;
        const sessionType = isMorningStudent ? 'morning' : 'afternoon';
        const periodData = p <= 5 ? dayHolidayData?.sessions?.[sessionType]?.[periodIndex] : null;
        const isBlocked = periodData?.isBlocked || false;

        if (isBlocked) {
          periods.push({
            periodNumber: p,
            subject: '',
            faculty: '',
            status: 'blocked',
          });
          continue;
        }

        if (!periodRecord) {
          const matchingDate = dayAttendanceRecords.filter((r: any) => r.date === currentDate);
          if (matchingDate.length > 0) {
            console.log(`No record for ${currentDate} P${p}, but found records for this date:`, {
              looking: { date: currentDate, period: `P${p}`, rollNumber: studentRollNumber },
              available: matchingDate.map((r: any) => ({
                period: r.period_number,
                rollNumber: r.student_roll_number,
              }))
            });
          }
        }

        let status: 'present' | 'absent';
        if (periodRecord) {
          status = periodRecord.status === 'present' ? 'present' : 'absent';
        } else {
          status = 'absent';
        }

        if (status === 'present') {
          presentCount++;
        }
        totalNonBlockedPeriods++;

        periods.push({
          periodNumber: p,
          subject: dayScheduleMap.get(p)?.subject || String(periodRecord?.subject || ''),
          faculty: dayScheduleMap.get(p)?.faculty || '',
          status,
        });
      }
      // Determine day status based on attendance:
      // All present (5/5 or all non-blocked) = 'present' (green)
      // All absent (0/5) = 'absent' (red)
      // Mixed = 'partial' (orange)
      let dayStatus: 'present' | 'absent' | 'partial';
      
      if (totalNonBlockedPeriods === 0) {
        // All periods blocked
        dayStatus = 'partial';
      } else if (presentCount === totalNonBlockedPeriods && totalNonBlockedPeriods > 0) {
        dayStatus = 'present';
      } else if (presentCount === 0) {
        dayStatus = 'absent';
      } else {
        dayStatus = 'partial';
      }
      
      data.push({ date: i, status: dayStatus, periods });
    }

    return data;
  }, [attendanceRows, timetableRows, studentInfo]); // Regenerate when backend data changes

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  // Use useMemo to regenerate month data when refreshKey changes
  const monthData = React.useMemo(() => {
    console.log('🔄 Regenerating month data due to refreshKey:', refreshKey);
    return generateMonthData(year, month);
  }, [year, month, refreshKey, generateMonthData]);

  // Get today's date for highlighting
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  const isCurrentMonth = year === todayYear && month === todayMonth;

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // Month names
  const monthNames = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleDateClick = (dateData: DateAttendance) => {
    if (dateData.status !== null) {
      console.log('📅 Date clicked:', {
        date: dateData.date,
        status: dateData.status,
        periods: dateData.periods
      });
      setSelectedDate(dateData);
    }
  };

  const closePopup = () => {
    setSelectedDate(null);
  };

  // Create calendar grid
  const emptySlots = Array(firstDayOfMonth).fill(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 font-['Poppins',sans-serif] flex flex-col">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-blue-600 to-blue-600 px-4 py-4 flex items-center gap-3 shadow-md">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors active:scale-95"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h2 className="text-white">Monthly Attendance</h2>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 flex items-center justify-center">
        <div className="w-full max-w-5xl">
          {/* Month Selector */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 mb-6">
            <button
              onClick={handlePrevMonth}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white hover:bg-gray-50 shadow-md flex items-center justify-center transition-all active:scale-95"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>

            <h2 className="text-gray-900 text-xl sm:text-2xl min-w-[180px] text-center font-semibold">
              {monthNames[month]} {year}
            </h2>

            <button
              onClick={handleNextMonth}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white hover:bg-gray-50 shadow-md flex items-center justify-center transition-all active:scale-95"
            >
              <ChevronRight className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          {/* Calendar Container */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-lg">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Day Headers - Fixed with proper spacing and alignment */}
              {calendarDays.map((day) => (
                <div 
                  key={day} 
                  className="text-center py-2 sm:py-3"
                  style={{ letterSpacing: '0.02em' }}
                >
                  <span className="text-xs sm:text-sm font-semibold text-gray-700">
                    {day}
                  </span>
                </div>
              ))}

              {/* Empty slots for first week */}
              {emptySlots.map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {/* Date cells */}
              {monthData.map((dateData) => {
                const isToday = isCurrentMonth && dateData.date === todayDate;
                return (
                  <button
                    key={dateData.date}
                    onClick={() => handleDateClick(dateData)}
                    className={`aspect-square rounded-lg sm:rounded-xl border-2 flex flex-col items-center justify-center gap-1 sm:gap-2 transition-all relative ${
                      isToday
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300'
                        : dateData.status === 'holiday'
                        ? 'border-gray-200 bg-gray-50 cursor-default'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-md active:scale-95 cursor-pointer'
                    }`}
                  >
                    <span className={`text-xs sm:text-sm font-medium ${
                      isToday 
                        ? 'text-blue-700 font-bold' 
                        : dateData.status === 'holiday' 
                        ? 'text-gray-400' 
                        : 'text-gray-700'
                    }`}>
                      {dateData.date}
                    </span>

                    {/* Attendance Indicator */}
                    {dateData.status === 'present' && (
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full shadow-sm" />
                    )}
                    {dateData.status === 'absent' && (
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full shadow-sm" />
                    )}
                    {dateData.status === 'partial' && (
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full shadow-sm" />
                    )}
                    {dateData.status === 'holiday' && (
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gray-300 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend - Fixed for proper alignment and no overflow */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700 whitespace-nowrap">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700 whitespace-nowrap">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-sm flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700 whitespace-nowrap">Partial</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 rounded-full flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700 whitespace-nowrap">Holiday</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date Detail Popup */}
      {selectedDate && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-fade-in"
            onClick={closePopup}
          />

          {/* Popup Content */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 pointer-events-auto animate-scale-in border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={closePopup}
                  className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors active:scale-95"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              {/* Content */}
              <div className="text-center space-y-4">
                {/* Date */}
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date</p>
                  <h3 className="text-gray-900">
                    {selectedDate.date} {monthNames[month]} {year}
                  </h3>
                </div>

                {/* Status */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-3">Attendance Status</p>
                  <div className="flex items-center justify-center gap-3">
                    {selectedDate.status === 'present' && (
                      <>
                        <div className="w-4 h-4 bg-green-500 rounded-full" />
                        <span className="text-green-600">Present</span>
                      </>
                    )}
                    {selectedDate.status === 'absent' && (
                      <>
                        <div className="w-4 h-4 bg-red-500 rounded-full" />
                        <span className="text-red-600">Absent</span>
                      </>
                    )}
                    {selectedDate.status === 'partial' && (
                      <>
                        <div className="w-4 h-4 bg-yellow-500 rounded-full" />
                        <span className="text-yellow-600">Partial</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Periods */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-3">Period-wise Attendance</p>
                  {selectedDate.periods.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">
                        {selectedDate.status === 'holiday' 
                          ? 'Holiday - No classes scheduled'
                          : selectedDate.status === 'partial'
                          ? 'All periods were blocked by admin'
                          : 'No period data available'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedDate.periods.map((period) => (
                        <div
                          key={period.periodNumber}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-lg border-2 text-left ${
                            period.status === 'blocked'
                              ? 'bg-orange-50 border-orange-200'
                              : period.status === 'present'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                              <span className="text-xs text-gray-700">P{period.periodNumber}</span>
                            </div>
                            <div>
                              {period.status === 'blocked' ? (
                                <>
                                  <p className="text-sm text-orange-700 font-medium">Blocked by Admin</p>
                                  <p className="text-xs text-orange-600">{attendanceTimeMap[`P${period.periodNumber}`]}</p>
                                </>
                              ) : (
                                <>
                                  <p className="text-sm text-gray-900">{period.subject}</p>
                                  <p className="text-xs text-gray-600">{period.faculty} • {attendanceTimeMap[`P${period.periodNumber}`]}</p>
                                </>
                              )}
                            </div>
                          </div>
                          <div
                            className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              period.status === 'blocked' 
                                ? 'bg-orange-500' 
                                : period.status === 'present' 
                                ? 'bg-green-500' 
                                : 'bg-red-500'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

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
            transform: scale(0.95);
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
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

