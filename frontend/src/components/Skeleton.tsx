'use client';

import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = '1rem', 
  borderRadius = 'var(--radius-md)', 
  className = '',
  style = {}
}) => {
  return (
    <div 
      className={`skeleton ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius,
        ...style
      }}
    />
  );
};

export const ChatSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '820px', margin: '0 auto' }}>
    <div style={{ display: 'flex', gap: '1rem', alignSelf: 'flex-start', width: '100%' }}>
      <Skeleton width={32} height={32} borderRadius="50%" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="90%" height={80} borderRadius="1rem" />
      </div>
    </div>
    <div style={{ display: 'flex', gap: '1rem', alignSelf: 'flex-end', flexDirection: 'row-reverse', width: '100%' }}>
      <Skeleton width={32} height={32} borderRadius="50%" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, alignItems: 'flex-end' }}>
        <Skeleton width="40%" height={16} />
        <Skeleton width="70%" height={60} borderRadius="1rem" />
      </div>
    </div>
    <div style={{ display: 'flex', gap: '1rem', alignSelf: 'flex-start', width: '100%' }}>
      <Skeleton width={32} height={32} borderRadius="50%" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <Skeleton width="50%" height={16} />
        <Skeleton width="85%" height={120} borderRadius="1rem" />
      </div>
    </div>
  </div>
);

export const PlanSkeleton = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', width: '100%' }}>
    {[1, 2, 3].map((i) => (
      <div key={i} style={{ background: 'white', padding: '2.5rem 2rem', borderRadius: '1.5rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Skeleton width="40%" height={24} />
        <Skeleton width="100%" height={40} />
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
          <Skeleton width="60%" height={48} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Skeleton width="90%" height={16} />
          <Skeleton width="85%" height={16} />
          <Skeleton width="80%" height={16} />
          <Skeleton width="95%" height={16} />
        </div>
        <Skeleton width="100%" height={50} borderRadius="1rem" style={{ marginTop: 'auto' }} />
      </div>
    ))}
  </div>
);

export const SidebarSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
    <Skeleton width="100%" height={45} borderRadius="var(--radius-lg)" />
    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <Skeleton width="40%" height={12} style={{ marginBottom: '0.5rem' }} />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} width="100%" height={36} borderRadius="var(--radius-md)" />
      ))}
    </div>
  </div>
);
