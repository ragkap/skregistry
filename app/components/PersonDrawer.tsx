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
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div
        className="w-full max-w-sm h-full shadow-2xl flex flex-col"
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Fund Managers</h3>
            <p className="text-xs mt-0.5 truncate max-w-[220px]" style={{ color: 'var(--text-muted)' }}>{fundName}</p>
          </div>
          {/* Large tap target for close */}
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{ width: 40, height: 40, color: 'var(--text-muted)', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {people.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40" style={{ color: 'var(--text-faint)' }}>
              <User className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No managers on record</p>
            </div>
          ) : (
            <div className="space-y-1">
              {people.map((name, i) => (
                <a
                  key={i}
                  href={personUrls?.[i] || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl transition-colors"
                  style={{ padding: '12px 12px', color: 'var(--text-secondary)', minHeight: 52 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-bg)' }}>
                    <User className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </div>
                  <span className="text-sm font-medium">{name}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
