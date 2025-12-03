'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

// Updated interface to match rich source data from backend
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

  // Deduplicate sources by filename, keeping highest relevance
  const uniqueSources = sources.reduce((acc, src) => {
    const key = src.filename;
    if (!acc[key] || src.relevance_score > acc[key].relevance_score) {
      acc[key] = src;
    }
    return acc;
  }, {} as Record<string, Source>);

  const sourceList = Object.values(uniqueSources);

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
        <FileText className="w-3 h-3" />
        Sources ({sourceList.length})
      </p>

      <div className="space-y-2">
        {sourceList.map((source, idx) => {
          const isExpanded = expanded === `${source.filename}-${idx}`;
          const relevancePercent = Math.round(source.relevance_score * 100);

          return (
            <div
              key={`${source.filename}-${idx}`}
              className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
            >
              {/* Header - Always visible */}
              <button
                onClick={() => setExpanded(isExpanded ? null : `${source.filename}-${idx}`)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-blue-100 rounded">
                    <FileText className="w-3 h-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {source.title || source.filename}
                    </p>
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
                        {relevancePercent}% match
                      </span>
                    </div>
                  </div>
                </div>

                {source.snippet && (
                  isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )
                )}
              </button>

              {/* Expanded content - Snippet */}
              {isExpanded && source.snippet && (
                <div className="px-3 py-2 bg-white border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Relevant excerpt:</p>
                  <p className="text-sm text-gray-700 italic leading-relaxed">
                    &ldquo;{source.snippet}&rdquo;
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}