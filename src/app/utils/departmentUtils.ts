import { appStorage } from './';
/**
 * Utility functions for department/course name normalization
 * Ensures consistency across student registration, attendance marking, and viewing
 */

/**
 * Normalize department name to uppercase standard format
 * Handles variations like "bca", "Bca", "BCA", "bcom", "BCom" etc.
 */
export function normalizeDepartmentName(dept: string | undefined): string {
  if (!dept) return 'BCA'; // Default fallback
  
  const normalized = dept.trim().toUpperCase();
  
  // Map common variations to standard names
  const departmentMap: Record<string, string> = {
    'BCA': 'BCA',
    'BSC': 'BSc',
    'BCOM': 'BCom',
    'B.COM': 'BCom',
    'B.SC': 'BSc',
    'B.C.A': 'BCA',
  };
  
  return departmentMap[normalized] || normalized;
}

/**
 * Get department from student data with fallback chain
 * Tries: department -> course -> default
 */
export function getStudentDepartment(studentData: any, currentUser: any): string {
  const dept = studentData?.department || 
               studentData?.course || 
               currentUser?.department || 
               currentUser?.course || 
               'BCA';
  
  return normalizeDepartmentName(dept);
}

/**
 * Get student information with normalized department
 */
export function getStudentInfo() {
  try {
    const currentUserStr = appStorage.getItem('current_user');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : {};
    
    const registeredStudents = JSON.parse(appStorage.getItem('registered_students') || '[]');
    const studentData = registeredStudents.find((s: any) => 
      s.userId === currentUser.userId || s.email === currentUser.email
    );
    
    const rollNumber = studentData?.rollNumber || studentData?.registerNumber || currentUser.registerNumber || '';
    const department = getStudentDepartment(studentData, currentUser);
    const section = studentData?.section || currentUser.section || 'B1';
    const semester = studentData?.semester || currentUser.semester || '1';
    
    return {
      rollNumber,
      department,
      section,
      semester,
      name: studentData?.name || currentUser?.name || 'Student',
      email: studentData?.email || currentUser?.email || '',
    };
  } catch (error) {
    console.error('Error getting student info:', error);
    return {
      rollNumber: '',
      department: 'BCA',
      section: 'B1',
      semester: '1',
      name: 'Student',
      email: '',
    };
  }
}

/**
 * Check if two department names match (case-insensitive, normalized)
 */
export function departmentsMatch(dept1: string | undefined, dept2: string | undefined): boolean {
  return normalizeDepartmentName(dept1) === normalizeDepartmentName(dept2);
}

/**
 * Determine if a student is in morning or afternoon session
 * BCA and BCom are morning sessions
 * BSc is afternoon session
 */
export function isMorningSession(department: string): boolean {
  const normalized = normalizeDepartmentName(department);
  return normalized === 'BCA' || normalized === 'BCom';
}


