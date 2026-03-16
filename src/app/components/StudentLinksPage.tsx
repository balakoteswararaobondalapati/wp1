import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, ExternalLink, Calendar } from 'lucide-react';
import { linksAPI } from '../api';
import { appStorage } from './';

interface StudentLinksPageProps {
  onBack: () => void;
}

interface Link {
  id: string;
  title: string;
  description: string;
  url: string;
  created_at?: string;
  createdAt?: string;
  created_by?: string;
  category?: string;
  date?: string;
  department?: string;
  section?: string;
  semester?: string;
}

export function StudentLinksPage({ onBack }: StudentLinksPageProps) {
  const [links, setLinks] = useState<Link[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLinks, setFilteredLinks] = useState<Link[]>([]);
  const [studentProfile, setStudentProfile] = useState<{
    department: string;
    section: string;
    semester: string;
  }>({ department: '', section: '', semester: '' });

  useEffect(() => {
    // Load student profile from current_user
    const loadStudentProfile = () => {
      try {
        const currentUser = appStorage.getItem('current_user');
        if (currentUser) {
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
          } else {
            setStudentProfile({
              department: user.course || '',
              section: user.section || '',
              semester: user.semester || '',
            });
          }
        }
      } catch (error) {
        console.error('Error loading student profile:', error);
      }
    };

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

  useEffect(() => {
    // Load links from API
    const loadLinks = async () => {
      try {
        const fetchedLinks = await linksAPI.getAll();
        setLinks(fetchedLinks);
      } catch (error) {
        console.error('Error loading links:', error);
        setLinks([]);
      }
    };

    loadLinks();

    // Set up polling to refresh links every 10 seconds
    const interval = setInterval(loadLinks, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Filter links based on student's profile and search query
    let filtered = links.filter(link => {
      // If link has no target filters, it's visible to all students
      const hasFilters = link.department || link.section || link.semester;
      
      if (!hasFilters) {
        return true; // Show to all students
      }
      
      // Check if link matches student's profile
      let matches = true;
      
      if (link.department && link.department.trim() !== '') {
        // Case-insensitive comparison
        matches = matches && link.department.toLowerCase().trim() === studentProfile.department.toLowerCase().trim();
      }
      
      if (link.section && link.section.trim() !== '') {
        matches = matches && link.section.toLowerCase().trim() === studentProfile.section.toLowerCase().trim();
      }
      
      if (link.semester && link.semester.trim() !== '') {
        matches = matches && link.semester.toLowerCase().trim() === studentProfile.semester.toLowerCase().trim();
      }
      
      return matches;
    });

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(link =>
        link.title.toLowerCase().includes(query) ||
        (link.description && link.description.toLowerCase().includes(query)) ||
        (link.category && link.category.toLowerCase().includes(query))
      );
    }

    setFilteredLinks(filtered);
  }, [searchQuery, links, studentProfile]);

  const handleLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatLinkDateTime = (link: Link) => {
    const raw = link.created_at || link.createdAt || link.date;
    if (!raw) return null;
    const normalized = typeof raw === 'string' ? raw.replace(' ', 'T') : raw;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    const date = parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const time = parsed.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${date} • ${time}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">Important Links</h1>
            <p className="text-xs text-blue-100">Total: {filteredLinks.length} link{filteredLinks.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search links by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      {/* Links List */}
      <div className="px-4 py-4 space-y-3">
        {filteredLinks.length === 0 ? (
          <div className="text-center py-12">
            <ExternalLink className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">
              {searchQuery ? 'No links found matching your search' : 'No links available'}
            </p>
          </div>
        ) : (
          filteredLinks.map((link) => (
            <div
              key={link.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="p-4">
                {/* Category Badge */}
                {link.category && (
                  <div className="mb-2">
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                      {link.category}
                    </span>
                  </div>
                )}

                {/* Title */}
                <h3 className="text-gray-900 mb-2 pr-8">
                  {link.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                  {link.description}
                </p>

                {/* URL */}
                <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
                  <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 truncate flex-1"
                    onClick={(e) => {
                      e.preventDefault();
                      handleLinkClick(link.url);
                    }}
                  >
                    {link.url}
                  </a>
                </div>

                {/* Date and Open Button */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatLinkDateTime(link) || 'Just now'}</span>
                  </div>
                  
                  <button
                    onClick={() => handleLinkClick(link.url)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm rounded-lg transition-all active:scale-95 shadow-sm"
                  >
                    <span>Open Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
