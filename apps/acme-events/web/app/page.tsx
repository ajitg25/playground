import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Upcoming Events</h1>
      <p style={{ color: '#6b7280', marginBottom: 32 }}>Buy tickets and get an SMS confirmation instantly.</p>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>Acme Summit 2026</h2>
            <p style={{ margin: '0 0 4px', color: '#6b7280' }}>July 15, 2026 · San Francisco, CA</p>
            <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>Annual developer conference. 3 tracks, 40+ talks.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 700 }}>$49.99</p>
            <Link
              href="/checkout"
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                background: '#2563eb',
                color: '#fff',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              Buy Ticket
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
