# 🗄 Database Schema Visual Diagram

## Entity Relationship Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         EDUCATIONAL INSTITUTION MANAGEMENT SYSTEM             │
│                              Database Schema Diagram                          │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORE AUTHENTICATION & USERS                        │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │    users     │ ◄──────────────────────┐
    ├──────────────┤                        │
    │ id (PK)      │                        │
    │ email        │                        │
    │ password_hash│                        │
    │ role         │ (student/faculty/admin)│
    │ is_active    │                        │
    │ created_at   │                        │
    └──────┬───────┘                        │
           │                                │
           │ 1:1                            │ 1:1
           ├────────────────┬───────────────┴──────────────┐
           │                │                              │
           ▼                ▼                              ▼
    ┌──────────────┐  ┌──────────────┐            ┌──────────────┐
    │   students   │  │   faculty    │            │ admin (users)│
    ├──────────────┤  ├──────────────┤            └──────────────┘
    │ id (PK)      │  │ id (PK)      │
    │ user_id (FK) │  │ user_id (FK) │
    │ reg_number   │  │ employee_id  │
    │ roll_number  │  │ name         │
    │ name         │  │ department_id│◄───┐
    │ department_id│◄─┐│ designation  │    │
    │ semester_id  │◄─┼│ phone        │    │
    │ phone        │  ││ blood_group  │    │
    │ blood_group  │  │└──────────────┘    │
    │ profile_image│  │                    │
    └──────────────┘  │                    │
                      │                    │

┌─────────────────────────────────────────────────────────────────────────────┐
│                        ACADEMIC STRUCTURE                                    │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │  academic_years │
    ├─────────────────┤
    │ id (PK)         │
    │ year_label      │ ('2024-2025')
    │ start_date      │
    │ end_date        │
    │ is_current      │
    └─────────────────┘
                │
                │ 1:N
                ▼
    ┌─────────────────┐         ┌──────────────┐
    │  departments    │         │  semesters   │
    ├─────────────────┤    ┌───►├──────────────┤
    │ id (PK)         │    │    │ id (PK)      │
    │ code            │◄───┘    │ semester_num │ (1-6)
    │ name            │         │ department_id│◄──┐
    │ hod_faculty_id  │         │ academic_year│   │
    │ is_active       │         │ start_date   │   │
    └────────┬────────┘         │ end_date     │   │
             │                  │ is_current   │   │
             │ 1:N              └──────────────┘   │
             │                         │           │
             │                         │ 1:N       │
             │                         ▼           │
             │                  ┌──────────────┐   │
             │                  │   courses    │   │
             └─────────────────►├──────────────┤   │
                                │ id (PK)      │   │
                                │ code         │   │
                                │ name         │   │
                                │ department_id│───┘
                                │ semester_id  │───┐
                                │ credits      │   │
                                │ faculty_id   │   │
                                └──────────────┘   │
                                                   │

┌─────────────────────────────────────────────────────────────────────────────┐
│                    HOLIDAY & ATTENDANCE CONTROL SYSTEM                       │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────┐
    │  holiday_calendar    │
    ├──────────────────────┤
    │ id (PK)              │
    │ date                 │ (UNIQUE)
    │ is_holiday           │
    │ is_closed            │
    │ holiday_name         │
    │ is_locked            │
    │ created_by           │
    └──────┬───────────────┘
           │
           │ 1:N
           ├─────────────────────┬───────────────────────┐
           ▼                     ▼                       ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │  period_blocks   │  │ blocking_filters │  │                  │
    ├──────────────────┤  ├──────────────────┤  │                  │
    │ id (PK)          │  │ id (PK)          │  │                  │
    │ holiday_cal_id   │  │ holiday_cal_id   │  │                  │
    │ session          │  │ filter_type      │  │                  │
    │ period_number    │  └────────┬─────────┘  │                  │
    │ is_blocked       │           │            │                  │
    └──────────────────┘           │ 1:N        │                  │
                                   │            │                  │
           ┌───────────────────────┼────────────┼──────────────────┘
           │                       │            │
           ▼                       ▼            ▼
    ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
    │ blocking_filter_     │ │ blocking_filter_     │ │ blocking_filter_     │
    │   semesters          │ │   courses            │ │   faculty            │
    ├──────────────────────┤ ├──────────────────────┤ ├──────────────────────┤
    │ id (PK)              │ │ id (PK)              │ │ id (PK)              │
    │ blocking_filter_id   │ │ blocking_filter_id   │ │ blocking_filter_id   │
    │ semester_id (FK)     │ │ department_id (FK)   │ │ faculty_id (FK)      │
    │ semester_number      │ └──────────────────────┘ └──────────────────────┘
    └──────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           ATTENDANCE TRACKING SYSTEM                         │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────┐
    │ attendance_sessions  │
    ├──────────────────────┤
    │ id (PK)              │
    │ faculty_id (FK)      │
    │ course_id (FK)       │
    │ date                 │
    │ session              │ (morning/afternoon)
    │ period_number        │ (1-5)
    │ room_number          │
    │ start_time           │
    │ end_time             │
    │ status               │ (pending/active/completed)
    │ is_marked            │
    └──────┬───────────────┘
           │
           │ 1:N
           ▼
    ┌──────────────────────┐
    │ attendance_records   │
    ├──────────────────────┤
    │ id (PK)              │
    │ attendance_session_id│
    │ student_id (FK)      │
    │ is_present           │
    │ marked_at            │
    │ remarks              │
    └──────────────────────┘

    ┌──────────────────────┐
    │ faculty_active_status│
    ├──────────────────────┤
    │ id (PK)              │
    │ faculty_id (FK)      │ (UNIQUE)
    │ is_active            │
    │ current_period       │
    │ subject              │
    │ class                │
    │ room                 │
    │ time_range           │
    │ last_updated         │
    └──────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          NOTICE BOARD SYSTEM                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────┐
    │      notices         │
    ├──────────────────────┤
    │ id (PK)              │
    │ title                │
    │ content              │
    │ priority             │ (low/normal/high/urgent)
    │ category             │
    │ color_class          │
    │ target_role[]        │ (ARRAY: ['student', 'faculty'])
    │ department_id (FK)   │ (nullable - for all depts)
    │ semester_number      │ (nullable - for all semesters)
    │ attachment_url       │
    │ is_pinned            │
    │ is_published         │
    │ published_by (FK)    │
    │ published_at         │
    │ expires_at           │
    │ view_count           │
    └──────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                   COMPLAINT BOX (WhatsApp-style Chat)                        │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────┐
    │    complaints        │
    ├──────────────────────┤
    │ id (PK)              │
    │ complaint_number     │ (UNIQUE: 'CMP-2024-0001')
    │ subject              │
    │ category             │
    │ priority             │ (low/medium/high/critical)
    │ status               │ (open/in_progress/resolved/closed)
    │ created_by (FK)      │
    │ created_by_role      │
    │ assigned_to (FK)     │
    │ department_id (FK)   │
    │ is_anonymous         │
    │ resolved_at          │
    │ closed_at            │
    └──────┬───────────────┘
           │
           │ 1:N
           ▼
    ┌──────────────────────┐
    │ complaint_messages   │
    ├──────────────────────┤
    │ id (PK)              │
    │ complaint_id (FK)    │
    │ sender_id (FK)       │
    │ sender_role          │
    │ message              │
    │ attachment_url       │
    │ attachment_type      │
    │ is_read              │
    │ is_system_message    │
    │ created_at           │
    └──────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        STUDY MATERIALS SYSTEM                                │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────┐
    │  study_materials     │
    ├──────────────────────┤
    │ id (PK)              │
    │ title                │
    │ description          │
    │ course_id (FK)       │
    │ department_id (FK)   │
    │ semester_number      │ (1-6)
    │ unit_number          │ (1-5)
    │ material_type        │ (lecture_notes/assignment/etc)
    │ file_url             │
    │ file_name            │
    │ file_size            │
    │ file_type            │ (pdf/ppt/doc)
    │ uploaded_by (FK)     │ (faculty)
    │ download_count       │
    │ is_published         │
    │ published_at         │
    └──────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          TIMETABLE SYSTEM                                    │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────┐
    │   timetable_slots    │
    ├──────────────────────┤
    │ id (PK)              │
    │ day_of_week          │ (Monday-Saturday)
    │ session              │ (morning/afternoon)
    │ period_number        │ (1-5)
    │ start_time           │
    │ end_time             │
    │ department_id (FK)   │
    │ semester_id (FK)     │
    │ course_id (FK)       │
    │ faculty_id (FK)      │
    │ room_number          │
    │ is_active            │
    │ academic_year        │
    └──────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          ADDITIONAL FEATURES                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
    │    blood_bank        │  │  important_links     │  │  system_settings     │
    ├──────────────────────┤  ├──────────────────────┤  ├──────────────────────┤
    │ id (PK)              │  │ id (PK)              │  │ id (PK)              │
    │ donor_type           │  │ title                │  │ setting_key (UNIQUE) │
    │ donor_id             │  │ url                  │  │ setting_value        │
    │ name                 │  │ description          │  │ setting_type         │
    │ blood_group          │  │ category             │  │ description          │
    │ phone                │  │ icon_name            │  │ updated_by (FK)      │
    │ email                │  │ target_role[]        │  │ updated_at           │
    │ last_donation_date   │  │ display_order        │  └──────────────────────┘
    │ is_available         │  │ is_active            │
    └──────────────────────┘  │ created_by (FK)      │
                              └──────────────────────┘

    ┌──────────────────────┐
    │    audit_logs        │
    ├──────────────────────┤
    │ id (PK)              │
    │ user_id (FK)         │
    │ action               │ (create/update/delete/login)
    │ entity_type          │ (student/notice/attendance)
    │ entity_id            │
    │ old_values (JSONB)   │
    │ new_values (JSONB)   │
    │ ip_address           │
    │ user_agent           │
    │ created_at           │
    └──────────────────────┘

```

## 📊 Key Relationships Summary

### One-to-One (1:1)
- `users` ↔ `students`
- `users` ↔ `faculty`
- `faculty` ↔ `faculty_active_status`

### One-to-Many (1:N)
- `departments` → `students`
- `departments` → `faculty`
- `departments` → `courses`
- `semesters` → `students`
- `semesters` → `courses`
- `faculty` → `courses` (instructor)
- `faculty` → `study_materials` (uploader)
- `holiday_calendar` → `period_blocks`
- `holiday_calendar` → `blocking_filters`
- `blocking_filters` → `blocking_filter_semesters`
- `blocking_filters` → `blocking_filter_courses`
- `blocking_filters` → `blocking_filter_faculty`
- `attendance_sessions` → `attendance_records`
- `complaints` → `complaint_messages`

### Many-to-Many (M:N)
- `semesters` ↔ `courses` (through semester_id in courses)
- `faculty` ↔ `timetable_slots` (faculty can teach multiple slots)
- `courses` ↔ `timetable_slots` (course can have multiple time slots)

## 🔑 Important Indexes

**Performance-Critical Indexes:**
```sql
-- Authentication
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Students
CREATE INDEX idx_students_reg_no ON students(registration_number);
CREATE INDEX idx_students_dept ON students(department_id);
CREATE INDEX idx_students_semester ON students(semester_id);

-- Faculty
CREATE INDEX idx_faculty_emp_id ON faculty(employee_id);
CREATE INDEX idx_faculty_dept ON faculty(department_id);

-- Holiday System
CREATE INDEX idx_holiday_date ON holiday_calendar(date);
CREATE INDEX idx_period_blocks_holiday ON period_blocks(holiday_calendar_id);

-- Attendance
CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(date);
CREATE INDEX idx_attendance_sessions_faculty ON attendance_sessions(faculty_id);
CREATE INDEX idx_attendance_records_student ON attendance_records(student_id);
CREATE UNIQUE INDEX idx_attendance_unique ON attendance_records(attendance_session_id, student_id);

-- Notices
CREATE INDEX idx_notices_published ON notices(published_at DESC);
CREATE INDEX idx_notices_dept ON notices(department_id);

-- Complaints
CREATE INDEX idx_complaints_number ON complaints(complaint_number);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaint_messages_complaint ON complaint_messages(complaint_id);

-- Timetable
CREATE INDEX idx_timetable_day ON timetable_slots(day_of_week);
CREATE INDEX idx_timetable_faculty ON timetable_slots(faculty_id);

-- Audit
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

## 🔒 Constraints & Validations

### CHECK Constraints
```sql
-- Role validation
role CHECK (role IN ('student', 'faculty', 'admin'))

-- Semester validation
semester_number CHECK (semester_number BETWEEN 1 AND 6)

-- Period validation
period_number CHECK (period_number BETWEEN 1 AND 5)

-- Session validation
session CHECK (session IN ('morning', 'afternoon'))

-- Status validations
priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
attendance_status CHECK (status IN ('pending', 'active', 'completed'))
```

### UNIQUE Constraints
```sql
-- Prevent duplicates
UNIQUE(email) ON users
UNIQUE(registration_number) ON students
UNIQUE(employee_id) ON faculty
UNIQUE(complaint_number) ON complaints
UNIQUE(date) ON holiday_calendar
UNIQUE(setting_key) ON system_settings
UNIQUE(attendance_session_id, student_id) ON attendance_records
UNIQUE(holiday_calendar_id, session, period_number) ON period_blocks
```

## 📈 Data Volume Estimates

For a college with **3000 students**, **200 faculty**, **5 departments**:

| Table | Estimated Rows | Growth Rate |
|-------|----------------|-------------|
| users | ~3,200 | Low |
| students | ~3,000 | +500/year |
| faculty | ~200 | +20/year |
| departments | 5 | Static |
| semesters | 30 | +6/year |
| courses | ~150 | +10/year |
| holiday_calendar | ~365/year | 365/year |
| period_blocks | ~1,000/year | 1,000/year |
| attendance_sessions | ~50,000/year | 50,000/year |
| attendance_records | ~1.5M/year | 1.5M/year |
| notices | ~500/year | 500/year |
| complaints | ~1,000/year | 1,000/year |
| complaint_messages | ~5,000/year | 5,000/year |
| study_materials | ~2,000 | 500/year |
| timetable_slots | ~3,000 | Moderate |
| audit_logs | ~100,000/year | 100,000/year |

**Total Database Size Estimate**: 500 MB - 2 GB per academic year

## 🔄 Data Lifecycle

### Academic Year Rollover Process
1. Archive previous year's attendance data
2. Create new academic year entry
3. Update semesters (increment or reset)
4. Promote students to next semester
5. Reset timetable for new year
6. Archive old notices and materials

### Retention Policy
- **Attendance Records**: 7 years
- **Audit Logs**: 3 years
- **Complaints**: 2 years after closure
- **Notices**: 1 year after expiry
- **Study Materials**: Keep indefinitely

---

**Version**: 1.0.0  
**Last Updated**: January 2026
