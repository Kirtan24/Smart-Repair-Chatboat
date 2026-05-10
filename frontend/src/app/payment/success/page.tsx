'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<'success' | 'failed' | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const planId = searchParams.get('plan_id');

    if (sessionId && planId) {
      verifyStripe(sessionId, planId);
    } else {
      // If no session id, maybe it was razorpay which is verified on the spot
      setStatus('success');
    }
  }, [searchParams]);



  const verifyStripe = async (sessionId: string, planId: string) => {
    setVerifying(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/payments/verify-stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ session_id: sessionId, plan_id: planId })
      });
      
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('failed');
      }
    } catch (error) {
      setStatus('failed');
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--gray-200)', borderTopColor: 'var(--orange-500)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <div style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Verifying your upgrade...</div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div style={{ textAlign: 'center', maxWidth: '480px', padding: '2rem' }}>
        <div style={{ width: '80px', height: '80px', margin: '0 auto 2rem', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.2)' }}>
          <svg style={{ width: '40px', height: '40px', color: '#ef4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>Verification Failed</h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
          We encountered an issue while verifying your transaction. If your account was debited, please contact our support team.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/upgrade" style={{ padding: '1rem 2rem', background: 'var(--orange-500)', color: 'white', borderRadius: 'var(--radius-xl)', fontWeight: 700, textDecoration: 'none', transition: 'all 0.2s' }}>
            Try Again
          </Link>
          <Link href="/" style={{ padding: '1rem 2rem', background: 'var(--gray-100)', color: 'var(--text-primary)', borderRadius: 'var(--radius-xl)', fontWeight: 600, textDecoration: 'none' }}>
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', maxWidth: '540px', padding: '3rem', background: 'white', borderRadius: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)', border: '1px solid var(--border)' }}>
      <div style={{ width: '96px', height: '96px', margin: '0 auto 2.5rem', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 15px 30px -5px rgba(34, 197, 94, 0.2)' }}>
        <svg style={{ width: '48px', height: '48px', color: '#22c55e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1rem', background: 'linear-gradient(135deg, #22c55e, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Success!
      </h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '3rem', lineHeight: 1.6 }}>
        Your account has been upgraded. You now have full access to premium repair guides and extended chat limits.
      </p>
      
      <Link href="/" style={{ 
        display: 'block', width: '100%', padding: '1.25rem', 
        background: 'linear-gradient(135deg, var(--orange-500), var(--orange-600))', 
        color: 'white', borderRadius: '1.25rem', fontWeight: 800, fontSize: '1.1rem',
        textDecoration: 'none', boxShadow: '0 10px 20px -5px rgba(249, 115, 22, 0.4)',
        transition: 'transform 0.2s'
      }}>
        Start Repairing Now
      </Link>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <Suspense fallback={<div style={{ color: 'var(--text-muted)' }}>Loading...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
