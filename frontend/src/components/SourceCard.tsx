'use client';

import { FileText } from 'lucide-react';

// FIX 1: Updated interface to match your current backend data (list of strings)
interface SourceCardProps {
  sources: string[];
}

export default function SourceCard({ sources }: SourceCardProps) {
  // We removed the 'expanded' state because we don't have snippets to expand yet.
  
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
        <FileText className="w-3 h-3" />
        Sources ({sources.length})
      </p>
      
      <div className="space-y-2">
        {sources.map((sourcePath, idx) => {
          // Logic: Extract just the filename from the full path
          // e.g., "data/pdfs/lecture1.pdf" -> "lecture1.pdf"
          const title = sourcePath.includes('/') ? sourcePath.split('/').pop() : sourcePath;

          return (
            <div
              key={`${title}-${idx}`}
              className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
            >
              {/* Card Header */}
              <div className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-2 text-left">
                  <div className="p-1 bg-blue-100 rounded">
                    <FileText className="w-3 h-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                       {/* Optional: Add a static tag since we know these are documents */}
                       <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                        Document
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}