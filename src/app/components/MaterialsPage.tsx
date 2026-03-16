import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { materialsAPI } from '../api';
import { appStorage } from './';

interface MaterialsPageProps {
  onBack: () => void;
  onSubjectClick: (subjectName: string) => void;
}

interface Subject {
  id: number;
  name: string;
  semester: number;
  materials: number;
}

export function MaterialsPage({ onBack, onSubjectClick }: MaterialsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number | 'all'>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [studentSemester, setStudentSemester] = useState<number>(1);
  const [studentProfile, setStudentProfile] = useState<{
    department: string;
    section: string;
    semester: string;
  }>({ department: '', section: '', semester: '' });

  // Load student profile and materials data on mount
  useEffect(() => {
    // Function to load student profile
    const loadStudentProfile = () => {
      const currentUser = appStorage.getItem('current_user');
      if (currentUser) {
        try {
          const user = JSON.parse(currentUser);
          
          // Try to get detailed profile from registered_students
          const registeredStudents = JSON.parse(appStorage.getItem('registered_students') || '[]');
          const studentData = registeredStudents.find((s: any) => 
            s.userId === user.userId || s.email === user.email
          );
          
          if (studentData) {
            setStudentProfile({
              department: studentData.department || user.course || '',
              section: studentData.section || user.section || '',
              semester: studentData.semester || user.semester || '',
            });
            const semester = parseInt(studentData.semester || user.semester || '1');
            setStudentSemester(semester);
          } else {
            setStudentProfile({
              department: user.course || '',
              section: user.section || '',
              semester: user.semester || '',
            });
            const semester = parseInt(user.semester || '1');
            setStudentSemester(semester);
          }
        } catch (e) {
          console.error('Failed to load student info', e);
          setStudentSemester(1);
        }
      }
    };

    // Load initial profile
    loadStudentProfile();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      loadStudentProfile();
    };

    window.addEventListener('student_profile_updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('student_profile_updated', handleProfileUpdate);
    };
  }, []);

  // Load materials when student profile changes
  useEffect(() => {
    loadSubjectsFromMaterials();

    // Listen for materials updates from admin portal
    const handleMaterialsUpdate = () => {
      loadSubjectsFromMaterials();
    };

    window.addEventListener('materials_updated', handleMaterialsUpdate);

    return () => {
      window.removeEventListener('materials_updated', handleMaterialsUpdate);
    };
  }, [studentProfile]);

  const loadSubjectsFromMaterials = async () => {
    try {
      const materials = await materialsAPI.getAll();
      
      console.log('==================== STUDENT MATERIALS DEBUG ====================');
      console.log('📚 All materials from API:', materials);
      console.log('📚 Total materials count:', materials.length);
      console.log('👤 Student profile:', studentProfile);
      console.log('👤 Student department:', studentProfile.department);
      console.log('👤 Student section:', studentProfile.section);
      console.log('👤 Student semester:', studentProfile.semester);
      
      // Filter materials based on student's profile
      const filteredMaterials = materials.filter((material: any) => {
        console.log('\n--- Checking material:', material.title);
        console.log('   Material department:', material.department);
        console.log('   Material section:', material.section);
        
        // If material has no target filters, it's visible to all students
        const hasFilters = material.department || material.section;
        
        if (!hasFilters) {
          console.log('   ✅ Material has no filters, showing to all');
          return true; // Show to all students
        }
        
        // Check if material matches student's profile
        let matches = true;
        
        if (material.department && material.department.trim() !== '') {
          // Case-insensitive comparison
          const materialDept = material.department.toLowerCase().trim();
          const studentDept = studentProfile.department.toLowerCase().trim();
          const deptMatches = materialDept === studentDept;
          console.log(`   🔍 Dept match: "${materialDept}" === "${studentDept}" = ${deptMatches}`);
          matches = matches && deptMatches;
        }
        
        if (material.section && material.section.trim() !== '') {
          const materialSection = material.section.toLowerCase().trim();
          const studentSection = studentProfile.section.toLowerCase().trim();
          const sectionMatches = materialSection === studentSection;
          console.log(`   🔍 Section match: "${materialSection}" === "${studentSection}" = ${sectionMatches}`);
          matches = matches && sectionMatches;
        }
        
        console.log(`   ${matches ? '✅ PASS' : '❌ FAIL'} - Final match result: ${matches}`);
        return matches;
      });
      
      console.log('\n📋 Filtered materials count:', filteredMaterials.length);
      console.log('📋 Filtered materials:', filteredMaterials);
      console.log('================================================================\n');
      
      // Group materials by subject and semester
      const subjectMap = new Map<string, { semester: number; count: number }>();
      
      filteredMaterials.forEach((material: any) => {
        // Parse semester from various formats: 'Semester 1', '1', 1
        let semesterNum = 1;
        if (typeof material.semester === 'string') {
          const match = material.semester.match(/\d+/);
          semesterNum = match ? parseInt(match[0]) : 1;
        } else if (typeof material.semester === 'number') {
          semesterNum = material.semester;
        }
        
        const key = `${material.subject}-${semesterNum}`;
        if (subjectMap.has(key)) {
          const existing = subjectMap.get(key)!;
          subjectMap.set(key, { ...existing, count: existing.count + 1 });
        } else {
          subjectMap.set(key, { 
            semester: semesterNum, 
            count: 1 
          });
        }
      });

      // Convert to subjects array
      const subjects: Subject[] = [];
      let id = 1;
      subjectMap.forEach((data, key) => {
        const subjectName = key.split('-')[0];
        subjects.push({
          id: id++,
          name: subjectName,
          semester: data.semester,
          materials: data.count,
        });
      });

      console.log('📖 Final subjects list:', subjects);
      setAllSubjects(subjects);
    } catch (error) {
      console.error('Error loading subjects:', error);
      setAllSubjects([]);
    }
  };

  const semesters = [
    { value: 'all', label: 'All Semesters' },
    { value: 1, label: 'Semester 1' },
    { value: 2, label: 'Semester 2' },
    { value: 3, label: 'Semester 3' },
    { value: 4, label: 'Semester 4' },
    { value: 5, label: 'Semester 5' },
    { value: 6, label: 'Semester 6' },
  ];

  // Filter semesters to only show current and previous semesters
  const availableSemesters = semesters.filter(sem => 
    sem.value === 'all' || (typeof sem.value === 'number' && sem.value <= studentSemester)
  );

  // Filter subjects based on search, semester, and student's current semester
  const filteredSubjects = allSubjects.filter((subject) => {
    const matchesSearch = subject.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSemester = selectedSemester === 'all' || subject.semester === selectedSemester;
    // Only show materials from current semester and previous semesters
    const matchesStudentSemester = subject.semester <= studentSemester;
    return matchesSearch && matchesSemester && matchesStudentSemester;
  });

  const handleSubjectClick = (subject: Subject) => {
    onSubjectClick(subject.name);
  };

  const handleSemesterSelect = (semester: number | 'all') => {
    setSelectedSemester(semester);
    setIsDropdownOpen(false);
  };

  const getSelectedSemesterLabel = () => {
    const selected = semesters.find(s => s.value === selectedSemester);
    return selected ? selected.label : 'All Semesters';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="bg-blue-600 shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h2 className="text-white flex-1">Subjects & Materials</h2>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search subjects"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Semester Dropdown */}
        <div className="mb-6 relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
          >
            <span className="text-gray-700">{getSelectedSemesterLabel()}</span>
            <ChevronDown
              className={`w-5 h-5 text-gray-500 transition-transform ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-20">
              {availableSemesters.map((semester) => (
                <button
                  key={semester.value}
                  onClick={() => handleSemesterSelect(semester.value)}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors ${
                    selectedSemester === semester.value
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700'
                  }`}
                >
                  {semester.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subjects List */}
        <div className="space-y-3">
          {filteredSubjects.length > 0 ? (
            filteredSubjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => handleSubjectClick(subject)}
                className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-between group"
              >
                <div className="flex-1 text-left">
                  <h3 className="text-gray-900 mb-1">{subject.name}</h3>
                  <p className="text-sm text-gray-500">
                    Semester {subject.semester} • {subject.materials} materials
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </button>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-gray-900 mb-2">No subjects found</h3>
              <p className="text-gray-500 text-sm">
                Try adjusting your search or filter
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}
