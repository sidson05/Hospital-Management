import React from 'react';

export default function Skeleton({ width = '100%', height = '20px', style = {}, className = '' }) {
  return (
    <div
      className={`glass-skeleton ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}
