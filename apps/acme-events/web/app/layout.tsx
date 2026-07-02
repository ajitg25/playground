import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Acme Events' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Acme Events</span>
        </header>
        <main style={{ maxWidth: 680, margin: '48px auto', padding: '0 24px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
