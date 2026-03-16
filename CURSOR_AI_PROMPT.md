# 🤖 Cursor AI Backend Development Prompt

**Copy this into Cursor AI to build the backend:**

---

## 🎯 Build: Educational Institution Management System Backend

### Tech Stack
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT + Passport.js
- **Real-time:** Socket.io
- **Upload:** Multer + AWS S3
- **PDF:** pdfkit
- **Validation:** Zod

### 🗄️ Database (25 Tables)

**Users & Roles:**
- `users`, `students`, `faculty`, `departments`, `semesters`, `courses`

**Holiday & Attendance Control (Priority):**
- `holiday_calendar`, `period_blocks`, `blocking_filters`
- `blocking_filter_semesters`, `blocking_filter_courses`, `blocking_filter_faculty`
- Filter types: `all`, `semester`, `course`, `faculty`

**Attendance:**
- `attendance_sessions`, `attendance_records`, `faculty_active_status`

**Communication:**
- `notices`, `complaints`, `complaint_messages`

**Content:**
- `study_materials`, `timetable_slots`

**Other:**
- `blood_bank`, `important_links`, `academic_years`, `system_settings`, `audit_logs`

### 🔐 Authentication

**JWT Payload:**
```json
{
  "userId": 123,
  "email": "user@college.edu",
  "role": "student|faculty|admin",
  "roleId": 456
}
```

**Required Endpoints:**
- POST `/api/auth/login`
- POST `/api/auth/logout`
- POST `/api/auth/refresh-token`
- GET `/api/auth/me`

### 🚀 Priority APIs (Holiday & Attendance Control)

```
GET/POST/PUT/DELETE  /api/holidays
POST                  /api/holidays/:id/lock
POST                  /api/holidays/:id/period-blocks
POST                  /api/holidays/:id/filters
GET                   /api/holidays/check/:date/student/:studentId
GET                   /api/holidays/check/:date/faculty/:facultyId
GET                   /api/holidays/month/:year/:month
```

**Filtering Logic:**
- `all` → Block everyone
- `semester` → Block selected semesters (1-6)
- `course` → Block selected courses (BCA, BCOM, BSC)
- `faculty` → Block selected faculty members

### 📋 Other Required APIs

**Students:** CRUD + `/students/:id/attendance-summary`  
**Faculty:** CRUD + `/faculty/:id/schedule` + `/faculty/:id/active-status`  
**Attendance:** Sessions + Records + Daily Reports + PDF Export  
**Notices:** CRUD + Pin/Unpin + Role-based filtering  
**Complaints:** CRUD + WhatsApp-style chat messages  
**Materials:** Upload/Download + Course filtering  
**Timetable:** Student/Faculty schedules  

### 🔄 Real-time (Socket.io)

**Events:**
- `holidayDataUpdated` - Admin modifies holiday calendar
- `facultyStatusChanged` - Faculty marks period active
- `newMessage` - Complaint chat messages
- `noticePublished` - New notice alerts

**Room Strategy:**
- `role_${role}` - Role-based broadcasts
- `complaint_${id}` - Complaint chat rooms

### 🎨 Response Format

**Success:**
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": []
  }
}
```

### 📦 Environment Variables

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/college_db
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=7d
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
```

### ✅ Implementation Order

1. **Setup** → Project structure + Prisma schema + migrations
2. **Auth** → JWT + middleware + login/logout
3. **Holiday Control** → Calendar + Period blocking + Filters + WebSocket
4. **Attendance** → Sessions + Records + Reports + PDF
5. **Notices & Complaints** → CRUD + Real-time chat
6. **Materials & Timetable** → Upload/Download + Scheduling
7. **Testing & Docs** → Unit tests + Swagger

### 🔑 Key Requirements

- ✅ TypeScript strict mode
- ✅ Zod validation for all inputs
- ✅ Role-based authorization middleware
- ✅ Audit logging for all critical operations
- ✅ Proper error handling with centralized middleware
- ✅ File upload with size/type validation
- ✅ PDF generation for reports
- ✅ Real-time updates via Socket.io
- ✅ Database indexing for performance
- ✅ Soft deletes (is_active flags)

### 🎯 Success Criteria

Backend is complete when:
- All APIs functional + tested
- Authentication working with JWT
- Real-time WebSocket operational
- File upload/download working
- PDF reports generating
- Consistent response formats
- API documentation (Swagger)
- Database seeded with sample data

---

**Start with:** Project setup → Prisma schema → Auth system → Holiday APIs → Real-time events

Ask questions if you need clarification!
