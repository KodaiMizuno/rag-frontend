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

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [students, setStudents] = useState<StudentStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        {/* Students Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Student Activity</h2>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No students yet
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

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


