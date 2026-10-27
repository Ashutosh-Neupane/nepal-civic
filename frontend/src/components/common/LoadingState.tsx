interface LoadingStateProps {
  rows?: number;
  type?: 'list' | 'dashboard' | 'card' | 'table';
}

function Shimmer({ className = '' }: { className: string }) {
  return (
    <div className={`skeleton-shimmer rounded-xl ${className}`} />
  );
}

export function LoadingState({ rows = 4, type = 'list' }: LoadingStateProps) {
  if (type === 'dashboard') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 animate-fade-in">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/50 shadow-card flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <Shimmer className="w-10 h-10 rounded-xl" />
              <Shimmer className="w-16 h-5 rounded-md" />
            </div>
            <div>
              <Shimmer className="h-8 w-20 mb-2" />
              <Shimmer className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-card overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-outline-variant/40 flex items-center justify-between">
          <Shimmer className="h-5 w-48" />
          <Shimmer className="h-8 w-32 rounded-lg" />
        </div>
        <div className="divide-y divide-outline-variant/40">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex-1 flex items-center gap-3">
                <Shimmer className="w-8 h-8 rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <Shimmer className="h-4 w-1/3 mb-1.5" />
                  <Shimmer className="h-3 w-1/4" />
                </div>
              </div>
              <Shimmer className="h-6 w-20 rounded-full" />
              <Shimmer className="h-6 w-24 rounded-full" />
              <Shimmer className="h-8 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 flex flex-col gap-3 shadow-card animate-fade-in">
        <div className="flex justify-between items-start">
          <Shimmer className="h-5 w-24" />
          <Shimmer className="h-6 w-20 rounded-full" />
        </div>
        <Shimmer className="h-6 w-3/4" />
        <Shimmer className="h-4 w-1/2" />
        <Shimmer className="h-2 w-full mt-2" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
          <div className="flex justify-between items-center">
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-6 w-20 rounded-full" />
          </div>
          <Shimmer className="h-5 w-3/4" />
          <Shimmer className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
