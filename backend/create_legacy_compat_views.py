from sqlalchemy import text

from app.core.db import engine


VIEW_SQL = [
    """
    CREATE OR REPLACE VIEW academics AS
    SELECT
      id,
      name AS course_name,
      code AS course_code,
      course,
      semester,
      section,
      faculty_name
    FROM subjects
    """,
    """
    CREATE OR REPLACE VIEW attendance_entries AS
    SELECT
      id,
      student_roll_number,
      date,
      period_number,
      subject,
      status,
      marked_by,
      created_at
    FROM student_attendance
    """,
    """
    CREATE OR REPLACE VIEW faculty_attendance AS
    SELECT
      id,
      faculty_id,
      date_value AS attendance_date,
      status,
      reason,
      set_by,
      created_at
    FROM faculty_date_status
    """,
    """
    CREATE OR REPLACE VIEW substitutions AS
    SELECT
      id,
      timetable_slot_id,
      date_value,
      faculty_name,
      subject,
      course,
      semester,
      section,
      period_number,
      is_cancelled,
      created_by,
      created_at
    FROM timetable_overrides
    """,
    """
    CREATE OR REPLACE VIEW timetables AS
    SELECT
      id,
      day_of_week,
      period_number,
      subject,
      faculty_name,
      course,
      semester,
      section
    FROM timetable_slots
    """,
    """
    CREATE OR REPLACE VIEW settings AS
    SELECT
      'backend_cors_origins'::TEXT AS key,
      ''::TEXT AS value
    """
]


def apply_views() -> None:
    with engine.begin() as conn:
        for stmt in VIEW_SQL:
            conn.execute(text(stmt))
    print("Legacy compatibility views created.")


if __name__ == "__main__":
    apply_views()
