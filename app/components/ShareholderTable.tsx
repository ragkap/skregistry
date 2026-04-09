'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import Sparkline from './Sparkline';
import PersonDrawer from './PersonDrawer';

interface Row {
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

interface InstitutionGroup {
  id: string;
  name: string;
  url: string;
  totalHolding: number;
  prevHolding: number;
  holdingPct: number;
  change: number;
  latestDate: string;
  funds: Row[];
}

type SortKey = 'name' | 'date' | 'total' | 'pct' | 'prev' | 'change';
type SortDir = 'asc' | 'desc';

const fmt = (n: number | null | undefined) => {
  if (n == null || isNaN(n)) return '—';
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
};

const fmtHoldingPct = (n: number | null | undefined) => {
  if (n == null || isNaN(n)) return '—';
  // DB returns holding_percentage as a raw ratio (fund/insti_total); display directly
  return `${Number(n).toFixed(4)}%`;
};

function ChangeCell({ value }: { value: number | null | undefined }) {
  if (value == null || isNaN(value)) return <span className="text-gray-300">—</span>;
  const pct = value * 100;
  const positive = pct >= 0;
  return (
    <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums ${
      positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
    }`}>
      {positive ? '+' : ''}{pct.toFixed(2)}%
    </span>
  );
}

function SortIcon({ col, current, dir }: { col: SortKey; current: SortKey; dir: SortDir }) {
  if (col !== current) return <span className="w-3 inline-block" />;
  return dir === 'asc'
    ? <ArrowUp className="w-3 h-3 text-[#24a9a7] inline ml-0.5" />
    : <ArrowDown className="w-3 h-3 text-[#24a9a7] inline ml-0.5" />;
}

export default function ShareholderTable({ rows }: { rows: Row[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [drawer, setDrawer] = useState<{ fundName: string; names: string[]; urls: string[] } | null>(null);

  const groups = useMemo<InstitutionGroup[]>(() => {
    const map = new Map<string, InstitutionGroup>();
    for (const r of rows) {
      const key = r.factset_entity_id || r.insti_name;
      if (!map.has(key)) {
        map.set(key, { id: key, name: r.insti_name, url: r.insti_url, totalHolding: 0, prevHolding: 0, holdingPct: 0, change: 0, latestDate: r.report_date || '', funds: [] });
      }
      const g = map.get(key)!;
      g.funds.push(r);
      g.totalHolding += Number(r.fund_total_holding) || 0;
      g.prevHolding += Number(r.fund_previous_total_holding) || 0;
      if ((r.report_date || '') > g.latestDate) g.latestDate = r.report_date;
    }
    for (const [, g] of map) {
      g.holdingPct = g.funds.reduce((s, f) => s + (Number(f.holding_percentage) || 0), 0);
      g.change = g.prevHolding > 0 ? (g.totalHolding / g.prevHolding - 1) : 0;
    }
    return [...map.values()];
  }, [rows]);

  const sorted = useMemo(() => [...groups].sort((a, b) => {
    let av: string | number, bv: string | number;
    switch (sortKey) {
      case 'name': av = a.name; bv = b.name; break;
      case 'date': av = a.latestDate; bv = b.latestDate; break;
      case 'total': av = a.totalHolding; bv = b.totalHolding; break;
      case 'pct': av = a.holdingPct; bv = b.holdingPct; break;
      case 'prev': av = a.prevHolding; bv = b.prevHolding; break;
      case 'change': av = a.change; bv = b.change; break;
      default: av = 0; bv = 0;
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  }), [groups, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getSparklineData = (fundRows: Row[]) =>
    fundRows
      .filter(r => r.report_date && r.fund_total_holding != null)
      .map(r => ({ date: r.report_date?.slice(0, 10) || '', value: Number(r.fund_total_holding) }))
      .sort((a, b) => a.date.localeCompare(b.date));

  const Th = ({ col, label, right }: { col: SortKey; label: string; right?: boolean }) => (
    <th
      className={`px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(col)}
    >
      {label}
      <SortIcon col={col} current={sortKey} dir={sortDir} />
    </th>
  );

  if (rows.length === 0) return null;

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[13px]" style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-7 px-2 py-2" />
                <Th col="name" label="Institution" />
                <Th col="date" label="Latest Filing" />
                <Th col="total" label="Total Holding" right />
                <Th col="pct" label="% Holding" right />
                <Th col="prev" label="Prev Holding" right />
                <Th col="change" label="Change" right />
                <th className="px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-left">Trend</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((g, gi) => {
                const isOpen = expanded.has(g.id);
                const sparkData = getSparklineData(g.funds);
                return (
                  <>
                    {/* Institution row */}
                    <tr
                      key={g.id}
                      className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${gi % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                    >
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => toggleExpand(g.id)}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-colors mx-auto"
                        >
                          {isOpen
                            ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                            : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                        </button>
                      </td>
                      <td className="px-3 py-1.5">
                        <a
                          href={g.url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-gray-900 hover:underline group/link"
                        >
                          {g.name}
                          <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
                        </a>
                        {g.funds.length > 1 && (
                          <span className="ml-2 text-[10px] text-gray-400">{g.funds.length} funds</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500 text-[12px] font-mono">{g.latestDate?.slice(0, 10) || '—'}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-medium text-gray-800 tabular-nums">{fmt(g.totalHolding)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-gray-600 tabular-nums">{fmtHoldingPct(g.holdingPct)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-gray-400 tabular-nums">{fmt(g.prevHolding)}</td>
                      <td className="px-3 py-1.5 text-right"><ChangeCell value={g.change} /></td>
                      <td className="px-3 py-1.5">
                        <Sparkline data={sparkData} label={g.name} />
                      </td>
                    </tr>

                    {/* Fund rows */}
                    {isOpen && g.funds.map((f, fi) => {
                      const fundSpark = [
                        f.fund_previous_total_holding != null ? { date: 'Prev', value: Number(f.fund_previous_total_holding) } : null,
                        f.fund_total_holding != null ? { date: f.report_date?.slice(0, 10) || 'Now', value: Number(f.fund_total_holding) } : null,
                      ].filter(Boolean) as { date: string; value: number }[];

                      return (
                        <tr
                          key={`${g.id}-${fi}`}
                          className="border-b border-gray-100 bg-slate-50/60 hover:bg-blue-50/20 transition-colors cursor-pointer"
                          onClick={() => setDrawer({ fundName: f.fund_name, names: f.person_names || [], urls: f.person_urls || [] })}
                        >
                          <td className="px-2 py-1" />
                          <td className="px-3 py-1 pl-8">
                            <a
                              href={f.fund_url} target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-gray-700 hover:underline group/link"
                            >
                              <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0 mr-1" />
                              {f.fund_name}
                              <ExternalLink className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
                            </a>
                          </td>
                          <td className="px-3 py-1 text-gray-400 text-[11px] font-mono">{f.report_date?.slice(0, 10) || '—'}</td>
                          <td className="px-3 py-1 text-right font-mono text-gray-700 tabular-nums">{fmt(Number(f.fund_total_holding))}</td>
                          <td className="px-3 py-1 text-right font-mono text-gray-500 tabular-nums">{fmtHoldingPct(Number(f.holding_percentage))}</td>
                          <td className="px-3 py-1 text-right font-mono text-gray-400 tabular-nums">{fmt(Number(f.fund_previous_total_holding))}</td>
                          <td className="px-3 py-1 text-right"><ChangeCell value={Number(f.change_in_percentage)} /></td>
                          <td className="px-3 py-1">
                            <Sparkline data={fundSpark} label={f.fund_name} />
                          </td>
                        </tr>
                      );
                    })}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {drawer && (
        <PersonDrawer
          fundName={drawer.fundName}
          personNames={drawer.names}
          personUrls={drawer.urls}
          onClose={() => setDrawer(null)}
        />
      )}
    </>
  );
}
