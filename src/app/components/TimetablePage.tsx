import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, Ban, X, CheckCircle, User } from 'lucide-react';
import { getTodayStatus, canAccessAttendance } from '../utils/holidayUtils';
import { authAPI, timetableAPI } from '../api';

interface TimetablePageProps {
  onBack: () => void;
  
}

interface Period {
  periodNumber: number;
  subject: string;
  time: string;
  faculty: string;
  room: string;
}

interface DaySchedule {
  [key: string]: Period[];
}

export function TimetablePage({ onBack}: TimetablePageProps) {
  // Get current day automatically
  const getCurrentDay = () => {
    const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentDay = dayMap[today];
    // If it's Sunday, default to Monday since there's no Sunday in the timetable
    return currentDay === 'Sun' ? 'Mon' : currentDay;
  };

  const [selectedDay, setSelectedDay] = useState(getCurrentDay());
  const [timetableData, setTimetableData] = useState<DaySchedule>({});
  const [studentInfo, setStudentInfo] = useState<{course: string, section: string, semester: string} | null>(null);
  
  // Get today's holiday status
  const todayStatus = getTodayStatus();
  const accessStatus = canAccessAttendance();
  const holidayReason = todayStatus.reason?.trim();

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const actualTodayKey = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
  const isTodaySelected = selectedDay === actualTodayKey;

  const apiDayToDay: Record<string, string> = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
  };

  // Load student info and timetable data from backend
  useEffect(() => {
    const loadStudentAndTimetable = async () => {
      try {
        const me = await authAPI.me();
        const course = me.course || me.department || 'BCA';
        const section = me.section || 'B1';
        const semester = String(me.semester || '1');
        setStudentInfo({ course, section, semester });
        await loadTimetableData(course, section, semester);
      } catch (e) {
        console.error('Failed to load student info from backend', e);
        setStudentInfo({ course: 'BCA', section: 'B1', semester: '1' });
        await loadTimetableData('BCA', 'B1', '1');
      }
    };
    void loadStudentAndTimetable();
  }, []);

  // Listen for timetable updates and student registration
  useEffect(() => {
    const handleTimetableUpdate = () => {
      if (studentInfo) {
        void loadTimetableData(studentInfo.course, studentInfo.section, studentInfo.semester);
      }
    };

    const handleStudentUpdate = () => {
      const reload = async () => {
        try {
          const me = await authAPI.me();
          const course = me.course || me.department || 'BCA';
          const section = me.section || 'B1';
          const semester = String(me.semester || '1');
          setStudentInfo({ course, section, semester });
          await loadTimetableData(course, section, semester);
        } catch (e) {
          console.error('Failed to reload student info', e);
        }
      };
      void reload();
    };

    // Listen for custom event
    window.addEventListener('timetableUpdated', handleTimetableUpdate);
    window.addEventListener('studentRegistered', handleStudentUpdate);
    
    // Listen for storage event (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'timetableUpdated') {
        handleTimetableUpdate();
      }
      if (e.key === 'current_user') {
        handleStudentUpdate();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('timetableUpdated', handleTimetableUpdate);
      window.removeEventListener('studentRegistered', handleStudentUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [studentInfo]);

  const loadTimetableData = async (course: string, section: string, semester: string) => {
    try {
      const rows = await timetableAPI.getAll({ course, section, semester });
      const daySchedule: DaySchedule = {};
      (rows || []).forEach((row: any) => {
        const day = apiDayToDay[row.day_of_week] || row.day_of_week?.slice(0, 3) || 'Mon';
        if (!daySchedule[day]) daySchedule[day] = [];
        daySchedule[day].push({
          periodNumber: Number(row.period_number),
          subject: row.subject || '',
          time: row.time || '',
          faculty: row.faculty_name || '',
          room: row.room || '',
        });
      });
      Object.keys(daySchedule).forEach((day) => {
        daySchedule[day].sort((a, b) => a.periodNumber - b.periodNumber);
      });
      setTimetableData(daySchedule);
    } catch (e) {
      console.error('Failed to load timetable data from backend', e);
      setTimetableData({});
    }
  };

  const currentSchedule = timetableData[selectedDay] || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 font-['Poppins',sans-serif] flex flex-col">
      {/* Top Header Bar with Back Button */}
      <div className="bg-blue-600 shadow-sm">
        <div className="px-4 py-4 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full hover:bg-blue-500 flex items-center justify-center transition-colors active:scale-95"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h2 className="text-white">Timetable</h2>
          </div>
          
        </div>
      </div>

      {/* Content - Takes remaining height */}
      <div className="flex-1 flex flex-col px-4 py-4 overflow-hidden">
        {/* Header Card */}
        <div className="bg-white rounded-2xl p-4 shadow-md mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-gray-900 mb-1">Class Timetable</h2>
              <p className="text-sm text-gray-500">
                {studentInfo ? `${studentInfo.course} - ${studentInfo.section} | Semester ${studentInfo.semester}` : 'Weekly schedule'}
              </p>
            </div>
          </div>
        </div>

        {/* Holiday/Closed Status Banner - Only show for today */}
        {isTodaySelected && !accessStatus.allowed && (
          <div className={`rounded-2xl p-4 mb-4 flex-shrink-0 ${
            todayStatus.isHoliday ? 'bg-red-50 border-2 border-red-300' : 'bg-gray-100 border-2 border-gray-400'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                todayStatus.isHoliday ? 'bg-red-500' : 'bg-gray-600'
              }`}>
                {todayStatus.isHoliday ? (
                  <Ban className="w-6 h-6 text-white" />
                ) : (
                  <X className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h3 className={`font-medium mb-1 ${
                  todayStatus.isHoliday ? 'text-red-900' : 'text-gray-900'
                }`}>
                  {accessStatus.reason}
                </h3>
                <p className="text-sm text-gray-600">
                  {holidayReason || 'Classes are not scheduled today'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Permission Granted Banner */}
        {isTodaySelected && accessStatus.status === 'permission' && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-4 mb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-yellow-900 font-medium mb-1">Special Permission Granted</h3>
                <p className="text-sm text-yellow-700">Attendance is enabled despite holiday/closure</p>
              </div>
            </div>
          </div>
        )}

        {/* Day Selector - No Scroll */}
        <div className="flex gap-2 mb-4 flex-shrink-0">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 py-2.5 rounded-xl transition-all active:scale-95 ${
                selectedDay === day
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
              }`}
            >
              <span className="text-sm">{day}</span>
            </button>
          ))}
        </div>

        {/* Period Cards - All visible without scroll */}
        <div className="flex-1 flex flex-col gap-2.5 min-h-0 justify-start">
          {currentSchedule.length === 0 ? (
            <div className="bg-white rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
              <Calendar className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-gray-900 mb-2">No Timetable Available</h3>
              <p className="text-sm text-gray-500">
                The timetable for this day hasn't been set up yet.
              </p>
            </div>
          ) : (
            currentSchedule.map((period) => (
            <div
              key={period.periodNumber}
              className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3"
            >
              {/* Period Number Badge */}
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white">{period.periodNumber}</span>
              </div>

              {/* Period Details */}
              <div className="flex-1 min-w-0">
                {/* Subject Name */}
                <h3 className="text-gray-900 truncate mb-1">{period.subject}</h3>

                {/* Time */}
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <p className="text-xs text-gray-600">{period.time}</p>
                </div>

                {/* Faculty and Room */}
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <p className="text-xs text-gray-500">{period.faculty || '—'} • {period.room || '—'}</p>
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
