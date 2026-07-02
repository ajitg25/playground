'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';


function SmsStatus() {
  const [delivered, setDelivered] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDelivered(true), 3000);
    return () => clearTimeout(id);
  }, []);

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: '#f3f4f6', borderRadius: 8, padding: '10px 20px',
      marginBottom: 16, fontSize: 14,
      color: delivered ? '#16a34a' : '#d97706',
    }}>
      <span>{delivered ? '✅' : '⏳'}</span>
      <span style={{ fontWeight: 600 }}>{delivered ? 'SMS sent successfully' : 'Sending SMS…'}</span>
    </div>
  );
}

function DoneContent() {
  const params = useSearchParams();
  const ticketId = params.get('ticket_id') ?? '—';

  return (
    <div style={{ textAlign: 'center', paddingTop: 24 }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎟</div>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>You&apos;re in!</h1>
      <p style={{ color: '#6b7280', marginBottom: 4 }}>
        Ticket confirmed for <strong>Acme Summit 2026</strong>.
      </p>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        A confirmation SMS is on its way to your phone.
      </p>

      <SmsStatus />

      <div
        style={{
          display: 'block',
          background: '#f3f4f6',
          borderRadius: 8,
          padding: '12px 24px',
          marginBottom: 32,
          fontFamily: 'monospace',
          fontSize: 14,
        }}
      >
        Ticket ID: <strong>{ticketId}</strong>
      </div>

      <div>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: '#2563eb',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Browse more events
        </Link>
      </div>
    </div>
  );
}

export default function DonePage() {
  return (
    <Suspense>
      <DoneContent />
    </Suspense>
  );
}
