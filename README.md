
  # WP1

  This is a code bundle for WP1. The original project is available at https://www.figma.com/design/ZcOMNmHYRGsjXUNLqdaZ2O/WP1.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Backend (FastAPI + PostgreSQL)

  1. `cd backend`
  2. `python -m venv .venv`
  3. `.venv\Scripts\activate`
  4. `pip install -r requirements.txt`
  5. `copy .env.example .env` and set your PostgreSQL connection
  6. `uvicorn app.main:app --reload`

  Frontend expects backend API at `http://127.0.0.1:8000/api` by default.
  
