'use client';

function Bone({ w, h = 12, className = '' }: { w: number | string; h?: number; className?: string }) {
  return (
    <div
      className={`rounded ${className}`}
      style={{
        width: typeof w === 'number' ? w : w,
        height: h,
        background: 'var(--bg-muted)',
      }}
    />
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
        <Bone w={80} h={10} />
        <div className="flex gap-1">
          <Bone w={28} h={16} className="rounded-full" />
          <Bone w={36} h={16} className="rounded-full" />
          <Bone w={36} h={16} className="rounded-full" />
        </div>
      </div>
      {/* rows */}
      {[70, 55, 80, 60, 45].map((w, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: i < 4 ? '1px solid var(--border)' : undefined }}>
          <Bone w={`${w}%`} h={10} />
          <Bone w={48} h={10} />
        </div>
      ))}
    </div>
  );
}

function TableRowSkeleton({ widths, indent = false }: { widths: (number | string)[]; indent?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      {/* expand toggle placeholder */}
      <div style={{ width: 28, flexShrink: 0 }}>
        {!indent && <Bone w={14} h={14} className="rounded mx-auto" />}
      </div>
      {widths.map((w, i) => (
        <div key={i} style={{ flex: i === 0 ? 1 : undefined, width: i > 0 ? w : undefined, flexShrink: 0 }}>
          <Bone w={i === 0 ? (indent ? '55%' : '65%') : w} h={10} />
        </div>
      ))}
    </div>
  );
}

const COL_WIDTHS = [80, 100, 116, 90, 110, 90];

export default function SkeletonLoader() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => <CardSkeleton key={i} />)}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {/* filter bar */}
        <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
          <Bone w={30} h={10} />
          <div className="flex gap-1">
            <Bone w={48} h={20} className="rounded-full" />
            <Bone w={80} h={20} className="rounded-full" />
            <Bone w={64} h={20} className="rounded-full" />
          </div>
        </div>

        {/* thead */}
        <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
          <div style={{ width: 28 }} />
          <div style={{ flex: 1 }}><Bone w={40} h={9} /></div>
          {COL_WIDTHS.map((w, i) => (
            <div key={i} style={{ width: w, flexShrink: 0 }}>
              <Bone w={Math.round(w * 0.55)} h={9} className="ml-auto" />
            </div>
          ))}
        </div>

        {/* body rows */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => (
          <TableRowSkeleton key={i} widths={COL_WIDTHS} />
        ))}
      </div>
    </div>
  );
}
