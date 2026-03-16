import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, Plus, Edit2, Trash2, Download, FileText, Upload, X } from 'lucide-react';
import { materialsAPI } from '../api';

interface AdminMaterialsManagementProps {
  onBack: () => void;
}

interface Material {
  id: string;
  title: string;
  description: string;
  subject: string;
  department: string;
  semester: string;
  section?: string;
  fileType: string;
  uploadedBy: string;
  uploadDate: string;
  fileUrl: string;
  fileData: string;
  fileName: string;
}

interface MaterialFormData {
  title: string;
  description: string;
  subject: string;
  department: string;
  semester: string;
  section: string;
  fileType: string;
  fileUrl: string;
}

export function AdminMaterialsManagement({ onBack }: AdminMaterialsManagementProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<MaterialFormData>({
    title: '',
    description: '',
    subject: '',
    department: '',
    semester: '',
    section: '',
    fileType: 'PDF',
    fileUrl: '',
  });

  // Load materials from API on mount
  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      const materialsData = await materialsAPI.getAll();
      setMaterials(materialsData);
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  };

  // Filter materials
  const filteredMaterials = materials.filter(material => {
    const matchesSearch = 
      material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || material.department === selectedDepartment;
    const matchesSemester = selectedSemester === 'all' || material.semester === selectedSemester;

    return matchesSearch && matchesDepartment && matchesSemester;
  });

  const handleAddMaterial = async () => {
    if (!formData.title || !formData.subject || !formData.department || !formData.semester) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const newMaterial = await materialsAPI.create({
        ...formData,
        uploadedBy: 'Admin (Principal)',
        uploadDate: new Date().toISOString().split('T')[0],
        fileUrl: formData.fileUrl || '#',
        fileData: formData.fileUrl || '#', // Also save as fileData for student portal compatibility
        fileName: selectedFile ? selectedFile.name : `${formData.title}.pdf`,
      });

      // Update local state
      setMaterials([newMaterial, ...materials]);
      setShowAddModal(false);
      resetForm();
      
      // Dispatch event to notify student portal
      window.dispatchEvent(new CustomEvent('materials_updated'));
    } catch (error) {
      console.error('Error adding material:', error);
      alert('Failed to add material. Please try again.');
    }
  };

  const handleEditMaterial = async () => {
    if (!editingMaterial) return;

    try {
      const updatedMaterial = await materialsAPI.update(editingMaterial.id, formData);

      // Update local state
      setMaterials(materials.map(m => 
        m.id === editingMaterial.id ? updatedMaterial : m
      ));

      setShowEditModal(false);
      setEditingMaterial(null);
      resetForm();
      
      // Dispatch event to notify student portal
      window.dispatchEvent(new CustomEvent('materials_updated'));
    } catch (error) {
      console.error('Error editing material:', error);
      alert('Failed to update material. Please try again.');
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        await materialsAPI.delete(id);
        
        // Update local state
        setMaterials(materials.filter(m => m.id !== id));
        
        // Dispatch event to notify student portal
        window.dispatchEvent(new CustomEvent('materials_updated'));
      } catch (error) {
        console.error('Error deleting material:', error);
        alert('Failed to delete material. Please try again.');
      }
    }
  };

  const openEditModal = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      title: material.title,
      description: material.description,
      subject: material.subject,
      department: material.department,
      semester: material.semester,
      section: material.section || '',
      fileType: material.fileType,
      fileUrl: material.fileUrl,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      subject: '',
      department: '',
      semester: '',
      section: '',
      fileType: 'PDF',
      fileUrl: '',
    });
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      
      // Check file type
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are allowed');
        return;
      }
      
      setSelectedFile(file);
      
      // Convert file to base64 for storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, fileUrl: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadMaterial = (material: Material) => {
    try {
      // Check if fileUrl exists and is a base64 string
      if (!material.fileUrl || material.fileUrl === '#') {
        alert('No file available for download');
        return;
      }

      // If it's a base64 string, convert and download
      if (material.fileUrl.startsWith('data:')) {
        // Create a link element
        const link = document.createElement('a');
        link.href = material.fileUrl;
        link.download = `${material.title}.${material.fileType.toLowerCase()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // If it's a regular URL, open in new tab
        window.open(material.fileUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading material:', error);
      alert('Failed to download file. Please try again.');
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h2 className="text-white">Materials Management</h2>
            <p className="text-white/80 text-sm">View, add, edit, and delete study materials</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-white text-green-600 px-4 py-2 rounded-xl hover:bg-green-50 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Material</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-green-500">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                <FileText className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{materials.length}</h3>
                <p className="text-gray-600 text-sm">Total Materials</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-lg space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, subject, or uploaded by..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
              >
                <option value="all">All Courses</option>
                <option value="BCA">BCA</option>
                <option value="BSc">BSc</option>
                <option value="BCom">BCom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
              >
                <option value="all">All Semesters</option>
                <option value="I">Semester 1</option>
                <option value="II">Semester 2</option>
                <option value="III">Semester 3</option>
                <option value="IV">Semester 4</option>
                <option value="V">Semester 5</option>
                <option value="VI">Semester 6</option>
              </select>
            </div>
          </div>
        </div>

        {/* Materials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.length > 0 ? (
            filteredMaterials.map((material) => (
              <div key={material.id} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(material)}
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMaterial(material.id)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-gray-900 mb-2">{material.title}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{material.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Subject:</span>
                    <span className="text-sm text-gray-900">{material.subject}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {material.department}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Sem {material.semester}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Uploaded by {material.uploadedBy || 'Unknown'} on {material.uploadDate ? new Date(material.uploadDate).toLocaleString() : 'N/A'}
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadMaterial(material)}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Download {material.fileType}
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <FileText className="w-16 h-16 text-gray-300 mb-3" />
              <p className="text-gray-500">No materials found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 flex items-center justify-between rounded-t-3xl">
              <h3 className="text-white text-xl">Add New Material</h3>
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  placeholder="Enter material title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors resize-none"
                  placeholder="Enter material description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                    placeholder="e.g., Data Structures"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  >
                    <option value="">Select</option>
                    <option value="BCA">BCA</option>
                    <option value="BSc">BSc</option>
                    <option value="BCom">BCom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="section"
                    value={formData.section}
                    onChange={handleInputChange}
                    disabled={!formData.department}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select</option>
                    {getSectionsForDepartment(formData.department).map((section) => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Semester <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  >
                    <option value="">Select</option>
                    <option value="I">Semester 1</option>
                    <option value="II">Semester 2</option>
                    <option value="III">Semester 3</option>
                    <option value="IV">Semester 4</option>
                    <option value="V">Semester 5</option>
                    <option value="VI">Semester 6</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Type
                  </label>
                  <input
                    type="text"
                    name="fileType"
                    value="PDF"
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File
                </label>
                <div 
                  onClick={triggerFileInput}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-500 transition-colors cursor-pointer"
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  {selectedFile ? (
                    <>
                      <p className="text-green-600 mb-1 font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-gray-400">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-600 mb-1">Click to upload or drag and drop</p>
                      <p className="text-sm text-gray-400">PDF only (max. 10MB)</p>
                    </>
                  )}
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileSelect}
                    className="hidden" 
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMaterial}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all active:scale-95"
                >
                  Add Material
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Material Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between rounded-t-3xl">
              <h3 className="text-white text-xl">Edit Material</h3>
              <button
                onClick={() => { setShowEditModal(false); setEditingMaterial(null); resetForm(); }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Enter material title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  placeholder="Enter material description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g., Data Structures"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select</option>
                    <option value="BCA">BCA</option>
                    <option value="BSc">BSc</option>
                    <option value="BCom">BCom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="section"
                    value={formData.section}
                    onChange={handleInputChange}
                    disabled={!formData.department}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select</option>
                    {getSectionsForDepartment(formData.department).map((section) => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Semester <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select</option>
                    <option value="I">Semester 1</option>
                    <option value="II">Semester 2</option>
                    <option value="III">Semester 3</option>
                    <option value="IV">Semester 4</option>
                    <option value="V">Semester 5</option>
                    <option value="VI">Semester 6</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Type
                  </label>
                  <select
                    name="fileType"
                    value={formData.fileType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="PDF">PDF</option>
                    <option value="DOC">DOC</option>
                    <option value="PPT">PPT</option>
                    <option value="VIDEO">Video</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowEditModal(false); setEditingMaterial(null); resetForm(); }}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditMaterial}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
