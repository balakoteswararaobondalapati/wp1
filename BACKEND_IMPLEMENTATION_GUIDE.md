edule
- Update active status

#### Student Permissions
- View own profile (edit limited fields)
- View attendance records (own)
- Download study materials
- Create complaints
- View notices
- View own timetable

### Middleware Implementation
```javascript
// authMiddleware.js
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Usage
app.get('/api/students', authenticateToken, authorizeRoles('admin'), getStudents);
```

---

## 🔄 Real-time Synchronization

### WebSocket Events (Socket.io)

#### Server Events (Emit)
```javascript
// Holiday data updated
socket.emit('holidayDataUpdated', { date, data });

// Faculty active status changed
socket.emit('facultyStatusChanged', { facultyId, isActive, data });

// New notice published
socket.emit('noticePublished', { noticeId, notice });

// Complaint message received
socket.to(`complaint_${complaintId}`).emit('newMessage', message);

// Attendance marked
socket.to(`course_${courseId}`).emit('attendanceMarked', { sessionId });
```

#### Client Events (Listen)
```javascript
// Student portal listens for:
socket.on('holidayDataUpdated', handleHolidayUpdate);
socket.on('noticePublished', handleNewNotice);
socket.on('newMessage', handleComplaintMessage);

// Faculty portal listens for:
socket.on('holidayDataUpdated', handleHolidayUpdate);
socket.on('noticePublished', handleNewNotice);
socket.on('newMessage', handleComplaintMessage);

// Admin portal listens for:
socket.on('facultyStatusChanged', handleFacultyStatusUpdate);
socket.on('newComplaint', handleNewComplaint);
socket.on('newMessage', handleComplaintMessage);
```

### Server-Sent Events (SSE) Alternative
```javascript
// For lightweight real-time updates without bidirectional communication
app.get('/api/events/holidays', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const sendUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  // Register listener and send updates
  holidayUpdateEmitter.on('update', sendUpdate);
  
  req.on('close', () => {
    holidayUpdateEmitter.off('update', sendUpdate);
  });
});
```

---

## 📁 Project Structure

### Backend Folder Structure (Node.js + Express)

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts           # PostgreSQL connection
│   │   ├── env.ts                # Environment variables
│   │   └── swagger.ts            # API documentation config
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── student.controller.ts
│   │   ├── faculty.controller.ts
│   │   ├── holiday.controller.ts
│   │   ├── attendance.controller.ts
│   │   ├── notice.controller.ts
│   │   ├── complaint.controller.ts
│   │   ├── material.controller.ts
│   │   ├── timetable.controller.ts
│   │   └── analytics.controller.ts
│   │
│   ├── models/              # Prisma models OR Sequelize models
│   │   ├── User.ts
│   │   ├── Student.ts
│   │   ├── Faculty.ts
│   │   ├── Holiday.ts
│   │   ├── Attendance.ts
│   │   ├── Notice.ts
│   │   └── Complaint.ts
│   │
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── student.routes.ts
│   │   ├── faculty.routes.ts
│   │   ├── holiday.routes.ts
│   │   ├── attendance.routes.ts
│   │   ├── notice.routes.ts
│   │   ├── complaint.routes.ts
│   │   ├── material.routes.ts
│   │   └── index.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validate.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── upload.middleware.ts
│   │   └── logger.middleware.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── student.service.ts
│   │   ├── faculty.service.ts
│   │   ├── holiday.service.ts
│   │   ├── attendance.service.ts
│   │   ├── email.service.ts
│   │   ├── sms.service.ts
│   │   └── storage.service.ts   # S3 or local file storage
│   │
│   ├── utils/
│   │   ├── jwt.util.ts
│   │   ├── bcrypt.util.ts
│   │   ├── date.util.ts
│   │   ├── pdf.util.ts
│   │   └── validation.util.ts
│   │
│   ├── types/
│   │   ├── express.d.ts         # Extended Express types
│   │   └── index.ts
│   │
│   ├── websockets/
│   │   ├── socket.ts            # Socket.io setup
│   │   ├── handlers/
│   │   │   ├── holiday.handler.ts
│   │   │   ├── complaint.handler.ts
│   │   │   └── attendance.handler.ts
│   │   └── events.ts
│   │
│   ├── validators/
│   │   ├── student.validator.ts
│   │   ├── holiday.validator.ts
│   │   └── attendance.validator.ts
│   │
│   ├── app.ts                   # Express app setup
│   └── server.ts                # Server entry point
│
├── prisma/                      # If using Prisma
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── uploads/                     # Local file storage (if not using S3)
│   ├── materials/
│   ├── profiles/
│   └── attachments/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📝 Implementation Plan

### Phase 1: Foundation Setup (Week 1)
1. ✅ Initialize backend project with TypeScript
2. ✅ Setup PostgreSQL database
3. ✅ Create database schema and migrations
4. ✅ Implement authentication system (JWT)
5. ✅ Setup basic Express server with CORS
6. ✅ Create error handling middleware
7. ✅ Setup environment configuration

### Phase 2: Core User Management (Week 2)
1. ✅ Implement User CRUD APIs
2. ✅ Implement Student Management APIs
3. ✅ Implement Faculty Management APIs
4. ✅ Setup role-based access control
5. ✅ Create profile upload functionality
6. ✅ Implement password reset flow

### Phase 3: Holiday & Attendance Control (Week 3)
1. ✅ Implement Holiday Calendar APIs
2. ✅ Implement Period Blocking APIs
3. ✅ Implement Blocking Filters (Semester/Course/Faculty)
4. ✅ Create validation logic for holiday checks
5. ✅ Setup WebSocket events for real-time updates
6. ✅ Integrate with frontend holiday calendar

### Phase 4: Attendance System (Week 4)
1. ✅ Implement Attendance Session APIs
2. ✅ Implement Attendance Record APIs
3. ✅ Create attendance marking workflow
4. ✅ Implement attendance reports
5. ✅ Add PDF export functionality
6. ✅ Create attendance analytics endpoints

### Phase 5: Notice & Complaints (Week 5)
1. ✅ Implement Notice Board APIs
2. ✅ Implement Complaint Box APIs
3. ✅ Create real-time chat functionality
4. ✅ Add file attachment support
5. ✅ Implement notification system
6. ✅ Create complaint status tracking

### Phase 6: Materials & Timetable (Week 6)
1. ✅ Implement Study Materials APIs
2. ✅ Setup file upload to S3/local storage
3. ✅ Implement Timetable APIs
4. ✅ Create timetable conflict detection
5. ✅ Add material download tracking
6. ✅ Implement search functionality

### Phase 7: Additional Features (Week 7)
1. ✅ Implement Blood Bank APIs
2. ✅ Implement Important Links APIs
3. ✅ Create Academic Year Setup
4. ✅ Implement Department/Course management
5. ✅ Add system settings management
6. ✅ Create audit logging

### Phase 8: Analytics & Reports (Week 8)
1. ✅ Implement Dashboard APIs
2. ✅ Create attendance analytics
3. ✅ Build student performance reports
4. ✅ Create faculty workload reports
5. ✅ Add export to PDF/Excel
6. ✅ Implement data visualization endpoints

### Phase 9: Testing & Optimization (Week 9)
1. ✅ Write unit tests for all services
2. ✅ Write integration tests for APIs
3. ✅ Perform load testing
4. ✅ Optimize database queries
5. ✅ Add caching layer (Redis)
6. ✅ Security audit

### Phase 10: Deployment & Documentation (Week 10)
1. ✅ Setup CI/CD pipeline
2. ✅ Deploy to production server
3. ✅ Setup monitoring (PM2, New Relic)
4. ✅ Create API documentation (Swagger)
5. ✅ Write deployment guide
6. ✅ Create backup strategy

---

## 🚀 Quick Start Commands

### Database Setup
```bash
# Create database
createdb college_management_system

# Run migrations (Prisma)
npx prisma migrate dev

# Seed database
npm run seed

# Generate Prisma client
npx prisma generate
```

### Development
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start
```

### Docker Setup (Optional)
```bash
# Start database and backend
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

---

## 📊 Performance Considerations

1. **Database Indexing**: All foreign keys and frequently queried columns are indexed
2. **Query Optimization**: Use JOIN instead of multiple queries, implement pagination
3. **Caching**: Redis for session management and frequently accessed data
4. **File Storage**: Use CDN for static assets, presigned URLs for S3
5. **WebSocket Scaling**: Use Redis adapter for Socket.io in production
6. **Rate Limiting**: Implement API rate limiting (express-rate-limit)
7. **Compression**: Enable gzip compression for API responses

---

## 🔒 Security Best Practices

1. **Password Hashing**: Use bcrypt with salt rounds >= 12
2. **SQL Injection**: Use parameterized queries (Prisma/TypeORM handles this)
3. **XSS Protection**: Sanitize user input, use helmet.js
4. **CSRF Protection**: Implement CSRF tokens for state-changing operations
5. **CORS**: Configure CORS properly for allowed origins
6. **File Upload**: Validate file types, scan for malware, limit file size
7. **JWT**: Short-lived access tokens (15 min), longer refresh tokens (7 days)
8. **HTTPS**: Enforce HTTPS in production
9. **Environment Variables**: Never commit .env files
10. **Audit Logging**: Log all critical operations

---

## 📞 Support & Maintenance

### Monitoring Tools
- **Application**: PM2, New Relic, DataDog
- **Database**: PgAdmin, pg_stat_statements
- **Errors**: Sentry
- **Logs**: Winston + CloudWatch/ELK Stack

### Backup Strategy
- **Database**: Daily automated backups, point-in-time recovery
- **Files**: S3 versioning enabled, cross-region replication
- **Retention**: 30 days daily, 12 months monthly

---

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Socket.io Documentation](https://socket.io/docs/)
- [JWT Best Practices](https://jwt.io/introduction)

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Author**: Development Team  
**License**: Proprietary

