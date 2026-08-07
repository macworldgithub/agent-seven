import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Zap, User, Mail, Lock, Building2, ArrowRight, Check } from 'lucide-react';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

function PasswordStrengthBar({ password }: { password: string }) {
  const getStrength = (pass: string) => {
    let score = 0;
    if (!pass) return { score: 0, label: '', segments: [] };
    if (pass.length > 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = [
      'var(--color-border)',
      'var(--color-danger)',
      'var(--color-warning)',
      'var(--color-warning)',
      'var(--color-accent)',
    ];
    return { score, label: labels[score], color: colors[score] };
  };

  const { score, label, color } = getStrength(password);
  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '3px',
              borderRadius: '2px',
              background: i <= score ? color : 'var(--color-surface-3)',
              transition: 'background 200ms',
            }}
          />
        ))}
      </div>
      {label && (
        <p style={{ fontSize: '11px', color, fontWeight: 500 }}>{label}</p>
      )}
    </div>
  );
}

export function Register() {
  const { register, isRegistering } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    tenantName: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.name || !formData.email || !formData.password || !formData.tenantName) {
      setError('Please fill in all fields');
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the Terms of Service to continue');
      return;
    }
    register(formData, {
      onError: (err: any) => {
        setError(err.response?.data?.message || 'Failed to create account');
      },
    });
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

        <div
          className="absolute pointer-events-none"
          style={{
            top: '-60px',
            right: '-60px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at center, rgba(16,185,129,0.15) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        {/* Logo */}
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
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Agent Seven
          </span>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <h2
            style={{
              fontSize: '36px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            Set up your AI assistant{' '}
            <span style={{ color: 'var(--color-accent)' }}>
              in under 5 minutes.
            </span>
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '16px' }}>
            Connect your workspaces, configure your agent's personality, and let
            it start handling the busy work.
          </p>
        </div>

        {/* Steps */}
        <div className="relative z-10 space-y-4">
          {['Create your account', 'Connect Google Workspace or Slack', 'Let Agent Seven get to work'].map(
            (step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                  style={{
                    width: '24px',
                    height: '24px',
                    background: 'var(--color-brand-dim)',
                    color: 'var(--color-brand-light)',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}
                >
                  {i + 1}
                </div>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  {step}
                </span>
              </div>
            )
          )}
        </div>

        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Trusted by founders running multiple businesses
        </p>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-sm animate-fade-in py-8">
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
              Create your account
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
              Start automating your workflows today
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
              or with email
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
              label="Full name"
              id="reg-name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Hamza Khan"
              leftIcon={<User size={14} />}
            />

            <Input
              label="Email address"
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              leftIcon={<Mail size={14} />}
            />

            <Input
              label="Company / Workspace name"
              id="reg-tenant"
              name="tenantName"
              type="text"
              required
              value={formData.tenantName}
              onChange={handleChange}
              placeholder="Acme Corp"
              leftIcon={<Building2 size={14} />}
              hint="The name of your organization or personal workspace"
            />

            <div>
              <Input
                label="Password"
                id="reg-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                leftIcon={<Lock size={14} />}
              />
              <PasswordStrengthBar password={formData.password} />
            </div>

            {/* Terms */}
            <label
              className="flex items-start gap-3 cursor-pointer"
              style={{ marginTop: '8px' }}
            >
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <div
                  className="flex items-center justify-center rounded"
                  style={{
                    width: '16px',
                    height: '16px',
                    background: termsAccepted ? 'var(--color-brand)' : 'var(--color-surface-2)',
                    border: `1px solid ${termsAccepted ? 'var(--color-brand)' : 'var(--color-border)'}`,
                    transition: 'all 150ms',
                  }}
                >
                  {termsAccepted && <Check size={10} color="white" />}
                </div>
              </div>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                I agree to the{' '}
                <a href="#" style={{ color: 'var(--color-brand-light)', textDecoration: 'none' }}>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" style={{ color: 'var(--color-brand-light)', textDecoration: 'none' }}>
                  Privacy Policy
                </a>
              </span>
            </label>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isRegistering}
              className="w-full"
              leftIcon={<ArrowRight size={15} />}
            >
              Create Account
            </Button>
          </form>

          <p
            className="text-center mt-6"
            style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}
          >
            Already have an account?{' '}
            <Link
              to="/login"
              style={{ color: 'var(--color-brand-light)', fontWeight: 500, textDecoration: 'none' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
