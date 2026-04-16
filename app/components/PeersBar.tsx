'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';

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

const ACCENTS = ['#24a9a7','#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#0ea5e9','#84cc16'];

function AddPeerSearch({ existingIds, onAdd }: { existingIds: Set<number>; onAdd: (e: Entity) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Entity[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/entities?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data.filter((r: Entity) => !existingIds.has(r.id)).slice(0, 6) : []);
      } finally { setSearching(false); }
    }, 280);
    return () => clearTimeout(t);
  }, [query, existingIds]);

  const handleAdd = (e: Entity) => {
    onAdd(e);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-lg transition-all"
        style={{ width: 128, minHeight: 58, border: '2px dashed var(--border)', color: 'var(--text-muted)', background: 'transparent' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-bg)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wide">Add Peer</span>
      </button>
    );
  }

  return (
    <div ref={containerRef} className="flex-shrink-0 relative" style={{ width: 220 }}>
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ border: '2px solid var(--accent)', background: 'var(--bg-surface)' }}>
        <Search className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--accent)' }} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search to add peer…"
          className="flex-1 text-[11px] outline-none bg-transparent"
          style={{ color: 'var(--text-primary)' }}
        />
        {searching && <div className="w-3 h-3 border border-[#24a9a7] border-t-transparent rounded-full animate-spin flex-shrink-0" />}
        <button onClick={() => setOpen(false)} style={{ color: 'var(--text-faint)' }}>
          <X className="w-3 h-3" />
        </button>
      </div>

      {results.length > 0 && (
        <div className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-50 overflow-hidden" style={{ width: 260, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => handleAdd(r)}
              className="w-full text-left px-3 py-2 flex items-center justify-between transition-colors"
              style={{ borderBottom: '1px solid var(--border-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.pretty_name}</span>
              {r.bloomberg_ticker && (
                <span className="text-[10px] font-mono ml-2 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{r.bloomberg_ticker.split(',')[0].trim()}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PeersBar({ baseEntity, activeEntityId, onSelect, onPeersLoaded }: Props) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [loading, setLoading] = useState(false);
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());
  const [addedPeers, setAddedPeers] = useState<Entity[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateScrollState); ro.disconnect(); };
  }, [updateScrollState]);

  // Re-check after peers load
  useEffect(() => { setTimeout(updateScrollState, 100); }, [peers.length, addedPeers.length, updateScrollState]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 420 : -420, behavior: 'smooth' });
  };

  const setCardRef = useCallback((id: number, el: HTMLButtonElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  useEffect(() => {
    const el = cardRefs.current.get(activeEntityId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeEntityId]);

  const slug = baseEntity.slug || baseEntity.short_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || String(baseEntity.id);

  useEffect(() => {
    setRemovedIds(new Set());
    setAddedPeers([]);
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

  // Notify parent when visible peers change
  useEffect(() => {
    const visible = peers.filter(p => !removedIds.has(p.id));
    onPeersLoaded?.([...visible, ...addedPeers.map(e => ({ id: e.id, pretty_name: e.pretty_name, short_name: e.short_name, slug: e.slug || '', bloomberg_ticker: e.bloomberg_ticker, country: e.country, sector: e.sector }))]);
  }, [removedIds, addedPeers]); // eslint-disable-line react-hooks/exhaustive-deps

  const visiblePeers: Entity[] = [
    ...peers.filter(p => !removedIds.has(p.id)).map(p => ({ id: p.id, pretty_name: p.pretty_name, short_name: p.short_name, country: p.country, sector: p.sector, bloomberg_ticker: p.bloomberg_ticker, slug: p.slug })),
    ...addedPeers,
  ];

  const allEntities: Entity[] = [baseEntity, ...visiblePeers];
  const existingIds = new Set(allEntities.map(e => e.id));

  const removePeer = (id: number) => {
    if (peers.find(p => p.id === id)) setRemovedIds(prev => new Set([...prev, id]));
    else setAddedPeers(prev => prev.filter(p => p.id !== id));
  };

  const addPeer = (e: Entity) => {
    setAddedPeers(prev => [...prev, e]);
    setTimeout(() => {
      const el = cardRefs.current.get(e.id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }, 50);
  };

  return (
    <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="px-4 py-2 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Peers Comparison</span>
          {loading && <div className="w-3 h-3 border-2 border-[#24a9a7] border-t-transparent rounded-full animate-spin flex-shrink-0" />}
        </div>
        <div className="px-4 pb-2 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' } as React.CSSProperties}>
          <span className="text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 mr-1" style={{ color: 'var(--text-faint)' }}>Related Tools</span>
          {[
            { label: 'Peer Comparison', href: 'https://www.smartkarma.com/tools/peers-comparison', title: 'Compare fundamentals of peer companies' },
            { label: 'Comparables Generator', href: 'https://www.smartkarma.com/tools/comparables', title: 'Publicly traded comparables and precedent transactions' },
            { label: 'Graph Ratio (GRT)', href: 'https://www.smartkarma.com/tools/grt-comparison', title: 'Graph Ratio comparison' },
          ].map(({ label, href, title }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={title}
              className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-80"
              style={{ border: '1.5px solid #24a9a7', color: '#24a9a7', borderRadius: 999, background: 'transparent', whiteSpace: 'nowrap' }}
            >
              {label} ↗
            </a>
          ))}
        </div>
      </div>

      <div className="relative">
        {/* Left fade + chevron */}
        {canScrollLeft && (
          <>
            <div className="pointer-events-none absolute left-0 top-0 h-full w-16 z-10"
              style={{ background: 'linear-gradient(to left, transparent, var(--bg-surface))' }} />
            <button
              onClick={() => scroll('left')}
              className="absolute left-1 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full shadow-md transition-colors"
              style={{ width: 28, height: 28, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}
        {/* Right fade + chevron */}
        {canScrollRight && (
          <>
            <div className="pointer-events-none absolute right-0 top-0 h-full w-16 z-10"
              style={{ background: 'linear-gradient(to right, transparent, var(--bg-surface))' }} />
            <button
              onClick={() => scroll('right')}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full shadow-md transition-colors"
              style={{ width: 28, height: 28, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
        <div
          ref={scrollRef}
          className="flex gap-2 px-4 py-3 overflow-x-auto items-start"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {allEntities.map((e, i) => {
            const isActive = e.id === activeEntityId;
            const accent = ACCENTS[i % ACCENTS.length];
            const isBase = i === 0;
            const ticker = e.bloomberg_ticker?.split(',')[0]?.trim() || e.short_name || '';
            const name = e.pretty_name || e.short_name || '';

            return (
              <div key={e.id} className="flex-shrink-0 relative group/card" style={{ width: 128 }}>
                <button
                  ref={el => setCardRef(e.id, el)}
                  onClick={() => onSelect(e)}
                  className="w-full text-left rounded-lg px-2.5 pt-2 pb-1.5 transition-all"
                  style={{
                    border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    background: isActive ? 'var(--accent-bg)' : 'var(--bg-surface)',
                  }}
                >
                  <div className="flex items-start justify-between mb-0.5">
                    <span className="text-[12px] font-bold tracking-tight leading-tight truncate" style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {ticker}
                    </span>
                    {isBase && (
                      <span className="text-[8px] font-semibold px-1 py-0.5 rounded-full ml-1 flex-shrink-0" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>YOU</span>
                    )}
                  </div>
                  <p className="text-[10px] leading-tight truncate mb-1.5" style={{ color: 'var(--text-muted)' }}>{name}</p>
                  <div className="h-0.5 rounded-full w-8" style={{ backgroundColor: isActive ? 'var(--accent)' : accent, opacity: isActive ? 1 : 0.4 }} />
                </button>

                {/* Remove button — shown on hover, hidden for base entity */}
                {!isBase && (
                  <button
                    onClick={ev => { ev.stopPropagation(); removePeer(e.id); }}
                    title="Remove peer"
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity"
                    style={{ background: '#ef4444', color: '#fff' }}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}

          {loading && Array.from({ length: 3 }).map((_, i) => (
            <div key={`skel-${i}`} className="flex-shrink-0 w-32 h-16 rounded-lg animate-pulse" style={{ border: '2px solid var(--border)', background: 'var(--bg-muted)' }} />
          ))}

          {/* Add peer */}
          <AddPeerSearch existingIds={existingIds} onAdd={addPeer} />
        </div>
      </div>
    </div>
  );
}
