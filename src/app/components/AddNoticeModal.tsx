import React, { useState } from 'react';
import { X, CheckCircle2, Users, GraduationCap } from 'lucide-react';

interface AddNoticeModalProps {
  onClose: () => void;
  onSubmit: (notice: NoticeFormData) => void;
}

export interface NoticeFormData {
  title: string;
  description: string;
  targetAudience: 'students' | 'faculty' | 'all';
  semesters: string[];
  sections: string[];
  color: string;
}

export function AddNoticeModal({ onClose, onSubmit }: AddNoticeModalProps) {
  const [formData, setFormData] = useState<NoticeFormData>({
    title: '',
    description: '',
    targetAudience: 'all',
    semesters: [],
    sections: [],
    color: 'bg-blue-50 border-blue-200',
  });

  const [showSuccess, setShowSuccess] = useState(false);

  const semesters = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];
  const sections = ['Section A', 'Section B', 'Section C', 'Section D'];
  
  const colorOptions = [
    { value: 'bg-blue-50 border-blue-200', label: 'Blue', colorClass: 'bg-blue-400' },
    { value: 'bg-indigo-50 border-indigo-200', label: 'Indigo', colorClass: 'bg-indigo-400' },
    { value: 'bg-purple-50 border-purple-200', label: 'Purple', colorClass: 'bg-purple-400' },
    { value: 'bg-teal-50 border-teal-200', label: 'Teal', colorClass: 'bg-teal-400' },
    { value: 'bg-emerald-50 border-emerald-200', label: 'Emerald', colorClass: 'bg-emerald-400' },
    { value: 'bg-cyan-50 border-cyan-200', label: 'Cyan', colorClass: 'bg-cyan-400' },
  ];

  const handleSemesterToggle = (semester: string) => {
    setFormData(prev => ({
      ...prev,
      semesters: prev.semesters.includes(semester)
        ? prev.semesters.filter(s => s !== semester)
        : [...prev.semesters, semester]
    }));
  };

  const handleSectionToggle = (section: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.includes(section)
        ? prev.sections.filter(s => s !== section)
        : [...prev.sections, section]
    }));
  };

  const handleSelectAllSemesters = () => {
    if (formData.semesters.length === semesters.length) {
      setFormData(prev => ({ ...prev, semesters: [] }));
    } else {
      setFormData(prev => ({ ...prev, semesters: [...semesters] }));
    }
  };

  const handleSelectAllSections = () => {
    if (formData.sections.length === sections.length) {
      setFormData(prev => ({ ...prev, sections: [] }));
    } else {
      setFormData(prev => ({ ...prev, sections: [...sections] }));
    }
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.targetAudience === 'students' && formData.semesters.length === 0) {
      alert('Please select at least one semester for students');
      return;
    }

    if (formData.targetAudience === 'students' && formData.sections.length === 0) {
      alert('Please select at least one section for students');
      return;
    }

    setShowSuccess(true);
    
    setTimeout(() => {
      onSubmit(formData);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8 relative">
        {showSuccess ? (
          <div className="text-center py-12 px-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-gray-900 text-xl mb-2">Notice Published!</h3>
            <p className="text-gray-600">The notice has been successfully sent to the selected recipients.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 rounded-t-3xl flex items-center justify-between">
              <div>
                <h2 className="text-white text-xl">Add New Notice</h2>
                <p className="text-green-100 text-sm">Create and publish notice to students or faculty</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="space-y-5">
                {/* Notice Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notice Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Midterm Examinations, Holiday Announcement"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Notice Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notice Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter detailed notice description..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Audience <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setFormData({ ...formData, targetAudience: 'all', semesters: [], sections: [] })}
                      className={`px-4 py-3 rounded-xl border-2 transition-all ${
                        formData.targetAudience === 'all'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Users className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm font-medium">All</span>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, targetAudience: 'students' })}
                      className={`px-4 py-3 rounded-xl border-2 transition-all ${
                        formData.targetAudience === 'students'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <GraduationCap className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm font-medium">Students</span>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, targetAudience: 'faculty', semesters: [], sections: [] })}
                      className={`px-4 py-3 rounded-xl border-2 transition-all ${
                        formData.targetAudience === 'faculty'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Users className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm font-medium">Faculty</span>
                    </button>
                  </div>
                </div>

                {/* Student Specific Options */}
                {formData.targetAudience === 'students' && (
                  <>
                    {/* Semesters */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Select Semesters <span className="text-red-500">*</span>
                        </label>
                        <button
                          onClick={handleSelectAllSemesters}
                          className="text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                          {formData.semesters.length === semesters.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {semesters.map((semester) => (
                          <button
                            key={semester}
                            onClick={() => handleSemesterToggle(semester)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              formData.semesters.includes(semester)
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {semester.replace('Semester ', 'S')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sections */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Select Sections <span className="text-red-500">*</span>
                        </label>
                        <button
                          onClick={handleSelectAllSections}
                          className="text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                          {formData.sections.length === sections.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {sections.map((section) => (
                          <button
                            key={section}
                            onClick={() => handleSectionToggle(section)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              formData.sections.includes(section)
                                ? 'bg-green-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {section}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notice Color Theme
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {colorOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, color: option.value })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.color === option.value
                            ? 'border-green-500 shadow-md'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        title={option.label}
                      >
                        <div className={`w-8 h-8 ${option.colorClass} rounded-lg mx-auto`}></div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 pb-6">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-colors shadow-lg"
                >
                  Publish Notice
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
