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
  onPeersLoaded?: (peers: Peer[]) => void;
}

// Colour palette for peer cards (cycles through)
const ACCENTS = ['#24a9a7','#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#0ea5e9','#84cc16'];

export default function PeersBar({ baseEntity, activeEntityId, onSelect, onPeersLoaded }: Props) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const slug = baseEntity.slug || baseEntity.short_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || String(baseEntity.id);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/peers?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data.slice(0, 12) : [];
        setPeers(list);
        onPeersLoaded?.(list);
      })
      .catch(() => setPeers([]))
      .finally(() => setLoading(false));
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="px-4 py-2 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Peers Comparison</span>
        {loading && <div className="w-3 h-3 border-2 border-[#24a9a7] border-t-transparent rounded-full animate-spin" />}
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 px-4 py-3 overflow-x-auto"
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
              className="flex-shrink-0 w-44 text-left rounded-lg px-3 pt-2.5 pb-2 transition-all"
              style={{
                border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                background: isActive ? 'var(--accent-bg)' : 'var(--bg-surface)',
              }}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="text-[13px] font-bold tracking-tight leading-tight" style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                  {ticker}
                </span>
                {isBase && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full ml-1" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>YOU</span>
                )}
              </div>
              <p className="text-[11px] leading-tight truncate mb-2" style={{ color: 'var(--text-muted)' }}>{name}</p>
              {/* Accent bar */}
              <div className="h-0.5 rounded-full w-8" style={{ backgroundColor: isActive ? 'var(--accent)' : accent, opacity: isActive ? 1 : 0.4 }} />
            </button>
          );
        })}

        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={`skel-${i}`} className="flex-shrink-0 w-44 h-20 rounded-lg animate-pulse" style={{ border: '2px solid var(--border)', background: 'var(--bg-muted)' }} />
        ))}
      </div>
    </div>
  );
}
