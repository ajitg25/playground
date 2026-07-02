import { CheckoutForm } from './CheckoutForm';

export default function CheckoutPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Acme Summit 2026</h1>
        <p style={{ color: '#6b7280', margin: 0 }}>July 15, 2026 · San Francisco, CA · $49.99</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28 }}>
        <CheckoutForm />
      </div>

      <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 16 }}>
        Payments secured by Stripe. SMS confirmation via Surge.
      </p>
    </div>
  );
}
