'use client';

import { useState, useEffect, useRef } from 'react';

interface Entity {
  id: number;
  pretty_name: string;
  short_name: string;
  country: string;
  sector: string;
  bloomberg_ticker: string;
  slug?: string;
}

interface Peer {
  id: number;
  pretty_name: string;
  short_name: string;
  slug: string;
  bloomberg_ticker: string;
  country: string;
  sector: string;
}

interface Props {
  baseEntity: Entity;
  activeEntityId: number;
  onSelect: (entity: Entity) => void;
}

// Colour palette for peer cards (cycles through)
const ACCENTS = ['#24a9a7','#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#0ea5e9','#84cc16'];

export default function PeersBar({ baseEntity, activeEntityId, onSelect }: Props) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const slug = baseEntity.slug || baseEntity.short_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || String(baseEntity.id);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/peers?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(data => setPeers(Array.isArray(data) ? data.slice(0, 12) : []))
      .catch(() => setPeers([]))
      .finally(() => setLoading(false));
  }, [slug]);

  const allEntities: Entity[] = [baseEntity, ...peers.map(p => ({
    id: p.id,
    pretty_name: p.pretty_name,
    short_name: p.short_name,
    country: p.country,
    sector: p.sector,
    bloomberg_ticker: p.bloomberg_ticker,
    slug: p.slug,
  }))];

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-3">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Peers Comparison</span>
        {loading && <div className="w-3 h-3 border-2 border-[#24a9a7] border-t-transparent rounded-full animate-spin" />}
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-thin"
        style={{ scrollbarWidth: 'none' }}
      >
        {allEntities.map((e, i) => {
          const isActive = e.id === activeEntityId;
          const accent = ACCENTS[i % ACCENTS.length];
          const isBase = i === 0;
          const ticker = e.bloomberg_ticker?.split(',')[0]?.trim() || e.short_name || '';
          const name = e.pretty_name || e.short_name || '';

          return (
            <button
              key={e.id}
              onClick={() => onSelect(e)}
              className={`flex-shrink-0 w-44 text-left rounded-lg border-2 px-3 pt-2.5 pb-2 transition-all group ${
                isActive
                  ? 'border-[#24a9a7] bg-[#24a9a7]/5 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <span className={`text-[13px] font-bold tracking-tight leading-tight ${isActive ? 'text-[#24a9a7]' : 'text-gray-800'}`}>
                  {ticker}
                </span>
                {isBase && (
                  <span className="text-[9px] font-semibold bg-[#24a9a7]/10 text-[#24a9a7] px-1.5 py-0.5 rounded-full ml-1">YOU</span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 leading-tight truncate mb-2">{name}</p>
              {/* Accent bar */}
              <div className="h-0.5 rounded-full w-8" style={{ backgroundColor: isActive ? '#24a9a7' : accent, opacity: isActive ? 1 : 0.4 }} />
            </button>
          );
        })}

        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={`skel-${i}`} className="flex-shrink-0 w-44 h-20 rounded-lg border-2 border-gray-100 bg-gray-50 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
