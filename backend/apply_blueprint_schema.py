from sqlalchemy import text

from app.core.db import engine


DDL_STATEMENTS = [
    # USERS domain additions
    """
    CREATE TABLE IF NOT EXISTS departments (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) UNIQUE NOT NULL,
      code VARCHAR(32) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    # AUTH
    """
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)
    """,
    """
    CREATE TABLE IF NOT EXISTS otp_codes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code VARCHAR(16) NOT NULL,
      purpose VARCHAR(64) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON otp_codes(user_id)
    """,
    # ACADEMIC
    """
    CREATE TABLE IF NOT EXISTS faculty_subjects (
      id SERIAL PRIMARY KEY,
      faculty_id INTEGER NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(faculty_id, subject_id)
    )
    """,
    # TIMETABLE
    """
    CREATE TABLE IF NOT EXISTS timetable_overrides (
      id SERIAL PRIMARY KEY,
      timetable_slot_id INTEGER REFERENCES timetable_slots(id) ON DELETE SET NULL,
      date_value DATE NOT NULL,
      faculty_name VARCHAR(255),
      subject VARCHAR(255),
      course VARCHAR(64) NOT NULL,
      semester VARCHAR(16) NOT NULL,
      section VARCHAR(16) NOT NULL,
      period_number INTEGER NOT NULL,
      is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_timetable_overrides_date_value ON timetable_overrides(date_value)
    """,
    """
    CREATE TABLE IF NOT EXISTS faculty_date_status (
      id SERIAL PRIMARY KEY,
      faculty_id INTEGER NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
      date_value DATE NOT NULL,
      status VARCHAR(32) NOT NULL,
      reason TEXT,
      set_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(faculty_id, date_value)
    )
    """,
    # ATTENDANCE
    """
    CREATE TABLE IF NOT EXISTS attendance_audit_log (
      id SERIAL PRIMARY KEY,
      attendance_id INTEGER REFERENCES student_attendance(id) ON DELETE SET NULL,
      action VARCHAR(32) NOT NULL,
      old_status VARCHAR(16),
      new_status VARCHAR(16),
      changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      changed_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS attendance_locks (
      id SERIAL PRIMARY KEY,
      date_value DATE NOT NULL,
      course VARCHAR(64) NOT NULL,
      semester VARCHAR(16) NOT NULL,
      section VARCHAR(16) NOT NULL,
      period_number INTEGER NOT NULL,
      locked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(date_value, course, semester, section, period_number)
    )
    """,
    # COMMS
    """
    CREATE TABLE IF NOT EXISTS complaint_messages (
      id SERIAL PRIMARY KEY,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS complaint_attachments (
      id SERIAL PRIMARY KEY,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
      message_id INTEGER REFERENCES complaint_messages(id) ON DELETE CASCADE,
      file_url TEXT NOT NULL,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    # PERMISSIONS
    """
    CREATE TABLE IF NOT EXISTS permission_attachments (
      id SERIAL PRIMARY KEY,
      permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      file_url VARCHAR(500) NOT NULL,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    # CALENDAR
    """
    CREATE TABLE IF NOT EXISTS period_blocks (
      id SERIAL PRIMARY KEY,
      date_value DATE NOT NULL,
      session_name VARCHAR(32),
      period_number INTEGER,
      reason TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """,
    # Views from blueprint
    """
    CREATE OR REPLACE VIEW v_student_attendance_summary AS
    SELECT
      student_roll_number,
      COUNT(*) AS total_records,
      COUNT(*) FILTER (WHERE status = 'present') AS present_count,
      COUNT(*) FILTER (WHERE status = 'absent') AS absent_count,
      ROUND(
        (COUNT(*) FILTER (WHERE status = 'present')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
        2
      ) AS attendance_percent
    FROM student_attendance
    GROUP BY student_roll_number
    """,
    """
    CREATE OR REPLACE VIEW v_faculty_teaching_load AS
    SELECT
      faculty_name,
      course,
      semester,
      section,
      COUNT(*) AS periods_per_week
    FROM timetable_slots
    GROUP BY faculty_name, course, semester, section
    """,
    """
    CREATE OR REPLACE VIEW v_daily_class_attendance AS
    SELECT
      date,
      subject,
      period_number,
      COUNT(*) AS total_students,
      COUNT(*) FILTER (WHERE status = 'present') AS present_students,
      COUNT(*) FILTER (WHERE status = 'absent') AS absent_students
    FROM student_attendance
    GROUP BY date, subject, period_number
    """,
]


def apply_schema() -> None:
    with engine.begin() as conn:
        for stmt in DDL_STATEMENTS:
            conn.execute(text(stmt))
    print("Blueprint schema applied successfully.")


if __name__ == "__main__":
    apply_schema()
