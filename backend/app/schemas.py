from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, EmailStr

from app.models import Role


class LoginRequest(BaseModel):
    identifier: str
    password: str
    role: Role | None = None


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: Role
    avatar_url: str | None = None
    roll_number: str | None = None
    course: str | None = None
    semester: str | None = None
    section: str | None = None
    department: str | None = None
    employee_id: str | None = None
    designation: str | None = None
    register_number: str | None = None
    phone: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    blood_group: str | None = None
    address: str | None = None
    academic_year: str | None = None
    guardian_relation: str | None = None
    parent_name: str | None = None
    parent_phone: str | None = None
    profile_picture: str | None = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserOut


class GenericCreate(BaseModel):
    payload: dict[str, Any]


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetVerify(BaseModel):
    email: str
    otp: str


class PasswordResetConfirm(BaseModel):
    email: str
    otp: str
    new_password: str


class NoticeIn(BaseModel):
    title: str
    description: str
    audience: str = 'all'


class MaterialIn(BaseModel):
    title: str
    subject: str
    course: str | None = None
    semester: str | None = None
    section: str | None = None
    file_url: str | None = None


class ComplaintIn(BaseModel):
    subject: str
    description: str
    attachments: list[dict[str, Any]] | None = None


class ComplaintUpdate(BaseModel):
    status: str | None = None
    reply: str | None = None
    attachments: list[dict[str, Any]] | None = None
    student_can_reply: bool | None = None


class PermissionIn(BaseModel):
    reason: str
    from_date: date
    to_date: date
    attachments: list[dict[str, Any]] | None = None


class PermissionReview(BaseModel):
    status: str


class LinkIn(BaseModel):
    title: str
    url: str
    audience: str = 'all'


class HolidayIn(BaseModel):
    date: date
    title: str
    description: str | None = None


class QuoteIn(BaseModel):
    text: str
    author: str | None = None
    text_color: str | None = None
    bg_color: str | None = None
    font_size: int | None = None


class BloodBankIn(BaseModel):
    name: str
    blood_group: str
    contact: str
    is_available: bool = True


class SubjectIn(BaseModel):
    name: str
    code: str
    course: str
    semester: str
    section: str | None = None
    faculty_name: str | None = None


class TimetableSlotIn(BaseModel):
    day_of_week: str
    period_number: int
    subject: str
    faculty_name: str
    time: str | None = None
    room: str | None = None
    course: str
    semester: str
    section: str


class AttendanceMark(BaseModel):
    student_roll_number: str
    date: date
    period_number: int
    subject: str
    status: str


class AttendanceBulkIn(BaseModel):
    records: list[AttendanceMark]


class AttendanceUpdate(BaseModel):
    status: str


class StudentIn(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    password: str
    roll_number: str
    course: str
    semester: str
    section: str
    department: str
    register_number: str | None = None
    phone: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    blood_group: str | None = None
    address: str | None = None
    academic_year: str | None = None
    guardian_relation: str | None = None
    parent_name: str | None = None
    parent_phone: str | None = None
    profile_picture: str | None = None


class FacultyIn(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    password: str
    employee_id: str
    department: str
    designation: str = 'Lecturer'
    phone: str | None = None
    gender: str | None = None
    blood_group: str | None = None
    age: str | None = None
    qualification: str | None = None
    experience: str | None = None
    specialization: str | None = None
    profile_picture: str | None = None


class StudentUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    roll_number: str | None = None
    course: str | None = None
    semester: str | None = None
    section: str | None = None
    department: str | None = None
    password: str | None = None
    register_number: str | None = None
    phone: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    blood_group: str | None = None
    address: str | None = None
    academic_year: str | None = None
    guardian_relation: str | None = None
    parent_name: str | None = None
    parent_phone: str | None = None
    profile_picture: str | None = None


class FacultyUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    employee_id: str | None = None
    department: str | None = None
    designation: str | None = None
    password: str | None = None
    phone: str | None = None
    gender: str | None = None
    blood_group: str | None = None
    age: str | None = None
    qualification: str | None = None
    experience: str | None = None
    specialization: str | None = None
    profile_picture: str | None = None


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
    current_password: str | None = None
    password: str | None = None


class MessageOut(BaseModel):
    message: str
    created_at: datetime | None = None


class AttendanceLockIn(BaseModel):
    date_value: date
    course: str
    semester: str
    section: str
    period_number: int


class FacultyStatusIn(BaseModel):
    faculty_id: int
    date_value: date
    status: str
    reason: str | None = None


class TimetableOverrideIn(BaseModel):
    timetable_slot_id: int | None = None
    date_value: date
    faculty_name: str | None = None
    subject: str | None = None
    course: str
    semester: str
    section: str
    period_number: int
    is_cancelled: bool = False


class SubjectAssignFacultyIn(BaseModel):
    subject_id: int
    faculty_id: int
