import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, UserCheck, UserX, Mail, Phone, Calendar, Award, Plus, X, Save } from 'lucide-react';
import { FacultyProfileDetailPage } from './FacultyProfileDetailPage';
import { DEPARTMENTS } from '@/constants/departments';
import { COURSES, COURSE_SECTIONS, SEMESTERS } from '@/constants/departments';
import { ProfileAvatar } from './ProfileAvatar';
import { appStorage } from './';
import { facultyAPI, facultyStatusAPI } from '../api';

interface TotalFacultyPageProps {
  onBack: () => void;
  initialFilter?: 'active' | 'inactive' | 'all';
}

interface Faculty {
  id: number;
  name: string;
  employeeId: string;
  department: string;
  designation?: string;
  role: string;
  email: string;
  phone: string;
  joiningDate?: string;
  registrationDate: string;
  status: 'active' | 'inactive';
  subjects?: string[];
  userId: string;
  password: string;
  qualification?: string;
  experience?: string;
  specialization?: string;
  age?: string;
  gender?: string;
  bloodGroup?: string;
  profilePicture?: string;
  teachingStatus?: {
    isActive: boolean;
    currentPeriod: string | null;
    subject: string | null;
    class: string | null;
    room: string | null;
    time: string | null;
  };
}

export function TotalFacultyPage({ onBack, initialFilter = 'all' }: TotalFacultyPageProps) {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'active' | 'inactive' | 'all'>(initialFilter);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [todayStatusRows, setTodayStatusRows] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedFacultyForAssign, setSelectedFacultyForAssign] = useState<Faculty | null>(null);
  const [assignFormData, setAssignFormData] = useState({
    course: '',
    semester: '',
    section: ''
  });

  const loadFacultyFromBackend = async () => {
    try {
      const rows = await facultyAPI.getAll();
      const normalized = (rows || []).map((f: any) => ({
        id: Number(f.id) || 0,
        name: f.name || f.full_name || '',
        employeeId: f.employee_id,
        department: f.department,
        designation: f.designation || 'Faculty',
        role: f.designation || 'Faculty',
        email: f.email,
        phone: f.phone || '',
        joiningDate: '',
        registrationDate: '',
        status: 'active',
        subjects: [],
        userId: f.user_id || f.email || f.username || f.id,
        password: '',
        qualification: f.qualification || '',
        experience: f.experience || '',
        specialization: f.specialization || '',
        age: f.age || '',
        gender: f.gender || '',
        bloodGroup: f.blood_group || '',
        profilePicture: f.profile_picture || '',
      }));
      const unique = new Map<string | number, Faculty>();
      normalized.forEach((f: any) => {
        const key = f.userId ?? f.id;
        if (!unique.has(key)) {
          unique.set(key, f as Faculty);
        }
      });
      setFaculty(Array.from(unique.values()));
      return;
    } catch {
      setFaculty([]);
    }
  };

  const loadTodayFacultyStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const rows = await facultyStatusAPI.getByDate(today);
      setTodayStatusRows(rows || []);
    } catch (error) {
      console.error('Error loading faculty status:', error);
      setTodayStatusRows([]);
    }
  };

  // Get available sections based on selected course
  const getAvailableSections = () => {
    if (!assignFormData.course) return [];
    const courseKey = assignFormData.course as 'BCA' | 'BSc' | 'BCom';
    return COURSE_SECTIONS[courseKey] || [];
  };

  // Save inactive faculty assignment
  const saveInactiveFacultyAssignment = () => {
    if (!selectedFacultyForAssign) return;

    try {
      // Get existing assignments
      const existingAssignments = JSON.parse(appStorage.getItem('inactive_faculty_assignments') || '[]');

      // Create new assignment
      const newAssignment = {
        id: Date.now().toString(),
        facultyId: selectedFacultyForAssign.userId,
        employeeId: selectedFacultyForAssign.employeeId,
        facultyName: selectedFacultyForAssign.name,
        course: assignFormData.course,
        section: assignFormData.section,
        semester: assignFormData.semester,
        assignedDate: new Date().toISOString()
      };

      // Add to assignments
      existingAssignments.push(newAssignment);

      // Save to appStorage
      appStorage.setItem('inactive_faculty_assignments', JSON.stringify(existingAssignments));

      console.log('✅ Inactive faculty assignment saved:', newAssignment);

      // Close modal
      setShowAssignModal(false);
      setSelectedFacultyForAssign(null);

      // Show success feedback (you can add a toast notification here)
      alert(`✅ Successfully assigned ${selectedFacultyForAssign.name} to ${assignFormData.course} ${assignFormData.section} - Sem ${assignFormData.semester}`);
    } catch (error) {
      console.error('Error saving inactive faculty assignment:', error);
      alert('❌ Failed to save assignment. Please try again.');
    }
  };

  // Listen for faculty registration events
  useEffect(() => {
    const handleFacultyRegistered = () => {
      loadFacultyFromBackend();
    };

    const handlePasswordChanged = () => {
      loadFacultyFromBackend();
    };

    loadFacultyFromBackend();
    loadTodayFacultyStatus();

    window.addEventListener('facultyRegistered', handleFacultyRegistered);
    window.addEventListener('faculty_profile_updated', handleFacultyRegistered);
    window.addEventListener('facultyPasswordChanged', handlePasswordChanged);
    window.addEventListener('facultyAttendanceUpdated', loadTodayFacultyStatus as EventListener);

    return () => {
      window.removeEventListener('facultyRegistered', handleFacultyRegistered);
      window.removeEventListener('faculty_profile_updated', handleFacultyRegistered);
      window.removeEventListener('facultyPasswordChanged', handlePasswordChanged);
      window.removeEventListener('facultyAttendanceUpdated', loadTodayFacultyStatus as EventListener);
    };
  }, []);

  // Update faculty list with DB-backed current status.
  const facultyWithStatus = faculty.map(f => {
    const row = todayStatusRows.find((r: any) => Number(r.faculty_id) === Number(f.id));
    const dbStatus = String(row?.status || '').toLowerCase();
    const isActive = dbStatus === 'present' || dbStatus === 'available' || dbStatus === 'active';
    const isAbsentToday = dbStatus === 'absent' || dbStatus === 'leave' || dbStatus === 'blocked';

    return {
      ...f,
      teachingStatus: {
        isActive,
        currentPeriod: null,
        subject: null,
        class: null,
        room: null,
        time: null,
      },
      isAbsentToday
    };
  });

  // If a faculty member is selected, show their profile
  if (selectedFaculty) {
    return (
      <FacultyProfileDetailPage
        faculty={selectedFaculty}
        onBack={() => setSelectedFaculty(null)}
      />
    );
  }

  // Calculate counts - Exclude absent faculty from active/inactive counts
  const presentFaculty = facultyWithStatus.filter(f => !f.isAbsentToday);
  const totalFaculty = presentFaculty.length;
  // Count active faculty based on teaching status from appStorage (only among present faculty)
  const activeFaculty = presentFaculty.filter(f => f.teachingStatus?.isActive).length;
  const inactiveFaculty = totalFaculty - activeFaculty;

  // Filter faculty - Exclude absent faculty from all views
  const filteredFaculty = facultyWithStatus.filter(f => {
    // Always exclude absent faculty from all views
    if (f.isAbsentToday) return false;
    
    const matchesSearch = 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.designation.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter based on teaching status instead of stored status
    const isCurrentlyActive = f.teachingStatus?.isActive || false;
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && isCurrentlyActive) ||
      (filterStatus === 'inactive' && !isCurrentlyActive);
    const matchesDepartment = selectedDepartment === 'all' || f.department === selectedDepartment;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h2 className="text-white">Faculty Management</h2>
            <p className="text-white/80 text-sm">{filteredFaculty.length} faculty members</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Faculty */}
          <button
            onClick={() => setFilterStatus('all')}
            className={`bg-white rounded-2xl p-6 shadow-lg border-l-4 transition-all ${
              filterStatus === 'all' 
                ? 'border-green-500 ring-2 ring-green-200' 
                : 'border-gray-300 hover:border-green-400'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-left">
                <p className="text-sm text-gray-500">Total Faculty</p>
                <p className="text-2xl font-bold text-gray-900">{totalFaculty}</p>
              </div>
            </div>
          </button>

          {/* Active Faculty */}
          <button
            onClick={() => setFilterStatus('active')}
            className={`bg-white rounded-2xl p-6 shadow-lg border-l-4 transition-all ${
              filterStatus === 'active' 
                ? 'border-blue-500 ring-2 ring-blue-200' 
                : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm text-gray-500">Active Faculty</p>
                <p className="text-2xl font-bold text-gray-900">{activeFaculty}</p>
              </div>
            </div>
          </button>

          {/* Inactive Faculty */}
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`bg-white rounded-2xl p-6 shadow-lg border-l-4 transition-all ${
              filterStatus === 'inactive' 
                ? 'border-red-500 ring-2 ring-red-200' 
                : 'border-gray-300 hover:border-red-400'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <UserX className="w-6 h-6 text-red-600" />
              </div>
              <div className="text-left">
                <p className="text-sm text-gray-500">Inactive Faculty</p>
                <p className="text-2xl font-bold text-gray-900">{inactiveFaculty}</p>
              </div>
            </div>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-lg space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, employee ID, department, or designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
            >
              <option value="all">All Departments</option>
              {DEPARTMENTS.map(department => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Faculty Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">S.No</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Employee ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                  {filterStatus !== 'active' && (
                    <>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Designation</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Department</th>
                    </>
                  )}
                  {filterStatus === 'active' && (
                    <>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Subject</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Class</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Sec</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Sem</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Room</th>
                    </>
                  )}

                  {filterStatus === 'inactive' && (
                    <>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Action</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFaculty.length > 0 ? (
                  filteredFaculty.map((facultyMember, index) => (
                    <tr key={facultyMember.id} className="hover:bg-green-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{facultyMember.employeeId}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <ProfileAvatar 
                            userName={facultyMember.name} 
                            size="sm" 
                            themeColor="green"
                          />
                          <button
                            onClick={() => setSelectedFaculty(facultyMember)}
                            className="text-left hover:text-green-600 transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-900 hover:text-green-600 hover:underline">{facultyMember.name}</p>
                          </button>
                        </div>
                      </td>
                      
                      {/* Show Designation and Department for Total and Inactive views only */}
                      {filterStatus !== 'active' && (
                        <>
                          <td className="px-6 py-4 text-sm text-gray-700">{facultyMember.designation}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {facultyMember.department}
                            </span>
                          </td>
                        </>
                      )}
                      
                      {/* Active Faculty View */}
                      {filterStatus === 'active' && (
                        <>
                          <td className="px-6 py-4">
                            {facultyMember.teachingStatus?.isActive ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                Teaching Now
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <UserCheck className="w-3 h-3" />
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {facultyMember.teachingStatus?.subject || facultyMember.subjects[0] || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {facultyMember.teachingStatus?.class ? 
                              facultyMember.teachingStatus.class.split('-')[0] : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {facultyMember.teachingStatus?.class ? 
                              (facultyMember.teachingStatus.class.split('-')[1] || 'A') : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {facultyMember.teachingStatus?.currentPeriod || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {facultyMember.teachingStatus?.room || '-'}
                          </td>
                        </>
                      )}
                      
                      {/* Inactive Faculty View */}
                      {filterStatus === 'inactive' && (
                        <>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <UserX className="w-3 h-3" />
                              Inactive
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => {
                                setSelectedFacultyForAssign(facultyMember);
                                setShowAssignModal(true);
                                setAssignFormData({
                                  course: '',
                                  semester: '',
                                  section: ''
                                });
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all active:scale-95"
                            >
                              <Plus className="w-4 h-4" />
                              Add
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={filterStatus === 'active' ? 9 : filterStatus === 'inactive' ? 7 : 5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <UserX className="w-16 h-16 text-gray-300 mb-3" />
                        <p className="text-gray-500">No records available</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Assign Class Modal */}
      {showAssignModal && selectedFacultyForAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white text-xl font-semibold">Assign Class</h3>
                  <p className="text-white/80 text-sm mt-1">{selectedFacultyForAssign.name}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedFacultyForAssign(null);
                  }}
                  className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Course */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignFormData.course}
                  onChange={(e) => setAssignFormData({ ...assignFormData, course: e.target.value, section: '' })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                >
                  <option value="">Select Course</option>
                  {COURSES.map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Semester <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignFormData.semester}
                  onChange={(e) => setAssignFormData({ ...assignFormData, semester: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                >
                  <option value="">Select Semester</option>
                  {SEMESTERS.map(semester => (
                    <option key={semester} value={semester}>{semester}</option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignFormData.section}
                  onChange={(e) => setAssignFormData({ ...assignFormData, section: e.target.value })}
                  disabled={!assignFormData.course}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select Section</option>
                  {getAvailableSections().map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedFacultyForAssign(null);
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveInactiveFacultyAssignment}
                  disabled={!assignFormData.course || !assignFormData.semester || !assignFormData.section}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
