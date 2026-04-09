'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EntitySearch from './components/EntitySearch';
import SummaryCards from './components/SummaryCards';
import ShareholderTable from './components/ShareholderTable';
import PeersBar from './components/PeersBar';
import { BarChart3 } from 'lucide-react';

interface Entity {
  id: number;
  pretty_name: string;
  short_name: string;
  country: string;
  sector: string;
  bloomberg_ticker: string;
  slug?: string;
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

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [baseEntity, setBaseEntity] = useState<Entity | null>(null);
  const [activeEntity, setActiveEntity] = useState<Entity | null>(null);
  const [rows, setRows] = useState<ShareholderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState('');
  const didRestore = useRef(false);

  // Restore entity from URL on mount
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
    setSummary('');
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
    router.replace(`?entityId=${e.id}`, { scroll: false });
    loadShareholdersFor(e);
  }, [router, loadShareholdersFor]);

  const handlePeerSelect = useCallback((peer: Entity) => {
    setActiveEntity(peer);
    loadShareholdersFor(peer);
  }, [loadShareholdersFor]);

  const handleSummarize = useCallback(async () => {
    setSummarizing(true);
    setSummary('');
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: activeEntity, shareholders: rows, peers: [], peerShareholders: [] }),
      });
      const data = await res.json();
      setSummary(data.summary || data.error || 'No summary generated');
    } catch {
      setSummary('Failed to generate summary');
    } finally {
      setSummarizing(false);
    }
  }, [activeEntity, rows]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="w-full px-6 py-3 flex items-center gap-6">
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://sk-assets.s3.amazonaws.com/online-branding-manual/01-logotypes/curation-compass-box-full-colour-1000px.png"
              alt="SK"
              className="w-9 h-9 rounded-lg object-contain"
            />
            <div>
              <h1 className="text-sm font-bold text-gray-800 leading-tight tracking-tight">Shareholder Registry</h1>
              <p className="text-[10px] text-gray-400 tracking-wide uppercase">Analysis Platform</p>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <EntitySearch onSelect={handleEntitySelect} selected={baseEntity} />
          </div>

          {baseEntity ? (
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-gray-800 truncate max-w-[220px]">{baseEntity.pretty_name}</p>
              <div className="flex items-center gap-2 justify-end mt-0.5">
                {baseEntity.bloomberg_ticker && (
                  <span className="text-xs font-mono bg-[#24a9a7]/10 text-[#24a9a7] px-2 py-0.5 rounded-full font-medium">
                    {baseEntity.bloomberg_ticker}
                  </span>
                )}
                {baseEntity.country && <span className="text-xs text-gray-400">{baseEntity.country}</span>}
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 w-[220px]" />
          )}
        </div>
      </header>

      <main className="w-full px-6 py-5">
        {!baseEntity ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#24a9a7]/10 flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-[#24a9a7]" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Shareholder Registry Analysis</h2>
            <p className="text-sm text-gray-400 max-w-sm">
              Search for any entity by name or ticker to view its shareholder registry,
              peer comparison, and AI-powered insights.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Horizontal peers bar */}
            <PeersBar
              baseEntity={baseEntity}
              activeEntityId={activeEntity?.id ?? baseEntity.id}
              onSelect={handlePeerSelect}
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
                {/* Active entity label when viewing a peer */}
                {activeEntity && activeEntity.id !== baseEntity.id && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Viewing:</span>
                    <span className="text-xs font-semibold text-gray-700">{activeEntity.pretty_name}</span>
                    {activeEntity.bloomberg_ticker && (
                      <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{activeEntity.bloomberg_ticker.split(',')[0].trim()}</span>
                    )}
                    <button
                      onClick={() => handlePeerSelect(baseEntity)}
                      className="text-xs text-[#24a9a7] hover:underline ml-1"
                    >
                      ← Back to {baseEntity.short_name || baseEntity.pretty_name}
                    </button>
                  </div>
                )}

                <SummaryCards
                  rows={rows}
                  entity={activeEntity}
                  onSummarize={handleSummarize}
                  summarizing={summarizing}
                  summary={summary}
                />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Shareholder Registry
                      <span className="ml-2 font-normal text-gray-400 normal-case">
                        — {rows.length} record{rows.length !== 1 ? 's' : ''}
                      </span>
                    </h2>
                  </div>
                  <ShareholderTable rows={rows} />
                </div>
              </>
            )}

            {!loading && !error && rows.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-400 text-sm">No shareholder data found for this entity.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
import { Suspense } from 'react';
export default function Home() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
}
