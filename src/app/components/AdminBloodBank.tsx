import React, { useState } from 'react';
import { ArrowLeft, Search, Droplet, User, GraduationCap } from 'lucide-react';
import { ProfileAvatar } from '@/app/components/ProfileAvatar';
import { ProfilePhotoModal } from '@/app/components/ProfilePhotoModal';
import { studentsAPI, facultyAPI } from '../api';

interface AdminBloodBankProps {
  onBack: () => void;
}

interface BloodDonor {
  id: string;
  name: string;
  bloodGroup: string;
  gender: 'Male' | 'Female';
  section: string;
  semester: string;
  type: 'Student' | 'Faculty';
  age: number;
  phone?: string;
  profilePicture?: string;
  email?: string;
  course?: string; // For students
  department?: string; // For faculty
}

const calculateAgeFromDob = (dob?: string): number => {
  if (!dob) return 0;
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export function AdminBloodBank({ onBack }: AdminBloodBankProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState<'All' | 'Male' | 'Female'>('All');
  const [allDonors, setAllDonors] = useState<BloodDonor[]>([]);
  const [filteredDonors, setFilteredDonors] = useState<BloodDonor[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<{ name: string; photo: string } | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalFaculty, setTotalFaculty] = useState(0);

  const loadDonors = async () => {
    try {
      const [students, faculty] = await Promise.all([
        studentsAPI.getAll(),
        facultyAPI.getAll(),
      ]);

      setTotalStudents((students || []).length);
      setTotalFaculty((faculty || []).length);

      const studentDonors: BloodDonor[] = (students || [])
        .filter((s: any) => String(s.blood_group || '').trim())
        .map((s: any) => ({
          id: s.id || s.user_id || `student-${s.roll_number || s.register_number}`,
          name: s.name || 'Student',
          bloodGroup: s.blood_group,
          gender: (s.gender || 'Male') as 'Male' | 'Female',
          section: s.section || 'N/A',
          semester: s.semester || 'N/A',
          type: 'Student',
          age: calculateAgeFromDob(s.date_of_birth) || 20,
          phone: s.phone || '',
          profilePicture: s.profile_picture || '',
          email: s.email || '',
          course: s.department || s.course || '',
        }));

      const facultyDonors: BloodDonor[] = (faculty || [])
        .filter((f: any) => String(f.blood_group || '').trim())
        .map((f: any) => ({
          id: f.id || f.user_id || `faculty-${f.employee_id}`,
          name: f.name || 'Faculty',
          bloodGroup: f.blood_group,
          gender: (f.gender || 'Male') as 'Male' | 'Female',
          section: 'N/A',
          semester: 'N/A',
          type: 'Faculty',
          age: parseInt(String(f.age || ''), 10) || 35,
          phone: f.phone || '',
          profilePicture: f.profile_picture || '',
          email: f.email || '',
          department: f.department || '',
        }));

      setAllDonors([...studentDonors, ...facultyDonors]);
    } catch (error) {
      console.error('Error loading blood bank donors:', error);
      setAllDonors([]);
      setTotalStudents(0);
      setTotalFaculty(0);
    }
  };

  // Reload data on mount and when updates happen
  React.useEffect(() => {
    const handleUpdate = () => {
      void loadDonors();
    };

    void loadDonors();

    window.addEventListener('studentRegistered', handleUpdate);
    window.addEventListener('facultyRegistered', handleUpdate);
    window.addEventListener('student_profile_updated', handleUpdate);
    window.addEventListener('faculty_profile_updated', handleUpdate);
    
    return () => {
      window.removeEventListener('studentRegistered', handleUpdate);
      window.removeEventListener('facultyRegistered', handleUpdate);
      window.removeEventListener('student_profile_updated', handleUpdate);
      window.removeEventListener('faculty_profile_updated', handleUpdate);
    };
  }, []);

  // Handle search and filter
  React.useEffect(() => {
    let results = allDonors;

    // Filter by blood group search
    if (searchQuery.trim()) {
      results = results.filter((donor) =>
        donor.bloodGroup.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by gender
    if (selectedGender !== 'All') {
      results = results.filter((donor) => donor.gender === selectedGender);
    }

    setFilteredDonors(results);
  }, [searchQuery, selectedGender, allDonors]);

  // Get blood group stats
  const bloodGroupStats = React.useMemo(() => {
    const stats: Record<string, number> = {};
    allDonors.forEach((donor) => {
      stats[donor.bloodGroup] = (stats[donor.bloodGroup] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [allDonors]);
  
  const handleProfileClick = (donor: BloodDonor) => {
    if (donor.profilePicture) {
      setSelectedProfile({
        name: donor.name,
        photo: donor.profilePicture,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-4 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h2 className="text-white">Blood Bank</h2>
            <p className="text-white/80 text-sm">Find blood donors quickly</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-3 shadow-md text-center">
            <Droplet className="w-6 h-6 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">{allDonors.length}</p>
            <p className="text-xs text-gray-600">Total Donors</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-md text-center">
            <GraduationCap className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">
              {totalStudents}
            </p>
            <p className="text-xs text-gray-600">Students</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-md text-center">
            <User className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">
              {totalFaculty}
            </p>
            <p className="text-xs text-gray-600">Faculty</p>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-2xl p-4 shadow-md mb-6">
          {/* Gender Filter */}
          <div>
            <label className="block text-sm text-gray-700 mb-2 font-medium">
              Filter by Gender
            </label>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value as 'All' | 'Male' | 'Female')}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors bg-white"
            >
              <option value="All">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Active Filters Display */}
          {selectedGender !== 'All' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                Gender: {selectedGender}
              </span>
            </div>
          )}
        </div>

        {/* Blood Group Quick Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-md mb-6">
          <h3 className="text-gray-900 font-semibold mb-3 flex items-center gap-2">
            <Droplet className="w-5 h-5 text-red-500" />
            Blood Group Distribution
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {bloodGroupStats.map(([group, count]) => (
              <button
                key={group}
                onClick={() => setSearchQuery(group)}
                className="bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 p-2 rounded-lg transition-all active:scale-95"
              >
                <p className="font-bold text-red-700">{group}</p>
                <p className="text-xs text-red-600">{count} donors</p>
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-gray-900 font-semibold">
            Search Results ({filteredDonors.length})
          </h3>
        </div>

        {/* Donors List */}
        {filteredDonors.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-md">
            <Droplet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No records available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDonors.map((donor) => (
              <div
                key={donor.id}
                className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar - Clickable */}
                  <ProfileAvatar
                    userName={donor.name}
                    profileImage={donor.profilePicture}
                    size="md"
                    themeColor={donor.type === 'Student' ? 'blue' : 'green'}
                    onClick={() => handleProfileClick(donor)}
                  />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-gray-900 font-semibold">{donor.name}</h4>
                        <p className="text-sm text-gray-600">{donor.gender}</p>
                        {donor.type === 'Student' ? (
                          <p className="text-xs text-gray-500">{donor.course}</p>
                        ) : (
                          <p className="text-xs text-gray-500">{donor.department}</p>
                        )}
                      </div>
                      {/* Blood Group Badge */}
                      <div className="bg-gradient-to-br from-red-500 to-red-600 text-white px-3 py-1.5 rounded-lg shadow-md flex-shrink-0">
                        <p className="font-bold text-sm">{donor.bloodGroup}</p>
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {donor.type === 'Student' && (
                        <>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Section</p>
                            <p className="text-sm text-gray-900 font-medium">{donor.section}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Semester</p>
                            <p className="text-sm text-gray-900 font-medium">{donor.semester}</p>
                          </div>
                        </>
                      )}
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-500">Age</p>
                        <p className="text-sm text-gray-900 font-medium">{donor.age} yrs</p>
                      </div>
                    </div>

                    {/* Tags and Phone */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        donor.type === 'Student'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {donor.type}
                      </span>
                      {donor.phone && (
                        <a
                          href={`tel:${donor.phone}`}
                          className="text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                          📞 {donor.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Profile Photo Modal */}
      {selectedProfile && (
        <ProfilePhotoModal
          name={selectedProfile.name}
          photo={selectedProfile.photo}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
}
