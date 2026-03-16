import React, { useEffect, useState } from 'react';
import { Upload, Calendar, BookOpen, GraduationCap, FileText, User, LogOut, Clock, Building2 } from 'lucide-react';
import { appStorage } from './';
import { formatHeaderDate } from '../utils/headerDateTime';

interface LecturerPortalProps {
  onLogout: () => void;
}

interface TimetableEntry {
  day: string;
  period1: { subject: string; semester: string; unit: string; className: string; room: string };
  period2: { subject: string; semester: string; unit: string; className: string; room: string };
  period3: { subject: string; semester: string; unit: string; className: string; room: string };
  period4: { subject: string; semester: string; unit: string; className: string; room: string };
}

export function LecturerPortal({ onLogout }: LecturerPortalProps) {
  const [liveHeaderTime, setLiveHeaderTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  );
  const [formData, setFormData] = useState({
    stream: '',
    year: '',
    semester: '',
    unitNumber: '',
    unitName: '',
    subject: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Get current day
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[new Date().getDay()];
    // If Sunday, default to Monday
    return currentDay === 'Sunday' ? 'Monday' : currentDay;
  };

  const [selectedDay, setSelectedDay] = useState<string>(getCurrentDay());

  useEffect(() => {
    const updateLiveHeaderTime = () => {
      setLiveHeaderTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    updateLiveHeaderTime();
    const intervalId = window.setInterval(updateLiveHeaderTime, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const streams = ['Computer Science Engineering (CSE)', 'Electronics & Communication (ECE)', 'Bachelor of Science (BSc)', 'Bachelor of Commerce (BCom)', 'Mechanical Engineering (ME)', 'Civil Engineering (CE)'];
  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const semesters = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];
  const units = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5'];
  const subjects = ['Data Structures', 'Operating Systems', 'Database Management', 'Computer Networks', 'Software Engineering', 'Web Development', 'Machine Learning', 'Artificial Intelligence'];

  // Sample timetable data
  const timetable: TimetableEntry[] = [
    {
      day: 'Monday',
      period1: { subject: 'Data Structures', semester: 'Sem 3', unit: 'Unit 1', className: 'CSE 101', room: 'A101' },
      period2: { subject: 'Operating Systems', semester: 'Sem 5', unit: 'Unit 2', className: 'CSE 201', room: 'A102' },
      period3: { subject: 'Database Management', semester: 'Sem 4', unit: 'Unit 3', className: 'CSE 301', room: 'A103' },
      period4: { subject: 'Computer Networks', semester: 'Sem 6', unit: 'Unit 1', className: 'CSE 401', room: 'A104' },
    },
    {
      day: 'Tuesday',
      period1: { subject: 'Web Development', semester: 'Sem 3', unit: 'Unit 2', className: 'CSE 102', room: 'B101' },
      period2: { subject: 'Data Structures', semester: 'Sem 3', unit: 'Unit 1', className: 'CSE 101', room: 'B102' },
      period3: { subject: 'Operating Systems', semester: 'Sem 5', unit: 'Unit 3', className: 'CSE 201', room: 'B103' },
      period4: { subject: 'Software Engineering', semester: 'Sem 7', unit: 'Unit 1', className: 'CSE 501', room: 'B104' },
    },
    {
      day: 'Wednesday',
      period1: { subject: 'Database Management', semester: 'Sem 4', unit: 'Unit 4', className: 'CSE 301', room: 'C101' },
      period2: { subject: 'Computer Networks', semester: 'Sem 6', unit: 'Unit 2', className: 'CSE 401', room: 'C102' },
      period3: { subject: 'Machine Learning', semester: 'Sem 7', unit: 'Unit 1', className: 'CSE 502', room: 'C103' },
      period4: { subject: 'Data Structures', semester: 'Sem 3', unit: 'Unit 2', className: 'CSE 101', room: 'C104' },
    },
    {
      day: 'Thursday',
      period1: { subject: 'Operating Systems', semester: 'Sem 5', unit: 'Unit 4', className: 'CSE 201', room: 'D101' },
      period2: { subject: 'Web Development', semester: 'Sem 3', unit: 'Unit 3', className: 'CSE 102', room: 'D102' },
      period3: { subject: 'Database Management', semester: 'Sem 4', unit: 'Unit 5', className: 'CSE 301', room: 'D103' },
      period4: { subject: 'Artificial Intelligence', semester: 'Sem 8', unit: 'Unit 1', className: 'CSE 601', room: 'D104' },
    },
    {
      day: 'Friday',
      period1: { subject: 'Computer Networks', semester: 'Sem 6', unit: 'Unit 3', className: 'CSE 401', room: 'E101' },
      period2: { subject: 'Software Engineering', semester: 'Sem 7', unit: 'Unit 2', className: 'CSE 501', room: 'E102' },
      period3: { subject: 'Data Structures', semester: 'Sem 3', unit: 'Unit 3', className: 'CSE 101', room: 'E103' },
      period4: { subject: 'Machine Learning', semester: 'Sem 7', unit: 'Unit 2', className: 'CSE 502', room: 'E104' },
    },
    {
      day: 'Saturday',
      period1: { subject: 'Web Development', semester: 'Sem 3', unit: 'Unit 4', className: 'CSE 102', room: 'F101' },
      period2: { subject: 'Database Management', semester: 'Sem 4', unit: 'Unit 2', className: 'CSE 301', room: 'F102' },
      period3: { subject: 'Operating Systems', semester: 'Sem 5', unit: 'Unit 5', className: 'CSE 201', room: 'F103' },
      period4: { subject: 'Computer Networks', semester: 'Sem 6', unit: 'Unit 4', className: 'CSE 401', room: 'F104' },
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (validTypes.includes(file.type)) {
        setSelectedFile(file);
      } else {
        alert('Please select a valid file (PDF, PPT, or DOC)');
        e.target.value = '';
      }
    }
  };

  const handleUpload = () => {
    if (formData.stream && formData.year && formData.semester && formData.unitNumber && formData.unitName && formData.subject && selectedFile) {
      alert(`Material uploaded successfully!\n\nStream: ${formData.stream}\nYear: ${formData.year}\nSemester: ${formData.semester}\nUnit: ${formData.unitNumber} - ${formData.unitName}\nSubject: ${formData.subject}\nFile: ${selectedFile.name}`);
      
      // Reset form
      setFormData({
        stream: '',
        year: '',
        semester: '',
        unitNumber: '',
        unitName: '',
        subject: '',
      });
      setSelectedFile(null);
    } else {
      alert('Please fill in all fields and select a file');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 font-['Inter',sans-serif]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-gray-900">Lecturer Portal</h1>
                <p className="text-sm text-gray-600">Study Materials & Schedule Management</p>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-4">
              {/* Custom Date & Time */}
              {(() => {
                const customDate = appStorage.getItem('customHeaderDate');
                if (customDate) {
                  const formattedDate = formatHeaderDate(customDate);
                  if (!formattedDate) return null;
                  return (
                    <div className="text-right hidden sm:block mr-2">
                      <p className="text-sm text-gray-900 font-medium">{formattedDate}</p>
                      <p className="text-xs text-gray-500">{liveHeaderTime}</p>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-900">Dr. Rajesh Kumar</p>
                <p className="text-xs text-gray-500">Computer Science Dept.</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <button
                onClick={onLogout}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Upload Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-600 to-green-600 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white">Upload Study Material</h2>
                    <p className="text-sm text-blue-100">Add new course materials for students</p>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-5">
                {/* Stream / Department */}
                <div>
                  <label htmlFor="stream" className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Stream / Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="stream"
                    value={formData.stream}
                    onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select stream or department</option>
                    {streams.map((stream) => (
                      <option key={stream} value={stream}>{stream}</option>
                    ))}
                  </select>
                </div>

                {/* Year and Semester Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Year */}
                  <div>
                    <label htmlFor="year" className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                      <GraduationCap className="w-4 h-4 text-green-600" />
                      Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="year"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select year</option>
                      {years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  {/* Semester */}
                  <div>
                    <label htmlFor="semester" className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Semester Number <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="semester"
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select semester</option>
                      {semesters.map((semester) => (
                        <option key={semester} value={semester}>{semester}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Unit Number and Unit Name Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Unit Number */}
                  <div>
                    <label htmlFor="unitNumber" className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                      <BookOpen className="w-4 h-4 text-green-600" />
                      Unit Number <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="unitNumber"
                      value={formData.unitNumber}
                      onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select unit</option>
                      {units.map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>

                  {/* Unit Name */}
                  <div>
                    <label htmlFor="unitName" className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Unit Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="unitName"
                      type="text"
                      value={formData.unitName}
                      onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
                      placeholder="e.g., Data Structures, Operating Systems"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Subject Name */}
                <div>
                  <label htmlFor="subject" className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                    <BookOpen className="w-4 h-4 text-green-600" />
                    Subject Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select subject</option>
                    {subjects.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                {/* File Upload */}
                <div>
                  <label htmlFor="file" className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    File Upload <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="file"
                      type="file"
                      accept=".pdf,.ppt,.pptx,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="file"
                      className="w-full px-4 py-4 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-4"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {selectedFile ? (
                          <div>
                            <p className="text-sm text-gray-900 truncate">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">Click to change file</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-700">Click to upload or drag and drop</p>
                            <p className="text-xs text-gray-500">PDF, PPT, or DOC (max. 50MB)</p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                {/* Upload Button */}
                <button
                  onClick={handleUpload}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl hover:from-blue-700 hover:to-green-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  <span>Upload Material</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Quick Stats */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Quick Stats Card 1 */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl text-gray-900">47</p>
                    <p className="text-sm text-gray-600">Materials Uploaded</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>

              {/* Quick Stats Card 2 */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl text-gray-900">8</p>
                    <p className="text-sm text-gray-600">Active Subjects</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              {/* Quick Stats Card 3 */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl text-gray-900">320</p>
                    <p className="text-sm text-gray-600">Total Students</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timetable Section */}
        <div className="mt-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Timetable Header */}
            <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white">Weekly Timetable</h2>
                  <p className="text-sm text-green-100">Your teaching schedule for this week</p>
                </div>
              </div>
            </div>

            {/* Timetable Content */}
            <div className="p-6">
              {/* Day Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-6 py-3 rounded-xl transition-all whitespace-nowrap ${
                      selectedDay === day
                        ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Timetable for Selected Day */}
              <div className="overflow-x-auto">
                {timetable
                  .filter((entry) => entry.day === selectedDay)
                  .map((entry) => (
                    <div key={entry.day} className="space-y-4">
                      {/* Period 1 */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-gray-900">Period 1</span>
                          <span className="text-xs text-gray-500">(9:00-10:00)</span>
                        </div>
                        <p className="text-gray-900 mb-2">{entry.period1.subject}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded">{entry.period1.semester}</span>
                          <span className="text-xs text-green-600 bg-green-200 px-2 py-1 rounded">{entry.period1.unit}</span>
                          <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">{entry.period1.className}</span>
                          <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">{entry.period1.room}</span>
                        </div>
                      </div>

                      {/* Period 2 */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-gray-900">Period 2</span>
                          <span className="text-xs text-gray-500">(10:00-11:00)</span>
                        </div>
                        <p className="text-gray-900 mb-2">{entry.period2.subject}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded">{entry.period2.semester}</span>
                          <span className="text-xs text-green-600 bg-green-200 px-2 py-1 rounded">{entry.period2.unit}</span>
                          <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">{entry.period2.className}</span>
                          <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">{entry.period2.room}</span>
                        </div>
                      </div>

                      {/* Period 3 */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-gray-900">Period 3</span>
                          <span className="text-xs text-gray-500">(11:30-12:30)</span>
                        </div>
                        <p className="text-gray-900 mb-2">{entry.period3.subject}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded">{entry.period3.semester}</span>
                          <span className="text-xs text-green-600 bg-green-200 px-2 py-1 rounded">{entry.period3.unit}</span>
                          <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">{entry.period3.className}</span>
                          <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">{entry.period3.room}</span>
                        </div>
                      </div>

                      {/* Period 4 */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-gray-900">Period 4</span>
                          <span className="text-xs text-gray-500">(12:30-1:30)</span>
                        </div>
                        <p className="text-gray-900 mb-2">{entry.period4.subject}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded">{entry.period4.semester}</span>
                          <span className="text-xs text-green-600 bg-green-200 px-2 py-1 rounded">{entry.period4.unit}</span>
                          <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">{entry.period4.className}</span>
                          <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">{entry.period4.room}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
