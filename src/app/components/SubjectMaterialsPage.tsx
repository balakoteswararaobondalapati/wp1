import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import { materialsAPI } from '../api';
import { appStorage } from './';

interface SubjectMaterialsPageProps {
  subjectName: string;
  onBack: () => void;
}

interface Material {
  id: number | string;
  unit: string;
  title: string;
  uploadedBy: string;
  uploadDate: string;
  fileName?: string;
  fileData?: string;
  fileType?: string;
}

interface GroupedUnit {
  unitName: string;
  materials: Material[];
}

export function SubjectMaterialsPage({ subjectName, onBack }: SubjectMaterialsPageProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [groupedUnits, setGroupedUnits] = useState<GroupedUnit[]>([]);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [studentSemester, setStudentSemester] = useState<number>(1);
  const [studentProfile, setStudentProfile] = useState<{
    department: string;
    section: string;
    semester: string;
  }>({ department: '', section: '', semester: '' });

  // Load student semester on mount
  useEffect(() => {
    // Function to load student profile
    const loadStudentProfile = () => {
      const currentUser = appStorage.getItem('current_user');
      if (currentUser) {
        try {
          const user = JSON.parse(currentUser);
          
          // Try to get detailed profile from registered_students
          const registeredStudents = JSON.parse(appStorage.getItem('registered_students') || '[]');
          const studentData = registeredStudents.find((s: any) => 
            s.userId === user.userId || s.email === user.email
          );
          
          if (studentData) {
            setStudentProfile({
              department: studentData.department || user.course || '',
              section: studentData.section || user.section || '',
              semester: studentData.semester || user.semester || '',
            });
            const semester = parseInt(studentData.semester || user.semester || '1');
            setStudentSemester(semester);
          } else {
            setStudentProfile({
              department: user.course || '',
              section: user.section || '',
              semester: user.semester || '',
            });
            const semester = parseInt(user.semester || '1');
            setStudentSemester(semester);
          }
        } catch (e) {
          console.error('Failed to load student info', e);
          setStudentSemester(1);
        }
      }
    };

    // Load initial profile
    loadStudentProfile();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      loadStudentProfile();
    };

    window.addEventListener('student_profile_updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('student_profile_updated', handleProfileUpdate);
    };
  }, []);

  // 🔥 FETCH MATERIALS FROM BACKEND
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const backendMaterials = await materialsAPI.getAll();
        
        // Filter materials for this subject, student's profile, and current/previous semesters
        const subjectMaterials = backendMaterials
          .filter((m: any) => {
            // Check if material matches subject
            if (m.subject !== subjectName) {
              return false;
            }

            // Parse semester from various formats: 'Semester 1', '1', 1
            let materialSemester = 1;
            if (typeof m.semester === 'string') {
              const match = m.semester.match(/\d+/);
              materialSemester = match ? parseInt(match[0]) : 1;
            } else if (typeof m.semester === 'number') {
              materialSemester = m.semester;
            }
            
            // Check semester
            if (materialSemester > studentSemester) {
              return false;
            }

            // If material has no target filters, it's visible to all students
            const hasFilters = m.department || m.section;
            
            if (!hasFilters) {
              return true; // Show to all students
            }
            
            // Check if material matches student's profile
            let matches = true;
            
            if (m.department && m.department.trim() !== '') {
              matches = matches && m.department.toLowerCase().trim() === studentProfile.department.toLowerCase().trim();
            }
            
            if (m.section && m.section.trim() !== '') {
              matches = matches && m.section.toLowerCase().trim() === studentProfile.section.toLowerCase().trim();
            }
            
            return matches;
          })
          .map((m: any) => ({
            id: m.id,
            unit: m.unit || 'General', // Store the full unit name
            title: m.title,
            uploadedBy: m.uploadedBy || 'Unknown',
            uploadDate: m.uploadedDate || m.uploadDate || '',
            fileName: m.fileName,
            fileData: m.fileData,
            fileType: m.fileType,
          }));
        
        setMaterials(subjectMaterials);
      } catch (error) {
        console.error('Error fetching materials from backend:', error);
        // If backend fails, show empty state
        setMaterials([]);
      }
    };
    
    fetchMaterials();
    
    // Set up polling to refresh materials every 10 seconds
    const interval = setInterval(fetchMaterials, 10000);
    
    return () => clearInterval(interval);
  }, [subjectName, studentSemester, studentProfile]);

  // Group materials by unit whenever materials change
  useEffect(() => {
    const grouped = materials.reduce((acc: GroupedUnit[], material: Material) => {
      const existingUnit = acc.find(u => u.unitName === material.unit);
      if (existingUnit) {
        existingUnit.materials.push(material);
      } else {
        acc.push({ 
          unitName: material.unit, 
          materials: [material] 
        });
      }
      return acc;
    }, []);
    
    // Sort units alphabetically
    grouped.sort((a, b) => a.unitName.localeCompare(b.unitName));
    
    setGroupedUnits(grouped);
    
    // Auto-expand all units by default for better UX
    if (grouped.length > 0) {
      const allUnitNames = new Set(grouped.map(g => g.unitName));
      setExpandedUnits(allUnitNames);
    }
  }, [materials]);

  const toggleUnit = (unitName: string) => {
    const newExpandedUnits = new Set(expandedUnits);
    if (newExpandedUnits.has(unitName)) {
      newExpandedUnits.delete(unitName);
    } else {
      newExpandedUnits.add(unitName);
    }
    setExpandedUnits(newExpandedUnits);
  };

  const handleDownload = (material: Material) => {
    // Check if file data exists
    if (!material.fileData) {
      alert('File data not available. This material may have been uploaded without file content.');
      return;
    }

    try {
      // Convert base64 to blob
      const base64Data = material.fileData;
      
      // Extract the base64 content (remove data:application/pdf;base64, prefix if present)
      const base64Content = base64Data.includes(',') 
        ? base64Data.split(',')[1] 
        : base64Data;
      
      // Convert base64 to binary
      const binaryString = window.atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create blob from binary data
      const blob = new Blob([bytes], { type: material.fileType || 'application/pdf' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = material.fileName || `${material.title}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ File downloaded successfully:', material.fileName);
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      alert('Error downloading file. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="bg-blue-600 shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h2 className="text-white">{subjectName}</h2>
            <p className="text-xs text-white/80">Study Materials by Unit</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 pb-24">
        <div className="max-w-2xl mx-auto">
          {/* Units List with Collapsible Sections */}
          <div className="space-y-4">
            {groupedUnits.map((group) => {
              const isExpanded = expandedUnits.has(group.unitName);
              return (
                <div
                  key={group.unitName}
                  className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all overflow-hidden"
                >
                  {/* Unit Header - Clickable to expand/collapse */}
                  <button
                    onClick={() => toggleUnit(group.unitName)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-green-700" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-gray-900 font-medium">{group.unitName}</h3>
                        <p className="text-xs text-gray-500">
                          {group.materials.length} {group.materials.length === 1 ? 'material' : 'materials'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Materials List */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50">
                      {group.materials.map((material, index) => (
                        <div
                          key={material.id}
                          className={`px-5 py-4 flex items-start gap-4 ${
                            index !== group.materials.length - 1 ? 'border-b border-gray-100' : ''
                          }`}
                        >
                          {/* Material Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-gray-900 font-medium mb-1">{material.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>Uploaded by {material.uploadedBy}</span>
                              <span>•</span>
                              <span>{material.uploadDate ? new Date(material.uploadDate).toLocaleString() : 'N/A'}</span>
                            </div>
                            {material.fileName && (
                              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                </svg>
                                {material.fileName}
                              </div>
                            )}
                          </div>

                          {/* Download Button */}
                          <button
                            onClick={() => handleDownload(material)}
                            className="flex-shrink-0 w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-sm"
                            aria-label={`Download ${material.title}`}
                          >
                            <Download className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {materials.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-gray-900 mb-2 text-lg font-medium">No materials available</h3>
              <p className="text-gray-500 text-sm">
                Materials for this subject will be uploaded soon
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
