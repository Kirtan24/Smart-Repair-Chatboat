'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Wrench, Zap, MessageCircle, Shield, Eye, EyeOff, Loader2, Mic, ImageIcon, Sparkles, Users } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === 'register' && !form.name.trim()) e.name = 'Name is required';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Enter a valid email';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      let res;
      if (mode === 'login') {
        res = await authApi.login(form.email, form.password);
      } else {
        res = await authApi.register(form.name, form.email, form.password);
      }
      const { token, user } = res.data;
      setAuth(user, token);
      toast.success(mode === 'login' ? `Welcome back, ${user.name}!` : `Account created! Welcome, ${user.name}!`);
      router.push('/');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Something went wrong';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setErrors({});
    setForm({ name: '', email: '', password: '' });
  };

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-brand-icon"><Wrench size={40} /></div>
          <h1 className="auth-brand-title">Smart Repair Assistant</h1>
          <p className="auth-brand-desc">
            Your AI-powered home technician. Diagnose and fix appliance issues instantly with voice, text, and image input.
          </p>
          <div className="auth-features">
            {[
              { Icon: Mic, label: 'Voice-powered diagnosis' },
              { Icon: ImageIcon, label: 'Image analysis for visual issues' },
              { Icon: Sparkles, label: 'AI-driven step-by-step repair' },
              { Icon: Users, label: 'Find nearby technicians instantly' },
            ].map((f) => {
              const IconComponent = f.Icon;
              return (
                <div key={f.label} className="auth-feature">
                  <div className="auth-feature-icon"><IconComponent size={20} strokeWidth={1.5} /></div>
                  <span>{f.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-card">
          <h2 className="auth-card-title">
            {mode === 'login' ? 'Welcome back 👋' : 'Create account 🚀'}
          </h2>
          <p className="auth-card-subtitle">
            {mode === 'login'
              ? 'Sign in to continue your repair sessions'
              : 'Join thousands of homeowners fixing issues smarter'}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label" htmlFor="name">Full Name</label>
                <input
                  id="name"
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoComplete="name"
                />
                {errors.name && <p className="form-error">{errors.name}</p>}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
              {errors.email && <p className="form-error">{errors.email}</p>}
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                type={showPass ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: '0.75rem', bottom: errors.password ? '1.65rem' : '0.6rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span className="spinner" /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button className="auth-switch-link" onClick={switchMode}>
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
