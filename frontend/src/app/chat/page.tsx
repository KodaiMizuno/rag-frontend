'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  MessageSquare,
  TrendingUp,
  Award,
  ArrowLeft,
  Loader2,
  Search,
  X,
  CheckCircle,
  XCircle,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface DashboardOverview {
  total_students: number;
  total_questions: number;
  questions_today: number;
  mastery_rate: number;
}

interface StudentStats {
  user_id: string;
  email: string;
  name: string;
  total_questions: number;
  mastered_topics: number;
  last_active?: string;
}

interface StudentActivity {
  query_text: string;
  answered_correctly: string;
  timestamp: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Overview data
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [students, setStudents] = useState<StudentStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search and activity state
  const [searchEmail, setSearchEmail] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentStats | null>(null);
  const [activity, setActivity] = useState<StudentActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'teacher') {
      router.push('/chat');
      return;
    }
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user?.token) return;

    try {
      const [overviewRes, studentsRes] = await Promise.all([
        fetch(`${API_URL}/dashboard/overview`, {
          headers: { 'Authorization': `Bearer ${user.token}` },
        }),
        fetch(`${API_URL}/dashboard/students`, {
          headers: { 'Authorization': `Bearer ${user.token}` },
        }),
      ]);

      if (overviewRes.ok) {
        setOverview(await overviewRes.json());
      }
      if (studentsRes.ok) {
        setStudents(await studentsRes.json());
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudentActivity = async (student: StudentStats) => {
    if (!user?.token) return;
    
    setSelectedStudent(student);
    setLoadingActivity(true);
    setActivity([]);

    try {
      const response = await fetch(
        `${API_URL}/dashboard/student/${student.user_id}/activity`,
        {
          headers: { 'Authorization': `Bearer ${user.token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setActivity(data);
      }
    } catch (error) {
      console.error('Error loading student activity:', error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim() || !user?.token) return;

    setSearchMessage('');
    
    // First check if student exists in our loaded list
    const found = students.find(
      s => s.email.toLowerCase() === searchEmail.toLowerCase()
    );

    if (found) {
      setSearchMessage(`Found: ${found.name || found.email}`);
      loadStudentActivity(found);
    } else {
      // Try to fetch from API
      try {
        const response = await fetch(
          `${API_URL}/dashboard/student/search?email=${encodeURIComponent(searchEmail)}`,
          {
            headers: { 'Authorization': `Bearer ${user.token}` },
          }
        );

        if (response.ok) {
          const student = await response.json();
          setSearchMessage(`Found: ${student.name || student.email}`);
          loadStudentActivity(student);
        } else {
          setSearchMessage('Student not found with that email.');
          setSelectedStudent(null);
          setActivity([]);
        }
      } catch (error) {
        setSearchMessage('Error searching for student.');
      }
    }
  };

  const clearSelection = () => {
    setSelectedStudent(null);
    setActivity([]);
    setSearchEmail('');
    setSearchMessage('');
  };

  // Calculate stats for selected student
  const totalQuestions = activity.length;
  const masteredQuestions = activity.filter(a => a.answered_correctly === 'Y').length;
  const notMasteredQuestions = activity.filter(a => a.answered_correctly === 'N').length;
  const accuracy = totalQuestions > 0 
    ? Math.round((masteredQuestions / totalQuestions) * 100) 
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-berkeley-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/chat')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Teacher Dashboard</h1>
            <p className="text-sm text-gray-500">Monitor student progress and engagement</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Overview Stats Cards */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={<Users className="w-6 h-6" />}
              label="Total Students"
              value={overview?.total_students || 0}
              color="blue"
            />
            <StatCard
              icon={<MessageSquare className="w-6 h-6" />}
              label="Total Questions"
              value={overview?.total_questions || 0}
              color="green"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Questions Today"
              value={overview?.questions_today || 0}
              color="purple"
            />
            <StatCard
              icon={<Award className="w-6 h-6" />}
              label="Mastery Rate"
              value={`${overview?.mastery_rate || 0}%`}
              color="amber"
            />
          </div>
        </section>

        {/* Students Table */}
        <section>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">All Students</h2>
              <span className="text-sm text-gray-500">{students.length} students</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Questions Asked
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Topics Mastered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Last Active
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No students yet
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr 
                        key={student.user_id} 
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedStudent?.user_id === student.user_id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => loadStudentActivity(student)}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{student.name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">{student.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{student.total_questions}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {student.mastered_topics} topics
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {student.last_active
                            ? new Date(student.last_active).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              loadStudentActivity(student);
                            }}
                            className="text-berkeley-blue hover:text-blue-800 text-sm font-medium"
                          >
                            View Activity
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Student Search & Activity Section */}
        <section>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Student Activity</h2>
            </div>
            
            <div className="p-6">
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-center mb-6">
                <div className="relative flex-1 min-w-[250px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    placeholder="Search by student email..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-berkeley-blue focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-berkeley-blue text-white rounded-lg hover:bg-blue-800 transition-colors font-medium"
                >
                  Find Student
                </button>
                {selectedStudent && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </button>
                )}
              </form>

              {searchMessage && (
                <p className="text-sm text-gray-600 mb-4">{searchMessage}</p>
              )}

              {/* No Selection State */}
              {!selectedStudent && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a student from the table above or search by email to view their activity.</p>
                </div>
              )}

              {/* Selected Student Activity */}
              {selectedStudent && (
                <>
                  {/* Student Header */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {selectedStudent.name || 'Unknown Student'}
                        </h3>
                        <p className="text-gray-500">{selectedStudent.email}</p>
                      </div>
                      <button
                        onClick={clearSelection}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* Student Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <MiniStatCard label="Total Questions" value={totalQuestions} />
                    <MiniStatCard 
                      label="Mastered" 
                      value={masteredQuestions} 
                      color="green"
                    />
                    <MiniStatCard 
                      label="Not Mastered" 
                      value={notMasteredQuestions} 
                      color="red"
                    />
                    <MiniStatCard 
                      label="Accuracy" 
                      value={`${accuracy}%`} 
                      color="blue"
                    />
                  </div>

                  {/* Activity Table */}
                  {loadingActivity ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-berkeley-blue" />
                    </div>
                  ) : activity.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p>No activity recorded for this student.</p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Timestamp
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Question / Topic
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {activity.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                                {new Date(row.timestamp).toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                {row.answered_correctly === 'Y' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3" />
                                    Mastered
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    <XCircle className="w-3 h-3" />
                                    Learning
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {row.query_text.length > 100 
                                  ? row.query_text.substring(0, 100) + '...'
                                  : row.query_text
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ============== COMPONENTS ==============

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple' | 'amber';
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className={`inline-flex p-3 rounded-lg ${colors[color]} mb-4`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function MiniStatCard({
  label,
  value,
  color = 'gray',
}: {
  label: string;
  value: string | number;
  color?: 'gray' | 'green' | 'red' | 'blue';
}) {
  const colors = {
    gray: 'bg-gray-50 border-gray-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    blue: 'bg-blue-50 border-blue-200',
  };

  const textColors = {
    gray: 'text-gray-900',
    green: 'text-green-700',
    red: 'text-red-700',
    blue: 'text-blue-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${textColors[color]}`}>{value}</p>
    </div>
  );
}
