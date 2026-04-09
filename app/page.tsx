'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EntitySearch from './components/EntitySearch';
import SummaryCards from './components/SummaryCards';
import ShareholderTable from './components/ShareholderTable';
import PeersBar from './components/PeersBar';
import { BarChart3, Sparkles, Copy, Check, X, MapPin, Layers, Sun, Moon, Download } from 'lucide-react';

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
  bloomberg_ticker: string;
}

interface ShareholderRow {
  insti_name: string;
  insti_url: string;
  fund_name: string;
  fund_url: string;
  report_date: string;
  fund_total_holding: number;
  fund_previous_total_holding: number;
  holding_percentage: number;
  change_in_percentage: number;
  person_names: string[];
  person_urls: string[];
  factset_entity_id: string;
  insti_total_holding: number;
}

const DISCLAIMER = `<p class="disclaimer">⚠ <em>This content is AI-generated and displayed for general informational purposes only. Please verify independently before use.</em></p>`;

function useAISummary(entity: Entity | null, rows: ShareholderRow[], peers: Peer[]) {
  const [summarizing, setSummarizing] = useState(false);
  const [summaryHtml, setSummaryHtml] = useState('');
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSummaryHtml(''); setOpen(false); }, [entity?.id]);

  const handleGenerate = useCallback(async () => {
    if (!entity || rows.length === 0) return;
    setSummarizing(true);
    setSummaryHtml('');
    setOpen(true);
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, shareholders: rows, peerEntities: peers.slice(0, 4) }),
      });
      const data = await res.json();
      const html = data.html || `<p>${data.error || 'No summary generated.'}</p>`;
      setSummaryHtml(html + DISCLAIMER);
    } catch {
      setSummaryHtml('<p>Failed to generate summary.</p>' + DISCLAIMER);
    } finally {
      setSummarizing(false);
    }
  }, [entity, rows, peers]);

  const handleCopy = useCallback(() => {
    if (!panelRef.current) return;
    // Copy as HTML to clipboard
    const html = panelRef.current.innerHTML;
    const blob = new Blob([html], { type: 'text/html' });
    const item = new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([panelRef.current.innerText], { type: 'text/plain' }) });
    navigator.clipboard.write([item]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return { summarizing, summaryHtml, open, setOpen, copied, panelRef, handleGenerate, handleCopy };
}

function DarkToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };
  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center justify-center rounded-lg transition-colors flex-shrink-0"
      style={{ width: 36, height: 36, color: 'var(--text-muted)', background: 'var(--bg-muted)', border: '1px solid var(--border)' }}
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [baseEntity, setBaseEntity] = useState<Entity | null>(null);
  const [activeEntity, setActiveEntity] = useState<Entity | null>(null);
  const [rows, setRows] = useState<ShareholderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const didRestore = useRef(false);

  const { summarizing, summaryHtml, open, setOpen, copied, panelRef, handleGenerate, handleCopy } =
    useAISummary(activeEntity, rows, peers);

  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;
    const id = searchParams.get('entityId');
    if (!id) return;
    fetch(`/api/entities?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data?.id) {
          setBaseEntity(data);
          setActiveEntity(data);
          loadShareholdersFor(data);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadShareholdersFor = useCallback(async (e: Entity) => {
    setLoading(true);
    setError(null);
    setRows([]);
    try {
      const res = await fetch(`/api/shareholders?entityId=${e.id}`);
      if (!res.ok) throw new Error('Failed to load data');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEntitySelect = useCallback((e: Entity) => {
    setBaseEntity(e);
    setActiveEntity(e);
    setPeers([]);
    router.replace(`?entityId=${e.id}`, { scroll: false });
    loadShareholdersFor(e);
  }, [router, loadShareholdersFor]);

  const handlePeerSelect = useCallback((peer: Entity) => {
    setActiveEntity(peer);
    loadShareholdersFor(peer);
  }, [loadShareholdersFor]);

  const displayEntity = activeEntity || baseEntity;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Top nav — logo + search only */}
      <header className="sticky top-0 z-40 shadow-sm" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="w-full px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://sk-assets.s3.amazonaws.com/online-branding-manual/01-logotypes/curation-compass-box-full-colour-1000px.png"
              alt="SK"
              className="w-9 h-9 rounded-lg object-contain"
            />
            <div>
              <h1 className="text-sm font-bold leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>Shareholder Registry</h1>
              <p className="text-[10px] tracking-wide uppercase" style={{ color: 'var(--text-faint)' }}>v2.0</p>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <EntitySearch onSelect={handleEntitySelect} selected={baseEntity} />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <DarkToggle />
          </div>
        </div>

        {/* Sub-bar: entity info (LHS) + AI button (RHS) — only when entity selected */}
        {displayEntity && (
          <div className="w-full px-6 py-2 flex items-center justify-between gap-4" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
            {/* Entity details */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{displayEntity.pretty_name}</span>
              {displayEntity.bloomberg_ticker && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                  {displayEntity.bloomberg_ticker.split(',')[0].trim()}
                </span>
              )}
              {displayEntity.country && (
                <span className="hidden sm:flex items-center gap-1 text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                  <MapPin className="w-3 h-3" />{displayEntity.country}
                </span>
              )}
              {displayEntity.sector && (
                <span className="hidden md:flex items-center gap-1 text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                  <Layers className="w-3 h-3" />{displayEntity.sector}
                </span>
              )}
              {activeEntity && baseEntity && activeEntity.id !== baseEntity.id && (
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">PEER</span>
              )}
            </div>

            {/* Generate AI Summary — main CTA */}
            <button
              onClick={handleGenerate}
              disabled={summarizing || rows.length === 0}
              className="ai-pulse flex-shrink-0 flex items-center gap-2 px-5 py-2 bg-[#24a9a7] text-white rounded-full font-semibold text-xs hover:bg-[#1d9896] active:bg-[#178a88] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {summarizing ? 'Generating…' : 'Generate AI Summary'}
            </button>
          </div>
        )}
      </header>

      <main className="w-full px-6 py-5">
        {!baseEntity ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-bg)' }}>
              <BarChart3 className="w-8 h-8" style={{ color: 'var(--accent)' }} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Shareholder Registry v2.0</h2>
            <p className="text-sm max-w-sm" style={{ color: 'var(--text-faint)' }}>
              Search for any entity by name or ticker to view its shareholder registry,
              peer comparison, and AI-powered insights.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* AI Summary panel — appears at top of content */}
            {open && (
              <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)' }}>
                <div className="flex items-center justify-between px-5 py-2.5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>AI Summary</span>
                    {displayEntity && <span className="text-xs" style={{ color: 'var(--text-faint)' }}>— {displayEntity.pretty_name}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {summaryHtml && !summarizing && (
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                        style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied' : 'Copy HTML'}
                      </button>
                    )}
                    <button onClick={() => setOpen(false)} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="px-5 py-4">
                  {summarizing ? (
                    <div className="flex items-center gap-3 py-6">
                      <div className="w-5 h-5 border-2 border-[#24a9a7] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Analysing shareholders, peer comparison and IR opportunities…</span>
                    </div>
                  ) : (
                    <div ref={panelRef} className="summary-html" dangerouslySetInnerHTML={{ __html: summaryHtml }} />
                  )}
                </div>
              </div>
            )}

            {/* Peers bar */}
            <PeersBar
              baseEntity={baseEntity}
              activeEntityId={activeEntity?.id ?? baseEntity.id}
              onSelect={handlePeerSelect}
              onPeersLoaded={setPeers}
            />

            {loading && (
              <div className="flex items-center gap-3 py-10 justify-center">
                <div className="w-5 h-5 border-2 border-[#24a9a7] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500">Loading shareholder data…</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>
            )}

            {!loading && !error && rows.length > 0 && (
              <>
                <SummaryCards rows={rows} entity={activeEntity} />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                      Shareholder Registry
                      <span className="ml-2 font-normal normal-case" style={{ color: 'var(--text-faint)' }}>— {rows.length} record{rows.length !== 1 ? 's' : ''}</span>
                    </h2>
                    <button
                      onClick={() => exportCSV(rows, activeEntity?.pretty_name || 'shareholders')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                      style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                    >
                      <Download className="w-3 h-3" />
                      Export CSV
                    </button>
                  </div>
                  <ShareholderTable rows={rows} />
                </div>
              </>
            )}

            {!loading && !error && rows.length === 0 && (
              <div className="rounded-xl p-12 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-faint)' }}>No shareholder data found for this entity.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
}
