'use client';

import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

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
  id?: number;
  name?: string;
  short_name?: string;
  slug?: string;
  bloomberg_ticker?: string;
  pretty_name?: string;
}

interface Props {
  entity: Entity;
  onPeerSelect: (peer: Entity) => void;
  currentRows: { insti_name: string; factset_entity_id: string }[];
}

export default function PeersPanel({ entity, onPeerSelect, currentRows }: Props) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [loading, setLoading] = useState(false);

  const slug = (entity as { slug?: string }).slug || entity.short_name?.toLowerCase().replace(/\s+/g, '-') || String(entity.id);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/peers?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data?.data || data?.peers || [];
        setPeers(list.slice(0, 15));
      })
      .catch(() => setPeers([]))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm" style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}>
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Peers</span>
        {loading && (
          <div className="w-3 h-3 border-2 border-[#24a9a7] border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {peers.length === 0 && !loading && (
        <p className="px-4 py-6 text-xs text-gray-400 text-center">No peers found</p>
      )}

      <div className="divide-y divide-gray-100">
        {peers.map((peer, i) => {
          const peerName = peer.pretty_name || peer.name || peer.short_name || '';
          return (
            <button
              key={i}
              onClick={() => {
                const entityLike: Entity = {
                  id: peer.id || 0,
                  pretty_name: peerName,
                  short_name: peer.short_name || peerName,
                  country: '',
                  sector: '',
                  bloomberg_ticker: peer.bloomberg_ticker || '',
                  slug: peer.slug,
                } as Entity & { slug?: string };
                onPeerSelect(entityLike);
              }}
              className="w-full flex items-center justify-between px-4 py-2 hover:bg-blue-50/40 group transition-colors text-left"
            >
              <div className="min-w-0">
                <span className="text-[13px] text-gray-800 group-hover:text-[#24a9a7] transition-colors font-medium truncate block">
                  {peerName}
                </span>
                {peer.bloomberg_ticker && (
                  <span className="text-[11px] text-gray-400 font-mono">{peer.bloomberg_ticker}</span>
                )}
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#24a9a7] flex-shrink-0 ml-2 transition-colors" />
            </button>
          );
        })}
      </div>

      {currentRows.length > 0 && peers.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <p className="text-[11px] text-gray-400">
            Click a peer to compare its shareholder registry
          </p>
        </div>
      )}
    </div>
  );
}
