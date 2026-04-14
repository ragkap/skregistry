'use client';

import { useState, useMemo, useTransition, useDeferredValue } from 'react';
import { ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import PersonDrawer from './PersonDrawer';

export interface Row {
  factset_entity_id: string;
  insti_name: string;
  insti_url: string | null;
  fund_name: string | null;
  fund_url: string | null;
  report_date: string;
  type: 'Fund' | 'Institution' | 'Insider';
  total_holding: number;
  previous_total_holding: number;
  holding_percentage: number;
  change_in_percentage: number;
  person_names: string[] | null;
  person_urls: string[] | null;
  person_bios: string[] | null;
  person_emails: string[] | null;
  person_phones: string[] | null;
  person_location_street1: string[] | null;
  person_location_street2: string[] | null;
  person_postal: string[] | null;
  person_countries: string[] | null;
}

interface TopLevelGroup {
  id: string;
  type: 'Institution' | 'Insider';
  name: string;
  url: string | null;
  totalHolding: number;
  prevHolding: number;
  holdingPct: number;
  change: number;
  latestDate: string;
  funds: Row[];
}

type SortKey = 'name' | 'date' | 'total' | 'pct' | 'prev' | 'change';
type SortDir = 'asc' | 'desc';
type TypeFilter = 'all' | 'institution' | 'insider';
export type StaleFilter = 'all' | '3yr' | '5yr' | '10yr';

export function staleCutoff(f: StaleFilter): string | null {
  if (f === 'all') return null;
  const years = f === '3yr' ? 3 : f === '5yr' ? 5 : 10;
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

const fmt = (n: number | null | undefined) => {
  if (n == null || isNaN(n)) return '—';
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
};
const fmtPct = (n: number | null | undefined) => {
  if (n == null || isNaN(n)) return '—';
  return `${(Number(n) * 100).toFixed(2)}%`;
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

function TypeBadge({ type }: { type: 'Institution' | 'Insider' }) {
  const isInsider = type === 'Insider';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
      background: isInsider ? 'rgba(139,92,246,0.1)' : 'rgba(36,169,167,0.1)',
      color: isInsider ? '#7c3aed' : '#0d9488',
      letterSpacing: '0.02em',
    }}>
      {type.toUpperCase()}
    </span>
  );
}

function SortIcon({ col, cur, dir }: { col: SortKey; cur: SortKey; dir: SortDir }) {
  if (col !== cur) return <span className="w-3 inline-block opacity-0" />;
  return dir === 'asc'
    ? <ArrowUp className="w-3 h-3 inline ml-0.5" style={{ color: 'var(--accent)' }} />
    : <ArrowDown className="w-3 h-3 inline ml-0.5" style={{ color: 'var(--accent)' }} />;
}

function TypeFilterPills({ value, onChange, counts }: {
  value: TypeFilter;
  onChange: (v: TypeFilter) => void;
  counts: { all: number; institution: number; insider: number };
}) {
  const options: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'institution', label: `Institutions (${counts.institution})` },
    { key: 'insider', label: `Insiders (${counts.insider})` },
  ];
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(o => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
            style={active
              ? { color: 'var(--accent)', background: 'var(--accent-bg)', border: '1.5px solid var(--accent)' }
              : { color: 'var(--text-muted)', background: 'transparent', border: '1.5px solid var(--border)' }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

type DrawerState = {
  fundName: string;
  names: string[] | null; urls: string[] | null; bios: string[] | null;
  emails: string[] | null; phones: string[] | null;
  street1: string[] | null; street2: string[] | null;
  postal: string[] | null; countries: string[] | null;
};

export default function ShareholderTable({
  rows, staleFilter, onStaleFilterChange,
}: {
  rows: Row[];
  staleFilter: StaleFilter;
  onStaleFilterChange: (v: StaleFilter) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('pct');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [visibleCount, setVisibleCount] = useState(50);
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [, startTransition] = useTransition();
  const deferredRows = useDeferredValue(rows);

  const groups = useMemo<TopLevelGroup[]>(() => {
    const institutionRows = deferredRows.filter(r => r.type === 'Institution');
    const insiderRows = deferredRows.filter(r => r.type === 'Insider');
    const fundRows = deferredRows.filter(r => r.type === 'Fund');

    const result: TopLevelGroup[] = [];

    for (const r of institutionRows) {
      const id = r.factset_entity_id || r.insti_name;
      const funds = fundRows.filter(f => f.factset_entity_id === id);
      result.push({
        id, type: 'Institution',
        name: r.insti_name, url: r.insti_url,
        totalHolding: Number(r.total_holding) || 0,
        prevHolding: Number(r.previous_total_holding) || 0,
        holdingPct: Number(r.holding_percentage) || 0,
        change: Number(r.change_in_percentage) || 0,
        latestDate: r.report_date || '',
        funds,
      });
    }

    for (const r of insiderRows) {
      result.push({
        id: r.factset_entity_id || r.insti_name,
        type: 'Insider',
        name: r.insti_name, url: null,
        totalHolding: Number(r.total_holding) || 0,
        prevHolding: Number(r.previous_total_holding) || 0,
        holdingPct: Number(r.holding_percentage) || 0,
        change: Number(r.change_in_percentage) || 0,
        latestDate: r.report_date || '',
        funds: [],
      });
    }

    return result;
  }, [deferredRows]);

  const counts = useMemo(() => ({
    all: groups.length,
    institution: groups.filter(g => g.type === 'Institution').length,
    insider: groups.filter(g => g.type === 'Insider').length,
  }), [groups]);

  const filtered = useMemo(() => {
    const cutoff = staleCutoff(staleFilter);
    return groups.filter(g => {
      if (typeFilter === 'institution' && g.type !== 'Institution') return false;
      if (typeFilter === 'insider' && g.type !== 'Insider') return false;
      if (cutoff && g.latestDate < cutoff) return false;
      return true;
    });
  }, [groups, typeFilter, staleFilter]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
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
  }), [filtered, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    startTransition(() => {
      if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      else { setSortKey(key); setSortDir('desc'); }
      setVisibleCount(50);
    });
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

const Th = ({ col, label, right, width, className = '' }: { col: SortKey; label: string; right?: boolean; width?: number | string; className?: string }) => (
    <th className={`sk-th ${right ? 'right' : ''} ${className}`} style={width != null ? { width } : undefined} onClick={() => handleSort(col)}>
      {label}<SortIcon col={col} cur={sortKey} dir={sortDir} />
    </th>
  );

  if (rows.length === 0) return null;

  return (
    <>
      <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {/* Filter bar — 1 row on desktop, 2 rows on mobile */}
        <div className="px-4 py-2.5 flex flex-wrap gap-y-2 gap-x-3 items-center" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
          <span className="text-[11px] font-semibold uppercase tracking-wide flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Type</span>
          <TypeFilterPills value={typeFilter} onChange={v => { setTypeFilter(v); setVisibleCount(50); }} counts={counts} />
          <div className="w-px self-stretch hidden sm:block" style={{ background: 'var(--border)' }} />
          <div className="w-full sm:hidden" style={{ borderTop: '1px solid var(--border)', margin: '0 -1rem' }} />
          <span className="text-[11px] font-semibold uppercase tracking-wide flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Filed within</span>
          <div className="flex gap-1 flex-wrap">
            {(['3yr', '5yr', '10yr', 'all'] as StaleFilter[]).map(opt => {
              const active = staleFilter === opt;
              const label = opt === '3yr' ? '3 yrs' : opt === '5yr' ? '5 yrs' : opt === '10yr' ? '10 yrs' : 'All';
              return (
                <button key={opt} onClick={() => { onStaleFilterChange(opt); setVisibleCount(50); }}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
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
        </div>

        <div className="overflow-x-auto">
          <table className="sk-table" style={{ tableLayout: 'fixed', width: '100%', fontSize: 12 }}>
            <thead className="sk-thead">
              <tr>
                <th className="sk-th" style={{ width: 18, textAlign: 'center' }} />
                <Th col="name" label="Name" />
                <th className="sk-th hidden sm:table-cell" style={{ width: 100 }}>Type</th>
                <Th col="date" label="Filed" width={96} className="hidden sm:table-cell" />
                <Th col="total" label="Holding" right width={88} />
                <Th col="pct" label="% Hold" right width={76} />
                <Th col="prev" label="Prev" right width={110} className="hidden sm:table-cell" />
                <Th col="change" label="Chg" right width={90} className="hidden sm:table-cell" />
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, visibleCount).map((g, gi) => {
                const isOpen = expanded.has(g.id);
                const canExpand = g.type === 'Institution' && g.funds.length > 0;
                const baseBg = gi % 2 === 1 ? 'var(--bg-subtle)' : 'var(--bg-surface)';
                return (
                  <>
                    {/* ── Top-level row (Institution or Insider) ── */}
                    <tr
                      key={g.id}
                      className="sk-tr group"
                      style={{ background: baseBg, cursor: canExpand ? 'pointer' : 'default' }}
                      onClick={() => canExpand && toggleExpand(g.id)}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = baseBg)}
                    >

                      {/* expand indicator */}
                      <td style={{ textAlign: 'center', padding: '0 2px', width: 18 }}>
                        {canExpand && (
                          <span style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            minHeight: 36, fontWeight: 700, fontSize: 14, lineHeight: 1,
                            color: isOpen ? 'var(--accent)' : 'var(--text-muted)',
                          }}>
                            {isOpen ? '−' : '+'}
                          </span>
                        )}
                      </td>
                      <td className="sk-td primary" style={{ paddingTop: 10, paddingBottom: 10, maxWidth: 0 }}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate font-semibold" style={{ color: 'var(--text-primary)', fontSize: 12 }}>{g.name}</span>
                          {canExpand && g.funds.length > 1 && (
                            <span className="hidden sm:inline text-[10px] flex-shrink-0" style={{ color: 'var(--text-faint)' }}>{g.funds.length} funds</span>
                          )}
                          {g.url && (
                            <a
                              href={g.url} target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              title="Open in new window"
                              className="hidden sm:flex flex-shrink-0 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ width: 20, height: 20, border: '1.5px solid var(--accent)', color: 'var(--accent)', background: 'var(--accent-bg)' }}
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="sk-td hidden sm:table-cell"><TypeBadge type={g.type} /></td>
                      <td className="sk-td mono faint hidden sm:table-cell" style={{ fontSize: 12 }}>{g.latestDate?.slice(0, 10) || '—'}</td>
                      <td className="sk-td right mono" style={{ fontWeight: 600, color: 'var(--text-primary)', paddingLeft: 4, paddingRight: 6 }}>{fmt(g.totalHolding)}</td>
                      <td className="sk-td right mono" style={{ color: 'var(--text-secondary)', paddingLeft: 4, paddingRight: 6 }}>{fmtPct(g.holdingPct)}</td>
                      <td className="sk-td right mono faint hidden sm:table-cell">{fmt(g.prevHolding)}</td>
                      <td className="sk-td right hidden sm:table-cell"><ChangeCell value={g.change} /></td>
                    </tr>

                    {/* ── Fund rows ── */}
                    {isOpen && [...g.funds]
                      .sort((a, b) => (Number(b.holding_percentage) || 0) - (Number(a.holding_percentage) || 0))
                      .map((f, fi) => {
                        return (
                          <tr key={`${g.id}-${fi}`} className="sk-tr group"
                            style={{ background: 'var(--bg-muted)', cursor: 'pointer' }}
                            onClick={() => setDrawer({
                              fundName: f.fund_name || '',
                              names: f.person_names, urls: f.person_urls, bios: f.person_bios,
                              emails: f.person_emails, phones: f.person_phones,
                              street1: f.person_location_street1, street2: f.person_location_street2,
                              postal: f.person_postal, countries: f.person_countries,
                            })}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                          >
                            <td style={{ width: 18 }} />
                            <td className="sk-td sm:pl-8" style={{ paddingTop: 10, paddingBottom: 10, maxWidth: 0 }}>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-bold w-4 text-right flex-shrink-0 tabular-nums" style={{ color: 'var(--text-faint)' }}>{fi + 1}</span>
                                <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{f.fund_name}</span>
                                {f.fund_url && (
                                  <a
                                    href={f.fund_url} target="_blank" rel="noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    title="Open in new window"
                                    className="hidden sm:flex flex-shrink-0 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ width: 18, height: 18, border: '1.5px solid var(--accent)', color: 'var(--accent)', background: 'var(--accent-bg)' }}
                                  >
                                    <ExternalLink className="w-2 h-2" />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="sk-td hidden sm:table-cell" />
                            <td className="sk-td mono hidden sm:table-cell" style={{ color: 'var(--text-faint)' }}>{f.report_date?.slice(0, 10) || '—'}</td>
                            <td className="sk-td right mono" style={{ color: 'var(--text-secondary)', paddingLeft: 4, paddingRight: 6 }}>{fmt(Number(f.total_holding))}</td>
                            <td className="sk-td right mono" style={{ color: 'var(--text-secondary)', paddingLeft: 4, paddingRight: 6 }}>{fmtPct(Number(f.holding_percentage))}</td>
                            <td className="sk-td right mono hidden sm:table-cell" style={{ color: 'var(--text-faint)' }}>{fmt(Number(f.previous_total_holding))}</td>
                            <td className="sk-td right hidden sm:table-cell"><ChangeCell value={Number(f.change_in_percentage)} /></td>
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

      {visibleCount < sorted.length && (
        <div className="flex flex-col items-center gap-1 py-4">
          <button
            onClick={() => setVisibleCount(c => c + 50)}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-colors"
            style={{ color: '#24a9a7', background: 'rgba(36,169,167,0.08)', border: '1.5px solid #24a9a7' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#24a9a7'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(36,169,167,0.08)'; e.currentTarget.style.color = '#24a9a7'; }}
          >
            Load more
          </button>
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Showing {visibleCount} of {sorted.length}
          </span>
        </div>
      )}

      {drawer && (
        <PersonDrawer
          fundName={drawer.fundName}
          personNames={drawer.names}
          personUrls={drawer.urls}
          personBios={drawer.bios}
          personEmails={drawer.emails}
          personPhones={drawer.phones}
          personStreet1={drawer.street1}
          personStreet2={drawer.street2}
          personPostal={drawer.postal}
          personCountries={drawer.countries}
          onClose={() => setDrawer(null)}
        />
      )}
    </>
  );
}
