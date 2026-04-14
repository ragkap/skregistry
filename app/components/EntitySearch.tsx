'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface Entity {
  id: number;
  pretty_name: string;
  short_name: string;
  country: string;
  sector: string;
  bloomberg_ticker: string;
}

interface Props {
  onSelect: (entity: Entity) => void;
  selected: Entity | null;
  onFocusChange?: (focused: boolean) => void;
}

export default function EntitySearch({ onSelect, selected, onFocusChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Entity[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/entities?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (entity: Entity) => {
    onSelect(entity);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <div ref={ref} className="relative w-full max-w-2xl">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4.5 h-4.5" style={{ color: 'var(--text-faint)' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { onFocusChange?.(true); results.length > 0 && setOpen(true); }}
          onBlur={() => setTimeout(() => onFocusChange?.(false), 150)}
          placeholder={selected ? `${selected.pretty_name} (${selected.bloomberg_ticker || selected.short_name})` : 'Search by name or ticker...'}
          className="w-full pl-11 pr-11 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-0 shadow-sm transition-colors font-medium"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', borderColor: 'var(--border)', '--placeholder-color': 'var(--text-faint)' } as React.CSSProperties}
        />
        {(query || selected) && (
          <button onClick={handleClear} className="absolute right-3" style={{ color: 'var(--text-faint)' }}>
            <X className="w-4 h-4" />
          </button>
        )}
        {loading && <div className="absolute right-8 w-4 h-4 border-2 border-[#24a9a7] border-t-transparent rounded-full animate-spin" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full rounded-xl shadow-lg z-50 max-h-72 overflow-y-auto" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {results.map(e => (
            <button
              key={e.id}
              onClick={() => handleSelect(e)}
              className="w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors"
              style={{ borderBottom: '1px solid var(--border-muted)' }}
              onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-muted)')}
              onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
            >
              <div>
                <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{e.pretty_name}</span>
                {e.short_name && e.short_name !== e.pretty_name && (
                  <span className="text-xs ml-1" style={{ color: 'var(--text-faint)' }}>({e.short_name})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {e.bloomberg_ticker && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>{e.bloomberg_ticker}</span>
                )}
                {e.country && <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{e.country}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
