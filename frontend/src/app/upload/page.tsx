'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Document {
  doc_id: string;
  title: string;
  course_id: string;
  content_type: string;
  filename: string;
  chunk_count?: number;
  uploaded_at: string;
}

export default function UploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [contentType, setContentType] = useState('lecture');

  useEffect(() => {
    if (!user || user.role !== 'teacher') {
      router.push('/chat');
      return;
    }
    loadDocuments();
  }, [user]);

  const loadDocuments = async () => {
    if (!user?.token) return;

    try {
      const response = await fetch(`${API_URL}/documents`, {
        headers: { 'Authorization': `Bearer ${user.token}` },
      });
      if (response.ok) {
        setDocuments(await response.json());
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user?.token) return;

    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('course_id', courseId);
    formData.append('content_type', contentType);

    try {
      const response = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadStatus({
          type: 'success',
          message: `Document uploaded! Created ${result.chunks_created} searchable chunks.`,
        });
        setFile(null);
        setTitle('');
        setCourseId('');
        loadDocuments();
      } else {
        const error = await response.json();
        setUploadStatus({
          type: 'error',
          message: error.detail || 'Upload failed',
        });
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: 'Network error. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!user?.token) return;

    try {
      await fetch(`${API_URL}/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` },
      });
      setDocuments(documents.filter((d) => d.doc_id !== docId));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/chat')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Document Upload</h1>
            <p className="text-sm text-gray-500">Add course materials to the AI tutor</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Upload Form */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New Document</h2>

          {uploadStatus && (
            <div
              className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
                uploadStatus.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {uploadStatus.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {uploadStatus.message}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PDF File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-berkeley-blue transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  {file ? (
                    <p className="text-berkeley-blue font-medium">{file.name}</p>
                  ) : (
                    <p className="text-gray-500">Click to select a PDF file</p>
                  )}
                </label>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Lecture 5: Linear Regression"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-berkeley-blue"
                required
              />
            </div>

            {/* Course ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course ID
              </label>
              <input
                type="text"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder="e.g., DATA100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-berkeley-blue"
                required
              />
            </div>

            {/* Content Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-berkeley-blue"
              >
                <option value="lecture">Lecture Notes</option>
                <option value="textbook">Textbook Chapter</option>
                <option value="assignment">Assignment</option>
                <option value="exam">Exam/Quiz</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!file || isUploading}
              className="w-full py-3 bg-berkeley-blue text-white font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing document...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload Document
                </>
              )}
            </button>
          </form>
        </div>

        {/* Uploaded Documents */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Uploaded Documents</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No documents uploaded yet
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <div key={doc.doc_id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{doc.title}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="bg-gray-100 px-2 py-0.5 rounded">{doc.course_id}</span>
                        <span>{doc.chunk_count} chunks</span>
                        <span>•</span>
                        <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteDocument(doc.doc_id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
