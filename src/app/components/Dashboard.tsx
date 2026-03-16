import React from 'react';
import { GraduationCap, BookOpen, Users, BarChart3, Calendar, Settings, LogOut } from 'lucide-react';
import { StudentDashboard } from './StudentDashboard';
import { FacultyDashboard } from './FacultyDashboard';
import { AdminDashboard } from './AdminDashboard';

interface DashboardProps {
  role: string;
  onLogout: () => void;
}

export function Dashboard({ role, onLogout }: DashboardProps) {
  // If student role, show the new StudentDashboard
  if (role === 'student') {
    return <StudentDashboard onLogout={onLogout} />;
  }

  // If lecturer role, show the new FacultyDashboard
  if (role === 'lecturer') {
    return <FacultyDashboard onLogout={onLogout} />;
  }

  // If admin role, show the new AdminDashboard
  if (role === 'admin') {
    return <AdminDashboard onLogout={onLogout} />;
  }

  // For admin, show the existing dashboard
  const getGreeting = () => {
    const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);
    return `Welcome, ${roleCapitalized}`;
  };

  const getDashboardCards = () => {
    switch (role) {
      case 'admin':
        return [
          { icon: Users, title: 'Total Users', count: '1,245', color: 'bg-blue-500' },
          { icon: BookOpen, title: 'Active Courses', count: '48', color: 'bg-indigo-500' },
          { icon: GraduationCap, title: 'Departments', count: '8', color: 'bg-purple-500' },
          { icon: BarChart3, title: 'System Reports', count: '15', color: 'bg-pink-500' },
        ];
      default:
        return [];
    }
  };

  const cards = getDashboardCards();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 font-['Poppins',sans-serif]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-gray-900">Institution Portal</h2>
                <p className="text-sm text-gray-500 capitalize">{role} Dashboard</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">{getGreeting()}</h1>
          <p className="text-gray-600">Here's what's happening with your portal today.</p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {cards.map((card, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${card.color} rounded-lg p-3`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-gray-900 mb-1">{card.count}</h3>
              <p className="text-gray-600 text-sm">{card.title}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span className="text-gray-700">View Courses</span>
            </button>
            <button className="flex items-center gap-3 p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-left">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <span className="text-gray-700">Check Schedule</span>
            </button>
            <button className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left">
              <Settings className="w-5 h-5 text-purple-600" />
              <span className="text-gray-700">Settings</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}