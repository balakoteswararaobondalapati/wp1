import React, { useState } from 'react';
import {
  Users,
  User,
  GraduationCap,
  BookOpen,
  Link as LinkIcon,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  ChevronRight,
  FileText,
  Plus,
  MessageSquare,
  ClipboardCheck,
  UserCheck,
  UserX,
  UserPlus,
  FolderOpen,
  CheckSquare,
  Calendar,
  Droplet,
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ProfileAvatar } from './ProfileAvatar';
import { AdminProfilePage } from './AdminProfilePage';
import { AddNoticeModal, NoticeFormData } from './AddNoticeModal';
import { AdminPermissionManagement } from './AdminPermissionManagement';
import { AdminNoticeManagement, AdminNotice } from './AdminNoticeManagement';
import { AdminComplaintsManagement } from './AdminComplaintsManagement';
import { TotalStudentsPage } from './TotalStudentsPage';
import { TotalFacultyPage } from './TotalFacultyPage';
import { DailyAttendanceReport } from './DailyAttendanceReport';
import { AttendanceCategoryView } from './AttendanceCategoryView';
import { PerformanceCategoryView } from './PerformanceCategoryView';
import { RegisterStudentModal, StudentRegistrationData } from './RegisterStudentModal';
import { RegisterFacultyModal, FacultyRegistrationData } from './RegisterFacultyModal';
import { AdminMaterialsManagement } from './AdminMaterialsManagement';
import { AdminViewEditAttendance } from './AdminViewEditAttendance';
import { AdminAttendanceSystem } from './AdminAttendanceSystem';
import { AdminTimetableManagement } from './AdminTimetableManagement';
import { AdminFacultyTimetablePage } from './AdminFacultyTimetablePage';
import { permissionsData, PermissionRequest } from '../data/permissions';
import { noticesAPI, studentsAPI, facultyAPI, permissionsAPI, complaintsAPI, attendanceAPI } from '../api';
import { AdminLinksManagement } from './AdminLinksManagement';
import { AdminBloodBank } from './AdminBloodBank';
import { AdminFacultyAttendance } from './AdminFacultyAttendance';
import { AdminAcademicsManagement } from './AdminAcademicsManagement';
import { QuoteManagementPage } from './QuoteManagementPage';
import { HolidayAttendanceCalendar } from './HolidayAttendanceCalendar';
import { appStorage } from './';
import { formatHeaderDate } from '../utils/headerDateTime';

interface AdminDashboardProps {
  onLogout: () => void;
}

type MenuSection = 'dashboard' | 'user-management' | 'academics' | 'links' | 'blood-bank' | 'quote';

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [showSidebar, setShowSidebar] = useState(false);
  const [liveHeaderTime, setLiveHeaderTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  );
  const [activeSection, setActiveSection] = useState<MenuSection>('dashboard');
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'semester'>('week');
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>('all');
  const [showProfile, setShowProfile] = useState(false);
  const [showAddNoticeModal, setShowAddNoticeModal] = useState(false);
  const [showPermissionManagement, setShowPermissionManagement] = useState(false);
  const [showNoticeManagement, setShowNoticeManagement] = useState(false);
  const [showComplaintsManagement, setShowComplaintsManagement] = useState(false);
  const [showTotalStudentsPage, setShowTotalStudentsPage] = useState(false);
  const [showTotalFacultyPage, setShowTotalFacultyPage] = useState(false);
  const [showAttendanceReport, setShowAttendanceReport] = useState(false);
  const [showAttendanceCategoryView, setShowAttendanceCategoryView] = useState(false);
  const [selectedAttendanceCategory, setSelectedAttendanceCategory] = useState<'excellent' | 'good' | 'average' | 'below-average'>('excellent');
  const [showPerformanceCategoryView, setShowPerformanceCategoryView] = useState(false);
  const [selectedPerformanceCategory, setSelectedPerformanceCategory] = useState<'excellent' | 'good' | 'average' | 'below-average' | null>(null);
  const [showRegisterStudentModal, setShowRegisterStudentModal] = useState(false);
  const [showRegisterFacultyModal, setShowRegisterFacultyModal] = useState(false);
  const [showMaterialsManagement, setShowMaterialsManagement] = useState(false);
  const [showViewEditAttendance, setShowViewEditAttendance] = useState(false);
  const [showTakeAttendance, setShowTakeAttendance] = useState(false);
  const [showTimetableManagement, setShowTimetableManagement] = useState(false);
  const [showAdminFacultyTimetable, setShowAdminFacultyTimetable] = useState(false);
  const [showLinksManagement, setShowLinksManagement] = useState(false);
  const [showBloodBank, setShowBloodBank] = useState(false);
  const [showFacultyAttendance, setShowFacultyAttendance] = useState(false);
  const [showAcademicsManagement, setShowAcademicsManagement] = useState(false);
  const [showQuoteManagement, setShowQuoteManagement] = useState(false);
  const [showHolidayCalendar, setShowHolidayCalendar] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalFaculty, setTotalFaculty] = useState(0);
  const [permissions, setPermissions] = useState<PermissionRequest[]>([]);
  const [notices, setNotices] = useState<AdminNotice[]>([]);
 const [complaints, setComplaints] = useState<any[]>([]);

// 🔥 remember seen state even after logout / refresh
const [complaintsSeen, setComplaintsSeen] = useState(
  () => appStorage.getItem('complaintsSeen') === 'true'
);

const [attendanceRefreshTrigger, setAttendanceRefreshTrigger] = useState(0);
  const [overallAttendance, setOverallAttendance] = useState(0);
  const [departmentData, setDepartmentData] = useState<Array<{ department: string; attendance: number }>>([]);
  const [attendanceDistribution, setAttendanceDistribution] = useState({
    excellent: 0,
    good: 0,
    average: 0,
    belowAverage: 0,
    total: 0
  });

  React.useEffect(() => {
    const updateLiveHeaderTime = () => {
      setLiveHeaderTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    updateLiveHeaderTime();
    const intervalId = window.setInterval(updateLiveHeaderTime, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Load backend counts and permission state on mount.
  React.useEffect(() => {
    const loadCounts = async () => {
      try {
        const [students, faculty] = await Promise.all([
          studentsAPI.getAll(),
          facultyAPI.getAll(),
        ]);
        setTotalStudents((students || []).length);
        setTotalFaculty((faculty || []).length);
      } catch (error) {
        console.error('Failed to load user counts from backend:', error);
      }
    };

    void loadCounts();
    loadPermissions();
    loadNotices();

    // Listen for real-time permission updates
    const handlePermissionsUpdate = () => {
      console.log('📋 Admin: Permissions updated - reloading');
      loadPermissions();
    };

    window.addEventListener('permissionsUpdated', handlePermissionsUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === 'permission_requests') {
        handlePermissionsUpdate();
      }
    });

    return () => {
      window.removeEventListener('permissionsUpdated', handlePermissionsUpdate);
    };
  }, []);

  // Load complaints from backend and keep them fresh.
  React.useEffect(() => {
    loadComplaints();

    // Listen for real-time complaint updates
    const handleComplaintsUpdate = () => {
      console.log('💬 Admin: Complaints updated - reloading');
      loadComplaints();
    };

    // Set up polling to refresh complaints every 2 seconds
    const interval = setInterval(loadComplaints, 2000);

    window.addEventListener('complaintUpdated', handleComplaintsUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('complaintUpdated', handleComplaintsUpdate);
    };
  }, []);

  // Listen for attendance updates and refresh backend analytics.
  React.useEffect(() => {
    const handleAttendanceUpdate = () => {
      console.log('📊 Admin: Attendance updated - refreshing department stats');
      setAttendanceRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);

    return () => {
      window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
    };
  }, []);

  React.useEffect(() => {
    const handleNoticesUpdate = () => {
      loadNotices();
    };

    window.addEventListener('notices_updated', handleNoticesUpdate);
    return () => {
      window.removeEventListener('notices_updated', handleNoticesUpdate);
    };
  }, []);

// Show red dot whenever there are unresolved complaints from DB.
React.useEffect(() => {
  const hasUnread = complaints.some((c) => c.status === 'pending' || c.status === 'in-review');

  if (hasUnread) {
    setComplaintsSeen(false);
    appStorage.setItem('complaintsSeen', 'false');
  }
}, [complaints]);


  // Load dashboard attendance analytics from backend (overall, categories, department chart).
  React.useEffect(() => {
    const loadAttendanceAnalytics = async () => {
      try {
        const analytics = await attendanceAPI.analytics(chartPeriod, selectedSemesterFilter);
        setOverallAttendance(Number(analytics?.overall_percentage || 0));
        setDepartmentData(
          Array.isArray(analytics?.department_attendance) ? analytics.department_attendance : [],
        );
        setAttendanceDistribution({
          excellent: Number(analytics?.category_counts?.excellent || 0),
          good: Number(analytics?.category_counts?.good || 0),
          average: Number(analytics?.category_counts?.average || 0),
          belowAverage: Number(analytics?.category_counts?.belowAverage || 0),
          total: Number(analytics?.category_counts?.total || 0),
        });
      } catch (error) {
        console.error('Failed to load attendance analytics from backend:', error);
        setOverallAttendance(0);
        setDepartmentData([]);
        setAttendanceDistribution({
          excellent: 0,
          good: 0,
          average: 0,
          belowAverage: 0,
          total: 0,
        });
      }
    };

    void loadAttendanceAnalytics();
  }, [attendanceRefreshTrigger, chartPeriod, selectedSemesterFilter]);

  const loadPermissions = async () => {
    try {
      const rows = await permissionsAPI.getAll();
      const parseAttachments = (raw: any) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };
      setPermissions((rows || []).map((p: any) => ({
        id: String(p.id),
        studentName: p.student_name || 'Student',
        rollNumber: p.roll_number || '',
        semester: String(p.semester || ''),
        section: String(p.section || ''),
        studentEmail: p.student_email || '',
        department: p.department || '',
        course: p.course || '',
        type: 'permission',
        typeLabel: 'Permission',
        date: String(p.from_date || ''),
        time: '',
        reason: p.reason || '',
        status: p.status || 'pending',
        submittedDate: String(p.created_at || ''),
        remark: p.remark || '',
        attachments: parseAttachments(p.attachments),
      })));
    } catch (error) {
      console.error('Failed to load permissions from backend:', error);
      setPermissions([]);
    }
  };

  const loadComplaints = async () => {
    try {
      const rows = await complaintsAPI.getAll();
      setComplaints(rows || []);
    } catch (error) {
      console.error('Failed to load complaints from backend:', error);
      setComplaints([]);
    }
  };

  const normalizeAudience = (raw: unknown): 'students' | 'faculty' | 'all' => {
    const value = String(raw || '').trim().toLowerCase();
    if (value === 'students' || value === 'student') return 'students';
    if (value === 'faculty' || value === 'lecturer' || value === 'staff' || value === 'teacher' || value === 'teachers') {
      return 'faculty';
    }
    return 'all';
  };

  const loadNotices = async () => {
    try {
      const rows = await noticesAPI.getAll();
      const mapped = (rows || []).map((notice: any) => ({
        id: Number(notice.id),
        title: notice.title || '',
        description: notice.description || '',
        date: notice.date || (notice.created_at ? new Date(notice.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }) : ''),
        time: notice.time || (notice.created_at ? new Date(notice.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }) : ''),
        targetAudience: normalizeAudience(notice.targetAudience ?? notice.audience),
        semesters: Array.isArray(notice.semesters) ? notice.semesters : [],
        sections: Array.isArray(notice.sections) ? notice.sections : [],
        color: notice.color || 'bg-blue-50 border-blue-200',
      }));
      setNotices(mapped);
    } catch (error) {
      console.error('Failed to load notices from backend:', error);
      setNotices([]);
    }
  };

  // Get current admin user name
  const getAdminName = () => {
    const currentUser = appStorage.getItem('current_user');
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        return user.name || 'Admin';
      } catch (error) {
        console.error('Error loading admin name:', error);
      }
    }
    return 'Admin';
  };

  const adminName = getAdminName();

  // Calculate pending permissions count
  const pendingPermissions = permissions.filter((p) => p.status === 'pending').length;
  
  // 🔥 Calculate pending complaints count (for badge display)
  const pendingComplaintsCount = complaints.filter((c) => c.status === 'pending').length;
  
  // 🔥 Calculate complaints that need attention (pending OR in-review) for notification dot
  const complaintsNeedingAttention = complaints.filter((c) => c.status === 'pending' || c.status === 'in-review').length;
  
  // Calculate total complaints count (all statuses)
  const totalComplaintsCount = complaints.length;

  // Stats Data - recalculated when backend analytics changes
  const stats = React.useMemo(() => ({
    totalStudents: totalStudents,
    totalStaff: totalFaculty,
    activeStaff: totalFaculty,
    inactiveStaff: 0,
    attendance: overallAttendance,
    activeNotices: notices.length,
  }), [totalStudents, totalFaculty, notices.length, overallAttendance]);

  // If on permission management page
  if (showPermissionManagement) {
    return (
      <AdminPermissionManagement
        onBack={() => setShowPermissionManagement(false)}
        permissions={permissions}
        onApprove={(id, remark) => {
          const updatedPermissions = permissions.map((p) =>
            p.id === id ? { ...p, status: 'approved' as const, remark } : p
          );
          setPermissions(updatedPermissions);
          permissionsAPI.update(id, { status: 'approved' }).catch((error) => {
            console.error('Failed to update permission in backend:', error);
          });
        }}
        onReject={(id, remark) => {
          const updatedPermissions = permissions.map((p) =>
            p.id === id ? { ...p, status: 'rejected' as const, remark } : p
          );
          setPermissions(updatedPermissions);
          permissionsAPI.update(id, { status: 'rejected' }).catch((error) => {
            console.error('Failed to update permission in backend:', error);
          });
        }}
      />
    );
  }

  // If on notice management page
  if (showNoticeManagement) {
    return (
      <AdminNoticeManagement
        onBack={() => setShowNoticeManagement(false)}
        notices={notices}
        onDelete={(id) => {
          setNotices(notices.filter((n) => n.id !== id));
        }}
      />
    );
  }

  // If on complaints management page
  if (showComplaintsManagement) {
    return (
      <AdminComplaintsManagement
        onBack={() => setShowComplaintsManagement(false)}
      />
    );
  }

  // If on total students page
  if (showTotalStudentsPage) {
    return <TotalStudentsPage onBack={() => setShowTotalStudentsPage(false)} />;
  }

  // If on total faculty page
  if (showTotalFacultyPage) {
    return <TotalFacultyPage onBack={() => setShowTotalFacultyPage(false)} />;
  }

  // If on attendance report page
  if (showAttendanceReport) {
    return <DailyAttendanceReport onBack={() => setShowAttendanceReport(false)} />;
  }

  // If on attendance category view page
  if (showAttendanceCategoryView) {
    return <AttendanceCategoryView onBack={() => setShowAttendanceCategoryView(false)} category={selectedAttendanceCategory} />;
  }

  // If on performance category view page
  if (showPerformanceCategoryView) {
    return (
      <PerformanceCategoryView
        onBack={() => setShowPerformanceCategoryView(false)}
        category={selectedPerformanceCategory}
        period={chartPeriod}
        semesterFilter={selectedSemesterFilter}
      />
    );
  }

  // If on materials management page
  if (showMaterialsManagement) {
    return <AdminMaterialsManagement onBack={() => setShowMaterialsManagement(false)} />;
  }

  // If on view/edit attendance page
  if (showViewEditAttendance) {
    return <AdminViewEditAttendance onBack={() => setShowViewEditAttendance(false)} />;
  }

  // If on take attendance page
  if (showTakeAttendance) {
    return <AdminAttendanceSystem onBack={() => setShowTakeAttendance(false)} initialMode="mark" />;
  }

  // If on timetable management page
  if (showTimetableManagement) {
    return <AdminTimetableManagement onBack={() => setShowTimetableManagement(false)} />;
  }

  // If on admin faculty timetable page
  if (showAdminFacultyTimetable) {
    return <AdminFacultyTimetablePage onBack={() => setShowAdminFacultyTimetable(false)} />;
  }

  // If on links management page
  if (showLinksManagement) {
    return <AdminLinksManagement onBack={() => setShowLinksManagement(false)} />;
  }

  // If on blood bank management page
  if (showBloodBank) {
    return <AdminBloodBank onBack={() => setShowBloodBank(false)} />;
  }

  // If on quote management page
  if (showQuoteManagement) {
    return <QuoteManagementPage onBack={() => setShowQuoteManagement(false)} />;
  }

  // If on faculty attendance management page
  if (showFacultyAttendance) {
    return <AdminFacultyAttendance onBack={() => setShowFacultyAttendance(false)} />;
  }

  // If on academics management page
  if (showAcademicsManagement) {
    return <AdminAcademicsManagement onBack={() => setShowAcademicsManagement(false)} />;
  }

  // If on holiday calendar page
  if (showHolidayCalendar) {
    return <HolidayAttendanceCalendar onBack={() => setShowHolidayCalendar(false)} />;
  }

  // If on profile page, show AdminProfilePage component
  if (showProfile) {
    return <AdminProfilePage onBack={() => setShowProfile(false)} onLogout={onLogout} />;
  }

  const handleAddNotice = async (noticeData: NoticeFormData) => {
    // Create new notice with current date, time and unique ID
    const now = new Date();
    const newNotice: AdminNotice = {
      id: Date.now(), // Simple unique ID based on timestamp
      title: noticeData.title,
      description: noticeData.description,
      date: now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      targetAudience: noticeData.targetAudience,
      semesters: noticeData.semesters,
      sections: noticeData.sections,
      color: noticeData.color,
    };

    // Add to notices array
    setNotices([newNotice, ...notices]);
    
    // 🔥 SEND TO BACKEND API
    try {
      await noticesAPI.create({
        title: noticeData.title,
        description: noticeData.description,
        audience: noticeData.targetAudience,
      });
      console.log('Notice sent to backend successfully');
      
      // 🔥 DISPATCH EVENT TO NOTIFY STUDENT & FACULTY PORTALS TO REFRESH
      window.dispatchEvent(new CustomEvent('notices_updated'));
      console.log('📢 Dispatched notices_updated event');
      loadNotices();
    } catch (error) {
      console.error('Failed to send notice to backend:', error);
      // Notice is still saved locally, so user can still see it
    }
  };

  const syncStudentsFromBackend = async () => {
    const backendStudents = await studentsAPI.getAll();
    setTotalStudents((backendStudents || []).length);
    window.dispatchEvent(new CustomEvent('studentRegistered'));
  };

  const syncFacultyFromBackend = async () => {
    const backendFaculty = await facultyAPI.getAll();
    setTotalFaculty((backendFaculty || []).length);
    window.dispatchEvent(new CustomEvent('facultyRegistered'));
  };

  const handleRegisterStudent = async (studentData: StudentRegistrationData) => {
    try {
      await studentsAPI.create(studentData);
      await syncStudentsFromBackend();
      alert(`Student ${studentData.name} has been successfully registered!\nLogin ID: ${studentData.userId}`);
    } catch (error: any) {
      alert('Failed to register student: ' + (error.message || 'Unknown error'));
      throw error;
    }
  };

  const handleRegisterFaculty = async (facultyData: FacultyRegistrationData) => {
    try {
      await facultyAPI.create(facultyData);
      await syncFacultyFromBackend();
      alert(`Faculty ${facultyData.name} has been successfully registered!\nLogin ID: ${facultyData.userId}`);
    } catch (error: any) {
      alert('Failed to register faculty: ' + (error.message || 'Unknown error'));
      throw error;
    }
  };

  // Attendance distribution data with actual counts
  const performanceData = [
    { name: 'Excellent', value: attendanceDistribution.excellent, color: '#22C55E' },
    { name: 'Good', value: attendanceDistribution.good, color: '#3B82F6' },
    { name: 'Average', value: attendanceDistribution.average, color: '#F59E0B' },
    { name: 'Below Average', value: attendanceDistribution.belowAverage, color: '#EF4444' },
  ];



  const handleMenuClick = (section: MenuSection) => {
    setActiveSection(section);
    setShowSidebar(false);
  };

  const handleLogout = () => {
    setShowSidebar(false);
    onLogout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 font-['Poppins',sans-serif]">
      {/* Header - Green Theme */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg sticky top-0 z-10">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Side - Hamburger Menu & Greeting */}
            <div className="flex items-center gap-4">
              {/* Hamburger Menu */}
              <button 
                onClick={() => setShowSidebar(true)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors active:scale-95"
                aria-label="Menu"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>

              {/* Greeting */}
              <div>
                <h1 className="text-white text-xl sm:text-2xl">
                  <span className="font-normal">Hello, </span>
                  <span className="font-bold">admin</span>
                </h1>
                <p className="text-sm text-green-100">Welcome to Admin Portal</p>
              </div>
            </div>

            {/* Right Side - Date/Time & Profile Picture */}
            <div className="flex items-center gap-3">
              {/* Custom Date & Time */}
              {(() => {
                const customDate = appStorage.getItem('customHeaderDate');
                if (customDate) {
                  const formattedDate = formatHeaderDate(customDate);
                  if (!formattedDate) return null;
                  return (
                    <div className="hidden sm:block text-right mr-2">
                      <p className="text-white text-sm font-medium">{formattedDate}</p>
                      <p className="text-green-100 text-xs">{liveHeaderTime}</p>
                    </div>
                  );
                }
                return null;
              })()}
              <ProfileAvatar
                userName={adminName}
                onClick={() => setShowProfile(true)}
                themeColor="green"
                className="border-white"
              />
            </div>
          </div>
       </div>
        {/* Red bottom border */}
        <div className="h-1 bg-emerald-700"></div>
      </div>

      {/* Sidebar Menu */}
      {showSidebar && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowSidebar(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform">
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-6 flex items-center justify-between">
                <div>
                  <h2 className="text-white text-xl">Admin Portal</h2>
                  <p className="text-green-100 text-sm">Management System</p>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-2 px-4">
                  {/* Dashboard */}
                  <button
                    onClick={() => handleMenuClick('dashboard')}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group ${
                      activeSection === 'dashboard'
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        activeSection === 'dashboard'
                          ? 'bg-green-100'
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        <LayoutDashboard className={`w-5 h-5 ${
                          activeSection === 'dashboard' ? 'text-green-700' : 'text-gray-600'
                        }`} />
                      </div>
                      <span className="font-medium">Dashboard</span>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${
                      activeSection === 'dashboard' ? 'text-green-700' : 'text-gray-400'
                    }`} />
                  </button>

                  {/* User Management */}
                  <button
                    onClick={() => handleMenuClick('user-management')}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group ${
                      activeSection === 'user-management'
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        activeSection === 'user-management'
                          ? 'bg-green-100'
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        <Users className={`w-5 h-5 ${
                          activeSection === 'user-management' ? 'text-green-700' : 'text-gray-600'
                        }`} />
                      </div>
                      <span className="font-medium">Management</span>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${
                      activeSection === 'user-management' ? 'text-green-700' : 'text-gray-400'
                    }`} />
                  </button>

                  {/* Academics */}
                  <button
                    onClick={() => handleMenuClick('academics')}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group ${
                      activeSection === 'academics'
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        activeSection === 'academics'
                          ? 'bg-green-100'
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        <BookOpen className={`w-5 h-5 ${
                          activeSection === 'academics' ? 'text-green-700' : 'text-gray-600'
                        }`} />
                      </div>
                      <span className="font-medium">Academics</span>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${
                      activeSection === 'academics' ? 'text-green-700' : 'text-gray-400'
                    }`} />
                  </button>

                  {/* Links */}
                  <button
                    onClick={() => handleMenuClick('links')}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group ${
                      activeSection === 'links'
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        activeSection === 'links'
                          ? 'bg-green-100'
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        <LinkIcon className={`w-5 h-5 ${
                          activeSection === 'links' ? 'text-green-700' : 'text-gray-600'
                        }`} />
                      </div>
                      <span className="font-medium">Links</span>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${
                      activeSection === 'links' ? 'text-green-700' : 'text-gray-400'
                    }`} />
                  </button>

                  {/* Blood Bank */}
                  <button
                    onClick={() => handleMenuClick('blood-bank')}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group ${
                      activeSection === 'blood-bank'
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        activeSection === 'blood-bank'
                          ? 'bg-green-100'
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        <Droplet className={`w-5 h-5 ${
                          activeSection === 'blood-bank' ? 'text-green-700' : 'text-gray-600'
                        }`} />
                      </div>
                      <span className="font-medium">Blood Bank</span>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${
                      activeSection === 'blood-bank' ? 'text-green-700' : 'text-gray-400'
                    }`} />
                  </button>

                  {/* Quote */}
                  <button
                    onClick={() => handleMenuClick('quote')}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group ${
                      activeSection === 'quote'
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        activeSection === 'quote'
                          ? 'bg-green-100'
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        <FileText className={`w-5 h-5 ${
                          activeSection === 'quote' ? 'text-green-700' : 'text-gray-600'
                        }`} />
                      </div>
                      <span className="font-medium">Quote</span>
                    </div>
                    <ChevronRight className={`w-5 h-5 ${
                      activeSection === 'quote' ? 'text-green-700' : 'text-gray-400'
                    }`} />
                  </button>
                </nav>
              </div>

              {/* Logout Button at Bottom */}
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all active:scale-95"
                >
                  <div className="p-2 bg-red-100 rounded-lg">
                    <LogOut className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="px-4 py-6 max-w-7xl mx-auto min-w-0">
        {/* Content Based on Selected Section */}
        <div className="bg-white rounded-3xl shadow-lg p-8 min-w-0">
          {activeSection === 'dashboard' && (
            <div className="min-w-0">
              {/* Permission Button - Top Right */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-gray-900">Dashboard</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Holiday Button */}
                  <button 
                    onClick={() => setShowHolidayCalendar(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
                  >
                    <Calendar className="w-5 h-5" />
                    <span>Holiday</span>
                  </button>

                  {/* Permissions Button */}
                  <button 
                    onClick={() => setShowPermissionManagement(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 relative"
                  >
                    {/* Red Dot Indicator */}
                    {pendingPermissions > 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                    )}
                    <FileText className="w-5 h-5" />
                    <span>Permissions</span>
                    <div className="bg-white text-blue-600 px-2.5 py-0.5 rounded-full text-sm min-w-[28px] text-center">
                      {pendingPermissions}
                    </div>
                  </button>

                 {/* Complaints Button */}
<button
  onClick={() => {
    setComplaintsSeen(true); // hide dot immediately after opening
    appStorage.setItem('complaintsSeen', 'true'); // 🔥 persist
    setShowComplaintsManagement(true);
  }}
  className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 relative group"
  title={`${pendingComplaintsCount} pending`}
>

  {/* 🔴 SMART RED DOT */}
  {pendingComplaintsCount > 0 && (

    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
  )}

  <MessageSquare className="w-5 h-5" />
  <span>Complaints</span>

  {/* count badge */}
  <div className="flex items-center gap-1.5">
    <div className="bg-white text-red-600 px-2.5 py-0.5 rounded-full text-sm min-w-[28px] text-center font-semibold">
      {pendingComplaintsCount}
    </div>
  </div>
</button>


                </div>
              </div>
              
              {/* Dashboard Stats Cards - Horizontal Layout with Grouped Padding */}
              <div className="flex flex-wrap gap-6">
                {/* Left Group: Total Students & Attendance */}
                <div className="flex-1 min-w-[280px] grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Total Students Card */}
                  <button
                    onClick={() => setShowTotalStudentsPage(true)}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98 text-left w-full"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-blue-600 rounded-xl p-3">
                        <Users className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <h3 className="text-gray-900 text-3xl mb-1">{stats.totalStudents}</h3>
                    <p className="text-gray-600">Total Students</p>
                  </button>

                  {/* Attendance Card */}
                  <button
                    onClick={() => setShowAttendanceReport(true)}
                         className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98 text-left w-full"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-orange-600 rounded-xl p-3">
                        <LayoutDashboard className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <h3 className="text-gray-900 text-3xl mb-1">{stats.attendance}%</h3>
                    <p className="text-gray-600"> Overall Attendance</p>
                  </button>
                </div>

                {/* Right Group: Total Staff & Active Notices */}
                <div className="flex-1 min-w-[280px] grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Total Staff Card */}
                  <button
                    onClick={() => setShowTotalFacultyPage(true)}
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98 text-left w-full"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-green-600 rounded-xl p-3">
                        <GraduationCap className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <h3 className="text-gray-900 text-3xl mb-1">{stats.totalStaff}</h3>
                    <p className="text-gray-600 mb-3">Total Staff</p>
                    
                    {/* Active and Inactive Count */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1 bg-green-200 px-3 py-1 rounded-lg">
                        <UserCheck className="w-4 h-4 text-green-700" />
                        <span className="text-green-700 text-sm">{stats.activeStaff}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-gray-200 px-3 py-1 rounded-lg">
                        <UserX className="w-4 h-4 text-gray-700" />
                        <span className="text-gray-700 text-sm">{stats.inactiveStaff}</span>
                      </div>
                    </div>
                  </button>

                  {/* Active Notices Card */}
                  <div 
                    onClick={() => setShowNoticeManagement(true)}
                    className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-purple-600 rounded-xl p-3">
                        <BookOpen className="w-8 h-8 text-white" />
                      </div>
                      <button 
                        className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-all active:scale-95"
                        title="Add Notice"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAddNoticeModal(true);
                        }}
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <h3 className="text-gray-900 text-3xl mb-1">{notices.length}</h3>
                    <p className="text-gray-600">Active Notices</p>
                  </div>
                </div>
              </div>

              {/* Department-wise Attendance Chart */}
              <div className="mt-8 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                  <h3 className="text-gray-900 text-xl">Department-wise Attendance</h3>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Semester Filter Dropdown */}
                    <select
                      value={selectedSemesterFilter}
                      onChange={(e) => setSelectedSemesterFilter(e.target.value)}
                      className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm bg-white hover:border-green-400 focus:outline-none focus:border-green-500 transition-all cursor-pointer"
                    >
                      <option value="all">All Semesters</option>
                      <option value="1">Semester 1</option>
                      <option value="2">Semester 2</option>
                      <option value="3">Semester 3</option>
                      <option value="4">Semester 4</option>
                      <option value="5">Semester 5</option>
                      <option value="6">Semester 6</option>
                    </select>

                    {/* Period Buttons */}
                    <button
                      onClick={() => setChartPeriod('week')}
                      className={`px-4 py-2 rounded-lg text-sm transition-all ${
                        chartPeriod === 'week' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setChartPeriod('month')}
                      className={`px-4 py-2 rounded-lg text-sm transition-all ${
                        chartPeriod === 'month' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Month
                    </button>
                    <button
                      onClick={() => setChartPeriod('semester')}
                      className={`px-4 py-2 rounded-lg text-sm transition-all ${
                        chartPeriod === 'semester' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Semester
                    </button>
                  </div>
                </div>
                <div className="h-80 min-h-[320px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minHeight={320} key={`bar-chart-${chartPeriod}-${selectedSemesterFilter}`}>
                    <BarChart
                      data={departmentData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="department"
                        tick={{ fontSize: 12 }}
                        stroke="#6B7280"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        stroke="#6B7280"
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar 
                        dataKey="attendance" 
                        fill="#10B981"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Attendance Distribution Pie Chart */}
              <div className="mt-8 min-w-0">
                <h3 className="text-gray-900 text-xl mb-4">Attendance Distribution</h3>
                {attendanceDistribution.total === 0 ? (
                  <div className="bg-gray-50 rounded-xl p-8 text-center">
                    <div className="text-gray-400 mb-2">
                      <Users className="w-16 h-16 mx-auto" />
                    </div>
                    <p className="text-gray-600">No attendance data available yet</p>
                    <p className="text-sm text-gray-500 mt-1">Start taking attendance to see the distribution</p>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row items-center gap-6 min-w-0">
                    {/* Pie Chart */}
                    <div className="h-80 min-h-[320px] w-full md:w-1/2 min-w-0">
                      <ResponsiveContainer width="100%" height="100%" minHeight={320} key={`pie-chart-${attendanceDistribution.total}`}>
                        <PieChart>
                        <Pie
                          data={performanceData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value, percent }) => value > 0 ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : ''}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          onClick={(data: any) => {
                            if (data && data.name) {
                              const categoryMap: { [key: string]: 'excellent' | 'good' | 'average' | 'below-average' } = {
                                'Excellent': 'excellent',
                                'Good': 'good',
                                'Average': 'average',
                                'Below Average': 'below-average'
                              };
                              const category = categoryMap[data.name];
                              if (category) {
                                setSelectedPerformanceCategory(category);
                                setShowPerformanceCategoryView(true);
                              }
                            }
                          }}
                          cursor="pointer"
                        >
                          {performanceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} style={{ cursor: 'pointer' }} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value: any, name: any) => {
                            const percentage = attendanceDistribution.total > 0 
                              ? ((value / attendanceDistribution.total) * 100).toFixed(1)
                              : '0';
                            return [`${value} students (${percentage}%)`, name];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-col gap-3 w-full md:w-1/2">
                    <button
                      onClick={() => {
                        setSelectedPerformanceCategory('excellent');
                        setShowPerformanceCategoryView(true);
                      }}
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-green-50 rounded-lg transition-all cursor-pointer active:scale-98 border-2 border-transparent hover:border-green-200"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: '#22C55E' }}
                        ></div>
                        <span className="text-sm text-gray-700">Excellent (≥90%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{attendanceDistribution.excellent} students</span>
                        <span className="text-xs text-gray-500">
                          ({attendanceDistribution.total > 0 ? Math.round((attendanceDistribution.excellent / attendanceDistribution.total) * 100) : 0}%)
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedPerformanceCategory('good');
                        setShowPerformanceCategoryView(true);
                      }}
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-all cursor-pointer active:scale-98 border-2 border-transparent hover:border-blue-200"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: '#3B82F6' }}
                        ></div>
                        <span className="text-sm text-gray-700">Good (75-89%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{attendanceDistribution.good} students</span>
                        <span className="text-xs text-gray-500">
                          ({attendanceDistribution.total > 0 ? Math.round((attendanceDistribution.good / attendanceDistribution.total) * 100) : 0}%)
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedPerformanceCategory('average');
                        setShowPerformanceCategoryView(true);
                      }}
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-yellow-50 rounded-lg transition-all cursor-pointer active:scale-98 border-2 border-transparent hover:border-yellow-200"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: '#F59E0B' }}
                        ></div>
                        <span className="text-sm text-gray-700">Average (60-74%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{attendanceDistribution.average} students</span>
                        <span className="text-xs text-gray-500">
                          ({attendanceDistribution.total > 0 ? Math.round((attendanceDistribution.average / attendanceDistribution.total) * 100) : 0}%)
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedPerformanceCategory('below-average');
                        setShowPerformanceCategoryView(true);
                      }}
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-red-50 rounded-lg transition-all cursor-pointer active:scale-98 border-2 border-transparent hover:border-red-200"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: '#EF4444' }}
                        ></div>
                        <span className="text-sm text-gray-700">Below Average (&lt;60%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{attendanceDistribution.belowAverage} students</span>
                        <span className="text-xs text-gray-500">
                          ({attendanceDistribution.total > 0 ? Math.round((attendanceDistribution.belowAverage / attendanceDistribution.total) * 100) : 0}%)
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'user-management' && (
            <div>
              <h2 className="text-gray-900 mb-6">Student Management</h2>
              <p className="text-gray-600 mb-8">Access quick actions to manage students effectively</p>
              
              {/* Quick Action Buttons - 6 in a row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Register Button */}
                <button
                  onClick={() => setShowRegisterStudentModal(true)}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-98 border-2 border-transparent hover:border-blue-300"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                      <UserPlus className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-gray-900 mb-1">Register</h3>
                    <p className="text-gray-600 text-xs">Register new students</p>
                  </div>
                </button>

                {/* All Students */}
                <button
                  onClick={() => setShowTotalStudentsPage(true)}
                  className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-98 border-2 border-transparent hover:border-cyan-300"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-gray-900 mb-1">All Students</h3>
                    <p className="text-gray-600 text-xs">View student list</p>
                  </div>
                </button>

                {/* Attendance Report */}
                <button
                  onClick={() => setShowAttendanceReport(true)}
                  className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-98 border-2 border-transparent hover:border-orange-300"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                      <ClipboardCheck className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-gray-900 mb-1">Attendance</h3>
                    <p className="text-gray-600 text-xs">View reports</p>
                  </div>
                </button>

                {/* Materials Button */}
                <button
                  onClick={() => setShowMaterialsManagement(true)}
                  className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-98 border-2 border-transparent hover:border-purple-300"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                      {/* Materials SVG - Same as Student Portal */}
                      <svg width="40" height="40" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Bottom book - Green */}
                        <rect x="16" y="32" width="24" height="8" rx="1" fill="white" stroke="white" strokeWidth="1.5" opacity="0.9"/>
                        <rect x="16" y="32" width="4" height="8" fill="white" opacity="0.7"/>
                        <line x1="21" y1="34" x2="36" y2="34" stroke="white" strokeWidth="0.6" opacity="0.5"/>
                        <line x1="21" y1="36.5" x2="34" y2="36.5" stroke="white" strokeWidth="0.6" opacity="0.5"/>
                        
                        {/* Middle book - Orange */}
                        <rect x="18" y="23" width="24" height="8" rx="1" fill="white" stroke="white" strokeWidth="1.5" opacity="0.9"/>
                        <rect x="18" y="23" width="4" height="8" fill="white" opacity="0.7"/>
                        <line x1="23" y1="25" x2="38" y2="25" stroke="white" strokeWidth="0.6" opacity="0.5"/>
                        <line x1="23" y1="27.5" x2="36" y2="27.5" stroke="white" strokeWidth="0.6" opacity="0.5"/>
                        
                        {/* Top book - Blue */}
                        <rect x="14" y="14" width="24" height="8" rx="1" fill="white" stroke="white" strokeWidth="1.5" opacity="0.9"/>
                        <rect x="14" y="14" width="4" height="8" fill="white" opacity="0.7"/>
                        <line x1="19" y1="16" x2="34" y2="16" stroke="white" strokeWidth="0.6" opacity="0.5"/>
                        <line x1="19" y1="18.5" x2="32" y2="18.5" stroke="white" strokeWidth="0.6" opacity="0.5"/>
                      </svg>
                    </div>
                    <h3 className="text-gray-900 mb-1">Materials</h3>
                    <p className="text-gray-600 text-xs">Manage materials</p>
                  </div>
                </button>

                {/* Take Attendance Button */}
                <button
                  onClick={() => setShowTakeAttendance(true)}
                  className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-98 border-2 border-transparent hover:border-green-300"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                      <CheckSquare className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-gray-900 mb-1">Take Attendance</h3>
                    <p className="text-gray-600 text-xs">Mark attendance</p>
                  </div>
                </button>

                {/* Timetable Button */}
                <button
                  onClick={() => setShowTimetableManagement(true)}
                  className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-98 border-2 border-transparent hover:border-indigo-300"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                      {/* Timetable SVG - Same as Student Portal */}
                      <svg width="40" height="40" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Calendar top bar */}
                        <rect x="10" y="12" width="36" height="8" rx="2" fill="white" stroke="white" strokeWidth="2"/>
                        {/* Calendar main body */}
                        <rect x="10" y="18" width="36" height="26" rx="2" fill="white" stroke="white" strokeWidth="2"/>
                        {/* Top hooks */}
                        <circle cx="18" cy="18.5" r="2" fill="white"/>
                        <circle cx="28" cy="18.5" r="2" fill="white"/>
                        <circle cx="38" cy="18.5" r="2" fill="white"/>
                        {/* Grid lines */}
                        <line x1="11" y1="28" x2="45" y2="28" stroke="rgba(79, 70, 229, 0.5)" strokeWidth="1.5"/>
                        <line x1="11" y1="34" x2="45" y2="34" stroke="rgba(79, 70, 229, 0.5)" strokeWidth="1.5"/>
                        <line x1="11" y1="40" x2="45" y2="40" stroke="rgba(79, 70, 229, 0.5)" strokeWidth="1.5"/>
                        <line x1="20" y1="23" x2="20" y2="44" stroke="rgba(79, 70, 229, 0.5)" strokeWidth="1.5"/>
                        <line x1="28" y1="23" x2="28" y2="44" stroke="rgba(79, 70, 229, 0.5)" strokeWidth="1.5"/>
                        <line x1="36" y1="23" x2="36" y2="44" stroke="rgba(79, 70, 229, 0.5)" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <h3 className="text-gray-900 mb-1">Timetable</h3>
                    <p className="text-gray-600 text-xs">Manage schedules</p>
                  </div>
                </button>
              </div>

              {/* Faculty Management Section */}
              <div className="mb-6">
                <h3 className="text-gray-900 mb-4">Faculty Management</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Register Faculty */}
                  <button
                    onClick={() => setShowRegisterFacultyModal(true)}
                    className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-98 border-2 border-transparent hover:border-emerald-300"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                        <UserPlus className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-gray-900 mb-1">Register</h3>
                      <p className="text-gray-600 text-xs">Register new faculty</p>
                    </div>
                  </button>

                  {/* View All Faculty */}
                  <button
                    onClick={() => setShowTotalFacultyPage(true)}
                    className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-98 border-2 border-transparent hover:border-teal-300"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                        <GraduationCap className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-gray-900 mb-1">All Faculty</h3>
                      <p className="text-gray-600 text-xs">View faculty list</p>
                    </div>
                  </button>

                  {/* Faculty Timetable */}
                  <button
                    onClick={() => setShowAdminFacultyTimetable(true)}
                    className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-98 border-2 border-transparent hover:border-green-300"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                        <Calendar className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-gray-900 mb-1">Timetable</h3>
                      <p className="text-gray-600 text-xs">Faculty schedule</p>
                    </div>
                  </button>

                  {/* Faculty Attendance */}
                  <button
                    onClick={() => setShowFacultyAttendance(true)}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-98 border-2 border-transparent hover:border-blue-300"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                        <CheckSquare className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-gray-900 mb-1">Attendance</h3>
                      <p className="text-gray-600 text-xs">Mark attendance</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Additional Info */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-l-4 border-green-500">
                <h4 className="text-gray-900 mb-2">Quick Tips</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                  <li>Use Register to add new students and automatically update the total student count</li>
                  <li>Materials section allows you to manage all study materials uploaded by lecturers</li>
                  <li>Take Attendance feature enables marking attendance for any department, section, and semester</li>
                  <li>Timetable management helps in organizing and viewing the schedule for all departments</li>
                  <li>View detailed student performance analytics and attendance reports</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'academics' && (
            <div>
              <h2 className="text-gray-900 mb-4">Academics</h2>
              <p className="text-gray-600">Academic management tools will appear here.</p>
              
              {/* Button to open academics management */}
              <button
                onClick={() => setShowAcademicsManagement(true)}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-md transition-all hover:from-green-700 hover:to-emerald-700 active:scale-95 flex items-center justify-center gap-2"
              >
                <BookOpen className="w-6 h-6" />
                <span className="font-medium text-lg">Manage Academics</span>
              </button>
            </div>
          )}

          {activeSection === 'links' && (
            <div>
              <h2 className="text-gray-900 mb-4">Links</h2>
              <p className="text-gray-600 mb-6">Manage important links for students and faculty.</p>
              
              {/* Button to open links management */}
              <button
                onClick={() => setShowLinksManagement(true)}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-md transition-all hover:from-green-700 hover:to-emerald-700 active:scale-95 flex items-center justify-center gap-2"
              >
                <LinkIcon className="w-6 h-6" />
                <span className="font-medium text-lg">Manage Links</span>
              </button>
            </div>
          )}

          {activeSection === 'blood-bank' && (
            <div>
              <h2 className="text-gray-900 mb-4">Blood Bank</h2>
              <p className="text-gray-600 mb-6">Manage blood donation records and requests.</p>
              
              {/* Button to open blood bank management */}
              <button
                onClick={() => setShowBloodBank(true)}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-xl shadow-md transition-all hover:from-red-700 hover:to-red-800 active:scale-95 flex items-center justify-center gap-2"
              >
                <FolderOpen className="w-6 h-6" />
                <span className="font-medium text-lg">Manage Blood Bank</span>
              </button>
            </div>
          )}

          {activeSection === 'quote' && (
            <div>
              <h2 className="text-gray-900 mb-4">Quote Management</h2>
              <p className="text-gray-600 mb-6">Add and manage daily motivational quotes for students.</p>
              
              {/* Button to open quote management */}
              <button
                onClick={() => setShowQuoteManagement(true)}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-md transition-all hover:from-green-700 hover:to-emerald-700 active:scale-95 flex items-center justify-center gap-2"
              >
                <FileText className="w-6 h-6" />
                <span className="font-medium text-lg">Manage Quotes</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Notice Modal */}
      {showAddNoticeModal && (
        <AddNoticeModal
          onClose={() => setShowAddNoticeModal(false)}
          onSubmit={handleAddNotice}
        />
      )}

      {/* Register Student Modal */}
      {showRegisterStudentModal && (
        <RegisterStudentModal
          onClose={() => setShowRegisterStudentModal(false)}
          onSubmit={handleRegisterStudent}
        />
      )}

      {/* Register Faculty Modal */}
      {showRegisterFacultyModal && (
        <RegisterFacultyModal
          onClose={() => setShowRegisterFacultyModal(false)}
          onSubmit={handleRegisterFaculty}
        />
      )}
    </div>
  );
}





