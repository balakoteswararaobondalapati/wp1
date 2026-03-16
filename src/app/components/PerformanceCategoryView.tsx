import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';
import { ProfileAvatar } from './ProfileAvatar';
import { StudentDetailPage } from './StudentDetailPage';
import { attendanceAPI, studentsAPI } from '../api';

interface PerformanceCategoryViewProps {
  onBack: () => void;
  category: 'excellent' | 'good' | 'average' | 'below-average';
  period: 'week' | 'month' | 'semester';
  semesterFilter: string;
}

interface Student {
  id: number;
  name: string;
  regNo: string;
  course: string;
  section: string;
  semester: string;
  percentage: number;
}

export function PerformanceCategoryView({ onBack, category, period, semesterFilter }: PerformanceCategoryViewProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Load students when component mounts or category changes
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const [studentRows, attendanceRows] = await Promise.all([
          studentsAPI.getAll(),
          attendanceAPI.getAll(),
        ]);

        const today = new Date();
        const startDate = new Date(today);
        if (period === 'week') {
          startDate.setDate(today.getDate() - 7);
        } else if (period === 'month') {
          startDate.setDate(today.getDate() - 30);
        } else {
          startDate.setDate(today.getDate() - 180);
        }

        const counters = new Map<string, { present: number; total: number }>();
        (attendanceRows || []).forEach((row: any) => {
          const rowDate = new Date(String(row.date || ''));
          const roll = String(row.student_roll_number || '');
          const status = String(row.status || '').toLowerCase();
          if (
            !roll ||
            !Number.isFinite(rowDate.getTime()) ||
            rowDate < startDate ||
            rowDate > today ||
            (status !== 'present' && status !== 'absent')
          ) {
            return;
          }
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
            const percentage = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
            return {
              id: Number(student.id),
              name: student.name || student.full_name || 'Student',
              regNo: roll || registerNo,
              course: student.department || student.course || 'N/A',
              section: String(student.section || 'N/A'),
              semester: String(student.semester || 'N/A'),
              percentage: Math.round(percentage * 10) / 10,
              totalClasses: stats.total,
            };
          })
          .filter((student: any) => semesterFilter === 'all' || String(student.semester) === String(semesterFilter))
          .filter((student: any) => {
            if (category === 'excellent') return student.percentage >= 90;
            if (category === 'good') return student.percentage >= 75 && student.percentage < 90;
            if (category === 'average') return student.percentage >= 60 && student.percentage < 75;
            return student.percentage < 60 && student.totalClasses > 0;
          })
          .map(({ totalClasses, ...student }: any) => student);

        setStudents(categorized);
      } catch (error) {
        console.error('Failed to load performance category students:', error);
        setStudents([]);
      }
    };

    void loadStudents();
  }, [category, period, semesterFilter]);

  // Category details
  const categoryDetails = {
    'excellent': {
      title: 'Excellent Performance',
      subtitle: '≥90% Attendance',
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

  // Section options based on selected course
  const getSectionOptions = () => {
    switch (selectedCourse) {
      case 'BCA':
        return ['B1', 'B2'];
      case 'BCOM':
        return ['D', 'E'];
      case 'BSC':
        return ['A1', 'A2', 'B', 'C', 'D', 'G', 'K'];
      default:
        return [];
    }
  };

  const sectionOptions = getSectionOptions();

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.regNo.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = selectedCourse === 'all' || student.course === selectedCourse;
    const matchesSection = selectedSection === 'all' || student.section === selectedSection;
    const matchesSemester = selectedSemester === 'all' || student.semester === selectedSemester;

    return matchesSearch && matchesClass && matchesSection && matchesSemester;
  });

  if (selectedStudent) {
    return (
      <StudentDetailPage
        onBack={() => setSelectedStudent(null)}
        studentName={selectedStudent.name}
        studentId={selectedStudent.id}
        registrationNumber={selectedStudent.regNo}
        className={selectedStudent.course}
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
                {category === 'excellent' && 'Outstanding academic performance'}
                {category === 'good' && 'Good performance, keep it up!'}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
              >
                <option value="all">All Courses</option>
                <option value="BCA">BCA</option>
                <option value="BCOM">BCOM</option>
                <option value="BSC">BSC</option>
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
                {sectionOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
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
                <option value="I">Semester I</option>
                <option value="II">Semester II</option>
                <option value="III">Semester III</option>
                <option value="IV">Semester IV</option>
                <option value="V">Semester V</option>
                <option value="VI">Semester VI</option>
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
                  <th className="px-6 py-4 text-left text-sm font-semibold">Course</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Section</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Semester</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student, index) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.regNo}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-3">
                          <ProfileAvatar 
                            userName={student.name} 
                            size="sm" 
                            themeColor={details.color as any}
                            onClick={() => setSelectedStudent(student)}
                          />
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(student)}
                            className="text-left hover:text-blue-600 hover:underline transition-colors"
                          >
                            {student.name}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {student.course}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{student.section}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{student.semester}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                            <div
                              className={`h-2 rounded-full ${
                                student.percentage >= 90 ? 'bg-green-500' :
                                student.percentage >= 75 ? 'bg-blue-500' :
                                student.percentage >= 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${student.percentage}%` }}
                            />
                          </div>
                          <span className={`text-sm font-semibold ${
                            student.percentage >= 90 ? 'text-green-600' :
                            student.percentage >= 75 ? 'text-blue-600' :
                            student.percentage >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {student.percentage}%
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
