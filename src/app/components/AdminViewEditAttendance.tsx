import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Pencil,
  Save,
  Search,
  UserRound,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { attendanceAPI, studentsAPI, timetableAPI } from '../api';
import { getAcademicOptions } from '../utils/academicConfig';

interface AdminViewEditAttendanceProps {
  onBack: () => void;
}

interface StudentMeta {
  name: string;
  rollNumber: string;
  course: string;
  section: string;
  semester: string;
}

interface StudentPeriod {
  periodNumber: number;
  subject: string;
  status: 'present' | 'absent';
  rowIds: number[];
}

interface GroupStudent {
  rollNumber: string;
  name: string;
  status: 'present' | 'absent';
  periods: StudentPeriod[];
}

interface AttendanceGroup {
  key: string;
  date: string;
  course: string;
  section: string;
  semester: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  rate: string;
  students: GroupStudent[];
}

const fivePeriods = [1, 2, 3, 4, 5];

const computeOverallStatus = (periods: StudentPeriod[]): 'present' | 'absent' => {
  const absentCount = periods.filter((period) => period.status === 'absent').length;
  return absentCount >= 3 ? 'absent' : 'present';
};

const getDayOfWeek = (dateValue: string) =>
  new Date(dateValue).toLocaleDateString('en-US', { weekday: 'long' });

export function AdminViewEditAttendance({ onBack }: AdminViewEditAttendanceProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [groups, setGroups] = useState<AttendanceGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<AttendanceGroup | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<GroupStudent | null>(null);
  const [periodDrafts, setPeriodDrafts] = useState<Record<number, 'present' | 'absent'>>({});
  const [saving, setSaving] = useState(false);

  const academicOptions = getAcademicOptions();
  const departments = academicOptions.departments;
  const sections = useMemo(
    () => (selectedDepartment ? academicOptions.sectionsByDepartment[selectedDepartment] || [] : []),
    [academicOptions.sectionsByDepartment, selectedDepartment],
  );
  const semesters = useMemo(
    () => (selectedDepartment ? academicOptions.semestersByDepartment[selectedDepartment] || [] : []),
    [academicOptions.semestersByDepartment, selectedDepartment],
  );

  useEffect(() => {
    if (selectedDepartment && selectedSection && !sections.includes(selectedSection)) {
      setSelectedSection('');
    }
    if (selectedDepartment && selectedSemester && !semesters.includes(selectedSemester)) {
      setSelectedSemester('');
    }
  }, [selectedDepartment, selectedSection, selectedSemester, sections, semesters]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const [attendanceRows, studentRows, timetableRows] = await Promise.all([
        attendanceAPI.getAll(),
        studentsAPI.getAll(
          selectedDepartment && selectedSection && selectedSemester
            ? { course: selectedDepartment, section: selectedSection, semester: selectedSemester }
            : undefined,
        ),
        timetableAPI.getAll(
          selectedDepartment && selectedSection && selectedSemester
            ? { course: selectedDepartment, section: selectedSection, semester: selectedSemester }
            : undefined,
        ),
      ]);

      const timetableMap = new Map<string, Map<number, string>>();
      (timetableRows || []).forEach((row: any) => {
        const course = String(row.course || '').trim();
        const section = String(row.section || '').trim();
        const semester = String(row.semester || '').trim();
        const day = String(row.day_of_week || '').trim();
        const periodNumber = Number(row.period_number || 0);
        if (!course || !section || !semester || !day || !periodNumber) return;
        const key = [course, section, semester, day].join('|');
        if (!timetableMap.has(key)) {
          timetableMap.set(key, new Map<number, string>());
        }
        timetableMap.get(key)!.set(periodNumber, String(row.subject || '').trim() || 'No class scheduled');
      });

      const studentMap = new Map<string, StudentMeta>();
      (studentRows || []).forEach((student: any) => {
        const rollNumber = String(student.roll_number || student.register_number || '').trim();
        if (!rollNumber) return;
        studentMap.set(rollNumber, {
          name: student.name || rollNumber,
          rollNumber,
          course: String(student.course || student.department || ''),
          section: String(student.section || ''),
          semester: String(student.semester || ''),
        });
      });

      const grouped = new Map<
        string,
        Map<
          string,
          {
            meta: StudentMeta;
            periods: Map<number, StudentPeriod>;
          }
        >
      >();

      (attendanceRows || []).forEach((row: any) => {
        const rowDate = String(row.date || '').split('T')[0];
        const rollNumber = String(row.student_roll_number || '').trim();
        const meta = studentMap.get(rollNumber);
        const periodNumber = Number(row.period_number || 0);

        if (!rowDate || !rollNumber || !meta || !periodNumber) return;
        if (selectedDate && rowDate !== selectedDate) return;
        if (selectedDepartment && meta.course !== selectedDepartment) return;
        if (selectedSection && meta.section !== selectedSection) return;
        if (selectedSemester && meta.semester !== selectedSemester) return;

        const timetableKey = [meta.course, meta.section, meta.semester, getDayOfWeek(rowDate)].join('|');
        const subjectMap = timetableMap.get(timetableKey);
        const groupKey = [rowDate, meta.course, meta.section, meta.semester].join('|');
        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, new Map());
        }

        const studentsMap = grouped.get(groupKey)!;
        if (!studentsMap.has(rollNumber)) {
          studentsMap.set(rollNumber, {
            meta,
            periods: new Map(),
          });
        }

        const studentBucket = studentsMap.get(rollNumber)!;
        if (!studentBucket.periods.has(periodNumber)) {
          studentBucket.periods.set(periodNumber, {
            periodNumber,
            subject: String(row.subject || '').trim() || subjectMap?.get(periodNumber) || 'No class scheduled',
            status: row.status === 'absent' ? 'absent' : 'present',
            rowIds: [],
          });
        }

        const periodBucket = studentBucket.periods.get(periodNumber)!;
        periodBucket.rowIds.push(Number(row.id));
        periodBucket.status = row.status === 'absent' ? 'absent' : 'present';
        if (!periodBucket.subject && row.subject) {
          periodBucket.subject = String(row.subject);
        }
      });

      const normalized = Array.from(grouped.entries()).map(([key, studentsMap]) => {
        const [date, course, section, semester] = key.split('|');
        const students = Array.from(studentsMap.values())
          .map(({ meta, periods }) => {
            const timetableKey = [meta.course, meta.section, meta.semester, getDayOfWeek(date)].join('|');
            const subjectMap = timetableMap.get(timetableKey);
            const fullPeriods = fivePeriods.map((periodNumber) => {
              const existing = periods.get(periodNumber);
              return existing || {
                periodNumber,
                subject: subjectMap?.get(periodNumber) || 'No class scheduled',
                status: 'absent' as const,
                rowIds: [],
              };
            });

            return {
              rollNumber: meta.rollNumber,
              name: meta.name,
              status: computeOverallStatus(fullPeriods),
              periods: fullPeriods,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        const presentCount = students.filter((student) => student.status === 'present').length;
        const absentCount = students.length - presentCount;

        return {
          key,
          date,
          course,
          section,
          semester,
          totalStudents: students.length,
          presentCount,
          absentCount,
          rate: students.length > 0 ? ((presentCount / students.length) * 100).toFixed(1) : '0.0',
          students,
        };
      });

      const filtered = normalized.filter((group) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        return (
          `${group.course} ${group.section} ${group.semester}`.toLowerCase().includes(query) ||
          group.students.some(
            (student) =>
              student.name.toLowerCase().includes(query) ||
              student.rollNumber.toLowerCase().includes(query),
          )
        );
      });

      setGroups(filtered.sort((a, b) => (a.key < b.key ? 1 : -1)));

      if (selectedGroup) {
        const refreshedGroup = filtered.find((group) => group.key === selectedGroup.key) || null;
        setSelectedGroup(refreshedGroup);
        if (selectedStudent && refreshedGroup) {
          const refreshedStudent =
            refreshedGroup.students.find((student) => student.rollNumber === selectedStudent.rollNumber) || null;
          setSelectedStudent(refreshedStudent);
          if (refreshedStudent) {
            setPeriodDrafts(
              Object.fromEntries(
                refreshedStudent.periods.map((period) => [period.periodNumber, period.status]),
              ),
            );
          }
        }
      }
    } catch (error) {
      console.error('Failed to load attendance groups:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGroups();
  }, [selectedDate, selectedDepartment, selectedSection, selectedSemester, searchQuery]);

  const openStudentEditor = (student: GroupStudent) => {
    setSelectedStudent(student);
    setPeriodDrafts(
      Object.fromEntries(student.periods.map((period) => [period.periodNumber, period.status])),
    );
  };

  const togglePeriodStatus = (periodNumber: number) => {
    setPeriodDrafts((prev) => ({
      ...prev,
      [periodNumber]: prev[periodNumber] === 'present' ? 'absent' : 'present',
    }));
  };

  const savePeriodChanges = async () => {
    if (!selectedGroup || !selectedStudent) return;
    setSaving(true);
    try {
      for (const period of selectedStudent.periods) {
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
            student_roll_number: selectedStudent.rollNumber,
            date: selectedGroup.date,
            period_number: period.periodNumber,
            subject: period.subject || `Period ${period.periodNumber}`,
            status: nextStatus,
          },
        ]);
      }

      window.dispatchEvent(new Event('attendanceUpdated'));
      setSelectedStudent(null);
      setPeriodDrafts({});
      await loadGroups();
    } catch (error) {
      console.error('Failed to save period changes:', error);
      alert('Failed to save period-wise attendance changes.');
    } finally {
      setSaving(false);
    }
  };

  const modalPresent = selectedStudent
    ? selectedStudent.periods.filter(
        (period) => (periodDrafts[period.periodNumber] || period.status) === 'present',
      ).length
    : 0;
  const modalAbsent = fivePeriods.length - modalPresent;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 font-[Poppins,sans-serif]">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h2 className="text-white">View & Edit Attendance</h2>
            <p className="text-xs text-green-50">View and modify attendance records</p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-5">
        <div className="grid gap-3 md:grid-cols-5">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-2xl border border-gray-300 bg-white px-4 py-3"
          />
          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setSelectedSection('');
              setSelectedSemester('');
            }}
            className="rounded-2xl border border-gray-300 bg-white px-4 py-3"
          >
            <option value="">All Courses</option>
            {departments.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedDepartment}
            className="rounded-2xl border border-gray-300 bg-white px-4 py-3 disabled:bg-gray-100"
          >
            <option value="">All Sections</option>
            {sections.map((section) => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            disabled={!selectedDepartment}
            className="rounded-2xl border border-gray-300 bg-white px-4 py-3 disabled:bg-gray-100"
          >
            <option value="">All Semesters</option>
            {semesters.map((semester) => (
              <option key={semester} value={semester}>{semester}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student/class"
              className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-10 pr-4"
            />
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {loading && (
            <div className="rounded-3xl border border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500">
              Loading attendance records...
            </div>
          )}

          {!loading && groups.map((group) => (
            <div
              key={group.key}
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-900">{group.date}</span>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">Admin</span>
                  </div>
                  <p className="mt-2 text-lg text-gray-700">{group.course} - {group.section} - Sem {group.semester}</p>
                  <p className="text-sm text-gray-400">N/A • N/A</p>
                </div>
                <button
                  onClick={() => setSelectedGroup(group)}
                  className="rounded-2xl bg-green-100 p-3 text-green-700 transition-all hover:bg-green-200"
                  aria-label="Edit attendance group"
                >
                  <Pencil className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-4">
                <div className="text-center">
                  <Users className="mx-auto mb-1 h-5 w-5 text-blue-500" />
                  <p className="text-3xl font-bold text-gray-900">{group.totalStudents}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
                <div className="text-center">
                  <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-green-500" />
                  <p className="text-3xl font-bold text-gray-900">{group.presentCount}</p>
                  <p className="text-sm text-gray-500">Present</p>
                </div>
                <div className="text-center">
                  <XCircle className="mx-auto mb-1 h-5 w-5 text-red-500" />
                  <p className="text-3xl font-bold text-gray-900">{group.absentCount}</p>
                  <p className="text-sm text-gray-500">Absent</p>
                </div>
                <div className="text-center">
                  <CalendarDays className="mx-auto mb-1 h-5 w-5 text-green-500" />
                  <p className="text-3xl font-bold text-green-600">{group.rate}%</p>
                  <p className="text-sm text-gray-500">Rate</p>
                </div>
              </div>
            </div>
          ))}

          {!loading && groups.length === 0 && (
            <div className="rounded-3xl border border-gray-200 bg-white px-5 py-12 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-base text-gray-600">No attendance records found for the selected filters.</p>
            </div>
          )}
        </div>
      </div>

      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-semibold">Edit Attendance</h3>
                  <p className="mt-1 text-sm text-green-50">
                    {selectedGroup.date} • {selectedGroup.course} - {selectedGroup.section}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGroup(null);
                    setSelectedStudent(null);
                    setPeriodDrafts({});
                  }}
                  className="rounded-full bg-white/15 p-2 transition-all hover:bg-white/25"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="border-b border-gray-100 px-6 py-5">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <UserRound className="mx-auto mb-1 h-5 w-5 text-blue-500" />
                  <p className="text-3xl font-bold text-gray-900">{selectedGroup.totalStudents}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
                <div>
                  <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-green-500" />
                  <p className="text-3xl font-bold text-gray-900">{selectedGroup.presentCount}</p>
                  <p className="text-sm text-gray-500">Present</p>
                </div>
                <div>
                  <XCircle className="mx-auto mb-1 h-5 w-5 text-red-500" />
                  <p className="text-3xl font-bold text-gray-900">{selectedGroup.absentCount}</p>
                  <p className="text-sm text-gray-500">Absent</p>
                </div>
              </div>
              <div className="mt-3 text-center">
                <p className="text-5xl font-bold text-green-600">{selectedGroup.rate}%</p>
                <p className="text-sm text-gray-500">Attendance Rate</p>
              </div>
            </div>

            <div className="max-h-[42vh] overflow-y-auto px-6 py-5">
              <h4 className="mb-4 text-xl font-medium text-gray-900">Students</h4>
              <div className="space-y-3">
                {selectedGroup.students.map((student) => {
                  const isPresent = student.status === 'present';
                  return (
                    <button
                      key={student.rollNumber}
                      type="button"
                      onClick={() => openStudentEditor(student)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all ${
                        isPresent
                          ? 'border-green-400 bg-green-50'
                          : 'border-red-400 bg-red-50'
                      }`}
                    >
                      <div>
                        <p className="text-2xl font-medium text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-500">{student.rollNumber}</p>
                      </div>
                      {isPresent ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedGroup(null);
                  setSelectedStudent(null);
                  setPeriodDrafts({});
                }}
                className="w-full rounded-2xl bg-gray-200 px-5 py-3 text-lg font-medium text-gray-700 transition-all hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedGroup && selectedStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold">{selectedStudent.name}</h3>
                  <p className="mt-1 text-sm text-green-50">
                    {selectedStudent.rollNumber} • {selectedGroup.date}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setPeriodDrafts({});
                  }}
                  className="rounded-full bg-white/15 p-2 transition-all hover:bg-white/25"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="border-b border-gray-100 px-6 py-5">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <UserRound className="mx-auto mb-1 h-5 w-5 text-blue-500" />
                  <p className="text-3xl font-bold text-gray-900">5</p>
                  <p className="text-sm text-gray-500">Periods</p>
                </div>
                <div>
                  <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-green-500" />
                  <p className="text-3xl font-bold text-gray-900">{modalPresent}</p>
                  <p className="text-sm text-gray-500">Present</p>
                </div>
                <div>
                  <XCircle className="mx-auto mb-1 h-5 w-5 text-red-500" />
                  <p className="text-3xl font-bold text-gray-900">{modalAbsent}</p>
                  <p className="text-sm text-gray-500">Absent</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 px-6 py-5">
              {selectedStudent.periods.map((period) => {
                const currentStatus = periodDrafts[period.periodNumber] || period.status;
                const isPresent = currentStatus === 'present';
                return (
                  <button
                    key={period.periodNumber}
                    type="button"
                    onClick={() => togglePeriodStatus(period.periodNumber)}
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
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                  setPeriodDrafts({});
                }}
                className="flex-1 rounded-2xl bg-gray-200 px-5 py-3 text-lg font-medium text-gray-700 transition-all hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void savePeriodChanges()}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 px-5 py-3 text-lg font-medium text-white transition-all hover:from-green-700 hover:to-emerald-700 disabled:opacity-70"
              >
                <Save className="h-5 w-5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
