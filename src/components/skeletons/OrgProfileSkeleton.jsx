import React from 'react';

function Bar({ w = 'w-32', h = 'h-3' }) {
  return <div className={`${w} ${h} bg-muted rounded animate-pulse`} />;
}

export default function OrgProfileSkeleton() {
  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded bg-muted animate-pulse" />
        <Bar w="w-24" />
      </div>
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <Bar w="w-64" h="h-5" />
            <Bar w="w-40" />
            <Bar w="w-56" />
          </div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <Bar w="w-40" h="h-4" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-20 rounded-xl bg-muted animate-pulse" />
          <div className="h-20 rounded-xl bg-muted animate-pulse" />
          <div className="h-20 rounded-xl bg-muted animate-pulse" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Bar key={i} w="w-full" />)}
        </div>
      </div>
    </div>
  );
}
