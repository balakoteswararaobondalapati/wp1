# 100% Completion Checklist

## Current status
- [x] Module A (partial): permission submit + history moved to backend
- [x] Module C (core): complaints flow moved to backend-first logic
- [x] Module A (remaining): admin permission review still has storage-era fallback pieces
- [x] Module B: faculty attendance/status DB-only migration
- [x] Module D: profile pages DB-only migration (student/faculty detail + password)
- [x] Module E: dashboard analytics DB-only aggregates
- [ ] Module F: hardening + end-to-end validation (in progress)

## Module C fixes completed in this pass
- [x] Backend `/api/complaints` now role-aware:
- admins get all complaints
- non-admins get only own complaints
- [x] Backend `/api/complaints` now returns enriched student fields for admin UI mapping
- [x] Backend `/api/complaints/{id}/reply` now enforces ownership for non-admin users
- [x] `ComplaintBox` now consumes backend-filtered data directly
- [x] `StudentDashboard` complaint badge now checks backend complaints only
- [x] `AdminDashboard` complaint badge logic now uses DB status, not in-memory message flags
- [x] `ComplaintBox` status/category mapping cleaned to avoid legacy local-only assumptions
- [x] `AdminComplaintsManagement` status mapping updated for legacy `assigned` compatibility
- [x] Removed unused legacy mock complaint store (`src/app/data/complaints.ts`)

## Next execution order

### 1) Module B: Faculty attendance/status DB-only
- [x] Replace `appStorage` reads in `FacultyDashboard.tsx` for active status and schedule blocks with backend endpoints
- [x] Replace `appStorage` writes for faculty active status with `/faculty-status` API writes
- [x] Move faculty attendance record sources to `/attendance` and `/faculty-status` APIs only
- [x] Remove cross-tab storage listeners tied to faculty attendance/status keys
- [x] Verify admin pages read same DB-backed faculty status and attendance state

### 2) Module D: Profile pages DB-only
- [x] `ProfilePage.tsx` + `FacultyProfilePage.tsx`: use `/auth/me` + `/auth/me` update only
- [x] `StudentDetailPage.tsx`: remove local profile/password mirror writes (`registered_students` / `portal_users`)
- [x] `FacultyProfileDetailPage.tsx`: remove local profile/password mirror writes (`registered_faculties` / `portal_users`)
- [x] Remove detail-page attendance reads from storage and load from backend (`/faculty-status`, `/attendance`)
- [x] Ensure profile/password paths use backend APIs only (`/auth/me`, `/students`, `/faculty`)

### 3) Module A remaining: Admin permission review cleanup
- [x] `AdminPermissionManagement.tsx`: remove any fallback reads from `registered_students` or storage-derived joins
- [x] Use backend-enriched permission payload (student metadata) consistently
- [x] Keep action path only through `permissionsAPI.update` or review endpoint

### 4) Module E: Dashboard analytics DB-only
- [x] Replace attendance distribution calculations based on `student_attendance_records` storage
- [x] Add/consume backend aggregate endpoints for:
- overall attendance %
- department-wise attendance
- category splits (excellent/good/average/below-average)
- [x] Replace dashboard cards/charts with API-fed values

### 5) Module F: Hardening and test pass
- [x] Add backend auth/role checks for all mutate routes still accepting generic authenticated users
- [x] Add validation for complaint status transitions
- [x] Add smoke test script for login + role dashboards + critical CRUD flows
- [ ] Run full frontend build and backend startup in a non-sandbox terminal

## Verification checklist (run locally in your terminal)
- [ ] `python -m py_compile backend/app/api.py`
- [ ] `npm run build` (outside restricted sandbox)
- [ ] Login as student -> submit complaint -> admin sees it
- [ ] Admin replies -> student complaint badge appears and thread updates
- [ ] Admin resolves complaint -> status reflected on both admin and student views
- [ ] Permissions submit/review/history still works end-to-end
- [ ] Faculty status changes appear consistently across faculty/admin views
- [ ] Student and faculty profile updates persist after full refresh/logout-login
