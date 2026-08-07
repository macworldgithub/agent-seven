import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Zap, Check, Mail, Lock, ArrowRight } from 'lucide-react';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const features = [
  'Reads & drafts emails across all your businesses',
  'Manages your calendar with full context',
  'Remembers everything, forgets nothing',
];

export function Login() {
  const { login, isLoggingIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    login(
      { email, password },
      {
        onError: (err: any) => {
          setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        },
      }
    );
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none"
        />

        {/* Gradient blobs */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-80px',
            right: '-80px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at center, rgba(99,102,241,0.15) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '-60px',
            left: '-60px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at center, rgba(16,185,129,0.12) 0%, transparent 70%)',
            filter: 'blur(30px)',
          }}
        />

        {/* Top: Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              width: '34px',
              height: '34px',
              background: 'var(--color-brand-dim)',
              border: '1px solid rgba(99,102,241,0.25)',
            }}
          >
            <Zap size={16} style={{ color: 'var(--color-brand-light)' }} />
          </div>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            Agent Seven
          </span>
        </div>

        {/* Middle: Headline + Features */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2
              style={{
                fontSize: '38px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
              }}
            >
              Your AI Chief of Staff.{' '}
              <span style={{ color: 'var(--color-brand-light)' }}>
                Across every workspace.
              </span>
            </h2>
          </div>

          <div className="space-y-4">
            {features.map((f) => (
              <div key={f} className="flex items-start gap-3">
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0 mt-0.5"
                  style={{
                    width: '20px',
                    height: '20px',
                    background: 'var(--color-accent-dim)',
                    border: '1px solid rgba(16,185,129,0.25)',
                  }}
                >
                  <Check size={11} style={{ color: 'var(--color-accent)' }} />
                </div>
                <span
                  style={{
                    fontSize: '14px',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {f}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-text-muted)',
            }}
          >
            Trusted by founders running multiple businesses
          </p>
        </div>

        {/* Floating card: Morning Briefing */}
        <div
          className="absolute animate-fade-in"
          style={{
            top: '80px',
            right: '40px',
            width: '200px',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '12px 14px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: 'var(--color-brand-dim)',
                color: 'var(--color-brand-light)',
              }}
            >
              A7
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Morning Briefing
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
            You have 3 urgent emails & a board meeting at 2pm. Draft replies ready.
          </p>
        </div>

        {/* Floating card: Emails drafted */}
        <div
          className="absolute animate-fade-in"
          style={{
            bottom: '100px',
            left: '40px',
            background: 'var(--color-surface-2)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: '12px',
            padding: '10px 14px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-accent-dim)' }}
            >
              <Check size={10} style={{ color: 'var(--color-accent)' }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-accent)' }}>
              3 emails drafted
            </span>
          </div>
        </div>
      </div>

      {/* Right panel: Login form */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8"
      >
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: '32px',
                height: '32px',
                background: 'var(--color-brand-dim)',
                border: '1px solid rgba(99,102,241,0.25)',
              }}
            >
              <Zap size={15} style={{ color: 'var(--color-brand-light)' }} />
            </div>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Agent Seven
            </span>
          </div>

          <div className="mb-8">
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: '6px',
              }}
            >
              Welcome back
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
              Sign in to Agent Seven
            </p>
          </div>

          {/* Google SSO */}
          <Button
            variant="secondary"
            size="lg"
            className="w-full mb-4"
            leftIcon={<GoogleIcon />}
            onClick={() =>
              (window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`)
            }
          >
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative flex items-center gap-3 mb-4">
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
              or continue with email
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded-lg px-4 py-3 text-sm animate-fade-in"
                style={{
                  background: 'var(--color-danger-dim)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: 'var(--color-danger)',
                }}
              >
                {error}
              </div>
            )}

            <Input
              label="Email address"
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              leftIcon={<Mail size={14} />}
            />

            <div>
              <Input
                label="Password"
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock size={14} />}
              />
              <div className="flex justify-end mt-2">
                <a
                  href="#"
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    textDecoration: 'none',
                    transition: 'color 150ms',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color =
                      'var(--color-text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color =
                      'var(--color-text-muted)';
                  }}
                >
                  Forgot password?
                </a>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoggingIn}
              className="w-full"
              leftIcon={<ArrowRight size={15} />}
            >
              Sign in
            </Button>
          </form>

          <p
            className="text-center mt-6"
            style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}
          >
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{
                color: 'var(--color-brand-light)',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
