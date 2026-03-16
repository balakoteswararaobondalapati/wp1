# FastAPI Backend

## Run locally

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

API base URL: `http://127.0.0.1:8000/api`

Seeded users on first startup:
- `admin@college.edu` / `admin123` (admin)
- `priya.faculty@college.edu` / `faculty123` (faculty)
- `rahul2024@college.edu` / `student123` (student)
