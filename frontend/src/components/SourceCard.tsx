// frontend/src/components/SourceCard.tsx

'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface Source {
  filename: string;
  title: string;
  course_id?: string;
  chunk_id?: number;
  page_number?: number;
  snippet: string;
  relevance_score: number;
}

interface SourceCardProps {
  sources: Source[];
}

export default function SourceCard({ sources }: SourceCardProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
        <FileText className="w-3 h-3" />
        Sources ({sources.length})
      </p>
      
      <div className="space-y-2">
        {sources.map((source, idx) => (
          <div
            key={`${source.filename}-${idx}`}
            className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
          >
            {/* Header - Always visible */}
            <button
              onClick={() => setExpanded(expanded === source.filename ? null : source.filename)}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2 text-left">
                <div className="p-1 bg-blue-100 rounded">
                  <FileText className="w-3 h-3 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{source.title}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {source.course_id && (
                      <span className="bg-berkeley-blue/10 text-berkeley-blue px-1.5 py-0.5 rounded">
                        {source.course_id}
                      </span>
                    )}
                    {source.page_number && (
                      <span>Page {source.page_number}</span>
                    )}
                    <span className="text-gray-400">
                      {Math.round(source.relevance_score * 100)}% match
                    </span>
                  </div>
                </div>
              </div>
              
              {expanded === source.filename ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            
            {/* Expanded content - Snippet */}
            {expanded === source.filename && (
              <div className="px-3 py-2 bg-white border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Relevant excerpt:</p>
                <p className="text-sm text-gray-700 italic leading-relaxed">
                  "{source.snippet}"
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
