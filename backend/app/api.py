from datetime import date, datetime, timedelta
import hashlib
import json
from random import randint
import smtplib
from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import get_current_user, require_roles
from app.core.security import create_access_token, hash_password, verify_password
from app.models import (
    AttendanceRecord,
    BloodBankEntry,
    Complaint,
    Faculty,
    Holiday,
    ImportantLink,
    Material,
    Notice,
    PasswordResetOTP,
    PermissionRequest,
    Quote,
    Role,
    Student,
    Subject,
    TimetableSlot,
    User,
)
from app.schemas import (
    AttendanceBulkIn,
    AttendanceLockIn,
    AttendanceUpdate,
    BloodBankIn,
    ComplaintIn,
    ComplaintUpdate,
    FacultyIn,
    FacultyStatusIn,
    FacultyUpdate,
    HolidayIn,
    LinkIn,
    LoginRequest,
    MaterialIn,
    NoticeIn,
    PermissionIn,
    PermissionReview,
    ProfileUpdate,
    QuoteIn,
    PasswordResetConfirm,
    PasswordResetRequest,
    PasswordResetVerify,
    StudentIn,
    StudentUpdate,
    SubjectIn,
    SubjectAssignFacultyIn,
    TimetableOverrideIn,
    TimetableSlotIn,
    TokenResponse,
    UserOut,
)


api = APIRouter(prefix='/api')

COMPLAINT_ALLOWED_STATUSES = {'pending', 'in-review', 'resolved'}
COMPLAINT_TRANSITIONS = {
    'pending': {'in-review', 'resolved'},
    'in-review': {'resolved'},
    'resolved': set(),
}


def _record_complaint_message(db: Session, complaint_id: int, sender_id: int | None, message: str) -> int | None:
    result = db.execute(
        text(
            """
            INSERT INTO complaint_messages (complaint_id, sender_id, message)
            VALUES (:complaint_id, :sender_id, :message)
            RETURNING id
            """
        ),
        {
            'complaint_id': complaint_id,
            'sender_id': sender_id,
            'message': message,
        },
    ).fetchone()
    return int(result[0]) if result else None


def _attachment_to_file_url(attachment: object) -> str:
    if isinstance(attachment, dict):
        for key in ('data', 'url', 'file_url', 'fileUrl'):
            value = attachment.get(key)
            if value:
                return str(value)
        name = attachment.get('name') or attachment.get('filename')
        if name:
            return str(name)
        return json.dumps(attachment)
    return str(attachment)


def _record_complaint_attachments(
    db: Session,
    complaint_id: int,
    message_id: int | None,
    attachments: list[dict[str, object]] | None,
    uploaded_by: int | None,
) -> None:
    if not attachments:
        return
    for attachment in attachments:
        file_url = _attachment_to_file_url(attachment)
        db.execute(
            text(
                """
                INSERT INTO complaint_attachments (complaint_id, message_id, file_url, uploaded_by)
                VALUES (:complaint_id, :message_id, :file_url, :uploaded_by)
                """
            ),
            {
                'complaint_id': complaint_id,
                'message_id': message_id,
                'file_url': file_url,
                'uploaded_by': uploaded_by,
            },
        )


def _send_reset_email(to_email: str, otp: str) -> None:
    smtp_user = settings.smtp_user or settings.email_user
    smtp_pass = settings.smtp_pass or settings.email_pass
    smtp_from = settings.smtp_from or settings.email_from or smtp_user

    if not settings.smtp_host or not smtp_user or not smtp_pass or not smtp_from:
        raise HTTPException(status_code=500, detail='Email service not configured')

    msg = EmailMessage()
    msg['Subject'] = 'Password Reset OTP'
    msg['From'] = smtp_from
    msg['To'] = to_email
    msg.set_content(
        f'Your OTP for password reset is {otp}. It expires in {settings.otp_expire_minutes} minutes.'
    )

    try:
        if settings.smtp_use_tls:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f'Email send failed. Check SMTP/EMAIL credentials. {exc.__class__.__name__}'
        ) from exc


def _otp_hash(otp: str) -> str:
    secret = settings.otp_secret or settings.jwt_secret_key
    return hashlib.sha256(f'{otp}:{secret}'.encode('utf-8')).hexdigest()


def upsert_blood_bank(db: Session, name: str, blood_group: str | None, contact: str | None) -> None:
    if not contact:
        return
    if blood_group and str(blood_group).strip():
        db.execute(
            text(
                """
                INSERT INTO blood_bank (name, blood_group, contact, is_available)
                VALUES (:name, :blood_group, :contact, TRUE)
                ON CONFLICT (contact)
                DO UPDATE SET
                  name = EXCLUDED.name,
                  blood_group = EXCLUDED.blood_group,
                  is_available = TRUE
                """
            ),
            {
                'name': name,
                'blood_group': blood_group,
                'contact': contact,
            },
        )
    else:
        db.execute(
            text("DELETE FROM blood_bank WHERE contact = :contact"),
            {'contact': contact},
        )


def serialize_user(db: Session, user: User) -> dict:
    payload = {
        'id': user.id,
        'email': user.email,
        'username': user.username,
        'full_name': user.full_name,
        'role': user.role,
        'avatar_url': user.avatar_url,
        'roll_number': None,
        'course': None,
        'semester': None,
        'section': None,
        'department': None,
        'employee_id': None,
        'designation': None,
        'register_number': None,
        'phone': None,
        'date_of_birth': None,
        'gender': None,
        'blood_group': None,
        'address': None,
        'academic_year': None,
        'guardian_relation': None,
        'parent_name': None,
        'parent_phone': None,
        'profile_picture': None,
    }
    if user.role == Role.student:
        student = db.query(Student).filter(Student.user_id == user.id).first()
        if student:
            payload.update(
                {
                    'roll_number': student.roll_number,
                    'course': student.course,
                    'semester': student.semester,
                    'section': student.section,
                    'department': student.department,
                    'register_number': student.register_number,
                    'phone': student.phone,
                    'date_of_birth': student.date_of_birth,
                    'gender': student.gender,
                    'blood_group': student.blood_group,
                    'address': student.address,
                    'academic_year': student.academic_year,
                    'guardian_relation': student.guardian_relation,
                    'parent_name': student.parent_name,
                    'parent_phone': student.parent_phone,
                    'profile_picture': student.profile_picture,
                }
            )
    elif user.role == Role.faculty:
        faculty = db.query(Faculty).filter(Faculty.user_id == user.id).first()
        if faculty:
            payload.update(
                {
                    'department': faculty.department,
                    'employee_id': faculty.employee_id,
                    'designation': faculty.designation,
                    'phone': faculty.phone,
                    'gender': faculty.gender,
                    'blood_group': faculty.blood_group,
                    'age': faculty.age,
                    'qualification': faculty.qualification,
                    'experience': faculty.experience,
                    'specialization': faculty.specialization,
                    'profile_picture': faculty.profile_picture,
                }
            )
    return payload


def normalize_complaint_status(raw_status: str | None) -> str:
    status = str(raw_status or 'pending').strip().lower()
    if status in {'open', 'assigned'}:
        return 'in-review'
    return status


def validate_complaint_status(raw_status: str | None) -> str:
    status = normalize_complaint_status(raw_status)
    if status not in COMPLAINT_ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail=f'Invalid complaint status: {raw_status}')
    return status


def validate_complaint_transition(current_status: str, next_status: str) -> None:
    if current_status == next_status:
        return
    allowed = COMPLAINT_TRANSITIONS.get(current_status, set())
    if next_status not in allowed:
        raise HTTPException(status_code=409, detail=f'Invalid complaint status transition: {current_status} -> {next_status}')


@api.post('/auth/login', response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter((User.email == payload.identifier) | (User.username == payload.identifier)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    if payload.role and user.role != payload.role:
        raise HTTPException(status_code=403, detail='Role mismatch')
    token = create_access_token(subject=str(user.id), role=user.role.value)
    forwarded_proto = request.headers.get('x-forwarded-proto', '')
    is_https = request.url.scheme == 'https' or forwarded_proto == 'https'
    response.set_cookie(
        key='access_token',
        value=token,
        httponly=True,
        samesite='none' if is_https else 'lax',
        secure=is_https,
        max_age=60 * 60 * 24 * 7,
    )
    return {'access_token': token, 'user': serialize_user(db, user)}


@api.post('/auth/logout')
def logout(response: Response):
    response.delete_cookie('access_token')
    return {'success': True}


@api.get('/auth/me', response_model=UserOut)
def me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return serialize_user(db, user)


@api.put('/auth/me', response_model=UserOut)
def update_me(payload: ProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url
    if payload.password:
        if not payload.current_password or not verify_password(payload.current_password, user.password_hash):
            raise HTTPException(status_code=400, detail='Current password is incorrect')
        user.password_hash = hash_password(payload.password)
    db.commit()
    db.refresh(user)
    return serialize_user(db, user)


@api.post('/auth/forgot-password')
def forgot_password(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail='Invalid user')

    db.query(PasswordResetOTP).filter(
        PasswordResetOTP.user_id == user.id,
        PasswordResetOTP.used.is_(False),
    ).update({'used': True})

    otp = f'{randint(0, 999999):06d}'
    otp_row = PasswordResetOTP(
        user_id=user.id,
        otp_hash=_otp_hash(otp),
        expires_at=datetime.utcnow() + timedelta(minutes=settings.otp_expire_minutes),
        used=False,
    )
    db.add(otp_row)
    db.commit()

    _send_reset_email(user.email, otp)
    return {'success': True}


@api.post('/auth/verify-otp')
def verify_otp(payload: PasswordResetVerify, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {'valid': False}

    otp_hash = _otp_hash(payload.otp.strip())
    now = datetime.utcnow()
    row = (
        db.query(PasswordResetOTP)
        .filter(
            PasswordResetOTP.user_id == user.id,
            PasswordResetOTP.otp_hash == otp_hash,
            PasswordResetOTP.used.is_(False),
            PasswordResetOTP.expires_at >= now,
        )
        .order_by(PasswordResetOTP.created_at.desc())
        .first()
    )
    return {'valid': bool(row)}


@api.post('/auth/reset-password')
def reset_password(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=400, detail='Invalid OTP')

    otp_hash = _otp_hash(payload.otp.strip())
    now = datetime.utcnow()
    row = (
        db.query(PasswordResetOTP)
        .filter(
            PasswordResetOTP.user_id == user.id,
            PasswordResetOTP.otp_hash == otp_hash,
            PasswordResetOTP.used.is_(False),
            PasswordResetOTP.expires_at >= now,
        )
        .order_by(PasswordResetOTP.created_at.desc())
        .first()
    )
    if not row:
        raise HTTPException(status_code=400, detail='Invalid or expired OTP')

    user.password_hash = hash_password(payload.new_password)
    row.used = True
    db.commit()
    return {'success': True}


@api.get('/students')
def list_students(db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin, Role.faculty)), course: str | None = None, semester: str | None = None, section: str | None = None):
    q = db.query(Student, User).join(User, Student.user_id == User.id)
    if course:
        q = q.filter(Student.course == course)
    if semester:
        q = q.filter(Student.semester == semester)
    if section:
        q = q.filter(Student.section == section)
    return [
        {
            'id': s.id,
            'user_id': u.id,
            'name': u.full_name,
            'email': u.email,
            'username': u.username,
            'roll_number': s.roll_number,
            'course': s.course,
            'semester': s.semester,
            'section': s.section,
            'department': s.department,
            'register_number': s.register_number,
            'phone': s.phone,
            'date_of_birth': s.date_of_birth,
            'gender': s.gender,
            'blood_group': s.blood_group,
            'address': s.address,
            'academic_year': s.academic_year,
            'guardian_relation': s.guardian_relation,
            'parent_name': s.parent_name,
            'parent_phone': s.parent_phone,
            'profile_picture': s.profile_picture,
        }
        for s, u in q.all()
    ]


@api.post('/students')
def create_student(payload: StudentIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    if not payload.roll_number or not str(payload.roll_number).strip():
        raise HTTPException(status_code=400, detail='Roll number is required')
    existing_email = db.query(User).filter(User.email == payload.email).first()
    if existing_email:
        raise HTTPException(status_code=409, detail='Email already exists')
    existing_username = db.query(User).filter(User.username == payload.username).first()
    if existing_username:
        raise HTTPException(status_code=409, detail='User ID already exists')
    existing_roll = db.query(Student).filter(Student.roll_number == payload.roll_number).first()
    if existing_roll:
        raise HTTPException(status_code=409, detail='Roll number already exists')
    user = User(
        email=payload.email,
        username=payload.username,
        full_name=payload.full_name,
        role=Role.student,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.flush()
    student = Student(
        user_id=user.id,
        roll_number=payload.roll_number,
        course=payload.course,
        semester=payload.semester,
        section=payload.section,
        department=payload.department,
        register_number=payload.register_number,
        phone=payload.phone,
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        blood_group=payload.blood_group,
        address=payload.address,
        academic_year=payload.academic_year,
        guardian_relation=payload.guardian_relation,
        parent_name=payload.parent_name,
        parent_phone=payload.parent_phone,
        profile_picture=payload.profile_picture,
    )
    db.add(student)
    upsert_blood_bank(db, user.full_name, payload.blood_group, user.email)
    db.commit()
    return {'id': student.id, 'user_id': user.id}


@api.delete('/students/{student_id}')
def delete_student(student_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    user = db.query(User).filter(User.id == student.user_id).first()
    db.delete(student)
    if user:
        db.delete(user)
    db.commit()
    return {'success': True}


@api.put('/students/{student_id}')
def update_student(student_id: int, payload: StudentUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    user = db.query(User).filter(User.id == student.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    old_email = user.email
    old_name = user.full_name
    old_blood = student.blood_group

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.email is not None:
        user.email = payload.email
    if payload.password:
        user.password_hash = hash_password(payload.password)
    if payload.roll_number is not None:
        student.roll_number = payload.roll_number
    if payload.course is not None:
        student.course = payload.course
    if payload.semester is not None:
        student.semester = payload.semester
    if payload.section is not None:
        student.section = payload.section
    if payload.department is not None:
        student.department = payload.department
    if payload.register_number is not None:
        student.register_number = payload.register_number
    if payload.phone is not None:
        student.phone = payload.phone
    if payload.date_of_birth is not None:
        student.date_of_birth = payload.date_of_birth
    if payload.gender is not None:
        student.gender = payload.gender
    if payload.blood_group is not None:
        student.blood_group = payload.blood_group
    if payload.address is not None:
        student.address = payload.address
    if payload.academic_year is not None:
        student.academic_year = payload.academic_year
    if payload.guardian_relation is not None:
        student.guardian_relation = payload.guardian_relation
    if payload.parent_name is not None:
        student.parent_name = payload.parent_name
    if payload.parent_phone is not None:
        student.parent_phone = payload.parent_phone
    if payload.profile_picture is not None:
        student.profile_picture = payload.profile_picture

    # Sync blood bank when key identity fields change
    email_changed = old_email != user.email
    name_changed = old_name != user.full_name
    blood_changed = old_blood != student.blood_group
    if email_changed and old_email:
        db.execute(text("DELETE FROM blood_bank WHERE contact = :contact"), {'contact': old_email})
    if student.blood_group and (email_changed or name_changed or blood_changed):
        upsert_blood_bank(db, user.full_name, student.blood_group, user.email)
    db.commit()
    return {'id': student.id, 'user_id': user.id, 'name': user.full_name, 'email': user.email, 'username': user.username, 'roll_number': student.roll_number, 'course': student.course, 'semester': student.semester, 'section': student.section, 'department': student.department}


@api.patch('/students/{student_id}/avatar')
def student_avatar(student_id: int, payload: ProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    if current_user.role != Role.admin and current_user.id != student.user_id:
        raise HTTPException(status_code=403, detail='Forbidden')
    user = db.query(User).filter(User.id == student.user_id).first()
    user.avatar_url = payload.avatar_url
    db.commit()
    return {'message': 'Updated'}


@api.get('/faculty')
def list_faculty(db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    q = db.query(Faculty, User).join(User, Faculty.user_id == User.id)
    return [
        {
            'id': f.id,
            'user_id': u.id,
            'name': u.full_name,
            'email': u.email,
            'username': u.username,
            'employee_id': f.employee_id,
            'department': f.department,
            'designation': f.designation,
            'phone': f.phone,
            'gender': f.gender,
            'blood_group': f.blood_group,
            'age': f.age,
            'qualification': f.qualification,
            'experience': f.experience,
            'specialization': f.specialization,
            'profile_picture': f.profile_picture,
        }
        for f, u in q.all()
    ]


@api.post('/faculty')
def create_faculty(payload: FacultyIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    user = User(
        email=payload.email,
        username=payload.username,
        full_name=payload.full_name,
        role=Role.faculty,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.flush()
    faculty = Faculty(
        user_id=user.id,
        employee_id=payload.employee_id,
        department=payload.department,
        designation=payload.designation,
        phone=payload.phone,
        gender=payload.gender,
        blood_group=payload.blood_group,
        age=payload.age,
        qualification=payload.qualification,
        experience=payload.experience,
        specialization=payload.specialization,
        profile_picture=payload.profile_picture,
    )
    db.add(faculty)
    upsert_blood_bank(db, user.full_name, payload.blood_group, user.email)
    db.commit()
    return {'id': faculty.id, 'user_id': user.id}


@api.delete('/faculty/{faculty_id}')
def delete_faculty(faculty_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail='Faculty not found')
    user = db.query(User).filter(User.id == faculty.user_id).first()
    db.delete(faculty)
    if user:
        db.delete(user)
    db.commit()
    return {'success': True}


@api.put('/faculty/{faculty_id}')
def update_faculty(faculty_id: int, payload: FacultyUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail='Faculty not found')
    user = db.query(User).filter(User.id == faculty.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    old_email = user.email
    old_name = user.full_name
    old_blood = faculty.blood_group

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.email is not None:
        user.email = payload.email
    if payload.password:
        user.password_hash = hash_password(payload.password)
    if payload.employee_id is not None:
        faculty.employee_id = payload.employee_id
    if payload.department is not None:
        faculty.department = payload.department
    if payload.designation is not None:
        faculty.designation = payload.designation
    if payload.phone is not None:
        faculty.phone = payload.phone
    if payload.gender is not None:
        faculty.gender = payload.gender
    if payload.blood_group is not None:
        faculty.blood_group = payload.blood_group
    if payload.age is not None:
        faculty.age = payload.age
    if payload.qualification is not None:
        faculty.qualification = payload.qualification
    if payload.experience is not None:
        faculty.experience = payload.experience
    if payload.specialization is not None:
        faculty.specialization = payload.specialization
    if payload.profile_picture is not None:
        faculty.profile_picture = payload.profile_picture

    email_changed = old_email != user.email
    name_changed = old_name != user.full_name
    blood_changed = old_blood != faculty.blood_group
    if email_changed and old_email:
        db.execute(text("DELETE FROM blood_bank WHERE contact = :contact"), {'contact': old_email})
    if faculty.blood_group and (email_changed or name_changed or blood_changed):
        upsert_blood_bank(db, user.full_name, faculty.blood_group, user.email)
    db.commit()
    return {'id': faculty.id, 'user_id': user.id, 'name': user.full_name, 'email': user.email, 'username': user.username, 'employee_id': faculty.employee_id, 'department': faculty.department, 'designation': faculty.designation}


@api.patch('/faculty/{faculty_id}/avatar')
def faculty_avatar(faculty_id: int, payload: ProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail='Faculty not found')
    if current_user.role != Role.admin and current_user.id != faculty.user_id:
        raise HTTPException(status_code=403, detail='Forbidden')
    user = db.query(User).filter(User.id == faculty.user_id).first()
    user.avatar_url = payload.avatar_url
    db.commit()
    return {'message': 'Updated'}


@api.get('/subjects')
def list_subjects(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    course: str | None = None,
    semester: str | None = None,
    section: str | None = None,
):
    q = db.query(Subject)
    if course:
        q = q.filter(Subject.course == course)
    if semester:
        q = q.filter(Subject.semester == semester)
    if section:
        q = q.filter((Subject.section == section) | (Subject.section.is_(None)))
    return q.all()


@api.post('/subjects')
def create_subject(payload: SubjectIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = Subject(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@api.put('/subjects/{subject_id}')
def update_subject(subject_id: int, payload: SubjectIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(Subject).filter(Subject.id == subject_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return row


@api.delete('/subjects/{subject_id}')
def delete_subject(subject_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(Subject).filter(Subject.id == subject_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    db.delete(row)
    db.commit()
    return {'success': True}


@api.get('/timetable')
def list_timetable(db: Session = Depends(get_db), _: User = Depends(get_current_user), course: str | None = None, semester: str | None = None, section: str | None = None):
    q = db.query(TimetableSlot)
    if course:
        q = q.filter(func.lower(func.trim(TimetableSlot.course)) == course.strip().lower())
    if semester:
        q = q.filter(func.trim(TimetableSlot.semester) == semester.strip())
    if section:
        q = q.filter(func.lower(func.trim(TimetableSlot.section)) == section.strip().lower())
    return q.all()


@api.get('/timetable/faculty/{faculty_id}')
def timetable_for_faculty(faculty_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    faculty = db.query(Faculty, User).join(User, Faculty.user_id == User.id).filter(Faculty.id == faculty_id).first()
    if not faculty:
        return []
    faculty_name = faculty[1].full_name
    return db.query(TimetableSlot).filter(TimetableSlot.faculty_name == faculty_name).all()


@api.get('/timetable/today')
def timetable_today(faculty_id: int | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    day = date.today().strftime('%A')
    q = db.query(TimetableSlot).filter(TimetableSlot.day_of_week == day)
    if faculty_id is not None:
        faculty = db.query(Faculty, User).join(User, Faculty.user_id == User.id).filter(Faculty.id == faculty_id).first()
        if faculty:
            q = q.filter(TimetableSlot.faculty_name == faculty[1].full_name)
    return q.all()


@api.post('/timetable/slot')
def create_slot(payload: TimetableSlotIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = TimetableSlot(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@api.put('/timetable/slot/{slot_id}')
def update_slot(slot_id: int, payload: TimetableSlotIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(TimetableSlot).filter(TimetableSlot.id == slot_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return row


@api.delete('/timetable/slot/{slot_id}')
def delete_slot(slot_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(TimetableSlot).filter(TimetableSlot.id == slot_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    db.delete(row)
    db.commit()
    return {'success': True}


@api.get('/attendance')
def list_attendance(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(AttendanceRecord).all()


@api.post('/attendance/bulk')
def mark_attendance_bulk(payload: AttendanceBulkIn, db: Session = Depends(get_db), user: User = Depends(require_roles(Role.admin, Role.faculty))):
    affected = 0
    for record in payload.records:
        existing = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.student_roll_number == record.student_roll_number,
                AttendanceRecord.date == record.date,
                AttendanceRecord.period_number == record.period_number,
            )
            .all()
        )
        if existing:
            for row in existing:
                row.subject = record.subject
                row.status = record.status
                row.marked_by = user.id
                affected += 1
            continue

        db.add(AttendanceRecord(**record.model_dump(), marked_by=user.id))
        affected += 1

    db.commit()
    return {'updated': affected}


@api.get('/attendance/summary')
def attendance_summary(student_roll_number: str | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    q = db.query(AttendanceRecord)
    if student_roll_number:
        q = q.filter(AttendanceRecord.student_roll_number == student_roll_number)
    total = q.count()
    present = q.filter(AttendanceRecord.status == 'present').count()
    pct = round((present / total) * 100, 2) if total else 0
    return {'total': total, 'present': present, 'percentage': pct}


@api.get('/attendance/analytics')
def attendance_analytics(
    period: str = 'week',
    semester: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.admin)),
):
    today = date.today()
    if period == 'week':
        start_date = today - timedelta(days=7)
    elif period == 'month':
        start_date = today - timedelta(days=30)
    elif period == 'semester':
        start_date = today - timedelta(days=180)
    else:
        raise HTTPException(status_code=400, detail='Invalid period. Use week, month, or semester.')

    semester_filter = None if not semester or semester == 'all' else semester
    analytics_sql = """
        SELECT
          a.student_roll_number,
          a.status,
          COALESCE(s.department, s.course, 'Unknown') AS department_name
        FROM student_attendance a
        JOIN students s
          ON s.roll_number = a.student_roll_number
          OR s.register_number = a.student_roll_number
        WHERE a.date >= :start_date
          AND a.date <= :end_date
          AND a.status IN ('present', 'absent')
    """
    query_params: dict[str, object] = {
        'start_date': start_date,
        'end_date': today,
    }
    if semester_filter is not None:
        analytics_sql += " AND s.semester = :semester"
        query_params['semester'] = semester_filter

    rows = db.execute(text(analytics_sql), query_params).mappings().all()

    total_records = len(rows)
    present_records = sum(1 for r in rows if r['status'] == 'present')
    overall_percentage = round((present_records / total_records) * 100) if total_records else 0

    department_stats: dict[str, dict[str, int]] = {}
    student_stats: dict[str, dict[str, int]] = {}
    for row in rows:
        department = str(row['department_name'] or 'Unknown')
        dept_bucket = department_stats.setdefault(department, {'present': 0, 'total': 0})
        dept_bucket['total'] += 1
        if row['status'] == 'present':
            dept_bucket['present'] += 1

        roll_number = str(row['student_roll_number'] or '')
        if not roll_number:
            continue
        student_bucket = student_stats.setdefault(roll_number, {'present': 0, 'total': 0})
        student_bucket['total'] += 1
        if row['status'] == 'present':
            student_bucket['present'] += 1

    department_attendance = [
        {
            'department': department,
            'attendance': round((stats['present'] / stats['total']) * 100) if stats['total'] else 0,
        }
        for department, stats in sorted(department_stats.items())
    ]

    category_counts = {
        'excellent': 0,
        'good': 0,
        'average': 0,
        'belowAverage': 0,
    }
    for stats in student_stats.values():
        if stats['total'] <= 0:
            continue
        percentage = (stats['present'] / stats['total']) * 100
        if percentage >= 90:
            category_counts['excellent'] += 1
        elif percentage >= 75:
            category_counts['good'] += 1
        elif percentage >= 60:
            category_counts['average'] += 1
        else:
            category_counts['belowAverage'] += 1

    category_counts['total'] = (
        category_counts['excellent']
        + category_counts['good']
        + category_counts['average']
        + category_counts['belowAverage']
    )

    return {
        'period': period,
        'semester': semester if semester else 'all',
        'start_date': start_date,
        'end_date': today,
        'overall_percentage': overall_percentage,
        'department_attendance': department_attendance,
        'category_counts': category_counts,
        'total_records': total_records,
    }


@api.get('/attendance/summary/{student_id}')
def attendance_summary_student(student_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail='Student not found')
    total = db.query(AttendanceRecord).filter(AttendanceRecord.student_roll_number == student.roll_number).count()
    present = db.query(AttendanceRecord).filter(AttendanceRecord.student_roll_number == student.roll_number, AttendanceRecord.status == 'present').count()
    pct = round((present / total) * 100, 2) if total else 0
    return {'student_id': student_id, 'total': total, 'present': present, 'percentage': pct}


@api.get('/attendance/monthly')
def attendance_monthly(student_roll_number: str, month: int, year: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rows = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_roll_number == student_roll_number,
        func.extract('month', AttendanceRecord.date) == month,
        func.extract('year', AttendanceRecord.date) == year,
    ).all()
    return rows


@api.get('/attendance/daily-report')
def daily_report(date_value: date | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    day = date_value or date.today()
    q = db.query(AttendanceRecord).filter(AttendanceRecord.date == day)
    total = q.count()
    present = q.filter(AttendanceRecord.status == 'present').count()
    return {'date': day, 'total': total, 'present': present, 'absent': total - present}


@api.get('/attendance/lock-status')
def lock_status(
    date_value: date | None = None,
    course: str | None = None,
    semester: str | None = None,
    section: str | None = None,
    period_number: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = """
        SELECT id, date_value, course, semester, section, period_number, created_at
        FROM attendance_locks
        WHERE (:date_value IS NULL OR date_value = :date_value)
          AND (:course IS NULL OR course = :course)
          AND (:semester IS NULL OR semester = :semester)
          AND (:section IS NULL OR section = :section)
          AND (:period_number IS NULL OR period_number = :period_number)
        ORDER BY date_value DESC, period_number ASC
    """
    rows = db.execute(
        text(query),
        {
            'date_value': date_value,
            'course': course,
            'semester': semester,
            'section': section,
            'period_number': period_number,
        },
    ).mappings().all()
    return {'locked': len(rows) > 0, 'rows': [dict(r) for r in rows]}


@api.post('/attendance/lock')
def attendance_lock(payload: AttendanceLockIn, db: Session = Depends(get_db), user: User = Depends(require_roles(Role.admin))):
    db.execute(
        text(
            """
            INSERT INTO attendance_locks (date_value, course, semester, section, period_number, locked_by)
            VALUES (:date_value, :course, :semester, :section, :period_number, :locked_by)
            ON CONFLICT (date_value, course, semester, section, period_number)
            DO UPDATE SET locked_by = EXCLUDED.locked_by
            """
        ),
        {
            'date_value': payload.date_value,
            'course': payload.course,
            'semester': payload.semester,
            'section': payload.section,
            'period_number': payload.period_number,
            'locked_by': user.id,
        },
    )
    db.commit()
    return {'locked': True}


@api.get('/materials')
def list_materials(db: Session = Depends(get_db), _: User = Depends(get_current_user), subject_id: int | None = None):
    q = db.query(Material, User).join(User, Material.uploaded_by == User.id, isouter=True)
    if subject_id:
        subject = db.query(Subject).filter(Subject.id == subject_id).first()
        if subject:
            q = q.filter(Material.subject == subject.name)
    rows = q.all()
    return [
        {
            'id': m.id,
            'title': m.title,
            'subject': m.subject,
            'course': m.course,
            'semester': m.semester,
            'section': m.section,
            'uploaded_by': m.uploaded_by,
            'uploaded_by_name': u.full_name if u else None,
            'uploaded_by_email': u.email if u else None,
            'file_url': m.file_url,
            'created_at': m.created_at,
        }
        for m, u in rows
    ]


@api.get('/materials/subjects')
def materials_subjects(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return [row[0] for row in db.query(Material.subject).distinct().all()]


@api.post('/materials')
def create_material(payload: MaterialIn, db: Session = Depends(get_db), user: User = Depends(require_roles(Role.admin, Role.faculty))):
    row = Material(**payload.model_dump(), uploaded_by=user.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@api.put('/materials/{material_id}')
def update_material(material_id: int, payload: MaterialIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(Material).filter(Material.id == material_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return row


@api.delete('/materials/{material_id}')
def delete_material(material_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(Material).filter(Material.id == material_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    db.delete(row)
    db.commit()
    return {'success': True}


@api.put('/attendance/{record_id}')
def update_attendance(record_id: int, payload: AttendanceUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    row.status = payload.status
    db.commit()
    return row


@api.get('/complaints')
def list_complaints(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = (
        db.query(
            Complaint.id,
            Complaint.complaint_code,
            Complaint.student_id,
            Complaint.subject,
            Complaint.description,
            Complaint.status,
            Complaint.reply,
            Complaint.student_attachments,
            Complaint.admin_attachments,
            Complaint.conversation,
            Complaint.student_can_reply,
            Complaint.created_at,
            User.full_name.label('student_name'),
            User.email.label('student_email'),
            User.username.label('student_username'),
        )
        .outerjoin(User, Complaint.student_id == User.id)
    )
    if user.role != Role.admin:
        q = q.filter(Complaint.student_id == user.id)
    rows = q.order_by(Complaint.created_at.desc(), Complaint.id.desc()).all()
    payload = [dict(row._mapping) for row in rows]
    for row in payload:
        row['status'] = normalize_complaint_status(str(row.get('status') or 'pending'))
        if not row.get('conversation'):
            try:
                student_attachments = json.loads(row.get('student_attachments') or '[]')
            except Exception:
                student_attachments = []
            try:
                admin_attachments = json.loads(row.get('admin_attachments') or '[]')
            except Exception:
                admin_attachments = []
            conversation = [
                {
                    'id': f's-{row.get("id")}',
                    'sender': 'student',
                    'text': row.get('description') or '',
                    'timestamp': row.get('created_at').isoformat() if row.get('created_at') else datetime.utcnow().isoformat(),
                    'attachments': student_attachments or [],
                }
            ]
            if row.get('reply') or (admin_attachments and len(admin_attachments) > 0):
                conversation.append(
                    {
                        'id': f'a-{row.get("id")}',
                        'sender': 'admin',
                        'text': row.get('reply') or '',
                        'timestamp': datetime.utcnow().isoformat(),
                        'attachments': admin_attachments or [],
                    }
                )
            row['conversation'] = json.dumps(conversation)
    return payload


@api.get('/complaints/unread-count')
def complaints_unread_count(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    count = db.query(Complaint).filter(Complaint.status.in_(['pending', 'in-review', 'open', 'assigned'])).count()
    return {'count': count}


@api.post('/complaints')
def create_complaint(payload: ComplaintIn, db: Session = Depends(get_db), user: User = Depends(require_roles(Role.student))):
    code = f'CMP-{randint(100000, 999999)}'
    conversation = [
        {
            'id': f's-{int(datetime.utcnow().timestamp() * 1000)}',
            'sender': 'student',
            'text': payload.description,
            'timestamp': datetime.utcnow().isoformat(),
            'attachments': payload.attachments or [],
        }
    ]
    row = Complaint(
        complaint_code=code,
        student_id=user.id,
        subject=payload.subject,
        description=payload.description,
        student_attachments=json.dumps(payload.attachments or []),
        conversation=json.dumps(conversation),
        student_can_reply=False,
    )
    db.add(row)
    db.flush()
    message_id = _record_complaint_message(db, int(row.id), user.id, payload.description or '')
    _record_complaint_attachments(db, int(row.id), message_id, payload.attachments or [], user.id)
    db.commit()
    db.refresh(row)
    return row


@api.post('/complaints/{complaint_id}/reply')
def reply_complaint(complaint_id: int, payload: ComplaintUpdate, db: Session = Depends(get_db), user: User = Depends(require_roles(Role.admin, Role.student))):
    row = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    if user.role != Role.admin and row.student_id != user.id:
        raise HTTPException(status_code=403, detail='Forbidden')
    if normalize_complaint_status(row.status) == 'resolved':
        raise HTTPException(status_code=409, detail='Complaint is resolved')
    if user.role == Role.student and not row.student_can_reply:
        raise HTTPException(status_code=409, detail='Chat is locked until admin enables it')
    try:
        conversation = json.loads(row.conversation or '[]')
        if not isinstance(conversation, list):
            conversation = []
    except Exception:
        conversation = []
    created_message_id: int | None = None
    should_record_message = payload.reply is not None or (payload.attachments is not None and len(payload.attachments or []) > 0)
    if user.role == Role.admin:
        if payload.reply is not None:
            row.reply = payload.reply
        if payload.attachments is not None:
            row.admin_attachments = json.dumps(payload.attachments or [])
        if payload.student_can_reply is not None:
            row.student_can_reply = bool(payload.student_can_reply)
        if payload.reply or (payload.attachments is not None and len(payload.attachments or []) > 0):
            conversation.append(
                {
                    'id': f'a-{int(datetime.utcnow().timestamp() * 1000)}',
                    'sender': 'admin',
                    'text': payload.reply or '',
                    'timestamp': datetime.utcnow().isoformat(),
                    'attachments': payload.attachments or [],
                }
            )
        if should_record_message:
            created_message_id = _record_complaint_message(db, int(row.id), user.id, payload.reply or '')
    else:
        if payload.reply:
            row.description = f"{row.description}\n\n[Student follow-up] {payload.reply}"
        if payload.attachments is not None:
            row.student_attachments = json.dumps(payload.attachments or [])
        if payload.reply or (payload.attachments is not None and len(payload.attachments or []) > 0):
            conversation.append(
                {
                    'id': f's-{int(datetime.utcnow().timestamp() * 1000)}',
                    'sender': 'student',
                    'text': payload.reply or '',
                    'timestamp': datetime.utcnow().isoformat(),
                    'attachments': payload.attachments or [],
                }
            )
        if should_record_message:
            created_message_id = _record_complaint_message(db, int(row.id), user.id, payload.reply or '')
        if should_record_message:
            row.student_can_reply = False
    row.conversation = json.dumps(conversation)
    if should_record_message:
        _record_complaint_attachments(
            db,
            int(row.id),
            created_message_id,
            payload.attachments or [],
            user.id,
        )
    if payload.status:
        requested_status = validate_complaint_status(payload.status)
        if user.role != Role.admin and requested_status not in {'pending', 'in-review'}:
            raise HTTPException(status_code=403, detail='Invalid status update')
        current_status = normalize_complaint_status(row.status)
        validate_complaint_transition(current_status, requested_status)
        row.status = requested_status
        if requested_status == 'resolved':
            row.student_can_reply = False
    db.commit()
    return row


@api.put('/complaints/{complaint_id}/status')
def update_complaint_status(complaint_id: int, payload: ComplaintUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    if payload.status is None and payload.student_can_reply is None:
        raise HTTPException(status_code=400, detail='status or student_can_reply is required')
    if payload.status is not None:
        requested_status = validate_complaint_status(payload.status)
        current_status = normalize_complaint_status(row.status)
        validate_complaint_transition(current_status, requested_status)
        row.status = requested_status
        if requested_status == 'resolved':
            row.student_can_reply = False
    if payload.student_can_reply is not None and normalize_complaint_status(row.status) != 'resolved':
        row.student_can_reply = bool(payload.student_can_reply)
    db.commit()
    return row


@api.put('/complaints/{complaint_id}/assign')
def assign_complaint(complaint_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    current_status = normalize_complaint_status(row.status)
    validate_complaint_transition(current_status, 'in-review')
    row.status = 'in-review'
    db.commit()
    return row


@api.get('/permissions')
def list_permissions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.execute(
        text(
            """
            SELECT
              p.id,
              p.student_id,
              p.reason,
              p.from_date,
              p.to_date,
              p.status,
              p.reviewed_by,
              p.attachments,
              p.created_at,
              u.full_name AS student_name,
              u.email AS student_email,
              s.roll_number,
              s.semester,
              s.section,
              s.course,
              s.department
            FROM permissions p
            LEFT JOIN users u ON u.id = p.student_id
            LEFT JOIN students s ON s.user_id = p.student_id
            WHERE (:is_admin OR p.student_id = :student_id)
            ORDER BY p.created_at DESC
            """
        ),
        {
            'is_admin': user.role == Role.admin,
            'student_id': user.id,
        },
    ).mappings().all()
    return [dict(r) for r in rows]


@api.get('/permissions/pending-count')
def pending_permissions(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return {'count': db.query(PermissionRequest).filter(PermissionRequest.status == 'pending').count()}


@api.post('/permissions')
def create_permission(payload: PermissionIn, db: Session = Depends(get_db), user: User = Depends(require_roles(Role.student))):
    payload_data = payload.model_dump()
    attachments = payload_data.pop('attachments', None)
    row = PermissionRequest(
        student_id=user.id,
        attachments=json.dumps(attachments or []),
        **payload_data,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@api.put('/permissions/{permission_id}/review')
def review_permission(permission_id: int, payload: PermissionReview, db: Session = Depends(get_db), user: User = Depends(require_roles(Role.admin))):
    row = db.query(PermissionRequest).filter(PermissionRequest.id == permission_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    row.status = payload.status
    row.reviewed_by = user.id
    db.commit()
    return row


@api.put('/permissions/{permission_id}')
def update_permission(permission_id: int, payload: PermissionReview, db: Session = Depends(get_db), user: User = Depends(require_roles(Role.admin))):
    row = db.query(PermissionRequest).filter(PermissionRequest.id == permission_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    row.status = payload.status
    row.reviewed_by = user.id
    db.commit()
    return row


@api.get('/notices')
def list_notices(db: Session = Depends(get_db), _: User = Depends(get_current_user), audience: str | None = None):
    q = db.query(Notice)
    if audience:
        q = q.filter(Notice.audience.in_([audience, 'all']))
    return q.order_by(Notice.created_at.desc()).all()


@api.post('/notices')
def create_notice(payload: NoticeIn, db: Session = Depends(get_db), user: User = Depends(require_roles(Role.admin))):
    row = Notice(**payload.model_dump(), created_by=user.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@api.put('/notices/{notice_id}')
def update_notice(notice_id: int, payload: NoticeIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(Notice).filter(Notice.id == notice_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return row


@api.delete('/notices/{notice_id}')
def delete_notice(notice_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(Notice).filter(Notice.id == notice_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    db.delete(row)
    db.commit()
    return {'success': True}


@api.get('/holidays')
def list_holidays(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Holiday).order_by(Holiday.date.asc()).all()


@api.get('/holidays/check')
def holiday_check(check_date: date | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    target = check_date or date.today()
    row = db.query(Holiday).filter(Holiday.date == target).first()
    return {'is_holiday': bool(row), 'holiday': row}


@api.post('/holidays')
def create_holiday(payload: HolidayIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    existing = db.query(Holiday).filter(Holiday.date == payload.date).first()
    if existing:
        for k, v in payload.model_dump().items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return existing
    row = Holiday(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@api.put('/holidays/{holiday_id}')
def update_holiday(holiday_id: int, payload: HolidayIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@api.delete('/holidays/{holiday_id}')
def delete_holiday(holiday_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    db.delete(row)
    db.commit()
    return {'success': True}


@api.get('/period-blocks')
def list_period_blocks():
    return []


@api.post('/period-blocks')
def create_period_block(_: User = Depends(require_roles(Role.admin))):
    return {'message': 'Period block created'}


@api.delete('/period-blocks/{block_id}')
def delete_period_block(block_id: int, _: User = Depends(require_roles(Role.admin))):
    return {'deleted': block_id}


@api.patch('/holidays/{holiday_id}/permission')
def patch_holiday_permission(holiday_id: int, _: User = Depends(require_roles(Role.admin))):
    return {'holiday_id': holiday_id, 'updated': True}


@api.get('/links')
def list_links(db: Session = Depends(get_db), _: User = Depends(get_current_user), audience: str | None = None):
    q = db.query(ImportantLink)
    if audience:
        q = q.filter(ImportantLink.audience.in_([audience, 'all']))
    return q.all()


@api.post('/links')
def create_link(payload: LinkIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = ImportantLink(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@api.put('/links/{link_id}')
def update_link(link_id: int, payload: LinkIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(ImportantLink).filter(ImportantLink.id == link_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return row


@api.delete('/links/{link_id}')
def delete_link(link_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(ImportantLink).filter(ImportantLink.id == link_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    db.delete(row)
    db.commit()
    return {'success': True}


@api.get('/quotes')
def list_quotes(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Quote).all()


@api.get('/quotes/today')
def quote_today(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    row = db.query(Quote).order_by(Quote.id.desc()).first()
    return row or {'text': 'Keep going.', 'author': 'System'}


@api.post('/quotes')
def create_quote(payload: QuoteIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = Quote(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@api.put('/quotes/{quote_id}')
def update_quote(quote_id: int, payload: QuoteIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(Quote).filter(Quote.id == quote_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return row


@api.delete('/quotes/{quote_id}')
def delete_quote(quote_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(Quote).filter(Quote.id == quote_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    db.delete(row)
    db.commit()
    return {'success': True}


@api.get('/bloodbank')
def list_bloodbank(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(BloodBankEntry).all()


@api.post('/bloodbank')
def create_bloodbank(payload: BloodBankIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = BloodBankEntry(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@api.put('/bloodbank/{entry_id}')
def update_bloodbank(entry_id: int, payload: BloodBankIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(BloodBankEntry).filter(BloodBankEntry.id == entry_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return row


@api.patch('/bloodbank/{entry_id}')
def patch_bloodbank(entry_id: int, payload: BloodBankIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(BloodBankEntry).filter(BloodBankEntry.id == entry_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return row


@api.delete('/bloodbank/{entry_id}')
def delete_bloodbank(entry_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    row = db.query(BloodBankEntry).filter(BloodBankEntry.id == entry_id).first()
    if not row:
        raise HTTPException(status_code=404, detail='Not found')
    db.delete(row)
    db.commit()
    return {'success': True}


@api.get('/faculty-status')
def faculty_status(date_value: date | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rows = db.execute(
        text(
            """
            SELECT
              fds.id,
              fds.faculty_id,
              u.full_name AS faculty_name,
              f.employee_id AS employee_id,
              fds.date_value,
              fds.status,
              fds.reason,
              fds.created_at
            FROM faculty_date_status fds
            JOIN faculty f ON f.id = fds.faculty_id
            JOIN users u ON u.id = f.user_id
            WHERE (:date_value IS NULL OR fds.date_value = :date_value)
            ORDER BY fds.date_value DESC, u.full_name ASC
            """
        ),
        {'date_value': date_value},
    ).mappings().all()
    return [dict(r) for r in rows]


@api.get('/faculty-status/blocked')
def faculty_status_blocked(date_value: date | None = None, faculty_id: int | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    check_date = date_value or date.today()
    statuses = ('blocked', 'absent', 'leave')
    if faculty_id is not None:
        row = db.execute(
            text(
                """
                SELECT status
                FROM faculty_date_status
                WHERE faculty_id = :faculty_id AND date_value = :date_value
                ORDER BY created_at DESC
                LIMIT 1
                """
            ),
            {'faculty_id': faculty_id, 'date_value': check_date},
        ).first()
        blocked = bool(row and row[0] in statuses)
        return {'blocked': blocked, 'faculty_id': faculty_id, 'date': check_date}

    count = db.execute(
        text(
            """
            SELECT COUNT(*) FROM faculty_date_status
            WHERE date_value = :date_value AND status = ANY(:statuses)
            """
        ),
        {'date_value': check_date, 'statuses': list(statuses)},
    ).scalar_one()
    return {'blocked': count > 0, 'date': check_date, 'count': int(count)}


@api.get('/faculty-status/monthly')
def faculty_status_monthly(month: int | None = None, year: int | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    now = datetime.utcnow()
    month = month or now.month
    year = year or now.year
    rows = db.execute(
        text(
            """
            SELECT
              fds.faculty_id,
              u.full_name AS faculty_name,
              fds.status,
              COUNT(*) AS days_count
            FROM faculty_date_status fds
            JOIN faculty f ON f.id = fds.faculty_id
            JOIN users u ON u.id = f.user_id
            WHERE EXTRACT(MONTH FROM fds.date_value) = :month
              AND EXTRACT(YEAR FROM fds.date_value) = :year
            GROUP BY fds.faculty_id, u.full_name, fds.status
            ORDER BY u.full_name ASC, fds.status ASC
            """
        ),
        {'month': month, 'year': year},
    ).mappings().all()
    return [dict(r) for r in rows]


@api.post('/faculty-status')
def set_faculty_status(payload: FacultyStatusIn, db: Session = Depends(get_db), user: User = Depends(require_roles(Role.admin))):
    db.execute(
        text(
            """
            INSERT INTO faculty_date_status (faculty_id, date_value, status, reason, set_by)
            VALUES (:faculty_id, :date_value, :status, :reason, :set_by)
            ON CONFLICT (faculty_id, date_value)
            DO UPDATE SET status = EXCLUDED.status, reason = EXCLUDED.reason, set_by = EXCLUDED.set_by
            """
        ),
        {
            'faculty_id': payload.faculty_id,
            'date_value': payload.date_value,
            'status': payload.status,
            'reason': payload.reason,
            'set_by': user.id,
        },
    )
    db.commit()
    return {'updated': True}


@api.post('/timetable/override')
def timetable_override(payload: TimetableOverrideIn, db: Session = Depends(get_db), user: User = Depends(require_roles(Role.admin))):
    row = db.execute(
        text(
            """
            INSERT INTO timetable_overrides
              (timetable_slot_id, date_value, faculty_name, subject, course, semester, section, period_number, is_cancelled, created_by)
            VALUES
              (:timetable_slot_id, :date_value, :faculty_name, :subject, :course, :semester, :section, :period_number, :is_cancelled, :created_by)
            RETURNING id
            """
        ),
        {
            'timetable_slot_id': payload.timetable_slot_id,
            'date_value': payload.date_value,
            'faculty_name': payload.faculty_name,
            'subject': payload.subject,
            'course': payload.course,
            'semester': payload.semester,
            'section': payload.section,
            'period_number': payload.period_number,
            'is_cancelled': payload.is_cancelled,
            'created_by': user.id,
        },
    ).first()
    db.commit()
    return {'updated': True, 'id': int(row[0]) if row else None}


@api.post('/subjects/assign-faculty')
def assign_subject_faculty(payload: SubjectAssignFacultyIn, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    faculty_row = db.query(Faculty, User).join(User, Faculty.user_id == User.id).filter(Faculty.id == payload.faculty_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail='Subject not found')
    if not faculty_row:
        raise HTTPException(status_code=404, detail='Faculty not found')

    faculty_name = faculty_row[1].full_name
    subject.faculty_name = faculty_name
    db.execute(
        text(
            """
            INSERT INTO faculty_subjects (faculty_id, subject_id)
            VALUES (:faculty_id, :subject_id)
            ON CONFLICT (faculty_id, subject_id) DO NOTHING
            """
        ),
        {'faculty_id': payload.faculty_id, 'subject_id': payload.subject_id},
    )
    db.commit()
    return {'updated': True, 'faculty_name': faculty_name}


@api.delete('/subjects/assign-faculty')
def unassign_subject_faculty(subject_id: int, faculty_id: int | None = None, db: Session = Depends(get_db), _: User = Depends(require_roles(Role.admin))):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail='Subject not found')

    if faculty_id is not None:
        db.execute(
            text("DELETE FROM faculty_subjects WHERE subject_id = :subject_id AND faculty_id = :faculty_id"),
            {'subject_id': subject_id, 'faculty_id': faculty_id},
        )
    else:
        db.execute(text("DELETE FROM faculty_subjects WHERE subject_id = :subject_id"), {'subject_id': subject_id})
    subject.faculty_name = None
    db.commit()
    return {'updated': True}


@api.get('/health')
def health():
    return {'ok': True}
