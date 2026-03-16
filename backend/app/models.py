from datetime import datetime, date
from enum import Enum

from sqlalchemy import Boolean, Date, DateTime, Enum as SqlEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Role(str, Enum):
    admin = 'admin'
    faculty = 'faculty'
    student = 'student'


class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(SqlEnum(Role), index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Student(Base):
    __tablename__ = 'students'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), unique=True)
    roll_number: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    course: Mapped[str] = mapped_column(String(64))
    semester: Mapped[str] = mapped_column(String(16))
    section: Mapped[str] = mapped_column(String(16))
    department: Mapped[str] = mapped_column(String(64))
    register_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    date_of_birth: Mapped[str | None] = mapped_column(String(32), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(16), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(8), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    academic_year: Mapped[str | None] = mapped_column(String(32), nullable=True)
    guardian_relation: Mapped[str | None] = mapped_column(String(32), nullable=True)
    parent_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    parent_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    profile_picture: Mapped[str | None] = mapped_column(Text, nullable=True)


class Faculty(Base):
    __tablename__ = 'faculty'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), unique=True)
    employee_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    department: Mapped[str] = mapped_column(String(64))
    designation: Mapped[str] = mapped_column(String(64), default='Lecturer')
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(16), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(8), nullable=True)
    age: Mapped[str | None] = mapped_column(String(16), nullable=True)
    qualification: Mapped[str | None] = mapped_column(String(255), nullable=True)
    experience: Mapped[str | None] = mapped_column(String(64), nullable=True)
    specialization: Mapped[str | None] = mapped_column(String(255), nullable=True)
    profile_picture: Mapped[str | None] = mapped_column(Text, nullable=True)


class Notice(Base):
    __tablename__ = 'notices'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    audience: Mapped[str] = mapped_column(String(32), default='all')
    created_by: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Material(Base):
    __tablename__ = 'materials'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(128))
    course: Mapped[str | None] = mapped_column(String(64), nullable=True)
    semester: Mapped[str | None] = mapped_column(String(16), nullable=True)
    section: Mapped[str | None] = mapped_column(String(16), nullable=True)
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Complaint(Base):
    __tablename__ = 'complaints'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    complaint_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    student_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    subject: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default='pending')
    reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    student_attachments: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_attachments: Mapped[str | None] = mapped_column(Text, nullable=True)
    conversation: Mapped[str | None] = mapped_column(Text, nullable=True)
    student_can_reply: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PermissionRequest(Base):
    __tablename__ = 'permissions'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    reason: Mapped[str] = mapped_column(Text)
    from_date: Mapped[date] = mapped_column(Date)
    to_date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(32), default='pending')
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    attachments: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ImportantLink(Base):
    __tablename__ = 'links'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    url: Mapped[str] = mapped_column(String(1000))
    audience: Mapped[str] = mapped_column(String(32), default='all')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Holiday(Base):
    __tablename__ = 'holidays'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class Quote(Base):
    __tablename__ = 'quotes'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    text: Mapped[str] = mapped_column(Text)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    text_color: Mapped[str | None] = mapped_column(String(32), nullable=True)
    bg_color: Mapped[str | None] = mapped_column(String(32), nullable=True)
    font_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BloodBankEntry(Base):
    __tablename__ = 'blood_bank'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    blood_group: Mapped[str] = mapped_column(String(8), index=True)
    contact: Mapped[str] = mapped_column(String(64))
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)


class Subject(Base):
    __tablename__ = 'subjects'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    course: Mapped[str] = mapped_column(String(64))
    semester: Mapped[str] = mapped_column(String(16))
    section: Mapped[str | None] = mapped_column(String(16), nullable=True)
    faculty_name: Mapped[str | None] = mapped_column(String(255), nullable=True)


class TimetableSlot(Base):
    __tablename__ = 'timetable_slots'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    day_of_week: Mapped[str] = mapped_column(String(16), index=True)
    period_number: Mapped[int] = mapped_column(Integer)
    subject: Mapped[str] = mapped_column(String(255))
    faculty_name: Mapped[str] = mapped_column(String(255))
    time: Mapped[str | None] = mapped_column(String(64), nullable=True)
    room: Mapped[str | None] = mapped_column(String(64), nullable=True)
    course: Mapped[str] = mapped_column(String(64))
    semester: Mapped[str] = mapped_column(String(16))
    section: Mapped[str] = mapped_column(String(16))


class AttendanceRecord(Base):
    __tablename__ = 'student_attendance'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_roll_number: Mapped[str] = mapped_column(String(64), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    period_number: Mapped[int] = mapped_column(Integer)
    subject: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(16), default='present')
    marked_by: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PasswordResetOTP(Base):
    __tablename__ = 'password_reset_otps'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    otp_hash: Mapped[str] = mapped_column(String(128), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
