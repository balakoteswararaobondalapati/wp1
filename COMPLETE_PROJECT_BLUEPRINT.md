in:   admin@college.edu / admin123');
    console.log('   Faculty: priya.faculty@college.edu / faculty123');
    console.log('   Student: rahul2024@college.edu / student123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
```

```bash
# Run seed
node server/seeds/seed.js

# Start backend
node server/index.js
# or with nodemon:
npx nodemon server/index.js

# Start frontend
npm run dev
```

---

# PART N — FULL INTEGRATION MAP

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                 COMPLETE SYSTEM INTEGRATION MAP                           ║
║         React 18 + TypeScript  ←HTTP/WS→  Express.js  ←SQL→  PostgreSQL  ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL TABLES                                 │
│                                                                           │
│  USERS:       admins · faculty · students · departments                   │
│  AUTH:        refresh_tokens · otp_codes                                  │
│  ACADEMIC:    subjects · faculty_subjects                                 │
│  TIMETABLE:   timetable_slots · timetable_overrides · faculty_date_status │
│  ATTENDANCE:  student_attendance · attendance_audit_log · attendance_locks │
│  CONTENT:     materials · notices · quotes · links                        │
│  COMMS:       complaints · complaint_messages · complaint_attachments      │
│  PERMISSIONS: permissions · permission_attachments                        │
│  CALENDAR:    holidays · period_blocks                                    │
│  COMMUNITY:   blood_bank                                                  │
│  VIEWS:       v_student_attendance_summary · v_faculty_teaching_load      │
│               v_daily_class_attendance                                    │
└──────────────────────────────────────────────────────────────────────────┘
                               ↑↓ SQL queries via pg Pool
┌──────────────────────────────────────────────────────────────────────────┐
│                         EXPRESS.JS API SERVER                             │
│                                                                           │
│  Middleware: helmet · cors · morgan · express-json · rateLimit            │
│  Auth:       JWT verifyToken · requireRole                                │
│  Upload:     multer → uploads/{avatars,materials,complaints,permissions}  │
│  Validate:   express-validator per route                                  │
│  WebSocket:  ws server → broadcast to {all,role,user,class}              │
│                                                                           │
│  Routes → Controllers → DB queries → Response + WS broadcast             │
└──────────────────────────────────────────────────────────────────────────┘
                         ↑↓ REST HTTP + WebSocket
┌──────────────────────────────────────────────────────────────────────────┐
│                         REACT FRONTEND                                    │
│                                                                           │
│  Providers (wrap entire app):                                             │
│    AuthProvider → JWT state (accessToken in memory, auto-refresh)        │
│    ProfilePhotoProvider → global modal for every profile icon            │
│    NoticesProvider → shared notices state                                │
│                                                                           │
│  API Layer (api/index.ts):                                               │
│    Axios instance with interceptors                                       │
│    All API modules: authAPI, studentsAPI, facultyAPI, timetableAPI,      │
│    attendanceAPI, materialsAPI, complaintsAPI, permissionsAPI,           │
│    noticesAPI, holidaysAPI, bloodbankAPI, linksAPI, quotesAPI            │
│                                                                           │
│  WebSocket Hook (useWebSocket.ts):                                       │
│    Connects to ws://server/ws?token=<accessToken>                        │
│    Handles events → triggers refetch/state updates                       │
└──────────────────────────────────────────────────────────────────────────┘

STUDENT PORTAL (/student):
  StudentDashboard
    ├─ GET /api/auth/me → profile
    ├─ GET /api/timetable → today's classes
    ├─ GET /api/notices → 3 latest
    ├─ GET /api/holidays/check → banner
    ├─ GET /api/quotes/today → quote card
    ├─ GET /api/attendance/summary → overall %
    ├─ WS 'attendance:updated' → refresh %
    ├─ WS 'notice:created' → toast
    ├─ WS 'complaint:reply' → unread dot
    └─ WS 'permission:updated' → status toast
  AttendanceOverviewPage → GET /api/attendance/summary/:id
  MonthlyCalendar → GET /api/attendance/monthly
  MaterialsPage → GET /api/materials/subjects
  SubjectMaterialsPage → GET /api/materials?subject_id=
  TimetablePage → GET /api/timetable?course=&semester=&section=
  NoticeBoardPage → GET /api/notices?audience=student
  ComplaintBox → GET/POST /api/complaints + POST /api/complaints/:id/reply
  PermissionsPage → GET/POST /api/permissions
  ProfilePage → GET/PUT /api/auth/me + PATCH /api/students/:id/avatar
  LinksPage → GET /api/links?audience=student

FACULTY PORTAL (/faculty):
  FacultyDashboard
    ├─ GET /api/auth/me
    ├─ GET /api/timetable/today?faculty_id=
    ├─ GET /api/holidays/check
    ├─ GET /api/faculty-status/blocked?date=&faculty_id=
    ├─ GET /api/notices?audience=faculty
    ├─ WS 'faculty:status' → block/unblock buttons
    ├─ WS 'holiday:updated' → refresh banner
    └─ WS 'timetable:updated' → refresh schedule
  AddAttendancePage
    ├─ GET /api/students?course=&semester=&section=
    ├─ GET /api/attendance/lock-status
    └─ POST /api/attendance/bulk → WS broadcasts attendance:updated
  AddMaterialsPage
    ├─ GET /api/faculty/:id/subjects
    └─ POST /api/materials → WS broadcasts material:uploaded
  FacultyTimetablePage → GET /api/timetable/faculty/:id
  FacultyProfilePage → GET/PUT /api/auth/me + PATCH /api/faculty/:id/avatar

ADMIN PORTAL (/admin):
  AdminDashboard
    ├─ GET /api/students (count)
    ├─ GET /api/faculty (count)
    ├─ GET /api/attendance/daily-report
    ├─ GET /api/complaints/unread-count (poll 60s)
    ├─ GET /api/permissions/pending-count (poll 60s)
    └─ WS all events → update charts + badges
  
  ── User Management ──
  TotalStudentsPage → GET /api/students + filters
  TotalFacultyPage → GET /api/faculty + filters
  RegisterStudentModal → POST /api/students
  RegisterFacultyModal → POST /api/faculty
  
  ── Academics ──
  AdminAcademicsManagement
    ├─ GET/POST/PUT/DELETE /api/subjects
    └─ POST/DELETE /api/subjects/assign-faculty
  AdminTimetableManagement
    ├─ GET /api/timetable
    ├─ GET /api/subjects (for dropdowns)
    ├─ GET /api/faculty (for dropdowns)
    └─ POST/PUT/DELETE /api/timetable/slot → WS timetable:updated
  AdminFacultyTimetablePage
    ├─ GET /api/timetable/faculty/:id
    ├─ POST /api/faculty-status → WS faculty:status
    └─ POST /api/timetable/override
  AdminAttendanceSystem
    └─ POST /api/attendance/bulk (admin) → WS attendance:updated
  AdminViewEditAttendance
    ├─ GET /api/attendance (with filters)
    ├─ PUT /api/attendance/:id → audit log created
    └─ POST /api/attendance/lock
  DailyAttendanceReport → GET /api/attendance/daily-report
  AdminFacultyAttendance
    ├─ GET /api/faculty-status?date=
    └─ GET /api/faculty-status/monthly
  
  ── Communications ──
  AdminComplaintsManagement
    ├─ GET /api/complaints (poll 10s)
    ├─ POST /api/complaints/:id/reply → WS complaint:reply to student
    ├─ PUT /api/complaints/:id/status
    └─ PUT /api/complaints/:id/assign
  AdminPermissionManagement
    ├─ GET /api/permissions
    └─ PUT /api/permissions/:id/review → WS permission:updated to student
  
  ── Content ──
  AdminMaterialsManagement → GET/DELETE /api/materials
  AdminNoticeManagement
    ├─ GET /api/notices
    ├─ POST /api/notices → WS notice:created to audience
    ├─ PUT /api/notices/:id
    └─ DELETE /api/notices/:id → WS notice:deleted
  HolidayAttendanceCalendar
    ├─ GET/POST/DELETE /api/holidays → WS holiday:updated
    ├─ GET/POST/DELETE /api/period-blocks
    └─ PATCH /api/holidays/:id/permission
  
  ── Other ──
  AdminBloodBank → GET/POST/PUT/PATCH/DELETE /api/bloodbank
  AdminLinksManagement → GET/POST/PUT/DELETE /api/links
  QuoteManagementPage → GET/POST/PUT/DELETE /api/quotes

CROSS-CUTTING:
  ProfilePhotoModal ← ProfileAvatar (in EVERY component)
    → showProfilePhoto(name, avatarUrl, theme, onViewProfile?)
    → renders globally via ProfilePhotoProvider
    → Avatar upload → PATCH /api/[students|faculty|admins]/:id/avatar
    → GET /api/auth/me refreshed in AuthContext
    → All avatar instances re-render via context

BIDIRECTIONAL SYNC (single timetable_slots table):
  AdminTimetableManagement ──write──► timetable_slots ◄──read── AdminFacultyTimetablePage
  AdminFacultyTimetablePage ──write──► timetable_overrides ──read──► FacultyDashboard today

ATTENDANCE VALIDATION CHAIN (every bulk mark request):
  request → check holiday → check faculty absent → check lock → check admin-already-marked → mark

COURSE/SECTION CONSTRAINT ENFORCEMENT:
  PostgreSQL CHECK constraint ──► server validator ──► frontend dynamic dropdown
  (BCA→B1,B2) (BSc→A1,A2,B,C,D,G,K) (BCom→D,E)
```

---

*This document is the single definitive reference for the complete project.*
*Every database table, every API endpoint, every React component, every workflow,*
*every edge case, and every system integration is documented above.*
*Stack: React 18 + TypeScript · Express.js 4 · PostgreSQL 15 · JWT · WebSocket*
*No localStorage · No Supabase · Pure PostgreSQL + Express backend*
