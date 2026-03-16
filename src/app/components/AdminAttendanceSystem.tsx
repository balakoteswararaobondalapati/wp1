import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Users, CheckCircle, XCircle, Clock, Lock, Save, Edit, List, Plus, Filter, Search, ChevronDown, X } from 'lucide-react';
import { attendanceAPI, studentsAPI, timetableAPI } from '../api';
import { getAcademicOptions } from '../utils/academicConfig';

interface AdminAttendanceSystemProps {
  onBack: () => void;
  initialMode?: 'mark' | 'view';
}

interface Period {
  id: number;
  subject: string;
  time: string;
  faculty: string;
  isActive: boolean;
  isCompleted: boolean;
}

interface Student {
  id: number;
  name: string;
  rollNumber: string;
  registerNumber?: string;
  username?: string;
  isPresent: boolean;
}

interface StudentPeriodEditor {
  student: Student;
  periods: Array<{
    periodNumber: number;
    subject: string;
    status: 'present' | 'absent';
    rowIds: number[];
  }>;
}

interface AttendanceRecord {
  date: string;
  course: string;
  section: string;
  semester: string;
  periodId: string;
  subject: string;
  faculty: string;
  students: Array<{
    rollNumber: string;
    name: string;
    status: 'present' | 'absent';
  }>;
  timestamp: string;
  source: 'admin' | 'faculty';
  markedBy?: string;
}

export function AdminAttendanceSystem({ onBack, initialMode = 'mark' }: AdminAttendanceSystemProps) {
  const [mode, setMode] = useState<'mark' | 'view'>(initialMode);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [activePeriodId, setActivePeriodId] = useState<number | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [existingRecords, setExistingRecords] = useState<AttendanceRecord[]>([]);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedStudentEditor, setSelectedStudentEditor] = useState<StudentPeriodEditor | null>(null);
  const [periodDrafts, setPeriodDrafts] = useState<Record<number, 'present' | 'absent'>>({});
  const [savingPeriodEdit, setSavingPeriodEdit] = useState(false);

  const academicOptions = getAcademicOptions();
  const departments = academicOptions.departments;
  const semesters = selectedDepartment
    ? academicOptions.semestersByDepartment[selectedDepartment] || []
    : [];
  const sections = selectedDepartment
    ? academicOptions.sectionsByDepartment[selectedDepartment] || []
    : [];
  const allDailyPeriods = [1, 2, 3, 4, 5];

  const computeDailyStatus = (rows: any[]) => {
    let absentCountForDay = 0;

    for (const periodNumber of allDailyPeriods) {
      const matchingRows = rows.filter((row: any) => Number(row.period_number) === periodNumber);
      const isPresent = matchingRows.some((row: any) => String(row.status || '').toLowerCase() === 'present');
      if (!isPresent) {
        absentCountForDay += 1;
      }
    }

    return absentCountForDay < 3;
  };

  const sortStudentsByStatus = (items: Student[]) =>
    [...items].sort((a, b) => {
      if (a.isPresent !== b.isPresent) {
        return a.isPresent ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });

  // Load periods and students when filters change
  useEffect(() => {
    if (selectedDepartment && selectedSection && selectedSemester && selectedDate) {
      void loadPeriodsForDay();
      void loadStudentsForClass();
    } else {
      setPeriods([]);
      setStudents([]);
      setActivePeriodId(null);
    }
  }, [selectedDepartment, selectedSection, selectedSemester, selectedDate]);

  useEffect(() => {
    const syncAcademicOptions = () => {
      if (selectedDepartment && !getAcademicOptions().departments.includes(selectedDepartment)) {
        setSelectedDepartment('');
        setSelectedSection('');
        setSelectedSemester('');
      }
    };

    window.addEventListener('departmentsUpdated', syncAcademicOptions as EventListener);
    return () => window.removeEventListener('departmentsUpdated', syncAcademicOptions as EventListener);
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedDepartment && selectedSection && !sections.includes(selectedSection)) {
      setSelectedSection('');
    }
    if (selectedDepartment && selectedSemester && !semesters.includes(selectedSemester)) {
      setSelectedSemester('');
    }
  }, [selectedDepartment, selectedSection, selectedSemester, sections, semesters]);

  const loadPeriodsForDay = async () => {
    try {
      const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });
      const rows = await timetableAPI.getAll({
        course: selectedDepartment,
        section: selectedSection,
        semester: selectedSemester,
      });
      const dayPeriods = (rows || [])
        .filter((r: any) => r.day_of_week === dayOfWeek)
        .sort((a: any, b: any) => Number(a.period_number) - Number(b.period_number));

      setPeriods(dayPeriods.map((period: any, index: number) => ({
        id: Number(period.period_number) || index + 1,
        subject: period.subject || 'Free Period',
        time: period.time || `Period ${Number(period.period_number) || index + 1}`,
        faculty: period.faculty_name || 'N/A',
        isActive: index === 0,
        isCompleted: false,
      })));
    } catch (error) {
      console.error('Failed to load periods from backend timetable:', error);
      setPeriods([]);
    }
  };

  const loadStudentsForClass = async () => {
    try {
      const [studentRows, attendanceRows] = await Promise.all([
        studentsAPI.getAll({
          course: selectedDepartment,
          section: selectedSection,
          semester: selectedSemester,
        }),
        attendanceAPI.getAll(),
      ]);

      const dayAttendanceRows = (attendanceRows || []).filter(
        (row: any) => String(row.date || '').split('T')[0] === selectedDate,
      );

      const normalizedStudents = (studentRows || []).map((student: any) => ({
        id: Number(student.id) || 0,
        name: student.name,
        rollNumber: student.roll_number || student.register_number || student.username || '',
        registerNumber: student.register_number || '',
        username: student.username || '',
        isPresent: computeDailyStatus(
          dayAttendanceRows.filter(
            (row: any) =>
              String(row.student_roll_number || '') ===
              String(student.roll_number || student.register_number || student.username || ''),
          ),
        ),
      }));

      setStudents(sortStudentsByStatus(normalizedStudents));
    } catch (error) {
      console.error('Failed to load students from backend:', error);
      setStudents([]);
    }
  };

  const toggleAttendance = (studentId: number) => {
    setStudents(students.map(student =>
      student.id === studentId
        ? { ...student, isPresent: !student.isPresent }
        : student
    ));
  };

  const setAttendanceStatus = (studentId: number, isPresent: boolean) => {
    setStudents(sortStudentsByStatus(students.map(student =>
      student.id === studentId
        ? { ...student, isPresent }
        : student
    )));
  };

  const markAllPresent = () => {
    setStudents(sortStudentsByStatus(students.map(student => ({ ...student, isPresent: true }))));
  };

  const markAllAbsent = () => {
    setStudents(sortStudentsByStatus(students.map(student => ({ ...student, isPresent: false }))));
  };

  const handleSaveAttendance = async () => {
    if (!activePeriodId) return;

    const period = periods.find(p => p.id === activePeriodId);

    try {
      await attendanceAPI.bulkMark(
        students.map((student) => ({
          student_roll_number: student.rollNumber || student.registerNumber || student.username || '',
          date: selectedDate,
          period_number: Number(activePeriodId) || 1,
          subject: period?.subject || 'Unknown',
          status: student.isPresent ? 'present' : 'absent',
        })),
      );
    } catch (error) {
      console.error('Failed to save attendance to backend:', error);
      alert('Failed to save attendance to backend');
      return;
    }

    // Dispatch event to notify other components
    window.dispatchEvent(new Event('attendanceUpdated'));

    await loadStudentsForClass();

    // Mark period as completed
    setPeriods(periods.map(period =>
      period.id === activePeriodId
        ? { ...period, isCompleted: true, isActive: false }
        : period
    ));

    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
      setActivePeriodId(null);
    }, 2000);
  };

  const selectPeriod = (periodId: number) => {
    const period = periods.find(p => p.id === periodId);
    if (period && !period.isCompleted) {
      setActivePeriodId(periodId);
      setPeriods(periods.map(p => ({
        ...p,
        isActive: p.id === periodId,
      })));
    }
  };

  const presentCount = students.filter(s => s.isPresent).length;
  const absentCount = students.filter(s => !s.isPresent).length;
  const attendancePercentage = students.length > 0
    ? ((presentCount / students.length) * 100).toFixed(1)
    : '0';
  const selectedStudentAbsentPeriods = selectedStudentEditor
    ? selectedStudentEditor.periods.filter(
        (period) => (periodDrafts[period.periodNumber] || period.status) === 'absent',
      ).length
    : 0;
  const selectedStudentDailyStatus = selectedStudentAbsentPeriods >= 3 ? 'Absent' : 'Present';

  const hasFiltersSelected = selectedDepartment && selectedSection && selectedSemester;
  const showEmptyState = hasFiltersSelected && periods.length === 0;

  // Load existing records
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const records = await attendanceAPI.getAll();
        const normalized: AttendanceRecord[] = records.map((r: any) => ({
          date: r.date,
          course: '',
          section: '',
          semester: '',
          periodId: String(r.period_number),
          subject: r.subject,
          faculty: '',
          students: [{
            rollNumber: r.student_roll_number,
            name: r.student_roll_number,
            status: r.status,
          }],
          timestamp: r.created_at || '',
          source: 'faculty',
        }));
        setExistingRecords(normalized);
      } catch (error) {
        console.error('Failed to load attendance records:', error);
        setExistingRecords([]);
      }
    };
    void loadRecords();
  }, [refreshKey]);

  // Filter records based on search query
  const filteredRecords = existingRecords.filter(record =>
    record.date.includes(searchQuery) ||
    record.course.includes(searchQuery) ||
    record.section.includes(searchQuery) ||
    record.semester.includes(searchQuery) ||
    record.subject.includes(searchQuery) ||
    record.faculty.includes(searchQuery) ||
    record.students.some(student => student.name.includes(searchQuery) || student.rollNumber.includes(searchQuery))
  );

  const openStudentPeriodEditor = async (student: Student) => {
    try {
      const rows = await attendanceAPI.getAll();
      const dayRows = (rows || []).filter((row: any) =>
        String(row.date || '').split('T')[0] === selectedDate &&
        String(row.student_roll_number || '') === student.rollNumber,
      );

      const periodDetails = [1, 2, 3, 4, 5].map((periodNumber) => {
        const matching = dayRows.filter((row: any) => Number(row.period_number) === periodNumber);
        const configuredPeriod = periods.find((period) => Number(period.id) === periodNumber);
        return {
          periodNumber,
          subject: matching[0]?.subject || configuredPeriod?.subject || 'No class scheduled',
          status: matching.some((row: any) => String(row.status || '').toLowerCase() === 'present') ? 'present' as const : 'absent' as const,
          rowIds: matching.map((row: any) => Number(row.id)),
        };
      });

      setSelectedStudentEditor({ student, periods: periodDetails });
      setPeriodDrafts(Object.fromEntries(periodDetails.map((period) => [period.periodNumber, period.status])));
    } catch (error) {
      console.error('Failed to load period details:', error);
      alert('Failed to load period details.');
    }
  };

  const togglePeriodDraft = (periodNumber: number) => {
    setPeriodDrafts((prev) => ({
      ...prev,
      [periodNumber]: prev[periodNumber] === 'present' ? 'absent' : 'present',
    }));
  };

  const saveStudentPeriodChanges = async () => {
    if (!selectedStudentEditor) return;
    setSavingPeriodEdit(true);
    try {
      for (const period of selectedStudentEditor.periods) {
        const nextStatus = periodDrafts[period.periodNumber] || period.status;
        if (period.rowIds.length > 0) {
          if (nextStatus !== period.status) {
            for (const rowId of period.rowIds) {
              await attendanceAPI.update(rowId, { status: nextStatus });
            }
          }
          continue;
        }

        if (period.subject === 'No class scheduled') {
          continue;
        }

        await attendanceAPI.bulkMark([
          {
            student_roll_number: selectedStudentEditor.student.rollNumber,
            date: selectedDate,
            period_number: period.periodNumber,
            subject: period.subject,
            status: nextStatus,
          },
        ]);
      }

      if (activePeriodId) {
        const currentStatus = periodDrafts[activePeriodId];
        if (currentStatus) {
          setStudents((prev) =>
            sortStudentsByStatus(prev.map((student) =>
              student.id === selectedStudentEditor.student.id
                ? { ...student, isPresent: currentStatus === 'present' }
                : student,
            )),
          );
        }
      }

      window.dispatchEvent(new Event('attendanceUpdated'));
      await loadStudentsForClass();
      setSelectedStudentEditor(null);
      setPeriodDrafts({});
    } catch (error) {
      console.error('Failed to save period-wise attendance:', error);
      alert('Failed to save period-wise attendance.');
    } finally {
      setSavingPeriodEdit(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h2 className="text-white">Attendance System</h2>
            <p className="text-xs text-green-50">Mark student attendance</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-4 space-y-3">
        {/* Date Selector */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Department */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Course</label>
          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setSelectedSection('');
              setSelectedSemester('');
            }}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Select Course</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* Section */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Section</label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedDepartment}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">Select Section</option>
            {sections.map(sec => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        </div>

        {/* Semester */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Semester</label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            disabled={!selectedSection}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">Select Semester</option>
            {semesters.map(sem => (
              <option key={sem} value={sem}>{sem}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State or Content */}
      {showEmptyState ? (
        <div className="px-4 py-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No timetable found</p>
          <p className="text-sm text-gray-400">Please set up the timetable for this class first</p>
        </div>
      ) : hasFiltersSelected && periods.length > 0 ? (
        <>
          {/* Periods */}
          <div className="px-4 pb-4">
            <h3 className="text-sm text-gray-600 mb-3">Select Period</h3>
            <div className="space-y-2">
              {periods.map(period => (
                <button
                  key={period.id}
                  onClick={() => selectPeriod(period.id)}
                  disabled={period.isCompleted}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    period.isActive
                      ? 'bg-green-100 border-2 border-green-500'
                      : period.isCompleted
                      ? 'bg-gray-100 border border-gray-300 opacity-60'
                      : 'bg-white border border-gray-300 hover:border-green-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{period.subject}</span>
                        {period.isCompleted && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {period.time} • {period.faculty}
                      </div>
                    </div>
                    {period.isCompleted && (
                      <Lock className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Attendance Section */}
          {activePeriodId && students.length > 0 && (
            <>
              {/* Stats */}
              <div className="px-4 pb-4">
                <div className="bg-white rounded-xl p-4 shadow-md">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <Users className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                      <p className="text-xs text-gray-600">Total</p>
                    </div>
                    <div>
                      <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-gray-900">{presentCount}</p>
                      <p className="text-xs text-gray-600">Present</p>
                    </div>
                    <div>
                      <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-gray-900">{absentCount}</p>
                      <p className="text-xs text-gray-600">Absent</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-center text-sm text-gray-600">Attendance Percentage</p>
                    <p className="text-center text-3xl font-bold text-green-600 mt-1">{attendancePercentage}%</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="px-4 pb-4 flex gap-3">
                <button
                  onClick={markAllPresent}
                  className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors active:scale-95"
                >
                  Mark All Present
                </button>
                <button
                  onClick={markAllAbsent}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors active:scale-95"
                >
                  Mark All Absent
                </button>
              </div>

              {/* Students List */}
              <div className="px-4 pb-4">
                <h3 className="text-sm text-gray-600 mb-3">Students ({students.length})</h3>
                <div className="space-y-2">
                  {students.map(student => (
                    <div
                      key={student.id}
                      className={`p-4 rounded-xl transition-all ${
                        student.isPresent
                          ? 'bg-green-50 border-2 border-green-500'
                          : 'bg-red-50 border-2 border-red-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => void openStudentPeriodEditor(student)}
                          className="flex-1 text-left"
                        >
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-600">{student.rollNumber}</p>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAttendanceStatus(student.id, true)}
                            className={`rounded-full p-1.5 ${student.isPresent ? 'bg-green-100 text-green-700' : 'bg-white text-gray-400'}`}
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAttendanceStatus(student.id, false)}
                            className={`rounded-full p-1.5 ${!student.isPresent ? 'bg-red-100 text-red-700' : 'bg-white text-gray-400'}`}
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="px-4 pb-6">
                <button
                  onClick={handleSaveAttendance}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save Attendance
                </button>
              </div>
            </>
          )}

          {activePeriodId && students.length === 0 && (
            <div className="px-4 py-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No students found</p>
              <p className="text-sm text-gray-400">Please add students to this class first</p>
            </div>
          )}
        </>
      ) : (
        <div className="px-4 py-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Select filters to continue</p>
          <p className="text-sm text-gray-400">Choose date, course, section, and semester</p>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Attendance Saved!</h3>
            <p className="text-gray-600">The attendance has been recorded successfully.</p>
          </div>
        </div>
      )}

      {selectedStudentEditor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold">{selectedStudentEditor.student.name}</h3>
                  <p className="mt-1 text-sm text-green-50">
                    {selectedStudentEditor.student.rollNumber} • {selectedDate}
                  </p>
                  <p className="mt-2 text-sm font-medium text-white/90">
                    Daily Status: {selectedStudentDailyStatus} ({selectedStudentAbsentPeriods}/5 periods absent)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentEditor(null);
                    setPeriodDrafts({});
                  }}
                  className="rounded-full bg-white/15 p-2 transition-all hover:bg-white/25"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 px-6 py-5">
              {selectedStudentEditor.periods.map((period) => {
                const currentStatus = periodDrafts[period.periodNumber] || period.status;
                const isPresent = currentStatus === 'present';
                return (
                  <button
                    key={period.periodNumber}
                    type="button"
                    onClick={() => togglePeriodDraft(period.periodNumber)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${
                      isPresent
                        ? 'border-green-400 bg-green-50'
                        : 'border-red-400 bg-red-50'
                    }`}
                  >
                    <div>
                      <p className="text-lg font-medium text-gray-900">P{period.periodNumber} • {period.subject}</p>
                      <p className="text-sm text-gray-500">{isPresent ? 'Present' : 'Absent'}</p>
                    </div>
                    {isPresent ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentEditor(null);
                  setPeriodDrafts({});
                }}
                className="flex-1 rounded-2xl bg-gray-200 px-5 py-3 text-lg font-medium text-gray-700 transition-all hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveStudentPeriodChanges()}
                disabled={savingPeriodEdit}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-3 text-lg font-medium text-white transition-all hover:from-green-700 hover:to-emerald-700 disabled:opacity-70"
              >
                <Save className="w-5 h-5" />
                {savingPeriodEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Mode */}
      {mode === 'view' && (
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-gray-600">Attendance Records</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRefreshKey(prev => prev + 1)}
                className="py-2 px-4 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors active:scale-95"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search records..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="bg-white rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm text-gray-600">Filtered Records ({filteredRecords.length})</h4>
                <button
                  onClick={() => setMode('mark')}
                  className="py-2 px-4 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors active:scale-95"
                >
                  Mark Attendance
                </button>
              </div>

              <div className="space-y-2">
                {filteredRecords.map(record => (
                  <div
                    key={record.timestamp}
                    className="p-4 rounded-xl cursor-pointer transition-all bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{record.date}</p>
                        <p className="text-sm text-gray-600">{record.course} - {record.section} - {record.semester}</p>
                        <p className="text-sm text-gray-600">{record.subject} • {record.faculty}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Edit
                          className="w-5 h-5 text-gray-500 cursor-pointer"
                          onClick={() => setEditingRecord(record)}
                        />
                        <List
                          className="w-5 h-5 text-gray-500 cursor-pointer"
                          onClick={() => {
                            // Open a modal or a new page to view details
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
