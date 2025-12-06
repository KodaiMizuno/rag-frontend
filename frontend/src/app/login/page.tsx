'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GraduationCap, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name, role);
      }
      router.push('/chat');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-berkeley-blue rounded-xl mb-4">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">DSS Tutor</h1>
          <p className="text-gray-500 mt-1">AI-Powered Data Science Assistant</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Tabs */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                isLogin
                  ? 'bg-white text-berkeley-blue shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                !isLogin
                  ? 'bg-white text-berkeley-blue shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Register
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-berkeley-blue focus:border-transparent"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@berkeley.edu"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-berkeley-blue focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-berkeley-blue focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Role (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  I am a...
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`p-3 border-2 rounded-lg text-center transition-colors ${
                      role === 'student'
                        ? 'border-berkeley-blue bg-berkeley-blue/5 text-berkeley-blue'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl mb-1 block">🎓</span>
                    <span className="text-sm font-medium">Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`p-3 border-2 rounded-lg text-center transition-colors ${
                      role === 'teacher'
                        ? 'border-berkeley-blue bg-berkeley-blue/5 text-berkeley-blue'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl mb-1 block">👩‍🏫</span>
                    <span className="text-sm font-medium">Teacher</span>
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-berkeley-blue text-white font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>{isLogin ? 'Sign In' : 'Create Account'}</>
              )}
            </button>
          </form>

          {/* Continue as Guest */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <button
              onClick={() => router.push('/chat')}
              className="text-sm text-gray-500 hover:text-berkeley-blue transition-colors"
            >
              Continue as guest →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
