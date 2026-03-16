import React, { useState } from 'react';
import { attendanceAPI, studentsAPI } from '../api';
import {
  ArrowLeft,
  Calendar,
  Users,
  Check,
  X,
  CheckCircle2,
  Search,
  Lock,
  XCircle
} from 'lucide-react';

interface AddAttendancePageProps {
  onBack: () => void;
  autoFillData?: {
    period: string;
    subject: string;
    class: string;
    time: string;
    room: string;
  } | null;
  onAttendanceMarked?: (periodId: string) => void;
}

interface Student {
  id: number;
  name: string;
  rollNumber: string;
  registerId?: string; // Original student ID for tracking
  isPresent: boolean;
}

export function AddAttendancePage({ onBack, autoFillData, onAttendanceMarked }: AddAttendancePageProps) {
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [selectedDate] = useState(autoFillData ? getTodayDate() : '');
  const [selectedClass] = useState(autoFillData?.class || '');
  const [selectedSubject] = useState(autoFillData?.subject || '');
  const [selectedPeriod] = useState(autoFillData?.period || '');

  const [students, setStudents] = useState<Student[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isTeacherAbsent, setIsTeacherAbsent] = useState(false);
  const [isAdminLocked, setIsAdminLocked] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyAbsentees, setShowOnlyAbsentees] = useState(false);

  // Check lock status from backend on page load
  React.useEffect(() => {
    if (!selectedDate || !selectedClass || !selectedPeriod) return;

    const checkLocks = async () => {
      try {
        const lock = await attendanceAPI.lockStatus();
        setIsAdminLocked(Boolean(lock?.locked));
      } catch {
        setIsAdminLocked(false);
      }
      setIsTeacherAbsent(false);
    };

    void checkLocks();
  }, [selectedDate, selectedClass, selectedPeriod]);

  // Load registered students based on the class
  const loadStudentsForClass = async (classStr: string) => {
    try {
      // Parse class info to extract department, section, semester
      // Expected format: "BCA B1 - Sem 1" or "BSc A1 - Sem 3"
      const parseClassInfo = (classStr: string) => {
        const parts = classStr.split(' - ');
        if (parts.length < 2) return { department: '', section: '', semester: '' };
        
        const [courseSection, semPart] = parts;
        const courseSectionParts = courseSection.split(' ');
        
        if (courseSectionParts.length < 2) return { department: '', section: '', semester: '' };
        
        const department = courseSectionParts[0]; // e.g., "BCA", "BSc", "BCom"
        const section = courseSectionParts[1]; // e.g., "B1", "A1", "D"
        const semester = semPart.replace('Sem ', '').trim(); // e.g., "1", "3", "6"
        
        return { department, section, semester };
      };

      const classInfo = parseClassInfo(classStr);
      
      if (!classInfo) {
        console.log('Could not parse class info:', classStr);
        setStudents([]);
        return;
      }

      const matchingStudents = await studentsAPI.getAll({
        course: classInfo.department,
        section: classInfo.section,
        semester: classInfo.semester,
      });

      console.log(`Found ${matchingStudents.length} students for ${classStr}:`, matchingStudents);

      // Convert to the format expected by the component
      const formattedStudents = matchingStudents.map((student: any) => ({
        id: Number(student.id) || 0,
        name: student.name || 'Unknown',
        rollNumber: student.roll_number || student.register_number || student.username || 'N/A',
        registerId: student.register_number || student.roll_number || student.username,
        isPresent: true // Default to present
      }));

      setStudents(formattedStudents);
    } catch (error) {
      console.error('Error loading students for class:', error);
      setStudents([]);
    }
  };

  React.useEffect(() => {
    if (selectedDate && selectedClass && selectedSubject && selectedPeriod) {
      void loadStudentsForClass(selectedClass);
    }
  }, [selectedDate, selectedClass, selectedSubject, selectedPeriod]);

  const toggleAttendance = (id: number) => {
    setStudents(s =>
      s.map(st => (st.id === id ? { ...st, isPresent: !st.isPresent } : st))
    );
  };

  const presentCount = students.filter(s => s.isPresent).length;
  const absentCount = students.filter(s => !s.isPresent).length;

  const isNumeric = (str: string) => /^\d+$/.test(str);
  const isRegFormat = (str: string) => /^[Yy]\d/.test(str);

  const filteredStudents = students.filter((student, index) => {
    if (showOnlyAbsentees && student.isPresent) return false;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    if (isRegFormat(query)) {
      return student.rollNumber.toLowerCase().includes(query);
    }

    if (isNumeric(query)) {
      const serial = (index + 1).toString();
      return serial.includes(query) || student.rollNumber.includes(query);
    }

    return student.name.toLowerCase().includes(query);
  });
const handleSubmitAttendance = async () => {
  setShowConfirmDialog(false); // close confirm popup

  // Check if teacher is absent or admin has locked attendance
  if (isTeacherAbsent) {
    alert('❌ Cannot submit attendance: You are marked as absent for today.');
    return;
  }

  if (isAdminLocked) {
    alert('❌ Cannot submit attendance: Admin has already taken attendance for this period.');
    return;
  }
  try {
    const periodNumber = Number(String(selectedPeriod).replace(/\D/g, '')) || 1;
    await attendanceAPI.bulkMark(
      students.map((student) => ({
          student_roll_number: student.rollNumber !== 'N/A' ? student.rollNumber : (student.registerId || ''),
        date: selectedDate,
        period_number: periodNumber,
        subject: selectedSubject,
        status: student.isPresent ? 'present' : 'absent',
      })),
    );
    window.dispatchEvent(new Event('attendanceUpdated'));
  } catch (error) {
    console.error('Failed to submit attendance to backend:', error);
    alert('Failed to submit attendance to backend');
    return;
  }

  setShowConfirmation(true);   // show success

  setTimeout(() => {
    setShowConfirmation(false);
    onBack();
    if (onAttendanceMarked) {
      onAttendanceMarked(selectedPeriod);
    }
  }, 3000);
};


  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 flex flex-col font-['Poppins',sans-serif]">

      {/* Header */}
      <div className="bg-red-400 to red-500 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack}>
          <ArrowLeft className="text-white w-6 h-6" />
        </button>
        <div>
          <h2 className="text-white">Mark Attendance</h2>
          <p className="text-xs text-blue-100 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Auto-filled from Today’s Schedule
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-32 space-y-6 max-w-4xl mx-auto w-full">

        {/* Warning Banner for Teacher Absent */}
        {isTeacherAbsent && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 text-sm">Attendance Locked - You are Absent</h4>
              <p className="text-xs text-red-700 mt-1">
                You are marked as Absent for today. You cannot take attendance while marked absent. Please contact the admin if this is incorrect.
              </p>
            </div>
          </div>
        )}

        {/* Warning Banner for Admin Already Took Attendance */}
        {isAdminLocked && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-orange-900 text-sm">Attendance Locked - Admin Submitted</h4>
              <p className="text-xs text-orange-700 mt-1">
                The admin has already taken attendance for this class and period. This attendance is locked and cannot be modified by faculty.
              </p>
            </div>
          </div>
        )}

        {/* Class Information (LOCKED) */}
        <div className="bg-white rounded-2xl shadow-lg border p-6 space-y-4">
          <h3 className="flex items-center gap-2 text-gray-900">
            <Calendar className="w-5 h-5 text-blue-600" />
            Class Information
            <span className="ml-auto text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3" /> Locked
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input value={selectedDate} disabled className="bg-gray-100 border rounded-xl px-4 py-3" />
            <input value={selectedClass} disabled className="bg-gray-100 border rounded-xl px-4 py-3" />
            <input value={selectedSubject} disabled className="bg-gray-100 border rounded-xl px-4 py-3" />
            <input value={selectedPeriod} disabled className="bg-gray-100 border rounded-xl px-4 py-3" />
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="bg-white rounded-2xl shadow-lg border p-6">
          <h3 className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            Attendance Summary
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl text-center">
              <p className="text-2xl text-blue-600">{students.length}</p>
              <p className="text-xs">Total</p>
            </div>

            <div className="bg-green-50 p-4 rounded-xl text-center">
              <p className="text-2xl text-green-600">{presentCount}</p>
              <p className="text-xs">Present</p>
            </div>

            <button
              onClick={() => setShowOnlyAbsentees(prev => !prev)}
              className={`p-4 rounded-xl text-center transition ${
                showOnlyAbsentees
                  ? 'bg-red-200 border border-red-400'
                  : 'bg-red-50 hover:bg-red-100'
              }`}
            >
              <p className="text-2xl text-red-600">{absentCount}</p>
              <p className="text-xs">Absent</p>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl shadow-lg border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name / roll no / reg no"
              className="w-full pl-10 pr-4 py-2.5 border rounded-xl"
            />
          </div>
        </div>

        {/* Student List */}
        <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
          {students.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-gray-700 font-semibold mb-2">No Students Found</h3>
              <p className="text-sm text-gray-500">
                No registered students found for this class. Please register students in the Admin portal first.
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-gray-700 font-semibold mb-2">No Results Found</h3>
              <p className="text-sm text-gray-500">
                No students match your search criteria. Try a different search term.
              </p>
            </div>
          ) : (
            filteredStudents.map((student, index) => (
              <div key={student.id} className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm">{student.name}</p>
                    <p className="text-xs text-gray-500">{student.rollNumber}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => !isTeacherAbsent && !isAdminLocked && toggleAttendance(student.id)}
                    disabled={isTeacherAbsent || isAdminLocked}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      student.isPresent
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                    } ${isTeacherAbsent || isAdminLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Check />
                  </button>

                  <button
                    onClick={() => !isTeacherAbsent && !isAdminLocked && toggleAttendance(student.id)}
                    disabled={isTeacherAbsent || isAdminLocked}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      !student.isPresent
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-400'
                    } ${isTeacherAbsent || isAdminLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <X />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Fixed Footer Submit */}
<div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-20">
       <button
  onClick={() => !isTeacherAbsent && !isAdminLocked && setShowConfirmDialog(true)}
  disabled={isTeacherAbsent || isAdminLocked}
  className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all ${
    isTeacherAbsent || isAdminLocked 
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-98'
  }`}
>
          <CheckCircle2 />
          {isTeacherAbsent ? 'Attendance Locked - You are Absent' : isAdminLocked ? 'Attendance Locked - Admin Submitted' : 'Mark Attendance'}
        </button>
      </div>
{/* Confirm Submit Dialog */}
{showConfirmDialog && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30">
    <div className="bg-white rounded-2xl p-6 w-[90%] max-w-sm text-center">
      <h3 className="text-lg font-semibold mb-2">
        Confirm Attendance
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Are you sure you want to submit attendance for this class?
        Once submitted, it cannot be edited.
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => setShowConfirmDialog(false)}
          className="flex-1 py-3 rounded-xl border text-gray-700"
        >
          Cancel
        </button>

        <button
          onClick={handleSubmitAttendance}
          className="flex-1 py-3 rounded-xl bg-blue-600 text-white"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
)}

      {/* Confirmation */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30">
          <div className="bg-white rounded-xl p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
            <p className="font-medium">Attendance Marked Successfully</p>
            <p className="text-xs text-gray-500 mt-1">
              Synced with Student & Principal dashboards
            </p>
          </div>
        </div>
      )}
    </div>
  );
}




