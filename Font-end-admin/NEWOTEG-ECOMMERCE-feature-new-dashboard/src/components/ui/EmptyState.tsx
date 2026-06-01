import React from 'react';

interface EmptyStateProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) => (
  <div
    className={`text-center text-slate-500 py-12 px-4 flex flex-col items-center gap-3 ${className}`}
  >
    <div className="p-3 bg-slate-100 rounded-full text-slate-400">
      <Icon size={28} />
    </div>
    <div className="space-y-1">
      <p className="font-semibold text-slate-700">{title}</p>
      {description && (
        <p className="text-sm text-slate-500 max-w-md mx-auto">{description}</p>
      )}
    </div>
    {action && <div className="mt-2">{action}</div>}
  </div>
);
