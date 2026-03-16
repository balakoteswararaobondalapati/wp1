import React from 'react';
import { X, User, Phone, Mail, BookOpen, Hash, Layers, MapPin, Calendar, Users, Droplet } from 'lucide-react';


interface StudentData {
  name: string;
  rollNo: string;
  semester: string;
  section: string;
  phone: string;
  email: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  fatherName?: string;
  fatherPhone?: string;
  stream?: string;
  registerNumber?: string;
  academicYear?: string;
  address?: string;
  profilePicture?: string;
}

interface StudentProfileModalProps {
  student: StudentData;
  onClose: () => void;
  themeColor?: 'blue' | 'green' | 'red';
}

export function StudentProfileModal({ student, onClose, themeColor = 'blue' }: StudentProfileModalProps) {
  const [showPhotoModal, setShowPhotoModal] = React.useState(false);

  const getColorClasses = () => {
    switch (themeColor) {
      case 'green':
        return {
          gradient: 'from-green-600 to-emerald-600',
          bg: 'bg-green-600',
          text: 'text-green-600',
          border: 'border-green-600',
          bgLight: 'bg-green-50',
        };
      case 'red':
        return {
          gradient: 'from-red-600 to-orange-600',
          bg: 'bg-red-600',
          text: 'text-red-600',
          border: 'border-red-600',
          bgLight: 'bg-red-50',
        };
      default:
        return {
          gradient: 'from-blue-600 to-indigo-600',
          bg: 'bg-blue-600',
          text: 'text-blue-600',
          border: 'border-blue-600',
          bgLight: 'bg-blue-50',
        };
    }
  };

  const colors = getColorClasses();

  // Calculate age if DOB is provided
  const calculateAge = (dob: string): number => {
    const [day, month, year] = dob.split('-').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = student.dateOfBirth ? calculateAge(student.dateOfBirth) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-slideUp">
        {/* Header */}
        <div className={`bg-gradient-to-r ${colors.gradient} text-white px-6 py-6 relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Profile Image */}
          <div className="flex flex-col items-center mb-4">
            <button
              onClick={() => setShowPhotoModal(true)}
              className="w-24 h-24 rounded-full border-4 border-white/30 mb-3 shadow-lg bg-white/20 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform active:scale-95"
            >
              {student.profilePicture ? (
                <img
                  src={student.profilePicture}
                  alt={student.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-white" />
              )}
            </button>
            <h2 className="text-xl font-semibold text-center">{student.name}</h2>
            <p className="text-sm text-white/90 mt-1">{student.stream || 'Student'}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Basic Information */}
          <div>
            <h3 className={`text-sm font-semibold ${colors.text} mb-3 flex items-center gap-2`}>
              <User className="w-4 h-4" />
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  Roll Number
                </p>
                <p className="text-sm text-gray-900 font-medium">{student.rollNo}</p>
              </div>
              
              {student.registerNumber && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Register No.</p>
                  <p className="text-sm text-gray-900 font-medium">{student.registerNumber}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Semester
                </p>
                <p className="text-sm text-gray-900 font-medium">{student.semester}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Section
                </p>
                <p className="text-sm text-gray-900 font-medium">{student.section}</p>
              </div>

              {student.dateOfBirth && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Date of Birth
                  </p>
                  <p className="text-sm text-gray-900 font-medium">{student.dateOfBirth}</p>
                </div>
              )}

              {age !== null && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Age</p>
                  <p className="text-sm text-gray-900 font-medium">{age} years</p>
                </div>
              )}

              {student.gender && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Gender</p>
                  <p className="text-sm text-gray-900 font-medium">{student.gender}</p>
                </div>
              )}

              {student.bloodGroup && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Droplet className="w-3 h-3" />
                    Blood Group
                  </p>
                  <p className="text-sm text-gray-900 font-medium">{student.bloodGroup}</p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className={`text-sm font-semibold ${colors.text} mb-3 flex items-center gap-2`}>
              <Phone className="w-4 h-4" />
              Contact Information
            </h3>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Phone Number
                </p>
                <p className="text-sm text-gray-900 font-medium">{student.phone}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Email Address
                </p>
                <p className="text-sm text-gray-900 font-medium break-all">{student.email}</p>
              </div>
            </div>
          </div>

          {/* Parent Information */}
          {(student.fatherName || student.fatherPhone) && (
            <div>
              <h3 className={`text-sm font-semibold ${colors.text} mb-3 flex items-center gap-2`}>
                <Users className="w-4 h-4" />
                Parent Information
              </h3>
              <div className="space-y-3">
                {student.fatherName && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Father's Name</p>
                    <p className="text-sm text-gray-900 font-medium">{student.fatherName}</p>
                  </div>
                )}

                {student.fatherPhone && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Father's Phone
                    </p>
                    <p className="text-sm text-gray-900 font-medium">{student.fatherPhone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Academic Information */}
          {student.academicYear && (
            <div>
              <h3 className={`text-sm font-semibold ${colors.text} mb-3 flex items-center gap-2`}>
                <BookOpen className="w-4 h-4" />
                Academic Information
              </h3>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Academic Year</p>
                <p className="text-sm text-gray-900 font-medium">{student.academicYear}</p>
              </div>
            </div>
          )}

          {/* Address */}
          {student.address && (
            <div>
              <h3 className={`text-sm font-semibold ${colors.text} mb-3 flex items-center gap-2`}>
                <MapPin className="w-4 h-4" />
                Address
              </h3>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm text-gray-900 leading-relaxed">{student.address}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className={`w-full py-3 bg-gradient-to-r ${colors.gradient} text-white rounded-xl font-medium hover:shadow-lg transition-all active:scale-95`}
          >
            Close
          </button>
        </div>
      </div>

      {/* Profile Photo Modal */}
      {showPhotoModal && (
        <ProfilePhotoModal
          photoUrl={student.profilePicture}
          userName={student.name}
          onClose={() => setShowPhotoModal(false)}
          themeColor={themeColor}
        />
      )}
    </div>
  );
}