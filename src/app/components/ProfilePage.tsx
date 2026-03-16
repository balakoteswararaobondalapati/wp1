import React from 'react';
import { ArrowLeft, LogOut, Lock, Eye, EyeOff, CheckCircle2, User, Phone, Mail, BookOpen, Users, Droplet, Calendar, Hash, CreditCard, GraduationCap, Layers, MapPin } from 'lucide-react';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import { authAPI } from '../api';


interface ProfilePageProps {
  onBack: () => void;
  onLogout?: () => void;
}

export function ProfilePage({ onBack, onLogout }: ProfilePageProps) {
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [showPhotoModal, setShowPhotoModal] = React.useState(false);
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showOldPassword, setShowOldPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState('');
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [profileData, setProfileData] = React.useState({
    name: 'Student',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    studentPhone: '',
    email: '',
    fatherName: '',
    fatherPhone: '',
    stream: '',
    section: '',
    rollNumber: '',
    registerNumber: '',
    academicYear: '',
    currentSemester: '',
    address: '',
  });

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const me = await authAPI.me();
        setProfileData((prev) => ({
          ...prev,
          name: me.name || 'Student',
          email: me.email || '',
          stream: me.course || me.department || '',
          section: me.section || '',
          rollNumber: me.roll_number || '',
          currentSemester: me.semester || '',
          registerNumber: me.register_number || '',
          studentPhone: me.phone || '',
          dateOfBirth: me.date_of_birth || '',
          gender: me.gender || '',
          bloodGroup: me.blood_group || '',
          address: me.address || '',
          academicYear: me.academic_year || '',
          fatherName: me.parent_name || '',
          fatherPhone: me.parent_phone || '',
        }));
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    void loadProfile();
  }, []);

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

  const age = calculateAge(profileData.dateOfBirth);

  const handlePasswordChange = async () => {
    setPasswordError('');
    
    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all fields');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    try {
      await authAPI.updateMe({ current_password: oldPassword, password: newPassword });
      
      setShowSuccess(true);
      
      // Reset form and close modal after 2 seconds
      setTimeout(() => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowSuccess(false);
        setShowPasswordModal(false);
      }, 2000);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to update password');
      console.error('Password update error:', error);
    }
  };

  const handleCloseModal = () => {
    setShowPasswordModal(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setShowSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 font-['Poppins',sans-serif] pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-600 shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h2 className="text-white flex-1">Profile</h2>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Change Password Button */}
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors active:scale-95"
              title="Change Password"
            >
              <Lock className="w-5 h-5 text-white" />
            </button>
            
            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors active:scale-95"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Container - Centered with max width */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Profile Header Section */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-6">
          <div className="flex flex-col items-center justify-center gap-6">
            {/* Left: Profile Info */}
            <div className="flex flex-col items-center flex-1">
              {/* Centered Circular Profile Photo */}
              <button
                onClick={() => setShowPhotoModal(true)}
                className="w-32 h-32 rounded-full border-4 border-blue-100 shadow-xl mb-4 bg-blue-200 flex items-center justify-center hover:scale-105 transition-transform active:scale-95 overflow-hidden"
              >
                <User className="w-16 h-16 text-blue-700" />
              </button>

              {/* Student Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm mb-3 shadow-sm">
                <span className="font-medium">Student</span>
              </div>

              {/* Student Full Name */}
              <h1 className="text-gray-900 text-center mb-2">{profileData.name}</h1>

              {/* Date of Birth */}
              <p className="text-gray-500 text-sm text-center">Date of Birth: {profileData.dateOfBirth}</p>
            </div>
          </div>
        </div>

        {/* Personal Information Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8">
          {/* Card Heading */}
          <h2 className="text-gray-900 mb-6 pb-3 border-b-2 border-blue-100">Student Information</h2>
          
          <div className="space-y-4">
            {/* Gender */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Gender</p>
                <p className="text-gray-900 md:text-right">{profileData.gender}</p>
              </div>
            </div>

            {/* Age */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Age</p>
                <p className="text-gray-900 md:text-right">{age} years</p>
              </div>
            </div>

            {/* Blood Group */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <Droplet className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Blood Group</p>
                <p className="text-gray-900 md:text-right">{profileData.bloodGroup}</p>
              </div>
            </div>

            {/* Student Phone Number */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Student Phone Number</p>
                <p className="text-gray-900 md:text-right">{profileData.studentPhone}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Email</p>
                <p className="text-gray-900 md:text-right break-all">{profileData.email}</p>
              </div>
            </div>

            {/* Father Name */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Father Name</p>
                <p className="text-gray-900 md:text-right">{profileData.fatherName}</p>
              </div>
            </div>

            {/* Father Phone Number */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Father Phone Number</p>
                <p className="text-gray-900 md:text-right">{profileData.fatherPhone}</p>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Address</p>
                <p className="text-gray-900 md:text-right">{profileData.address}</p>
              </div>
            </div>

            {/* Stream */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Course</p>
                <p className="text-gray-900 md:text-right">{profileData.stream}</p>
              </div>
            </div>

            {/* Section */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Layers className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Section</p>
                <p className="text-gray-900 md:text-right">{profileData.section}</p>
              </div>
            </div>

            {/* Roll Number */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Hash className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Roll Number</p>
                <p className="text-gray-900 md:text-right">{profileData.rollNumber}</p>
              </div>
            </div>

            {/* Register Number */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Register Number</p>
                <p className="text-gray-900 md:text-right">{profileData.registerNumber}</p>
              </div>
            </div>

            {/* Academic Year */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Academic Year</p>
                <p className="text-gray-900 md:text-right">{profileData.academicYear}</p>
              </div>
            </div>

            {/* Current Semester */}
            <div className="flex items-center gap-4 py-3">
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Current Semester</p>
                <p className="text-gray-900 md:text-right">{profileData.currentSemester}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
            {/* Success State */}
            {showSuccess ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-gray-900 mb-2">Password Changed!</h3>
                <p className="text-gray-600">Your password has been updated successfully.</p>
              </div>
            ) : (
              <>
                <h2 className="text-gray-900 mb-6">Change Password</h2>
                
                <div className="space-y-4 mb-6">
                  {/* Old Password */}
                  <div className="relative">
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Old Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* New Password */}
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="New Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Confirm Password */}
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Confirm New Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {passwordError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-600 text-sm">{passwordError}</p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordChange}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Update
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Logout Confirm Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          if (onLogout) onLogout();
        }}
        colorTheme="blue"
      />

      {/* Profile Photo Modal */}
      {showPhotoModal && (
        <ProfilePhotoModal
          photoUrl={undefined}
          userName={profileData.name}
          onClose={() => setShowPhotoModal(false)}
          themeColor="blue"
        />
      )}
    </div>
  );
}
