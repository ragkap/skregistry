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
}

export default function EntitySearch({ onSelect, selected }: Props) {
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
        <Search className="absolute left-3.5 w-4.5 h-4.5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={selected ? `${selected.pretty_name} (${selected.bloomberg_ticker || selected.short_name})` : 'Search by name or ticker...'}
          className="w-full pl-11 pr-11 py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-[#24a9a7] bg-white shadow-sm transition-colors font-medium"
        />
        {(query || selected) && (
          <button onClick={handleClear} className="absolute right-3 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
        {loading && <div className="absolute right-8 w-4 h-4 border-2 border-[#24a9a7] border-t-transparent rounded-full animate-spin" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-72 overflow-y-auto">
          {results.map(e => (
            <button
              key={e.id}
              onClick={() => handleSelect(e)}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between group border-b border-gray-50 last:border-0"
            >
              <div>
                <span className="font-medium text-gray-800 text-sm">{e.pretty_name}</span>
                {e.short_name && e.short_name !== e.pretty_name && (
                  <span className="text-xs text-gray-400 ml-1">({e.short_name})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {e.bloomberg_ticker && (
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{e.bloomberg_ticker}</span>
                )}
                {e.country && <span className="text-xs text-gray-400">{e.country}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
