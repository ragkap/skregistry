'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Users, ExternalLink, UserPlus } from 'lucide-react';

interface Row {
  insti_name: string; insti_url: string; fund_name: string; fund_url: string;
  report_date: string; fund_total_holding: number; fund_previous_total_holding: number;
  holding_percentage: number; change_in_percentage: number;
  person_names: string[]; person_urls: string[];
  factset_entity_id: string; insti_total_holding: number;
}
interface Props {
  rows: Row[];
  entity: { pretty_name: string; short_name: string; bloomberg_ticker: string } | null;
}
type FilterType = 'institutions' | 'funds';

function useInstiRows(rows: Row[]) {
  return useMemo(() => {
    const map = new Map<string, { name: string; url: string; total: number; change: number; prevTotal: number; latestDate: string }>();
    for (const r of rows) {
      const key = r.factset_entity_id || r.insti_name;
      if (!map.has(key)) map.set(key, { name: r.insti_name, url: r.insti_url, total: 0, change: 0, prevTotal: 0, latestDate: r.report_date || '' });
      const e = map.get(key)!;
      e.total += Number(r.fund_total_holding) || 0;
      e.prevTotal += Number(r.fund_previous_total_holding) || 0;
      if ((r.report_date || '') > e.latestDate) e.latestDate = r.report_date;
    }
    for (const [, v] of map) v.change = v.prevTotal > 0 ? (v.total / v.prevTotal - 1) : 0;
    return [...map.values()];
  }, [rows]);
}

function useFundRows(rows: Row[]) {
  return useMemo(() => rows.map(r => ({
    name: r.fund_name, url: r.fund_url,
    total: Number(r.fund_total_holding) || 0,
    prevTotal: Number(r.fund_previous_total_holding) || 0,
    change: Number(r.change_in_percentage) || 0,
    latestDate: r.report_date || '',
  })), [rows]);
}

function sixMonthsAgo() {
  const d = new Date(); d.setMonth(d.getMonth() - 6);
  return d.toISOString().split('T')[0];
}

const fmt = (n: number) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
};
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;

function ExtLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="flex items-center gap-1 hover:underline group/link min-w-0"
      style={{ color: 'var(--text-primary)' }}
    >
      <span className="truncate">{label}</span>
      <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-0 group-hover/link:opacity-60 transition-opacity" style={{ color: 'var(--text-muted)' }} />
    </a>
  );
}

function FilterPills({ value, onChange }: { value: FilterType; onChange: (v: FilterType) => void }) {
  return (
    <div className="flex gap-1">
      {(['institutions', 'funds'] as FilterType[]).map(f => {
        const active = value === f;
        const label = f === 'institutions' ? 'Instis' : 'Funds';
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors"
            style={active
              ? { color: 'var(--accent)', background: 'var(--accent-bg)', border: '1.5px solid var(--accent)' }
              : { color: 'var(--text-muted)', background: 'transparent', border: '1.5px solid var(--border)' }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

interface MiniTableProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  filter: FilterType;
  onFilter: (v: FilterType) => void;
  headers: string[];
  rows: React.ReactNode[][];
  empty: string;
}

function MiniTable({ icon, title, subtitle, filter, onFilter, headers, rows, empty }: MiniTableProps) {
  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="font-semibold text-[12px]" style={{ color: 'var(--text-primary)' }}>{title}</span>
          {subtitle && <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{subtitle}</span>}
        </div>
        <FilterPills value={filter} onChange={onFilter} />
      </div>
      {/* Table */}
      <table className="w-full sk-table" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col /> {/* name — takes remaining space */}
          <col style={{ width: 100 }} />
        </colgroup>
        <thead className="sk-thead">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={`sk-th ${i > 0 ? 'right' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="sk-td text-center py-4" style={{ color: 'var(--text-faint)', fontSize: 12 }}>{empty}</td></tr>
          ) : rows.map((cells, i) => (
            <tr key={i} className="sk-tr">
              {cells.map((cell, j) => (
                <td key={j} className={`sk-td ${j > 0 ? 'right mono' : 'primary'}`} style={{ fontSize: 12, ...(j === 0 ? { overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' } : {}) }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SummaryCards({ rows }: Props) {
  const [topFilter, setTopFilter] = useState<FilterType>('institutions');
  const [newFilter, setNewFilter] = useState<FilterType>('institutions');
  const [incrFilter, setIncrFilter] = useState<FilterType>('institutions');
  const [decrFilter, setDecrFilter] = useState<FilterType>('institutions');

  const instiRows = useInstiRows(rows);
  const fundRows = useFundRows(rows);
  const cutoff = sixMonthsAgo();

  const topHolders = [...(topFilter === 'institutions' ? instiRows : fundRows)].sort((a, b) => b.total - a.total).slice(0, 5);
  const newHolders = [...(newFilter === 'institutions' ? instiRows : fundRows)].filter(r => r.latestDate >= cutoff).slice(0, 5);
  const topIncreases = [...(incrFilter === 'institutions' ? instiRows : fundRows)].filter(r => r.change > 0).sort((a, b) => b.change - a.change).slice(0, 5);
  const topDecreases = [...(decrFilter === 'institutions' ? instiRows : fundRows)].filter(r => r.change < 0).sort((a, b) => a.change - b.change).slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <MiniTable
        icon={<Users className="w-3.5 h-3.5" style={{ color: '#24a9a7' }} />}
        title="Top 5 Holders"
        filter={topFilter} onFilter={setTopFilter}
        headers={['Institution', 'Shares']}
        empty="No data"
        rows={topHolders.map((h, i) => [
          <span key="n" className="flex items-center gap-2">
            <span className="text-[10px] font-bold w-3.5 text-right flex-shrink-0" style={{ color: 'var(--text-faint)' }}>{i + 1}</span>
            <ExtLink href={h.url} label={h.name} />
          </span>,
          fmt(h.total),
        ])}
      />

      <MiniTable
        icon={<UserPlus className="w-3.5 h-3.5 text-blue-500" />}
        title="New Holders" subtitle="6mo"
        filter={newFilter} onFilter={setNewFilter}
        headers={['Institution', 'Since']}
        empty="No new holders"
        rows={newHolders.map(h => [
          <ExtLink key="n" href={h.url} label={h.name} />,
          <span key="d" style={{ color: 'var(--text-muted)', fontSize: 11 }}>{h.latestDate?.slice(0, 10)}</span>,
        ])}
      />

      <MiniTable
        icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
        title="Top Increases"
        filter={incrFilter} onFilter={setIncrFilter}
        headers={['Institution', 'Change']}
        empty="No increases"
        rows={topIncreases.map(h => [
          <ExtLink key="n" href={h.url} label={h.name} />,
          <span key="c" className="font-semibold" style={{ color: '#059669' }}>{fmtPct(h.change)}</span>,
        ])}
      />

      <MiniTable
        icon={<TrendingDown className="w-3.5 h-3.5 text-red-500" />}
        title="Top Decreases"
        filter={decrFilter} onFilter={setDecrFilter}
        headers={['Institution', 'Change']}
        empty="No decreases"
        rows={topDecreases.map(h => [
          <ExtLink key="n" href={h.url} label={h.name} />,
          <span key="c" className="font-semibold" style={{ color: '#dc2626' }}>{fmtPct(h.change)}</span>,
        ])}
      />
    </div>
  );
}
