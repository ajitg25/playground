'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
}

function PayStep({ ticketId }: { ticketId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setErr(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/done?ticket_id=${ticketId}`,
      },
    });
    if (error) setErr(error.message ?? 'Payment failed');
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <PaymentElement />
      {err && <p style={{ color: '#dc2626', marginTop: 12, fontSize: 14 }}>{err}</p>}
      <button
        type="submit"
        disabled={!stripe || busy}
        style={{
          marginTop: 20,
          width: '100%',
          padding: '12px',
          background: busy ? '#93c5fd' : '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 16,
        }}
      >
        {busy ? 'Processing…' : 'Pay $49.99'}
      </button>
    </form>
  );
}

export function CheckoutForm() {
  const [contact, setContact] = useState<ContactInfo>({ name: '', email: '', phone: '' });
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onContinue(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: 'Acme Summit 2026',
          ticket_holder_name: contact.name,
          email: contact.email,
          phone: contact.phone,
          amount_cents: 4999,
        }),
      });
      if (!res.ok) throw new Error('Failed to create payment');
      const data = await res.json();
      setClientSecret(data.client_secret);
      setTicketId(data.ticket_id);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 15,
    marginTop: 6,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
  };

  return (
    <div>
      {!clientSecret ? (
        <form onSubmit={onContinue}>
          <h2 style={{ marginBottom: 24, fontSize: 20, fontWeight: 600 }}>Your details</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Full name
              <input
                style={inputStyle}
                type="text"
                required
                value={contact.name}
                onChange={e => setContact(c => ({ ...c, name: e.target.value }))}
                placeholder="Jane Smith"
              />
            </label>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Email
              <input
                style={inputStyle}
                type="email"
                required
                value={contact.email}
                onChange={e => setContact(c => ({ ...c, email: e.target.value }))}
                placeholder="jane@example.com"
              />
            </label>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>
              Phone (for SMS confirmation)
              <input
                style={inputStyle}
                type="tel"
                required
                value={contact.phone}
                onChange={e => setContact(c => ({ ...c, phone: e.target.value }))}
                placeholder="+1 555 000 0000"
              />
            </label>
          </div>

          {err && <p style={{ color: '#dc2626', marginBottom: 12, fontSize: 14 }}>{err}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#93c5fd' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            {loading ? 'Loading…' : 'Continue to Payment'}
          </button>
        </form>
      ) : (
        <div>
          <h2 style={{ marginBottom: 24, fontSize: 20, fontWeight: 600 }}>Payment</h2>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PayStep ticketId={ticketId!} />
          </Elements>
        </div>
      )}
    </div>
  );
}
