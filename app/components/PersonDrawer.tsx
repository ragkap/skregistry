'use client';

import { X, User } from 'lucide-react';

interface Props {
  fundName: string;
  personNames: string[];
  personUrls: string[];
  onClose: () => void;
}

export default function PersonDrawer({ fundName, personNames, personUrls, onClose }: Props) {
  const people = personNames?.filter(Boolean) || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-sm h-full shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Fund Managers</h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{fundName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {people.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <User className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No managers on record</p>
            </div>
          ) : (
            <div className="space-y-2">
              {people.map((name, i) => (
                <a
                  key={i}
                  href={personUrls?.[i] || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 group transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#24a9a7]/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-[#24a9a7]" />
                  </div>
                  <span className="text-sm text-gray-700 group-hover:text-[#24a9a7] transition-colors">{name}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
