'use client';

import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import Sparkline from './Sparkline';
import PersonDrawer from './PersonDrawer';

interface Row {
  insti_name: string; insti_url: string; fund_name: string; fund_url: string;
  report_date: string; fund_total_holding: number; fund_previous_total_holding: number;
  holding_percentage: number; change_in_percentage: number;
  person_names: string[]; person_urls: string[];
  factset_entity_id: string; insti_total_holding: number;
}
interface InstitutionGroup {
  id: string; name: string; url: string;
  totalHolding: number; prevHolding: number; holdingPct: number; change: number;
  latestDate: string; funds: Row[];
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
  return `${Number(n).toFixed(2)}%`;
};

function ChangeCell({ value }: { value: number | null | undefined }) {
  if (value == null || isNaN(value)) return <span style={{ color: 'var(--text-faint)' }}>—</span>;
  const pct = value * 100;
  const pos = pct >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: pos ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.1)',
      color: pos ? '#059669' : '#dc2626',
    }}>
      {pos ? '+' : ''}{pct.toFixed(2)}%
    </span>
  );
}

function SortIcon({ col, cur, dir }: { col: SortKey; cur: SortKey; dir: SortDir }) {
  if (col !== cur) return <span className="w-3 inline-block opacity-0" />;
  return dir === 'asc'
    ? <ArrowUp className="w-3 h-3 inline ml-0.5" style={{ color: 'var(--accent)' }} />
    : <ArrowDown className="w-3 h-3 inline ml-0.5" style={{ color: 'var(--accent)' }} />;
}

export default function ShareholderTable({ rows }: { rows: Row[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('pct');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [drawer, setDrawer] = useState<{ fundName: string; names: string[]; urls: string[] } | null>(null);

  const groups = useMemo<InstitutionGroup[]>(() => {
    const map = new Map<string, InstitutionGroup>();
    for (const r of rows) {
      const key = r.factset_entity_id || r.insti_name;
      if (!map.has(key)) map.set(key, { id: key, name: r.insti_name, url: r.insti_url, totalHolding: 0, prevHolding: 0, holdingPct: 0, change: 0, latestDate: r.report_date || '', funds: [] });
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

  const Th = ({ col, label, right, width }: { col: SortKey; label: string; right?: boolean; width?: number | string }) => (
    <th className={`sk-th ${right ? 'right' : ''}`} style={width != null ? { width } : undefined} onClick={() => handleSort(col)}>
      {label}<SortIcon col={col} cur={sortKey} dir={sortDir} />
    </th>
  );

  if (rows.length === 0) return null;

  return (
    <>
      <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="sk-table" style={{ minWidth: 720, tableLayout: 'fixed', width: '100%' }}>
            <thead className="sk-thead">
              <tr>
                <th className="sk-th" style={{ width: 28, textAlign: 'center' }} />
                <Th col="name" label="Institution" /> {/* no width → takes all remaining space */}
                <Th col="date" label="Filed" width={96} />
                <Th col="total" label="Holding" right width={116} />
                <Th col="pct" label="% Hold" right width={100} />
                <Th col="prev" label="Prev" right width={110} />
                <Th col="change" label="Chg" right width={90} />
                <th className="sk-th" style={{ width: 96 }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((g, gi) => {
                const isOpen = expanded.has(g.id);
                const sparkData = getSparklineData(g.funds);
                const baseBg = gi % 2 === 1 ? 'var(--bg-subtle)' : 'var(--bg-surface)';
                return (
                  <>
                    {/* ── Institution row ── */}
                    <tr
                      key={g.id}
                      className="sk-tr"
                      style={{ background: baseBg, cursor: 'pointer' }}
                      onClick={() => toggleExpand(g.id)}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = baseBg)}
                    >
                      {/* +/− indicator */}
                      <td style={{ textAlign: 'center', padding: '0 2px', width: 28 }}>
                        <span style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          minHeight: 36, fontWeight: 700, fontSize: 14, lineHeight: 1,
                          color: isOpen ? 'var(--accent)' : 'var(--text-muted)',
                        }}>
                          {isOpen ? '−' : '+'}
                        </span>
                      </td>
                      <td className="sk-td primary" style={{ paddingTop: 10, paddingBottom: 10, maxWidth: 0 }}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <a href={g.url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:underline group/link min-w-0"
                            style={{ color: 'var(--text-primary)', fontWeight: 600 }}
                            onClick={e => e.stopPropagation()}
                          >
                            <span className="truncate">{g.name}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-50 transition-opacity flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                          </a>
                          {g.funds.length > 1 && (
                            <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-faint)' }}>{g.funds.length} funds</span>
                          )}
                        </div>
                      </td>
                      <td className="sk-td mono faint" style={{ fontSize: 12 }}>{g.latestDate?.slice(0, 10) || '—'}</td>
                      <td className="sk-td right mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(g.totalHolding)}</td>
                      <td className="sk-td right mono" style={{ color: 'var(--text-secondary)' }}>{fmtHoldingPct(g.holdingPct)}</td>
                      <td className="sk-td right mono faint">{fmt(g.prevHolding)}</td>
                      <td className="sk-td right"><ChangeCell value={g.change} /></td>
                      <td className="sk-td" onClick={e => e.stopPropagation()}><Sparkline data={sparkData} label={g.name} /></td>
                    </tr>

                    {/* ── Fund rows ── */}
                    {isOpen && [...g.funds]
                      .sort((a, b) => (Number(b.holding_percentage) || 0) - (Number(a.holding_percentage) || 0))
                      .map((f, fi) => {
                        const fundSpark = [
                          f.fund_previous_total_holding != null ? { date: 'Prev', value: Number(f.fund_previous_total_holding) } : null,
                          f.fund_total_holding != null ? { date: f.report_date?.slice(0, 10) || 'Now', value: Number(f.fund_total_holding) } : null,
                        ].filter(Boolean) as { date: string; value: number }[];

                        return (
                          <tr key={`${g.id}-${fi}`} className="sk-tr"
                            style={{ background: 'var(--bg-muted)', cursor: 'pointer' }}
                            onClick={() => setDrawer({ fundName: f.fund_name, names: f.person_names || [], urls: f.person_urls || [] })}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                          >
                            <td style={{ width: 28 }} />
                            {/* Fund name — full-height clickable cell */}
                            <td className="sk-td" style={{ paddingLeft: 32, paddingTop: 10, paddingBottom: 10, maxWidth: 0 }}>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-bold w-4 text-right flex-shrink-0 tabular-nums" style={{ color: 'var(--text-faint)' }}>{fi + 1}</span>
                                <a href={f.fund_url} target="_blank" rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 hover:underline group/link min-w-0"
                                  style={{ color: 'var(--text-secondary)', fontSize: 12 }}
                                >
                                  <span className="truncate">{f.fund_name}</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover/link:opacity-50 transition-opacity flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                                </a>
                              </div>
                            </td>
                            <td className="sk-td mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{f.report_date?.slice(0, 10) || '—'}</td>
                            <td className="sk-td right mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmt(Number(f.fund_total_holding))}</td>
                            <td className="sk-td right mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtHoldingPct(Number(f.holding_percentage))}</td>
                            <td className="sk-td right mono" style={{ fontSize: 12, color: 'var(--text-faint)' }}>{fmt(Number(f.fund_previous_total_holding))}</td>
                            <td className="sk-td right"><ChangeCell value={Number(f.change_in_percentage)} /></td>
                            <td className="sk-td"><Sparkline data={fundSpark} label={f.fund_name} /></td>
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
