import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, User, Download, Plus, X, Edit2, Trash2, Info, ChevronLeft, ChevronRight, Ban, Unlock, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { appStorage } from './';
import { facultyAPI, timetableAPI } from '../api';

interface AdminFacultyTimetablePageProps {
  onBack: () => void;
}

interface Period {
  periodNumber: number;
  subject: string;
  time: string;
  class: string;
  room: string;
  semester: number;
}

interface DaySchedule {
  [key: string]: Period[];
}

interface FacultyTimetableData {
  [key: string]: DaySchedule;
}

// Helper function to format date as YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper function to get day name from date
const getDayName = (date: Date): string => {
  const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return dayMap[date.getDay()];
};

// Helper function to format date for display
const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  };
  return date.toLocaleDateString('en-US', options);
};

export function AdminFacultyTimetablePage({ onBack }: AdminFacultyTimetablePageProps) {
  // State for date selection and calendar
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [dateSpecificSchedules, setDateSpecificSchedules] = useState<Record<string, Period[]>>({});
  
  const [selectedDay, setSelectedDay] = useState('Mon');
  const [selectedFaculty, setSelectedFaculty] = useState('All');
  const [facultyTimetableData, setFacultyTimetableData] = useState<FacultyTimetableData>({});
  const [availableFaculty, setAvailableFaculty] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingClass, setEditingClass] = useState<{
    originalDepartment: string;
    originalSection: string;
    originalSemester: string;
    originalDay: string;
    originalPeriodNumber: string;
  } | null>(null);
  const [editingDatePeriod, setEditingDatePeriod] = useState<Period | null>(null);
  const [addFormData, setAddFormData] = useState({
    department: 'BCA',
    semester: '1',
    section: 'B1',
    day: 'Mon',
    periodNumber: '1',
    time: '9:00-10:00',
    subject: '',
    room: '',
    class: ''
  });
  
  // Add view mode state: 'today' for today's schedule view, 'week' for weekly timetable view
  const [viewMode, setViewMode] = useState<'today' | 'week'>('week');
  
  // State for selecting day in Today's Schedule view: 'today' or 'tomorrow'
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<'today' | 'tomorrow'>('today');
  
  // State for faculty blocking
  const [blockedFaculty, setBlockedFaculty] = useState<Record<string, Record<string, boolean>>>({});
  
  // State for individual faculty view in Today's Schedule
  const [viewingIndividualFaculty, setViewingIndividualFaculty] = useState<string | null>(null);
  
  // State for search
  const [searchQuery, setSearchQuery] = useState('');

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const facultyList = availableFaculty; // Only show registered faculty

  // Get current date
  const getCurrentDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('en-US', options);
  };
  
  // Get date based on selected schedule day
  const getSelectedScheduleDate = () => {
    const date = new Date();
    if (selectedScheduleDay === 'tomorrow') {
      date.setDate(date.getDate() + 1);
    }
    return date;
  };
  
  // Get formatted date for selected schedule day
  const getSelectedScheduleDateFormatted = () => {
    const date = getSelectedScheduleDate();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Get sections based on department
  const getSections = (department: string): string[] => {
    switch (department) {
      case 'BCA':
        return ['B1', 'B2'];
      case 'BSc':
        return ['A1', 'A2', 'B', 'C', 'D', 'G', 'K'];
      case 'BCom':
        return ['E', 'D'];
      default:
        return [];
    }
  };

  // Update section when department changes
  useEffect(() => {
    const sections = getSections(addFormData.department);
    if (sections.length > 0 && !sections.includes(addFormData.section)) {
      setAddFormData(prev => ({ ...prev, section: sections[0] }));
    }
  }, [addFormData.department]);

  // Load and generate faculty timetables from master data
  useEffect(() => {
    void generateAllFacultyTimetables();
  }, []);

  // Handle view mode changes
  useEffect(() => {
    if (viewMode === 'today') {
      setSelectedFaculty('All');
      setViewingIndividualFaculty(null);
    } else if (viewMode === 'week' && selectedFaculty === 'All') {
      setSelectedFaculty('');
    }
  }, [viewMode]);

  // Listen for timetable updates AND academic data updates
  useEffect(() => {
    const handleTimetableUpdate = () => {
      console.log('[FacultyTimetable] Received timetableUpdated event, regenerating...');
      void generateAllFacultyTimetables();
    };

    const handleFacultyUpdate = () => {
      console.log('[FacultyTimetable] Received facultyRegistered event, regenerating...');
      void generateAllFacultyTimetables();
    };

    const handleAcademicUpdate = () => {
      console.log('[FacultyTimetable] Received academicDataUpdated event, regenerating...');
      void generateAllFacultyTimetables();
    };

    console.log('[FacultyTimetable] Setting up event listeners');
    window.addEventListener('timetableUpdated', handleTimetableUpdate);
    window.addEventListener('facultyRegistered', handleFacultyUpdate);
    window.addEventListener('academicDataUpdated', handleAcademicUpdate as EventListener);
    window.addEventListener('storage', (e) => {
      if (e.key === 'timetable_master_data' || e.key === 'registered_faculties' || e.key === 'academic_courses_data') {
        console.log('[FacultyTimetable] Received storage event for:', e.key);
        handleTimetableUpdate();
      }
    });

    return () => {
      console.log('[FacultyTimetable] Cleaning up event listeners');
      window.removeEventListener('timetableUpdated', handleTimetableUpdate);
      window.removeEventListener('facultyRegistered', handleFacultyUpdate);
      window.removeEventListener('academicDataUpdated', handleAcademicUpdate as EventListener);
      window.removeEventListener('storage', handleTimetableUpdate);
    };
  }, []);

  const generateAllFacultyTimetables = async () => {
    console.log('[FacultyTimetable] generateAllFacultyTimetables called');
    
    let registeredFacultyList: string[] = [];

    try {
      const facultyData = await facultyAPI.getAll();
      registeredFacultyList = (facultyData || [])
        .map((f: any) => f.name || f.full_name || '')
        .filter((name: string) => name && name.trim() !== '');
    } catch (e) {
      console.error('Failed to load faculty list from backend', e);
    }

    try {
      const rows = await timetableAPI.getAll();
      const dbSchedules: FacultyTimetableData = {};
      (rows || []).forEach((row: any) => {
        const faculty = row.faculty_name || '';
        if (!faculty) return;
        const day = row.day_of_week?.slice(0, 3) || 'Mon';
        if (!dbSchedules[faculty]) {
          dbSchedules[faculty] = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [] };
        }
        if (!dbSchedules[faculty][day]) {
          dbSchedules[faculty][day] = [];
        }
        dbSchedules[faculty][day].push({
          periodNumber: Number(row.period_number),
          subject: row.subject || '',
          time: row.time || '',
          class: `${row.course} ${row.section} - Sem ${row.semester}`,
          room: row.room || '',
          semester: Number(row.semester) || 1,
        });
      });
      Object.keys(dbSchedules).forEach((faculty) => {
        Object.keys(dbSchedules[faculty]).forEach((day) => {
          dbSchedules[faculty][day].sort((a, b) => a.periodNumber - b.periodNumber);
        });
      });

      const allFacultyFromDb = Array.from(new Set([
        ...registeredFacultyList,
        ...Object.keys(dbSchedules),
      ])).sort();
      setAvailableFaculty(allFacultyFromDb);
      setFacultyTimetableData(dbSchedules);
      return;
    } catch (e) {
      console.error('Failed to load timetable data from backend', e);
    }
    
    // On failure, show only registered faculty members without any cached schedule data.
    setAvailableFaculty(registeredFacultyList.sort());
    setFacultyTimetableData({});
    return;

    try {
      const masterData = JSON.parse(storedData);
      const facultySchedules: FacultyTimetableData = {};
      const facultySet = new Set<string>();

      // Loop through all courses, sections, semesters, and days to find faculty members
      Object.keys(masterData).forEach(course => {
        Object.keys(masterData[course]).forEach(section => {
          Object.keys(masterData[course][section]).forEach(semester => {
            Object.keys(masterData[course][section][semester]).forEach(day => {
              const periods = masterData[course][section][semester][day];
              periods.forEach((period: any) => {
                if (period.faculty && period.faculty !== '—' && period.faculty.trim() !== '') {
                  const faculty = period.faculty;
                  facultySet.add(faculty);

                  // Initialize faculty schedule if not exists
                  if (!facultySchedules[faculty]) {
                    facultySchedules[faculty] = {
                      Mon: [],
                      Tue: [],
                      Wed: [],
                      Thu: [],
                      Fri: [],
                      Sat: []
                    };
                  }

                  // Add this period to faculty's schedule
                  facultySchedules[faculty][day].push({
                    periodNumber: period.periodNumber,
                    subject: period.subject,
                    time: period.time,
                    class: `${course} ${section} - Sem ${semester}`,
                    room: period.room,
                    semester: parseInt(semester)
                  });
                }
              });
            });
          });
        });
      });

      // Sort each faculty's schedule by period number for each day
      Object.keys(facultySchedules).forEach(faculty => {
        Object.keys(facultySchedules[faculty]).forEach(day => {
          facultySchedules[faculty][day].sort((a, b) => a.periodNumber - b.periodNumber);
        });
      });

      // Now, add faculty from academic data (who are assigned but might not have schedules yet)
      Object.keys(academicData).forEach(department => {
        Object.keys(academicData[department]).forEach(semester => {
          const courses = academicData[department][semester];
          courses.forEach(course => {
            if (course.facultyName && course.facultyName.trim() !== '') {
              facultySet.add(course.facultyName);
              
              // Initialize faculty schedule if not exists (but don't add periods - they'll be added when timetable is created)
              if (!facultySchedules[course.facultyName]) {
                facultySchedules[course.facultyName] = {
                  Mon: [],
                  Tue: [],
                  Wed: [],
                  Thu: [],
                  Fri: [],
                  Sat: []
                };
              }
            }
          });
        });
      });

      // Show only registered faculty members
      const facultyFromData = Array.from(facultySet);
      const allFaculty = registeredFacultyList.sort();
      
      console.log('[FacultyTimetable] Faculty from timetable:', facultyFromData);
      console.log('[FacultyTimetable] Registered faculty:', registeredFacultyList);
      console.log('[FacultyTimetable] Showing only registered faculty:', allFaculty);
      
      setAvailableFaculty(allFaculty);
      setFacultyTimetableData(facultySchedules);

      // Update selected faculty if current selection is not in the list
      // For weekly view, select first faculty; for today's view, keep "All"
      if (viewMode === 'week' && !allFaculty.includes(selectedFaculty) && selectedFaculty !== 'All') {
        setSelectedFaculty('');
      }
    } catch (e) {
      console.error('Failed to generate faculty timetables', e);
      // Show only registered faculty members even on error
      setAvailableFaculty(registeredFacultyList.sort());
      setFacultyTimetableData({});
      // For weekly view, select first faculty; for today's view, keep "All"
      if (viewMode === 'week' && !registeredFacultyList.includes(selectedFaculty)) {
        setSelectedFaculty('');
      }
    }
  };

  // Helper function to get random semester (1-6)
  const getRandomSemester = () => Math.floor(Math.random() * 6) + 1;

  // Default faculty timetable data for fallback
 
  const currentSchedule = facultyTimetableData[selectedFaculty]?.[selectedDay] || [];

  // Helper function to check if faculty is blocked for today
  const isFacultyBlockedToday = (facultyName: string): boolean => {
    const today = formatDate(new Date());
    return blockedFaculty[facultyName]?.[today] === true;
  };

  // Function to handle opening edit modal
  const handleEditClass = (period: Period, facultyName?: string) => {
    // Parse the class string to extract department, section, and semester
    // Format: "BCA B1 - Sem 1" or "BSc A1 - Sem 3"
    const classString = period.class;
    const parts = classString.split(' - Sem ');
    const semester = parts[1] || '1';
    const courseSectionParts = parts[0].split(' ');
    const department = courseSectionParts[0];
    const section = courseSectionParts[1];

    // When in today's schedule view, use the selected schedule day (today or tomorrow)
    const dayToUse = viewMode === 'today' ? getDayName(getSelectedScheduleDate()) : selectedDay;

    // Set form data with current values
    setAddFormData({
      department,
      section,
      semester,
      day: dayToUse,
      periodNumber: period.periodNumber.toString(),
      time: period.time,
      subject: period.subject,
      room: period.room
    });

    // Edit weekly timetable (today view shows DB schedule only)
    if (viewMode === 'today' && facultyName) {
      setEditingClass({
        originalDepartment: department,
        originalSection: section,
        originalSemester: semester,
        originalDay: dayToUse,
        originalPeriodNumber: period.periodNumber.toString()
      });
      setEditingDatePeriod(null);
    } else {
      // Editing from weekly view
      setEditingClass({
        originalDepartment: department,
        originalSection: section,
        originalSemester: semester,
        originalDay: selectedDay,
        originalPeriodNumber: period.periodNumber.toString()
      });
      setEditingDatePeriod(null);
    }

    setIsEditMode(true);
    setShowAddModal(true);
  };

  // Function to toggle faculty block for today's schedule
  const toggleFacultyBlock = (facultyName: string) => {
    const today = formatDate(new Date());
    const updatedBlocks = { ...blockedFaculty };
    
    if (!updatedBlocks[facultyName]) {
      updatedBlocks[facultyName] = {};
    }
    
    // Toggle the block status for today
    updatedBlocks[facultyName][today] = !updatedBlocks[facultyName][today];
    
    // Save to appStorage
    appStorage.setItem('faculty_schedule_blocks', JSON.stringify(updatedBlocks));
    setBlockedFaculty(updatedBlocks);
    
    // Dispatch custom event so faculty dashboard can react
    window.dispatchEvent(new CustomEvent('facultyBlockUpdated', { 
      detail: { faculty: facultyName, date: today, blocked: updatedBlocks[facultyName][today] } 
    }));
    
    console.log(`[FacultyTimetable] Faculty ${facultyName} ${updatedBlocks[facultyName][today] ? 'blocked' : 'unblocked'} for ${today}`);
  };

  // Function to handle adding a new schedule in Today's Schedule view
  const handleAddScheduleForFaculty = (facultyName: string) => {
    // Get the day based on selected schedule day (today or tomorrow)
    const dateToUse = getSelectedScheduleDate();
    const dateStr = formatDate(dateToUse);
    const dayToUse = getDayName(dateToUse);

    if (dayToUse === 'Sun') {
      alert('Sunday is a holiday. Classes cannot be assigned.');
      return;
    }
    
    console.log(`[FacultyTimetable] handleAddScheduleForFaculty for ${facultyName} on ${dateStr} (${dayToUse})`);
    
    // Get existing schedule for this faculty on this day (DB only)
    const combinedSchedule = facultyTimetableData[facultyName]?.[dayToUse] || [];
    
    // Find the first available period number (1-7)
    let availablePeriod = 1;
    const usedPeriods = combinedSchedule.map(p => p.periodNumber);
    for (let i = 1; i <= 7; i++) {
      if (!usedPeriods.includes(i)) {
        availablePeriod = i;
        break;
      }
    }
    
    // Get period time based on period number
    const periodTimes = ['9:00-10:00', '10:00-11:00', '11:00-12:00', '11:30-12:30', '12:30-1:30', '1:30-2:30', '2:00-3:00'];
    const periodTime = periodTimes[availablePeriod - 1] || '9:00-10:00';
    
    // Set form data with defaults
    setAddFormData({
      department: 'BCA',
      semester: '1',
      section: 'B1',
      day: dayToUse,
      periodNumber: availablePeriod.toString(),
      time: periodTime,
      subject: '',
      room: '',
      class: ''
    });
    
    // Clear editing states
    setEditingClass(null);
    setEditingDatePeriod(null);
    setIsEditMode(false);
    
    // Update selected date state to match the schedule day
    setSelectedDate(dateStr);
    
    // Store the faculty for which we're adding
    setSelectedFaculty(facultyName);
    
    // Open modal
    setShowAddModal(true);
  };

  // Persist today's modal period into backend weekly timetable so it is visible in
  // weekly view and faculty dashboard (both read from backend timetable slots).
  const upsertBackendTimetableSlot = async (payload: {
    department: string;
    semester: string;
    section: string;
    day: string;
    periodNumber: string;
    subject: string;
    facultyName: string;
    time?: string;
    room?: string;
  }) => {
    const periodNumber = parseInt(payload.periodNumber, 10);
    if (!Number.isFinite(periodNumber)) return;

    const slotPayload = {
      day_of_week: payload.day,
      period_number: periodNumber,
      subject: payload.subject,
      faculty_name: payload.facultyName,
      time: payload.time || '',
      room: payload.room || '',
      course: payload.department,
      semester: payload.semester,
      section: payload.section,
    };

    try {
      const rows = await timetableAPI.getAll({
        course: payload.department,
        semester: payload.semester,
        section: payload.section,
      });
      const existing = (rows || []).find((row: any) => {
        const rowDay = String(row.day_of_week || '').slice(0, 3);
        return rowDay === payload.day && Number(row.period_number) === periodNumber;
      });
      if (existing?.id) {
        await timetableAPI.updateSlot(Number(existing.id), slotPayload);
      } else {
        await timetableAPI.createSlot(slotPayload);
      }
      window.dispatchEvent(new Event('timetableUpdated'));
    } catch (error) {
      console.error('Failed to sync today schedule into backend timetable slot', error);
    }
  };

  // Function to handle saving edits
  const handleSaveEdit = () => {
    if (!addFormData.subject || !addFormData.room || !editingClass) {
      alert('Please fill in all required fields (Subject and Room)');
      return;
    }

    console.log('[FacultyTimetable] handleSaveEdit called with:', {
      subject: addFormData.subject,
      room: addFormData.room,
      department: addFormData.department,
      section: addFormData.section,
      semester: addFormData.semester,
      day: addFormData.day,
      periodNumber: addFormData.periodNumber,
      faculty: selectedFaculty,
      editingClass
    });

    // Get timetable master data from appStorage
    const storedData = appStorage.getItem('timetable_master_data');
    let masterData: any = {};

    if (storedData) {
      try {
        masterData = JSON.parse(storedData);
      } catch (e) {
        console.error('Failed to parse timetable data', e);
      }
    }

    // Remove the old entry if department/section/semester/day/period changed
    const oldPath = masterData[editingClass.originalDepartment]?.[editingClass.originalSection]?.[editingClass.originalSemester]?.[editingClass.originalDay];
    if (oldPath) {
      const oldIndex = oldPath.findIndex((p: any) => p.periodNumber === parseInt(editingClass.originalPeriodNumber));
      if (oldIndex !== -1) {
        console.log('[FacultyTimetable] Removing old period from:', {
          department: editingClass.originalDepartment,
          section: editingClass.originalSection,
          semester: editingClass.originalSemester,
          day: editingClass.originalDay,
          periodNumber: editingClass.originalPeriodNumber
        });
        oldPath.splice(oldIndex, 1);
      }
    }

    // Ensure nested structure exists for new location
    if (!masterData[addFormData.department]) {
      masterData[addFormData.department] = {};
    }
    if (!masterData[addFormData.department][addFormData.section]) {
      masterData[addFormData.department][addFormData.section] = {};
    }
    if (!masterData[addFormData.department][addFormData.section][addFormData.semester]) {
      masterData[addFormData.department][addFormData.section][addFormData.semester] = {
        Mon: [],
        Tue: [],
        Wed: [],
        Thu: [],
        Fri: [],
        Sat: []
      };
    }

    const daySchedule = masterData[addFormData.department][addFormData.section][addFormData.semester][addFormData.day];

    // Check if period already exists at new location
    const existingPeriodIndex = daySchedule.findIndex((p: any) => p.periodNumber === parseInt(addFormData.periodNumber));

    const updatedPeriod = {
      periodNumber: parseInt(addFormData.periodNumber),
      subject: addFormData.subject,
      time: addFormData.time,
      faculty: selectedFaculty,
      room: addFormData.room
    };

    if (existingPeriodIndex !== -1) {
      // Replace existing period at new location
      console.log('[FacultyTimetable] Replacing existing period at new location');
      daySchedule[existingPeriodIndex] = updatedPeriod;
    } else {
      // Add to new location
      console.log('[FacultyTimetable] Adding period to new location');
      daySchedule.push(updatedPeriod);
      // Sort by period number
      daySchedule.sort((a: any, b: any) => a.periodNumber - b.periodNumber);
    }

    console.log('[FacultyTimetable] Saving to appStorage and broadcasting update');
    // Save to appStorage
    appStorage.setItem('timetable_master_data', JSON.stringify(masterData));

    // Broadcast update event
    console.log('[FacultyTimetable] Broadcasting timetableUpdated event');
    window.dispatchEvent(new CustomEvent('timetableUpdated', { detail: masterData }));
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'timetable_master_data',
      newValue: JSON.stringify(masterData),
      url: window.location.href,
      storageArea: appStorage
    }));
    console.log('[FacultyTimetable] Broadcast complete');

    // Reset form and close modal
    setAddFormData({
      department: 'BCA',
      semester: '1',
      section: 'B1',
      day: 'Mon',
      periodNumber: '1',
      time: '9:00-10:00',
      subject: '',
      room: '',
      class: ''
    });
    setIsEditMode(false);
    setEditingClass(null);
    setShowAddModal(false);

    // Show success message
    alert(`Successfully updated ${addFormData.subject}`);
  };

  // Function to handle saving edits to date-specific schedules
  const handleSaveDateScheduleEdit = async () => {
    handleSaveEdit();
  };

  // Function to delete a period from the timetable
  const handleDeletePeriod = (period: Period) => {
    // Confirm deletion
    const confirmDelete = window.confirm(`Are you sure you want to delete ${period.subject} from the timetable?`);
    if (!confirmDelete) return;

    console.log('[FacultyTimetable] handleDeletePeriod called for:', {
      subject: period.subject,
      periodNumber: period.periodNumber,
      class: period.class,
      day: selectedDay
    });

    // Parse the class string to extract department, section, and semester
    const classString = period.class;
    const parts = classString.split(' - Sem ');
    const semester = parts[1] || '1';
    const courseSectionParts = parts[0].split(' ');
    const department = courseSectionParts[0];
    const section = courseSectionParts[1];

    // Get timetable master data from appStorage
    const storedData = appStorage.getItem('timetable_master_data');
    let masterData: any = {};

    if (storedData) {
      try {
        masterData = JSON.parse(storedData);
      } catch (e) {
        console.error('Failed to parse timetable data', e);
        return;
      }
    }

    // Remove the period
    const dayPath = masterData[department]?.[section]?.[semester]?.[selectedDay];
    if (dayPath) {
      const periodIndex = dayPath.findIndex((p: any) => p.periodNumber === period.periodNumber);
      if (periodIndex !== -1) {
        console.log('[FacultyTimetable] Deleting period from:', {
          department,
          section,
          semester,
          day: selectedDay,
          periodNumber: period.periodNumber
        });
        dayPath.splice(periodIndex, 1);
        
        console.log('[FacultyTimetable] Saving to appStorage and broadcasting update');
        // Save to appStorage
        appStorage.setItem('timetable_master_data', JSON.stringify(masterData));

        // Broadcast update event
        console.log('[FacultyTimetable] Broadcasting timetableUpdated event');
        window.dispatchEvent(new CustomEvent('timetableUpdated', { detail: masterData }));
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'timetable_master_data',
          newValue: JSON.stringify(masterData),
          url: window.location.href,
          storageArea: appStorage
        }));
        console.log('[FacultyTimetable] Broadcast complete');

        // Show success message
        alert(`Successfully deleted ${period.subject}`);
      }
    }
  };

  // Function to add faculty to timetable
  const handleAddToTimetable = () => {
    if (!addFormData.subject || !addFormData.room) {
      alert('Please fill in all required fields (Subject and Room)');
      return;
    }

    console.log('[FacultyTimetable] handleAddToTimetable called with:', {
      department: addFormData.department,
      section: addFormData.section,
      semester: addFormData.semester,
      day: addFormData.day,
      periodNumber: addFormData.periodNumber,
      subject: addFormData.subject,
      room: addFormData.room,
      faculty: selectedFaculty
    });

    // Get timetable master data from appStorage
    const storedData = appStorage.getItem('timetable_master_data');
    let masterData: any = {};

    if (storedData) {
      try {
        masterData = JSON.parse(storedData);
      } catch (e) {
        console.error('Failed to parse timetable data', e);
      }
    }

    // Ensure nested structure exists
    if (!masterData[addFormData.department]) {
      masterData[addFormData.department] = {};
    }
    if (!masterData[addFormData.department][addFormData.section]) {
      masterData[addFormData.department][addFormData.section] = {};
    }
    if (!masterData[addFormData.department][addFormData.section][addFormData.semester]) {
      masterData[addFormData.department][addFormData.section][addFormData.semester] = {
        Mon: [],
        Tue: [],
        Wed: [],
        Thu: [],
        Fri: [],
        Sat: []
      };
    }

    const daySchedule = masterData[addFormData.department][addFormData.section][addFormData.semester][addFormData.day];

    // Check if period already exists
    const existingPeriodIndex = daySchedule.findIndex((p: any) => p.periodNumber === parseInt(addFormData.periodNumber));

    const newPeriod = {
      periodNumber: parseInt(addFormData.periodNumber),
      subject: addFormData.subject,
      time: addFormData.time,
      faculty: selectedFaculty,
      room: addFormData.room
    };

    if (existingPeriodIndex !== -1) {
      // Replace existing period
      console.log('[FacultyTimetable] Replacing existing period');
      daySchedule[existingPeriodIndex] = newPeriod;
    } else {
      // Add new period
      console.log('[FacultyTimetable] Adding new period');
      daySchedule.push(newPeriod);
      // Sort by period number
      daySchedule.sort((a: any, b: any) => a.periodNumber - b.periodNumber);
    }

    console.log('[FacultyTimetable] Saving to appStorage and broadcasting update');
    // Save to appStorage
    appStorage.setItem('timetable_master_data', JSON.stringify(masterData));

    // Broadcast update event
    console.log('[FacultyTimetable] Broadcasting timetableUpdated event');
    window.dispatchEvent(new CustomEvent('timetableUpdated', { detail: masterData }));
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'timetable_master_data',
      newValue: JSON.stringify(masterData),
      url: window.location.href,
      storageArea: appStorage
    }));
    console.log('[FacultyTimetable] Broadcast complete');

    // Reset form and close modal
    setAddFormData({
      department: 'BCA',
      semester: '1',
      section: 'B1',
      day: 'Mon',
      periodNumber: '1',
      time: '9:00-10:00',
      subject: '',
      room: '',
      class: ''
    });
    setShowAddModal(false);

    // Show success message
    alert(`Successfully added ${addFormData.subject} to ${addFormData.department} ${addFormData.section} - Sem ${addFormData.semester} on ${addFormData.day}`);
  };

  // Load date-specific schedules from appStorage when faculty changes
  useEffect(() => {
    if (selectedFaculty) {
      loadDateSpecificSchedules(selectedFaculty);
    }
  }, [selectedFaculty]);

  // Load blocked faculty data from appStorage
  useEffect(() => {
    const loadBlockedFaculty = () => {
      try {
        const blockedData = appStorage.getItem('faculty_schedule_blocks');
        if (blockedData) {
          setBlockedFaculty(JSON.parse(blockedData));
        }
      } catch (error) {
        console.error('Error loading blocked faculty data:', error);
      }
    };
    loadBlockedFaculty();
  }, []);

  // DB-only: no date-specific schedules from storage

  // Track the current date and reset schedule day when date changes
  useEffect(() => {
    // Store the current date when component mounts
    let currentDate = formatDate(new Date());
    
    // Reset to 'today' when component mounts or when switching to today's schedule view
    if (viewMode === 'today') {
      setSelectedScheduleDay('today');
    }
    
    // Check every minute if the date has changed (e.g., at midnight)
    const intervalId = setInterval(() => {
      const newDate = formatDate(new Date());
      if (newDate !== currentDate) {
        console.log(`[FacultyTimetable] Date changed from ${currentDate} to ${newDate}, resetting schedule view to today`);
        currentDate = newDate;
        // Reset to today when date changes
        if (viewMode === 'today') {
          setSelectedScheduleDay('today');
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [viewMode]);

  // Load date-specific schedules from appStorage
  const loadDateSpecificSchedules = (_faculty: string) => {
    setDateSpecificSchedules({});
  };

  // Use only backend weekly schedule for the selected date
  const getScheduleForDate = (): Period[] => {
    // Fall back to weekly recurring schedule
    const dayName = getDayName(new Date(selectedDate + 'T00:00:00'));
    return facultyTimetableData[selectedFaculty]?.[dayName] || [];
  };

  // Date-specific schedules are disabled in DB-only mode.
  const saveDatePeriod = () => {
    alert('Date-specific schedules are disabled.');
  };

  const deleteDatePeriod = (_period: Period) => {
    alert('Date-specific schedules are disabled.');
  };

  // Calendar generation helper
  const generateCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const calendarDays = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }
    
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = formatDate(date);
      const isToday = dateStr === formatDate(new Date());
      const isSelected = dateStr === selectedDate;
      
      calendarDays.push(
        <button
          key={dateStr}
          onClick={() => {
            setSelectedDate(dateStr);
            setShowCalendar(false);
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors text-sm ${
            isSelected ? 'bg-green-600 text-white font-semibold' : isToday ? 'bg-green-100 text-green-600 font-medium' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {day}
        </button>
      );
    }
    
    return calendarDays;
  };

  // Get faculty assignments from academic data
  const getFacultyAssignments = (): Array<{ department: string; semester: string; courseName: string }> => {
    const assignments: Array<{ department: string; semester: string; courseName: string }> = [];
    const academicDataStr = appStorage.getItem('academic_courses_data');
    
    if (academicDataStr) {
      try {
        const academicData = JSON.parse(academicDataStr);
        Object.keys(academicData).forEach(department => {
          Object.keys(academicData[department]).forEach(semester => {
            const courses = academicData[department][semester];
            courses.forEach((course: { id: string; courseName: string; facultyName: string }) => {
              if (course.facultyName === selectedFaculty) {
                assignments.push({
                  department,
                  semester,
                  courseName: course.courseName
                });
              }
            });
          });
        });
      } catch (e) {
        console.error('Failed to load academic assignments', e);
      }
    }
    
    return assignments;
  };

  // Function to download the full weekly timetable as a PDF
  const downloadTimetable = () => {
    const doc = new jsPDF('landscape');
    
    // Title
    doc.setFontSize(18);
    doc.text(`Weekly Teaching Schedule - ${selectedFaculty}`, 15, 15);
    
    doc.setFontSize(10);
    doc.text('Educational Institution', 15, 22);
    doc.text(`Generated on: ${getCurrentDate()}`, 15, 27);

    // Get faculty schedule
    const facultySchedule = facultyTimetableData[selectedFaculty];

    if (facultySchedule) {
      // Prepare table data
      const tableData: any[] = [];
      
      // Assuming 5 periods
      for (let periodNum = 1; periodNum <= 5; periodNum++) {
        const row: any[] = [`Period ${periodNum}`];
        
        days.forEach((day) => {
          const daySchedule = facultySchedule[day];
          const period = daySchedule?.find((p) => p.periodNumber === periodNum);
          
          if (period) {
            if (period.subject === 'Free Period' || period.subject === 'No Class') {
              row.push('-');
            } else {
              // Format: Subject\nClass | Room | Sem X
              row.push(
                `${period.subject}\n${period.class} | ${period.room} | Sem ${period.semester}`
              );
            }
          } else {
            row.push('-');
          }
        });
        
        tableData.push(row);
      }

      // Create table
      autoTable(doc, {
        head: [['Period/Day', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          cellWidth: 'wrap',
        },
        headStyles: {
          fillColor: [34, 197, 94], // Green color
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 25, fontStyle: 'bold', fillColor: [240, 253, 244] }, // Period column
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
      });
    }

    // Save the PDF
    doc.save(`${selectedFaculty.replace(/\s+/g, '_')}_Weekly_Timetable.pdf`);
  };

  // Alias for weekly timetable PDF download (used by the weekly view button)
  const handleDownloadWeeklyPDF = downloadTimetable;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 font-['Poppins',sans-serif] flex flex-col">
      {/* Top Header Bar with Back Button - Green Theme */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-sm">
        <div className="px-4 py-4 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h2 className="text-white">Faculty Teaching Schedule</h2>
          </div>
        </div>
      </div>

      {/* Content - Takes remaining height */}
      <div className="flex-1 flex flex-col px-4 py-4 overflow-hidden">
        {/* Info Banner */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 mb-4 flex items-start gap-3 flex-shrink-0">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Info className="w-3 h-3 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-blue-800 leading-relaxed">
              <span className="font-semibold">Bidirectional Sync:</span> Faculty teaching schedules sync with Timetable Management in real-time. 
              Changes made here automatically update student timetables, and vice versa. Edit periods directly from either section.
            </p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="bg-white rounded-2xl shadow-md p-2 mb-4 flex gap-2 flex-shrink-0">
          <button
            onClick={() => setViewMode('week')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all ${
              viewMode === 'week'
                ? 'bg-green-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Weekly Timetable</span>
          </button>
          <button
            onClick={() => setViewMode('today')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all ${
              viewMode === 'today'
                ? 'bg-green-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="font-medium">Today's Schedule</span>
          </button>
        </div>

        {/* Header Card - Always show faculty selector */}
        <div className="bg-white rounded-2xl p-4 shadow-md mb-4 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-gray-900 mb-1">
                {viewMode === 'week' ? 'Weekly Timetable' : 'Today\'s Schedule'}
              </h2>
              <p className="text-sm text-gray-500">
                {viewMode === 'week' ? 'View complete week schedule' : 'View and edit today\'s teaching schedule'}
              </p>
            </div>
          </div>

          {/* Faculty Dropdown */}
          <div>
            <label className="block text-xs text-gray-600 mb-2 font-medium flex items-center gap-1.5">
              <User className="w-4 h-4 text-green-600" />
              Select Faculty
            </label>
            {facultyList.length === 0 ? (
              <div className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-center">
                <p className="text-sm text-gray-500">No faculty members registered yet</p>
                <p className="text-xs text-gray-400 mt-1">Register faculty to view schedules</p>
              </div>
            ) : (
              <select
                value={selectedFaculty}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedFaculty(value);
                  if (viewMode === 'today') {
                    // Ensure dropdown selection takes precedence over card-based drilldown state.
                    setViewingIndividualFaculty(null);
                    if (value !== 'All') {
                      setSearchQuery('');
                    }
                  }
                }}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors bg-white"
              >
                {viewMode === 'today' ? (
                  <>
                    <option value="All">All Faculty</option>
                    {facultyList.map((faculty) => (
                      <option key={faculty} value={faculty}>
                        {faculty}
                      </option>
                    ))}
                  </>
                ) : (
                  <>
                    <option value="">-- Select Faculty --</option>
                    {facultyList.map((faculty) => (
                      <option key={faculty} value={faculty}>
                        {faculty}
                      </option>
                    ))}
                  </>
                )}
              </select>
            )}
          </div>
        </div>

        {/* Show Academic Management Assignments */}
        {facultyList.length > 0 && selectedFaculty && getFacultyAssignments().length > 0 && (
          <div className="mb-4 flex-shrink-0">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    Courses Assigned from Academic Management
                  </h3>
                  <p className="text-sm text-blue-700 mb-3">
                    {selectedFaculty} is assigned to teach the following courses. Schedule these in Timetable Management to add them to the weekly schedule below.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {getFacultyAssignments().map((assignment, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{assignment.courseName}</p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {assignment.department} - Semester {assignment.semester}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Show content only if faculty exists */}
        {facultyList.length > 0 && (
          <>
            {/* Weekly Timetable View */}
            {viewMode === 'week' && (
          <>
            {/* Download PDF Button */}
            <div className="mb-4 flex-shrink-0">
              <button
                onClick={handleDownloadWeeklyPDF}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span className="text-sm font-medium">Download Weekly Timetable PDF</span>
              </button>
            </div>

            {/* Weekly Timetable Grid */}
            <div className="flex-1 overflow-auto">
              {!facultyTimetableData[selectedFaculty] || Object.keys(facultyTimetableData[selectedFaculty] || {}).length === 0 ? (
                <div className="bg-white rounded-2xl shadow-md p-12 text-center">
                  <Calendar className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-gray-900 text-lg font-semibold mb-2">No Timetable Available</h3>
                  <p className="text-gray-500 text-sm">
                    No classes have been scheduled for {selectedFaculty} yet.
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    Classes assigned in Timetable Management will automatically appear here.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                  {/* Grid Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-green-600 to-emerald-600">
                        <th className="px-4 py-3 text-left text-white font-semibold border-r border-green-500 sticky left-0 bg-gradient-to-r from-green-600 to-emerald-600 z-10">
                          Period
                        </th>
                        {days.map((day) => (
                          <th key={day} className="px-4 py-3 text-center text-white font-semibold border-r border-green-500 min-w-[180px]">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5].map((periodNum) => (
                        <tr key={periodNum} className="border-b border-gray-200 hover:bg-green-50/30 transition-colors">
                          <td className="px-4 py-4 font-semibold text-gray-700 border-r border-gray-200 bg-green-50 sticky left-0 z-10">
                            Period {periodNum}
                          </td>
                          {days.map((day) => {
                            const daySchedule = facultyTimetableData[selectedFaculty]?.[day] || [];
                            const period = daySchedule.find(p => p.periodNumber === periodNum);
                            
                            return (
                              <td key={day} className="px-3 py-2 border-r border-gray-200 align-top">
                                {period ? (
                                  <div className="space-y-1.5">
                                    <p className="font-medium text-gray-900 text-sm leading-tight">
                                      {period.subject}
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                      <Clock className="w-3 h-3 text-green-600" />
                                      <span>{period.time}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs">
                                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                        {period.class}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs">
                                      <MapPin className="w-3 h-3 text-green-600" />
                                      <span className="text-gray-600">{period.room}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-6">
                                    <span className="text-gray-400 text-xs italic">Free Period</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </div>
          </>
        )}

        {/* Today's Schedule View */}
        {viewMode === 'today' && (
          <>
            {/* Day Selector: Today/Tomorrow */}
            <div className="mb-4 flex-shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedScheduleDay('today')}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    selectedScheduleDay === 'today'
                      ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white'
                      : 'bg-white text-gray-700 border-2 border-gray-200'
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span>Today</span>
                </button>
                <button
                  onClick={() => setSelectedScheduleDay('tomorrow')}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    selectedScheduleDay === 'tomorrow'
                      ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white'
                      : 'bg-white text-gray-700 border-2 border-gray-200'
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span>Tomorrow</span>
                </button>
              </div>
            </div>
          
            {/* Today's Date Display */}
            <div className="mb-4 flex-shrink-0">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-0.5">
                      {selectedScheduleDay === 'today' ? "Today's Schedule" : "Tomorrow's Schedule"}
                    </h3>
                    <p className="text-sm text-gray-600">{getSelectedScheduleDateFormatted()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar - Show when viewing all faculty or when viewing individual */}
            {(selectedFaculty === 'All' || viewingIndividualFaculty) && (
              <div className="mb-4 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search faculty by name..."
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors bg-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Back to All Faculty Button - Show when viewing individual faculty */}
            {viewingIndividualFaculty && (
              <div className="mb-4 flex-shrink-0">
                <button
                  onClick={() => {
                    setViewingIndividualFaculty(null);
                    setSearchQuery('');
                  }}
                  className="w-full px-4 py-2.5 rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 bg-gradient-to-br from-gray-500 to-gray-600 text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to All Faculty</span>
                </button>
              </div>
            )}

            {/* Add/Block/Unblock Controls - Only show when viewing individual faculty */}
            {viewingIndividualFaculty && (
              <div className="mb-4 flex-shrink-0">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddScheduleForFaculty(viewingIndividualFaculty)}
                    className="flex-1 px-4 py-3 rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 bg-gradient-to-br from-green-500 to-green-600 text-white"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Schedule</span>
                  </button>
                  <button
                    onClick={() => toggleFacultyBlock(viewingIndividualFaculty)}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      isFacultyBlockedToday(viewingIndividualFaculty)
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                        : 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                    }`}
                  >
                    {isFacultyBlockedToday(viewingIndividualFaculty) ? (
                      <>
                        <Unlock className="w-5 h-5" />
                        <span>Unblock</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-5 h-5" />
                        <span>Block</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Block Status Banner - Only show when viewing individual faculty */}
            {viewingIndividualFaculty && isFacultyBlockedToday(viewingIndividualFaculty) && (
              <div className="mb-4 flex-shrink-0">
                <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <Ban className="w-6 h-6 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900 mb-0.5">Faculty Blocked</h3>
                      <p className="text-sm text-red-700">
                        {viewingIndividualFaculty} is blocked from marking attendance for today. This prevents them from accessing the attendance marking feature in their dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Period Cards */}
            <div className="flex-1 flex flex-col gap-2.5 min-h-0 overflow-y-auto">
              {viewingIndividualFaculty ? (
                // Show individual faculty schedule
                !facultyTimetableData[viewingIndividualFaculty] || !facultyTimetableData[viewingIndividualFaculty][getDayName(getSelectedScheduleDate())] || facultyTimetableData[viewingIndividualFaculty][getDayName(getSelectedScheduleDate())].length === 0 ? (
                  <div className="bg-white rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center flex-1">
                    <Calendar className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-gray-900 mb-2">No Schedule Available</h3>
                    <p className="text-sm text-gray-500">
                      This faculty member has no scheduled classes {selectedScheduleDay === 'today' ? 'today' : 'tomorrow'}.
                    </p>
                  </div>
                ) : (
                  facultyTimetableData[viewingIndividualFaculty][getDayName(getSelectedScheduleDate())].map((period) => (
                    <div
                      key={period.periodNumber}
                      className={`rounded-xl p-3 shadow-sm flex items-center gap-3 ${
                        period.subject === 'Free Period' || period.subject === 'No Class'
                          ? 'bg-gray-100 border-2 border-dashed border-gray-300'
                          : 'bg-white'
                      }`}
                    >
                      {/* Period Number Badge */}
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
                          period.subject === 'Free Period' || period.subject === 'No Class'
                            ? 'bg-gray-300'
                            : 'bg-gradient-to-br from-green-600 to-emerald-600'
                        }`}
                      >
                        <span className="text-white font-semibold">{period.periodNumber}</span>
                      </div>

                      {/* Period Details */}
                      <div className="flex-1 min-w-0">
                        {/* Subject Name */}
                        <h3
                          className={`truncate mb-1 ${
                            period.subject === 'Free Period' || period.subject === 'No Class'
                              ? 'text-gray-500 italic'
                              : 'text-gray-900 font-semibold'
                          }`}
                        >
                          {period.subject}
                        </h3>

                        {/* Time */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                          <p className="text-xs text-gray-600 font-medium">{period.time}</p>
                        </div>

                        {/* Class and Room */}
                        {period.subject !== 'Free Period' && period.subject !== 'No Class' && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                              {period.class}
                            </span>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-600" />
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                {period.room}
                              </span>
                            </div>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                              Sem {period.semester}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Edit Button - Only show in admin portal */}
                      {period.subject !== 'Free Period' && period.subject !== 'No Class' && (
                        <button
                          onClick={() => handleEditClass(period)}
                          className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors active:scale-95"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                    </div>
                  ))
                )
              ) : selectedFaculty === 'All' ? (
                // Show all faculty schedules
                facultyList.length === 0 ? (
                  <div className="bg-white rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center flex-1">
                    <Calendar className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-gray-900 mb-2">No Faculty Available</h3>
                    <p className="text-sm text-gray-500">
                      No faculty members have been registered yet.
                    </p>
                  </div>
                ) : (
                  (() => {
                    // Filter faculty based on search query
                    const filteredFacultyList = searchQuery
                      ? facultyList.filter(faculty => 
                          faculty.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                      : facultyList;

                    if (filteredFacultyList.length === 0) {
                      return (
                        <div className="bg-white rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center flex-1">
                          <Search className="w-16 h-16 text-gray-300 mb-4" />
                          <h3 className="text-gray-900 mb-2">No Faculty Found</h3>
                          <p className="text-sm text-gray-500">
                            No faculty members match your search "{searchQuery}"
                          </p>
                        </div>
                      );
                    }

                    return filteredFacultyList.map((faculty) => {
                      const dateToUse = getSelectedScheduleDate();
                      const dayName = getDayName(dateToUse);
                      
                      const scheduleForDay = dayName === 'Sun'
                        ? []
                        : [...(facultyTimetableData[faculty]?.[dayName] || [])];
                      
                      // Sort by period number
                      scheduleForDay.sort((a, b) => a.periodNumber - b.periodNumber);
                      
                      const hasSchedule = scheduleForDay.length > 0;
                      
                      return (
                      <div key={faculty} className="bg-white rounded-2xl shadow-md p-4 border-2 border-gray-100">
                        {/* Faculty Header */}
                        <div className="mb-3 pb-3 border-b border-gray-200">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{faculty}</h3>
                              <p className="text-xs text-gray-500">
                                {hasSchedule ? `${scheduleForDay.length} ${scheduleForDay.length === 1 ? 'period' : 'periods'}` : `No classes ${selectedScheduleDay === 'today' ? 'today' : 'tomorrow'}`}
                              </p>
                            </div>
                            {isFacultyBlockedToday(faculty) && (
                              <div className="flex items-center gap-1.5 bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
                                <Ban className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">Blocked</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAddScheduleForFaculty(faculty)}
                              className="flex-1 px-3 py-2 rounded-lg font-medium text-xs shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 bg-gradient-to-br from-green-500 to-green-600 text-white"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Add</span>
                            </button>
                            <button
                              onClick={() => toggleFacultyBlock(faculty)}
                              className={`flex-1 px-3 py-2 rounded-lg font-medium text-xs shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                                isFacultyBlockedToday(faculty)
                                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                                  : 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                              }`}
                            >
                              {isFacultyBlockedToday(faculty) ? (
                                <>
                                  <Unlock className="w-4 h-4" />
                                  <span>Unblock</span>
                                </>
                              ) : (
                                <>
                                  <Ban className="w-4 h-4" />
                                  <span>Block</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => setViewingIndividualFaculty(faculty)}
                              className="flex-1 px-3 py-2 rounded-lg font-medium text-xs shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                            >
                              <Edit2 className="w-4 h-4" />
                              <span>View/Edit</span>
                            </button>
                          </div>
                        </div>

                        {/* Faculty Schedule */}
                        {!hasSchedule ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-400 italic">No scheduled classes</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {scheduleForDay.map((period) => (
                              <div
                                key={period.periodNumber}
                                className={`rounded-lg p-2.5 flex items-center gap-2.5 ${
                                  period.subject === 'Free Period' || period.subject === 'No Class'
                                    ? 'bg-gray-50 border border-dashed border-gray-300'
                                    : 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                                }`}
                              >
                                {/* Period Number Badge */}
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    period.subject === 'Free Period' || period.subject === 'No Class'
                                      ? 'bg-gray-300'
                                      : 'bg-gradient-to-br from-green-600 to-emerald-600'
                                  }`}
                                >
                                  <span className="text-white font-semibold text-sm">{period.periodNumber}</span>
                                </div>

                                {/* Period Details */}
                                <div className="flex-1 min-w-0">
                                  {/* Subject Name */}
                                  <h4
                                    className={`truncate text-sm mb-0.5 ${
                                      period.subject === 'Free Period' || period.subject === 'No Class'
                                        ? 'text-gray-500 italic'
                                        : 'text-gray-900 font-semibold'
                                    }`}
                                  >
                                    {period.subject}
                                  </h4>

                                  {/* Time */}
                                  <div className="flex items-center gap-1 mb-1">
                                    <Clock className="w-3 h-3 text-gray-600 flex-shrink-0" />
                                    <p className="text-xs text-gray-600">{period.time}</p>
                                  </div>

                                  {/* Class and Room */}
                                  {period.subject !== 'Free Period' && period.subject !== 'No Class' && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                                        {period.class}
                                      </span>
                                      <div className="flex items-center gap-0.5">
                                        <MapPin className="w-3 h-3 text-gray-600" />
                                        <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                                          {period.room}
                                        </span>
                                      </div>
                                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                        Sem {period.semester}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Edit Button */}
                                {period.subject !== 'Free Period' && period.subject !== 'No Class' && (
                                  <button
                                    onClick={() => handleEditClass(period, faculty)}
                                    className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors active:scale-95 flex-shrink-0"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                  })()
                )
              ) : (
                // Show one faculty selected directly from dropdown
                (() => {
                  const dateToUse = getSelectedScheduleDate();
                  const dayName = getDayName(dateToUse);
                  
                  const scheduleForDay = dayName === 'Sun'
                    ? []
                    : [...(facultyTimetableData[selectedFaculty]?.[dayName] || [])];
                  
                  scheduleForDay.sort((a, b) => a.periodNumber - b.periodNumber);
                  
                  if (scheduleForDay.length === 0) {
                    return (
                      <div className="bg-white rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center flex-1">
                        <Calendar className="w-16 h-16 text-gray-300 mb-4" />
                        <h3 className="text-gray-900 mb-2">No Schedule Available</h3>
                        <p className="text-sm text-gray-500">
                          This faculty member has no scheduled classes {selectedScheduleDay === 'today' ? 'today' : 'tomorrow'}.
                        </p>
                      </div>
                    );
                  }

                  return scheduleForDay.map((period) => (
                    <div
                      key={period.periodNumber}
                      className={`rounded-xl p-3 shadow-sm flex items-center gap-3 ${
                        period.subject === 'Free Period' || period.subject === 'No Class'
                          ? 'bg-gray-100 border-2 border-dashed border-gray-300'
                          : 'bg-white'
                      }`}
                    >
                      {/* Period Number Badge */}
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
                          period.subject === 'Free Period' || period.subject === 'No Class'
                            ? 'bg-gray-300'
                            : 'bg-gradient-to-br from-green-600 to-emerald-600'
                        }`}
                      >
                        <span className="text-white font-semibold">{period.periodNumber}</span>
                      </div>

                      {/* Period Details */}
                      <div className="flex-1 min-w-0">
                        {/* Subject Name */}
                        <h3
                          className={`truncate mb-1 ${
                            period.subject === 'Free Period' || period.subject === 'No Class'
                              ? 'text-gray-500 italic'
                              : 'text-gray-900 font-semibold'
                          }`}
                        >
                          {period.subject}
                        </h3>

                        {/* Time */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                          <p className="text-xs text-gray-600 font-medium">{period.time}</p>
                        </div>

                        {/* Class and Room */}
                        {period.subject !== 'Free Period' && period.subject !== 'No Class' && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                              {period.class}
                            </span>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-600" />
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                {period.room}
                              </span>
                            </div>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                              Sem {period.semester}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Edit Button - Only show in admin portal */}
                      {period.subject !== 'Free Period' && period.subject !== 'No Class' && (
                        <button
                          onClick={() => handleEditClass(period, selectedFaculty)}
                          className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors active:scale-95"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                    </div>
                  ));
                })()
              )}
            </div>
          </>
        )}
          </>
        )}
      </div>

      {/* Add/Edit Period Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-white font-semibold">
                {isEditMode ? 'Edit Period' : `Add Period for ${selectedFaculty}`}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setIsEditMode(false);
                  setEditingClass(null);
                  setEditingDatePeriod(null);
                  setAddFormData({
                    department: 'BCA',
                    semester: '1',
                    section: 'B1',
                    day: 'Mon',
                    periodNumber: '1',
                    time: '9:00-10:00',
                    subject: '',
                    room: '',
                    class: ''
                  });
                }}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {!isEditMode && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This period will only be added for <strong>{formatDisplayDate(selectedDate)}</strong> and won't affect the main weekly timetable.
                  </p>
                </div>
              )}
              
              {isEditMode && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-sm text-green-800">
                    <strong>Editing:</strong> Period {addFormData.periodNumber} - {addFormData.department} {addFormData.section} Sem {addFormData.semester}
                  </p>
                </div>
              )}

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course
                </label>
                <select
                  value={addFormData.department}
                  onChange={(e) => setAddFormData({ ...addFormData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="BCA">BCA</option>
                  <option value="BSc">BSc</option>
                  <option value="BCom">BCom</option>
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <select
                  value={addFormData.section}
                  onChange={(e) => setAddFormData({ ...addFormData, section: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {getSections(addFormData.department).map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester
                </label>
                <select
                  value={addFormData.semester}
                  onChange={(e) => setAddFormData({ ...addFormData, semester: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {[1, 2, 3, 4, 5, 6].map(sem => (
                    <option key={sem} value={sem.toString()}>Semester {sem}</option>
                  ))}
                </select>
              </div>

              {/* Period Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period Number
                </label>
                <select
                  value={addFormData.periodNumber}
                  onChange={(e) => setAddFormData({ ...addFormData, periodNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(num => (
                    <option key={num} value={num.toString()}>Period {num}</option>
                  ))}
                </select>
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <select
                  value={addFormData.time}
                  onChange={(e) => setAddFormData({ ...addFormData, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="9:00-10:00">9:00-10:00</option>
                  <option value="10:00-11:00">10:00-11:00</option>
                  <option value="11:00-12:00">11:00-12:00</option>
                  <option value="11:30-12:30">11:30-12:30</option>
                  <option value="12:30-1:30">12:30-1:30</option>
                  <option value="1:30-2:30">1:30-2:30</option>
                  <option value="2:00-3:00">2:00-3:00</option>
                  <option value="3:00-4:00">3:00-4:00</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={addFormData.subject}
                  onChange={(e) => setAddFormData({ ...addFormData, subject: e.target.value })}
                  placeholder="e.g., Data Structures"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Room */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room
                </label>
                <input
                  type="text"
                  value={addFormData.room}
                  onChange={(e) => setAddFormData({ ...addFormData, room: e.target.value })}
                  placeholder="e.g., Lab 101"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setIsEditMode(false);
                    setEditingClass(null);
                    setEditingDatePeriod(null);
                    setAddFormData({
                      department: 'BCA',
                      semester: '1',
                      section: 'B1',
                      day: 'Mon',
                      periodNumber: '1',
                      time: '9:00-10:00',
                      subject: '',
                      room: '',
                      class: ''
                    });
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (viewMode === 'today') {
                      const dayToUse = getDayName(getSelectedScheduleDate());
                      if (dayToUse === 'Sun') {
                        alert('Sunday is a holiday. Classes cannot be assigned.');
                        return;
                      }
                    }
                    if (isEditMode) {
                      handleSaveEdit();
                    } else {
                      // Set class string for date period
                      setAddFormData(prev => ({
                        ...prev,
                        class: `${prev.department} ${prev.section} - Sem ${prev.semester}`
                      }));
                      // We need to wait for state to update or pass it directly
                      const finalData = {
                        ...addFormData,
                        class: `${addFormData.department} ${addFormData.section} - Sem ${addFormData.semester}`
                      };
                      
                      await upsertBackendTimetableSlot({
                        department: finalData.department,
                        semester: finalData.semester,
                        section: finalData.section,
                        day: finalData.day,
                        periodNumber: finalData.periodNumber,
                        subject: finalData.subject,
                        facultyName: selectedFaculty,
                        time: finalData.time,
                        room: finalData.room,
                      });
                      
                      window.dispatchEvent(new Event('facultyScheduleUpdated'));
                      setShowAddModal(false);
                      alert(`Successfully added ${finalData.subject} for ${formatDisplayDate(selectedDate)}`);
                      void generateAllFacultyTimetables(); // Refresh
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-all active:scale-95"
                >
                  {isEditMode ? 'Update Period' : 'Add Period'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

