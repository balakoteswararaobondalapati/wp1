import React, { useState } from 'react';
import { X, UserPlus, Upload, Camera, FileDown, FileUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { DEPARTMENTS } from '@/constants/departments';

interface RegisterFacultyModalProps {
  onClose: () => void;
  onSubmit: (facultyData: FacultyRegistrationData) => void | Promise<void>;
}

export interface FacultyRegistrationData {
  // Personal Information
  name: string;
  email: string;
  phone: string;
  age: string;
  gender: string;
  bloodGroup: string;
  
  // Professional Information
  employeeId: string;
  department: string;
  qualification: string;
  experience: string;
  specialization: string;
  role: string;
  
  // Login Credentials
  userId: string;
  password: string;
  
  // Profile Picture
  profilePicture?: string;
}

export function RegisterFacultyModal({ onClose, onSubmit }: RegisterFacultyModalProps) {
  const [formData, setFormData] = useState<FacultyRegistrationData>({
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    bloodGroup: '',
    employeeId: '',
    department: '',
    qualification: '',
    experience: '',
    specialization: '',
    role: '',
    userId: '',
    password: '',
    profilePicture: '',
  });

  const [profilePreview, setProfilePreview] = useState<string>('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [importedData, setImportedData] = useState<FacultyRegistrationData[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProfilePreview(result);
        setFormData(prev => ({ ...prev, profilePicture: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.email || !formData.userId || !formData.password) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await Promise.resolve(onSubmit(formData));
      onClose();
    } catch {
      // Parent handles user-facing error alerts.
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 font-['Poppins',sans-serif]">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white text-xl">Register New Faculty</h3>
              <p className="text-green-100 text-sm">Fill in faculty details to create account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Profile Picture Upload */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center overflow-hidden border-4 border-green-200">
                {profilePreview ? (
                  <img src={profilePreview} alt="Profile Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-12 h-12 text-green-600" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-green-600 hover:bg-green-700 text-white p-2 rounded-full cursor-pointer transition-colors">
                <Upload className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Personal Information */}
          <div>
            <h4 className="text-gray-900 mb-4 pb-2 border-b-2 border-green-200">Personal Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  placeholder="faculty@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  placeholder="Enter contact number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <input
                  type="text"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  placeholder="Enter age"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blood Group
                </label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
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
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div>
            <h4 className="text-gray-900 mb-4 pb-2 border-b-2 border-green-200">Professional Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  placeholder="Enter employee ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qualification <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  placeholder="e.g., Ph.D. in Computer Science"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experience
                </label>
                <input
                  type="text"
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  placeholder="e.g., 15 Years"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialization
                </label>
                <input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  placeholder="e.g., Machine Learning & AI"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                >
                  <option value="">Select Role</option>
                  <option value="Professor">Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Lecturer">Lecturer</option>
                  <option value="Senior Lecturer">Senior Lecturer</option>
                </select>
              </div>
            </div>
          </div>

          {/* Login Credentials */}
          <div>
            <h4 className="text-gray-900 mb-4 pb-2 border-b-2 border-green-200">Login Credentials</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="userId"
                  value={formData.userId}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  placeholder="Create user ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  placeholder="Create password"
                />
              </div>
            </div>
          </div>

          {/* Bulk Import Section */}
          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-6 border-2 border-dashed border-green-300">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-green-600 p-3 rounded-xl">
                <FileUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-gray-900 mb-2">Bulk Import Faculty</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Upload a CSV or Excel file to register multiple faculty members at once
                </p>

                {/* Import Status Message */}
                {importStatus !== 'idle' && (
                  <div className={`p-3 rounded-xl mb-4 flex items-center gap-2 ${
                    importStatus === 'success' 
                      ? 'bg-green-100 border border-green-200' 
                      : 'bg-red-100 border border-red-200'
                  }`}>
                    {importStatus === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <p className={`text-sm ${
                      importStatus === 'success' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {importMessage}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Download Template Button */}
                  <button
                    type="button"
                    onClick={() => {
                      // Create sample CSV template
                      const template = `name,email,phone,age,gender,bloodGroup,employeeId,department,qualification,experience,specialization,role,userId,password
Dr. John Smith,john.smith@example.com,1234567890,43,Male,A+,EMP001,Computer Science & Engineering,Ph.D. in Computer Science,15 Years,Machine Learning & AI,Professor,john001,password123`;
                      
                      const blob = new Blob([template], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'faculty_import_template.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-green-300 text-green-700 rounded-xl hover:bg-green-50 transition-all active:scale-95"
                  >
                    <FileDown className="w-4 h-4" />
                    <span className="text-sm font-medium">Download Template</span>
                  </button>

                  {/* Upload File Button */}
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all active:scale-95 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">Upload CSV/Excel</span>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const text = event.target?.result as string;
                              const lines = text.split('\n');
                              const headers = lines[0].split(',');
                              
                              if (lines.length > 1) {
                                setImportStatus('success');
                                setImportMessage(`Successfully imported ${lines.length - 1} faculty member(s) data. Click "Import All" to register.`);
                                setImportedData(lines.slice(1).map(line => {
                                  const values = line.split(',');
                                  return {
                                    name: values[0] || '',
                                    email: values[1] || '',
                                    phone: values[2] || '',
                                    age: values[3] || '',
                                    gender: values[4] || '',
                                    bloodGroup: values[5] || '',
                                    employeeId: values[6] || '',
                                    department: values[7] || '',
                                    qualification: values[8] || '',
                                    experience: values[9] || '',
                                    specialization: values[10] || '',
                                    role: values[11] || '',
                                    userId: values[12] || '',
                                    password: values[13] || '',
                                  };
                                }));
                              } else {
                                setImportStatus('error');
                                setImportMessage('No data found in file');
                              }
                            } catch (error) {
                              setImportStatus('error');
                              setImportMessage('Invalid file format. Please use the template.');
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Import All Button */}
                {importedData.length > 0 && importStatus === 'success' && (
                  <button
                    type="button"
                    onClick={() => {
                      // Process bulk import
                      importedData.forEach(faculty => {
                        onSubmit(faculty);
                      });
                      alert(`Successfully registered ${importedData.length} faculty member(s)!`);
                      onClose();
                    }}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="text-sm font-medium">Import All ({importedData.length} Faculty)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
              <p className="text-blue-900 text-xs">
                <strong>Note:</strong> Download the template, fill in faculty details, and upload to register multiple faculty members simultaneously.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Register Faculty
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
