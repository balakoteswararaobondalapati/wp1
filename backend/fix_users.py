from app.core.db import engine
from app.core.security import hash_password
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("UPDATE users SET password_hash = :h WHERE email = 'priya.faculty@college.edu'"), {'h': hash_password('faculty123')})
    conn.execute(text("UPDATE users SET password_hash = :h WHERE email = 'rahul2024@college.edu'"), {'h': hash_password('student123')})
    conn.commit()
print('Done!')
