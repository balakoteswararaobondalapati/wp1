import React from 'react';
import { ArrowLeft, LogOut, Lock, User, Phone, Mail, Eye, EyeOff, CheckCircle2, Droplet, GraduationCap, Building2, Award, Clock } from 'lucide-react';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import { authAPI } from '../api';


interface AdminProfilePageProps {
  onBack: () => void;
  onLogout?: () => void;
}

export function AdminProfilePage({ onBack, onLogout }: AdminProfilePageProps) {
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
    name: 'Administrator',
    userId: '',
    email: '',
    contactNumber: '',
    department: 'Administration',
    gender: '',
    bloodGroup: '',
    qualification: '',
    experience: '',
    specialization: '',
  });

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const me = await authAPI.me();
        setProfileData({
          name: me.name || 'Administrator',
          userId: me.userId || me.username || '',
          email: me.email || '',
          contactNumber: me.phone || '',
          department: me.department || 'Administration',
          gender: me.gender || '',
          bloodGroup: me.blood_group || '',
          qualification: '',
          experience: '',
          specialization: '',
        });
      } catch (error) {
        console.error('Error loading admin profile:', error);
      }
    };

    void loadProfile();
  }, []);

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

      setTimeout(() => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowSuccess(false);
        setShowPasswordModal(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to update password:', error);
      setPasswordError(error instanceof Error ? error.message : 'Failed to update password. Please try again.');
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 font-['Poppins',sans-serif] pb-8">
      {/* Header - Green Theme */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg sticky top-0 z-10">
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
          </div>
        </div>
      </div>

      {/* Content Container - Centered with max width */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Profile Header Section */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-6">
          <div className="flex flex-col items-center">
            {/* Centered Circular Profile Photo */}
            <button
              onClick={() => setShowPhotoModal(true)}
              className="w-32 h-32 rounded-full border-4 border-green-100 shadow-xl mb-4 bg-green-200 flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
            >
              <User className="w-16 h-16 text-green-700" />
            </button>

            {/* Principal Badge */}
            <div className="inline-flex items-center px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm shadow-sm mb-3">
              <span className="font-medium">Principal</span>
            </div>

            {/* Admin Name */}
            <h1 className="text-gray-900 text-center mb-2">{profileData.name}</h1>

            {/* Admin ID */}
            <p className="text-gray-500 text-sm">Admin ID: {profileData.userId}</p>
          </div>
        </div>

        {/* Personal Information Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8 mb-6">
          {/* Card Heading */}
          <h2 className="text-gray-900 mb-6 pb-3 border-b-2 border-green-100">Personal Information</h2>
          
          <div className="space-y-4">
            {/* Email ID */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Email ID</p>
                <p className="text-gray-900 md:text-right break-all">{profileData.email}</p>
              </div>
            </div>

            {/* Contact Number */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Contact Number</p>
                <p className="text-gray-900 md:text-right">{profileData.contactNumber}</p>
              </div>
            </div>

           
            {/* Gender */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Gender</p>
                <p className="text-gray-900 md:text-right">{profileData.gender}</p>
              </div>
            </div>

            {/* Blood Group */}
            <div className="flex items-center gap-4 py-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <Droplet className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Blood Group</p>
                <p className="text-gray-900 md:text-right">{profileData.bloodGroup}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Information Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8">
          {/* Card Heading */}
          <h2 className="text-gray-900 mb-6 pb-3 border-b-2 border-green-100">Professional Information</h2>
          
          <div className="space-y-4">
            {/* Qualification */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Qualification</p>
                <p className="text-gray-900 md:text-right">{profileData.qualification}</p>
              </div>
            </div>
             {/* Department */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Department</p>
                <p className="text-gray-900 md:text-right">{profileData.department}</p>
              </div>
            </div>

            {/* Specialization */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100 ">
                          <div className="flex-shrink-0 w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Specialization</p>
                <p className="text-gray-900 md:text-right">{profileData.specialization}</p>
              </div>
            </div>

            {/* Experience */}
            <div className="flex items-center gap-4 py-3 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <p className="text-gray-600 text-sm">Experience</p>
                <p className="text-gray-900 md:text-right">{profileData.experience}</p>
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
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
      {showLogoutModal && (
        <LogoutConfirmModal
          onClose={() => setShowLogoutModal(false)}
          onConfirm={onLogout}
        />
      )}

      {/* Profile Photo Modal */}
      {showPhotoModal && (
        <ProfilePhotoModal
          photoUrl={undefined}
          userName={profileData.name}
          onClose={() => setShowPhotoModal(false)}
          themeColor="green"
        />
      )}
    </div>
  );
}
