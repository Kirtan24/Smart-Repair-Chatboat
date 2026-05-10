'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function PaymentCancelPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '480px', padding: '3rem', background: 'white', borderRadius: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)', border: '1px solid var(--border)' }}>
        <div style={{ width: '80px', height: '80px', margin: '0 auto 2rem', background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.2)' }}>
          <AlertCircle size={40} color="#f59e0b" />
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>Payment Cancelled</h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
          The payment process was interrupted or cancelled. No charges were made to your account.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link href="/upgrade" style={{ 
            padding: '1.125rem', background: 'linear-gradient(135deg, var(--orange-500), var(--orange-600))', 
            color: 'white', borderRadius: '1.125rem', fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 8px 16px rgba(249, 115, 22, 0.3)'
          }}>
            Try Again
          </Link>
          <Link href="/" style={{ 
            padding: '1.125rem', background: 'var(--gray-100)', 
            color: 'var(--text-primary)', borderRadius: '1.125rem', fontWeight: 600, textDecoration: 'none'
          }}>
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
