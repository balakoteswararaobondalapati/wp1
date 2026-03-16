import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';
import { StudentDetailPage } from './StudentDetailPage';
import { attendanceAPI, studentsAPI } from '../api';

interface AttendanceCategoryViewProps {
  onBack: () => void;
  category: 'excellent' | 'good' | 'average' | 'below-average';
}

interface Student {
  id: number;
  name: string;
  regNo: string;
  class: string;
  section: string;
  semester: string;
  attendancePercentage: number;
}

export function AttendanceCategoryView({ onBack, category }: AttendanceCategoryViewProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Listen for attendance updates
  useEffect(() => {
    const handleAttendanceUpdate = () => {
      console.log('🔔 Attendance updated! Refreshing category view...');
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);
    return () => {
      window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
    };
  }, []);

  // Reload students from backend when category/attendance changes.
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const [studentRows, attendanceRows] = await Promise.all([
          studentsAPI.getAll(),
          attendanceAPI.getAll(),
        ]);

        const counters = new Map<string, { present: number; total: number }>();
        (attendanceRows || []).forEach((row: any) => {
          const roll = String(row.student_roll_number || '');
          const status = String(row.status || '').toLowerCase();
          if (!roll || (status !== 'present' && status !== 'absent')) return;
          const bucket = counters.get(roll) || { present: 0, total: 0 };
          bucket.total += 1;
          if (status === 'present') bucket.present += 1;
          counters.set(roll, bucket);
        });

        const categorized = (studentRows || [])
          .map((student: any) => {
            const roll = String(student.roll_number || '');
            const registerNo = String(student.register_number || '');
            const stats =
              counters.get(roll) ||
              counters.get(registerNo) ||
              { present: 0, total: 0 };
            const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
            return {
              id: Number(student.id),
              name: student.name || student.full_name || 'Student',
              regNo: roll || registerNo,
              class: student.department || student.course || 'N/A',
              section: String(student.section || 'N/A'),
              semester: String(student.semester || 'N/A'),
              attendancePercentage: percentage,
              totalClasses: stats.total,
            };
          })
          .filter((student: any) => {
            if (category === 'excellent') return student.attendancePercentage >= 90;
            if (category === 'good') return student.attendancePercentage >= 75 && student.attendancePercentage < 90;
            if (category === 'average') return student.attendancePercentage >= 60 && student.attendancePercentage < 75;
            return student.attendancePercentage < 60 && student.totalClasses > 0;
          })
          .map(({ totalClasses, ...student }: any) => student);

        setStudents(categorized);
      } catch (error) {
        console.error('Failed to load attendance category students:', error);
        setStudents([]);
      }
    };

    void loadStudents();
  }, [category, refreshKey]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState('all');

  // Category details
  const categoryDetails = {
    'excellent': {
      title: 'Excellent Performance',
      subtitle: '90% - 100% Attendance',
      color: 'green',
      icon: Award,
      gradient: 'from-green-600 to-emerald-600',
      bg: 'bg-green-50',
      border: 'border-green-500',
      text: 'text-green-600',
    },
    'good': {
      title: 'Good Performance',
      subtitle: '75% - 89% Attendance',
      color: 'blue',
      icon: TrendingUp,
      gradient: 'from-blue-600 to-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      text: 'text-blue-600',
    },
    'average': {
      title: 'Average Performance',
      subtitle: '60% - 74% Attendance',
      color: 'yellow',
      icon: Minus,
      gradient: 'from-yellow-600 to-orange-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-500',
      text: 'text-yellow-600',
    },
    'below-average': {
      title: 'Below Average Performance',
      subtitle: 'Below 60% Attendance',
      color: 'red',
      icon: TrendingDown,
      gradient: 'from-red-600 to-red-700',
      bg: 'bg-red-50',
      border: 'border-red-500',
      text: 'text-red-600',
    },
  };

  const details = categoryDetails[category];
  const Icon = details.icon;

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.regNo.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = selectedClass === 'all' || student.class === selectedClass;
    const matchesSection = selectedSection === 'all' || student.section === selectedSection;
    const matchesSemester = selectedSemester === 'all' || student.semester === selectedSemester;

    return matchesSearch && matchesClass && matchesSection && matchesSemester;
  });

  const classOptions = Array.from(new Set(students.map((s) => s.class))).sort();
  const sectionOptions = Array.from(new Set(students.map((s) => s.section))).sort();
  const semesterOptions = Array.from(new Set(students.map((s) => s.semester))).sort();

  if (selectedStudent) {
    return (
      <StudentDetailPage
        onBack={() => setSelectedStudent(null)}
        studentName={selectedStudent.name}
        studentId={selectedStudent.id}
        registrationNumber={selectedStudent.regNo}
        className={selectedStudent.class}
        semester={Number.parseInt(selectedStudent.semester, 10) || 1}
        section={selectedStudent.section}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white font-['Poppins',sans-serif]">
      {/* Header */}
      <div className={`bg-gradient-to-r ${details.gradient} shadow-lg sticky top-0 z-10`}>
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h2 className="text-white">{details.title}</h2>
            <p className="text-white/80 text-sm">{details.subtitle} • {filteredStudents.length} students</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Card */}
        <div className={`${details.bg} rounded-2xl p-6 shadow-lg border-l-4 ${details.border}`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 bg-white rounded-xl flex items-center justify-center`}>
              <Icon className={`w-8 h-8 ${details.text}`} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{students.length} Students</h3>
              <p className="text-gray-600">
                {category === 'excellent' && 'Outstanding attendance record'}
                {category === 'good' && 'Good attendance, keep it up!'}
                {category === 'average' && 'Room for improvement'}
                {category === 'below-average' && 'Needs immediate attention'}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-lg space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or registration number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
              >
                <option value="all">All Classes</option>
                {classOptions.map((course) => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
              >
                <option value="all">All Sections</option>
                {sectionOptions.map((section) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
              >
                <option value="all">All Semesters</option>
                {semesterOptions.map((semester) => (
                  <option key={semester} value={semester}>{`Semester ${semester}`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`bg-gradient-to-r ${details.gradient} text-white`}>
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">S.No</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Reg No</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Student Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Class</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Section</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Semester</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student, index) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.regNo}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(student)}
                          className="text-left hover:text-blue-600 hover:underline transition-colors"
                        >
                          {student.name}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {student.class}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{student.section}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{student.semester}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                            <div
                              className={`h-2 rounded-full ${
                                student.attendancePercentage >= 90 ? 'bg-green-500' :
                                student.attendancePercentage >= 75 ? 'bg-blue-500' :
                                student.attendancePercentage >= 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${student.attendancePercentage}%` }}
                            />
                          </div>
                          <span className={`text-sm font-semibold ${
                            student.attendancePercentage >= 90 ? 'text-green-600' :
                            student.attendancePercentage >= 75 ? 'text-blue-600' :
                            student.attendancePercentage >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {student.attendancePercentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Icon className={`w-16 h-16 ${details.text} opacity-30 mb-3`} />
                        <p className="text-gray-500">No students found</p>
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
