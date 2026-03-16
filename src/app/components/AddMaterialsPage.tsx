import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, X, Upload, FileText, Trash2, BookOpen, File, Search } from 'lucide-react';
import { materialsAPI } from '../api';

interface AddMaterialsPageProps {
  onBack: () => void;
}

interface Material {
  id: number | string;
  title: string;
  class: string;
  subject: string;
  semester: string;
  unit: string;
  uploadedBy: string;
  uploadedDate: string;
  visibility: string;
  fileName?: string;
  department?: string;
  section?: string;
  fileData?: string;
  fileType?: string;
}

export function AddMaterialsPage({ onBack }: AddMaterialsPageProps) {
  const [showModal, setShowModal] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    class: '',
    subject: '',
    semester: '',
    unit: '',
    department: '',
    section: '',
  });

  // 🔥 FETCH MATERIALS FROM BACKEND ON MOUNT
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const backendMaterials = await materialsAPI.getAll();
        if (backendMaterials && backendMaterials.length > 0) {
          setMaterials(backendMaterials);
        }
      } catch (error) {
        console.error('Error fetching materials from backend:', error);
      }
    };
    
    fetchMaterials();
    
    // Set up polling to refresh materials every 10 seconds
    const interval = setInterval(fetchMaterials, 10000);
    
    // 🔥 LISTEN FOR MATERIALS UPDATES FROM OTHER PORTALS
    const handleMaterialsUpdate = () => {
      fetchMaterials();
    };
    
    window.addEventListener('materials_updated', handleMaterialsUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('materials_updated', handleMaterialsUpdate);
    };
  }, []);

  const lecturerNames = ['Dr. Kumar', 'Prof. Sharma', 'Dr. Patel', 'Prof. Singh', 'Dr. Reddy'];
  const classes = ['Class 10-A', 'Class 10-B', 'Class 11-A', 'Class 11-B', 'Class 11-C', 'Class 12-A', 'Class 12-B'];
  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'Statistics'];
  const semesters = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6'];
  const units = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5'];
  const departments = ['BCA', 'BSc', 'BCom'];
  const [existingSubjects, setExistingSubjects] = useState<string[]>([]);
  const [existingUnits, setExistingUnits] = useState<string[]>([]);
  
  // Load existing subjects and units from materials
  useEffect(() => {
    const loadExistingData = () => {
      const uniqueSubjects = new Set<string>();
      const uniqueUnits = new Set<string>();
      
      materials.forEach(material => {
        if (material.subject) uniqueSubjects.add(material.subject);
        if (material.unit) uniqueUnits.add(material.unit);
      });
      
      setExistingSubjects(Array.from(uniqueSubjects).sort());
      setExistingUnits(Array.from(uniqueUnits).sort());
    };
    
    loadExistingData();
  }, [materials]);

  // Get sections based on selected department
  const getSectionsForDepartment = (department: string): string[] => {
    switch (department) {
      case 'BCA':
        return ['B1', 'B2'];
      case 'BSc':
        return ['A1', 'A2', 'B', 'C', 'D', 'G', 'K'];
      case 'BCom':
        return ['D', 'E'];
      default:
        return [];
    }
  };

  const getRandomLecturer = () => {
    return lecturerNames[Math.floor(Math.random() * lecturerNames.length)];
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Please select a PDF file only');
      e.target.value = '';
    }
  };

  const handleUploadMaterial = async () => {
    if (formData.title && formData.subject && formData.semester && formData.unit && selectedFile) {
      // Convert file to base64 for storage
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileBase64 = event.target?.result as string;
        
        const newMaterial: Material = {
          id: Date.now(),
          ...formData,
          uploadedBy: getRandomLecturer(),
          uploadedDate: new Date().toISOString(),
          visibility: 'Visible to students',
          fileName: selectedFile.name,
          fileData: fileBase64, // Store base64 encoded file
          fileType: selectedFile.type,
        };
        
        console.log('🎓 FACULTY: Uploading new material:', newMaterial);
        
        // Add to local state immediately
        setMaterials([...materials, newMaterial]);
        
        // 🔥 SEND TO BACKEND API
        try {
          await materialsAPI.create(newMaterial);
          console.log('✅ FACULTY: Material sent to backend successfully');
          
          // Verify it was saved
          const allMaterials = await materialsAPI.getAll();
          console.log('📚 FACULTY: Total materials in storage:', allMaterials.length);
          console.log('📋 FACULTY: All materials:', allMaterials);
          setMaterials(allMaterials);
          
          // 🔥 DISPATCH EVENT TO NOTIFY STUDENT PORTAL TO REFRESH
          window.dispatchEvent(new CustomEvent('materials_updated'));
        } catch (error) {
          console.error('❌ FACULTY: Failed to send material to backend:', error);
          // Material is still saved locally, so user can still see it
        }
        
        // Reset form
        setFormData({
          title: '',
          class: '',
          subject: '',
          semester: '',
          unit: '',
          department: '',
          section: '',
        });
        setSelectedFile(null);
        
        // Close modal
        setShowModal(false);
      };
      
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUploadMaterials = () => {
    // Handle final upload
    alert(`Successfully uploaded ${materials.length} material(s)!`);
    setMaterials([]);
    setShowModal(false);
  };

  const handleDeleteMaterial = (id: number) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const handleAddAndClose = () => {
    setShowModal(true);
  };

  // Filter materials based on search query
  // Filter materials based on search query (SAFE)
const filteredMaterials = materials.filter((material) => {
  const query = (searchQuery || '').toLowerCase();

  return (
    (material.title || '').toLowerCase().includes(query) ||
    (material.subject || '').toLowerCase().includes(query) ||
    (material.semester || '').toLowerCase().includes(query) ||
    (material.unit || '').toLowerCase().includes(query)
  );
});


  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-50 to-red-50 font-['Poppins',sans-serif] overflow-hidden">
      {/* Fixed Header */}
      <div className="bg-red-400 shadow-sm flex-shrink-0 z-20">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95 flex-shrink-0"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h2 className="text-white">Study Materials</h2>
              <p className="text-white">Upload and manage materials</p>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search materials by title, subject, semester, or unit"
              className="w-full pl-11 pr-4 py-2.5 bg-white/95 border border-white/20 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white transition-all text-sm"
            />
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-4 py-6 pb-24">
          <div className="max-w-2xl mx-auto">
            
            {/* Materials List */}
            <div className="space-y-3">
              {filteredMaterials.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No materials added yet</p>
                </div>
              ) : (
                filteredMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    {/* Title and Delete Button */}
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-gray-900 flex-1">{material.title}</h3>
                      <button
                        onClick={() => handleDeleteMaterial(material.id)}
                        className="w-9 h-9 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors active:scale-95 ml-2 flex-shrink-0"
                      >
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                    
                    {/* Class and Subject */}
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Class</span>
                        <span className="text-sm text-blue-600 font-medium">{material.class}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Subject</span>
                        <span className="text-sm text-purple-600 font-medium">{material.subject}</span>
                      </div>
                    </div>

                    {/* Semester and Unit Badges */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 rounded-lg text-xs font-medium border border-blue-300">
                        {material.semester}
                      </span>
                      <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-green-200 text-green-700 rounded-lg text-xs font-medium border border-green-300">
                        {material.unit}
                      </span>
                    </div>
                    
                    {/* Target Audience */}
                    {(material.department || material.section) && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Target Audience</p>
                        <div className="flex flex-wrap gap-2">
                          {material.department && (
                            <span className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                              📚 {material.department}
                            </span>
                          )}
                          {material.section && (
                            <span className="inline-flex items-center px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium">
                              🏫 Section {material.section}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Upload Info and Visibility */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>
                          Uploaded by {material.uploadedBy} on{' '}
                          {(material.uploadedDate || (material as any).uploadDate)
                            ? new Date(material.uploadedDate || (material as any).uploadDate).toLocaleString()
                            : 'N/A'}
                        </span>
                      </div>
                      <span className="text-xs text-green-600 font-medium">{material.visibility}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Add Material Button at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-4 pb-safe z-20">
        <div className="px-4 pb-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleAddAndClose}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-red-400 text-white rounded-xl hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              <span>Add Material</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setShowModal(false)}
          />

          {/* Modal Content */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto pointer-events-auto animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-3xl z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-gray-900">Upload New Material</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors active:scale-95"
                  >
                    <X className="w-6 h-6 text-gray-700" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 space-y-4">
                
                {/* Title Field */}
                <div>
                  <label htmlFor="title" className="block text-sm text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter material title"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Course Dropdown */}
                <div>
                  <label htmlFor="department" className="block text-sm text-gray-700 mb-2">
                    Course
                  </label>
                  <select
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value, section: '' })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    <option value="">All Courses</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Section Dropdown */}
                <div>
                  <label htmlFor="section" className="block text-sm text-gray-700 mb-2">
                    Section
                  </label>
                  <select
                    id="section"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    <option value="">All Sections</option>
                    {getSectionsForDepartment(formData.department).map((sec) => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                </div>

                {/* Semester Dropdown */}
                <div>
                  <label htmlFor="semester" className="block text-sm text-gray-700 mb-2">
                    Semester <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="semester"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select semester</option>
                    {semesters.map((sem) => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>

                {/* Subject Dropdown */}
                <div>
                  <label htmlFor="subject" className="block text-sm text-gray-700 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="subject"
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Enter subject name"
                    list="subject-suggestions"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <datalist id="subject-suggestions">
                    {existingSubjects.map((subj, index) => (
                      <option key={index} value={subj} />
                    ))}
                    {/* Default subject suggestions */}
                    {subjects.filter(s => !existingSubjects.includes(s)).map((subj, index) => (
                      <option key={`default-${index}`} value={subj} />
                    ))}
                  </datalist>
                  {existingSubjects.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1.5">Existing subjects:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {existingSubjects.slice(0, 6).map((subject, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setFormData({ ...formData, subject })}
                            className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs hover:bg-purple-100 transition-colors border border-purple-200"
                          >
                            {subject}
                          </button>
                        ))}
                        {existingSubjects.length > 6 && (
                          <span className="px-2.5 py-1 text-xs text-gray-500">+{existingSubjects.length - 6} more</span>
                        )}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">Enter subject name or select from existing subjects</p>
                </div>

                {/* Unit Input with Suggestions */}
                <div>
                  <label htmlFor="unit" className="block text-sm text-gray-700 mb-2">
                    Unit Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="unit"
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g., Unit 1: Introduction, Data Structures, etc."
                    list="unit-suggestions"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <datalist id="unit-suggestions">
                    {existingUnits.map((unit, index) => (
                      <option key={index} value={unit} />
                    ))}
                  </datalist>
                  {existingUnits.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1.5">Existing units:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {existingUnits.slice(0, 5).map((unit, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setFormData({ ...formData, unit })}
                            className="px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs hover:bg-green-100 transition-colors border border-green-200"
                          >
                            {unit}
                          </button>
                        ))}
                        {existingUnits.length > 5 && (
                          <span className="px-2.5 py-1 text-xs text-gray-500">+{existingUnits.length - 5} more</span>
                        )}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">Enter the unit number and name or select from existing units</p>
                </div>

                {/* File Upload */}
                <div>
                  <label htmlFor="file" className="block text-sm text-gray-700 mb-2">
                    Attachment <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="file"
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="file"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-all flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <File className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {selectedFile ? (
                          <div>
                            <p className="text-sm text-gray-900 truncate">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">PDF file selected</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-600">Click to upload PDF</p>
                            <p className="text-xs text-gray-500">Only PDF files are allowed</p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-3xl">
                <button
                  onClick={handleUploadMaterial}
                  disabled={!formData.title || !formData.subject || !formData.semester || !formData.unit || !selectedFile}
                  className="w-full py-3.5 bg-gradient-to-r from-red-300 to-red-300 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-red-500 disabled:hover:to-red-600"
                >
                  Upload Material
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Animations */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
