// Academic Departments
export const DEPARTMENTS = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Statistics',
  'Electronics',
  'Chemistry',
  'Languages',
  'Commerce',
  'Economics',
  'Bio-Technology',
  'Non-Teaching'
] as const;

export type Department = typeof DEPARTMENTS[number];

// Courses (Streams)
export const COURSES = ['BCA', 'BSc', 'BCom'] as const;

export type Course = typeof COURSES[number];

// Course-specific sections mapping
export const COURSE_SECTIONS: Record<Course, string[]> = {
  'BCA': ['B1', 'B2'],
  'BSc': ['A1', 'A2', 'B', 'C', 'D', 'G', 'K'],
  'BCom': ['D', 'E']
};

// Semesters
export const SEMESTERS = ['1', '2', '3', '4', '5', '6'] as const;

export type Semester = typeof SEMESTERS[number];
