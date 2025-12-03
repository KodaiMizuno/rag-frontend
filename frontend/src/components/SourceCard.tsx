'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
// 👇 CHANGE 1: Import the shared type instead of defining it locally
import { Source } from '@/types'; 

interface SourceCardProps {
  sources: Source[];
}

export default function SourceCard({ sources }: SourceCardProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!sources || sources.length === 0) return null;

  // Deduplicate sources by filename, keeping highest relevance
  const uniqueSources = sources.reduce((acc, src) => {
    const key = src.filename;
    // Keep the one with higher relevance score
    if (!acc[key] || (src.relevance_score || 0) > (acc[key].relevance_score || 0)) {
      acc[key] = src;
    }
    return acc;
  }, {} as Record<string, Source>);

  const sourceList = Object.values(uniqueSources);

  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
        <FileText className="w-3 h-3" />
        Sources ({sourceList.length})
      </p>

      <div className="space-y-2">
        {sourceList.map((source, idx) => {
          const uniqueKey = `${source.filename}-${idx}`;
          const isExpanded = expanded === uniqueKey;
          const relevancePercent = Math.round((source.relevance_score || 0) * 100);

          return (
            <div
              key={uniqueKey}
              className="bg-blue-50/50 rounded-lg border border-blue-100 overflow-hidden"
            >
              {/* Header - Always visible */}
              <button
                onClick={() => setExpanded(isExpanded ? null : uniqueKey)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="p-1 bg-white border border-blue-200 rounded shrink-0">
                    <FileText className="w-3 h-3 text-blue-600" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {source.title && source.title !== "Unknown" ? source.title : source.filename}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="text-blue-600 font-mono bg-blue-100 px-1 rounded text-[10px]">
                        {relevancePercent}%
                      </span>
                      {source.page_number && (
                        <span>p. {source.page_number}</span>
                      )}
                      {source.course_id && (
                        <span className="truncate opacity-75">• {source.course_id}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Only show chevron if there is a snippet to expand */}
                {source.snippet ? (
                  isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  )
                ) : null}
              </button>

              {/* Expanded content - Snippet */}
              {isExpanded && source.snippet && (
                <div className="px-3 py-2 bg-white border-t border-blue-100">
                  <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">Passage context:</p>
                  <p className="text-sm text-gray-700 italic leading-relaxed font-serif pl-2 border-l-2 border-blue-200">
                    "{source.snippet}"
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