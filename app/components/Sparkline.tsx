'use client';

import { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { X } from 'lucide-react';

interface Props {
  data: { date: string; value: number }[];
  color?: string;
  label?: string;
}

export default function Sparkline({ data, color = '#24a9a7', label }: Props) {
  const [showModal, setShowModal] = useState(false);

  if (!data || data.length < 2) {
    return <span className="text-xs text-gray-300">—</span>;
  }

  const latest = data[data.length - 1]?.value ?? 0;
  const first = data[0]?.value ?? 0;
  const up = latest >= first;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center hover:opacity-80 transition-opacity"
        title="Click to expand"
      >
        <ResponsiveContainer width={80} height={28}>
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={up ? '#22c55e' : '#ef4444'}
              dot={false}
              strokeWidth={1.5}
            />
          </LineChart>
        </ResponsiveContainer>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-700">{label || 'Holdings Over Time'}</span>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke={color} dot={true} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}
