'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Users, Sparkles, ExternalLink, UserPlus } from 'lucide-react';

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

interface Props {
  rows: Row[];
  entity: { pretty_name: string; short_name: string; bloomberg_ticker: string } | null;
  onSummarize: () => void;
  summarizing: boolean;
  summary: string;
}

type FilterType = 'institutions' | 'funds';

function useInstiRows(rows: Row[]) {
  return useMemo(() => {
    const map = new Map<string, { name: string; url: string; total: number; change: number; prevTotal: number; latestDate: string }>();
    for (const r of rows) {
      const key = r.factset_entity_id || r.insti_name;
      if (!map.has(key)) {
        map.set(key, { name: r.insti_name, url: r.insti_url, total: 0, change: 0, prevTotal: 0, latestDate: r.report_date });
      }
      const entry = map.get(key)!;
      entry.total += Number(r.fund_total_holding) || 0;
      entry.prevTotal += Number(r.fund_previous_total_holding) || 0;
      if (r.report_date > entry.latestDate) entry.latestDate = r.report_date;
    }
    for (const [, v] of map) {
      v.change = v.prevTotal > 0 ? (v.total / v.prevTotal - 1) : 0;
    }
    return [...map.values()];
  }, [rows]);
}

function useFundRows(rows: Row[]) {
  return useMemo(() => rows.map(r => ({
    name: r.fund_name,
    url: r.fund_url,
    total: Number(r.fund_total_holding) || 0,
    prevTotal: Number(r.fund_previous_total_holding) || 0,
    change: Number(r.change_in_percentage) || 0,
    latestDate: r.report_date,
  })), [rows]);
}

function sixMonthsAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().split('T')[0];
}

const fmt = (n: number) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
};

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-gray-800 hover:underline group/link"
    >
      <span className="truncate">{children}</span>
      <ExternalLink className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover/link:opacity-100 flex-shrink-0 transition-opacity" />
    </a>
  );
}

function FilterPills({ value, onChange }: { value: FilterType; onChange: (v: FilterType) => void }) {
  return (
    <div className="flex gap-1">
      {(['institutions', 'funds'] as FilterType[]).map(f => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
            value === f ? 'bg-[#24a9a7] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      ))}
    </div>
  );
}

interface CardProps {
  icon: React.ReactNode;
  title: string;
  accentColor: string;
  filter?: FilterType;
  onFilterChange?: (v: FilterType) => void;
  subtitle?: string;
  children: React.ReactNode;
}

function Card({ icon, title, accentColor, filter, onFilterChange, subtitle, children }: CardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className={`px-4 py-3 border-b border-gray-100 flex items-center justify-between`} style={{ borderLeftWidth: 3, borderLeftColor: accentColor, borderLeftStyle: 'solid' }}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm text-gray-800 tracking-tight">{title}</span>
          {subtitle && <span className="text-[10px] text-gray-400 font-normal">{subtitle}</span>}
        </div>
        {filter && onFilterChange && <FilterPills value={filter} onChange={onFilterChange} />}
      </div>
      <div className="px-4 py-3 flex-1">
        {children}
      </div>
    </div>
  );
}

export default function SummaryCards({ rows, entity, onSummarize, summarizing, summary }: Props) {
  const [topFilter, setTopFilter] = useState<FilterType>('institutions');
  const [newFilter, setNewFilter] = useState<FilterType>('institutions');
  const [incrFilter, setIncrFilter] = useState<FilterType>('institutions');
  const [decrFilter, setDecrFilter] = useState<FilterType>('institutions');

  const instiRows = useInstiRows(rows);
  const fundRows = useFundRows(rows);
  const cutoff = sixMonthsAgo();

  const topHolders = [...(topFilter === 'institutions' ? instiRows : fundRows)]
    .sort((a, b) => b.total - a.total).slice(0, 5);

  const newHolders = [...(newFilter === 'institutions' ? instiRows : fundRows)]
    .filter(r => r.latestDate >= cutoff).slice(0, 5);

  const topIncreases = [...(incrFilter === 'institutions' ? instiRows : fundRows)]
    .filter(r => r.change > 0).sort((a, b) => b.change - a.change).slice(0, 5);

  const topDecreases = [...(decrFilter === 'institutions' ? instiRows : fundRows)]
    .filter(r => r.change < 0).sort((a, b) => a.change - b.change).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Top 5 Holders */}
        <Card
          icon={<Users className="w-4 h-4" style={{ color: '#24a9a7' }} />}
          title="Top 5 Holders"
          accentColor="#24a9a7"
          filter={topFilter}
          onFilterChange={setTopFilter}
        >
          <div className="space-y-2.5">
            {topHolders.map((h, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-medium text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                  <ExtLink href={h.url}><span className="text-xs">{h.name}</span></ExtLink>
                </div>
                <span className="text-xs font-mono text-gray-600 flex-shrink-0 tabular-nums">{fmt(h.total)}</span>
              </div>
            ))}
            {topHolders.length === 0 && <p className="text-xs text-gray-400">No data</p>}
          </div>
        </Card>

        {/* New Shareholders */}
        <Card
          icon={<UserPlus className="w-4 h-4 text-blue-500" />}
          title="New Shareholders"
          accentColor="#3b82f6"
          subtitle="last 6 months"
          filter={newFilter}
          onFilterChange={setNewFilter}
        >
          <div className="space-y-2.5">
            {newHolders.map((h, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <ExtLink href={h.url}><span className="text-xs">{h.name}</span></ExtLink>
                <span className="text-[10px] text-gray-400 flex-shrink-0 font-mono">{h.latestDate?.slice(0, 10)}</span>
              </div>
            ))}
            {newHolders.length === 0 && <p className="text-xs text-gray-400">No new holders</p>}
          </div>
        </Card>

        {/* Top Increases */}
        <Card
          icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
          title="Top Increases"
          accentColor="#10b981"
          filter={incrFilter}
          onFilterChange={setIncrFilter}
        >
          <div className="space-y-2.5">
            {topIncreases.map((h, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <ExtLink href={h.url}><span className="text-xs">{h.name}</span></ExtLink>
                <span className="text-xs font-mono font-semibold text-emerald-600 flex-shrink-0 tabular-nums">{fmtPct(h.change)}</span>
              </div>
            ))}
            {topIncreases.length === 0 && <p className="text-xs text-gray-400">No increases</p>}
          </div>
        </Card>

        {/* Top Decreases */}
        <Card
          icon={<TrendingDown className="w-4 h-4 text-red-500" />}
          title="Top Decreases"
          accentColor="#ef4444"
          filter={decrFilter}
          onFilterChange={setDecrFilter}
        >
          <div className="space-y-2.5">
            {topDecreases.map((h, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <ExtLink href={h.url}><span className="text-xs">{h.name}</span></ExtLink>
                <span className="text-xs font-mono font-semibold text-red-500 flex-shrink-0 tabular-nums">{fmtPct(h.change)}</span>
              </div>
            ))}
            {topDecreases.length === 0 && <p className="text-xs text-gray-400">No decreases</p>}
          </div>
        </Card>
      </div>

      {/* AI Summary Button */}
      <div className="flex justify-end">
        <button
          onClick={onSummarize}
          disabled={summarizing || rows.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#24a9a7] text-white rounded-lg font-medium text-sm hover:bg-[#1d9896] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          {summarizing ? 'Generating...' : 'Generate AI Summary'}
        </button>
      </div>

      {summary && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm" style={{ borderLeftWidth: 3, borderLeftColor: '#24a9a7', borderLeftStyle: 'solid' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#24a9a7]" />
            <span className="font-semibold text-sm text-gray-800">AI Summary</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{summary}</p>
        </div>
      )}
    </div>
  );
}
