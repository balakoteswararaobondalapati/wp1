import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, Ban, X, User, ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import { appStorage } from './';
import { resolveHolidayBlock } from '../utils/holidayUtils';
import { timetableAPI } from '../api';

interface FacultyTimetablePageProps {
  onBack: () => void;
}

interface Period {
  periodNumber: number;
  subject: string;
  time: string;
  class: string;
  room: string;
  status?: 'normal' | 'blocked' | 'holiday';
}

interface DaySchedule {
  [key: string]: Period[];
}

const normalizeFacultyKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

// Helper function to format date as YYYY-MM-DD
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get day name from date
const getDayName = (date: Date): string => {
  const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return dayMap[date.getDay()];
};

// Helper function to format date for display
const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  };
  return date.toLocaleDateString('en-US', options);
};

// Helper function to check if a date is a holiday or has blocked periods
const getDateStatus = (dateStr: string) => {
  const dayData = resolveHolidayBlock(dateStr);
  
  if (!dayData || !dayData.isLocked) {
    return {
      isHoliday: false,
      isClosed: false,
      blockedMorning: [],
      blockedAfternoon: []
    };
  }
  
  const blockedMorning: number[] = [];
  const blockedAfternoon: number[] = [];
  
  if (dayData.sessions?.morning) {
    dayData.sessions.morning.forEach((period: any, index: number) => {
      if (period.isBlocked) {
        blockedMorning.push(index + 1);
      }
    });
  }
  
  if (dayData.sessions?.afternoon) {
    dayData.sessions.afternoon.forEach((period: any, index: number) => {
      if (period.isBlocked) {
        blockedAfternoon.push(index + 1);
      }
    });
  }
  
  return {
    isHoliday: dayData.isHoliday || false,
    isClosed: dayData.isClosed || false,
    blockedMorning,
    blockedAfternoon
  };
};

export function FacultyTimetablePage({ onBack }: FacultyTimetablePageProps) {
  // State for date selection
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  const [timetableData, setTimetableData] = useState<DaySchedule>({});
  const [facultyName, setFacultyName] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [addFormData, setAddFormData] = useState({
    periodNumber: '1',
    subject: '',
    time: '9:00-10:00',
    course: '',
    section: '',
    semester: '',
    room: ''
  });
  const [dateSpecificSchedules, setDateSpecificSchedules] = useState<Record<string, Period[]>>({});

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Load faculty info and generate timetable from master data
  useEffect(() => {
    // Get logged-in faculty name
    const currentUser = appStorage.getItem('current_user');
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        const name = user.name || user.username || 'Faculty';
        setFacultyName(name);
        generateFacultyTimetable(name);
        loadDateSpecificSchedules(name);
      } catch (e) {
        console.error('Failed to load faculty info', e);
        setFacultyName('Faculty');
        generateFacultyTimetable('Faculty');
        loadDateSpecificSchedules('Faculty');
      }
    } else {
      setFacultyName('Faculty');
      generateFacultyTimetable('Faculty');
      loadDateSpecificSchedules('Faculty');
    }
  }, []);

  // Listen for timetable updates
  useEffect(() => {
    const handleTimetableUpdate = () => {
      if (facultyName) {
        generateFacultyTimetable(facultyName);
        loadDateSpecificSchedules(facultyName);
      }
    };

    window.addEventListener('timetableUpdated', handleTimetableUpdate);
    window.addEventListener('facultyScheduleUpdated', handleTimetableUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === 'timetable_master_data' || e.key === 'faculty_date_schedules') {
        handleTimetableUpdate();
      }
    });

    return () => {
      window.removeEventListener('timetableUpdated', handleTimetableUpdate);
      window.removeEventListener('facultyScheduleUpdated', handleTimetableUpdate);
      window.removeEventListener('storage', handleTimetableUpdate);
    };
  }, [facultyName]);

  const generateFacultyTimetable = async (faculty: string) => {
    try {
      const rows = await timetableAPI.getAll();
      const facultyScheduleFromApi: DaySchedule = {
        Mon: [],
        Tue: [],
        Wed: [],
        Thu: [],
        Fri: [],
        Sat: []
      };
      (rows || []).forEach((row: any) => {
        const day = row.day_of_week?.slice(0, 3);
        if (
          facultyScheduleFromApi[day] &&
          normalizeFacultyKey(String(row.faculty_name || '')) === normalizeFacultyKey(faculty)
        ) {
          facultyScheduleFromApi[day].push({
            periodNumber: Number(row.period_number),
            subject: row.subject || '',
            time: row.time || '',
            class: `${row.course} ${row.section} - Sem ${row.semester}`,
            room: row.room || '',
          });
        }
      });
      Object.keys(facultyScheduleFromApi).forEach((day) => {
        facultyScheduleFromApi[day].sort((a, b) => a.periodNumber - b.periodNumber);
      });
      setTimetableData(facultyScheduleFromApi);
      return;
    } catch (error) {
      console.error('Failed to load faculty timetable from backend', error);
    }

    const storedData = appStorage.getItem('timetable_master_data');
    if (!storedData) {
      setTimetableData({});
      return;
    }

    try {
      const masterData = JSON.parse(storedData);
      const facultySchedule: DaySchedule = {
        Mon: [],
        Tue: [],
        Wed: [],
        Thu: [],
        Fri: [],
        Sat: []
      };

      // Loop through all courses, sections, semesters, and days
      Object.keys(masterData).forEach(course => {
        Object.keys(masterData[course]).forEach(section => {
          Object.keys(masterData[course][section]).forEach(semester => {
            Object.keys(masterData[course][section][semester]).forEach(day => {
              const periods = masterData[course][section][semester][day];
              periods.forEach((period: any) => {
                // Check if this faculty teaches this period
                if (period.faculty && period.faculty.toLowerCase().includes(faculty.toLowerCase())) {
                  facultySchedule[day].push({
                    periodNumber: period.periodNumber,
                    subject: period.subject,
                    time: period.time,
                    class: `${course} ${section} - Sem ${semester}`,
                    room: period.room
                  });
                }
              });
            });
          });
        });
      });

      // Sort each day's periods by period number
      Object.keys(facultySchedule).forEach(day => {
        facultySchedule[day].sort((a, b) => a.periodNumber - b.periodNumber);
      });

      setTimetableData(facultySchedule);
    } catch (e) {
      console.error('Failed to generate faculty timetable', e);
      setTimetableData({});
    }
  };

  // Load date-specific schedules from appStorage
  const loadDateSpecificSchedules = (faculty: string) => {
    const storedData = appStorage.getItem('faculty_date_schedules');
    if (!storedData) {
      setDateSpecificSchedules({});
      return;
    }

    try {
      const allSchedules = JSON.parse(storedData);
      const matchingKey = Object.keys(allSchedules).find(
        (key) => normalizeFacultyKey(key) === normalizeFacultyKey(faculty),
      );
      const facultySchedules = matchingKey ? allSchedules[matchingKey] || {} : {};
      setDateSpecificSchedules(facultySchedules);
    } catch (e) {
      console.error('Failed to load date-specific schedules', e);
      setDateSpecificSchedules({});
    }
  };

  // Save period to appStorage
  const savePeriod = () => {
    if (!addFormData.subject.trim() || !addFormData.course.trim() || !addFormData.section.trim() || !addFormData.semester.trim() || !addFormData.room.trim()) {
      alert('Please fill in all fields');
      return;
    }

    // Load existing data
    const storedData = appStorage.getItem('faculty_date_schedules');
    const allSchedules = storedData ? JSON.parse(storedData) : {};
    
    // Initialize faculty schedule if it doesn't exist
    if (!allSchedules[facultyName]) {
      allSchedules[facultyName] = {};
    }
    
    // Initialize date schedule if it doesn't exist
    if (!allSchedules[facultyName][selectedDate]) {
      allSchedules[facultyName][selectedDate] = [];
    }

    const newPeriod: Period = {
      periodNumber: parseInt(addFormData.periodNumber),
      subject: addFormData.subject,
      time: addFormData.time,
      class: `${addFormData.course} ${addFormData.section} - Sem ${addFormData.semester}`,
      room: addFormData.room
    };

    // If editing, remove the old period
    if (editingPeriod) {
      allSchedules[facultyName][selectedDate] = allSchedules[facultyName][selectedDate].filter(
        (p: Period) => p.periodNumber !== editingPeriod.periodNumber
      );
    }

    // Add the new/updated period
    allSchedules[facultyName][selectedDate].push(newPeriod);
    
    // Sort by period number
    allSchedules[facultyName][selectedDate].sort((a: Period, b: Period) => a.periodNumber - b.periodNumber);

    // Save to appStorage
    appStorage.setItem('faculty_date_schedules', JSON.stringify(allSchedules));

    // Update state
    loadDateSpecificSchedules(facultyName);

    // Dispatch event for other components
    window.dispatchEvent(new Event('facultyScheduleUpdated'));

    // Close modal and reset form
    setShowAddModal(false);
    setEditingPeriod(null);
    setAddFormData({
      periodNumber: '1',
      subject: '',
      time: '9:00-10:00',
      course: '',
      section: '',
      semester: '',
      room: ''
    });
  };

  // Delete period from appStorage
  const deletePeriod = (period: Period) => {
    if (!confirm(`Delete ${period.subject} from ${formatDisplayDate(selectedDate)}?`)) {
      return;
    }

    // Load existing data
    const storedData = appStorage.getItem('faculty_date_schedules');
    if (!storedData) return;

    const allSchedules = JSON.parse(storedData);
    
    if (!allSchedules[facultyName] || !allSchedules[facultyName][selectedDate]) {
      return;
    }

    // Remove the period
    allSchedules[facultyName][selectedDate] = allSchedules[facultyName][selectedDate].filter(
      (p: Period) => p.periodNumber !== period.periodNumber
    );

    // If no periods left for this date, remove the date entry
    if (allSchedules[facultyName][selectedDate].length === 0) {
      delete allSchedules[facultyName][selectedDate];
    }

    // Save to appStorage
    appStorage.setItem('faculty_date_schedules', JSON.stringify(allSchedules));

    // Update state
    loadDateSpecificSchedules(facultyName);

    // Dispatch event for other components
    window.dispatchEvent(new Event('facultyScheduleUpdated'));
  };

  // Fallback to default data for demo if no data loaded
  const defaultTimetableData: DaySchedule = {
    Mon: [],
    Tue: [],
    Wed: [],
    Thu: [],
    Fri: [],
    Sat: []
  };

  // Prioritize date-specific schedule, then fall back to weekly schedule
  const getScheduleForDate = (): Period[] => {
    // First check if there's a date-specific schedule
    if (dateSpecificSchedules[selectedDate] && dateSpecificSchedules[selectedDate].length > 0) {
      return dateSpecificSchedules[selectedDate];
    }
    
    // Fall back to weekly recurring schedule
    const dayName = getDayName(new Date(selectedDate + 'T00:00:00'));
    return timetableData[dayName] || defaultTimetableData[dayName] || [];
  };

  const currentSchedule = getScheduleForDate();
  
  // Get the date for the selected day and check holiday status
  const dateStatus = getDateStatus(selectedDate);
  const isFullDayOff = dateStatus.isHoliday || dateStatus.isClosed;
  
  // Apply holiday/blocked status to periods
  const scheduleWithStatus = currentSchedule.length > 0 ? currentSchedule.map(period => {
    if (period.subject === 'Free Period' || period.subject === 'No Class') {
      return { ...period, status: 'normal' as const };
    }
    
    // P1-P3 are morning (periods 1, 2, 3)
    // P4-P5 are afternoon (periods 4, 5)
    const periodNum = period.periodNumber;
    const isMorning = periodNum <= 3;
    
    if (isFullDayOff) {
      return { ...period, status: 'holiday' as const };
    }
    
    const isBlocked = isMorning 
      ? dateStatus.blockedMorning.includes(periodNum)
      : dateStatus.blockedAfternoon.includes(periodNum - 3); // Map P4->1, P5->2 for afternoon
    
    return { 
      ...period, 
      status: isBlocked ? 'blocked' as const : 'normal' as const 
    };
  }) : [];

  // Calendar generation helper
  const generateCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const calendarDays = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }
    
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = formatDate(date);
      const isToday = dateStr === formatDate(new Date());
      const isSelected = dateStr === selectedDate;
      
      calendarDays.push(
        <button
          key={dateStr}
          onClick={() => {
            setSelectedDate(dateStr);
            setShowCalendar(false);
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors text-sm ${
            isSelected ? 'bg-red-400 text-white font-semibold' : isToday ? 'bg-red-100 text-red-600 font-medium' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {day}
        </button>
      );
    }
    
    return calendarDays;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-orange-50 font-['Poppins',sans-serif] flex flex-col">
      {/* Top Header Bar with Back Button */}
      <div className="bg-gradient-to-r from-red-400 to-red-400 shadow-sm">
        <div className="px-4 py-4 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h2 className="text-white">My Teaching Schedule</h2>
          </div>
        </div>
      </div>

      {/* Content - Takes remaining height */}
      <div className="flex-1 flex flex-col px-4 py-4 overflow-y-auto">
        {/* Header Card */}
        <div className="bg-white rounded-2xl p-4 shadow-md mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-grey-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-gray-900 mb-1">Date-based Schedule</h2>
              <p className="text-sm text-gray-500">Select date & allocate periods</p>
            </div>
          </div>
        </div>

        {/* Holiday/Closed Status Banner */}
        {isFullDayOff && (
          <div className={`rounded-2xl p-4 mb-4 flex-shrink-0 ${
            dateStatus.isHoliday ? 'bg-red-50 border-2 border-red-300' : 'bg-gray-100 border-2 border-gray-400'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                dateStatus.isHoliday ? 'bg-red-500' : 'bg-gray-600'
              }`}>
                {dateStatus.isHoliday ? (
                  <Ban className="w-6 h-6 text-white" />
                ) : (
                  <X className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h3 className={`font-medium mb-1 ${
                  dateStatus.isHoliday ? 'text-red-900' : 'text-gray-900'
                }`}>
                  {dateStatus.isHoliday ? 'Holiday' : 'College Closed'}
                </h3>
                <p className="text-sm text-gray-600">No classes scheduled for this day</p>
              </div>
            </div>
          </div>
        )}

        {/* Date Selector with Calendar */}
        <div className="mb-4 flex-shrink-0">
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="w-full py-3 rounded-xl transition-all active:scale-95 bg-gradient-to-r from-red-400 to-red-400 text-white shadow-md flex items-center justify-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">{formatDisplayDate(selectedDate)}</span>
          </button>
          
          {/* Calendar Dropdown */}
          {showCalendar && (
            <div className="mt-2 bg-white rounded-2xl shadow-lg p-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h3 className="text-gray-900 font-semibold">
                  {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors active:scale-95"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="w-8 h-8 flex items-center justify-center text-xs font-semibold text-gray-500">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays()}
              </div>
            </div>
          )}
        </div>

        {/* Add Period Button */}
        <button
          onClick={() => {
            setEditingPeriod(null);
            setShowAddModal(true);
          }}
          className="mb-4 flex-shrink-0 py-3 rounded-xl bg-red-400 text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">Allocate Period for {formatDisplayDate(selectedDate)}</span>
        </button>

        {/* Period Cards */}
        <div className="flex flex-col gap-2.5">
          {scheduleWithStatus.length === 0 ? (
            <div className="bg-white rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
              <Calendar className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-gray-900 mb-2">No Classes Scheduled</h3>
              <p className="text-sm text-gray-500">
                You don't have any classes assigned for this day. Click "Allocate Period" to add one.
              </p>
            </div>
          ) : (
            scheduleWithStatus.map((period) => (
              <div
                key={period.periodNumber}
                className={`rounded-xl p-3 shadow-sm flex items-center gap-3 ${
                  period.subject === 'Free Period' || period.subject === 'No Class'
                    ? 'bg-gray-100 border-2 border-dashed border-gray-300'
                    : period.status === 'holiday'
                    ? 'bg-red-50 border-2 border-red-200 opacity-60'
                    : period.status === 'blocked'
                    ? 'bg-orange-50 border-2 border-orange-200 opacity-70'
                    : 'bg-white'
                }`}
              >
                {/* Period Number Badge */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
                  period.subject === 'Free Period' || period.subject === 'No Class'
                    ? 'bg-gray-300'
                    : period.status === 'holiday'
                    ? 'bg-red-400'
                    : period.status === 'blocked'
                    ? 'bg-orange-400'
                    : 'bg-gradient-to-br from-red-400 to-red-400'
                }`}>
                  <span className="text-white font-semibold">{period.periodNumber}</span>
                </div>

                {/* Period Details */}
                <div className="flex-1 min-w-0">
                  {/* Subject Name */}
                  <div className="flex items-center gap-2">
                    <h3 className={`truncate mb-1 ${
                      period.subject === 'Free Period' || period.subject === 'No Class'
                        ? 'text-gray-500 italic'
                        : 'text-gray-900 font-semibold'
                    }`}>
                      {period.subject}
                    </h3>
                    {period.status === 'holiday' && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium">
                        Holiday
                      </span>
                    )}
                    {period.status === 'blocked' && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-medium">
                        Blocked
                      </span>
                    )}
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-grey-600 flex-shrink-0" />
                    <p className="text-xs text-gray-600 font-medium">{period.time}</p>
                  </div>

                  {/* Class and Room */}
                  {period.subject !== 'Free Period' && period.subject !== 'No Class' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-grey-100 text-grey-700 px-2 py-0.5 rounded-full font-medium">
                        {period.class}
                      </span>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-grey-600" />
                        <span className="text-xs bg-grey-100 text-grey-700 px-2 py-0.5 rounded-full font-medium">
                          {period.room}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setEditingPeriod(period);
                      setAddFormData({
                        periodNumber: period.periodNumber.toString(),
                        subject: period.subject,
                        time: period.time,
                        course: period.class.split(' ')[0],
                        section: period.class.split(' ')[1],
                        semester: period.class.split(' ')[3],
                        room: period.room
                      });
                      setShowAddModal(true);
                    }}
                    className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  </button>
                  <button
                    onClick={() => deletePeriod(period)}
                    className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 transition-colors active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Period Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-400 to-red-400 p-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-white font-semibold">
                {editingPeriod ? 'Edit Period' : 'Allocate Period'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingPeriod(null);
                  setAddFormData({
                    periodNumber: '1',
                    subject: '',
                    time: '9:00-10:00',
                    course: '',
                    section: '',
                    semester: '',
                    room: ''
                  });
                }}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Date Display */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-sm text-red-800">
                  <strong>Date:</strong> {formatDisplayDate(selectedDate)}
                </p>
              </div>

              {/* Period Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period Number
                </label>
                <select
                  value={addFormData.periodNumber}
                  onChange={(e) => setAddFormData({ ...addFormData, periodNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="1">Period 1</option>
                  <option value="2">Period 2</option>
                  <option value="3">Period 3</option>
                  <option value="4">Period 4</option>
                  <option value="5">Period 5</option>
                  <option value="6">Period 6</option>
                  <option value="7">Period 7</option>
                </select>
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <select
                  value={addFormData.time}
                  onChange={(e) => setAddFormData({ ...addFormData, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="9:00-10:00">9:00-10:00</option>
                  <option value="10:00-11:00">10:00-11:00</option>
                  <option value="11:00-12:00">11:00-12:00</option>
                  <option value="11:30-12:30">11:30-12:30</option>
                  <option value="12:30-1:30">12:30-1:30</option>
                  <option value="1:30-2:30">1:30-2:30</option>
                  <option value="2:00-3:00">2:00-3:00</option>
                  <option value="3:00-4:00">3:00-4:00</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={addFormData.subject}
                  onChange={(e) => setAddFormData({ ...addFormData, subject: e.target.value })}
                  placeholder="e.g., Data Structures"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              {/* Course */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course
                </label>
                <input
                  type="text"
                  value={addFormData.course}
                  onChange={(e) => setAddFormData({ ...addFormData, course: e.target.value })}
                  placeholder="e.g., BCA"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              {/* Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <input
                  type="text"
                  value={addFormData.section}
                  onChange={(e) => setAddFormData({ ...addFormData, section: e.target.value })}
                  placeholder="e.g., B1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              {/* Semester */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester
                </label>
                <input
                  type="text"
                  value={addFormData.semester}
                  onChange={(e) => setAddFormData({ ...addFormData, semester: e.target.value })}
                  placeholder="e.g., 3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              {/* Room */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room
                </label>
                <input
                  type="text"
                  value={addFormData.room}
                  onChange={(e) => setAddFormData({ ...addFormData, room: e.target.value })}
                  placeholder="e.g., Lab 101"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingPeriod(null);
                    setAddFormData({
                      periodNumber: '1',
                      subject: '',
                      time: '9:00-10:00',
                      course: '',
                      section: '',
                      semester: '',
                      room: ''
                    });
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={savePeriod}
                  className="flex-1 py-2.5 rounded-xl bg-red-400 text-white hover:bg-red-500 transition-all active:scale-95"
                >
                  {editingPeriod ? 'Update' : 'Add'} Period
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
