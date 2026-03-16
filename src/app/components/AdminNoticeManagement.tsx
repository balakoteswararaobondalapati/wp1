import React, { useState } from 'react';
import { ArrowLeft, Calendar, Users, GraduationCap, Trash2, Eye, Search, Filter } from 'lucide-react';

export interface AdminNotice {
  id: number;
  title: string;
  description: string;
  date: string;
  time?: string;
  targetAudience: 'students' | 'faculty' | 'all';
  semesters: string[];
  sections: string[];
  color: string;
}

interface AdminNoticeManagementProps {
  onBack: () => void;
  notices: AdminNotice[];
  onDelete: (id: number) => void;
}

export function AdminNoticeManagement({ onBack, notices, onDelete }: AdminNoticeManagementProps) {
  const [selectedNotice, setSelectedNotice] = useState<AdminNotice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAudience, setFilterAudience] = useState<'all' | 'students' | 'faculty' | 'everyone'>('everyone');

  // Filter notices
  const filteredNotices = notices.filter((notice) => {
    const matchesSearch = 
      notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notice.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterAudience === 'everyone' || notice.targetAudience === filterAudience;
    return matchesSearch && matchesFilter;
  });

  // Sort by date (most recent first)
  const sortedNotices = [...filteredNotices].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const getAudienceBadge = (notice: AdminNotice) => {
    switch (notice.targetAudience) {
      case 'students':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'faculty':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'all':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getAudienceIcon = (targetAudience: string) => {
    switch (targetAudience) {
      case 'students':
        return <GraduationCap className="w-4 h-4" />;
      case 'faculty':
        return <Users className="w-4 h-4" />;
      case 'all':
        return <Users className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const handleDeleteNotice = (id: number) => {
    if (window.confirm('Are you sure you want to delete this notice?')) {
      onDelete(id);
      setSelectedNotice(null);
    }
  };

  // Detail View
  if (selectedNotice) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 font-['Poppins',sans-serif]">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-4 shadow-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedNotice(null)}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-white">Notice Details</h1>
              <p className="text-sm text-green-100">View full notice information</p>
            </div>
            <button
              onClick={() => handleDeleteNotice(selectedNotice.id)}
              className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-all active:scale-95"
              title="Delete Notice"
            >
              <Trash2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Notice Content */}
        <div className="p-4">
          {/* Main Notice Card */}
          <div className={`${selectedNotice.color} rounded-2xl p-6 shadow-lg border-2 mb-4`}>
            <h2 className="text-gray-900 text-2xl mb-3">{selectedNotice.title}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <Calendar className="w-4 h-4" />
              <span>{selectedNotice.date}</span>
            </div>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedNotice.description}</p>
          </div>

          {/* Target Audience Card */}
          <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-200 mb-4">
            <h3 className="text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Target Audience
            </h3>
            
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-4 py-2 rounded-lg text-sm border font-medium ${getAudienceBadge(selectedNotice)}`}>
                {selectedNotice.targetAudience === 'all' ? 'Everyone' : selectedNotice.targetAudience.charAt(0).toUpperCase() + selectedNotice.targetAudience.slice(1)}
              </span>
            </div>

            {/* Student Specific Details */}
            {selectedNotice.targetAudience === 'students' && selectedNotice.semesters.length > 0 && (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">Semesters</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedNotice.semesters.map((semester, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-200"
                      >
                        {semester}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Sections</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedNotice.sections.map((section, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200"
                      >
                        {section}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Faculty Notice */}
            {selectedNotice.targetAudience === 'faculty' && (
              <p className="text-sm text-gray-600">
                This notice has been sent to all faculty members.
              </p>
            )}

            {/* All Notice */}
            {selectedNotice.targetAudience === 'all' && (
              <p className="text-sm text-gray-600">
                This notice has been sent to all students and faculty members.
              </p>
            )}
          </div>

          {/* Reach Summary Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 shadow-md border border-green-200">
            <h3 className="text-gray-900 mb-3">Reach Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-3 text-center">
                <p className="text-2xl text-green-600 mb-1">
                  {selectedNotice.targetAudience === 'all' 
                    ? '100%' 
                    : selectedNotice.targetAudience === 'students'
                    ? `${selectedNotice.semesters.length * selectedNotice.sections.length * 12}+`
                    : '87'}
                </p>
                <p className="text-xs text-gray-600">Recipients</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center">
                <p className="text-2xl text-blue-600 mb-1">
                  {selectedNotice.targetAudience === 'students' 
                    ? selectedNotice.semesters.length 
                    : '-'}
                </p>
                <p className="text-xs text-gray-600">Semesters</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-green-50 font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-4 shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-white">Notice Management</h1>
            <p className="text-sm text-green-100">View and manage all notices</p>
          </div>
        </div>

      
      </div>
      {/* Search Bar Section (NOW BELOW HEADER) */}
<div className="p-4 pt-3">
  <div className="relative mb-4">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
    <input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search notices..."
      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
    />
  </div>
</div>


      {/* Content */}
      <div className="p-4">
        {/* Statistics */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 text-center">
            <p className="text-2xl text-gray-900 mb-1">{notices.length}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 shadow-sm border border-purple-200 text-center">
            <p className="text-2xl text-purple-600 mb-1">
              {notices.filter((n) => n.targetAudience === 'all').length}
            </p>
            <p className="text-xs text-gray-600">All</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 shadow-sm border border-blue-200 text-center">
            <p className="text-2xl text-blue-600 mb-1">
              {notices.filter((n) => n.targetAudience === 'students').length}
            </p>
            <p className="text-xs text-gray-600">Students</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 shadow-sm border border-red-200 text-center">
            <p className="text-2xl text-red-600 mb-1">
              {notices.filter((n) => n.targetAudience === 'faculty').length}
            </p>
            <p className="text-xs text-gray-600">Faculty</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setFilterAudience('everyone')}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
              filterAudience === 'everyone'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All Notices
          </button>
          <button
            onClick={() => setFilterAudience('all')}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
              filterAudience === 'all'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Everyone ({notices.filter((n) => n.targetAudience === 'all').length})
          </button>
          <button
            onClick={() => setFilterAudience('students')}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
              filterAudience === 'students'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Students ({notices.filter((n) => n.targetAudience === 'students').length})
          </button>
          <button
            onClick={() => setFilterAudience('faculty')}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
              filterAudience === 'faculty'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Faculty ({notices.filter((n) => n.targetAudience === 'faculty').length})
          </button>
        </div>

        {/* Notices List */}
        <div>
          <h2 className="text-gray-900 mb-3">
            {filterAudience === 'everyone' ? 'All Notices' : `${filterAudience.charAt(0).toUpperCase() + filterAudience.slice(1)} Notices`}
          </h2>
          {sortedNotices.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No notices found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedNotices.map((notice) => (
                <button
                  key={notice.id}
                  onClick={() => setSelectedNotice(notice)}
                  className={`w-full ${notice.color} rounded-xl p-4 shadow-sm border-2 hover:shadow-md transition-all active:scale-98 text-left`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-gray-900 flex-1 pr-2">{notice.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs border flex-shrink-0 flex items-center gap-1 ${getAudienceBadge(notice)}`}>
                      {getAudienceIcon(notice.targetAudience)}
                      <span>
                        {notice.targetAudience === 'all' ? 'All' : notice.targetAudience.charAt(0).toUpperCase() + notice.targetAudience.slice(1)}
                      </span>
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{notice.description}</p>

                  {/* Student specific info */}
                  {notice.targetAudience === 'students' && notice.semesters.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {notice.semesters.slice(0, 3).map((sem, index) => (
                        <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {sem.replace('Semester ', 'S')}
                        </span>
                      ))}
                      {notice.semesters.length > 3 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          +{notice.semesters.length - 3}
                        </span>
                      )}
                      {notice.sections.slice(0, 2).map((sec, index) => (
                        <span key={index} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          {sec}
                        </span>
                      ))}
                      {notice.sections.length > 2 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          +{notice.sections.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{notice.date}</span>
                    </div>
                    <span className="text-gray-400">Tap to view details</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
