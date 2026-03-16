import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Calendar, Edit2, Trash2, Plus, Download, Check, X, FileText, Save, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COURSES, SEMESTERS } from '@/constants/departments';
import { HolidayAttendanceCalendar } from './HolidayAttendanceCalendar';
import { appStorage } from './';
import { parseHeaderDate } from '../utils/headerDateTime';
import { facultyAPI } from '../api';
import { subjectsAPI } from '../api';

// Helper function to copy text to clipboard
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback method
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        document.body.removeChild(textArea);
        return false;
      }
    }
  } catch (err) {
    return false;
  }
};

interface AdminAcademicsManagementProps {
  onBack: () => void;
}

interface Course {
  id: string;
  courseName: string;
  facultyName: string;
  code?: string;
  section?: string;
}

interface AcademicData {
  [department: string]: {
    [semester: string]: Course[];
  };
}

interface SemesterDates {
  startDate: string;
  endDate: string;
}

interface AcademicYearData {
  [semester: string]: SemesterDates;
}

interface PeriodBlock {
  period: number;
  isBlocked: boolean;
}

interface SessionBlock {
  morning: PeriodBlock[];
  afternoon: PeriodBlock[];
}

interface DayBlock {
  date: string;
  isHoliday: boolean;
  isClosed: boolean;
  sessions: SessionBlock;
  permissionGrantedUntil?: string; // Date string for one week permission
}

interface HolidayData {
  [date: string]: DayBlock;
}

export function AdminAcademicsManagement({ onBack }: AdminAcademicsManagementProps) {
  const [activeTab, setActiveTab] = useState<'courses' | 'academic-year'>('courses');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newFacultyName, setNewFacultyName] = useState('');
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editCourseName, setEditCourseName] = useState('');
  const [editFacultyName, setEditFacultyName] = useState('');
  
  // State for registered faculty list
  const [registeredFacultyList, setRegisteredFacultyList] = useState<string[]>([]);
  const [currentCourses, setCurrentCourses] = useState<Course[]>([]);
  
  // Add modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalCourseName, setModalCourseName] = useState('');
  const [modalSections, setModalSections] = useState('');
  const [addType, setAddType] = useState<'course' | 'section'>('course');
  const [addCourseSelection, setAddCourseSelection] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  
  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCourseName, setDeleteCourseName] = useState('');
  const [deleteSection, setDeleteSection] = useState('');
  const [deleteType, setDeleteType] = useState<'course' | 'section'>('course');
  
  // Academic Year Setup states
  const [editingSemester, setEditingSemester] = useState<string | null>(null);
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  
  // Holiday Calendar visibility
  const [showHolidayCalendar, setShowHolidayCalendar] = useState(false);
  
  // Custom header date state
  const [customDate, setCustomDate] = useState(() => {
    const saved = appStorage.getItem('customHeaderDate');
    return saved || new Date().toISOString().split('T')[0];
  });

  // Dynamic departments and course sections
  const [departments, setDepartments] = useState<string[]>(() => {
    const saved = appStorage.getItem('customDepartments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved departments', e);
      }
    }

    const academicSaved = appStorage.getItem('academic_courses_data');
    if (academicSaved) {
      try {
        return Object.keys(JSON.parse(academicSaved) || {});
      } catch (e) {
        console.error('Failed to derive departments from academic data', e);
      }
    }

    return [];
  });

  const [courseSections, setCourseSections] = useState<Record<string, string[]>>(() => {
    const saved = appStorage.getItem('customCourseSections');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved course sections', e);
      }
    }
    return {};
  });

  const semesters = ['1', '2', '3', '4', '5', '6'];

  // Get sections for selected course
  const availableSections = selectedDepartment ? courseSections[selectedDepartment] || [] : [];
  
  // Get sections for delete dropdown
  const deleteSections = deleteCourseName ? courseSections[deleteCourseName] || [] : [];

  // Handle modal submission
  const handleModalSubmit = () => {
    if (addType === 'course') {
      // Add new course with sections
      if (!modalCourseName.trim()) {
        alert('Please enter a course name');
        return;
      }
      if (!modalSections.trim()) {
        alert('Please enter sections (comma-separated)');
        return;
      }

      const newCourseName = modalCourseName.trim().toUpperCase();
      const newSections = modalSections
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      if (newSections.length === 0) {
        alert('Please enter at least one section');
        return;
      }

      // Check if course already exists
      if (departments.includes(newCourseName)) {
        alert(`Course "${newCourseName}" already exists!`);
        return;
      }

      // Add new course to departments
      const updatedDepartments = [...departments, newCourseName];
      setDepartments(updatedDepartments);
      appStorage.setItem('customDepartments', JSON.stringify(updatedDepartments));

      // Add sections for the new course
      const updatedCourseSections = {
        ...courseSections,
        [newCourseName]: newSections
      };
      setCourseSections(updatedCourseSections);
      appStorage.setItem('customCourseSections', JSON.stringify(updatedCourseSections));

      // Initialize academic data for new course (all semesters empty)
      setAcademicData(prev => ({
        ...prev,
        [newCourseName]: {
          '1': [],
          '2': [],
          '3': [],
          '4': [],
          '5': [],
          '6': [],
        }
      }));

      // Initialize academic year data for new course
      setAcademicYearData(prev => ({
        ...prev,
        [newCourseName]: {
          '1': { startDate: '', endDate: '' },
          '2': { startDate: '', endDate: '' },
          '3': { startDate: '', endDate: '' },
          '4': { startDate: '', endDate: '' },
          '5': { startDate: '', endDate: '' },
          '6': { startDate: '', endDate: '' },
        }
      }));

      // Show success message
      alert(`Course "${newCourseName}" with sections [${newSections.join(', ')}] added successfully!`);
    } else {
      // Add section to existing course
      if (!addCourseSelection) {
        alert('Please select a course');
        return;
      }
      if (!newSectionName.trim()) {
        alert('Please enter a section name');
        return;
      }

      const sectionName = newSectionName.trim();
      const currentSections = courseSections[addCourseSelection] || [];

      // Check if section already exists
      if (currentSections.includes(sectionName)) {
        alert(`Section "${sectionName}" already exists in "${addCourseSelection}"!`);
        return;
      }

      // Add section to the course
      const updatedCourseSections = {
        ...courseSections,
        [addCourseSelection]: [...currentSections, sectionName]
      };
      setCourseSections(updatedCourseSections);
      appStorage.setItem('customCourseSections', JSON.stringify(updatedCourseSections));

      // Show success message
      alert(`Section "${sectionName}" added to "${addCourseSelection}" successfully!`);
    }
    
    // Reset modal
    setShowAddModal(false);
    setModalCourseName('');
    setModalSections('');
    setAddType('course');
    setAddCourseSelection('');
    setNewSectionName('');
  };

  // Handle delete modal submission
  const handleDeleteModalSubmit = () => {
    if (!deleteCourseName) {
      alert('Please select a course');
      return;
    }

    if (deleteType === 'course') {
      // Delete entire course
      if (!confirm(`Are you sure you want to delete the entire course "${deleteCourseName}" and all its sections?`)) {
        return;
      }

      // Remove from departments
      const updatedDepartments = departments.filter(d => d !== deleteCourseName);
      setDepartments(updatedDepartments);
      appStorage.setItem('customDepartments', JSON.stringify(updatedDepartments));

      // Remove from course sections
      const updatedCourseSections = { ...courseSections };
      delete updatedCourseSections[deleteCourseName];
      setCourseSections(updatedCourseSections);
      appStorage.setItem('customCourseSections', JSON.stringify(updatedCourseSections));

      // Remove from academic data
      setAcademicData(prev => {
        const updated = { ...prev };
        delete updated[deleteCourseName];
        return updated;
      });

      // Remove from academic year data
      setAcademicYearData(prev => {
        const updated = { ...prev };
        delete updated[deleteCourseName];
        return updated;
      });

      alert(`Course "${deleteCourseName}" deleted successfully!`);
    } else {
      // Delete specific section
      if (!deleteSection) {
        alert('Please select a section to delete');
        return;
      }

      if (!confirm(`Are you sure you want to delete section "${deleteSection}" from course "${deleteCourseName}"?`)) {
        return;
      }

      const currentSections = courseSections[deleteCourseName] || [];
      
      if (currentSections.length === 1) {
        alert('Cannot delete the last section. Delete the entire course instead.');
        return;
      }

      // Remove section from course sections
      const updatedSections = currentSections.filter(s => s !== deleteSection);
      const updatedCourseSections = {
        ...courseSections,
        [deleteCourseName]: updatedSections
      };
      setCourseSections(updatedCourseSections);
      appStorage.setItem('customCourseSections', JSON.stringify(updatedCourseSections));

      alert(`Section "${deleteSection}" deleted from "${deleteCourseName}" successfully!`);
    }

    // Reset modal
    setShowDeleteModal(false);
    setDeleteCourseName('');
    setDeleteSection('');
    setDeleteType('course');
  };

  // Store academic data - Load from appStorage or use default
  const [academicData, setAcademicData] = useState<AcademicData>(() => {
    const saved = appStorage.getItem('academic_courses_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved academic data', e);
      }
    }
    // Empty data
    return {};
  });

  // Store academic year data - Load from appStorage or use default
  const [academicYearData, setAcademicYearData] = useState<AcademicYearData>(() => {
    const saved = appStorage.getItem('academic_year_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && !Array.isArray(parsed)) {
          const values = Object.values(parsed);
          const looksScoped =
            values.length > 0 &&
            values.every(
              (value) =>
                value &&
                typeof value === 'object' &&
                !('startDate' in (value as object)) &&
                !('endDate' in (value as object)),
            );
          if (looksScoped) {
            const firstScope = Object.values(parsed)[0];
            return (firstScope as AcademicYearData) || {};
          }
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse saved academic year data', e);
      }
    }
    // Default empty data
    return {};
  });

  // Save academicData to appStorage whenever it changes
  useEffect(() => {
    appStorage.setItem('academic_courses_data', JSON.stringify(academicData));
    // Dispatch custom event for same-tab synchronization
    window.dispatchEvent(new CustomEvent('academicDataUpdated', { detail: academicData }));
  }, [academicData]);

  // Save academicYearData to appStorage whenever it changes
  useEffect(() => {
    appStorage.setItem('academic_year_data', JSON.stringify(academicYearData));
  }, [academicYearData]);

  // Dispatch custom events when departments or sections change
  useEffect(() => {
    appStorage.setItem('customDepartments', JSON.stringify(departments));
    appStorage.setItem('customCourseSections', JSON.stringify(courseSections));
    window.dispatchEvent(new CustomEvent('departmentsUpdated', { detail: { departments, courseSections } }));
  }, [departments, courseSections]);

  // Load registered faculty from backend
  useEffect(() => {
    const loadRegisteredFaculty = async () => {
      try {
        const facultyData = await facultyAPI.getAll();
        const facultyNames = (facultyData || [])
          .map((f: any) => f.name || f.full_name || '')
          .filter((name: string) => name && name.trim() !== '')
          .sort();
        setRegisteredFacultyList(Array.from(new Set(facultyNames)));
      } catch (e) {
        console.error('Failed to load registered faculty from backend', e);
        setRegisteredFacultyList([]);
      }
    };

    void loadRegisteredFaculty();

    // Listen for faculty registration events
    const handleFacultyRegistered = () => {
      void loadRegisteredFaculty();
    };

    window.addEventListener('facultyRegistered', handleFacultyRegistered);

    return () => {
      window.removeEventListener('facultyRegistered', handleFacultyRegistered);
    };
  }, []);

  useEffect(() => {
    const loadSubjects = async () => {
      if (!selectedDepartment || !selectedSemester) {
        setCurrentCourses([]);
        return;
      }
      try {
        const rows = await subjectsAPI.getAll({
          course: selectedDepartment,
          semester: selectedSemester,
          section: selectedSection || undefined,
        });
        const mapped: Course[] = (rows || []).map((row: any) => ({
          id: String(row.id),
          courseName: row.name,
          facultyName: row.faculty_name || '',
          code: row.code,
          section: row.section || '',
        }));
        setCurrentCourses(mapped);
      } catch (error) {
        console.error('Failed to load subjects from backend:', error);
        setCurrentCourses([]);
      }
    };
    void loadSubjects();
  }, [selectedDepartment, selectedSemester, selectedSection]);

  const handleAddCourse = async () => {
    if (!newCourseName.trim() || !newFacultyName.trim()) {
      alert('Please fill in both course name and faculty name');
      return;
    }

    try {
      const code = `${selectedDepartment}-${selectedSemester}-${selectedSection || 'ALL'}-${Date.now()}`;
      await subjectsAPI.create({
        name: newCourseName.trim(),
        code,
        course: selectedDepartment,
        semester: selectedSemester,
        section: selectedSection || null,
        faculty_name: newFacultyName.trim(),
      });
      const rows = await subjectsAPI.getAll({
        course: selectedDepartment,
        semester: selectedSemester,
        section: selectedSection || undefined,
      });
      setCurrentCourses(
        (rows || []).map((row: any) => ({
          id: String(row.id),
          courseName: row.name,
          facultyName: row.faculty_name || '',
          code: row.code,
          section: row.section || '',
        })),
      );
    } catch (error) {
      console.error('Failed to add subject to backend:', error);
      alert('Failed to save subject in database');
      return;
    }

    setNewCourseName('');
    setNewFacultyName('');
    setIsAddingCourse(false);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      await subjectsAPI.delete(Number(courseId));
      setCurrentCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (error) {
      console.error('Failed to delete subject from backend:', error);
      alert('Failed to delete subject from database');
    }
  };

  const handleStartEdit = (course: Course) => {
    setEditingCourseId(course.id);
    setEditCourseName(course.courseName);
    setEditFacultyName(course.facultyName);
  };

  const handleSaveEdit = async () => {
    if (!editCourseName.trim() || !editFacultyName.trim()) {
      alert('Please fill in both course name and faculty name');
      return;
    }

    try {
      const current = currentCourses.find((c) => c.id === editingCourseId);
      if (!current) return;
      await subjectsAPI.update(Number(editingCourseId), {
        name: editCourseName.trim(),
        code: current.code || `${selectedDepartment}-${selectedSemester}-${Date.now()}`,
        course: selectedDepartment,
        semester: selectedSemester,
        section: selectedSection || null,
        faculty_name: editFacultyName.trim(),
      });
      setCurrentCourses((prev) =>
        prev.map((c) =>
          c.id === editingCourseId
            ? { ...c, courseName: editCourseName.trim(), facultyName: editFacultyName.trim() }
            : c,
        ),
      );
    } catch (error) {
      console.error('Failed to update subject in backend:', error);
      alert('Failed to update subject in database');
      return;
    }

    setEditingCourseId(null);
    setEditCourseName('');
    setEditFacultyName('');
  };

  const handleCancelEdit = () => {
    setEditingCourseId(null);
    setEditCourseName('');
    setEditFacultyName('');
  };

  const handleDownloadPDF = () => {
    if (!selectedDepartment || !selectedSemester) return;

    const doc = new jsPDF();

    // Add header
    doc.setFontSize(18);
    doc.text('Academic Course Details', 14, 20);

    doc.setFontSize(12);
    doc.text(`Course: ${selectedDepartment}`, 14, 30);
    doc.text(`Semester: ${selectedSemester}`, 14, 37);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 44);

    // Prepare table data
    const tableData = currentCourses.map((course, index) => [
      index + 1,
      course.courseName,
      course.facultyName,
    ]);

    // Add table
    autoTable(doc, {
      startY: 50,
      head: [['S.No', 'Course Name', 'Faculty Name']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 85 },
        2: { cellWidth: 85 },
      },
    });

    // Add footer
    doc.setFontSize(8);
    doc.text(
      `Generated on ${new Date().toLocaleString()}`,
      14,
      doc.internal.pageSize.height - 10
    );

    doc.save(`${selectedDepartment}_Semester_${selectedSemester}_Courses.pdf`);
  };



  const handleStartEditSemester = (semester: string) => {
    setEditingSemester(semester);
    setTempStartDate(academicYearData[semester]?.startDate || '');
    setTempEndDate(academicYearData[semester]?.endDate || '');
  };

  const handleSaveEditSemester = () => {
    if (!tempStartDate || !tempEndDate) {
      alert('Please fill in both start date and end date');
      return;
    }

    if (new Date(tempStartDate) >= new Date(tempEndDate)) {
      alert('Start date must be before end date');
      return;
    }

    setAcademicYearData(prev => ({
      ...prev,
      [editingSemester as string]: { startDate: tempStartDate, endDate: tempEndDate },
    }));

    setEditingSemester(null);
    setTempStartDate('');
    setTempEndDate('');
  };

  const handleCancelEditSemester = () => {
    setEditingSemester(null);
    setTempStartDate('');
    setTempEndDate('');
  };

  const handleDownloadAcademicYearPDF = () => {
    const doc = new jsPDF();

    // Add header
    doc.setFontSize(18);
    doc.text('Academic Year Schedule', 14, 20);

    doc.setFontSize(12);
    doc.text('Applies to: All Courses', 14, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 37);

    // Prepare table data
    const tableData = semesters.map((sem) => {
      const dates = academicYearData[sem];
      return [
        `Semester ${sem}`,
        dates?.startDate ? new Date(dates.startDate).toLocaleDateString() : '-',
        dates?.endDate ? new Date(dates.endDate).toLocaleDateString() : '-',
      ];
    });

    // Add table
    autoTable(doc, {
      startY: 45,
      head: [['Semester', 'Start Date', 'End Date']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 65 },
        2: { cellWidth: 65 },
      },
    });

    // Add footer
    doc.setFontSize(8);
    doc.text(
      `Generated on ${new Date().toLocaleString()}`,
      14,
      doc.internal.pageSize.height - 10
    );

    doc.save('Academic_Year_Schedule_All_Courses.pdf');
  };

  // Save only the configured date. Portal headers use live current time.
  const handleSaveDateTime = () => {
    const normalizedDate = parseHeaderDate(customDate);
    appStorage.setItem(
      'customHeaderDate',
      normalizedDate ? normalizedDate.toISOString().split('T')[0] : customDate,
    );
    alert('Date updated successfully. Portal headers will use this date with live current time.');
  };

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
          <div className="flex-1">
            <h2 className="text-white">Academics Management</h2>
            <p className="text-white/80 text-sm">Manage courses and academic year setup</p>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="bg-white rounded-3xl shadow-lg p-2 mb-6 flex gap-2">
          <button
            onClick={() => {
              setActiveTab('courses');
              setSelectedDepartment('');
              setSelectedSemester('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl transition-all ${
              activeTab === 'courses'
                ? 'bg-green-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">Course Management</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('academic-year');
              setYearDepartment('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl transition-all ${
              activeTab === 'academic-year'
                ? 'bg-green-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Academic Year Setup</span>
          </button>
        </div>

        {/* Course Management Tab */}
        {activeTab === 'courses' && (
          <>
            {/* Selection Card */}
            <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-gray-900">Select Course & Semester</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add</span>
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Delete</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Course Dropdown */}
                <div>
                  <label className="block text-gray-700 text-sm mb-2">Course</label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => {
                      setSelectedDepartment(e.target.value);
                      setSelectedSection('');
                      setSelectedSemester('');
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">{departments.length === 0 ? '-- No Courses Available --' : '-- Select Course --'}</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section Dropdown - Only shown after course selection */}
                {selectedDepartment && (
                  <div>
                    <label className="block text-gray-700 text-sm mb-2">Section</label>
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">-- Select Section --</option>
                      {availableSections.map((section) => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Semester Dropdown */}
                <div className={selectedDepartment ? '' : 'md:col-start-2'}>
                  <label className="block text-gray-700 text-sm mb-2">Semester</label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    disabled={!selectedDepartment}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Select Semester --</option>
                    {semesters.map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Course List */}
            {selectedDepartment && selectedSemester && (
              <div className="bg-white rounded-3xl shadow-lg p-6">
                {/* Header with Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-gray-900">
                      {selectedDepartment} - Semester {selectedSemester}
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                      {currentCourses.length} {currentCourses.length === 1 ? 'subject' : 'subjects'} assigned
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {currentCourses.length > 0 && (
                      <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-green-700 transition-all active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">Download</span>
                      </button>
                    )}
                    <button
                      onClick={() => setIsAddingCourse(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-medium">Add Subject</span>
                    </button>
                  </div>
                </div>

                {/* Add Course Form */}
                {isAddingCourse && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
                    <h4 className="text-gray-900 text-sm mb-4">Add New Subject</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <input
                        type="text"
                        value={newCourseName}
                        onChange={(e) => setNewCourseName(e.target.value)}
                        placeholder="Subject Name"
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <select
                        value={newFacultyName}
                        onChange={(e) => setNewFacultyName(e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">-- Select Faculty --</option>
                        {registeredFacultyList.map((facultyName) => (
                          <option key={facultyName} value={facultyName}>
                            {facultyName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleAddCourse}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all active:scale-95"
                      >
                        <Save className="w-4 h-4" />
                        <span className="text-sm">Save</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingCourse(false);
                          setNewCourseName('');
                          setNewFacultyName('');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all active:scale-95"
                      >
                        <X className="w-4 h-4" />
                        <span className="text-sm">Cancel</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Course Table */}
                {currentCourses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-green-100">
                          <th className="text-left py-4 px-4 text-gray-700 text-sm font-medium">S.No</th>
                          <th className="text-left py-4 px-4 text-gray-700 text-sm font-medium">Subject Name</th>
                          <th className="text-left py-4 px-4 text-gray-700 text-sm font-medium">Faculty Name</th>
                          <th className="text-center py-4 px-4 text-gray-700 text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentCourses.map((course, index) => (
                          <tr key={course.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 text-gray-600">{index + 1}</td>
                            <td className="py-4 px-4">
                              {editingCourseId === course.id ? (
                                <input
                                  type="text"
                                  value={editCourseName}
                                  onChange={(e) => setEditCourseName(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                              ) : (
                                <span className="text-gray-900">{course.courseName}</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              {editingCourseId === course.id ? (
                                <select
                                  value={editFacultyName}
                                  onChange={(e) => setEditFacultyName(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                  <option value="">-- Select Faculty --</option>
                                  {registeredFacultyList.map((facultyName) => (
                                    <option key={facultyName} value={facultyName}>
                                      {facultyName}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-gray-700">{course.facultyName}</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-center gap-2">
                                {editingCourseId === course.id ? (
                                  <>
                                    <button
                                      onClick={handleSaveEdit}
                                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all active:scale-95"
                                      title="Save"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all active:scale-95"
                                      title="Cancel"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleStartEdit(course)}
                                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all active:scale-95"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCourse(course.id)}
                                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all active:scale-95"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Plus className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-2">No courses added yet</p>
                    <p className="text-gray-400 text-sm">Click "Add Course" to get started</p>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!selectedDepartment && !selectedSemester && (
              <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-10 h-10 text-green-600" />
                </div>
                {departments.length === 0 ? (
                  <>
                    <h3 className="text-gray-900 mb-2">No Courses Available</h3>
                    <p className="text-gray-500 text-sm mb-4">
                      Get started by adding your first course using the "Add" button above
                    </p>
                    <p className="text-gray-400 text-xs">
                      Example: Add "BCA" with sections "B1, B2" or "BSC" with sections "A1, A2, B, C, D, G, K"
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-gray-900 mb-2">Select Course & Semester</h3>
                    <p className="text-gray-500 text-sm">
                      Choose a course and semester to view and manage courses
                    </p>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Academic Year Setup Tab */}
        {activeTab === 'academic-year' && (
          <>
            {/* Academic Year Setup Header */}
            <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-gray-900">Academic Year Setup</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    One shared academic year schedule applies to all courses.
                  </p>
                </div>
                
                {/* Holiday & Attendance Control Button */}
                <button
                  onClick={() => setShowHolidayCalendar(!showHolidayCalendar)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all active:scale-95 ${
                    showHolidayCalendar
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">Holiday & Attendance Control</span>
                </button>
              </div>

              <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3">
                <p className="text-sm font-medium text-green-800">Applies to all courses</p>
                <p className="text-sm text-green-700 mt-1">
                  Semester start and end dates configured here will be used across every course and section.
                </p>
              </div>
            </div>

            {/* Holiday Calendar - Conditionally Rendered */}
            {showHolidayCalendar && (
              <div className="mb-6">
                <HolidayAttendanceCalendar />
              </div>
            )}

            {/* Empty State - No Departments */}
            {departments.length === 0 && (
              <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-gray-900 mb-2">No Courses Available</h3>
                <p className="text-gray-500 text-sm">
                  Please add a course first from the "Course Management" tab to manage academic year setup.
                </p>
              </div>
            )}

            {/* Academic Year Schedule */}
            {departments.length > 0 && (
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-gray-900">Academic Year Schedule</h3>
                    <p className="text-gray-500 text-sm mt-1">
                      Set start and end dates for each semester across all courses
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadAcademicYearPDF}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">Download Schedule</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-green-100">
                        <th className="text-left py-4 px-4 text-gray-700 text-sm font-medium">Semester</th>
                        <th className="text-left py-4 px-4 text-gray-700 text-sm font-medium">Start Date</th>
                        <th className="text-left py-4 px-4 text-gray-700 text-sm font-medium">End Date</th>
                        <th className="text-center py-4 px-4 text-gray-700 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {semesters.map((sem) => {
                        const dates = academicYearData[sem];
                        const isEditing = editingSemester === sem;

                        return (
                          <tr key={sem} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4">
                              <span className="text-gray-900 font-medium">Semester {sem}</span>
                            </td>
                            <td className="py-4 px-4">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={tempStartDate}
                                  onChange={(e) => setTempStartDate(e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                              ) : (
                                <span className="text-gray-700">
                                  {dates?.startDate ? new Date(dates.startDate).toLocaleDateString() : '-'}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={tempEndDate}
                                  onChange={(e) => setTempEndDate(e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                              ) : (
                                <span className="text-gray-700">
                                  {dates?.endDate ? new Date(dates.endDate).toLocaleDateString() : '-'}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-center gap-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={handleSaveEditSemester}
                                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all active:scale-95"
                                      title="Save"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={handleCancelEditSemester}
                                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all active:scale-95"
                                      title="Cancel"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleStartEditSemester(sem)}
                                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all active:scale-95"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <div className="flex gap-3">
                    <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-900 text-sm font-medium mb-1">Academic Year Schedule</p>
                      <p className="text-blue-700 text-sm">
                        Click the edit icon to set or modify start and end dates for each semester. 
                        The dates help in planning academic activities and tracking progress throughout the year.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Header Date Editor */}
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-gray-900">Date Configuration</h3>
                  <p className="text-gray-500 text-sm">Set a custom date for all portal headers. Time stays live.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 mb-6">
                {/* Date Input */}
                <div>
                  <label className="block text-gray-700 text-sm mb-2 font-medium">Header Date</label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Preview:</p>
                <p className="text-sm text-gray-900 font-medium">
                  {new Date(customDate).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })} | {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveDateTime}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                <span className="font-medium">Save Header Date</span>
              </button>

              {/* Info Note */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 <strong>Note:</strong> The configured date and time will be displayed in the header (left of profile) across all three portals: Admin, Student, and Faculty.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Course/Section Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900 text-lg font-medium">Add Course/Section</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setModalCourseName('');
                  setModalSections('');
                  setAddType('course');
                  setAddCourseSelection('');
                  setNewSectionName('');
                }}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Add Type Selection */}
              <div>
                <label className="block text-gray-700 text-sm mb-2 font-medium">Add Type</label>
                <select
                  value={addType}
                  onChange={(e) => setAddType(e.target.value as 'course' | 'section')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="course">New Course (with sections)</option>
                  <option value="section">Section to Existing Course</option>
                </select>
              </div>

              {/* Show fields based on add type */}
              {addType === 'course' ? (
                <>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2 font-medium">Course Name</label>
                    <input
                      type="text"
                      value={modalCourseName}
                      onChange={(e) => setModalCourseName(e.target.value)}
                      placeholder="e.g., BCA, BSC, BCOM"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm mb-2 font-medium">Sections</label>
                    <input
                      type="text"
                      value={modalSections}
                      onChange={(e) => setModalSections(e.target.value)}
                      placeholder="e.g., B1, B2, A1, A2"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-2">Enter sections separated by commas</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-gray-700 text-sm mb-2 font-medium">Select Course</label>
                    <select
                      value={addCourseSelection}
                      onChange={(e) => setAddCourseSelection(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">-- Select Course --</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm mb-2 font-medium">Section Name</label>
                    <input
                      type="text"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      placeholder="e.g., B3, A3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleModalSubmit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span className="font-medium">Save</span>
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setModalCourseName('');
                  setModalSections('');
                  setAddType('course');
                  setAddCourseSelection('');
                  setNewSectionName('');
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
                <span className="font-medium">Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Course/Section Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900 text-lg font-medium">Delete Course/Section</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteCourseName('');
                  setDeleteSection('');
                  setDeleteType('course');
                }}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm mb-2 font-medium">Course</label>
                <select
                  value={deleteCourseName}
                  onChange={(e) => setDeleteCourseName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">-- Select Course --</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-2 font-medium">Section</label>
                <select
                  value={deleteSection}
                  onChange={(e) => setDeleteSection(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">-- Select Section --</option>
                  {deleteSections.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-2 font-medium">Delete Type</label>
                <select
                  value={deleteType}
                  onChange={(e) => setDeleteType(e.target.value as 'course' | 'section')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="course">Entire Course</option>
                  <option value="section">Specific Section</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleDeleteModalSubmit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span className="font-medium">Delete</span>
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteCourseName('');
                  setDeleteSection('');
                  setDeleteType('course');
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
                <span className="font-medium">Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
