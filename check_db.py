from app.core.db import engine
from sqlalchemy import text

with engine.connect() as conn:
    users = conn.execute(text('SELECT id, email, full_name, role, username FROM users')).fetchall()
    print('=== USERS ===')
    for u in users:
        print(u)
