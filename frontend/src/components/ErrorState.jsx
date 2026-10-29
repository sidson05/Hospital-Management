import React from 'react';

export default function ErrorState({ message, onRetry }) {
  return (
    <div
      className="glass-card"
      style={{
        padding: '32px 24px',
        textAlign: 'center',
        margin: '24px 0',
      }}
      role="alert"
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          margin: '0 auto 16px',
          borderRadius: '50%',
          background: 'var(--status-cancelled-bg)',
          color: 'var(--status-cancelled)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.3rem',
          fontWeight: 700,
        }}
      >
        !
      </div>
      <h3 style={{ marginBottom: '8px', color: 'var(--ink)' }}>
        Unable to load information
      </h3>
      <p className="text-soft" style={{ maxWidth: '440px', margin: '0 auto 20px', fontSize: '0.95rem' }}>
        {message || 'A temporary issue occurred while communicating with the hospital services.'}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-brass-outline">
          Try again
        </button>
      )}
    </div>
  );
}
