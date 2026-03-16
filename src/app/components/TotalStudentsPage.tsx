import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, Users, GraduationCap, Filter } from 'lucide-react';
import { StudentDetailPage } from './StudentDetailPage';
import { ProfileAvatar } from './ProfileAvatar';
import { studentsAPI } from '../api';

interface TotalStudentsPageProps {
  onBack: () => void;
}

interface Student {
  id: number;
  name: string;
  registrationNumber: string;
  semester: number;
  class: 'BCA' | 'BSc' | 'BCom';
  section: string;
  year: number;
  rollNumber: string; // Add roll number
}

export function TotalStudentsPage({ onBack }: TotalStudentsPageProps) {
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  const loadStudents = async () => {
    try {
      const rows = await studentsAPI.getAll();
      const normalized: Student[] = (rows || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        registrationNumber: s.register_number || s.roll_number || '',
        semester: parseInt(s.semester, 10) || 1,
        class: (s.course || 'BCA') as 'BCA' | 'BSc' | 'BCom',
        section: s.section || '',
        year: new Date().getFullYear(),
        rollNumber: s.roll_number || '',
        userId: s.user_id || s.email || s.username || s.id,
      })) as (Student & { userId: string | number })[];
      const unique = new Map<string | number, Student>();
      normalized.forEach((student: any) => {
        const key = student.userId ?? student.id;
        if (!unique.has(key)) {
          const { userId, ...rest } = student;
          unique.set(key, rest as Student);
        }
      });
      setAllStudents(Array.from(unique.values()));
      return;
    } catch {
      setAllStudents([]);
    }
  };
  
  // Listen for new student registrations
  React.useEffect(() => {
    const handleStudentRegistered = async () => {
      await loadStudents();
    };

    loadStudents();
    
    window.addEventListener('studentRegistered', handleStudentRegistered);
    window.addEventListener('student_profile_updated', handleStudentRegistered);
    
    return () => {
      window.removeEventListener('studentRegistered', handleStudentRegistered);
      window.removeEventListener('student_profile_updated', handleStudentRegistered);
    };
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number | 'all'>('all');
  const [selectedClass, setSelectedClass] = useState<'BCA' | 'BSc' | 'BCom' | 'all'>('all');
  const [selectedSection, setSelectedSection] = useState<string | 'all'>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Get sections based on selected class
  const availableSections = useMemo(() => {
    if (selectedClass === 'BCA') return ['B1', 'B2'];
    if (selectedClass === 'BSc') return ['A1', 'A2', 'B', 'C', 'D', 'G', 'K'];
    if (selectedClass === 'BCom') return ['D', 'E'];
    return [];
  }, [selectedClass]);

  // Reset section when class changes
  React.useEffect(() => {
    setSelectedSection('all');
  }, [selectedClass]);

  // Filter students
  const filteredStudents = useMemo(() => {
    let filtered = [...allStudents];

    // Filter by semester
    if (selectedSemester !== 'all') {
      filtered = filtered.filter(s => s.semester === selectedSemester);
    }

    // Filter by class
    if (selectedClass !== 'all') {
      filtered = filtered.filter(s => s.class === selectedClass);
    }

    // Filter by section
    if (selectedSection !== 'all') {
      filtered = filtered.filter(s => s.section === selectedSection);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.registrationNumber.toLowerCase().includes(query) ||
        s.rollNumber.toLowerCase().includes(query) || // Add roll number search
        s.class.toLowerCase().includes(query) ||
        s.year.toString().includes(query)
      );
    }

    return filtered;
  }, [allStudents, selectedSemester, selectedClass, selectedSection, searchQuery]);

  // If a student is selected, show their detail page
  if (selectedStudent) {
    return (
      <StudentDetailPage
        onBack={() => setSelectedStudent(null)}
        studentName={selectedStudent.name}
        studentId={selectedStudent.id}
        registrationNumber={selectedStudent.registrationNumber}
        className={selectedStudent.class}
        semester={selectedStudent.semester}
        section={selectedStudent.section}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-4 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-semibold text-lg">Total Students</h1>
            <p className="text-xs text-green-100">
              {filteredStudents.length} of {allStudents.length} students
            </p>
          </div>
          <div className="bg-white/20 rounded-xl px-4 py-2">
            <Users className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 pb-24">
        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg border p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, roll no., registration no., course, or year..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-400 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="bg-white rounded-2xl shadow-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-800">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Semester Dropdown */}
            <div>
              <label className="block text-xs text-gray-600 mb-1 font-medium">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-green-400 focus:outline-none transition-all bg-white"
              >
                <option value="all">All Semesters</option>
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
                <option value={3}>Semester 3</option>
                <option value={4}>Semester 4</option>
                <option value={5}>Semester 5</option>
                <option value={6}>Semester 6</option>
              </select>
            </div>

            {/* Class Dropdown */}
            <div>
              <label className="block text-xs text-gray-600 mb-1 font-medium">Course</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value as any)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-green-400 focus:outline-none transition-all bg-white"
              >
                <option value="all">All Courses</option>
                <option value="BCA">BCA</option>
                <option value="BSc">BSc</option>
                <option value="BCom">BCom</option>
              </select>
            </div>

            {/* Section Dropdown */}
            <div>
              <label className="block text-xs text-gray-600 mb-1 font-medium">Section</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                disabled={selectedClass === 'all'}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-green-400 focus:outline-none transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="all">All Sections</option>
                {availableSections.map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(selectedSemester !== 'all' || selectedClass !== 'all' || selectedSection !== 'all') && (
            <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
              {selectedSemester !== 'all' && (
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                  Sem {selectedSemester}
                </span>
              )}
              {selectedClass !== 'all' && (
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                  {selectedClass}
                </span>
              )}
              {selectedSection !== 'all' && (
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                  Section {selectedSection}
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedSemester('all');
                  setSelectedClass('all');
                  setSelectedSection('all');
                  setSearchQuery('');
                }}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Students Count Summary */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Showing Students</p>
              <p className="text-3xl font-bold">{filteredStudents.length}</p>
            </div>
            <GraduationCap className="w-12 h-12 opacity-30" />
          </div>
        </div>

        {/* Student List */}
        <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 grid grid-cols-12 gap-2 text-white font-semibold text-sm">
            <div className="col-span-1">S.No</div>
            <div className="col-span-4">Name</div>
            <div className="col-span-1">Roll</div>
            <div className="col-span-3">Registration No</div>
            <div className="col-span-2">Sem</div>
            <div className="col-span-1">Sec</div>
          </div>

          {/* Student Rows */}
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student, index) => (
              <div
                key={student.id}
                className={`px-4 py-3 grid grid-cols-12 gap-2 items-center text-sm border-b last:border-b-0 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                <div className="col-span-1">
                  <ProfileAvatar 
                    userName={student.name} 
                    size="sm" 
                    themeColor="blue"
                  />
                </div>
                <div className="col-span-4">
                  <button
                    onClick={() => setSelectedStudent(student)}
                    className="text-left hover:text-green-600 transition-colors flex flex-col"
                  >
                    <p className="font-semibold text-gray-800 hover:underline cursor-pointer">{student.name}</p>
                    <p className="text-xs text-gray-500">{student.class}</p>
                  </button>
                </div>
                <div className="col-span-1">
                  <p className="font-mono text-gray-700 text-xs font-medium">{student.rollNumber || 'N/A'}</p>
                </div>
                <div className="col-span-3">
                  <p className="font-mono text-gray-700 text-xs">{student.registrationNumber}</p>
                </div>
                <div className="col-span-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                    Sem {student.semester}
                  </span>
                </div>
                <div className="col-span-1">
                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                    {student.section}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No records available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
