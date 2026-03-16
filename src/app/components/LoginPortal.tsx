import React, { useState, useRef, useEffect } from 'react';
import { GraduationCap, Eye, EyeOff, Mail, CheckCircle2 } from 'lucide-react';
import { authAPI } from '../api';

interface LoginPortalProps {
  onLogin: (role: string) => void;
}

type Role = 'student' | 'lecturer' | 'admin';

export function LoginPortal({ onLogin }: LoginPortalProps) {
  const [selectedRole, setSelectedRole] = useState<Role>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot Password States
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'otp' | 'reset'>('otp');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await authAPI.login(email.trim(), password, selectedRole);
      onLogin(selectedRole);
    } catch {
      alert('Invalid credentials. Please check your username/email and password.');
    }
  };

  // Forgot Password Handlers
  const handleSendOTP = async () => {
    setResetError('');
    if (!email) {
      setResetError('Please enter your email');
      return;
    }
    try {
      setResetLoading(true);
      await authAPI.forgotPassword(email.trim());
      setOtpSent(true);
      setForgotPasswordStep('otp');
    } catch (error: any) {
      setResetError(error?.message || 'Failed to send OTP');
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setResetError('');
    if (otp.some(digit => digit === '')) {
      setResetError('Please enter complete OTP');
      return;
    }
    try {
      setResetLoading(true);
      const res = await authAPI.verifyOtp(email.trim(), otp.join(''));
      if (res?.valid) {
        setForgotPasswordStep('reset');
      } else {
        setResetError('Invalid or expired OTP');
      }
    } catch (error: any) {
      setResetError(error?.message || 'Failed to verify OTP');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setResetError('');
    
    if (!newPassword || !confirmNewPassword) {
      setResetError('Please fill in all fields');
      return;
    }
    
    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      setResetError('Passwords do not match');
      return;
    }

    try {
      setResetLoading(true);
      await authAPI.resetPassword(email.trim(), otp.join(''), newPassword);
      setResetSuccess(true);

      // Close modal and reset after 2 seconds
      setTimeout(() => {
        handleCloseForgotPassword();
      }, 2000);
    } catch (error: any) {
      setResetError(error?.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPasswordModal(false);
    setForgotPasswordStep('otp');
    setOtp(['', '', '', '', '', '']);
    setNewPassword('');
    setConfirmNewPassword('');
    setResetError('');
    setResetSuccess(false);
    setOtpSent(false);
    setResetLoading(false);
  };

  // Mask email for display in OTP section
  const getMaskedEmail = () => {
    const emailValue = email || 'student149@gmail.com';
    const atIndex = emailValue.indexOf('@');
    
    if (atIndex > 0) {
      const localPart = emailValue.substring(0, atIndex);
      const domain = emailValue.substring(atIndex);
      
      if (localPart.length > 4) {
        // Show first char + asterisks + last 2-3 chars
        const firstChar = localPart[0];
        const lastChars = localPart.substring(localPart.length - 3); // Last 3 characters
        const middleLength = localPart.length - 4; // Total - first - last3
        const asterisks = '*'.repeat(Math.max(middleLength, 6)); // At least 6 asterisks
        return `${firstChar}${asterisks}${lastChars}${domain}`;
      } else {
        // For very short emails, show first char + asterisks + domain
        return `${localPart[0]}******${domain}`;
      }
    }
    
    return emailValue;
  };

  // Get input field properties based on role
  const getInputLabel = () => {
    return selectedRole === 'student' ? 'Email' : 'User ID';
  };

  const getInputPlaceholder = () => {
    switch (selectedRole) {
      case 'student':
        return 'Enter your email';
      case 'lecturer':
        return 'Enter your user ID (e.g., lecturer123)';
      case 'admin':
        return 'Enter your user ID (e.g., Admin1)';
    }
  };

  const getInputType = () => {
    return selectedRole === 'student' ? 'email' : 'text';
  };

  // Get color scheme based on selected role
  const getColorScheme = () => {
    switch (selectedRole) {
      case 'student':
        return {
          bg: 'from-blue-600 to-indigo-600',
          bgHover: 'hover:from-blue-700 hover:to-indigo-700',
          button: 'bg-blue-600',
          text: 'text-blue-600',
          textHover: 'hover:text-blue-700',
          ring: 'focus:ring-blue-500',
          logo: 'from-blue-600 to-indigo-700',
        };
      case 'lecturer':
        return {
          bg: 'from-red-500 to-red-600',
          bgHover: 'hover:from-red-600 to-red-600',
          button: 'bg-red-500',
          text: 'text-red-600',
          textHover: 'hover:text-red-700',
          ring: 'focus:ring-red-500',
          logo: 'from-red-500 to-red-600',
        };
      case 'admin':
        return {
          bg: 'from-green-500 to-emerald-600',
          bgHover: 'hover:from-green-600 hover:to-emerald-700',
          button: 'bg-green-500',
          text: 'text-green-600',
          textHover: 'hover:text-green-700',
          ring: 'focus:ring-green-500',
          logo: 'from-green-500 to-emerald-600',
        };
    }
  };

  const colors = getColorScheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4 font-['Poppins',sans-serif]">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${colors.logo} flex items-center justify-center shadow-md transition-all duration-300`}>
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Institution Name */}
          <h1 className="text-center text-gray-900 mb-8">Institution Name</h1>

          {/* Role Selector */}
          <div className="mb-8">
            <div className="bg-gray-100 rounded-full p-1 flex gap-1">
              <button
                type="button"
                onClick={() => setSelectedRole('student')}
                className={`flex-1 py-2.5 px-4 rounded-full transition-all duration-200 ${
                  selectedRole === 'student'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('lecturer')}
                className={`flex-1 py-2.5 px-4 rounded-full transition-all duration-200 ${
                  selectedRole === 'lecturer'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Faculty
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('admin')}
                className={`flex-1 py-2.5 px-4 rounded-full transition-all duration-200 ${
                  selectedRole === 'admin'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Admin
              </button>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-gray-700 mb-2">
                  {getInputLabel()}
                </label>
                <input
                  id="email"
                  type={getInputType()}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={getInputPlaceholder()}
                  className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 ${colors.ring} focus:border-transparent transition-all`}
                  required
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 ${colors.ring} focus:border-transparent transition-all`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="flex justify-end">
                <button
                  type="button"
                  className={`${colors.text} ${colors.textHover} text-sm transition-colors`}
                  onClick={() => {
                    setShowForgotPasswordModal(true);
                    void handleSendOTP();
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                className={`w-full bg-gradient-to-r ${colors.bg} text-white py-3.5 rounded-xl ${colors.bgHover} transition-all duration-200 shadow-md hover:shadow-lg`}
              >
                Login
              </button>

            </div>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md px-7 pt-7 pb-6">
            <h3 className="text-gray-900 mb-5 pb-4 border-b border-gray-200">
              {forgotPasswordStep === 'otp' && 'Verify OTP'}
              {forgotPasswordStep === 'reset' && 'Reset Password'}
            </h3>

            {/* Step 1: Verify OTP */}
            {forgotPasswordStep === 'otp' && (
              <div className="space-y-6">
                {otpSent && (
                  <div className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 bg-${selectedRole === 'student' ? 'blue' : selectedRole === 'lecturer' ? 'red' : 'green'}-50`}>
                    <CheckCircle2 className={`w-5 h-5 shrink-0 ${colors.text}`} />
                    <div className="flex-1">
                      <p className="text-gray-700 text-sm leading-5">
                        OTP has been sent to your registered email!
                      </p>
                      <p className={`${colors.text} text-sm mt-1 leading-5`}>
                        {getMaskedEmail()}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="pt-1">
                  <label className="block text-gray-700 mb-4 text-center">
                    Enter 6-Digit OTP
                  </label>
                  <div className="flex justify-center gap-2.5">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        type="text"
                        inputMode="numeric"
                        value={digit}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 1) {
                            const newOtp = [...otp];
                            newOtp[index] = value;
                            setOtp(newOtp);
                            
                            // Auto-focus next input
                            if (value && index < 5) {
                              const nextInput = document.getElementById(`otp-${index + 1}`);
                              nextInput?.focus();
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          // Handle backspace to go to previous input
                          if (e.key === 'Backspace' && !otp[index] && index > 0) {
                            const prevInput = document.getElementById(`otp-${index - 1}`);
                            prevInput?.focus();
                          }
                        }}
                        id={`otp-${index}`}
                        className={`h-14 w-14 border-2 border-gray-300 rounded-2xl focus:outline-none focus:ring-2 ${colors.ring} focus:border-transparent text-center text-2xl`}
                        maxLength={1}
                      />
                    ))}
                  </div>
                </div>

                {resetError && (
                  <p className="text-red-500 text-sm text-center">{resetError}</p>
                )}

                <div className="flex items-center justify-end gap-4 pt-1">
                  <button
                    onClick={handleCloseForgotPassword}
                    className="px-4 py-2.5 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyOTP}
                    disabled={resetLoading || !otpSent}
                    className={`min-w-[128px] px-5 py-2.5 bg-gradient-to-r ${colors.bg} text-white rounded-xl ${colors.bgHover} transition-all shadow-md ${resetLoading || !otpSent ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {resetLoading ? 'Verifying...' : 'Confirm OTP'}
                  </button>
                </div>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={resetLoading}
                    className={`${colors.text} ${colors.textHover} text-sm transition-colors`}
                  >
                    Resend OTP
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Reset Password */}
            {forgotPasswordStep === 'reset' && (
              <div className="space-y-6">
                {/* New Password */}
                <div>
                  <label className="block text-gray-700 mb-2.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className={`w-full rounded-2xl border border-gray-300 px-4 py-3.5 pr-12 focus:outline-none focus:ring-2 ${colors.ring} focus:border-transparent`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-gray-700 mb-2.5">
                    Re-enter Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className={`w-full rounded-2xl border border-gray-300 px-4 py-3.5 pr-12 focus:outline-none focus:ring-2 ${colors.ring} focus:border-transparent`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {resetError && (
                  <p className="text-red-500 text-sm">{resetError}</p>
                )}

                {resetSuccess && (
                  <div className="flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3.5">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <p className="text-green-600 text-sm">Password changed successfully!</p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-4 pt-1">
                  <button
                    onClick={handleCloseForgotPassword}
                    className="px-4 py-2.5 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                    className={`min-w-[148px] px-5 py-2.5 bg-gradient-to-r ${colors.bg} text-white rounded-xl ${colors.bgHover} transition-all shadow-md ${resetLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {resetLoading ? 'Updating...' : 'Change Password'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
