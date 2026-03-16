pabase.from('students').select('*');
      if (error) throw error;
      return data;
    } else {
      // Hybrid: try Supabase first, fallback to localStorage
      try {
        const { data, error } = await supabase.from('students').select('*');
        if (error) throw error;
        return data;
      } catch (e) {
        return JSON.parse(localStorage.getItem('students') || '[]');
      }
    }
  },
  
  async createStudent(studentData) {
    if (this.mode === 'localStorage') {
      const students = JSON.parse(localStorage.getItem('students') || '[]');
      students.push({ id: generateId(), ...studentData, created_at: new Date() });
      localStorage.setItem('students', JSON.stringify(students));
      return students[students.length - 1];
    } else if (this.mode === 'supabase') {
      const { data, error } = await supabase
        .from('students')
        .insert(studentData)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }
  
  // Similar methods for other operations...
};
```

---

## Integration Map

### Visual Integration Map

```
┌──────────────────────────────────────────────────────────────────────┐
│                         INTEGRATION MAP                               │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  AUTHENTICATION │
└────────┬────────┘
         │
         ├──────────────────────────────────────────────────┐
         │                                                   │
         ▼                                                   ▼
┌────────────────┐                                  ┌───────────────┐
│ STUDENT PORTAL │                                  │ FACULTY PORTAL│
└────────┬───────┘                                  └───────┬───────┘
         │                                                   │
         ├─► View Profile ────────────────────┐            ├─► View Profile
         ├─► View Attendance                  │            ├─► Take Attendance ──┐
         │     │                               │            │     │               │
         │     └─► Subject-wise breakdown     │            │     └─► Validate ───┤
         │     └─► Monthly trends             │            │         ├─ Holiday? │
         │                                     │            │         ├─ Absent?  │
         ├─► View Materials                   │            │         └─ Locked?  │
         │     │                               │            │                     │
         │     └─► Filter by subject/unit     │            ├─► View Schedule     │
         │     └─► Download/Preview           │            │     │               │
         │                                     │            │     └─► Sync with   │
         ├─► View Timetable                   │            │         timetable   │
         │     │                               │            │                     │
         │     └─► Daily schedule             │            ├─► Upload Materials  │
         │     └─► Subject assignments        │            │     │               │
         │                                     │            │     └─► Store files │
         ├─► Submit Complaints                │            │                     │
         │     │                               │            ├─► Handle Complaints│
         │     └─► With attachments           │            │     │               │
         │     └─► Track status               │            │     └─► Reply with  │
         │     └─► View replies               │            │         attachments │
         │                                     │            │                     │
         ├─► Request Permissions              │            └─► View Notices      │
         │     │                               │                                  │
         │     └─► With documents             │                                  │
         │     └─► Track approval            │                                  │
         │                                     │                                  │
         └─► View Notices                     │                                  │
                                              │                                  │
         ┌────────────────────────────────────┘                                  │
         │                                                                        │
         ▼                                                                        │
┌─────────────────┐                                                              │
│  ADMIN PORTAL   │◄─────────────────────────────────────────────────────────────┘
└────────┬────────┘
         │
         ├─► Dashboard Analytics
         │     │
         │     ├─► Total students/faculty
         │     ├─► Attendance overview ──► Interactive charts ──► Student lists
         │     ├─► Complaint statistics
         │     └─► Material statistics
         │
         ├─► Academic Management
         │     │
         │     ├─► Manage Students (CRUD)
         │     │     └─► Triggers attendance recalculation
         │     │
         │     ├─► Manage Faculty (CRUD)
         │     │     └─► Triggers schedule update
         │     │
         │     └─► Manage Admins (CRUD)
         │
         ├─► Timetable Management ◄────────────────────┐
         │     │                                        │
         │     ├─► Calendar view                       │ Bidirectional
         │     ├─► Period allocation                   │ Sync
         │     ├─► Faculty assignment ──────────────────┤
         │     └─► Auto date-change detection          │
         │                                              │
         ├─► Faculty Teaching Schedule ◄────────────────┘
         │     │
         │     ├─► Mark faculty absent ──► Block attendance taking
         │     ├─► Assign replacements ──► One-day period override
         │     └─► View teaching load
         │
         ├─► Attendance Management
         │     │
         │     ├─► Take attendance for any class
         │     ├─► Modify attendance ──► Create audit log
         │     ├─► Lock attendance ──► Prevent further changes
         │     └─► View attendance reports
         │
         ├─► Inactive Faculty Management
         │     │
         │     ├─► View inactive faculty
         │     ├─► Assign specific classes ──► Update permissions
         │     └─► Allow limited attendance access
         │
         ├─► Complaints Management
         │     │
         │     ├─► View all complaints ──► Badge count updates
         │     ├─► Assign to faculty
         │     ├─► Reply with attachments
         │     └─► Update status/priority
         │
         ├─► Permissions Management
         │     │
         │     ├─► View all permission requests
         │     ├─► Approve/Reject with notes
         │     └─► Track by date/student
         │
         ├─► Materials Management
         │     │
         │     ├─► View all materials
         │     ├─► Filter by course/subject/unit
         │     └─► Delete any material
         │
         ├─► Notice Board
         │     │
         │     ├─► Create notices
         │     ├─► Target specific audience
         │     ├─► Set priority/expiry
         │     └─► Edit/Delete notices
         │
         └─► Holiday Management
               │
               ├─► Mark holidays ──► Update all calendars
               │                 └─► Disable attendance for date
               │
               └─► View holiday list

┌──────────────────────────────────────────────────────────────────────┐
│                       CROSS-CUTTING CONCERNS                          │
└──────────────────────────────────────────────────────────────────────┘

Profile Photo System:
  ├─► Every profile icon clickable
  ├─► Opens ProfilePhotoModal
  ├─► Shows full details
  └─► Theme-colored based on role

File Attachments:
  ├─► Complaints (Student → Admin/Faculty)
  ├─► Permissions (Student → Admin)
  ├─► Materials (Faculty → Students)
  ├─► Base64 storage (current)
  └─► Supabase Storage (future)

Real-time Sync:
  ├─► Custom events (current)
  │     └─► LocalStorage-based
  └─► Supabase Realtime (future)
        └─► WebSocket-based

Data Flow:
  ├─► LocalStorage (100% current)
  ├─► PostgreSQL (planned)
  └─► Bidirectional sync between:
        ├─ Timetable ←→ Faculty Schedule
        ├─ Attendance ←→ Student Stats
        ├─ Faculty Status ←→ Attendance Access
        └─ Holiday ←→ All Calendars

Security:
  ├─► Role-based access control
  ├─► Row Level Security (future)
  ├─► JWT authentication
  └─► Input validation
```

---

## Conclusion

This workflow document provides a complete map of:

1. **Architecture**: 3-tier architecture with clear separation of concerns
2. **Database Schema**: Comprehensive PostgreSQL schema with all relationships
3. **Authentication**: Secure JWT-based auth flow
4. **Features**: Detailed workflow for every feature (Dashboard, Attendance, Materials, Complaints, Permissions, etc.)
5. **Integrations**: Bidirectional sync, event system, real-time updates
6. **API Endpoints**: Complete REST API reference
7. **Data Migration**: Strategy to move from localStorage to PostgreSQL
8. **File Management**: Current (Base64) and future (Supabase Storage) approaches

### Key Integration Points:

- **Timetable ↔ Faculty Schedule**: Auto-sync when periods are assigned/removed
- **Faculty Absence ↔ Attendance**: Absent faculty blocked from taking attendance
- **Admin Attendance ↔ Faculty**: Admin taking attendance blocks faculty for that period
- **Attendance Lock**: Prevents any modifications after locking
- **Profile Photos**: Clickable everywhere, opens modal with full details
- **Complaints Notifications**: Real-time badge counts and notification dots
- **Materials Organization**: Subject/Unit based hierarchy
- **Holiday System**: Updates all calendars across the app
- **Inactive Faculty**: Limited access via admin assignments

This document serves as your **complete reference** for understanding how every part of the system connects and interacts with every other part.
