import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from http.cookiejar import CookieJar


API_BASE = os.getenv('SMOKE_API_BASE', 'http://127.0.0.1:8000/api').rstrip('/')


class HttpClient:
    def __init__(self) -> None:
        self.cookies = CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))

    def request(self, method: str, path: str, payload: dict | None = None) -> dict | list | None:
        url = f'{API_BASE}{path}'
        body = None
        headers = {'Content-Type': 'application/json'}
        if payload is not None:
            body = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url=url, data=body, headers=headers, method=method)
        try:
            with self.opener.open(req, timeout=20) as resp:
                raw = resp.read().decode('utf-8') if resp.readable() else ''
                if not raw:
                    return None
                return json.loads(raw)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode('utf-8', errors='ignore')
            raise RuntimeError(f'{method} {path} -> {exc.code}: {detail}') from exc


def env(name: str) -> str | None:
    value = os.getenv(name)
    return value.strip() if value and value.strip() else None


def login(client: HttpClient, identifier: str, password: str, role: str) -> dict:
    data = client.request(
        'POST',
        '/auth/login',
        {'identifier': identifier, 'password': password, 'role': role},
    )
    if not isinstance(data, dict) or 'user' not in data:
        raise RuntimeError(f'Invalid login response for role={role}: {data}')
    return data


def admin_flow(client: HttpClient) -> None:
    me = client.request('GET', '/auth/me')
    print(f'[admin] me: {me.get("username", "unknown")}')
    client.request('GET', '/students')
    client.request('GET', '/faculty')
    client.request('GET', '/permissions')
    client.request('GET', '/complaints')
    client.request('GET', '/attendance/analytics?period=week')

    marker = f'SMOKE Notice {date.today().isoformat()}'
    notice = client.request(
        'POST',
        '/notices',
        {'title': marker, 'description': 'Smoke test notice', 'audience': 'all'},
    )
    notice_id = notice.get('id') if isinstance(notice, dict) else None
    if not notice_id:
        raise RuntimeError(f'[admin] failed to create notice: {notice}')
    client.request('DELETE', f'/notices/{notice_id}')
    print('[admin] notice create/delete ok')


def student_flow(client: HttpClient) -> tuple[str | None, str | None]:
    me = client.request('GET', '/auth/me')
    print(f'[student] me: {me.get("username", "unknown")}')
    marker = f'SMOKE-CMP-{date.today().isoformat()}'
    complaint = client.request(
        'POST',
        '/complaints',
        {'subject': marker, 'description': 'Smoke test complaint'},
    )
    complaint_id = str(complaint.get('id')) if isinstance(complaint, dict) and complaint.get('id') else None

    today = date.today().isoformat()
    permission = client.request(
        'POST',
        '/permissions',
        {'reason': 'Smoke test permission', 'from_date': today, 'to_date': today},
    )
    permission_id = str(permission.get('id')) if isinstance(permission, dict) and permission.get('id') else None
    print('[student] complaint + permission create ok')
    return complaint_id, permission_id


def faculty_flow(client: HttpClient) -> None:
    me = client.request('GET', '/auth/me')
    print(f'[faculty] me: {me.get("username", "unknown")}')
    client.request('GET', '/timetable/today')
    client.request('GET', '/attendance')
    print('[faculty] read endpoints ok')


def admin_follow_up(client: HttpClient, complaint_id: str | None, permission_id: str | None) -> None:
    if complaint_id:
        client.request('PUT', f'/complaints/{complaint_id}/status', {'status': 'in-review'})
        client.request('PUT', f'/complaints/{complaint_id}/status', {'status': 'resolved'})
        print('[admin] complaint status transition ok')
    if permission_id:
        client.request('PUT', f'/permissions/{permission_id}', {'status': 'approved'})
        print('[admin] permission review ok')


def main() -> int:
    admin_id = env('SMOKE_ADMIN_IDENTIFIER')
    admin_pw = env('SMOKE_ADMIN_PASSWORD')
    student_id = env('SMOKE_STUDENT_IDENTIFIER')
    student_pw = env('SMOKE_STUDENT_PASSWORD')
    faculty_id = env('SMOKE_FACULTY_IDENTIFIER')
    faculty_pw = env('SMOKE_FACULTY_PASSWORD')

    failures: list[str] = []
    created_complaint_id: str | None = None
    created_permission_id: str | None = None

    if admin_id and admin_pw:
        try:
            admin = HttpClient()
            login(admin, admin_id, admin_pw, 'admin')
            admin_flow(admin)
        except Exception as exc:  # noqa: BLE001
            failures.append(f'admin flow failed: {exc}')
    else:
        print('[skip] admin flow: set SMOKE_ADMIN_IDENTIFIER and SMOKE_ADMIN_PASSWORD')

    if student_id and student_pw:
        try:
            student = HttpClient()
            login(student, student_id, student_pw, 'student')
            created_complaint_id, created_permission_id = student_flow(student)
        except Exception as exc:  # noqa: BLE001
            failures.append(f'student flow failed: {exc}')
    else:
        print('[skip] student flow: set SMOKE_STUDENT_IDENTIFIER and SMOKE_STUDENT_PASSWORD')

    if faculty_id and faculty_pw:
        try:
            faculty = HttpClient()
            login(faculty, faculty_id, faculty_pw, 'faculty')
            faculty_flow(faculty)
        except Exception as exc:  # noqa: BLE001
            failures.append(f'faculty flow failed: {exc}')
    else:
        print('[skip] faculty flow: set SMOKE_FACULTY_IDENTIFIER and SMOKE_FACULTY_PASSWORD')

    if admin_id and admin_pw and (created_complaint_id or created_permission_id):
        try:
            admin_follow = HttpClient()
            login(admin_follow, admin_id, admin_pw, 'admin')
            admin_follow_up(admin_follow, created_complaint_id, created_permission_id)
        except Exception as exc:  # noqa: BLE001
            failures.append(f'admin follow-up failed: {exc}')

    if failures:
        print('\nSmoke test failures:')
        for item in failures:
            print(f'- {item}')
        return 1

    print('\nSmoke test completed successfully.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
