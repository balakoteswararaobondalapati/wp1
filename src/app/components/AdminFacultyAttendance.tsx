
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Download, CheckCircle, XCircle, Clock, FileText, Users, TrendingUp, Edit2, X, Plus, AlertCircle, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COURSES, SEMESTERS, COURSE_SECTIONS } from '@/constants/departments';
import { facultyAPI, facultyStatusAPI } from '../api';

interface AdminFacultyAttendanceProps {
  onBack: () => void;
}

interface FacultyMember {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  email: string;
  phone: string;
}

interface AttendanceRecord {
  facultyId: string;
  status: 'present' | 'leave' | null;
  remarks?: string;
}

interface DailySubstitution {
  id: string;
  date: string;
  absentFacultyId: string;
  absentFacultyName: string;
  substituteFacultyId: string;
  substituteFacultyName: string;
  course: string;
  semester: string;
  section: string;
  period: string;
}

interface DailyAttendanceReport {
  date: string;
  totalFaculty: number;
  present: number;
  onLeave: number;
  percentage: number;
  records: {
    name: string;
    employeeId: string;
    department: string;
    status: string;
    remarks?: string;
  }[];
}

interface MonthlyReport {
  facultyId: string;
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  totalDays: number;
  presentDays: number;
  leaveDays: number;
  attendancePercentage: number;
}

export function AdminFacultyAttendance({ onBack }: AdminFacultyAttendanceProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDailyReport, setShowDailyReport] = useState(false);
  const [dailyReport, setDailyReport] = useState<DailyAttendanceReport | null>(null);
  const [showMonthlyReports, setShowMonthlyReports] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [monthlyStatusRows, setMonthlyStatusRows] = useState<any[]>([]);
  const [facultyMembers, setFacultyMembers] = useState<FacultyMember[]>([]);
  const [substitutions, setSubstitutions] = useState<DailySubstitution[]>([]);
  const [substitutionsByDate, setSubstitutionsByDate] = useState<Record<string, DailySubstitution[]>>({});
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [selectedAbsentFaculty, setSelectedAbsentFaculty] = useState<FacultyMember | null>(null);
  const [substitutionForm, setSubstitutionForm] = useState({
    substituteId: '',
    course: '',
    semester: '',
    section: '',
    period: ''
  });

  const loadExistingAttendanceForDate = async (dateValue: string) => {
    try {
      const rows = await facultyStatusAPI.getByDate(dateValue);
      const dateRecords = (rows || []).filter((r: any) => String(r.date_value || '').startsWith(dateValue));

      if (dateRecords.length > 0) {
        const recordsMap = new Map<string, AttendanceRecord>();
        dateRecords.forEach((record: any) => {
          const statusRaw = String(record.status || '').toLowerCase();
          const uiStatus: 'present' | 'leave' =
            statusRaw === 'leave' || statusRaw === 'absent' || statusRaw === 'blocked' ? 'leave' : 'present';
          recordsMap.set(String(record.faculty_id), {
            facultyId: String(record.faculty_id),
            status: uiStatus,
            remarks: record.reason || '',
          });
        });
        setAttendanceRecords(recordsMap);
        setIsSubmitted(true);
        setIsEditMode(false);
      } else {
        setAttendanceRecords(new Map());
        setIsSubmitted(false);
        setIsEditMode(false);
      }
    } catch (error) {
      console.error('Error loading existing attendance:', error);
      setAttendanceRecords(new Map());
      setIsSubmitted(false);
      setIsEditMode(false);
    }
  };

  // Load faculty data from backend
  useEffect(() => {
    const loadData = async () => {
      try {
        const rows = await facultyAPI.getAll();
        const facultyData: FacultyMember[] = (rows || []).map((faculty: any) => ({
          id: String(faculty.id),
          name: faculty.name || faculty.full_name || '',
          employeeId: faculty.employee_id || '',
          department: faculty.department || '',
          designation: faculty.designation || 'Faculty',
          email: faculty.email || '',
          phone: faculty.phone || '',
        }));
        setFacultyMembers(facultyData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    void loadData();
  }, []);

  useEffect(() => {
    setSubstitutions(substitutionsByDate[selectedDate] || []);
  }, [selectedDate, substitutionsByDate]);

  // Check if attendance for selected date already exists and load it
  useEffect(() => {
    void loadExistingAttendanceForDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const loadMonthlyStatus = async () => {
      try {
        const monthSource = selectedMonth || new Date().toISOString().slice(0, 7);
        const [yearStr, monthStr] = monthSource.split('-');
        const rows = await facultyStatusAPI.monthly(Number(monthStr), Number(yearStr));
        setMonthlyStatusRows(rows || []);
      } catch (error) {
        console.error('Error loading monthly faculty status:', error);
        setMonthlyStatusRows([]);
      }
    };

    if (showMonthlyReports) {
      void loadMonthlyStatus();
    }
  }, [showMonthlyReports, selectedMonth]);

  const handleAttendanceChange = (facultyId: string, status: 'present' | 'leave') => {
    const newRecords = new Map(attendanceRecords);
    newRecords.set(facultyId, { facultyId, status });
    setAttendanceRecords(newRecords);
  };

  const handleRemarksChange = (facultyId: string, remarks: string) => {
    const newRecords = new Map(attendanceRecords);
    const existing = newRecords.get(facultyId) || { facultyId, status: null };
    newRecords.set(facultyId, { ...existing, remarks });
    setAttendanceRecords(newRecords);
  };

  const handleAddSubstitution = () => {
    if (!selectedAbsentFaculty || !substitutionForm.substituteId || !substitutionForm.course || !substitutionForm.semester || !substitutionForm.section || !substitutionForm.period) {
      alert('Please fill in all substitution details');
      return;
    }

    const substitute = facultyMembers.find(f => f.id === substitutionForm.substituteId);
    if (!substitute) return;

    const newSubstitution: DailySubstitution = {
      id: `SUB${Date.now()}`,
      date: selectedDate,
      absentFacultyId: selectedAbsentFaculty.id,
      absentFacultyName: selectedAbsentFaculty.name,
      substituteFacultyId: substitute.id,
      substituteFacultyName: substitute.name,
      course: substitutionForm.course,
      semester: substitutionForm.semester,
      section: substitutionForm.section,
      period: substitutionForm.period
    };

    const updated = [...(substitutionsByDate[selectedDate] || []), newSubstitution];
    setSubstitutionsByDate((prev) => ({ ...prev, [selectedDate]: updated }));
    setSubstitutions(updated);
    setShowSubstitutionModal(false);
    setSubstitutionForm({ substituteId: '', course: '', semester: '', section: '', period: '' });

    // Keep existing event behavior for UI refresh flows.
    window.dispatchEvent(new Event('substitutionsUpdated'));
    window.dispatchEvent(new Event('timetableUpdated'));
  };

  const handleDeleteSubstitution = (id: string) => {
    const updated = (substitutionsByDate[selectedDate] || []).filter((s) => s.id !== id);
    setSubstitutionsByDate((prev) => ({ ...prev, [selectedDate]: updated }));
    setSubstitutions(updated);

    window.dispatchEvent(new Event('substitutionsUpdated'));
    window.dispatchEvent(new Event('timetableUpdated'));
  };

  const handleSubmitAttendance = async () => {
    // Calculate statistics
    let present = 0;
    let onLeave = 0;

    const reportRecords = facultyMembers.map(faculty => {
      const record = attendanceRecords.get(faculty.id);
      const status = record?.status || 'not_marked';
      
      if (status === 'present') present++;
      else if (status === 'leave') onLeave++;

      return {
        name: faculty.name,
        employeeId: faculty.employeeId,
        department: faculty.department,
        status: status === 'not_marked' ? 'Not Marked' : status.charAt(0).toUpperCase() + status.slice(1),
        remarks: record?.remarks
      };
    });

    const total = facultyMembers.length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';

    const report: DailyAttendanceReport = {
      date: selectedDate,
      totalFaculty: total,
      present,
      onLeave,
      percentage: parseFloat(percentage),
      records: reportRecords
    };

    // Persist attendance to DB faculty-status table.
    try {
      await Promise.all(
        facultyMembers.map((faculty) => {
          const record = attendanceRecords.get(faculty.id);
          const status = record?.status || 'absent';
          return facultyStatusAPI.setStatus({
            faculty_id: Number(faculty.id),
            date_value: selectedDate,
            status,
            reason: record?.remarks || null,
          });
        }),
      );

      window.dispatchEvent(new Event('facultyAttendanceUpdated'));
      window.dispatchEvent(new Event('attendanceUpdated'));
      window.dispatchEvent(new CustomEvent('facultyBlockUpdated', { detail: { date: selectedDate } }));
    } catch (error) {
      console.error('Error saving attendance:', error);
    }

    setDailyReport(report);
    setIsSubmitted(true);
    setShowDailyReport(true);
  };

  const handleDownloadDailyReport = () => {
    if (!dailyReport) return;

    const doc = new jsPDF();
    const dateStr = new Date(dailyReport.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // Header
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('DAILY ATTENDANCE REPORT', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Faculty Members', 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text(dateStr, 105, 32, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Summary Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics', 14, 50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const summaryData = [
      ['Total Faculty:', dailyReport.totalFaculty.toString()],
      ['Present:', dailyReport.present.toString()],
      ['On Leave:', dailyReport.onLeave.toString()],
      ['Attendance Percentage:', dailyReport.percentage + '%']
    ];
    
    let yPos = 58;
    summaryData.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 70, yPos);
      yPos += 7;
    });
    
    // Detailed Attendance Table
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Attendance', 14, yPos);
    yPos += 5;
    
    const tableData = dailyReport.records.map(r => [
      r.employeeId,
      r.name,
      r.department.substring(0, 10),
      r.status,
      r.remarks || '-'
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Emp ID', 'Name', 'Department', 'Status', 'Remarks']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 45 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 50 }
      },
      didDrawCell: (data: any) => {
        // Color code status cells
        if (data.column.index === 3 && data.section === 'body') {
          const status = data.cell.raw;
          if (status === 'Present') {
            doc.setFillColor(220, 252, 231);
          } else if (status === 'Leave') {
            doc.setFillColor(219, 234, 254);
          }
        }
      }
    });
    
    // Footer
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });
    
    // Save PDF
    doc.save(`Faculty_Attendance_${dailyReport.date}.pdf`);
  };

  const generateMonthlyReports = (): MonthlyReport[] => {
    return facultyMembers.map((faculty) => {
      const rows = monthlyStatusRows.filter((r: any) => Number(r.faculty_id) === Number(faculty.id));
      const presentDays = rows
        .filter((r: any) => {
          const status = String(r.status || '').toLowerCase();
          return status === 'present' || status === 'available' || status === 'active';
        })
        .reduce((sum: number, r: any) => sum + Number(r.days_count || 0), 0);
      const leaveDays = rows
        .filter((r: any) => {
          const status = String(r.status || '').toLowerCase();
          return status === 'leave' || status === 'absent' || status === 'blocked';
        })
        .reduce((sum: number, r: any) => sum + Number(r.days_count || 0), 0);
      const totalDays = presentDays + leaveDays;
      const attendancePercentage = totalDays > 0 ? parseFloat(((presentDays / totalDays) * 100).toFixed(1)) : 0;

      return {
        facultyId: faculty.id,
        name: faculty.name,
        employeeId: faculty.employeeId,
        department: faculty.department,
        designation: faculty.designation,
        totalDays,
        presentDays,
        leaveDays,
        attendancePercentage,
      };
    });
  };

  const handleDownloadMonthlyReport = (report: MonthlyReport) => {
    const monthName = selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Current Month';
    
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('MONTHLY ATTENDANCE REPORT', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Faculty Member', 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text(monthName, 105, 32, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Faculty Details Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Faculty Details', 14, 50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const facultyDetails = [
      ['Name:', report.name],
      ['Employee ID:', report.employeeId],
      ['Department:', report.department],
      ['Designation:', report.designation]
    ];
    
    let yPos = 58;
    facultyDetails.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 60, yPos);
      yPos += 7;
    });
    
    // Attendance Summary Section
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Summary', 14, yPos);
    yPos += 8;
    
    // Attendance table
    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: [
        ['Total Working Days', report.totalDays.toString()],
        ['Present Days', report.presentDays.toString()],
        ['Leave Days', report.leaveDays.toString()],
        ['Attendance Percentage', report.attendancePercentage + '%']
      ],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      margin: { left: 14 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 100, halign: 'right' }
      }
    });
    
    // Performance Rating
    yPos = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance Rating', 14, yPos);
    yPos += 10;
    
        const rating = report.attendancePercentage >= 95 ? 'Excellent' : 
      report.attendancePercentage >= 90 ? 'Very Good' :
      report.attendancePercentage >= 85 ? 'Good' :
      report.attendancePercentage >= 75 ? 'Average' : 'Needs Improvement';
    
    const ratingColor = report.attendancePercentage >= 95 ? [34, 197, 94] : 
      report.attendancePercentage >= 90 ? [59, 130, 246] :
      report.attendancePercentage >= 85 ? [99, 102, 241] :
      report.attendancePercentage >= 75 ? [245, 158, 11] : [239, 68, 68];
    
    doc.setFillColor(ratingColor[0], ratingColor[1], ratingColor[2]);
    doc.roundedRect(14, yPos - 5, 180, 12, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(rating, 104, yPos + 2, { align: 'center' });
    
    // Footer
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });
    
    // Save PDF
    doc.save(`Monthly_Attendance_${report.employeeId}_${selectedMonth || 'current'}.pdf`);
  };

  const handleDownloadAllMonthlyReports = () => {
    const monthlyReports = generateMonthlyReports();
    const monthName = selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Current Month';
    const avgAttendance = (monthlyReports.reduce((sum, r) => sum + r.attendancePercentage, 0) / monthlyReports.length).toFixed(1);
    
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('CONSOLIDATED MONTHLY', 105, 15, { align: 'center' });
    doc.text('ATTENDANCE REPORT', 105, 25, { align: 'center' });
    doc.setFontSize(12);
    doc.text('All Faculty Members', 105, 33, { align: 'center' });
    doc.setFontSize(10);
    doc.text(monthName, 105, 40, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Summary Statistics
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics', 14, 55);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const summaryData = [
      ['Total Faculty:', monthlyReports.length.toString()],
      ['Average Attendance:', avgAttendance + '%'],
      ['Working Days:', monthlyReports[0]?.totalDays.toString() || '22']
    ];
    
    let yPos = 63;
    summaryData.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 70, yPos);
      yPos += 7;
    });
    
    // Detailed Reports Table
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Reports', 14, yPos);
    yPos += 5;
    
    const tableData = monthlyReports.map(r => [
      r.employeeId,
      r.name,
      r.department.substring(0, 8),
      r.presentDays.toString(),
      r.leaveDays.toString(),
      r.attendancePercentage + '%'
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Emp ID', 'Name', 'Dept', 'Present', 'Leave', '%']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 40 },
        2: { cellWidth: 25 },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' }
      }
    });
    
    // Performance Breakdown
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance Breakdown', 14, yPos);
    yPos += 8;
    
    const performanceData = [
      ['Excellent (≥95%)', monthlyReports.filter(r => r.attendancePercentage >= 95).length + ' faculty', [34, 197, 94]],
      ['Very Good (90-94%)', monthlyReports.filter(r => r.attendancePercentage >= 90 && r.attendancePercentage < 95).length + ' faculty', [59, 130, 246]],
      ['Good (85-89%)', monthlyReports.filter(r => r.attendancePercentage >= 85 && r.attendancePercentage < 90).length + ' faculty', [99, 102, 241]],
      ['Average (75-84%)', monthlyReports.filter(r => r.attendancePercentage >= 75 && r.attendancePercentage < 85).length + ' faculty', [245, 158, 11]],
      ['Needs Improvement (<75%)', monthlyReports.filter(r => r.attendancePercentage < 75).length + ' faculty', [239, 68, 68]]
    ];
    
    doc.setFontSize(10);
    performanceData.forEach(([category, count, color]) => {
      doc.setFillColor((color as number[])[0], (color as number[])[1], (color as number[])[2]);
      doc.roundedRect(14, yPos - 4, 4, 4, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text(category as string, 22, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(count as string, 120, yPos);
      yPos += 8;
    });
    
    // Footer
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(8);
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }
    
    // Save PDF
    doc.save(`All_Faculty_Monthly_Attendance_${selectedMonth || 'current'}.pdf`);
  };

  const resetAttendance = () => {
    setAttendanceRecords(new Map());
    setIsSubmitted(false);
    setIsEditMode(false);
    setShowDailyReport(false);
    setDailyReport(null);
  };

  const handleEditAttendance = () => {
    setIsEditMode(true);
  };

  const handleUpdateAttendance = async () => {
    // Same logic as submit, but we're updating existing attendance
    await handleSubmitAttendance();
    setIsEditMode(false);
  };

  const handleCancelEdit = async () => {
    // Reload the existing attendance to discard changes
    await loadExistingAttendanceForDate(selectedDate);
    setIsEditMode(false);
  };

  // Get stats for current selection
  const currentStats = {
    present: Array.from(attendanceRecords.values()).filter(r => r.status === 'present').length,
    onLeave: Array.from(attendanceRecords.values()).filter(r => r.status === 'leave').length,
    notMarked: facultyMembers.length - attendanceRecords.size
  };

  if (showMonthlyReports) {
    const monthlyReports = generateMonthlyReports();
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white font-['Poppins',sans-serif]">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg sticky top-0 z-10">
          <div className="px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => setShowMonthlyReports(false)}
              className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="flex-1">
              <h2 className="text-white">Monthly Attendance Reports</h2>
              <p className="text-white/80 text-sm">Detailed attendance reports for all faculty members</p>
            </div>
            <button
              onClick={handleDownloadAllMonthlyReports}
              className="flex items-center gap-2 bg-white text-green-600 px-4 py-2 rounded-xl hover:bg-green-50 transition-all active:scale-95"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Download All</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Month Selector */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              max={new Date().toISOString().slice(0, 7)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-blue-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{monthlyReports.length}</h3>
                  <p className="text-gray-600 text-sm">Total Faculty</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-green-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {monthlyReports.length > 0 
                      ? (monthlyReports.reduce((sum, r) => sum + r.attendancePercentage, 0) / monthlyReports.length).toFixed(1)
                      : '0.0'}%
                  </h3>
                  <p className="text-gray-600 text-sm">Avg Attendance</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-purple-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {monthlyReports.filter(r => r.attendancePercentage >= 90).length}
                  </h3>
                  <p className="text-gray-600 text-sm">Excellent (≥90%)</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-orange-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{monthlyReports[0]?.totalDays || 22}</h3>
                  <p className="text-gray-600 text-sm">Working Days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Faculty Reports */}
          <div className="space-y-4">
            {monthlyReports.map(report => (
              <div key={report.facultyId} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-gray-900 text-lg">{report.name}</h3>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        {report.employeeId}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <span className="font-medium">{report.department}</span>
                      </span>
                      <span>•</span>
                      <span>{report.designation}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadMonthlyReport(report)}
                    className="flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-xl hover:bg-green-100 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Total Days</p>
                    <p className="text-lg font-bold text-gray-900">{report.totalDays}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-xs text-green-600 mb-1">Present</p>
                    <p className="text-lg font-bold text-green-700">{report.presentDays}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-blue-600 mb-1">Leave</p>
                    <p className="text-lg font-bold text-blue-700">{report.leaveDays}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3">
                    <p className="text-xs text-purple-600 mb-1">Percentage</p>
                    <p className="text-lg font-bold text-purple-700">{report.attendancePercentage}%</p>
                  </div>
                </div>

                {/* Performance Badge */}
                <div className="mt-4">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
                    report.attendancePercentage >= 95 ? 'bg-green-100 text-green-700' :
                    report.attendancePercentage >= 90 ? 'bg-blue-100 text-blue-700' :
                    report.attendancePercentage >= 85 ? 'bg-indigo-100 text-indigo-700' :
                    report.attendancePercentage >= 75 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {report.attendancePercentage >= 95 ? '⭐⭐⭐⭐⭐ Excellent' :
                     report.attendancePercentage >= 90 ? '⭐⭐⭐⭐ Very Good' :
                     report.attendancePercentage >= 85 ? '⭐⭐⭐ Good' :
                     report.attendancePercentage >= 75 ? '⭐⭐ Average' :
                     '⭐ Needs Improvement'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (showDailyReport && dailyReport) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white font-['Poppins',sans-serif]">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg sticky top-0 z-10">
          <div className="px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => setShowDailyReport(false)}
              className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="flex-1">
              <h2 className="text-white">Daily Attendance Report</h2>
              <p className="text-white/80 text-sm">
                {new Date(dailyReport.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-blue-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{dailyReport.totalFaculty}</h3>
                  <p className="text-gray-600 text-sm">Total</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-green-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{dailyReport.present}</h3>
                  <p className="text-gray-600 text-sm">Present</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-blue-400">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{dailyReport.onLeave}</h3>
                  <p className="text-gray-600 text-sm">On Leave</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Records */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
              <h3 className="text-white">Detailed Attendance Records</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dailyReport.records.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{record.employeeId}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{record.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{record.department}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          record.status === 'Present' ? 'bg-green-100 text-green-800' :
                          record.status === 'Leave' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{record.remarks || '-'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleDownloadDailyReport}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Report
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <h2 className="text-white">Faculty Attendance</h2>
            <p className="text-white/80 text-sm">Mark and manage faculty attendance</p>
          </div>
          <button
            onClick={() => setShowMonthlyReports(true)}
            className="flex items-center gap-2 bg-white text-green-600 px-4 py-2 rounded-xl hover:bg-green-50 transition-all active:scale-95"
          >
            <FileText className="w-5 h-5" />
            <span className="hidden sm:inline">Monthly Reports</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Date Selection */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                resetAttendance();
              }}
              max={new Date().toISOString().split('T')[0]}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Selected: {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          {isSubmitted && !isEditMode && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                Attendance already submitted for this date
              </span>
            </div>
          )}
        </div>

        {/* Current Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-2xl p-4 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Present</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{currentStats.present}</p>
          </div>

          <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">On Leave</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{currentStats.onLeave}</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-600">Not Marked</span>
            </div>
            <p className="text-2xl font-bold text-gray-700">{currentStats.notMarked}</p>
          </div>
        </div>

        {/* Faculty List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <h3 className="text-white">Faculty Members</h3>
            <p className="text-white/80 text-sm">Mark attendance for each faculty member</p>
          </div>

          <div className="p-6 space-y-4">
            {facultyMembers.map(faculty => {
              const record = attendanceRecords.get(faculty.id);
              return (
                <div key={faculty.id} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-gray-900 font-medium">{faculty.name}</h4>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          {faculty.employeeId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{faculty.department}</span>
                        <span>•</span>
                        <span>{faculty.designation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Buttons */}
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={() => handleAttendanceChange(faculty.id, 'present')}
                      disabled={isSubmitted && !isEditMode}
                      className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                        (isSubmitted && !isEditMode) ? 'cursor-not-allowed opacity-60' : 'active:scale-95'
                      } ${
                        record?.status === 'present'
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300'
                      }`}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => handleAttendanceChange(faculty.id, 'leave')}
                      disabled={isSubmitted && !isEditMode}
                      className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                        (isSubmitted && !isEditMode) ? 'cursor-not-allowed opacity-60' : 'active:scale-95'
                      } ${
                        record?.status === 'leave'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      Leave
                    </button>
                  </div>

                  {/* Substitution Section */}
                  {record?.status === 'leave' && (
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Substitutions</span>
                        <button
                          onClick={() => {
                            setSelectedAbsentFaculty(faculty);
                            setShowSubstitutionModal(true);
                          }}
                          className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add Substitute
                        </button>
                      </div>

                      {/* List of substitutions for this faculty */}
                      <div className="space-y-2">
                        {substitutions.filter(s => s.absentFacultyId === faculty.id).map(sub => (
                          <div key={sub.id} className="flex items-center justify-between bg-blue-50 p-2 rounded-lg border border-blue-100">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-blue-900">
                                {sub.substituteFacultyName}
                              </p>
                              <p className="text-xs text-blue-700">
                                {sub.course} {sub.section} • Sem {sub.semester} • {sub.period}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteSubstitution(sub.id)}
                              className="p-1 text-blue-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {substitutions.filter(s => s.absentFacultyId === faculty.id).length === 0 && (
                          <p className="text-xs text-gray-500 italic">No substitutes assigned yet</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Remarks */}
                  <input
                    type="text"
                    placeholder="Add remarks (optional)"
                    value={record?.remarks || ''}
                    onChange={(e) => handleRemarksChange(faculty.id, e.target.value)}
                    disabled={isSubmitted && !isEditMode}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors text-sm disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit/Edit/Update/Cancel Buttons */}
        <div className="sticky bottom-4">
          {isSubmitted && !isEditMode ? (
            // Edit button when attendance is already submitted
            <button
              onClick={handleEditAttendance}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 font-medium text-lg flex items-center justify-center gap-2"
            >
              <Edit2 className="w-5 h-5" />
              Edit Attendance
            </button>
          ) : isSubmitted && isEditMode ? (
            // Update and Cancel buttons when in edit mode
            <div className="flex gap-3">
              <button
                onClick={handleCancelEdit}
                className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 font-medium text-lg flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
              <button
                onClick={handleUpdateAttendance}
                disabled={attendanceRecords.size === 0}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 font-medium text-lg flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Update Attendance
              </button>
            </div>
          ) : (
            // Submit button for first time submission
            <button
              onClick={handleSubmitAttendance}
              disabled={attendanceRecords.size === 0}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 font-medium text-lg"
            >
              Submit Attendance ({attendanceRecords.size}/{facultyMembers.length})
            </button>
          )}
        </div>
      </div>

      {/* Substitution Modal */}
      {showSubstitutionModal && selectedAbsentFaculty && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white">Assign Substitute</h3>
                <p className="text-blue-100 text-xs">For: {selectedAbsentFaculty.name}</p>
              </div>
              <button
                onClick={() => setShowSubstitutionModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Substitute Faculty Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Substitute Faculty</label>
                <select
                  value={substitutionForm.substituteId}
                  onChange={(e) => setSubstitutionForm({ ...substitutionForm, substituteId: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-blue-500 transition-colors bg-gray-50 text-sm"
                >
                  <option value="">Choose a Faculty</option>
                  {facultyMembers
                    .filter(f => f.id !== selectedAbsentFaculty.id)
                    .map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.department})</option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Course */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                  <select
                    value={substitutionForm.course}
                    onChange={(e) => setSubstitutionForm({ ...substitutionForm, course: e.target.value, section: '' })}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-blue-500 transition-colors bg-gray-50 text-xs"
                  >
                    <option value="">Select</option>
                    {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Semester */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <select
                    value={substitutionForm.semester}
                    onChange={(e) => setSubstitutionForm({ ...substitutionForm, semester: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-blue-500 transition-colors bg-gray-50 text-xs"
                  >
                    <option value="">Select</option>
                    {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <select
                    value={substitutionForm.section}
                    onChange={(e) => setSubstitutionForm({ ...substitutionForm, section: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-blue-500 transition-colors bg-gray-50 text-xs"
                    disabled={!substitutionForm.course}
                  >
                    <option value="">Select</option>
                    {substitutionForm.course && COURSE_SECTIONS[substitutionForm.course as keyof typeof COURSE_SECTIONS]?.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Period */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                  <select
                    value={substitutionForm.period}
                    onChange={(e) => setSubstitutionForm({ ...substitutionForm, period: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-blue-500 transition-colors bg-gray-50 text-xs"
                  >
                    <option value="">Select</option>
                    {['P1', 'P2', 'P3', 'P4', 'P5'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleAddSubstitution}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 font-medium flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Assign Period
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}































