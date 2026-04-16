import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Smartkarma Shareholder Registry';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const LOGO = 'https://sk-assets.s3.amazonaws.com/online-branding-manual/01-logotypes/curation-compass-box-full-colour-1000px.png';
const TEAL = '#24a9a7';
const BG = '#2b2b2b';
const CARD_BG = '#383838';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '0 80px',
          gap: 72,
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 220,
            height: 220,
            background: CARD_BG,
            borderRadius: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img src={LOGO} width={160} height={160} style={{ objectFit: 'contain' }} />
        </div>

        {/* Text */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ color: '#ffffff', fontSize: 56, fontWeight: 700, lineHeight: 1.1, marginBottom: 4 }}>
            Smartkarma
          </div>
          <div style={{ color: TEAL, fontSize: 52, fontWeight: 700, lineHeight: 1.1, marginBottom: 28 }}>
            Shareholder Registry
          </div>

          {/* Divider */}
          <div style={{ width: '100%', height: 2, background: TEAL, marginBottom: 28, borderRadius: 1 }} />

          {/* Bullets */}
          {[
            'Institutional shareholder data for listed companies',
            'Peer comparison and registry benchmarking',
            'AI-powered registry analysis and IR opportunities',
          ].map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 10, height: 10, background: TEAL, borderRadius: 2, flexShrink: 0 }} />
              <div style={{ color: '#ffffff', fontSize: 24, lineHeight: 1.4 }}>{text}</div>
            </div>
          ))}

          {/* URL */}
          <div style={{ color: TEAL, fontSize: 22, marginTop: 16 }}>
            smartkarma.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
