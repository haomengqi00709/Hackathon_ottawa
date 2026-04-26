import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Database, ChevronDown, ChevronUp, ChevronsUpDown, Search, ChevronLeft, ChevronRight, Copy, Check, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const DEFAULT_API = 'http://localhost:8000';

const SCHEMA_COLORS = {
  cra:     'bg-blue-100 text-blue-800',
  ab:      'bg-orange-100 text-orange-800',
  fed:     'bg-purple-100 text-purple-800',
  general: 'bg-gray-100 text-gray-700',
};

const TYPE_COLOR = (t) => {
  if (!t) return 'text-muted-foreground';
  if (t.includes('int') || t.includes('numeric') || t.includes('float') || t.includes('double')) return 'text-blue-600';
  if (t.includes('bool')) return 'text-purple-600';
  if (t.includes('date') || t.includes('time')) return 'text-green-600';
  return 'text-muted-foreground';
};

function fmtNum(n) {
  if (n === null || n === undefined) return '';
  const x = Number(n);
  if (isNaN(x)) return String(n);
  if (Math.abs(x) >= 1_000_000) return (x / 1_000_000).toFixed(2) + 'M';
  if (Math.abs(x) >= 1_000) return (x / 1_000).toFixed(1) + 'K';
  return x.toLocaleString();
}

function isNumericType(t) {
  return t && (t.includes('int') || t.includes('numeric') || t.includes('float') || t.includes('double') || t.includes('real') || t === 'money');
}

export default function DataExplorer() {
  const [apiUrl, setApiUrl]     = useState(() => localStorage.getItem('api_url') || DEFAULT_API);
  const [apiStatus, setApiStatus] = useState('unknown');

  const [schemas, setSchemas]   = useState([]);
  const [schema, setSchema]     = useState('cra');
  const [tables, setTables]     = useState([]);
  const [table, setTable]       = useState('');

  const [columns, setColumns]   = useState([]);
  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);

  const [search, setSearch]     = useState('');
  const [searchCol, setSearchCol] = useState('');
  const [sortCol, setSortCol]   = useState('');
  const [sortDir, setSortDir]   = useState('asc');
  const [page, setPage]         = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [loading, setLoading]   = useState(false);

  const [copied, setCopied]     = useState(null);
  const searchTimer             = useRef(null);

  const saveApiUrl = (u) => { setApiUrl(u); localStorage.setItem('api_url', u); };

  const checkHealth = useCallback(async (url = apiUrl) => {
    try {
      const r = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (r.ok) setApiStatus('ok'); else setApiStatus('error');
    } catch { setApiStatus('error'); }
  }, [apiUrl]);

  useEffect(() => { checkHealth(); }, []);

  // Load schemas
  useEffect(() => {
    if (apiStatus !== 'ok') return;
    fetch(`${apiUrl}/api/db/schemas`)
      .then(r => r.json())
      .then(d => setSchemas(d.schemas || []))
      .catch(() => {});
  }, [apiStatus, apiUrl]);

  // Load tables when schema changes
  useEffect(() => {
    if (!schema || apiStatus !== 'ok') return;
    setTable('');
    setColumns([]);
    setRows([]);
    fetch(`${apiUrl}/api/db/tables?schema=${schema}`)
      .then(r => r.json())
      .then(d => setTables(d.tables || []))
      .catch(() => {});
  }, [schema, apiStatus, apiUrl]);

  // Load data
  const loadData = useCallback(async (resetPage = false) => {
    if (!table || apiStatus !== 'ok') return;
    const p = resetPage ? 0 : page;
    if (resetPage) setPage(0);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        schema,
        table,
        limit: pageSize,
        offset: p * pageSize,
      });
      if (sortCol) { params.set('sort_col', sortCol); params.set('sort_dir', sortDir); }
      if (search)  { params.set('search', search); if (searchCol) params.set('search_col', searchCol); }

      const [dataRes, colRes] = await Promise.all([
        fetch(`${apiUrl}/api/db/data?${params}`).then(r => r.json()),
        columns.length ? Promise.resolve(null) : fetch(`${apiUrl}/api/db/columns?schema=${schema}&table=${table}`).then(r => r.json()),
      ]);

      if (colRes) setColumns(colRes.columns || []);
      setRows(dataRes.rows || []);
      setTotal(dataRes.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [table, schema, page, pageSize, sortCol, sortDir, search, searchCol, apiStatus, apiUrl, columns.length]);

  useEffect(() => {
    if (table) { setColumns([]); setPage(0); }
  }, [table]);

  useEffect(() => {
    if (table) loadData();
  }, [table, page, pageSize, sortCol, sortDir]);

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { if (table) loadData(true); }, 400);
  }, [search, searchCol]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const copyCell = (val, key) => {
    navigator.clipboard.writeText(String(val ?? ''));
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Data Explorer
          </h1>
          <p className="text-sm text-muted-foreground">CRA T3010 · Federal Grants · Alberta · Full dataset — query directly</p>
        </div>

        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          {apiStatus === 'ok'
            ? <Wifi className="w-4 h-4 text-green-500 flex-shrink-0" />
            : <WifiOff className="w-4 h-4 text-red-500 flex-shrink-0" />}
          <Input
            value={apiUrl}
            onChange={e => saveApiUrl(e.target.value)}
            onBlur={() => checkHealth(apiUrl)}
            className="h-7 text-xs w-52 border-0 bg-transparent p-0 focus-visible:ring-0"
            placeholder="http://localhost:8000"
          />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => checkHealth(apiUrl)}>
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {apiStatus === 'error' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Server not running.</strong> In terminal:{' '}
          <code className="bg-amber-100 px-1 rounded">cd Hackathon && uvicorn analysis_server:app --reload --port 8000</code>
        </div>
      )}

      {/* Controls row */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Schema tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {(schemas.length ? schemas : ['cra', 'ab', 'fed', 'general']).map(s => (
            <button
              key={s}
              onClick={() => setSchema(s)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                schema === s ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Table picker */}
        <Select value={table} onValueChange={v => { setTable(v); setSortCol(''); setPage(0); }}>
          <SelectTrigger className="w-72 h-8 text-xs">
            <SelectValue placeholder="Select a table…" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {tables.map(t => (
              <SelectItem key={t.name} value={t.name}>
                <span className="font-mono">{t.name}</span>
                {t.rows > 0 && (
                  <span className="ml-2 text-[10px] text-muted-foreground">{fmtNum(t.rows)}</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {table && (
          <>
            {/* Search col */}
            <Select value={searchCol || '__all__'} onValueChange={v => setSearchCol(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="All columns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All text columns</SelectItem>
                {columns.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs w-52"
              />
            </div>

            {/* Page size */}
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(0); }}>
              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[50, 100, 200, 500].map(n => <SelectItem key={n} value={String(n)}>{n} rows</SelectItem>)}
              </SelectContent>
            </Select>

            <span className="text-xs text-muted-foreground ml-auto">
              {loading ? 'Loading…' : `${total.toLocaleString()} rows`}
            </span>
          </>
        )}
      </div>

      {/* Table */}
      {table ? (
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="overflow-auto flex-1" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-muted-foreground w-10 border-b">#</th>
                    {columns.map(col => (
                      <th
                        key={col.name}
                        className="px-3 py-2 text-left font-semibold border-b whitespace-nowrap cursor-pointer select-none hover:bg-muted group"
                        onClick={() => handleSort(col.name)}
                      >
                        <div className="flex items-center gap-1">
                          <span>{col.name}</span>
                          <span className={`text-[9px] font-normal ${TYPE_COLOR(col.type)}`}>{col.type}</span>
                          {sortCol === col.name
                            ? sortDir === 'asc'
                              ? <ChevronUp className="w-3 h-3 text-primary" />
                              : <ChevronDown className="w-3 h-3 text-primary" />
                            : <ChevronsUpDown className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-2 py-1.5 text-muted-foreground tabular-nums text-[11px]">
                        {page * pageSize + i + 1}
                      </td>
                      {columns.map(col => {
                        const val = row[col.name];
                        const cellKey = `${i}-${col.name}`;
                        const isNum = isNumericType(col.type);
                        const isNull = val === null || val === undefined;
                        return (
                          <td
                            key={col.name}
                            className={`px-3 py-1.5 max-w-xs group relative ${isNum ? 'text-right tabular-nums' : ''}`}
                          >
                            {isNull ? (
                              <span className="text-muted-foreground/40 italic">null</span>
                            ) : isNum ? (
                              <span title={String(val)}>{fmtNum(val)}</span>
                            ) : (
                              <span className="truncate block max-w-[240px]" title={String(val)}>
                                {String(val).length > 80 ? String(val).slice(0, 80) + '…' : String(val)}
                              </span>
                            )}
                            <button
                              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted"
                              onClick={() => copyCell(val, cellKey)}
                              title="Copy"
                            >
                              {copied === cellKey
                                ? <Check className="w-3 h-3 text-green-500" />
                                : <Copy className="w-3 h-3 text-muted-foreground" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {rows.length === 0 && !loading && (
                    <tr>
                      <td colSpan={columns.length + 1} className="text-center py-16 text-muted-foreground">
                        No rows found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 flex-shrink-0">
              <span className="text-xs text-muted-foreground">
                {total > 0 && `Showing ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} of ${total.toLocaleString()}`}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(0)}>
                  <ChevronLeft className="w-3.5 h-3.5" /><ChevronLeft className="w-3.5 h-3.5 -ml-2.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs px-2 tabular-nums">
                  Page {page + 1} / {totalPages || 1}
                </span>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>
                  <ChevronRight className="w-3.5 h-3.5" /><ChevronRight className="w-3.5 h-3.5 -ml-2.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-3">
            <Database className="w-12 h-12 mx-auto opacity-20" />
            <div>
              <p className="font-medium">Select a schema and table above</p>
              <p className="text-sm mt-1">Full CRA dataset · 2.8M director records · 54K impossibility flags · 5.8K funding loops</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
