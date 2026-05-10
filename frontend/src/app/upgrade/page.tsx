'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import Sidebar from '@/components/Sidebar';
import { Wrench, CheckCircle } from 'lucide-react';

export default function UpgradePage() {
  const { user, isLoaded } = useAuthStore();
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      if (!user) {
        router.push('/login');
        return;
      }
      fetchData();
    }
  }, [user, isLoaded, router]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [plansRes, myPlanRes] = await Promise.all([
        fetch('http://localhost:5000/api/payments/plans', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/payments/my-plan', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans);
      }
      if (myPlanRes.ok) {
        const data = await myPlanRes.json();
        if (data.plan) setCurrentPlan(data.plan);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => router.push('/');
  const handleSelectConv = (id: string) => {
    useChatStore.getState().setActiveConversation(id);
    router.push('/');
  };

  const initiatePayment = async (provider: 'stripe' | 'razorpay') => {
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ planId: selectedPlan._id, provider })
      });
      
      const data = await res.json();
      
      if (provider === 'stripe' && data.url) {
        window.location.href = data.url;
      } else if (provider === 'razorpay' && data.orderId) {
        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: 'Smart Repair Chatbot',
          description: `Upgrade to ${selectedPlan.name}`,
          order_id: data.orderId,
          handler: async function (response: any) {
            const verifyRes = await fetch('http://localhost:5000/api/payments/verify-razorpay', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: selectedPlan._id
              })
            });
            if (verifyRes.ok) {
              router.push('/payment/success');
            } else {
              router.push('/payment/cancel');
            }
          },
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          theme: { color: '#f97316' }
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        setShowPaymentModal(false);
      }
    } catch (error) {
      console.error('Payment initiation failed', error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar onNewChat={handleNewChat} onSelectConv={handleSelectConv} />
        <main className="chat-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading plans...
        </main>
      </div>
    );
  }

  // Determine middle/highlighted plan if there are 3 plans
  const middlePlanIndex = plans.length === 3 ? 1 : -1;

  return (
    <div className="app-layout">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Sidebar onNewChat={handleNewChat} onSelectConv={handleSelectConv} />
      
      <main className="chat-main" style={{ overflowY: 'auto', background: 'var(--bg-secondary)' }}>
        <div className="chat-header">
            <div style={{ width: '2.25rem', height: '2.25rem', background: 'linear-gradient(135deg, var(--orange-500), var(--orange-600))', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, boxShadow: '0 2px 8px rgba(249, 115, 22, 0.15)' }}>
              <Wrench size={20} strokeWidth={1.5} />
            </div>
            <div className="chat-header-title">
              <h2>Upgrade Plan</h2>
            </div>
        </div>

        <div style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div style={{ display: 'inline-block', padding: '0.4rem 1rem', background: 'var(--orange-100)', color: 'var(--orange-700)', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '1.5rem', textTransform: 'uppercase' }}>
              Pricing Plans
            </div>
            <h1 className="welcome-title" style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: 1.2 }}>Unlock the power of <br/>Smart Repair Assistant</h1>
            <p className="welcome-subtitle" style={{ margin: '0 auto', fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: '600px' }}>
              Choose a plan that fits your needs. Get priority responses, higher limits, and advanced context retention.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`, gap: '2rem', alignItems: 'center' }}>
            {plans.map((plan: any, index: number) => {
              const isCurrentPlan = currentPlan && currentPlan._id === plan._id;
              const isHighlighted = index === middlePlanIndex;
              
              return (
                <div key={plan._id} style={{
                  background: 'var(--bg-primary)',
                  border: isHighlighted ? '2px solid var(--orange-400)' : '1px solid var(--border)',
                  borderRadius: '1.5rem',
                  padding: isHighlighted ? '3rem 2rem' : '2.5rem 2rem',
                  boxShadow: isHighlighted ? '0 20px 40px -15px rgba(249, 115, 22, 0.2)' : 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
                  zIndex: isHighlighted ? 10 : 1,
                  transition: 'transform 0.3s ease',
                }}>
                  
                  {isHighlighted && (
                    <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, var(--orange-500), var(--orange-600))', color: 'white', padding: '0.25rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', boxShadow: '0 4px 10px rgba(249, 115, 22, 0.3)' }}>
                      Most Popular
                    </div>
                  )}

                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{plan.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', height: '3rem' }}>{plan.description}</p>
                  
                  <div style={{ margin: '2rem 0', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                      {plan.currency === 'INR' ? '₹' : '$'}{plan.price}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '1rem', marginLeft: '0.5rem', fontWeight: 500 }}>/ {plan.duration_days} days</span>
                  </div>

                  <ul style={{ flex: 1, listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      <CheckCircle size={20} color="var(--orange-500)" style={{ flexShrink: 0 }} />
                      <strong>{plan.chat_limit}</strong> Premium Queries
                    </li>
                    
                    {plan.features && plan.features.length > 0 ? (
                      plan.features.map((f: string, i: number) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                          <CheckCircle size={20} color="var(--orange-500)" style={{ flexShrink: 0 }} />
                          {f}
                        </li>
                      ))
                    ) : (
                      <>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                          <CheckCircle size={20} color="var(--orange-500)" style={{ flexShrink: 0 }} />
                          Advanced context retention
                        </li>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                          <CheckCircle size={20} color="var(--orange-500)" style={{ flexShrink: 0 }} />
                          Priority technical support
                        </li>
                      </>
                    )}
                  </ul>

                  <button 
                    disabled={isCurrentPlan}
                    onClick={() => {
                      setSelectedPlan(plan);
                      setShowPaymentModal(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '1.125rem',
                      borderRadius: 'var(--radius-xl)',
                      background: isCurrentPlan ? 'var(--gray-200)' : (isHighlighted ? 'linear-gradient(135deg, var(--orange-500), var(--orange-600))' : 'var(--bg-primary)'),
                      color: isCurrentPlan ? 'var(--text-muted)' : (isHighlighted ? 'white' : 'var(--text-primary)'),
                      fontWeight: 700,
                      fontSize: '1rem',
                      border: isCurrentPlan ? '1px solid var(--gray-300)' : (isHighlighted ? 'none' : '1px solid var(--border)'),
                      cursor: isCurrentPlan ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: (!isCurrentPlan && isHighlighted) ? '0 4px 14px 0 rgba(249, 115, 22, 0.3)' : 'none'
                    }}
                    onMouseOver={(e) => {
                      if (!isCurrentPlan) {
                        if (!isHighlighted) {
                          e.currentTarget.style.background = 'var(--orange-50)';
                          e.currentTarget.style.borderColor = 'var(--orange-300)';
                          e.currentTarget.style.color = 'var(--orange-600)';
                        } else {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isCurrentPlan) {
                        if (!isHighlighted) {
                          e.currentTarget.style.background = 'var(--bg-primary)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        } else {
                          e.currentTarget.style.transform = 'none';
                        }
                      }
                    }}
                  >
                    {isCurrentPlan ? 'Current Plan' : 'Get Started'}
                  </button>
                </div>
              );
            })}
            {plans.length === 0 && (
              <div style={{ padding: '3rem', gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-xl)' }}>
                No plans are currently active. Please contact support.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Payment Selection Modal */}
      {showPaymentModal && selectedPlan && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, 0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '1.5rem',
            padding: '2.5rem',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Complete Payment</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
                  Choose your payment method for <strong style={{ color: 'var(--orange-600)' }}>{selectedPlan.name}</strong>.
                </p>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                style={{ background: 'var(--gray-100)', border: 'none', width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--gray-200)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'var(--gray-100)'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button 
                disabled={processing}
                onClick={() => initiatePayment('stripe')}
                style={{
                  width: '100%', padding: '1.25rem', borderRadius: '1rem',
                  background: 'var(--bg-primary)', border: '2px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: processing ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                  boxShadow: 'var(--shadow-sm)'
                }}
                onMouseOver={(e) => !processing && (e.currentTarget.style.borderColor = '#6366f1', e.currentTarget.style.background = '#e0e7ff')}
                onMouseOut={(e) => !processing && (e.currentTarget.style.borderColor = 'var(--border)', e.currentTarget.style.background = 'var(--bg-primary)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.25rem' }}>
                    S
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Stripe</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Pay securely with Card</div>
                  </div>
                </div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>

              <button 
                disabled={processing}
                onClick={() => initiatePayment('razorpay')}
                style={{
                  width: '100%', padding: '1.25rem', borderRadius: '1rem',
                  background: 'var(--bg-primary)', border: '2px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: processing ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                  boxShadow: 'var(--shadow-sm)'
                }}
                onMouseOver={(e) => !processing && (e.currentTarget.style.borderColor = '#3b82f6', e.currentTarget.style.background = '#dbeafe')}
                onMouseOut={(e) => !processing && (e.currentTarget.style.borderColor = 'var(--border)', e.currentTarget.style.background = 'var(--bg-primary)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.25rem' }}>
                    R
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Razorpay</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>UPI, Cards, NetBanking</div>
                  </div>
                </div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>


            </div>
            
            {processing && (
              <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--orange-500)', fontWeight: 600 }}>
                Initiating secure gateway...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
