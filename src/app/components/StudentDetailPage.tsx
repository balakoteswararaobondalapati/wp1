import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Edit2, Save, X, User, Phone, Mail, BookOpen, Users, Droplet, Calendar, Hash, CreditCard, GraduationCap, MapPin, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Camera, Clock, Key, Eye, EyeOff, Trash2 } from 'lucide-react';
import { attendanceAPI, studentsAPI } from '../api';

interface StudentDetailPageProps {
  onBack: () => void;
  studentName: string;
  studentId: number;
  registrationNumber: string;
  className: string;
  semester: number;
  section: string;
}

export function StudentDetailPage({ 
  onBack, 
  studentName, 
  studentId, 
  registrationNumber,
  className,
  semester,
  section
}: StudentDetailPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPhotoSuccess, setShowPhotoSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loginCredentials] = useState<{
    userId: string;
    password: string;
  } | null>(null);

  const [studentData, setStudentData] = useState({
    name: studentName,
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    studentPhone: '',
    email: '',
    fatherName: '',
    fatherPhone: '',
    stream: className,
    section: section,
    rollNumber: String(studentId).padStart(3, '0'),
    registerNumber: registrationNumber,
    academicYear: '',
    currentSemester: String(semester),
    address: '',
  });
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);

  useEffect(() => {
    const loadStudent = async () => {
      try {
        const rows = await studentsAPI.getAll();
        const row = (rows || []).find((s: any) => Number(s.id) === Number(studentId));
        if (!row) return;
        setStudentData((prev) => ({
          ...prev,
          name: row.name || prev.name,
          email: row.email || prev.email,
          stream: row.course || row.department || prev.stream,
          section: row.section || prev.section,
          rollNumber: row.roll_number || prev.rollNumber,
          currentSemester: String(row.semester || prev.currentSemester),
          registerNumber: row.register_number || prev.registerNumber,
          studentPhone: row.phone || prev.studentPhone,
          dateOfBirth: row.date_of_birth || prev.dateOfBirth,
          gender: row.gender || prev.gender,
          bloodGroup: row.blood_group || prev.bloodGroup,
          address: row.address || prev.address,
          academicYear: row.academic_year || prev.academicYear,
          fatherName: row.parent_name || prev.fatherName,
          fatherPhone: row.parent_phone || prev.fatherPhone,
        }));
      } catch (e) {
        console.error('Error loading student data:', e);
      }
    };
    void loadStudent();
  }, [studentId]);

  const loadAttendance = useCallback(async () => {
    try {
      const rows = await attendanceAPI.getAll();
      setAttendanceRows(rows || []);
    } catch (e) {
      console.error('Error loading attendance rows:', e);
      setAttendanceRows([]);
    }
  }, []);

  useEffect(() => {
    void loadAttendance();

    const handleAttendanceUpdate = () => {
      void loadAttendance();
    };

    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);
    return () => window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
  }, [loadAttendance]);

  // Calculate age from date of birth
  const calculateAge = (dob: string): number => {
    if (!dob || !dob.includes('-')) return 0;
    const [day, month, year] = dob.split('-').map(Number);
    if (!day || !month || !year) return 0;
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(studentData.dateOfBirth);

  // Attendance stats from backend attendance rows.
  const attendanceStats = useMemo(() => {
    try {
      const roll = String(studentData.rollNumber || '');
      const relevant = (attendanceRows || []).filter((r: any) => String(r.student_roll_number || '') === roll);
      const groupedByDate = new Map<string, Map<number, 'present' | 'absent'>>();

      relevant.forEach((row: any) => {
        const dateKey = String(row.date || '').split('T')[0];
        const periodNumber = Number(row.period_number || 0);
        if (!dateKey || !periodNumber) return;
        if (!groupedByDate.has(dateKey)) {
          groupedByDate.set(dateKey, new Map());
        }
        groupedByDate
          .get(dateKey)!
          .set(periodNumber, String(row.status || '').toLowerCase() === 'present' ? 'present' : 'absent');
      });

      let presentDays = 0;
      let absentDays = 0;

      groupedByDate.forEach((periods) => {
        let absentCount = 0;
        for (let periodNumber = 1; periodNumber <= 5; periodNumber += 1) {
          if ((periods.get(periodNumber) || 'absent') === 'absent') {
            absentCount += 1;
          }
        }

        if (absentCount >= 3) {
          absentDays += 1;
        } else {
          presentDays += 1;
        }
      });

      const totalDays = presentDays + absentDays;
      const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
      return {
        attendancePercentage: percentage,
        totalClasses: totalDays,
        attendedClasses: presentDays,
        absentClasses: absentDays
      };
    } catch (error) {
      console.error('Error calculating attendance:', error);
      return {
        attendancePercentage: 0,
        totalClasses: 0,
        attendedClasses: 0,
        absentClasses: 0
      };
    }
  }, [attendanceRows, studentData.rollNumber]);
  
  const { attendancePercentage, totalClasses, attendedClasses, absentClasses } = attendanceStats;

  const handleInputChange = (field: string, value: string) => {
    setStudentData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Save updated student data to backend
    try {
      await studentsAPI.update(studentId, {
        name: studentData.name,
        email: studentData.email,
        rollNumber: studentData.rollNumber,
        course: studentData.stream,
        department: studentData.stream,
        section: studentData.section,
        semester: studentData.currentSemester,
        registerNumber: studentData.registerNumber,
        phone: studentData.studentPhone,
        dateOfBirth: studentData.dateOfBirth,
        gender: studentData.gender,
        bloodGroup: studentData.bloodGroup,
        address: studentData.address,
        academicYear: studentData.academicYear,
        guardianRelation: '',
        parentName: studentData.fatherName,
        parentPhone: studentData.fatherPhone,
      });

      window.dispatchEvent(new Event('student_profile_updated'));
      window.dispatchEvent(new Event('studentRegistered'));
      
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving student data:', error);
      alert('Failed to save student profile. Please check required fields (especially email) and try again.');
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${studentData.name}?\n\nThis will:\n- Remove the student from the system\n- Delete their login credentials\n- Remove all associated data including attendance records\n\nThis action cannot be undone.`)) {
      try {
        await studentsAPI.delete(studentId);

        // Dispatch event to refresh the student list
        window.dispatchEvent(new CustomEvent('studentRegistered'));

        alert('Student deleted successfully!');
        onBack();
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Failed to delete student. Please try again.');
      }
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Profile image update would happen here
      setShowPhotoSuccess(true);
      setTimeout(() => setShowPhotoSuccess(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white font-['Poppins',sans-serif] pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h2 className="text-white flex-1">Student Details</h2>
          
          {/* Edit/Save Buttons */}
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors active:scale-95"
              >
                <Edit2 className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium">Edit</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors active:scale-95"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors active:scale-95"
                >
                  <Save className="w-5 h-5 text-white" />
                  <span className="text-white text-sm">Save</span>
                </button>
                
                {/* Delete Button - Only shown in edit mode */}
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/90 hover:bg-red-600 rounded-xl transition-colors active:scale-95"
                  title="Delete Student"
                >
                  <Trash2 className="w-5 h-5 text-white" />
                  <span className="text-white text-sm">Delete</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Profile updated successfully!</span>
        </div>
      )}

      {/* Photo Success Message */}
      {showPhotoSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Photo updated successfully!</span>
        </div>
      )}

      {/* Content Container - Centered with max width */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Profile Header Section */}
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="flex flex-col items-center">
            {/* Circular Profile Photo with Edit Button */}
            <div className="relative mb-4">
              <div className="w-32 h-32 rounded-full border-4 border-green-100 shadow-xl bg-green-200 flex items-center justify-center">
                <User className="w-16 h-16 text-green-700" />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handlePhotoChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg border-4 border-white active:scale-95"
                title="Change Profile Photo"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            {/* Student Badge */}
            <div className="inline-flex items-center px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm mb-3 shadow-sm">
              {isEditing ? (
                <input
                  type="text"
                  value={studentData.stream}
                  onChange={(e) => handleInputChange('stream', e.target.value)}
                  className="bg-transparent border-none outline-none font-medium text-center min-w-[100px]"
                  placeholder="Student Tag"
                />
              ) : (
                <span className="font-medium">Student - {studentData.stream}</span>
              )}
            </div>

            {/* Student Full Name */}
            {isEditing ? (
              <input
                type="text"
                value={studentData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="text-center text-2xl font-semibold text-gray-900 mb-2 px-4 py-2 border-2 border-green-400 rounded-lg focus:outline-none"
              />
            ) : (
              <h1 className="text-gray-900 text-center mb-2">{studentData.name}</h1>
            )}

            {/* Date of Birth */}
            <p className="text-gray-500 text-sm">
              Date of Birth: {isEditing ? (
                <input
                  type="text"
                  value={studentData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className="ml-2 px-2 py-1 border-2 border-green-400 rounded focus:outline-none"
                  placeholder="DD-MM-YYYY"
                />
              ) : studentData.dateOfBirth}
            </p>

            {/* Age */}
            <p className="text-gray-500 text-sm">
              Age: {age} years
            </p>
          </div>
        </div>

        {/* Login Credentials Card */}
        {loginCredentials && (
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl shadow-lg p-6 md:p-8 border-2 border-indigo-100">
            <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-indigo-200">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Key className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-gray-900 flex-1">Login Credentials</h2>
              <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                Student Portal
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Username/User ID */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-sm text-gray-500 mb-2">Username / User ID</p>
                <div className="flex items-center justify-between">
                  <p className="font-mono font-medium text-gray-900 text-lg">{loginCredentials.userId}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(loginCredentials.userId);
                      alert('Username copied to clipboard!');
                    }}
                    className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition-colors active:scale-95 font-medium"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-sm text-gray-500 mb-2">Password</p>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <p className="font-mono font-medium text-gray-900 text-lg">
                      {showPassword ? loginCredentials.password : '••••••••'}
                    </p>
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors active:scale-95"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-600" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(loginCredentials.password);
                      alert('Password copied to clipboard!');
                    }}
                    className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition-colors active:scale-95 font-medium"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Note:</span> These credentials are used by the student to access the Student Portal. 
                    If the student changes their password, it will be automatically updated here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Personal Information Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8">
          <h2 className="text-gray-900 mb-6 pb-3 border-b-2 border-green-100">Student Information</h2>
          
          <div className="space-y-4">
            {/* Gender */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Gender</p>
                {isEditing ? (
                  <select
                    value={studentData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="font-medium text-gray-900 w-full border-2 border-green-400 rounded-lg px-3 py-2 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <p className="font-medium text-gray-900">{studentData.gender}</p>
                )}
              </div>
            </div>

            {/* Blood Group */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Droplet className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Blood Group</p>
                {isEditing ? (
                  <select
                    value={studentData.bloodGroup}
                    onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                    className="font-medium text-gray-900 w-full border-2 border-green-400 rounded-lg px-3 py-2 focus:outline-none bg-white"
                  >
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                ) : (
                  <p className="font-medium text-gray-900">{studentData.bloodGroup}</p>
                )}
              </div>
            </div>

            {/* Student Phone */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Student Phone Number</p>
                {isEditing ? (
                  <input
                    type="tel"
                    value={studentData.studentPhone}
                    onChange={(e) => handleInputChange('studentPhone', e.target.value)}
                    className="font-medium text-gray-900 w-full border-2 border-green-400 rounded-lg px-3 py-2 focus:outline-none"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{studentData.studentPhone}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Email</p>
                {isEditing ? (
                  <input
                    type="email"
                    value={studentData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="font-medium text-gray-900 w-full border-2 border-green-400 rounded-lg px-3 py-2 focus:outline-none"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{studentData.email}</p>
                )}
              </div>
            </div>

            {/* Father's Name */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Father's Name</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={studentData.fatherName}
                    onChange={(e) => handleInputChange('fatherName', e.target.value)}
                    className="font-medium text-gray-900 w-full border-2 border-green-400 rounded-lg px-3 py-2 focus:outline-none"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{studentData.fatherName}</p>
                )}
              </div>
            </div>

            {/* Father's Phone */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Father's Phone Number</p>
                {isEditing ? (
                  <input
                    type="tel"
                    value={studentData.fatherPhone}
                    onChange={(e) => handleInputChange('fatherPhone', e.target.value)}
                    className="font-medium text-gray-900 w-full border-2 border-green-400 rounded-lg px-3 py-2 focus:outline-none"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{studentData.fatherPhone}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Address</p>
                {isEditing ? (
                  <textarea
                    value={studentData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={3}
                    className="font-medium text-gray-900 w-full border-2 border-green-400 rounded-lg px-3 py-2 focus:outline-none resize-none"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{studentData.address}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Academic Information Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8">
          <h2 className="text-gray-900 mb-6 pb-3 border-b-2 border-green-100">Academic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Course */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Course</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={studentData.stream}
                    onChange={(e) => handleInputChange('stream', e.target.value)}
                    className="font-medium text-gray-900 w-full border-2 border-green-400 rounded-lg px-3 py-2 focus:outline-none"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{studentData.stream}</p>
                )}
              </div>
            </div>

            {/* Section */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Section</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={studentData.section}
                    onChange={(e) => handleInputChange('section', e.target.value)}
                    className="font-medium text-gray-900 w-full border-2 border-green-400 rounded-lg px-3 py-2 focus:outline-none"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{studentData.section}</p>
                )}
              </div>
            </div>

            {/* Roll Number */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Hash className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Roll Number</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={studentData.rollNumber}
                    onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                    className="font-medium text-gray-900 w-full border-2 border-green-400 rounded-lg px-3 py-2 focus:outline-none"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{studentData.rollNumber}</p>
                )}
              </div>
            </div>

            {/* Register Number */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Register Number</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={studentData.registerNumber}
                    onChange={(e) => handleInputChange('registerNumber', e.target.value)}
                    className="font-medium text-gray-900 w-full border-2 border-green-400 rounded-lg px-3 py-2 focus:outline-none"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{studentData.registerNumber}</p>
                )}
              </div>
            </div>

            {/* Academic Year */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Academic Year</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={studentData.academicYear}
                    onChange={(e) => handleInputChange('academicYear', e.target.value)}
                    className="font-medium text-gray-900 w-full border-2 border-green-400 rounded-lg px-3 py-2 focus:outline-none"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{studentData.academicYear}</p>
                )}
              </div>
            </div>

            {/* Current Semester */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Current Semester</p>
                {isEditing ? (
                  <select
                    value={studentData.currentSemester}
                    onChange={(e) => handleInputChange('currentSemester', e.target.value)}
                    className="font-medium text-gray-900 w-full border-2 border-green-400 rounded-lg px-3 py-2 focus:outline-none"
                  >
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="4">Semester 4</option>
                    <option value="5">Semester 5</option>
                    <option value="6">Semester 6</option>
                    <option value="7">Semester 7</option>
                    <option value="8">Semester 8</option>
                  </select>
                ) : (
                  <p className="font-medium text-gray-900">Semester {studentData.currentSemester}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Overview Card */}
        <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-3xl shadow-lg p-6 md:p-8 text-white">
          <h2 className="text-white mb-6 pb-3 border-b-2 border-white/20">Attendance Overview</h2>
          
          {/* Percentage Display */}
          <div className="text-center mb-6">
            <div className="inline-block relative">
              <div className="w-40 h-40 rounded-full border-8 border-white/30 flex items-center justify-center mb-4 mx-auto">
                <div>
                  <p className="text-5xl font-bold">{attendancePercentage}%</p>
                  <p className="text-sm opacity-90">Attendance</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-sm opacity-90 mb-1">Total Days</p>
              <p className="text-2xl font-bold">{totalClasses}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-sm opacity-90 mb-1">Present</p>
              <p className="text-2xl font-bold text-green-200">{attendedClasses}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-sm opacity-90 mb-1">Absent</p>
              <p className="text-2xl font-bold text-red-200">{absentClasses}</p>
            </div>
          </div>

          {/* Status Message */}
          <div className={`flex items-center gap-3 p-4 rounded-xl ${
            attendancePercentage >= 75 
              ? 'bg-green-500/30 border-2 border-green-300/50' 
              : 'bg-red-500/30 border-2 border-red-300/50'
          }`}>
            {attendancePercentage >= 75 ? (
              <>
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                <p className="text-sm">
                  <span className="font-semibold">Good Standing!</span> Student meets the minimum 75% attendance requirement.
                </p>
              </>
            ) : (
              <>
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <p className="text-sm">
                  <span className="font-semibold">Warning!</span> Student is below the 75% attendance requirement.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Monthly Attendance Calendar */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <h2 className="text-white">Monthly Attendance Calendar</h2>
          </div>
          <div className="p-6">
            <EmbeddedAttendanceCalendar 
              registrationNumber={registrationNumber}
              rollNumber={studentData.rollNumber}
              className={className}
              section={section}
              semester={semester}
              attendanceRows={attendanceRows}
              isEditing={isEditing}
              onAttendanceChanged={loadAttendance}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Embedded Attendance Calendar Component
function EmbeddedAttendanceCalendar({ 
  registrationNumber, 
  rollNumber,
  className, 
  section, 
  semester,
  attendanceRows,
  isEditing,
  onAttendanceChanged,
}: { 
  registrationNumber: string;
  rollNumber: string;
  className: string;
  section: string;
  semester: number;
  attendanceRows: any[];
  isEditing: boolean;
  onAttendanceChanged: () => Promise<void>;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<any | null>(null);
  const [periodDrafts, setPeriodDrafts] = useState<Record<number, 'present' | 'absent'>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for attendance updates
  useEffect(() => {
    const handleAttendanceUpdate = () => {
      setRefreshKey(prev => prev + 1);
      setSelectedDate(null); // Close modal if open
    };

    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);
    
    return () => {
      window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
    };
  }, []);

  const attendanceTimeMap: Record<string, string> = {
    P1: '9:00–10:00',
    P2: '10:00–11:00',
    P3: '11:00–12:00',
    P4: '12:00–1:00',
    P5: '2:00–3:00',
  };

  // Generate calendar data with period details from actual attendance records
  const generateCalendarData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendarDays: Array<{
      date: number | null;
      dateStr?: string;
      status: 'present' | 'absent' | 'partial' | 'holiday' | null;
      periods?: Array<{
        periodNumber: number;
        subject: string;
        faculty: string;
        status: 'present' | 'absent';
        rowIds: number[];
      }>;
    }> = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push({ date: null, status: null });
    }

    // Add days of the month with actual attendance data
    for (let date = 1; date <= daysInMonth; date++) {
      const dayOfWeek = new Date(year, month, date).getDay();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      
      const isHoliday = dayOfWeek === 0;
      
      if (isHoliday) {
        calendarDays.push({ date, dateStr, status: 'holiday', periods: [] });
      } else {
        // Filter attendance records for this student on this date
        const studentAttendanceRecords = (attendanceRows || []).filter((record: any) => {
          if (record.date !== dateStr) return false;
          return String(record.student_roll_number || '') === String(rollNumber || registrationNumber);
        });

        // Build periods array from actual attendance
        const periods: Array<{
          periodNumber: number;
          subject: string;
          faculty: string;
          status: 'present' | 'absent';
          rowIds: number[];
        }> = [];
        for (let periodNumber = 1; periodNumber <= 5; periodNumber += 1) {
          const matching = studentAttendanceRecords.filter(
            (record: any) => Number(record.period_number || 0) === periodNumber,
          );
          const periodStatus = matching.some(
            (record: any) => String(record.status || '').toLowerCase() === 'present',
          )
            ? 'present'
            : 'absent';
          periods.push({
            periodNumber,
            subject: matching[0]?.subject || `Period ${periodNumber}`,
            faculty: matching[0]?.faculty_name || 'N/A',
            status: periodStatus,
            rowIds: matching.map((record: any) => Number(record.id)).filter((id: number) => Number.isFinite(id)),
          });
        }

        // Determine day status based on attendance
        let dayStatus: 'present' | 'absent' | 'partial' | null;

        if (studentAttendanceRecords.length === 0) {
          dayStatus = null;
        } else {
          const absentCount = periods.filter((period) => period.status === 'absent').length;
          if (absentCount >= 3) {
            dayStatus = 'absent';
          } else if (absentCount === 0) {
            dayStatus = 'present';
          } else {
            dayStatus = 'partial';
          }
        }

        calendarDays.push({ date, dateStr, status: dayStatus, periods });
      }
    }

    return calendarDays;
  };

  const calendarDays = generateCalendarData();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const handleDateClick = (dateData: any) => {
    if (dateData.date && (dateData.status !== null || isEditing) && dateData.status !== 'holiday') {
      setSelectedDate(dateData);
      setPeriodDrafts(
        Object.fromEntries(
          (dateData.periods || []).map((period: any) => [period.periodNumber, period.status]),
        ),
      );
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'present':
        return 'bg-green-500 text-white';
      case 'absent':
        return 'bg-red-500 text-white';
      case 'partial':
        return 'bg-yellow-500 text-white';
      case 'holiday':
        return 'bg-gray-300 text-gray-600';
      default:
        return 'bg-white';
    }
  };

  const getModalDayStatus = () => {
    if (!selectedDate) return null;
    const periods = selectedDate.periods || [];
    const absentCount = periods.filter(
      (period: any) => (periodDrafts[period.periodNumber] || period.status) === 'absent',
    ).length;
    if (absentCount >= 3) return 'absent';
    if (absentCount === 0) return 'present';
    return 'partial';
  };

  const saveCalendarAttendance = async () => {
    if (!selectedDate?.dateStr) return;
    setSavingAttendance(true);
    try {
      for (const period of selectedDate.periods || []) {
        const nextStatus = periodDrafts[period.periodNumber] || period.status;
        if (period.rowIds.length > 0) {
          for (const rowId of period.rowIds) {
            await attendanceAPI.update(rowId, { status: nextStatus });
          }
          continue;
        }

        await attendanceAPI.bulkMark([
          {
            student_roll_number: rollNumber || registrationNumber,
            date: selectedDate.dateStr,
            period_number: period.periodNumber,
            subject: period.subject || `Period ${period.periodNumber}`,
            status: nextStatus,
          },
        ]);
      }

      await onAttendanceChanged();
      window.dispatchEvent(new Event('attendanceUpdated'));
      setSelectedDate(null);
      setPeriodDrafts({});
    } catch (error) {
      console.error('Failed to save calendar attendance:', error);
      alert('Failed to save attendance changes.');
    } finally {
      setSavingAttendance(false);
    }
  };

  return (
    <div>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevMonth}
          className="w-10 h-10 rounded-full bg-green-50 hover:bg-green-100 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-green-600" />
        </button>
        
        <h3 className="font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        
        <button
          onClick={handleNextMonth}
          className="w-10 h-10 rounded-full bg-green-50 hover:bg-green-100 flex items-center justify-center transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-green-600" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span className="text-gray-600">Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span className="text-gray-600">Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500"></div>
          <span className="text-gray-600">Partial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-300"></div>
          <span className="text-gray-600">Holiday</span>
        </div>
      </div>

      {/* Notice about attendance data */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 mb-4 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900">
          <span className="font-semibold">Note:</span> Attendance data shown below is synced with the admin attendance system. Changes made by admin will automatically reflect here.
        </p>
      </div>

      {/* Calendar Grid */}
      <div>
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                day.date
                  ? `${getStatusColor(day.status)} cursor-pointer hover:scale-105 shadow-sm`
                  : 'bg-transparent'
              }`}
              onClick={() => handleDateClick(day)}
            >
              {day.date || ''}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Date Modal */}
      {selectedDate && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => {
              setSelectedDate(null);
              setPeriodDrafts({});
            }}
          />

          {/* Modal Content */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto animate-scale-in border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    setSelectedDate(null);
                    setPeriodDrafts({});
                  }}
                  className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors active:scale-95"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              {/* Date Header */}
              <div className="text-center space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date</p>
                  <h3 className="text-gray-900">
                    {selectedDate.date} {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </h3>
                </div>

                {/* Status */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-3">Attendance Status</p>
                  <div className="flex items-center justify-center gap-3">
                    {getModalDayStatus() === 'present' && (
                      <>
                        <div className="w-4 h-4 bg-green-500 rounded-full" />
                        <span className="text-green-600 font-medium">Full Present</span>
                      </>
                    )}
                    {getModalDayStatus() === 'absent' && (
                      <>
                        <div className="w-4 h-4 bg-red-500 rounded-full" />
                        <span className="text-red-600 font-medium">Full Absent</span>
                      </>
                    )}
                    {getModalDayStatus() === 'partial' && (
                      <>
                        <div className="w-4 h-4 bg-yellow-500 rounded-full" />
                        <span className="text-yellow-600 font-medium">Partial Present</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Periods */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-3">Period-wise Attendance</p>
                  <div className="space-y-2.5">
                    {selectedDate.periods?.map((period: any) => (
                      <div
                        key={period.periodNumber}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg border-2 text-left ${
                          (periodDrafts[period.periodNumber] || period.status) === 'present'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                            <span className="text-xs font-medium text-gray-700">P{period.periodNumber}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{period.subject}</p>
                            <p className="text-xs text-gray-600">{period.faculty} • {attendanceTimeMap[`P${period.periodNumber}`]}</p>
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setPeriodDrafts((prev) => ({ ...prev, [period.periodNumber]: 'present' }))
                              }
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                (periodDrafts[period.periodNumber] || period.status) === 'present'
                                  ? 'bg-green-600 text-white'
                                  : 'border border-green-200 bg-white text-green-700'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPeriodDrafts((prev) => ({ ...prev, [period.periodNumber]: 'absent' }))
                              }
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                (periodDrafts[period.periodNumber] || period.status) === 'absent'
                                  ? 'bg-red-600 text-white'
                                  : 'border border-red-200 bg-white text-red-700'
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                        ) : (
                          <div
                            className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              (periodDrafts[period.periodNumber] || period.status) === 'present'
                                ? 'bg-green-500'
                                : 'bg-red-500'
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {isEditing && (
                  <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(null);
                        setPeriodDrafts({});
                      }}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveCalendarAttendance()}
                      disabled={savingAttendance}
                      className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingAttendance ? 'Saving...' : 'Save Attendance'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
