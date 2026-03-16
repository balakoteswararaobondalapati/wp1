import { appStorage } from './storage';

export interface AcademicOptions {
  departments: string[];
  sectionsByDepartment: Record<string, string[]>;
  semestersByDepartment: Record<string, string[]>;
}

const parseJson = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const uniqueSorted = (values: string[]) =>
  Array.from(new Set(values.filter(Boolean).map((value) => String(value).trim()))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );

export const getAcademicOptions = (): AcademicOptions => {
  const customDepartments = parseJson<string[]>(appStorage.getItem('customDepartments'), []);
  const customCourseSections = parseJson<Record<string, string[]>>(appStorage.getItem('customCourseSections'), {});
  const academicCourses = parseJson<Record<string, Record<string, unknown[]>>>(
    appStorage.getItem('academic_courses_data'),
    {},
  );
  const academicYears = parseJson<Record<string, Record<string, { startDate?: string; endDate?: string }>>>(
    appStorage.getItem('academic_year_data'),
    {},
  );

  const departmentSet = new Set<string>(customDepartments);
  Object.keys(customCourseSections).forEach((department) => departmentSet.add(department));
  Object.keys(academicCourses).forEach((department) => departmentSet.add(department));
  Object.keys(academicYears).forEach((department) => departmentSet.add(department));

  const departments = uniqueSorted(Array.from(departmentSet));
  const sectionsByDepartment: Record<string, string[]> = {};
  const semestersByDepartment: Record<string, string[]> = {};

  departments.forEach((department) => {
    sectionsByDepartment[department] = uniqueSorted(customCourseSections[department] || []);

    const semesterSet = new Set<string>();
    Object.keys(academicCourses[department] || {}).forEach((semester) => semesterSet.add(String(semester)));
    Object.keys(academicYears[department] || {}).forEach((semester) => semesterSet.add(String(semester)));
    semestersByDepartment[department] = uniqueSorted(Array.from(semesterSet));
  });

  return { departments, sectionsByDepartment, semestersByDepartment };
};
