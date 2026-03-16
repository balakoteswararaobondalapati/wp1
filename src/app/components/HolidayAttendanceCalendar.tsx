import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Ban, X, Clock, ArrowLeft, Lock, CheckCircle } from 'lucide-react';
import { appStorage } from './';
import { holidaysAPI } from '../api';
import { getAcademicOptions } from '../utils/academicConfig';

interface PeriodBlock {
  period: number;
  isBlocked: boolean;
}

interface SessionBlock {
  morning: PeriodBlock[];
  afternoon: PeriodBlock[];
}

interface DayData {
  date: string;
  scopeCourse?: string;
  scopeSection?: string;
  scopeSemester?: string;
  isHoliday: boolean;
  isClosed: boolean;
  reason?: string;
  sessions: SessionBlock;
  isLocked: boolean;
}

interface HolidayData {
  [date: string]: DayData;
}

interface HolidayAttendanceCalendarProps {
  onBack?: () => void;
}

interface ApiHoliday {
  id: number;
  date: string;
  title: string;
  description?: string | null;
}

export function HolidayAttendanceCalendar({ onBack }: HolidayAttendanceCalendarProps = {}) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedSession, setSelectedSession] = useState<'morning' | 'afternoon' | null>(null);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState('all');
  
  // Period timings
  const periodTimings = {
    morning: [
      { period: 1, time: '8:00 AM - 8:50 AM' },
      { period: 2, time: '8:50 AM - 9:40 AM' },
      { period: 3, time: '9:40 AM - 10:30 AM' },
      { period: 4, time: '10:40 AM - 11:30 AM', afterBreak: true },
      { period: 5, time: '11:30 AM - 12:20 PM' },
    ],
    afternoon: [
      { period: 1, time: '12:40 PM - 1:30 PM' },
      { period: 2, time: '1:30 PM - 2:20 PM' },
      { period: 3, time: '2:20 PM - 3:10 PM' },
      { period: 4, time: '3:20 PM - 4:10 PM', afterBreak: true },
      { period: 5, time: '4:10 PM - 5:00 PM' },
    ],
  };
  
  const holidayCacheRef = useRef<Record<string, ApiHoliday>>({});
  const [loadedFromApi, setLoadedFromApi] = useState(false);

  const isSundayDate = (dateStr: string) => new Date(dateStr).getDay() === 0;

  const createDefaultDayBlock = (dateStr: string): DayData => ({
    date: dateStr,
    scopeCourse: selectedCourse,
    scopeSection: selectedSection,
    scopeSemester: selectedSemester,
    isHoliday: isSundayDate(dateStr),
    isClosed: false,
    reason: isSundayDate(dateStr) ? 'Sunday Holiday' : '',
    sessions: {
      morning: [
        { period: 1, isBlocked: false },
        { period: 2, isBlocked: false },
        { period: 3, isBlocked: false },
        { period: 4, isBlocked: false },
        { period: 5, isBlocked: false },
      ],
      afternoon: [
        { period: 1, isBlocked: false },
        { period: 2, isBlocked: false },
        { period: 3, isBlocked: false },
        { period: 4, isBlocked: false },
        { period: 5, isBlocked: false },
      ],
    },
    isLocked: false,
  });

  const isNeutralDayBlock = (day: DayData | null | undefined) => {
    if (!day) return true;
    const hasBlockedPeriods =
      day.sessions.morning.some((period) => period.isBlocked) ||
      day.sessions.afternoon.some((period) => period.isBlocked);

    return !day.isHoliday && !day.isClosed && !day.isLocked && !hasBlockedPeriods;
  };

  const getScopeKey = (dateStr: string, course: string, section: string, semester: string) =>
    `${dateStr}|${course}|${section}|${semester}`;

  const getActiveScopeKey = (dateStr: string) =>
    getScopeKey(dateStr, selectedCourse, selectedSection, selectedSemester);

  const getScopedDayData = (dateStr: string, source: HolidayData = holidayData) => {
    const exactKey = getScopeKey(dateStr, selectedCourse, selectedSection, selectedSemester);
    const allScopeKey = getScopeKey(dateStr, 'all', 'all', 'all');
    const resolved = source[exactKey] || source[allScopeKey] || source[dateStr] || null;
    if (resolved && !(isSundayDate(dateStr) && isNeutralDayBlock(resolved))) {
      return resolved;
    }
    return createDefaultDayBlock(dateStr);
  };

  // Load holiday data from appStorage
  const [holidayData, setHolidayData] = useState<HolidayData>(() => {
    const saved = appStorage.getItem('holiday_attendance_data');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    let cancelled = false;
    const loadHolidays = async () => {
      try {
        const rows = (await holidaysAPI.getAll()) as ApiHoliday[];
        if (cancelled) return;
        const cache: Record<string, ApiHoliday> = {};
        rows.forEach((row) => {
          if (row?.date) {
            cache[row.date] = row;
          }
        });
        holidayCacheRef.current = cache;
        setHolidayData((prev) => {
          const next = { ...prev };
          rows.forEach((row) => {
            if (!row?.date) return;
            const title = String(row.title || '').toLowerCase();
            const isClosed = title.includes('closed');
            const globalKey = getScopeKey(row.date, 'all', 'all', 'all');
            const existing = next[globalKey] || next[row.date] || createDefaultDayBlock(row.date);
            next[globalKey] = {
              ...existing,
              scopeCourse: 'all',
              scopeSection: 'all',
              scopeSemester: 'all',
              isHoliday: !isClosed,
              isClosed,
              reason: row.description || existing.reason || (!isClosed && isSundayDate(row.date) ? 'Sunday Holiday' : ''),
            };
          });
          return next;
        });
      } catch (error) {
        console.error('Failed to load holidays from backend:', error);
      } finally {
        if (!cancelled) setLoadedFromApi(true);
      }
    };
    void loadHolidays();
    return () => {
      cancelled = true;
    };
  }, []);

  // Save to appStorage whenever data changes
  useEffect(() => {
    appStorage.setItem('holiday_attendance_data', JSON.stringify(holidayData));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('holidayDataUpdated'));
  }, [holidayData]);

  useEffect(() => {
    if (!loadedFromApi) return;
    const handle = window.setTimeout(async () => {
      const desired: Record<string, { isClosed: boolean }> = {};
      Object.entries(holidayData).forEach(([key, day]) => {
        const isGlobalScope =
          key === day.date ||
          (day.scopeCourse === 'all' && day.scopeSection === 'all' && day.scopeSemester === 'all');
        if (isGlobalScope && (day.isHoliday || day.isClosed)) {
          desired[day.date] = { isClosed: day.isClosed };
        }
      });

      const existing = holidayCacheRef.current;
      const desiredDates = new Set(Object.keys(desired));

      for (const [dateStr, meta] of Object.entries(desired)) {
        const title = meta.isClosed ? 'College Closed' : 'Holiday';
        const source = holidayData[getScopeKey(dateStr, 'all', 'all', 'all')] || holidayData[dateStr];
        const description = source?.reason?.trim() || (meta.isClosed ? 'College closed' : isSundayDate(dateStr) ? 'Sunday Holiday' : 'Holiday');
        const existingRow = existing[dateStr];
        try {
          if (existingRow) {
            if (existingRow.title !== title || (existingRow.description || '') !== description) {
              const updated = (await holidaysAPI.update(existingRow.id, { date: dateStr, title, description })) as ApiHoliday;
              existing[dateStr] = updated;
            }
          } else {
            const created = (await holidaysAPI.create({ date: dateStr, title, description })) as ApiHoliday;
            existing[dateStr] = created;
          }
        } catch (error) {
          console.error('Failed to sync holiday:', dateStr, error);
        }
      }

      for (const [dateStr, row] of Object.entries(existing)) {
        if (!desiredDates.has(dateStr)) {
          try {
            await holidaysAPI.delete(row.id);
            delete existing[dateStr];
          } catch (error) {
            console.error('Failed to delete holiday:', dateStr, error);
          }
        }
      }
    }, 600);

    return () => window.clearTimeout(handle);
  }, [holidayData, loadedFromApi]);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const academicOptions = getAcademicOptions();
  const courseSections = academicOptions.sectionsByDepartment;
  const semesterOptions =
    selectedCourse === 'all'
      ? Array.from(new Set(Object.values(academicOptions.semestersByDepartment).flat()))
      : academicOptions.semestersByDepartment[selectedCourse] || [];
  const sectionOptions =
    selectedCourse === 'all'
      ? Array.from(new Set(Object.values(courseSections).flat()))
      : courseSections[selectedCourse] || [];

  useEffect(() => {
    if (selectedCourse === 'all') {
      setSelectedSection('all');
      return;
    }
    if (!sectionOptions.includes(selectedSection)) {
      setSelectedSection(sectionOptions[0] || 'all');
    }
  }, [selectedCourse, selectedSection, sectionOptions]);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const scopeKey = getActiveScopeKey(dateStr);
    setSelectedDate(dateStr);
    setShowPopup(true);
    setSelectedSession(null);
    
    // Create entry if doesn't exist
    if (!getScopedDayData(dateStr)) {
      setHolidayData(prev => ({
        ...prev,
        [scopeKey]: createDefaultDayBlock(dateStr),
      }));
    }
  };

  const handleConfirm = () => {
    if (!selectedDate) return;
    const scopeKey = getActiveScopeKey(selectedDate);
    
    setHolidayData(prev => {
      const updated = { ...prev };
      const existing = getScopedDayData(selectedDate, updated) || createDefaultDayBlock(selectedDate);
      updated[scopeKey] = {
          ...existing,
          scopeCourse: selectedCourse,
          scopeSection: selectedSection,
          scopeSemester: selectedSemester,
          isLocked: !existing.isLocked,
        };
      return updated;
    });
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedDate(null);
    setSelectedSession(null);
  };

  const toggleHoliday = () => {
    if (!selectedDate) return;
    const scopeKey = getActiveScopeKey(selectedDate);
    
    setHolidayData(prev => {
      const updated = { ...prev };
      const existing = getScopedDayData(selectedDate, updated) || createDefaultDayBlock(selectedDate);
      updated[scopeKey] = {
        ...existing,
        scopeCourse: selectedCourse,
        scopeSection: selectedSection,
        scopeSemester: selectedSemester,
        isHoliday: !existing.isHoliday,
        isClosed: false,
      };
      return updated;
    });
  };

  const toggleCollegeClosed = () => {
    if (!selectedDate) return;
    const scopeKey = getActiveScopeKey(selectedDate);
    
    setHolidayData(prev => {
      const updated = { ...prev };
      const existing = getScopedDayData(selectedDate, updated) || createDefaultDayBlock(selectedDate);
      updated[scopeKey] = {
        ...existing,
        scopeCourse: selectedCourse,
        scopeSection: selectedSection,
        scopeSemester: selectedSemester,
        isClosed: !existing.isClosed,
        isHoliday: false,
        reason: !existing.isClosed ? existing.reason || '' : '',
      };
      return updated;
    });
  };

  const updateReason = (reason: string) => {
    if (!selectedDate) return;
    const scopeKey = getActiveScopeKey(selectedDate);

    setHolidayData(prev => {
      const updated = { ...prev };
      const existing = getScopedDayData(selectedDate, updated) || createDefaultDayBlock(selectedDate);
      updated[scopeKey] = {
        ...existing,
        scopeCourse: selectedCourse,
        scopeSection: selectedSection,
        scopeSemester: selectedSemester,
        reason,
      };
      return updated;
    });
  };

  const togglePeriodBlock = (session: 'morning' | 'afternoon', periodIndex: number) => {
    if (!selectedDate) return;
    const scopeKey = getActiveScopeKey(selectedDate);
    
    setHolidayData(prev => {
      const updated = { ...prev };
      const existing = getScopedDayData(selectedDate, updated) || createDefaultDayBlock(selectedDate);
      
      const newSessions = { ...existing.sessions };
      newSessions[session] = [...newSessions[session]];
      newSessions[session][periodIndex] = {
        ...newSessions[session][periodIndex],
        isBlocked: !newSessions[session][periodIndex].isBlocked,
      };
      
      updated[scopeKey] = {
        ...existing,
        scopeCourse: selectedCourse,
        scopeSection: selectedSection,
        scopeSemester: selectedSemester,
        sessions: newSessions,
      };
      return updated;
    });
  };

  const toggleAllSessionPeriods = (session: 'morning' | 'afternoon', block: boolean) => {
    if (!selectedDate) return;
    const scopeKey = getActiveScopeKey(selectedDate);
    
    setHolidayData(prev => {
      const updated = { ...prev };
      const existing = getScopedDayData(selectedDate, updated) || createDefaultDayBlock(selectedDate);
      
      const newSessions = { ...existing.sessions };
      newSessions[session] = newSessions[session].map(p => ({ ...p, isBlocked: block }));
      
      updated[scopeKey] = {
        ...existing,
        scopeCourse: selectedCourse,
        scopeSection: selectedSection,
        scopeSemester: selectedSemester,
        sessions: newSessions,
      };
      return updated;
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = getScopedDayData(dateStr);
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      const isSelected = dateStr === selectedDate;
      
      const isHoliday = dayData?.isHoliday;
      const isClosed = dayData?.isClosed;
      
      // Calculate blocked periods for preview
      let totalPeriods = 10; // 5 morning + 5 afternoon
      let blockedPeriods = 0;
      let morningBlocked = 0;
      let afternoonBlocked = 0;
      
      if (dayData) {
        morningBlocked = dayData.sessions.morning.filter(p => p.isBlocked).length;
        afternoonBlocked = dayData.sessions.afternoon.filter(p => p.isBlocked).length;
        blockedPeriods = morningBlocked + afternoonBlocked;
      }
      
      const hasPartialBlock = blockedPeriods > 0 && blockedPeriods < totalPeriods && !isHoliday && !isClosed;
      
      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          className={`aspect-square p-1 rounded text-xs transition-all relative ${
            isSelected
              ? 'bg-green-600 text-white ring-2 ring-green-500'
              : isHoliday
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : isClosed
              ? 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              : hasPartialBlock
              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
              : isToday
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
          }`}
        >
          <span className="font-medium">{day}</span>
          {dayData?.isLocked && <Lock className="w-2 h-2 absolute top-0.5 left-0.5 text-green-600" />}
          {isHoliday && <Ban className="w-2 h-2 absolute top-0.5 right-0.5" />}
          {isClosed && <X className="w-2 h-2 absolute top-0.5 right-0.5" />}
          {hasPartialBlock && (
            <div className="absolute bottom-0 left-0 right-0 flex gap-[1px] px-0.5 pb-0.5">
              {morningBlocked > 0 && (
                <div className="flex-1 h-0.5 bg-orange-600 rounded-full" title={`${morningBlocked}/5 morning blocked`} />
              )}
              {afternoonBlocked > 0 && (
                <div className="flex-1 h-0.5 bg-red-600 rounded-full" title={`${afternoonBlocked}/5 afternoon blocked`} />
              )}
            </div>
          )}
        </button>
      );
    }

    return days;
  };

  const selectedDayData = selectedDate ? getScopedDayData(selectedDate) : null;

  // Check if any periods are blocked for the selected date
  const hasBlockedPeriods = selectedDayData ? 
    (selectedDayData.sessions.morning.some(p => p.isBlocked) || 
     selectedDayData.sessions.afternoon.some(p => p.isBlocked)) : false;

  // Calendar content JSX
  const calendarContent = (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-gray-900 text-sm font-medium">Holiday & Attendance Control</h3>
          <p className="text-gray-500 text-xs">Block attendance by date/session/period</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All Courses</option>
            {academicOptions.departments.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Section</label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All Sections</option>
            {sectionOptions.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Semester</label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All Semesters</option>
            {semesterOptions.map((semester) => (
              <option key={semester} value={semester}>
                Semester {semester}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Calendar Section */}
        <div>
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handlePreviousMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h4 className="text-gray-900 text-sm font-medium">
              {monthNames[currentMonth]} {currentYear}
            </h4>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="mb-3">
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <div key={idx} className="text-center text-xs font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {renderCalendar()}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-red-100 rounded border border-red-300" />
              <span className="text-gray-600">Holiday</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-orange-100 rounded border border-orange-300" />
              <span className="text-gray-600">Partial Block</span>
            </div>
          </div>
        </div>

        {/* Session Panel */}
        <div>
          {showPopup && selectedDate ? (
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-gray-900 text-sm font-medium">
                    {new Date(selectedDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(selectedCourse === 'all' ? 'All Courses' : selectedCourse)} • {(selectedSection === 'all' ? 'All Sections' : `Section ${selectedSection}`)} • {(selectedSemester === 'all' ? 'All Semesters' : `Semester ${selectedSemester}`)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDayData?.isLocked && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                      <Lock className="w-3 h-3 text-green-600" />
                      <span className="text-[10px] text-green-600 font-medium">Locked</span>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedDayData?.isLocked ? (
                // Read-only preview for locked dates
                <div className="space-y-3">
                  {/* Status Preview */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <h5 className="text-xs font-semibold text-gray-900">Attendance Status</h5>
                    </div>
                    
                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedDayData.isHoliday && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-medium flex items-center gap-1">
                          <Ban className="w-3 h-3" />
                          Holiday
                        </span>
                      )}
                      {selectedDayData.isClosed && (
                        <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-[10px] font-medium flex items-center gap-1">
                          <X className="w-3 h-3" />
                          College Closed
                        </span>
                      )}
                    </div>

                    {selectedDayData.reason?.trim() && (
                      <div className="mb-3 rounded-lg border border-red-100 bg-red-50 p-2">
                        <p className="text-[10px] font-semibold text-red-700 mb-1">Reason</p>
                        <p className="text-xs text-red-900">{selectedDayData.reason}</p>
                      </div>
                    )}

                    {/* Blocked Periods Preview */}
                    {!selectedDayData.isHoliday && !selectedDayData.isClosed && (
                      <div className="space-y-2">
                        {/* Morning Session */}
                        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-2 border border-orange-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold text-gray-700">Morning Session</span>
                            <span className="text-[10px] text-gray-600">8:00 AM - 12:20 PM</span>
                          </div>
                          <div className="flex gap-1">
                            {selectedDayData.sessions.morning.map((period, idx) => (
                              <div
                                key={idx}
                                className={`flex-1 h-6 rounded flex items-center justify-center text-[10px] font-medium ${
                                  period.isBlocked
                                    ? 'bg-red-500 text-white'
                                    : 'bg-green-500 text-white'
                                }`}
                                title={period.isBlocked ? `Period ${period.period} - Blocked` : `Period ${period.period} - Available`}
                              >
                                {period.period}
                              </div>
                            ))}
                          </div>
                          <div className="mt-1 text-[10px] text-gray-600">
                            {selectedDayData.sessions.morning.filter(p => p.isBlocked).length > 0 ? (
                              <span className="text-red-600 font-medium">
                                {selectedDayData.sessions.morning.filter(p => p.isBlocked).length}/5 periods blocked
                              </span>
                            ) : (
                              <span className="text-green-600 font-medium">All periods available</span>
                            )}
                          </div>
                        </div>

                        {/* Afternoon Session */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-2 border border-blue-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold text-gray-700">Afternoon Session</span>
                            <span className="text-[10px] text-gray-600">12:40 PM - 5:00 PM</span>
                          </div>
                          <div className="flex gap-1">
                            {selectedDayData.sessions.afternoon.map((period, idx) => (
                              <div
                                key={idx}
                                className={`flex-1 h-6 rounded flex items-center justify-center text-[10px] font-medium ${
                                  period.isBlocked
                                    ? 'bg-red-500 text-white'
                                    : 'bg-green-500 text-white'
                                }`}
                                title={period.isBlocked ? `Period ${period.period} - Blocked` : `Period ${period.period} - Available`}
                              >
                                {period.period}
                              </div>
                            ))}
                          </div>
                          <div className="mt-1 text-[10px] text-gray-600">
                            {selectedDayData.sessions.afternoon.filter(p => p.isBlocked).length > 0 ? (
                              <span className="text-red-600 font-medium">
                                {selectedDayData.sessions.afternoon.filter(p => p.isBlocked).length}/5 periods blocked
                              </span>
                            ) : (
                              <span className="text-green-600 font-medium">All periods available</span>
                            )}
                          </div>
                        </div>

                        {/* Overall Summary */}
                        <div className="bg-gray-100 rounded-lg p-2 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-gray-700">Total Available Periods</span>
                          <span className="text-xs font-bold text-green-600">
                            {10 - (selectedDayData.sessions.morning.filter(p => p.isBlocked).length + 
                                   selectedDayData.sessions.afternoon.filter(p => p.isBlocked).length)}/10
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Holiday/Closed Message */}
                    {(selectedDayData.isHoliday || selectedDayData.isClosed) && (
                      <div className="text-center py-4">
                        {selectedDayData.isHoliday ? (
                          <div className="text-red-600">
                            <Ban className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-xs font-medium">No attendance for this holiday</p>
                          </div>
                        ) : (
                          <div className="text-gray-600">
                            <X className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-xs font-medium">College closed - No attendance</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Unlock Button */}
                  <button
                    onClick={handleConfirm}
                    className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-500 flex items-center justify-center gap-2"
                  >
                    <Lock className="w-3 h-3" />
                    Unlock
                  </button>
                </div>
              ) : (
                // Editable view for unlocked dates
                <>
                  {/* Quick Actions */}
                  <div className="space-y-2 mb-3">
                    <button
                      onClick={toggleHoliday}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                        selectedDayData?.isHoliday
                          ? 'bg-red-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-red-50'
                      }`}
                    >
                      {selectedDayData?.isHoliday ? '✓ Holiday' : 'Mark as Holiday'}
                    </button>

                    {selectedDayData?.isHoliday && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                        <label className="block text-xs font-semibold text-red-700 mb-2">
                          Holiday Reason
                        </label>
                        <textarea
                          value={selectedDayData.reason || ''}
                          onChange={(e) => updateReason(e.target.value)}
                          placeholder="Enter why this day is a holiday"
                          rows={3}
                          className="w-full resize-none rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                        />
                        <p className="mt-2 text-[10px] text-red-700">
                          This reason will be saved and shown whenever the holiday is viewed.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Lock Button - Only show if Holiday is marked OR periods are blocked */}
                  {(selectedDayData?.isHoliday || hasBlockedPeriods) && (
                    <div className="mb-3">
                      <button
                        onClick={handleConfirm}
                        disabled={selectedDayData?.isHoliday && !selectedDayData?.reason?.trim()}
                        className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-500 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Lock className="w-3 h-3" />
                        Lock
                      </button>
                      {selectedDayData?.isHoliday && !selectedDayData?.reason?.trim() && (
                        <p className="mt-2 text-[10px] text-red-600">
                          Enter a holiday reason before locking this day.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Session Buttons */}
                  {!selectedDayData?.isHoliday && !selectedDayData?.isClosed && (
                    <>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                          onClick={() => setSelectedSession(selectedSession === 'morning' ? null : 'morning')}
                          className={`p-2 rounded-lg border transition-all ${
                            selectedSession === 'morning'
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-300 hover:border-green-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3 text-gray-600" />
                            <span className="text-xs font-medium text-gray-900">Morning</span>
                          </div>
                        </button>
                        <button
                          onClick={() => setSelectedSession(selectedSession === 'afternoon' ? null : 'afternoon')}
                          className={`p-2 rounded-lg border transition-all ${
                            selectedSession === 'afternoon'
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-300 hover:border-green-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3 text-gray-600" />
                            <span className="text-xs font-medium text-gray-900">Afternoon</span>
                          </div>
                        </button>
                      </div>

                      {/* Period List */}
                      {selectedSession && selectedDayData && (
                        <div className="bg-white rounded-lg p-2 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-xs font-medium text-gray-900 capitalize">
                              {selectedSession} 
                              <span className="text-gray-500 ml-1">
                                ({selectedSession === 'morning' ? '8:00 AM - 12:20 PM' : '12:40 PM - 5:00 PM'})
                              </span>
                            </h5>
                            <div className="flex gap-1">
                              <button
                                onClick={() => toggleAllSessionPeriods(selectedSession, true)}
                                className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                              >
                                Block All
                              </button>
                              <button
                                onClick={() => toggleAllSessionPeriods(selectedSession, false)}
                                className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {selectedDayData.sessions[selectedSession].map((period, index) => {
                              const timing = periodTimings[selectedSession][index];
                              return (
                                <div key={index}>
                                  {/* Show break before period 4 */}
                                  {timing.afterBreak && (
                                    <div className="flex items-center gap-2 px-2 py-1 mb-1.5 bg-blue-50 border border-blue-200 rounded">
                                      <Clock className="w-3 h-3 text-blue-600" />
                                      <span className="text-[10px] text-blue-700 font-medium">
                                        Break: {selectedSession === 'morning' ? '10:30 AM - 10:40 AM' : '3:10 PM - 3:20 PM'}
                                      </span>
                                    </div>
                                  )}
                                  <button
                                    onClick={() => togglePeriodBlock(selectedSession, index)}
                                    className={`w-full px-2 py-1.5 rounded flex items-center justify-between transition-all text-xs ${
                                      period.isBlocked
                                        ? 'bg-red-100 border border-red-500 text-red-700'
                                        : 'bg-gray-50 border border-gray-300 text-gray-900 hover:border-green-300'
                                    }`}
                                  >
                                    <div className="flex flex-col items-start">
                                      <span className="font-medium">Period {period.period}</span>
                                      <span className="text-[10px] text-gray-500">{timing.time}</span>
                                    </div>
                                    {period.isBlocked && <Ban className="w-3 h-3" />}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Select a date to manage</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>Note:</strong> Holiday/Closed dates block student attendance. Blocked periods hide from faculty's today schedule.
        </p>
      </div>
    </>
  );

  // Full page layout when onBack is provided
  if (onBack) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 font-['Poppins',sans-serif] pb-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg sticky top-0 z-10">
          <div className="px-4 py-4 flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="flex-1">
              <h2 className="text-white">Holiday & Attendance Control</h2>
              <p className="text-white/80 text-sm">Block attendance by date/session/period</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-white rounded-3xl shadow-lg p-6">
            {calendarContent}
          </div>
        </div>
      </div>
    );
  }

  // Default embedded view (no onBack)
  return (
    <div className="bg-white rounded-3xl shadow-lg p-4">
      {calendarContent}
    </div>
  );
}

