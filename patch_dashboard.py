import re

path = r'src\app\components\AdminDashboard.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix import
content = content.replace(
    "import { noticesAPI } from '../api';",
    "import { noticesAPI, studentsAPI, facultyAPI } from '../api';"
)

# Replace handleRegisterStudent using regex
pattern = r'const handleRegisterStudent = \(studentData: StudentRegistrationData\) => \{.*?appStorage\.setItem\(\'registered_students\', JSON\.stringify\(students\)\);'
replacement = """const handleRegisterStudent = async (studentData: StudentRegistrationData) => {
    try {
      await studentsAPI.create(studentData);
      setTotalStudents(prev => prev + 1);
      alert('Student registered successfully!');
    } catch (error: any) {
      alert('Failed to register student: ' + (error.message || 'Unknown error'));
      return;
    }"""
new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
if new_content != content:
    print('Replaced handleRegisterStudent')
content = new_content

# Replace handleRegisterFaculty using regex
pattern2 = r'const handleRegisterFaculty = \(facultyData: FacultyRegistrationData\) => \{.*?appStorage\.setItem\(\'registered_faculties\', JSON\.stringify\(faculties\)\);'
replacement2 = """const handleRegisterFaculty = async (facultyData: FacultyRegistrationData) => {
    try {
      await facultyAPI.create(facultyData);
      setTotalFaculty(prev => prev + 1);
      alert('Faculty registered successfully!');
    } catch (error: any) {
      alert('Failed to register faculty: ' + (error.message || 'Unknown error'));
      return;
    }"""
new_content2 = re.sub(pattern2, replacement2, content, flags=re.DOTALL)
if new_content2 != content:
    print('Replaced handleRegisterFaculty')
content = new_content2

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
