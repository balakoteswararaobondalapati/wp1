import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { MonthlyAttendanceCalendar } from './MonthlyAttendanceCalendar';
import { attendanceAPI, authAPI, timetableAPI } from '../api';
import { getLocalDateISO } from '../utils/date';
import { resolveHolidayBlock } from '../utils/holidayUtils';
import { isMorningSession, normalizeDepartmentName } from '@/app/utils/departmentUtils';

interface AttendanceOverviewPageProps {
  onBack: () => void;
}

interface AttendanceRow {
  id: number;
  date: string;
  period_number: number;
  subject: string;
  student_roll_number: string;
  status: 'present' | 'absent';
}

interface StudentInfo {
  rollNumber: string;
  course: string;
  section: string;
  semester: string;
  department: string;
}

interface DayChip {
  iso: string;
  label: string;
  day: string;
  dateNumber: string;
}

const dayShortNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const apiDayToShort: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

function parseLocalISODate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function buildCurrentWeek(): DayChip[] {
  const today = new Date();
  const currentDay = today.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index);
    return {
      iso: getLocalDateISO(current),
      label: dayShortNames[current.getDay()],
      day: dayShortNames[current.getDay()],
      dateNumber: String(current.getDate()),
    };
  });
}

export function AttendanceOverviewPage({ onBack }: AttendanceOverviewPageProps) {
  const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({
    rollNumber: '',
    course: 'BCA',
    section: 'B1',
    semester: '1',
    department: 'BCA',
  });
  const [timetableRows, setTimetableRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalDateISO());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const me = await authAPI.me();
        const course = String(me.course || me.department || 'BCA');
        const section = String(me.section || 'B1');
        const semester = String(me.semester || '1');
        const rollNumber = String(me.roll_number || me.register_number || me.username || '');
        const department = normalizeDepartmentName(me.department || me.course || course);

        setStudentInfo({ rollNumber, course, section, semester, department });

        const [attendance, timetable] = await Promise.all([
          attendanceAPI.getAll(),
          timetableAPI.getAll({ course, section, semester }),
        ]);

        const filteredAttendance = (attendance || [])
          .map((r: any) => ({
            id: Number(r.id),
            date: String(r.date).split('T')[0],
            period_number: Number(r.period_number),
            subject: String(r.subject || ''),
            student_roll_number: String(r.student_roll_number || ''),
            status: r.status === 'absent' ? 'absent' : 'present',
          }))
          .filter((r: AttendanceRow) => r.student_roll_number === rollNumber)
          .sort((a: AttendanceRow, b: AttendanceRow) => {
            if (a.date === b.date) return a.period_number - b.period_number;
            return a.date < b.date ? 1 : -1;
          });

        setRows(filteredAttendance);
        setTimetableRows(Array.isArray(timetable) ? timetable : []);
      } catch (error) {
        console.error('Failed to load attendance overview from backend:', error);
        setRows([]);
        setTimetableRows([]);
      } finally {
        setLoading(false);
      }
    };

    void load();

    const reload = () => void load();
    window.addEventListener('attendanceUpdated', reload);
    window.addEventListener('timetableUpdated', reload);
    window.addEventListener('holidayDataUpdated', reload);
    return () => {
      window.removeEventListener('attendanceUpdated', reload);
      window.removeEventListener('timetableUpdated', reload);
      window.removeEventListener('holidayDataUpdated', reload);
    };
  }, []);

  const weekDays = useMemo(() => buildCurrentWeek(), []);

  useEffect(() => {
    if (!weekDays.some((day) => day.iso === selectedDate)) {
      setSelectedDate(getLocalDateISO());
    }
  }, [selectedDate, weekDays]);

  const summary = useMemo(() => {
    const grouped: Record<string, Record<number, 'present' | 'absent'>> = {};

    rows.forEach((row) => {
      if (!grouped[row.date]) grouped[row.date] = {};
      grouped[row.date][row.period_number] = row.status;
    });

    let presentDays = 0;
    let absentDays = 0;

    Object.values(grouped).forEach((periodMap) => {
      let absentCount = 0;
      for (let periodNumber = 1; periodNumber <= 5; periodNumber += 1) {
        if ((periodMap[periodNumber] || 'absent') === 'absent') {
          absentCount += 1;
        }
      }
      if (absentCount >= 3) {
        absentDays += 1;
      } else {
        presentDays += 1;
      }
    });

    return {
      workingDays: presentDays + absentDays,
      presentDays,
      absentDays,
    };
  }, [rows]);

  const selectedHolidayData = useMemo(() => {
    return resolveHolidayBlock(selectedDate, {
      course: studentInfo.department || studentInfo.course,
      section: studentInfo.section,
      semester: studentInfo.semester,
    });
  }, [selectedDate, studentInfo]);

  const selectedSchedule = useMemo(() => {
    const selectedDayName = dayShortNames[parseLocalISODate(selectedDate).getDay()];
    const isMorningStudent = isMorningSession(studentInfo.department || studentInfo.course);
    const sessionType = isMorningStudent ? 'morning' : 'afternoon';
    const selectedAttendance = rows.filter((row) => row.date === selectedDate);

    const scheduleRows = (timetableRows || [])
      .filter((row: any) => (apiDayToShort[row.day_of_week] || String(row.day_of_week || '').slice(0, 3)) === selectedDayName)
      .map((row: any) => ({
        periodNumber: Number(row.period_number),
        subject: String(row.subject || ''),
        faculty: String(row.faculty_name || ''),
        room: String(row.room || ''),
      }))
      .sort((a: any, b: any) => a.periodNumber - b.periodNumber);

    return scheduleRows.map((period: any) => {
      const periodIndex = period.periodNumber - 1;
      const blocked = selectedHolidayData?.sessions?.[sessionType]?.[periodIndex]?.isBlocked || false;
      const record = selectedAttendance.find((row) => Number(row.period_number) === Number(period.periodNumber));
      const status = blocked ? 'blocked' : record ? record.status : 'unmarked';

      return {
        ...period,
        status,
      };
    });
  }, [rows, selectedDate, selectedHolidayData, studentInfo, timetableRows]);

  if (showMonthlyCalendar) {
    return <MonthlyAttendanceCalendar onBack={() => setShowMonthlyCalendar(false)} />;
  }

  const selectedDateLabel = parseLocalISODate(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const isHoliday = Boolean(selectedHolidayData?.isHoliday);
  const isClosed = Boolean(selectedHolidayData?.isClosed);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 font-['Poppins',sans-serif]">
      <div className="bg-blue-600 shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h2 className="text-white">Attendance Overview</h2>
        </div>
      </div>

      <div className="px-4 py-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-blue-100 bg-white px-5 py-4 shadow-sm">
            <p className="text-sm text-gray-500">Working Days</p>
            <p className="text-3xl text-blue-700 mt-2">{summary.workingDays}</p>
          </div>
          <div className="rounded-2xl border border-green-100 bg-green-50 px-5 py-4 shadow-sm">
            <p className="text-sm text-gray-500">Present Days</p>
            <p className="text-3xl text-green-700 mt-2">{summary.presentDays}</p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 shadow-sm">
            <p className="text-sm text-gray-500">Absent Days</p>
            <p className="text-3xl text-red-700 mt-2">{summary.absentDays}</p>
          </div>
        </div>

        <div className="flex items-center justify-center mb-6">
          <div className="inline-flex rounded-full bg-white p-1 shadow-sm border border-gray-200">
            <button className="px-8 py-3 rounded-full bg-blue-600 text-white text-sm font-medium">
              Daily
            </button>
            <button
              onClick={() => setShowMonthlyCalendar(true)}
              className="px-8 py-3 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {weekDays.map((day) => {
            const active = day.iso === selectedDate;
            return (
              <button
                key={day.iso}
                onClick={() => setSelectedDate(day.iso)}
                className={`rounded-2xl border px-4 py-3 text-center shadow-sm transition-all ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-200 hover:bg-blue-50'
                }`}
              >
                <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-blue-700'}`}>{day.day}</p>
                <p className={`text-xs mt-1 ${active ? 'text-blue-100' : 'text-gray-400'}`}>{day.dateNumber}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-md border border-blue-50">
          <div className="mb-5">
            <p className="text-sm text-gray-500">{selectedDateLabel}</p>
          </div>

          {loading && <p className="text-sm text-gray-500">Loading...</p>}

          {!loading && (isHoliday || isClosed) && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-2xl text-gray-900">{isHoliday ? 'Holiday' : 'College Closed'}</p>
              <p className="text-gray-500 mt-3">
                {selectedHolidayData?.reason?.trim() || 'No classes scheduled for this day.'}
              </p>
            </div>
          )}

          {!loading && !isHoliday && !isClosed && selectedSchedule.length === 0 && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-2xl text-gray-900">No Classes Scheduled</p>
              <p className="text-gray-500 mt-3">You don&apos;t have any classes scheduled for this day.</p>
            </div>
          )}

          {!loading && !isHoliday && !isClosed && selectedSchedule.length > 0 && (
            <div className="space-y-3">
              {selectedSchedule.map((period) => (
                <div
                  key={`${selectedDate}-${period.periodNumber}`}
                  className="rounded-2xl border border-gray-200 px-4 py-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-12 w-12 rounded-xl border border-gray-200 flex items-center justify-center text-sm font-semibold text-blue-700 bg-blue-50">
                      P{period.periodNumber}
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-900 font-medium truncate">{period.subject || 'Subject'}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {period.faculty || 'Faculty not assigned'}
                        {period.room ? ` • ${period.room}` : ''}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      period.status === 'present'
                        ? 'bg-green-100 text-green-700'
                        : period.status === 'absent'
                        ? 'bg-red-100 text-red-700'
                        : period.status === 'blocked'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {period.status === 'blocked'
                      ? 'Blocked'
                      : period.status === 'unmarked'
                      ? 'Unmarked'
                      : period.status.charAt(0).toUpperCase() + period.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
