import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Save, X, User, Phone, Mail, Calendar, Award, Briefcase, BookOpen, MapPin, Droplet, Users, Hash, Building2, GraduationCap, Clock, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Upload, Key, Eye, EyeOff, AlertCircle, Trash2 } from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboard';
import { DEPARTMENTS } from '@/constants/departments';
import { facultyAPI, facultyStatusAPI } from '../api';

interface FacultyProfileDetailPageProps {
  faculty: {
    id: number;
    name: string;
    employeeId: string;
    department: string;
    designation: string;
    email: string;
    phone: string;
    joiningDate: string;
    status: 'active' | 'inactive';
    subjects: string[];
    gender?: string;
    bloodGroup?: string;
    qualification?: string;
    experience?: string;
    specialization?: string;
    age?: string;
    profilePicture?: string;
  };
  onBack: () => void;
}

export function FacultyProfileDetailPage({ faculty, onBack }: FacultyProfileDetailPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [profileImageUrl, setProfileImageUrl] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  // Credentials are backend-managed and never exposed to admin UI.
  const [loginCredentials] = useState<{
    userId: string;
    password: string;
  } | null>(null);

  const [profileData, setProfileData] = useState({
    name: faculty.name,
    userId: faculty.employeeId,
    email: faculty.email,
    contactNumber: faculty.phone,
    department: faculty.department,
    dateOfBirth: '',
    gender: faculty.gender || '',
    bloodGroup: faculty.bloodGroup || '',
    qualification: faculty.qualification || '',
    experience: faculty.experience || '',
    specialization: faculty.specialization || '',
    age: faculty.age || '',
    facultyTag: faculty.designation || 'Faculty',
  });

  useEffect(() => {
    if (faculty.profilePicture) {
      setProfileImageUrl(faculty.profilePicture);
    }
  }, [faculty.profilePicture]);

  // Calculate age from date of birth
  const calculateAge = (dob: string): number => {
    if (!dob || !dob.includes('-')) return 0;
    const birthDate = new Date(dob.split('-').reverse().join('-'));
    if (Number.isNaN(birthDate.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(profileData.dateOfBirth);

  const [attendanceData, setAttendanceData] = useState<Record<string, 'present' | 'absent' | 'holiday'>>({});
  const [attendanceStats, setAttendanceStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    percentage: 0,
  });

  useEffect(() => {
    const toUiStatus = (value: string): 'present' | 'absent' | null => {
      const status = String(value || '').toLowerCase();
      if (status === 'present' || status === 'available' || status === 'active') return 'present';
      if (status === 'leave' || status === 'absent' || status === 'blocked') return 'absent';
      return null;
    };

    const loadAttendance = async () => {
      try {
        const monthlyRows = await facultyStatusAPI.monthly(selectedMonth + 1, selectedYear);
        const ownMonthlyRows = (monthlyRows || []).filter(
          (row: any) => Number(row.faculty_id) === Number(faculty.id),
        );

        const presentDays = ownMonthlyRows
          .filter((row: any) => toUiStatus(String(row.status || '')) === 'present')
          .reduce((sum: number, row: any) => sum + Number(row.days_count || 0), 0);
        const absentDays = ownMonthlyRows
          .filter((row: any) => toUiStatus(String(row.status || '')) === 'absent')
          .reduce((sum: number, row: any) => sum + Number(row.days_count || 0), 0);
        const totalDays = presentDays + absentDays;
        const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        setAttendanceStats({ totalDays, presentDays, absentDays, percentage });

        const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-`;
        let statusRows: any[] = [];
        try {
          const maybeAllRows = await facultyStatusAPI.getByDate();
          statusRows = (maybeAllRows || []).filter(
            (row: any) =>
              Number(row.faculty_id) === Number(faculty.id) &&
              String(row.date_value || '').startsWith(monthPrefix),
          );
        } catch {
          statusRows = [];
        }

        if (statusRows.length === 0) {
          const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
          const today = new Date();
          const dateValues: string[] = [];
          for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(selectedYear, selectedMonth, day);
            if (dateObj > today) continue;
            dateValues.push(
              `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            );
          }
          const dailyRows = await Promise.all(
            dateValues.map((dateValue) => facultyStatusAPI.getByDate(dateValue).catch(() => [])),
          );
          statusRows = dailyRows
            .flat()
            .filter((row: any) => Number(row.faculty_id) === Number(faculty.id));
        }

        const nextData: Record<string, 'present' | 'absent' | 'holiday'> = {};
        statusRows.forEach((row: any) => {
          const dateKey = String(row.date_value || '').slice(0, 10);
          const status = toUiStatus(String(row.status || ''));
          if (!dateKey || !status) return;
          if (status === 'absent') {
            nextData[dateKey] = 'absent';
          } else if (!nextData[dateKey]) {
            nextData[dateKey] = 'present';
          }
        });

        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
          const dateObj = new Date(selectedYear, selectedMonth, day);
          if (dateObj > today) continue;
          if (dateObj.getDay() !== 0) continue;
          const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          if (!nextData[dateKey]) {
            nextData[dateKey] = 'holiday';
          }
        }

        setAttendanceData(nextData);
      } catch (error) {
        console.error('Error loading faculty attendance:', error);
        setAttendanceData({});
        setAttendanceStats({
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          percentage: 0,
        });
      }
    };

    void loadAttendance();
  }, [selectedMonth, selectedYear, faculty.id]);
  // Calendar rendering logic
  const getFirstDayOfMonth = () => {
    return new Date(selectedYear, selectedMonth, 1).getDay();
  };

  const getDaysInMonth = () => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  };

  const renderCalendar = () => {
    const firstDay = getFirstDayOfMonth();
    const daysInMonth = getDaysInMonth();
    const days = [];
    const today = new Date();

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSunday = date.getDay() === 0;
      const isFuture = date > today;
      const isToday = date.toDateString() === today.toDateString();
      const attendance = attendanceData[dateKey];

      let bgColor = 'bg-gray-100';
      let textColor = 'text-gray-400';
      let icon = null;

      if (isSunday) {
        bgColor = 'bg-gray-200';
        textColor = 'text-gray-500';
      } else if (isFuture) {
        bgColor = 'bg-gray-50';
        textColor = 'text-gray-300';
      } else if (attendance === 'present') {
        bgColor = 'bg-green-100';
        textColor = 'text-green-700';
        icon = <CheckCircle2 className="w-3 h-3 text-green-600 absolute top-1 right-1" />;
      } else if (attendance === 'absent') {
        bgColor = 'bg-red-100';
        textColor = 'text-red-700';
        icon = <XCircle className="w-3 h-3 text-red-600 absolute top-1 right-1" />;
      } else if (attendance === 'holiday') {
        bgColor = 'bg-gray-200';
        textColor = 'text-gray-500';
      }

      days.push(
        <div
          key={day}
          className={`aspect-square ${bgColor} rounded-lg flex items-center justify-center relative transition-all ${
            isToday ? 'ring-2 ring-red-500' : ''
          }`}
        >
          <span className={`text-sm font-medium ${textColor}`}>{day}</span>
          {icon}
        </div>
      );
    }

    return days;
  };

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleSave = async () => {
    try {
      await facultyAPI.update(Number(faculty.id), {
        name: profileData.name,
        email: profileData.email,
        employeeId: profileData.userId,
        department: profileData.department,
        role: profileData.facultyTag,
        phone: profileData.contactNumber,
        gender: profileData.gender,
        bloodGroup: profileData.bloodGroup,
        age: profileData.age,
        qualification: profileData.qualification,
        experience: profileData.experience,
        specialization: profileData.specialization,
        profilePicture: profileImageUrl || '',
      });
      window.dispatchEvent(new Event('facultyRegistered'));
      window.dispatchEvent(new Event('faculty_profile_updated'));
      
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving faculty data:', error);
      alert('Failed to save faculty profile. Please check required fields (especially email) and try again.');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original data if needed
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${faculty.name}?\n\nThis will:\n- Remove the faculty member from the system\n- Delete their login credentials\n- Remove all associated data\n\nThis action cannot be undone.`)) {
      try {
        await facultyAPI.delete(Number(faculty.id));

        // Dispatch event to refresh the faculty list
        window.dispatchEvent(new CustomEvent('facultyRegistered'));

        alert('Faculty member deleted successfully!');
        onBack();
      } catch (error) {
        console.error('Error deleting faculty:', error);
        alert('Failed to delete faculty member. Please try again.');
      }
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 font-['Poppins',sans-serif] pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h2 className="text-white flex-1">Faculty Profile</h2>
          
          {/* Edit/Save Button */}
          <button
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors active:scale-95"
          >
            {isEditing ? (
              <>
                <Save className="w-5 h-5 text-white" />
                <span className="text-white text-sm">Save</span>
              </>
            ) : (
              <>
                <Edit2 className="w-5 h-5 text-white" />
                <span className="text-white text-sm">Edit</span>
              </>
            )}
          </button>
          
          {isEditing && (
            <>
              <button
                onClick={handleCancel}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors active:scale-95"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              
              {/* Delete Button - Only shown in edit mode */}
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/90 hover:bg-red-600 rounded-xl transition-colors active:scale-95"
                title="Delete Faculty"
              >
                <Trash2 className="w-5 h-5 text-white" />
                <span className="text-white text-sm">Delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Profile Header Section */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-6">
          <div className="flex flex-col items-center">
            {/* Profile Photo */}
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-green-100 shadow-xl mb-4 bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-green-600" />
                )}
              </div>
              {isEditing && (
                <label className="absolute bottom-4 right-0 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-green-700 transition-colors shadow-lg">
                  <Upload className="w-5 h-5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setProfileImageUrl(event.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* Faculty Badge - Editable */}
            {isEditing ? (
              <input
                type="text"
                value={profileData.facultyTag}
                onChange={(e) => setProfileData({ ...profileData, facultyTag: e.target.value })}
                className="inline-flex items-center px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm mb-3 shadow-sm border-2 border-green-200 focus:outline-none focus:border-green-500 text-center"
              />
            ) : (
              <div className="inline-flex items-center px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm mb-3 shadow-sm">
                <span className="font-medium">{profileData.facultyTag}</span>
              </div>
            )}

            {/* Faculty Name */}
            {isEditing ? (
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="text-center text-gray-900 mb-2 px-4 py-2 border-2 border-green-200 rounded-xl focus:outline-none focus:border-green-500 w-full max-w-md"
              />
            ) : (
              <h1 className="text-gray-900 text-center mb-2">{profileData.name}</h1>
            )}

            {/* Employee ID */}
            <p className="text-gray-500 text-sm">User ID: {profileData.userId}</p>
            
            {/* Status Badge */}
            <div className={`mt-3 inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium ${
              faculty.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {faculty.status === 'active' ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>

        {/* Login Credentials Card */}
        {loginCredentials && (
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-3xl shadow-lg p-6 md:p-8 mb-6 border-2 border-orange-100">
            <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-orange-200">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                <Key className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-gray-900 flex-1">Login Credentials</h2>
              <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                Faculty Portal
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Username/User ID */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-sm text-gray-500 mb-2">Username / User ID</p>
                <div className="flex items-center justify-between">
                  <p className="font-mono font-medium text-gray-900 text-lg">{loginCredentials.userId}</p>
                  <button
                    onClick={async () => {
                      const success = await copyToClipboard(loginCredentials.userId);
                      if (success) {
                        alert('Username copied to clipboard!');
                      } else {
                        alert('Unable to copy. Please copy manually.');
                      }
                    }}
                    className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-200 transition-colors active:scale-95 font-medium"
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
                    onClick={async () => {
                      const success = await copyToClipboard(loginCredentials.password);
                      if (success) {
                        alert('Password copied to clipboard!');
                      } else {
                        alert('Unable to copy. Please copy manually.');
                      }
                    }}
                    className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-200 transition-colors active:scale-95 font-medium"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-900">
                    <span className="font-semibold">Note:</span> These credentials are used by the faculty member to access the Faculty Portal. 
                    If the faculty changes their password, it will be automatically updated here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Personal Information Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8 mb-6">
          <h2 className="text-gray-900 mb-6 pb-3 border-b-2 border-green-100">Personal Information</h2>
          
          <div className="space-y-4">
            {/* Email ID */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Email ID</p>
                {isEditing ? (
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 md:text-right"
                  />
                ) : (
                  <p className="text-gray-900 md:text-right break-all">{profileData.email}</p>
                )}
              </div>
            </div>

            {/* Contact Number */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Contact Number</p>
                {isEditing ? (
                  <input
                    type="tel"
                    value={profileData.contactNumber}
                    onChange={(e) => setProfileData({ ...profileData, contactNumber: e.target.value })}
                    className="px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 md:text-right"
                  />
                ) : (
                  <p className="text-gray-900 md:text-right">{profileData.contactNumber}</p>
                )}
              </div>
            </div>

            {/* Gender */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Gender</p>
                {isEditing ? (
                  <select
                    value={profileData.gender}
                    onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                    className="px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 md:text-right"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <p className="text-gray-900 md:text-right">{profileData.gender}</p>
                )}
              </div>
            </div>

            {/* Age */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Age</p>
                <p className="text-gray-900 md:text-right">{age} years</p>
              </div>
            </div>

            {/* Blood Group */}
            <div className="flex items-center gap-4 py-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <Droplet className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Blood Group</p>
                {isEditing ? (
                  <select
                    value={profileData.bloodGroup}
                    onChange={(e) => setProfileData({ ...profileData, bloodGroup: e.target.value })}
                    className="px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 md:text-right"
                  >
                    <option value="">Select Blood Group</option>
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
                  <p className="text-gray-900 md:text-right">{profileData.bloodGroup}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Professional Information Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8 mb-6">
          <h2 className="text-gray-900 mb-6 pb-3 border-b-2 border-green-100">Professional Information</h2>
          
          <div className="space-y-4">
            {/* Qualification */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Qualification</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.qualification}
                    onChange={(e) => setProfileData({ ...profileData, qualification: e.target.value })}
                    className="px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 md:text-right"
                  />
                ) : (
                  <p className="text-gray-900 md:text-right">{profileData.qualification}</p>
                )}
              </div>
            </div>

            {/* Experience */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Experience</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.experience}
                    onChange={(e) => setProfileData({ ...profileData, experience: e.target.value })}
                    className="px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 md:text-right"
                  />
                ) : (
                  <p className="text-gray-900 md:text-right">{profileData.experience}</p>
                )}
              </div>
            </div>

            {/* Department */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Department</p>
                {isEditing ? (
                  <select
                    value={profileData.department}
                    onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                    className="px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 md:text-right"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900 md:text-right">{profileData.department}</p>
                )}
              </div>
            </div>

            {/* Specialization */}
            <div className="flex items-center gap-4 py-3">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Specialization</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.specialization}
                    onChange={(e) => setProfileData({ ...profileData, specialization: e.target.value })}
                    className="px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 md:text-right"
                  />
                ) : (
                  <p className="text-gray-900 md:text-right">{profileData.specialization}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Calendar Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8">
          <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-green-100">
            <h2 className="text-gray-900">Attendance Calendar</h2>
            <Clock className="w-6 h-6 text-green-600" />
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h3 className="text-gray-900">{monthNames[selectedMonth]} {selectedYear}</h3>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="mb-6">
            {/* Day Names */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center">
                  <span className="text-xs font-medium text-gray-600">{day}</span>
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {renderCalendar()}
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded border border-green-200"></div>
              <span className="text-xs text-gray-600">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 rounded border border-red-200"></div>
              <span className="text-xs text-gray-600">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded border border-gray-300"></div>
              <span className="text-xs text-gray-600">Holiday</span>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-gray-900 text-sm mb-4">Monthly Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-sm text-gray-600 mb-1">Present</p>
                <p className="text-green-700 font-bold">
                  {Object.values(attendanceData).filter(a => a === 'present').length}
                </p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-sm text-gray-600 mb-1">Absent</p>
                <p className="text-red-700 font-bold">
                  {Object.values(attendanceData).filter(a => a === 'absent').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Attendance Statistics Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8 mt-6">
          <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-green-100">
            <h2 className="text-gray-900">Overall Attendance Statistics</h2>
            <Clock className="w-6 h-6 text-green-600" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-2">Total Days</p>
              <p className="text-blue-700 font-bold text-2xl">{attendanceStats.totalDays}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-2">Present</p>
              <p className="text-green-700 font-bold text-2xl">{attendanceStats.presentDays}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-2">Absent</p>
              <p className="text-red-700 font-bold text-2xl">{attendanceStats.absentDays}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-2">Percentage</p>
              <p className="text-purple-700 font-bold text-2xl">{attendanceStats.percentage}%</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500"
              style={{ width: `${attendanceStats.percentage}%` }}
            ></div>
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">
            Attendance Rate: {attendanceStats.percentage}%
          </p>
        </div>
      </div>
    </div>
  );
}

