import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [regRole, setRegRole] = useState('PATIENT'); // 'PATIENT' or 'DOCTOR'

  const [errorMessage, setErrorMessage] = useState('');
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Please provide both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      showToast(`Welcome back, ${user.fullName || 'User'}`);
      if (user.role === 'ADMIN') {
        navigate('/reports');
      } else if (user.role === 'DOCTOR') {
        navigate('/appointments');
      } else {
        navigate('/book');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Please enter your first and last name.');
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMessage('Please provide a valid contact telephone number.');
      return;
    }
    if (!email.trim() || !password) {
      setErrorMessage('Please provide an email address and choose a password.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must contain at least 8 characters for security.');
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        password,
        role: regRole, // Sent as ROLE_PATIENT or ROLE_DOCTOR by api.js
      });
      showToast(`Account created successfully. Welcome, ${user.fullName}`);
      if (user.role === 'DOCTOR') {
        navigate('/appointments');
      } else {
        navigate('/book');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Registration could not be completed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '40px 36px',
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            className="sidebar-badge"
            style={{ margin: '0 auto 16px', width: '52px', height: '52px' }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '28px', height: '28px' }}>
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
            </svg>
          </div>
          <h1 style={{ fontSize: '2.4rem', marginBottom: '6px' }}>HMS</h1>
          <p className="text-soft" style={{ fontSize: '0.95rem' }}>
            Appointments and queue management
          </p>
        </div>

        {/* Tab switch */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            background: 'var(--brass-soft)',
            padding: '4px',
            borderRadius: 'var(--radius-btn)',
            marginBottom: '28px',
          }}
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!isRegister}
            onClick={() => {
              setIsRegister(false);
              setErrorMessage('');
            }}
            className="btn-glass"
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.9rem',
              background: !isRegister ? 'var(--glass-strong)' : 'transparent',
              borderColor: !isRegister ? 'var(--brass)' : 'transparent',
              boxShadow: !isRegister ? 'var(--glass-shadow)' : 'none',
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isRegister}
            onClick={() => {
              setIsRegister(true);
              setErrorMessage('');
            }}
            className="btn-glass"
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.9rem',
              background: isRegister ? 'var(--glass-strong)' : 'transparent',
              borderColor: isRegister ? 'var(--brass)' : 'transparent',
              boxShadow: isRegister ? 'var(--glass-shadow)' : 'none',
            }}
          >
            Register
          </button>
        </div>

        {/* Server Validation / Error Message */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              background: 'var(--status-cancelled-bg)',
              border: '1px solid var(--status-cancelled)',
              borderRadius: 'var(--radius-slot)',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '0.88rem',
              color: 'var(--ink)',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--status-cancelled)', marginBottom: '3px' }}>
              Attention required
            </div>
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Sign In Form */}
        {!isRegister ? (
          <form onSubmit={handleLoginSubmit} noValidate>
            <div style={{ marginBottom: '18px' }}>
              <label
                htmlFor="login-email"
                style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '6px' }}
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@hospital.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-slot)',
                  border: '1px solid var(--glass-edge)',
                  background: 'var(--glass)',
                  color: 'var(--ink)',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="login-password"
                style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '6px' }}
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-slot)',
                  border: '1px solid var(--glass-edge)',
                  background: 'var(--glass)',
                  color: 'var(--ink)',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-pine"
              style={{ width: '100%', padding: '12px' }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label
                  htmlFor="reg-first-name"
                  style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '5px' }}
                >
                  First name
                </label>
                <input
                  id="reg-first-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-slot)',
                    border: '1px solid var(--glass-edge)',
                    background: 'var(--glass)',
                    color: 'var(--ink)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="reg-last-name"
                  style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '5px' }}
                >
                  Last name
                </label>
                <input
                  id="reg-last-name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-slot)',
                    border: '1px solid var(--glass-edge)',
                    background: 'var(--glass)',
                    color: 'var(--ink)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label
                htmlFor="reg-phone"
                style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '5px' }}
              >
                Phone number
              </label>
              <input
                id="reg-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 98765 43210"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-slot)',
                  border: '1px solid var(--glass-edge)',
                  background: 'var(--glass)',
                  color: 'var(--ink)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label
                htmlFor="reg-email"
                style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '5px' }}
              >
                Email address
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@hospital.com"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-slot)',
                  border: '1px solid var(--glass-edge)',
                  background: 'var(--glass)',
                  color: 'var(--ink)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="reg-password"
                style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '5px' }}
              >
                Password (min. 8 characters)
              </label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a strong password"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-slot)',
                  border: '1px solid var(--glass-edge)',
                  background: 'var(--glass)',
                  color: 'var(--ink)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <span style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Account role
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-slot)',
                    border: '1px solid var(--glass-edge)',
                    background: regRole === 'PATIENT' ? 'var(--brass-soft)' : 'var(--glass)',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="radio"
                    name="regRole"
                    value="PATIENT"
                    checked={regRole === 'PATIENT'}
                    onChange={() => setRegRole('PATIENT')}
                  />
                  Patient
                </label>
                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-slot)',
                    border: '1px solid var(--glass-edge)',
                    background: regRole === 'DOCTOR' ? 'var(--brass-soft)' : 'var(--glass)',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="radio"
                    name="regRole"
                    value="DOCTOR"
                    checked={regRole === 'DOCTOR'}
                    onChange={() => setRegRole('DOCTOR')}
                  />
                  Doctor
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-pine"
              style={{ width: '100%', padding: '12px' }}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        )}

        {/* Collapsible Demo accounts note */}
        <div style={{ marginTop: '28px', borderTop: '1px solid var(--glass-edge)', paddingTop: '16px' }}>
          <button
            type="button"
            onClick={() => setShowDemoAccounts(!showDemoAccounts)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--brass)',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0,
            }}
            aria-expanded={showDemoAccounts}
          >
            <span>Demo accounts</span>
            <span style={{ fontSize: '0.75rem' }}>{showDemoAccounts ? '▲' : '▼'}</span>
          </button>

          {showDemoAccounts && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-slot)',
                background: 'var(--glass)',
                border: '1px solid var(--glass-edge)',
                fontSize: '0.84rem',
                lineHeight: 1.6,
              }}
            >
              <div className="text-soft" style={{ marginBottom: '6px' }}>
                Pre-configured system profiles for testing:
              </div>
              <ul style={{ listStyle: 'none', paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>
                  <strong>Admin:</strong> <code>admin@hospital.com</code>
                </li>
                <li>
                  <strong>Doctor:</strong> <code>sarah.jenkins@hospital.com</code>
                </li>
                <li>
                  <strong>Patient:</strong> <code>patient@hospital.com</code>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
