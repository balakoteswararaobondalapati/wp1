import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Users, UserCheck, UserX, FileText, Calendar, X, Briefcase, BookOpen, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { ProfileAvatar } from './ProfileAvatar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { attendanceAPI, studentsAPI, facultyStatusAPI } from '../api';

interface DailyAttendanceReportProps {
  onBack: () => void;
}

interface Student {
  id: number;
  name: string;
  regNo: string;
  class: string;
  section: string;
  year: string;
  status: 'present' | 'absent' | 'unmarked';
  periodDetails?: { // Add period details
    period: number;
    subject: string;
    status: 'present' | 'absent';
    takenBy: string;
    time: string;
  }[];
  presentPeriods?: number;
  totalPeriods?: number;
}

interface Faculty {
  id: number;
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  status: 'present' | 'absent';
}

const getTodayIsoDate = () => new Date().toISOString().split('T')[0];

const resolveDayStatus = (periodStatuses: Array<'present' | 'absent'>): 'present' | 'absent' | 'unmarked' => {
  if (periodStatuses.length === 0) return 'unmarked';
  let absentCount = 0;
  for (let periodNumber = 1; periodNumber <= 5; periodNumber += 1) {
    const statusForPeriod = periodStatuses[periodNumber - 1] || 'absent';
    if (statusForPeriod === 'absent') {
      absentCount += 1;
    }
  }
  return absentCount >= 3 ? 'absent' : 'present';
};

const buildStudentReportData = (
  allStudents: any[],
  attendanceRows: any[],
  dateValue: string,
): Student[] => {
  const rowsForDate = (attendanceRows || []).filter((record: any) => {
    const recordDate = typeof record.date === 'string' ? record.date.split('T')[0] : '';
    return recordDate === dateValue;
  });

  const studentAttendanceMap = new Map<string, {
    periods: Array<{
      period: number;
      subject: string;
      status: 'present' | 'absent';
      takenBy: string;
      time: string;
    }>;
    byPeriod: Map<number, 'present' | 'absent'>;
  }>();

  rowsForDate.forEach((record: any) => {
    const rollNumber = String(record.student_roll_number || record.rollNumber || '').trim();
    if (!rollNumber) return;

    if (!studentAttendanceMap.has(rollNumber)) {
      studentAttendanceMap.set(rollNumber, { periods: [], byPeriod: new Map() });
    }

    const bucket = studentAttendanceMap.get(rollNumber)!;
    const periodNumber = Number(record.period_number || record.period || 0);
    const status = record.status === 'present' ? 'present' : 'absent';
    if (periodNumber > 0) {
      bucket.byPeriod.set(periodNumber, status);
    }
    bucket.periods.push({
      period: periodNumber || bucket.periods.length + 1,
      subject: record.subject || 'N/A',
      status,
      takenBy: record.taken_by_name || record.takenBy || record.faculty_name || 'Faculty',
      time: record.created_at
        ? new Date(String(record.created_at)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : 'N/A',
    });
  });

  return (allStudents || []).map((student: any, index: number) => {
    const rollNumber = String(student.roll_number || student.register_number || student.rollNumber || student.regNo || '').trim();
    const attendanceData = studentAttendanceMap.get(rollNumber);
    const periodDetails = (attendanceData?.periods || []).sort((a, b) => a.period - b.period);
    const periodStatuses = Array.from({ length: 5 }, (_, index) => attendanceData?.byPeriod.get(index + 1) || 'absent');
    const status = attendanceData ? resolveDayStatus(periodStatuses) : 'unmarked';
    const presentPeriods = periodDetails.filter((period) => period.status === 'present').length;
    const totalPeriods = periodDetails.length;

    return {
      id: student.id || index + 1,
      name: student.name || 'Unknown Student',
      regNo: rollNumber,
      class: student.department || student.class || student.course || '',
      section: student.section || '',
      year: student.semester || student.year || '',
      status,
      periodDetails,
      presentPeriods,
      totalPeriods,
    };
  });
};

const loadStudentData = async (dateValue: string = getTodayIsoDate()): Promise<Student[]> => {
  try {
    const [allStudents, attendanceRows] = await Promise.all([
      studentsAPI.getAll(),
      attendanceAPI.getAll(),
    ]);
    return buildStudentReportData(allStudents, attendanceRows || [], dateValue);
  } catch (error) {
    console.error('Failed to load student attendance report from API:', error);
    return [];
  }
};

// Load faculty attendance data with period-based logic
const loadFacultyData = async (dateValue: string = getTodayIsoDate()): Promise<Faculty[]> => {
  try {
    const rows = await facultyStatusAPI.getByDate(dateValue);
    return (rows || []).map((record: any, index: number) => ({
      id: Number(record.faculty_id) || index + 1,
      name: record.faculty_name || 'Unknown Faculty',
      employeeId: record.employee_id || '',
      department: record.department || '',
      designation: record.designation || 'Faculty',
      status: String(record.status || '').toLowerCase() === 'present' ? 'present' : 'absent',
    }));
  } catch (error) {
    console.error('Failed to load faculty attendance report from API:', error);
    return [];
  }
};

export function DailyAttendanceReport({ onBack }: DailyAttendanceReportProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);
  
  // Auto-update date to today's date
  const today = new Date();
  const [selectedDate] = useState(today.toLocaleDateString('en-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }));
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [selectedHistoricalDate, setSelectedHistoricalDate] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Listen for attendance updates
  useEffect(() => {
    const refreshStudentData = async () => {
      const todayDate = getTodayIsoDate();
      const [studentData, facultyData] = await Promise.all([
        loadStudentData(todayDate),
        loadFacultyData(todayDate),
      ]);
      setStudents(studentData);
      setFaculty(facultyData);
    };

    const handleAttendanceUpdate = () => {
      void refreshStudentData();
    };
    
    void refreshStudentData();
    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);
    window.addEventListener('facultyAttendanceUpdated', handleAttendanceUpdate);
    window.addEventListener('faculty_updated', handleAttendanceUpdate);
    window.addEventListener('students_updated', handleAttendanceUpdate);
    window.addEventListener('studentRegistered', handleAttendanceUpdate);
    window.addEventListener('student_profile_updated', handleAttendanceUpdate);
    
    return () => {
      window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
      window.removeEventListener('facultyAttendanceUpdated', handleAttendanceUpdate);
      window.removeEventListener('faculty_updated', handleAttendanceUpdate);
      window.removeEventListener('students_updated', handleAttendanceUpdate);
      window.removeEventListener('studentRegistered', handleAttendanceUpdate);
      window.removeEventListener('student_profile_updated', handleAttendanceUpdate);
    };
  }, []);

  const totalStudents = students.length;
  const markedStudents = students.filter(s => s.status !== 'unmarked').length;
  const unmarkedStudents = students.filter(s => s.status === 'unmarked').length;
  const presentStudents = students.filter(s => s.status === 'present').length;
  const absentStudents = students.filter(s => s.status === 'absent').length;
  const attendancePercentage = markedStudents > 0 ? ((presentStudents / markedStudents) * 100).toFixed(1) : '0.0';

  const totalFaculty = faculty.length;
  const presentFaculty = faculty.filter(f => f.status === 'present').length;
  const absentFaculty = faculty.filter(f => f.status === 'absent').length;
  const facultyAttendancePercentage = totalFaculty > 0 ? ((presentFaculty / totalFaculty) * 100).toFixed(1) : '0.0';

  // Calendar helper functions
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const today = new Date();
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    
    // Don't allow going beyond current month
    if (nextYear > today.getFullYear() || (nextYear === today.getFullYear() && nextMonth > today.getMonth())) {
      return;
    }
    
    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
  };

  const handleDateClick = (day: number) => {
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedHistoricalDate(dateString);
  };

  const generateHistoricalCompletePDF = async () => {
    if (!selectedHistoricalDate) return;
    const historicalStudents = await loadStudentData(selectedHistoricalDate);
    const historicalTotalStudents = historicalStudents.length;
    const historicalMarkedStudents = historicalStudents.filter((s) => s.status !== 'unmarked').length;
    const historicalUnmarkedStudents = historicalStudents.filter((s) => s.status === 'unmarked').length;
    const historicalPresentStudents = historicalStudents.filter((s) => s.status === 'present').length;
    const historicalAbsentStudents = historicalStudents.filter((s) => s.status === 'absent').length;
    const historicalAttendancePercentage =
      historicalMarkedStudents > 0
        ? ((historicalPresentStudents / historicalMarkedStudents) * 100).toFixed(1)
        : '0.0';

    const doc = new jsPDF();
    const formattedDate = new Date(selectedHistoricalDate).toLocaleDateString('en-IN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Header
    doc.setFillColor(34, 139, 34);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('DAILY ATTENDANCE REPORT', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Complete Student Attendance', 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Date: ${formattedDate}`, 105, 32, { align: 'center' });
    
    let yPosition = 50;
    
    // Summary Statistics
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Attendance Summary', 14, yPosition);
    yPosition += 8;
    
    const summaryData = [
      ['Total Students', historicalTotalStudents.toString()],
      ['Marked Students', historicalMarkedStudents.toString()],
      ['Unmarked Students', historicalUnmarkedStudents.toString()],
      ['Present', historicalPresentStudents.toString()],
      ['Absent', historicalAbsentStudents.toString()],
      ['Attendance Percentage', historicalAttendancePercentage + '%']
    ];
    
    autoTable(doc, {
      startY: yPosition,
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [34, 139, 34] },
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // Present Students Section
    const presentStudentsList = historicalStudents.filter(s => s.status === 'present');
    const groupedPresent = groupBySection(presentStudentsList);
    const sortedPresentSections = Object.keys(groupedPresent).sort();
    
    if (sortedPresentSections.length > 0) {
      doc.setFillColor(34, 139, 34);
      doc.rect(14, yPosition - 5, 182, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(`PRESENT STUDENTS (${presentStudentsList.length})`, 105, yPosition, { align: 'center' });
      yPosition += 10;
      
      sortedPresentSections.forEach((sectionKey, index) => {
        const [cls, sec, year] = sectionKey.split('-');
        const sectionStudents = groupedPresent[sectionKey];
        
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Section Header
        doc.setTextColor(34, 139, 34);
        doc.setFontSize(11);
        doc.text(`${cls} - Section ${sec} - Year ${year} (${sectionStudents.length} students)`, 14, yPosition);
        yPosition += 5;
        
        // Table data
        const tableData = sectionStudents.map((student, idx) => [
          idx + 1,
          student.name,
          student.regNo,
          'Present'
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['S.No', 'Student Name', 'Reg No', 'Status']],
          body: tableData,
          theme: 'striped',
          headStyles: { 
            fillColor: [34, 139, 34],
            textColor: [255, 255, 255],
            fontSize: 9,
          },
          styles: { fontSize: 8, cellPadding: 2 },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          margin: { left: 14, right: 14 },
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 8;
      });
    }
    
    // Absent Students Section
    const absentStudentsList = historicalStudents.filter(s => s.status === 'absent');
    const groupedAbsent = groupBySection(absentStudentsList);
    const sortedAbsentSections = Object.keys(groupedAbsent).sort();
    
    if (sortedAbsentSections.length > 0) {
      // Check if we need a new page
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFillColor(220, 53, 69);
      doc.rect(14, yPosition - 5, 182, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(`ABSENT STUDENTS (${absentStudentsList.length})`, 105, yPosition, { align: 'center' });
      yPosition += 10;
      
      sortedAbsentSections.forEach((sectionKey, index) => {
        const [cls, sec, year] = sectionKey.split('-');
        const sectionStudents = groupedAbsent[sectionKey];
        
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Section Header
        doc.setTextColor(220, 53, 69);
        doc.setFontSize(11);
        doc.text(`${cls} - Section ${sec} - Year ${year} (${sectionStudents.length} students)`, 14, yPosition);
        yPosition += 5;
        
        // Table data
        const tableData = sectionStudents.map((student, idx) => [
          idx + 1,
          student.name,
          student.regNo,
          'Absent'
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['S.No', 'Student Name', 'Reg No', 'Status']],
          body: tableData,
          theme: 'striped',
          headStyles: { 
            fillColor: [220, 53, 69],
            textColor: [255, 255, 255],
            fontSize: 9,
          },
          styles: { fontSize: 8, cellPadding: 2 },
          alternateRowStyles: { fillColor: [254, 242, 242] },
          margin: { left: 14, right: 14 },
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 8;
      });
    }
    
    // Save PDF
    doc.save(`complete-attendance-${selectedHistoricalDate}.pdf`);
    setShowCalendarPopup(false);
    setSelectedHistoricalDate('');
  };

  // Generate complete PDF for students (both present and absent)
  const generateCompletePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(34, 139, 34);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('DAILY ATTENDANCE REPORT', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Complete Student Attendance', 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Date: ${selectedDate}`, 105, 32, { align: 'center' });
    
    let yPosition = 50;
    
    // Summary Statistics
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Attendance Summary', 14, yPosition);
    yPosition += 8;
    
    const summaryData = [
      ['Total Students', totalStudents.toString()],
      ['Marked Students', markedStudents.toString()],
      ['Unmarked Students', unmarkedStudents.toString()],
      ['Present', presentStudents.toString()],
      ['Absent', absentStudents.toString()],
      ['Attendance Percentage', attendancePercentage + '%']
    ];
    
    autoTable(doc, {
      startY: yPosition,
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [34, 139, 34] },
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // Present Students Section
    const presentStudentsList = students.filter(s => s.status === 'present');
    const groupedPresent = groupBySection(presentStudentsList);
    const sortedPresentSections = Object.keys(groupedPresent).sort();
    
    if (sortedPresentSections.length > 0) {
      doc.setFillColor(34, 139, 34);
      doc.rect(14, yPosition - 5, 182, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(`PRESENT STUDENTS (${presentStudentsList.length})`, 105, yPosition, { align: 'center' });
      yPosition += 10;
      
      sortedPresentSections.forEach((sectionKey, index) => {
        const [cls, sec, year] = sectionKey.split('-');
        const sectionStudents = groupedPresent[sectionKey];
        
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Section Header
        doc.setTextColor(34, 139, 34);
        doc.setFontSize(11);
        doc.text(`${cls} - Section ${sec} - Year ${year} (${sectionStudents.length} students)`, 14, yPosition);
        yPosition += 5;
        
        // Table data
        const tableData = sectionStudents.map((student, idx) => [
          idx + 1,
          student.name,
          student.regNo,
          'Present'
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['S.No', 'Student Name', 'Reg No', 'Status']],
          body: tableData,
          theme: 'striped',
          headStyles: { 
            fillColor: [34, 139, 34],
            textColor: [255, 255, 255],
            fontSize: 9,
          },
          styles: { fontSize: 8, cellPadding: 2 },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          margin: { left: 14, right: 14 },
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 8;
      });
    }
    
    // Absent Students Section
    const absentStudentsList = students.filter(s => s.status === 'absent');
    const groupedAbsent = groupBySection(absentStudentsList);
    const sortedAbsentSections = Object.keys(groupedAbsent).sort();
    
    if (sortedAbsentSections.length > 0) {
      // Check if we need a new page
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFillColor(220, 53, 69);
      doc.rect(14, yPosition - 5, 182, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(`ABSENT STUDENTS (${absentStudentsList.length})`, 105, yPosition, { align: 'center' });
      yPosition += 10;
      
      sortedAbsentSections.forEach((sectionKey, index) => {
        const [cls, sec, year] = sectionKey.split('-');
        const sectionStudents = groupedAbsent[sectionKey];
        
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Section Header
        doc.setTextColor(220, 53, 69);
        doc.setFontSize(11);
        doc.text(`${cls} - Section ${sec} - Year ${year} (${sectionStudents.length} students)`, 14, yPosition);
        yPosition += 5;
        
        // Table data
        const tableData = sectionStudents.map((student, idx) => [
          idx + 1,
          student.name,
          student.regNo,
          'Absent'
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['S.No', 'Student Name', 'Reg No', 'Status']],
          body: tableData,
          theme: 'striped',
          headStyles: { 
            fillColor: [220, 53, 69],
            textColor: [255, 255, 255],
            fontSize: 9,
          },
          styles: { fontSize: 8, cellPadding: 2 },
          alternateRowStyles: { fillColor: [254, 242, 242] },
          margin: { left: 14, right: 14 },
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 8;
      });
    }
    
    // Save PDF
    doc.save(`complete-attendance-${new Date().toISOString().split('T')[0]}.pdf`);
  };





  // Group students by section
  const groupBySection = (studentList: Student[]) => {
    const grouped: { [key: string]: Student[] } = {};
    studentList.forEach(student => {
      const sectionKey = `${student.class}-${student.section}-${student.year}`;
      if (!grouped[sectionKey]) {
        grouped[sectionKey] = [];
      }
      grouped[sectionKey].push(student);
    });
    return grouped;
  };

  // Group faculty by department
  const groupByDepartment = (facultyList: Faculty[]) => {
    const grouped: { [key: string]: Faculty[] } = {};
    facultyList.forEach(fac => {
      const dept = fac.department || 'Other';
      if (!grouped[dept]) {
        grouped[dept] = [];
      }
      grouped[dept].push(fac);
    });
    return grouped;
  };

  // Generate PDF for faculty
  const generateFacultyPDF = (type: 'absent' | 'present') => {
    const filteredFaculty = faculty.filter(f => f.status === type);
    const groupedFaculty = groupByDepartment(filteredFaculty);
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(34, 139, 34); // Green color
    doc.text('Educational Institution', 105, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Faculty ${type.charAt(0).toUpperCase() + type.slice(1)} Report`, 105, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Date: ${selectedDate}`, 105, 32, { align: 'center' });
    doc.text(`Total ${type.charAt(0).toUpperCase() + type.slice(1)}: ${filteredFaculty.length}`, 105, 38, { align: 'center' });
    
    let yPosition = 45;
    
    // Sort departments for organized display
    const sortedDepts = Object.keys(groupedFaculty).sort();
    
    sortedDepts.forEach((dept, index) => {
      const deptFaculty = groupedFaculty[dept];
      
      // Department Header
      doc.setFontSize(12);
      doc.setTextColor(34, 139, 34);
      doc.text(`${dept} Department (${deptFaculty.length} faculty)`, 14, yPosition);
      yPosition += 5;
      
      // Table data
      const tableData = deptFaculty.map((fac, idx) => [
        idx + 1,
        fac.name,
        fac.employeeId,
        fac.designation,
        fac.department,
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['S.No', 'Faculty Name', 'Employee ID', 'Designation', 'Department']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: type === 'present' ? [34, 139, 34] : [220, 53, 69],
          textColor: [255, 255, 255],
          fontSize: 10,
        },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 14, right: 14 },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 10;
      
      // Add new page if needed (except for last department)
      if (index < sortedDepts.length - 1 && yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
    });
    
    // Save PDF
    doc.save(`${type}-faculty-${new Date().toISOString().split('T')[0]}.pdf`);
  };



  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white font-['Poppins',sans-serif]">
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
            <h2 className="text-white">Daily Attendance Report</h2>
            <p className="text-white/80 text-sm">{selectedDate}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Student Attendance Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Student Attendance Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Marked Students */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-700">Marked Students</p>
                  <p className="text-2xl font-bold text-blue-900">{markedStudents}</p>
                </div>
              </div>
            </div>

            {/* Present Students */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border-2 border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-green-700">Present</p>
                  <p className="text-2xl font-bold text-green-900">{presentStudents}</p>
                </div>
              </div>
            </div>

            {/* Absent Students */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border-2 border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                  <UserX className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-red-700">Absent</p>
                  <p className="text-2xl font-bold text-red-900">{absentStudents}</p>
                </div>
              </div>
            </div>

            {/* Student Attendance % */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border-2 border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-emerald-700">Attendance</p>
                  <p className="text-2xl font-bold text-emerald-900">{attendancePercentage}%</p>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            {totalStudents} registered students • {markedStudents} marked • {unmarkedStudents} unmarked
          </p>
        </div>

        {/* Detailed Student Attendance List */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Today's Student Attendance Records
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Period-by-period attendance taken by faculty. Click on any student to view detailed period attendance.
          </p>

          {/* Students with attendance records today */}
          {students.filter(s => s.totalPeriods && s.totalPeriods > 0).length > 0 ? (
            <div className="space-y-3">
              {students
                .filter(s => s.totalPeriods && s.totalPeriods > 0)
                .sort((a, b) => b.presentPeriods! - a.presentPeriods!)
                .map((student, index) => (
                  <div
                    key={student.id}
                    className={`border-2 rounded-xl overflow-hidden transition-all ${
                      student.status === 'present'
                        ? 'border-green-200 bg-green-50/50'
                        : 'border-red-200 bg-red-50/50'
                    }`}
                  >
                    {/* Student Row */}
                    <button
                      onClick={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
                      className="w-full p-4 flex items-center gap-4 hover:bg-white/50 transition-colors"
                    >
                      {/* Avatar */}
                      <ProfileAvatar
                        userName={student.name}
                        size="md"
                        themeColor="blue"
                      />

                      {/* Student Info */}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{student.name}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            student.status === 'present'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {student.status === 'present' ? 'Present' : 'Absent'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="font-mono">{student.regNo}</span>
                          <span>•</span>
                          <span>{student.class} - Sec {student.section}</span>
                          <span>•</span>
                          <span>Sem {student.year}</span>
                        </div>
                      </div>

                      {/* Attendance Stats */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Today's Attendance</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {student.presentPeriods}/{student.totalPeriods}
                          </p>
                          <p className="text-xs text-gray-500">
                            {((student.presentPeriods! / student.totalPeriods!) * 100).toFixed(0)}% periods
                          </p>
                        </div>

                        {/* Expand Icon */}
                        {expandedStudent === student.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Period Details */}
                    {expandedStudent === student.id && student.periodDetails && student.periodDetails.length > 0 && (
                      <div className="border-t-2 border-gray-200 bg-white p-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          Period-wise Attendance Details
                        </h4>
                        <div className="space-y-2">
                          {student.periodDetails.map((period, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-3 rounded-lg ${
                                period.status === 'present'
                                  ? 'bg-green-50 border border-green-200'
                                  : 'bg-red-50 border border-red-200'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                                  period.status === 'present'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-red-500 text-white'
                                }`}>
                                  P{period.period}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{period.subject}</p>
                                  <p className="text-xs text-gray-600">Taken by: {period.takenBy}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                                  period.status === 'present'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-red-500 text-white'
                                }`}>
                                  {period.status === 'present' ? '✓ Present' : '✗ Absent'}
                                </span>
                                <p className="text-xs text-gray-500 mt-1">{period.time}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No attendance records for today yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Attendance records will appear here once faculty start taking attendance
              </p>
            </div>
          )}
        </div>

        {/* Download Buttons */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            Download Student Report
          </h3>
          <div className="space-y-4">
            {/* Complete Student Attendance Report */}
            <div className="space-y-2">
              <p className="font-semibold text-gray-900">Complete Student Attendance Report</p>
              <p className="text-sm text-gray-600">
                {markedStudents} marked • {presentStudents} present • {absentStudents} absent • {unmarkedStudents} unmarked • Grouped by semester
              </p>
              <button
                onClick={generateCompletePDF}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* Historical Attendance Calendar */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              Past Days Attendance
            </h3>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedHistoricalDate}
                max={getTodayIsoDate()}
                onChange={(e) => setSelectedHistoricalDate(e.target.value)}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
              />
              <button
                onClick={() => setShowCalendarPopup(true)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Select Date
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Click on "Select Date" to view and download attendance reports from previous days
          </p>
          {selectedHistoricalDate && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-gray-600 mb-2">Selected Past Date</p>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-gray-900">
                  {new Date(selectedHistoricalDate).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <button
                  onClick={generateHistoricalCompletePDF}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-xl transition-all active:scale-98 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Popup Modal */}
      {showCalendarPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl sticky top-0">
              <div className="flex items-center justify-between">
                <h3 className="text-white text-xl font-semibold">Select Date</h3>
                <button
                  onClick={() => {
                    setShowCalendarPopup(false);
                    setSelectedHistoricalDate('');
                  }}
                  className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Calendar */}
            <div className="p-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={handlePreviousMonth}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  ← Prev
                </button>
                <h4 className="text-lg font-semibold text-gray-900">
                  {monthNames[currentMonth]} {currentYear}
                </h4>
                <button
                  onClick={handleNextMonth}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    currentYear === new Date().getFullYear() &&
                    currentMonth === new Date().getMonth()
                  }
                >
                  Next →
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
                
                {/* Empty cells for days before month starts */}
                {Array.from({ length: getFirstDayOfMonth(currentMonth, currentYear) }).map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square" />
                ))}
                
                {/* Calendar days */}
                {Array.from({ length: getDaysInMonth(currentMonth, currentYear) }).map((_, index) => {
                  const day = index + 1;
                  const dateObj = new Date(currentYear, currentMonth, day);
                  const today = new Date();
                  const isToday = dateObj.toDateString() === today.toDateString();
                  const isFuture = dateObj > today;
                  const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = selectedHistoricalDate === dateString;
                  
                  return (
                    <button
                      key={day}
                      onClick={() => !isFuture && handleDateClick(day)}
                      disabled={isFuture}
                      className={`aspect-square rounded-lg flex items-center justify-center transition-all ${
                        isFuture
                          ? 'text-gray-300 cursor-not-allowed'
                          : isSelected
                          ? 'bg-green-500 text-white font-bold shadow-lg scale-110'
                          : isToday
                          ? 'bg-blue-100 text-blue-600 font-semibold hover:bg-blue-200'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Selected Date Info */}
              {selectedHistoricalDate && (
                <div className="bg-green-50 rounded-xl p-4 mb-4 border-2 border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Selected Date:</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(selectedHistoricalDate).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}

              {/* Download Buttons */}
              {selectedHistoricalDate && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Complete Student Attendance Report</p>
                    <button
                      onClick={generateHistoricalCompletePDF}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-xl transition-all active:scale-98 flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                  </div>
                </div>
              )}

              {!selectedHistoricalDate && (
                <div className="text-center text-sm text-gray-500">
                  Click on a date to download attendance report
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

