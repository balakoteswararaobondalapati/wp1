import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Link as LinkIcon, ExternalLink, Upload, Download, Loader2 } from 'lucide-react';
import { DEPARTMENTS, COURSES, SEMESTERS, COURSE_SECTIONS } from '@/constants/departments';
import { linksAPI } from '../api';

interface AdminLinksManagementProps {
  onBack: () => void;
}

export interface Link {
  id: string;
  title: string;
  description: string;
  url: string;
  created_at: string;
  created_by: string;
  department?: string; // This stores course data (BCA, BSc, BCom)
  section?: string;
  semester?: string;
}

export function AdminLinksManagement({ onBack }: AdminLinksManagementProps) {
  const [links, setLinks] = useState<Link[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    department: '',
    section: '',
    semester: '',
  });

  // Dropdown options
  const courses = [...COURSES];
  const semesters = SEMESTERS;

  // Get sections based on selected course
  const getAvailableSections = () => {
    if (!formData.department) return [];
    const courseKey = formData.department as 'BCA' | 'BSc' | 'BCom';
    return COURSE_SECTIONS[courseKey] || [];
  };

  // Load links on mount
  useEffect(() => {
    loadLinks();
    const intervalId = setInterval(loadLinks, 10000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadLinks();
      }
    };

    const handleLinksUpdate = () => {
      loadLinks();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('links_updated', handleLinksUpdate);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('links_updated', handleLinksUpdate);
    };
  }, []);

  const normalizeLink = (raw: any): Link => ({
    id: String(raw?.id ?? ''),
    title: raw?.title ?? '',
    description: raw?.description ?? '',
    url: raw?.url ?? '',
    created_at: raw?.created_at ?? raw?.createdAt ?? '',
    created_by: raw?.created_by ?? raw?.createdBy ?? 'admin',
    department: raw?.department ?? raw?.course ?? '',
    section: raw?.section ?? '',
    semester: raw?.semester ?? '',
  });

  const loadLinks = async () => {
    setIsLoading(true);
    try {
      const fetchedLinks = await linksAPI.getAll();
      setLinks((fetchedLinks || []).map(normalizeLink));
    } catch (error) {
      console.error('Failed to load links:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLink = async () => {
    if (!formData.title.trim() || !formData.url.trim()) {
      alert('Please fill in title and URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(formData.url);
    } catch {
      alert('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    setIsSubmitting(true);
    try {
      const newLink = await linksAPI.create({
        title: formData.title.trim(),
        description: formData.description.trim(),
        url: formData.url.trim(),
        created_by: 'admin',
        department: formData.department.trim(),
        section: formData.section.trim(),
        semester: formData.semester.trim(),
      });

      // Add new link to the top of the list
      setLinks([normalizeLink(newLink), ...links]);
      
      // Reset form and close
      setFormData({ title: '', description: '', url: '', department: '', section: '', semester: '' });
      setShowAddForm(false);
      
      // Show success message
      alert('Link posted successfully! Students can now see this link.');
      window.dispatchEvent(new CustomEvent('links_updated'));
      loadLinks();
    } catch (error) {
      console.error('Failed to create link:', error);
      alert('Failed to create link. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) {
      return;
    }

    try {
      await linksAPI.delete(linkId);
      setLinks(links.filter((link) => link.id !== linkId));
      window.dispatchEvent(new CustomEvent('links_updated'));
    } catch (error) {
      console.error('Failed to delete link:', error);
      alert('Failed to delete link. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-4 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h2 className="text-white">Links Management</h2>
            <p className="text-white/80 text-sm">Manage important links for students</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {/* Add Link Button */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-xl shadow-md transition-all hover:from-green-700 hover:to-emerald-700 active:scale-95 flex items-center justify-center gap-2 mb-6"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add New Link</span>
        </button>

        {/* Add Link Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl p-5 shadow-md mb-6">
            <h3 className="text-gray-900 mb-4 flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-green-600" />
              Add New Link
            </h3>

            {/* Title Input */}
            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., College Website, Important Notice"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                maxLength={100}
              />
            </div>

            {/* Description Input */}
            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description about this link..."
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors resize-none"
                rows={3}
                maxLength={300}
              />
            </div>

            {/* URL Input */}
            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-2 font-medium">
                URL *
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>

            {/* Targeting Section */}
            <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <p className="text-sm text-blue-900 mb-3 font-medium">📌 Target Specific Students (Optional)</p>
              <p className="text-xs text-blue-700 mb-3">
                Select "All" in each dropdown to show this link to ALL students. Choose specific values to target particular groups.
              </p>
            
              {/* Course Input */}
              <div className="mb-3">
                <label className="block text-sm text-gray-700 mb-2 font-medium">
                  Course
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value, section: '' })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors bg-white"
                >
                  <option value="">All Courses</option>
                  {courses.map((course) => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>

              {/* Section Input */}
              <div className="mb-3">
                <label className="block text-sm text-gray-700 mb-2 font-medium">
                  Section
                </label>
                <select
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  disabled={!formData.department}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">All Sections</option>
                  {getAvailableSections().map((sec) => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>

              {/* Semester Input */}
              <div>
                <label className="block text-sm text-gray-700 mb-2 font-medium">
                  Semester
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors bg-white"
                >
                  <option value="">All Semesters</option>
                  {semesters.map((sem) => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleAddLink}
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-xl transition-all hover:from-green-700 hover:to-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Post Link</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ title: '', description: '', url: '', department: '', section: '', semester: '' });
                }}
                disabled={isSubmitting}
                className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Links List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        ) : links.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-md">
            <LinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No links posted yet</p>
            <p className="text-sm text-gray-500 mt-1">Click "Add New Link" to create one</p>
          </div>
        ) : (
          <div>
            {/* History Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                <LinkIcon className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="text-gray-900 font-semibold">Posted Links History</h3>
              <span className="ml-auto bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                {links.length} {links.length === 1 ? 'Link' : 'Links'}
              </span>
            </div>

            {/* Links Cards */}
            <div className="space-y-4">
              {links.map((link, index) => (
                <div
                  key={link.id}
                  className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all border-l-4 border-green-500"
                >
                  {/* Header with index and delete */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Link Number Badge */}
                      <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-bold">#{index + 1}</span>
                      </div>
                      
                      {/* Link Icon */}
                      <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                        <LinkIcon className="w-5 h-5 text-green-600" />
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="w-9 h-9 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors active:scale-95"
                      title="Delete link"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>

                  {/* Link Details */}
                  <div className="space-y-3 pl-11">
                    {/* Title */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Title</p>
                      <h3 className="text-gray-900 font-semibold text-lg">{link.title}</h3>
                    </div>

                    {/* Description */}
                    {link.description && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Description</p>
                        <p className="text-gray-700 leading-relaxed">{link.description}</p>
                      </div>
                    )}

                    {/* URL */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Link URL</p>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium bg-green-50 px-3 py-2 rounded-lg hover:bg-green-100 transition-all"
                      >
                        <span className="break-all">{link.url}</span>
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      </a>
                    </div>

                    {/* Target Audience */}
                    {(link.department || link.section || link.semester) && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Target Audience</p>
                        <div className="flex flex-wrap gap-2">
                          {link.department && (
                            <span className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                              📚 {link.department}
                            </span>
                          )}
                          {link.section && (
                            <span className="inline-flex items-center px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium">
                              🏫 Section {link.section}
                            </span>
                          )}
                          {link.semester && (
                            <span className="inline-flex items-center px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium">
                              📖 {link.semester}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
                      {/* Posted Date */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs">📅</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Posted On</p>
                          <p className="text-sm text-gray-700 font-medium">
                            {link.created_at
  ? new Date(link.created_at.replace(' ', 'T')).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  : 'Just now'}

                          </p>
                        </div>
                      </div>

                      {/* Posted Time */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs">🕒</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Time</p>
                          <p className="text-sm text-gray-700 font-medium">
                           {link.created_at
  ? new Date(link.created_at.replace(' ', 'T')).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  : '--:--'}

                          </p>
                        </div>
                      </div>

                      {/* Created By */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs">👤</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Posted By</p>
                          <p className="text-sm text-gray-700 font-medium capitalize">{link.created_by}</p>
                        </div>
                      </div>

                      {/* Link ID */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs">🔑</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Link ID</p>
                          <p className="text-xs text-gray-600 font-mono">
                            {link.id ? `${String(link.id).slice(0, 8)}...` : '--'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 pt-2">
                      {(link.department || link.section || link.semester) ? (
                        <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-xs font-medium">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                          <span>Targeted to Specific Students</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span>Visible to All Students</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
