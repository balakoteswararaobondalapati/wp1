from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api import api
from app.core.config import settings
from app.core.db import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models import Faculty, Role, Student, User

app = FastAPI(title='College Portal API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allow_headers=['Authorization', 'Content-Type'],
)

app.include_router(api)


@app.get('/')
def root() -> dict[str, str]:
    return {'message': 'College Portal API is running', 'health': '/api/health', 'docs': '/docs'}


def seed_defaults(db: Session) -> None:
    admin_exists = db.query(User).filter(User.role == Role.admin).first()
    if admin_exists:
        return

    admin = User(
        email='admin@college.edu',
        username='admin',
        full_name='Administrator',
        role=Role.admin,
        password_hash=hash_password('admin123'),
    )
    db.add(admin)
    db.commit()


def ensure_role_profiles(db: Session) -> None:
    student_user_ids = {row[0] for row in db.query(Student.user_id).all()}
    faculty_user_ids = {row[0] for row in db.query(Faculty.user_id).all()}

    student_users = db.query(User).filter(User.role == Role.student).all()
    faculty_users = db.query(User).filter(User.role == Role.faculty).all()

    changed = False

    for user in student_users:
        if user.id in student_user_ids:
            continue
        db.add(
            Student(
                user_id=user.id,
                roll_number=f'STU-{user.id:04d}',
                course='BCA',
                semester='1',
                section='B1',
                department='BCA',
            )
        )
        changed = True

    for user in faculty_users:
        if user.id in faculty_user_ids:
            continue
        db.add(
            Faculty(
                user_id=user.id,
                employee_id=f'FAC-{user.id:04d}',
                department='BCA',
                designation='Lecturer',
            )
        )
        changed = True

    if changed:
        db.commit()


def ensure_subject_columns(db: Session) -> None:
    db.execute(text("ALTER TABLE subjects ADD COLUMN IF NOT EXISTS section VARCHAR(16)"))
    db.execute(text("ALTER TABLE subjects ADD COLUMN IF NOT EXISTS faculty_name VARCHAR(255)"))
    db.commit()

def ensure_links_columns(db: Session) -> None:
    db.execute(text("ALTER TABLE links ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
    db.execute(text("UPDATE links SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
    db.commit()

def ensure_material_columns(db: Session) -> None:
    db.execute(text("ALTER TABLE materials ALTER COLUMN file_url TYPE TEXT"))
    db.commit()

def ensure_quote_columns(db: Session) -> None:
    db.execute(text("ALTER TABLE quotes ADD COLUMN IF NOT EXISTS text_color VARCHAR(32)"))
    db.execute(text("ALTER TABLE quotes ADD COLUMN IF NOT EXISTS bg_color VARCHAR(32)"))
    db.execute(text("ALTER TABLE quotes ADD COLUMN IF NOT EXISTS font_size INTEGER"))
    db.execute(text("ALTER TABLE quotes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
    db.execute(text("UPDATE quotes SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
    db.commit()

def ensure_timetable_columns(db: Session) -> None:
    db.execute(text("ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS time VARCHAR(64)"))
    db.execute(text("ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS room VARCHAR(64)"))
    db.commit()

def ensure_complaint_columns(db: Session) -> None:
    db.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS student_attachments TEXT"))
    db.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS admin_attachments TEXT"))
    db.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS conversation TEXT"))
    db.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS student_can_reply BOOLEAN DEFAULT FALSE"))
    db.execute(text("UPDATE complaints SET student_can_reply = FALSE WHERE student_can_reply IS NULL"))
    db.commit()

def ensure_complaint_chat_tables(db: Session) -> None:
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS complaint_messages (
                id SERIAL PRIMARY KEY,
                complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
                sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
            """
        )
    )
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS complaint_attachments (
                id SERIAL PRIMARY KEY,
                complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
                message_id INTEGER REFERENCES complaint_messages(id) ON DELETE CASCADE,
                file_url TEXT NOT NULL,
                uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
            """
        )
    )
    db.execute(text("ALTER TABLE complaint_attachments ALTER COLUMN file_url TYPE TEXT"))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_complaint_messages_complaint ON complaint_messages(complaint_id)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_complaint_attachments_complaint ON complaint_attachments(complaint_id)"))
    db.commit()

def ensure_permission_columns(db: Session) -> None:
    db.execute(text("ALTER TABLE permissions ADD COLUMN IF NOT EXISTS attachments TEXT"))
    db.commit()

def ensure_password_reset_table(db: Session) -> None:
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS password_reset_otps (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                otp_hash VARCHAR(128) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
    )
    db.execute(text("CREATE INDEX IF NOT EXISTS password_reset_otps_user_id_idx ON password_reset_otps (user_id)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS password_reset_otps_expires_idx ON password_reset_otps (expires_at)"))
    db.commit()

def ensure_faculty_columns(db: Session) -> None:
    db.execute(text("ALTER TABLE faculty ADD COLUMN IF NOT EXISTS phone VARCHAR(64)"))
    db.execute(text("ALTER TABLE faculty ADD COLUMN IF NOT EXISTS gender VARCHAR(16)"))
    db.execute(text("ALTER TABLE faculty ADD COLUMN IF NOT EXISTS blood_group VARCHAR(8)"))
    db.execute(text("ALTER TABLE faculty ADD COLUMN IF NOT EXISTS age VARCHAR(16)"))
    db.execute(text("ALTER TABLE faculty ADD COLUMN IF NOT EXISTS qualification VARCHAR(255)"))
    db.execute(text("ALTER TABLE faculty ADD COLUMN IF NOT EXISTS experience VARCHAR(64)"))
    db.execute(text("ALTER TABLE faculty ADD COLUMN IF NOT EXISTS specialization VARCHAR(255)"))
    db.execute(text("ALTER TABLE faculty ADD COLUMN IF NOT EXISTS profile_picture TEXT"))
    db.commit()

def ensure_student_columns(db: Session) -> None:
    db.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS register_number VARCHAR(64)"))
    db.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(64)"))
    db.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR(32)"))
    db.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS gender VARCHAR(16)"))
    db.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS blood_group VARCHAR(8)"))
    db.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT"))
    db.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_year VARCHAR(32)"))
    db.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_relation VARCHAR(32)"))
    db.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name VARCHAR(255)"))
    db.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(64)"))
    db.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_picture TEXT"))
    db.commit()

def ensure_blood_bank_constraints(db: Session) -> None:
    db.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS blood_bank_contact_key ON blood_bank (contact)"))
    db.commit()

def ensure_faculty_status_table(db: Session) -> None:
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS faculty_date_status (
                id SERIAL PRIMARY KEY,
                faculty_id INTEGER NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
                date_value DATE NOT NULL,
                status VARCHAR(32) NOT NULL,
                reason TEXT,
                set_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
            """
        )
    )
    db.execute(
        text(
            "CREATE INDEX IF NOT EXISTS idx_faculty_date_status_date ON faculty_date_status(date_value)"
        )
    )
    db.execute(
        text(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_date_status_unique ON faculty_date_status(faculty_id, date_value)"
        )
    )
    db.commit()

def sync_blood_bank_from_profiles(db: Session) -> None:
    db.execute(
        text(
            """
            INSERT INTO blood_bank (name, blood_group, contact, is_available)
            SELECT u.full_name, s.blood_group, u.email, TRUE
            FROM students s
            JOIN users u ON u.id = s.user_id
            WHERE s.blood_group IS NOT NULL AND s.blood_group <> ''
            ON CONFLICT (contact)
            DO UPDATE SET name = EXCLUDED.name, blood_group = EXCLUDED.blood_group, is_available = TRUE
            """
        )
    )
    db.execute(
        text(
            """
            INSERT INTO blood_bank (name, blood_group, contact, is_available)
            SELECT u.full_name, f.blood_group, u.email, TRUE
            FROM faculty f
            JOIN users u ON u.id = f.user_id
            WHERE f.blood_group IS NOT NULL AND f.blood_group <> ''
            ON CONFLICT (contact)
            DO UPDATE SET name = EXCLUDED.name, blood_group = EXCLUDED.blood_group, is_available = TRUE
            """
        )
    )
    db.commit()


@app.on_event('startup')
def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_subject_columns(db)
        ensure_links_columns(db)
        ensure_material_columns(db)
        ensure_quote_columns(db)
        ensure_timetable_columns(db)
        ensure_complaint_columns(db)
        ensure_complaint_chat_tables(db)
        ensure_permission_columns(db)
        ensure_password_reset_table(db)
        ensure_faculty_columns(db)
        ensure_student_columns(db)
        ensure_blood_bank_constraints(db)
        ensure_faculty_status_table(db)
        if settings.blood_bank_sync_on_startup:
            sync_blood_bank_from_profiles(db)
        # Always ensure at least one admin exists in production DBs.
        seed_defaults(db)
        ensure_role_profiles(db)
    finally:
        db.close()
