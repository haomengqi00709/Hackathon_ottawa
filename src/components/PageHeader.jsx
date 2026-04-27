import React from 'react';

export default function PageHeader({ title, subtitle, problemId, dataSources = [], rightSlot = null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-border pb-4 mb-5">
      <div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          {problemId && <span>Problem #{problemId}</span>}
          {dataSources.length > 0 && (
            <>
              <span>·</span>
              <span>Sources: {dataSources.join(', ')}</span>
            </>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5 max-w-3xl">{subtitle}</p>}
      </div>
      {rightSlot}
    </div>
  );
}
