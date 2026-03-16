from app.core.db import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text('TRUNCATE TABLE users CASCADE'))
    conn.commit()
print('Cleared!')
