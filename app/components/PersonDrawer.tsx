'use client';

import { X, User, Mail, Phone, MapPin } from 'lucide-react';

interface Props {
  fundName: string;
  personNames: string[] | null;
  personUrls: string[] | null;
  personBios: string[] | null;
  personEmails: string[] | null;
  personPhones: string[] | null;
  personStreet1: string[] | null;
  personStreet2: string[] | null;
  personPostal: string[] | null;
  personCountries: string[] | null;
  onClose: () => void;
}

export default function PersonDrawer({
  fundName, personNames, personUrls, personBios, personEmails,
  personPhones, personStreet1, personStreet2, personPostal, personCountries, onClose,
}: Props) {
  const people = (personNames || []).map((name, i) => ({
    name,
    url: personUrls?.[i] || null,
    bio: personBios?.[i] || null,
    email: personEmails?.[i] || null,
    phone: personPhones?.[i] || null,
    street1: personStreet1?.[i] || null,
    street2: personStreet2?.[i] || null,
    postal: personPostal?.[i] || null,
    country: personCountries?.[i] || null,
  })).filter(p => p.name);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div
        className="w-full max-w-sm h-full shadow-2xl flex flex-col"
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Fund Managers</h3>
            <p className="text-xs mt-0.5 truncate max-w-[220px]" style={{ color: 'var(--text-muted)' }}>{fundName}</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{ width: 40, height: 40, color: 'var(--text-muted)', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {people.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40" style={{ color: 'var(--text-faint)' }}>
              <User className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No managers on record</p>
            </div>
          ) : (
            <div className="space-y-2">
              {people.map((p, i) => {
                const addressParts = [p.street1, p.street2, p.postal, p.country].filter(Boolean);
                return (
                  <div
                    key={i}
                    className="rounded-xl p-3"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
                  >
                    {/* Name row */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-bg)' }}>
                        <User className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      </div>
                      {p.url ? (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold hover:underline"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {p.name}
                        </a>
                      ) : (
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                      )}
                    </div>

                    {/* Bio */}
                    {p.bio && (
                      <p className="text-xs mb-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p.bio}</p>
                    )}

                    {/* Contact details */}
                    <div className="space-y-1">
                      {p.email && (
                        <div className="flex items-start gap-2">
                          <Mail className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-faint)' }} />
                          <a
                            href={`mailto:${p.email}`}
                            className="text-xs hover:underline break-all"
                            style={{ color: 'var(--accent)' }}
                          >
                            {p.email}
                          </a>
                        </div>
                      )}
                      {p.phone && (
                        <div className="flex items-start gap-2">
                          <Phone className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-faint)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{p.phone}</span>
                        </div>
                      )}
                      {addressParts.length > 0 && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-faint)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {addressParts.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
