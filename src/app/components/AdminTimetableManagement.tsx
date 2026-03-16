import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Calendar, Clock, Edit2, Save, X, User, Download, Info } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { appStorage } from './';
import { facultyAPI, timetableAPI } from '../api';

interface AdminTimetableManagementProps {
  onBack: () => void;
}

interface Period {
  id?: number;
  periodNumber: number;
  subject: string;
  time: string;
  faculty: string;
  room: string;
}

interface DaySchedule {
  [key: string]: Period[];
}

interface TimetableData {
  [course: string]: {
    [section: string]: {
      [semester: string]: DaySchedule;
    };
  };
}

interface Course {
  id: string;
  courseName: string;
  facultyName: string;
}

interface AcademicData {
  [department: string]: {
    [semester: string]: Course[];
  };
}

export function AdminTimetableManagement({ onBack }: AdminTimetableManagementProps) {
  const dayToApiDay: Record<string, string> = {
    Mon: 'Monday',
    Tue: 'Tuesday',
    Wed: 'Wednesday',
    Thu: 'Thursday',
    Fri: 'Friday',
    Sat: 'Saturday',
  };
  const apiDayToDay: Record<string, string> = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
  };

  const [selectedDay, setSelectedDay] = useState('Mon');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [editingPeriod, setEditingPeriod] = useState<{ day: string; periodNumber: number } | null>(null);
  const [showAcademicInfo, setShowAcademicInfo] = useState(true);
  
  // Timetable data state
  const [timetableData, setTimetableData] = useState<TimetableData>({});
  
  // Ref to track if update is from external source (to prevent infinite loops)
  const isExternalUpdate = useRef(false);
  
  // Load academic data from appStorage
  const [academicData, setAcademicData] = useState<AcademicData>({});
  const [facultyList, setFacultyList] = useState<Array<{ id: number; name: string; department?: string }>>([]);
  
  // Dynamic departments and course sections loaded from appStorage
  const [departments, setDepartments] = useState<string[]>([]);
  const [courseSections, setCourseSections] = useState<Record<string, string[]>>({});
  
  const [editFormData, setEditFormData] = useState({
    subject: '',
    time: '',
    faculty: '',
    room: ''
  });

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const semesters = ['1', '2', '3', '4', '5', '6'];

  // Load dynamic departments and sections from Academic Management
  useEffect(() => {
    const loadDepartmentsAndSections = () => {
      const savedDepartments = appStorage.getItem('customDepartments');
      const savedSections = appStorage.getItem('customCourseSections');
      
      if (savedDepartments) {
        try {
          const deps = JSON.parse(savedDepartments);
          setDepartments(deps);
        } catch (e) {
          console.error('Failed to load departments', e);
        }
      } else {
        // Default courses
        const defaultDeps = ['BCA', 'BSC', 'BCOM'];
        setDepartments(defaultDeps);
      }

      if (savedSections) {
        try {
          const sections = JSON.parse(savedSections);
          setCourseSections(sections);
        } catch (e) {
          console.error('Failed to load sections', e);
        }
      } else {
        // Default sections
        setCourseSections({
          'BCA': ['B1', 'B2'],
          'BSC': ['A1', 'A2', 'B', 'C', 'D', 'G', 'K'],
          'BCOM': ['D', 'E']
        });
      }
    };

    // Load on mount
    loadDepartmentsAndSections();

    // Reload when appStorage changes (from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'customDepartments' || e.key === 'customCourseSections') {
        loadDepartmentsAndSections();
      }
    };

    // Reload when custom event is fired (from same tab)
    const handleDepartmentsUpdate = (e: CustomEvent) => {
      if (e.detail) {
        setDepartments(e.detail.departments);
        setCourseSections(e.detail.courseSections);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('departmentsUpdated', handleDepartmentsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('departmentsUpdated', handleDepartmentsUpdate as EventListener);
    };
  }, []);

  // Load academic data from Academic Management
  useEffect(() => {
    const loadAcademicData = () => {
      const loadedData = appStorage.getItem('academic_courses_data');
      if (loadedData) {
        try {
          setAcademicData(JSON.parse(loadedData));
        } catch (e) {
          console.error('Failed to load academic data', e);
        }
      }
    };

    // Load on mount
    loadAcademicData();

    // Reload when appStorage changes (from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'academic_courses_data') {
        loadAcademicData();
      }
    };

    // Reload when custom event is fired (from same tab)
    const handleCustomEvent = (e: CustomEvent) => {
      setAcademicData(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('academicDataUpdated', handleCustomEvent as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('academicDataUpdated', handleCustomEvent as EventListener);
    };
  }, []);

  // Load faculty list for dropdown
  useEffect(() => {
    const loadFaculty = async () => {
      try {
        const rows = await facultyAPI.getAll();
        setFacultyList(rows || []);
      } catch (e) {
        console.error('Failed to load faculty list', e);
        setFacultyList([]);
      }
    };

    void loadFaculty();

    const handleFacultyRegistered = () => {
      void loadFaculty();
    };

    window.addEventListener('facultyRegistered', handleFacultyRegistered);
    return () => {
      window.removeEventListener('facultyRegistered', handleFacultyRegistered);
    };
  }, []);

  // Reset section and semester when course changes
  useEffect(() => {
    if (selectedCourse) {
      setSelectedSection('');
      setSelectedSemester('');
    }
  }, [selectedCourse]);

  // Get sections for selected course
  const getSections = (course: string): string[] => {
    return courseSections[course] || [];
  };

  // Get available courses and faculty for the current selection
  const getAvailableCoursesAndFaculty = (): Course[] => {
    return academicData[selectedCourse]?.[selectedSemester] || [];
  };

  const availableCoursesAndFaculty = getAvailableCoursesAndFaculty();
  const filteredFacultyList = selectedCourse
    ? facultyList.filter((faculty) => String(faculty.department || '') === selectedCourse)
    : facultyList;
  const dropdownFacultyList = filteredFacultyList.length > 0 ? filteredFacultyList : facultyList;


  // Load timetable data from backend on mount
  useEffect(() => {
    const loadFromBackend = async () => {
      try {
        const rows = await timetableAPI.getAll();
        const nested: TimetableData = {};
        (rows || []).forEach((row: any) => {
          const day = apiDayToDay[row.day_of_week] || row.day_of_week?.slice(0, 3) || 'Mon';
          if (!nested[row.course]) nested[row.course] = {};
          if (!nested[row.course][row.section]) nested[row.course][row.section] = {};
          if (!nested[row.course][row.section][row.semester]) {
            nested[row.course][row.section][row.semester] = {};
          }
          if (!nested[row.course][row.section][row.semester][day]) {
            nested[row.course][row.section][row.semester][day] = [];
          }
          nested[row.course][row.section][row.semester][day].push({
            id: Number(row.id),
            periodNumber: Number(row.period_number),
            subject: row.subject || '',
            time: row.time || '',
            faculty: row.faculty_name || '',
            room: row.room || '',
          });
        });
        Object.keys(nested).forEach((course) => {
          Object.keys(nested[course]).forEach((section) => {
            Object.keys(nested[course][section]).forEach((semester) => {
              Object.keys(nested[course][section][semester]).forEach((day) => {
                nested[course][section][semester][day].sort((a, b) => a.periodNumber - b.periodNumber);
              });
            });
          });
        });
        isExternalUpdate.current = true;
        setTimetableData(nested);
      } catch (e) {
        console.error('Failed to load timetable data from backend', e);
      }
    };
    void loadFromBackend();
  }, []);

  // Listen for timetable refresh events and reload from backend
  useEffect(() => {
    const reloadFromBackend = async () => {
      try {
        const rows = await timetableAPI.getAll();
        const nested: TimetableData = {};
        (rows || []).forEach((row: any) => {
          const day = apiDayToDay[row.day_of_week] || row.day_of_week?.slice(0, 3) || 'Mon';
          if (!nested[row.course]) nested[row.course] = {};
          if (!nested[row.course][row.section]) nested[row.course][row.section] = {};
          if (!nested[row.course][row.section][row.semester]) nested[row.course][row.section][row.semester] = {};
          if (!nested[row.course][row.section][row.semester][day]) nested[row.course][row.section][row.semester][day] = [];
          nested[row.course][row.section][row.semester][day].push({
            id: Number(row.id),
            periodNumber: Number(row.period_number),
            subject: row.subject || '',
            time: row.time || '',
            faculty: row.faculty_name || '',
            room: row.room || '',
          });
        });
        Object.keys(nested).forEach((course) => {
          Object.keys(nested[course]).forEach((section) => {
            Object.keys(nested[course][section]).forEach((semester) => {
              Object.keys(nested[course][section][semester]).forEach((day) => {
                nested[course][section][semester][day].sort((a, b) => a.periodNumber - b.periodNumber);
              });
            });
          });
        });
        isExternalUpdate.current = true;
        setTimetableData(nested);
      } catch (error) {
        console.error('Failed to reload timetable data from backend', error);
      }
    };

    const handleTimetableUpdate = () => {
      void reloadFromBackend();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'timetableUpdated') {
        try {
          void reloadFromBackend();
        } catch (error) {
          console.error('Failed to reload timetable data after storage event', error);
        }
      }
    };

    console.log('[TimetableManagement] Setting up event listeners for timetable updates');
    // Listen for custom event (same tab)
    window.addEventListener('timetableUpdated', handleTimetableUpdate);
    
    // Listen for storage event (cross-tab)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      console.log('[TimetableManagement] Cleaning up event listeners');
      window.removeEventListener('timetableUpdated', handleTimetableUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Broadcast lightweight refresh event whenever local state changes
  useEffect(() => {
    if (isExternalUpdate.current) {
      isExternalUpdate.current = false;
      return;
    }
    window.dispatchEvent(new CustomEvent('timetableUpdated', { detail: timetableData }));
    // Trigger cross-tab listeners via storage mutation (safe across browsers).
    try {
      appStorage.setItem('timetableUpdated', String(Date.now()));
    } catch (error) {
      console.error('Failed to broadcast timetableUpdated storage event', error);
    }
  }, [timetableData]);

  // Handle course change
  const handleCourseChange = (course: string) => {
    setSelectedCourse(course);
    // Reset dependent selections
    setSelectedSection('');
    setSelectedSemester('');
  };

  // Get current schedule based on selections
  const getCurrentSchedule = (): Period[] => {
    try {
      const schedule = timetableData[selectedCourse]?.[selectedSection]?.[selectedSemester]?.[selectedDay] || [];

      const basePeriods: Period[] = [
        { periodNumber: 1, subject: '', time: '', faculty: '', room: '' },
        { periodNumber: 2, subject: '', time: '', faculty: '', room: '' },
        { periodNumber: 3, subject: '', time: '', faculty: '', room: '' },
        { periodNumber: 4, subject: '', time: '', faculty: '', room: '' },
        { periodNumber: 5, subject: '', time: '', faculty: '', room: '' },
      ];

      const byPeriod = new Map<number, Period>();
      schedule.forEach((period) => {
        byPeriod.set(period.periodNumber, period);
      });

      return basePeriods.map((period) => byPeriod.get(period.periodNumber) || period);
    } catch (e) {
      // Return default empty periods on error
      return [
        { periodNumber: 1, subject: '', time: '', faculty: '', room: '' },
        { periodNumber: 2, subject: '', time: '', faculty: '', room: '' },
        { periodNumber: 3, subject: '', time: '', faculty: '', room: '' },
        { periodNumber: 4, subject: '', time: '', faculty: '', room: '' },
        { periodNumber: 5, subject: '', time: '', faculty: '', room: '' },
      ];
    }
  };

  const currentSchedule = getCurrentSchedule();

  const handleEditClick = (day: string, period: Period) => {
    setEditingPeriod({ day, periodNumber: period.periodNumber });
    setEditFormData({
      subject: period.subject,
      time: period.time,
      faculty: period.faculty,
      room: period.room
    });
  };

  const handleSaveEdit = async () => {
    if (editingPeriod) {
      try {
        const existingSlot = timetableData[selectedCourse]?.[selectedSection]?.[selectedSemester]?.[editingPeriod.day]
          ?.find((period) => period.periodNumber === editingPeriod.periodNumber);

        const payload = {
          day_of_week: dayToApiDay[editingPeriod.day] || editingPeriod.day,
          period_number: editingPeriod.periodNumber,
          subject: editFormData.subject || '',
          faculty_name: editFormData.faculty || '',
          time: editFormData.time || '',
          room: editFormData.room || '',
          course: selectedCourse,
          semester: selectedSemester,
          section: selectedSection,
        };

        if (existingSlot?.id) {
          await timetableAPI.updateSlot(existingSlot.id, payload);
        } else {
          await timetableAPI.createSlot(payload);
        }

        const rows = await timetableAPI.getAll();
        const nested: TimetableData = {};
        (rows || []).forEach((row: any) => {
          const day = apiDayToDay[row.day_of_week] || row.day_of_week?.slice(0, 3) || 'Mon';
          if (!nested[row.course]) nested[row.course] = {};
          if (!nested[row.course][row.section]) nested[row.course][row.section] = {};
          if (!nested[row.course][row.section][row.semester]) nested[row.course][row.section][row.semester] = {};
          if (!nested[row.course][row.section][row.semester][day]) nested[row.course][row.section][row.semester][day] = [];
          nested[row.course][row.section][row.semester][day].push({
            id: Number(row.id),
            periodNumber: Number(row.period_number),
            subject: row.subject || '',
            time: row.time || '',
            faculty: row.faculty_name || '',
            room: row.room || '',
          });
        });
        Object.keys(nested).forEach((course) => {
          Object.keys(nested[course]).forEach((section) => {
            Object.keys(nested[course][section]).forEach((semester) => {
              Object.keys(nested[course][section][semester]).forEach((day) => {
                nested[course][section][semester][day].sort((a, b) => a.periodNumber - b.periodNumber);
              });
            });
          });
        });
        isExternalUpdate.current = true;
        setTimetableData(nested);
        setEditingPeriod(null);
      } catch (error) {
        console.error('Failed to save timetable slot to backend', error);
        alert('Failed to save timetable slot to database.');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingPeriod(null);
    setEditFormData({
      subject: '',
      time: '',
      faculty: '',
      room: ''
    });
  };

  const isEditing = (periodNumber: number) => {
    return editingPeriod?.day === selectedDay && editingPeriod?.periodNumber === periodNumber;
  };

  // Check if timetable data is available
  const isTimetableAvailable = () => {
    try {
      const semesterData = timetableData[selectedCourse]?.[selectedSection]?.[selectedSemester];
      if (!semesterData) return false;
      
      // Check if at least one day has non-empty periods
      for (const day of days) {
        const daySchedule = semesterData[day];
        if (daySchedule && daySchedule.length > 0) {
          // Check if at least one period has a subject
          const hasData = daySchedule.some(period => period.subject && period.subject.trim() !== '');
          if (hasData) return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF('landscape'); // Use landscape for better fit
    
    // Add title
    doc.setFontSize(16);
    doc.text(`Timetable - ${selectedCourse} | Section ${selectedSection} | Semester ${selectedSemester}`, 15, 15);
    
    let startY = 25;
    
    // Generate table for each day
    days.forEach((day, index) => {
      const daySchedule = timetableData[selectedCourse]?.[selectedSection]?.[selectedSemester]?.[day] || [];
      
      if (daySchedule.length === 0 || !daySchedule.some(p => p.subject && p.subject.trim() !== '')) {
        return; // Skip days with no data
      }
      
      // Add day header
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(day, 15, startY);
      startY += 5;
      
      const tableData = daySchedule.map((period) => [
        `Period ${period.periodNumber}`,
        period.subject || '-',
        period.time || '-',
        period.faculty || '-',
        period.room || '-'
      ]);

      autoTable(doc, {
        head: [['Period', 'Subject', 'Time', 'Faculty', 'Room']],
        body: tableData,
        startY: startY,
        theme: 'grid',
        headStyles: { 
          fillColor: [34, 197, 94], // Green color
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: { 
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 9
        },
        alternateRowStyles: { fillColor: [240, 253, 244] }, // Light green
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
      });
      
      startY = (doc as any).lastAutoTable.finalY + 10;
      
      // Add new page if needed (except for last day)
      if (startY > 180 && index < days.length - 1) {
        doc.addPage();
        startY = 15;
      }
    });

    doc.save(`Timetable_${selectedCourse}_${selectedSection}_Semester${selectedSemester}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 font-['Poppins',sans-serif] flex flex-col">
      {/* Top Header Bar with Back Button */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg">
        <div className="px-4 py-4 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h2 className="text-white">Timetable Management</h2>
              <p className="text-xs text-green-100">View and manage class schedules</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Takes remaining height */}
      <div className="flex-1 flex flex-col px-4 py-6 overflow-hidden">
        {/* Header Card with Filters */}
        <div className="bg-white rounded-2xl p-5 shadow-md mb-4 flex-shrink-0 border border-green-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-gray-900 mb-1">Class Schedule Management</h2>
              <p className="text-sm text-gray-500">Select course, section and semester to view timetable</p>
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Course Dropdown */}
            <div>
              <label className="block text-xs text-gray-600 mb-2 font-medium">Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors bg-white"
              >
                <option value="">-- Select Course --</option>
                {departments.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Dropdown */}
            <div>
              <label className="block text-xs text-gray-600 mb-2 font-medium">Section</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                disabled={!selectedCourse}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">-- Select Section --</option>
                {getSections(selectedCourse).map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Dropdown */}
            <div>
              <label className="block text-xs text-gray-600 mb-2 font-medium">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                disabled={!selectedCourse}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">-- Select Semester --</option>
                {semesters.map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Current Selection Display */}
          {selectedCourse && selectedSection && selectedSemester && (
            <div className="mt-4 p-3 bg-green-50 rounded-xl">
              <p className="text-sm text-green-700">
                <span className="font-medium">Viewing:</span> {selectedCourse} - Section {selectedSection} - Semester {selectedSemester}
              </p>
            </div>
          )}
        </div>

        {/* Bidirectional Sync Info Banner */}
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3 mb-4 flex items-start gap-3 flex-shrink-0">
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Info className="w-3 h-3 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-green-800 leading-relaxed">
              <span className="font-semibold">Bidirectional Sync:</span> Timetable changes sync with Faculty Teaching Schedule in real-time. 
              Edits made in Faculty Teaching Schedule automatically update here, and vice versa.
            </p>
          </div>
        </div>

        {/* Academic Management Integration - Show allocated courses and faculty */}
        {selectedCourse && selectedSemester && availableCoursesAndFaculty.length > 0 && showAcademicInfo && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-4 flex-shrink-0">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <h3 className="font-medium text-blue-900">Allocated Courses from Academic Management</h3>
              </div>
              <button
                onClick={() => setShowAcademicInfo(false)}
                className="text-blue-600 hover:text-blue-800 p-1"
                title="Hide this info"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-blue-700 mb-3">
              The following courses and faculty are allocated for <span className="font-semibold">{selectedCourse} - Semester {selectedSemester}</span> in Academic Management. You can select these when editing periods.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableCoursesAndFaculty.map((course) => (
                <div key={course.id} className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="font-medium text-gray-900 text-sm mb-1">{course.courseName}</p>
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <p className="text-xs text-gray-600">{course.facultyName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show button to reveal academic info if hidden */}
        {selectedCourse && selectedSemester && availableCoursesAndFaculty.length > 0 && !showAcademicInfo && (
          <button
            onClick={() => setShowAcademicInfo(true)}
            className="w-full mb-4 px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-700 hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
          >
            <Info className="w-4 h-4" />
            <span className="text-sm font-medium">Show Allocated Courses from Academic Management</span>
          </button>
        )}

        {/* Day Selector - No Scroll */}
        <div className="flex gap-2 mb-4 flex-shrink-0">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 py-3 rounded-xl transition-all active:scale-95 shadow-md ${
                selectedDay === day
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-sm font-medium">{day}</span>
            </button>
          ))}
        </div>

        {/* Period Cards - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {currentSchedule.length > 0 ? (
            currentSchedule.map((period) => (
              <div
                key={period.periodNumber}
                className="bg-white rounded-2xl p-4 shadow-md border-2 border-transparent hover:border-green-200 transition-all"
              >
                {isEditing(period.periodNumber) ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                          <span className="text-white font-medium">{period.periodNumber}</span>
                        </div>
                        <span className="text-sm text-gray-600 font-medium">Editing Period {period.periodNumber}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all active:scale-95 flex items-center gap-1.5 shadow-md"
                        >
                          <Save className="w-4 h-4" />
                          <span className="text-sm">Save</span>
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          <span className="text-sm">Cancel</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Subject Selection with Dropdown and Input */}
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-600 mb-1.5 font-medium">
                          Subject {availableCoursesAndFaculty.length > 0 && <span className="text-green-600">(from Academic Management)</span>}
                        </label>
                        {availableCoursesAndFaculty.length > 0 ? (
                          <div className="flex gap-2">
                            <select
                              value=""
                              onChange={(e) => {
                                const selected = availableCoursesAndFaculty.find(c => c.id === e.target.value);
                                if (selected) {
                                  setEditFormData({ 
                                    ...editFormData, 
                                    subject: selected.courseName,
                                    faculty: selected.facultyName 
                                  });
                                }
                              }}
                              className="flex-1 px-3 py-2.5 border border-green-300 bg-green-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                            >
                              <option value="">-- Select from Allocated Courses --</option>
                              {availableCoursesAndFaculty.map((course) => (
                                <option key={course.id} value={course.id}>
                                  {course.courseName} - {course.facultyName}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={editFormData.subject}
                              onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                              placeholder="Or type manually"
                            />
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={editFormData.subject}
                            onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                            placeholder="e.g., Mathematics"
                          />
                        )}
                      </div>

                      {/* Time Input */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1.5 font-medium">Time</label>
                        <input
                          type="text"
                          value={editFormData.time}
                          onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                          placeholder="e.g., 9:00-10:00"
                        />
                      </div>

                      {/* Room Input */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1.5 font-medium">Room</label>
                        <input
                          type="text"
                          value={editFormData.room}
                          onChange={(e) => setEditFormData({ ...editFormData, room: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                          placeholder="e.g., Room 201"
                        />
                      </div>

                      {/* Faculty - Auto-filled from selection or manual entry */}
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-600 mb-1.5 font-medium">Faculty Name</label>
                        <div className="flex gap-2">
                          <select
                            value=""
                            onChange={(e) => {
                              const selected = dropdownFacultyList.find((faculty) => faculty.name === e.target.value);
                              if (selected) {
                                setEditFormData({ ...editFormData, faculty: selected.name });
                              }
                            }}
                            className="flex-1 px-3 py-2.5 border border-green-300 bg-green-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                          >
                            <option value="">
                              {dropdownFacultyList.length > 0 ? '-- Select Faculty --' : 'No faculty found'}
                            </option>
                            {dropdownFacultyList.map((faculty) => (
                              <option key={faculty.id} value={faculty.name}>
                                {faculty.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={editFormData.faculty}
                            onChange={(e) => setEditFormData({ ...editFormData, faculty: e.target.value })}
                            className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                            placeholder="Or type manually"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center gap-3">
                    {/* Period Number Badge */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                      period.subject === 'Free Period' || period.subject === 'No Class'
                        ? 'bg-gray-300'
                        : 'bg-gradient-to-br from-green-500 to-emerald-600'
                    }`}>
                      <span className="text-white font-medium text-lg">{period.periodNumber}</span>
                    </div>

                    {/* Period Details */}
                    <div className="flex-1 min-w-0">
                      {/* Subject Name */}
                      <h3 className={`truncate mb-1.5 font-medium ${
                        period.subject === 'Free Period' || period.subject === 'No Class'
                          ? 'text-gray-500 italic'
                          : 'text-gray-900'
                      }`}>
                        {period.subject}
                      </h3>

                      {/* Time */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        <p className="text-xs text-gray-600">{period.time || 'Time not set'}</p>
                      </div>

                      {/* Faculty and Room */}
                      <div className="flex flex-wrap items-center gap-2">
                        {period.faculty && (
                          <div className="flex items-center gap-1 bg-blue-100 px-2 py-0.5 rounded-full">
                            <User className="w-3 h-3 text-blue-700" />
                            <span className="text-xs text-blue-700 font-medium">{period.faculty}</span>
                          </div>
                        )}
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          {period.room || 'Room not set'}
                        </span>
                      </div>
                    </div>

                    {/* Edit Button - Always show for all periods */}
                    <button
                      onClick={() => handleEditClick(selectedDay, period)}
                      className="p-2.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-all active:scale-95 flex-shrink-0"
                      title="Edit period"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl p-8 shadow-md text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">No Timetable Available</h3>
              <p className="text-gray-600 text-sm">
                No timetable data found for {selectedCourse} - Section {selectedSection} - Semester {selectedSemester}
              </p>
            </div>
          )}
        </div>

        {/* Download PDF Button - Only show if timetable data is available */}
        {isTimetableAvailable() && (
          <div className="mt-4 flex-shrink-0">
            <button
              onClick={handleDownloadPDF}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
            >
              <Download className="w-5 h-5" />
              <span className="font-medium">Download Complete Timetable</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
