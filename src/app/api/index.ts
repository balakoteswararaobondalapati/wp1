import { appStorage } from '../utils/storage';

const normalizeLocalApiBase = (rawBase: string) => {
  const trimmed = rawBase.trim();
  if (trimmed.startsWith('/')) {
    return trimmed.replace(/\/$/, '');
  }
  try {
    const parsed = new URL(trimmed);
    const localHosts = new Set(['localhost', '127.0.0.1']);
    if (
      typeof window !== 'undefined' &&
      localHosts.has(parsed.hostname) &&
      parsed.hostname !== window.location.hostname
    ) {
      parsed.hostname = window.location.hostname;
      return parsed.toString().replace(/\/$/, '');
    }
    return trimmed.replace(/\/$/, '');
  } catch {
    return trimmed.replace(/\/$/, '');
  }
};

const resolveApiBase = () => {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase) return normalizeLocalApiBase(envBase);
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  return 'http://127.0.0.1:5000/api';
};

const API_BASE_URL = resolveApiBase();

const roleToApiRole = (role: string) => (role === 'lecturer' ? 'faculty' : role);
const apiRoleToUiRole = (role: string) => (role === 'faculty' ? 'lecturer' : role);

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const buildFallbackBase = (baseUrl: string) => {
  try {
    const parsed = new URL(baseUrl);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      if (parsed.port === '8000') {
        parsed.port = '5000';
        return parsed.toString().replace(/\/$/, '');
      }
    }
    return null;
  } catch {
    return null;
  }
};

const request = async (path: string, options: RequestInit = {}, requireAuth = false) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const makeRequest = async (baseUrl: string) =>
    fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    });

  let response: Response;
  try {
    response = await makeRequest(API_BASE_URL);
  } catch (error) {
    const fallbackBase = buildFallbackBase(API_BASE_URL);
    if (!fallbackBase) {
      throw error;
    }
    response = await makeRequest(fallbackBase);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text || `Request failed: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return null;
};

  export const authAPI = {
  async login(identifier: string, password: string, role: string) {
    const data = await request(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ identifier, password, role: roleToApiRole(role) }),
      },
      false,
    );

    const user = {
      ...data.user,
      role: apiRoleToUiRole(data.user.role),
      name: data.user.full_name,
      userId: data.user.username,
    };
    appStorage.setItem('current_user', JSON.stringify(user));
    return user;
  },

  async me() {
    const user = await request('/auth/me', {}, true);
    return {
      ...user,
      role: apiRoleToUiRole(user.role),
      name: user.full_name,
      userId: user.username,
    };
  },

    async updateMe(data: { full_name?: string; avatar_url?: string; current_password?: string; password?: string }) {
      const user = await request('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      }, true);
      const normalizedUser = {
        ...user,
        role: apiRoleToUiRole(user.role),
        name: user.full_name,
        userId: user.username,
      };
      appStorage.setItem('current_user', JSON.stringify(normalizedUser));
      return normalizedUser;
    },

    async forgotPassword(email: string) {
      return request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }, false);
    },

    async verifyOtp(email: string, otp: string) {
      return request('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      }, false);
    },

    async resetPassword(email: string, otp: string, newPassword: string) {
      return request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      }, false);
    },

  logout() {
    request('/auth/logout', { method: 'POST' }, false).catch(() => {});
    appStorage.removeItem('current_user');
  },
};

export const complaintsAPI = {
  async getAll() {
    return request('/complaints', {}, true);
  },

  async create(complaintData: any) {
    return request('/complaints', { method: 'POST', body: JSON.stringify(complaintData) }, true);
  },

  async update(complaintId: string | number, updateData: any) {
    return request(`/complaints/${complaintId}/status`, { method: 'PUT', body: JSON.stringify(updateData) }, true);
  },
  async reply(complaintId: string | number, updateData: any) {
    return request(`/complaints/${complaintId}/reply`, { method: 'POST', body: JSON.stringify(updateData) }, true);
  },
};

export const materialsAPI = {
  async getAll() {
    const rows = await request('/materials', {}, true);
    return (rows || []).map((m: any) => ({
      ...m,
      fileUrl: m.fileUrl || m.file_url || m.fileData || '',
      fileData: m.fileData || m.file_url || m.fileUrl || '',
      fileName: m.fileName || m.file_name || '',
      fileType: m.fileType || m.file_type || '',
      uploadedBy: m.uploaded_by_name || m.uploadedBy || m.uploaded_by || '',
      uploadDate: m.uploadDate || m.uploaded_date || m.created_at || '',
    }));
  },

  async create(materialData: any) {
    const payload = {
      ...materialData,
      file_url: materialData.file_url || materialData.fileUrl || materialData.fileData || null,
    };
    return request('/materials', { method: 'POST', body: JSON.stringify(payload) }, true);
  },

  async delete(materialId: string | number) {
    return request(`/materials/${materialId}`, { method: 'DELETE' }, true);
  },

  async update(materialId: string | number, updateData: any) {
    const payload = {
      ...updateData,
      file_url: updateData.file_url || updateData.fileUrl || updateData.fileData || null,
    };
    return request(`/materials/${materialId}`, { method: 'PUT', body: JSON.stringify(payload) }, true);
  },
};

export const noticesAPI = {
  async getAll() {
    return request('/notices', {}, true);
  },

  async create(noticeData: any) {
    return request('/notices', { method: 'POST', body: JSON.stringify(noticeData) }, true);
  },

  async delete(noticeId: string | number) {
    return request(`/notices/${noticeId}`, { method: 'DELETE' }, true);
  },
};

export const permissionsAPI = {
  async getAll() {
    return request('/permissions', {}, true);
  },

  async create(permissionData: any) {
    return request('/permissions', { method: 'POST', body: JSON.stringify(permissionData) }, true);
  },

  async update(permissionId: string | number, updateData: any) {
    return request(`/permissions/${permissionId}`, { method: 'PUT', body: JSON.stringify(updateData) }, true);
  },
};

export const linksAPI = {
  async getAll() {
    return request('/links', {}, true);
  },

  async create(linkData: any) {
    return request('/links', { method: 'POST', body: JSON.stringify(linkData) }, true);
  },

  async delete(linkId: string | number) {
    return request(`/links/${linkId}`, { method: 'DELETE' }, true);
  },
};

export const holidaysAPI = {
  async getAll() {
    return request('/holidays', {}, true);
  },

  async create(holidayData: { date: string; title: string; description?: string | null }) {
    return request('/holidays', { method: 'POST', body: JSON.stringify(holidayData) }, true);
  },

  async update(holidayId: string | number, holidayData: { date: string; title: string; description?: string | null }) {
    return request(`/holidays/${holidayId}`, { method: 'PUT', body: JSON.stringify(holidayData) }, true);
  },

  async delete(holidayId: string | number) {
    return request(`/holidays/${holidayId}`, { method: 'DELETE' }, true);
  },
};

export const quotesAPI = {
  async getAll() {
    return request('/quotes', {}, true);
  },

  async getToday() {
    return request('/quotes/today', {}, true);
  },

  async create(quoteData: any) {
    return request('/quotes', { method: 'POST', body: JSON.stringify(quoteData) }, true);
  },

  async update(quoteId: string | number, quoteData: any) {
    return request(`/quotes/${quoteId}`, { method: 'PUT', body: JSON.stringify(quoteData) }, true);
  },

  async delete(quoteId: string | number) {
    return request(`/quotes/${quoteId}`, { method: 'DELETE' }, true);
  },
};



export const studentsAPI = {
  async getAll(filters?: { course?: string; semester?: string; section?: string }) {
    const params = new URLSearchParams();
    if (filters?.course) params.set('course', filters.course);
    if (filters?.semester) params.set('semester', filters.semester);
    if (filters?.section) params.set('section', filters.section);
    const query = params.toString();
    return request('/students' + (query ? `?${query}` : ''), {}, true);
  },
  async create(data: any) {
    return request('/students', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        username: data.userId,
        full_name: data.name,
        password: data.password,
        roll_number: data.rollNumber || data.registerNumber || '',
        course: data.department || data.course || '',
        semester: String(data.semester || '1'),
        section: data.section || '',
        department: data.department || data.course || '',
        register_number: data.registerNumber || '',
        phone: data.phone || '',
        date_of_birth: data.dateOfBirth || '',
        gender: data.gender || '',
        blood_group: data.bloodGroup || '',
        address: data.address || '',
        academic_year: data.academicYear || '',
        guardian_relation: data.guardianRelation || '',
        parent_name: data.parentName || '',
        parent_phone: data.parentPhone || '',
        profile_picture: data.profilePicture || '',
      }),
    }, true);
  },
  async delete(id: number) {
    return request('/students/' + id, { method: 'DELETE' }, true);
  },
  async update(id: number, data: any) {
    const clean = (value: any) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    };
    return request('/students/' + id, {
      method: 'PUT',
      body: JSON.stringify({
        full_name: clean(data.name),
        email: clean(data.email),
        roll_number: clean(data.rollNumber || data.registerNumber),
        course: clean(data.department || data.course),
        semester: clean(String(data.semester || '1')),
        section: clean(data.section),
        department: clean(data.department || data.course),
        register_number: clean(data.registerNumber),
        phone: clean(data.phone),
        date_of_birth: clean(data.dateOfBirth),
        gender: clean(data.gender),
        blood_group: clean(data.bloodGroup),
        address: clean(data.address),
        academic_year: clean(data.academicYear),
        guardian_relation: clean(data.guardianRelation),
        parent_name: clean(data.parentName),
        parent_phone: clean(data.parentPhone),
        profile_picture: clean(data.profilePicture),
      }),
    }, true);
  },
};

export const attendanceAPI = {
  async getAll() {
    return request('/attendance', {}, true);
  },
  async analytics(period: 'week' | 'month' | 'semester', semester: string = 'all') {
    const params = new URLSearchParams();
    params.set('period', period);
    if (semester && semester !== 'all') params.set('semester', semester);
    const query = params.toString();
    return request('/attendance/analytics' + (query ? `?${query}` : ''), {}, true);
  },
  async update(id: number, data: { status: 'present' | 'absent' }) {
    return request(`/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },
  async bulkMark(records: Array<{ student_roll_number: string; date: string; period_number: number; subject: string; status: 'present' | 'absent' }>) {
    return request('/attendance/bulk', {
      method: 'POST',
      body: JSON.stringify({ records }),
    }, true);
  },
  async dailyReport(date?: string) {
    const query = date ? `?date_value=${encodeURIComponent(date)}` : '';
    return request('/attendance/daily-report' + query, {}, true);
  },
  async lockStatus() {
    return request('/attendance/lock-status', {}, true);
  },
};

export const timetableAPI = {
  async getAll(filters?: { course?: string; semester?: string; section?: string }) {
    const params = new URLSearchParams();
    if (filters?.course) params.set('course', filters.course);
    if (filters?.semester) params.set('semester', filters.semester);
    if (filters?.section) params.set('section', filters.section);
    const query = params.toString();
    return request('/timetable' + (query ? `?${query}` : ''), {}, true);
  },
  async createSlot(data: {
    day_of_week: string;
    period_number: number;
    subject: string;
    faculty_name: string;
    course: string;
    semester: string;
    section: string;
  }) {
    return request('/timetable/slot', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },
  async updateSlot(id: number, data: {
    day_of_week: string;
    period_number: number;
    subject: string;
    faculty_name: string;
    course: string;
    semester: string;
    section: string;
  }) {
    return request(`/timetable/slot/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },
  async deleteSlot(id: number) {
    return request(`/timetable/slot/${id}`, { method: 'DELETE' }, true);
  },
};

export const subjectsAPI = {
  async getAll(filters?: { course?: string; semester?: string; section?: string }) {
    const params = new URLSearchParams();
    if (filters?.course) params.set('course', filters.course);
    if (filters?.semester) params.set('semester', filters.semester);
    if (filters?.section) params.set('section', filters.section);
    const query = params.toString();
    return request('/subjects' + (query ? `?${query}` : ''), {}, true);
  },
  async create(data: any) {
    return request('/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },
  async update(id: number, data: any) {
    return request(`/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },
  async delete(id: number) {
    return request(`/subjects/${id}`, { method: 'DELETE' }, true);
  },
};

export const facultyAPI = {
  async getAll() {
    const rows = await request('/faculty', {}, true);
    return (rows || []).map((f: any) => ({
      ...f,
      name: f.name || f.full_name || '',
    }));
  },
  async create(data: any) {
    return request('/faculty', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        username: data.userId,
        full_name: data.name,
        password: data.password,
        employee_id: data.employeeId,
        department: data.department,
        designation: data.role || 'Lecturer',
        phone: data.phone,
        gender: data.gender,
        blood_group: data.bloodGroup,
        age: data.age,
        qualification: data.qualification,
        experience: data.experience,
        specialization: data.specialization,
        profile_picture: data.profilePicture,
      }),
    }, true);
  },
  async delete(id: number) {
    return request('/faculty/' + id, { method: 'DELETE' }, true);
  },
  async update(id: number, data: any) {
    const clean = (value: any) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    };
    return request('/faculty/' + id, {
      method: 'PUT',
      body: JSON.stringify({
        full_name: clean(data.name),
        email: clean(data.email),
        employee_id: clean(data.employeeId),
        department: clean(data.department),
        designation: clean(data.role || data.designation || 'Lecturer'),
        phone: clean(data.phone),
        gender: clean(data.gender),
        blood_group: clean(data.bloodGroup),
        age: clean(data.age),
        qualification: clean(data.qualification),
        experience: clean(data.experience),
        specialization: clean(data.specialization),
        profile_picture: clean(data.profilePicture),
      }),
    }, true);
  },
};

export const facultyStatusAPI = {
  async getByDate(dateValue?: string) {
    const query = dateValue ? `?date_value=${encodeURIComponent(dateValue)}` : '';
    return request('/faculty-status' + query, {}, true);
  },
  async getBlocked(dateValue?: string, facultyId?: number) {
    const params = new URLSearchParams();
    if (dateValue) params.set('date_value', dateValue);
    if (typeof facultyId === 'number') params.set('faculty_id', String(facultyId));
    const query = params.toString();
    return request('/faculty-status/blocked' + (query ? `?${query}` : ''), {}, true);
  },
  async monthly(month?: number, year?: number) {
    const params = new URLSearchParams();
    if (typeof month === 'number') params.set('month', String(month));
    if (typeof year === 'number') params.set('year', String(year));
    const query = params.toString();
    return request('/faculty-status/monthly' + (query ? `?${query}` : ''), {}, true);
  },
  async setStatus(payload: { faculty_id: number; date_value: string; status: string; reason?: string | null }) {
    return request('/faculty-status', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, true);
  },
};
