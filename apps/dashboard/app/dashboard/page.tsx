'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  LogOut, 
  Activity,
  Clock,
  AlertCircle,
  Loader2,
  Terminal,
  Download,
  BookOpen,
  ChevronRight
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt?: string;
  totalRequests: number;
}

interface RecentRequest {
  id: string;
  url: string;
  status: 'pending' | 'downloading' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  apiKeyName: string;
  error?: string;
}

interface Stats {
  totalRequests: number;
  totalKeys: number;
  recentRequests: RecentRequest[];
}

// Status colors for terminal
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'text-success';
    case 'downloading':
    case 'processing':
      return 'text-info';
    case 'failed':
      return 'text-error';
    default:
      return 'text-warning';
  }
};

const getStatusSymbol = (status: string) => {
  switch (status) {
    case 'completed':
      return '[OK]';
    case 'downloading':
    case 'processing':
      return '[..]';
    case 'failed':
      return '[XX]';
    default:
      return '[--]';
  }
};

export default function DashboardPage() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'keys' | 'requests'>('keys');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const checkAuth = useCallback(async () => {
    const storedPassword = localStorage.getItem('ytapi_admin_password');
    if (!storedPassword) {
      window.location.href = '/';
      return;
    }
    setPassword(storedPassword);
  }, []);

  const fetchData = useCallback(async () => {
    if (!password) return;
    
    try {
      const [keysRes, statsRes] = await Promise.all([
        fetch('/api/keys', { headers: { 'x-admin-password': password } }),
        fetch('/api/keys/stats', { headers: { 'x-admin-password': password } }),
      ]);

      if (!keysRes.ok || !statsRes.ok) {
        if (keysRes.status === 401 || statsRes.status === 401) {
          localStorage.removeItem('ytapi_admin_password');
          window.location.href = '/';
          return;
        }
        throw new Error('FAILED TO FETCH DATA');
      }

      const keysData = await keysRes.json();
      const statsData = await statsRes.json();

      setKeys(keysData.keys || []);
      setStats(statsData);
    } catch (err) {
      setError('CONNECTION ERROR');
    }
  }, [password]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!password) return;
    setIsLoading(true);
    let cancelled = false;
    fetchData().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [password, fetchData]);

  // Auto-refresh data every 5 seconds
  useEffect(() => {
    if (!password) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [password, fetchData]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('ytapi_admin_password');
    window.location.href = '/';
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || isCreating) return;

    setIsCreating(true);
    setError('');

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      if (!res.ok) throw new Error('FAILED TO CREATE KEY');

      const data = await res.json();
      setNewlyCreatedKey(data.fullKey);
      setNewKeyName('');
      fetchData();
    } catch (err) {
      setError('KEY GENERATION FAILED');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (isDeleting) return;
    setIsDeleting(id);

    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      });

      if (!res.ok) throw new Error('FAILED TO DELETE KEY');

      fetchData();
    } catch (err) {
      setError('DELETION FAILED');
    } finally {
      setIsDeleting(null);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toISOString().replace('T', ' ').slice(0, 19);
  };

  const formatTime = (date: Date) => {
    return date.toISOString().replace('T', ' ').slice(0, 19);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <div className="mb-4 text-info">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </div>
          <div className="sys-label">LOADING SYSTEM DATA...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border bg-card/30">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 items-center justify-center border border-fg bg-fg text-bg font-bold text-lg">
              Y
            </div>
            <span className="font-mono text-xl tracking-wider text-fg">
              YTAPI // TERMINAL
            </span>
            <span className="sys-label hidden sm:inline">
              SESSION: {formatTime(currentTime)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <a
              href="/docs"
              className="terminal-btn hidden sm:flex"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              DOCS
            </a>
            <button
              onClick={handleLogout}
              className="terminal-btn danger"
            >
              <LogOut className="h-4 w-4 mr-2" />
              EXIT
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="terminal-border bg-card/30 p-4">
              <div className="sys-label mb-2">ACTIVE KEYS</div>
              <div className="font-mono text-3xl text-fg">
                {String(stats?.totalKeys || 0).padStart(3, '0')}
              </div>
            </div>
            
            <div className="terminal-border bg-card/30 p-4">
              <div className="sys-label mb-2">TOTAL REQUESTS</div>
              <div className="font-mono text-3xl text-fg">
                {String(stats?.totalRequests || 0).padStart(5, '0')}
              </div>
            </div>
            
            <div className="terminal-border bg-card/30 p-4 sm:col-span-2 lg:col-span-1">
              <div className="sys-label mb-2">SYSTEM STATUS</div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-success animate-pulse" />
                <span className="font-mono text-fg">OPERATIONAL</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex border-b border-border">
            <button
              onClick={() => setActiveTab('keys')}
              className={`flex items-center gap-2 px-6 py-3 font-mono text-sm tracking-wider transition-colors ${
                activeTab === 'keys'
                  ? 'border-b-2 border-fg text-fg'
                  : 'text-muted hover:text-fg'
              }`}
            >
              <Key className="h-4 w-4" />
              API_KEYS
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-2 px-6 py-3 font-mono text-sm tracking-wider transition-colors ${
                activeTab === 'requests'
                  ? 'border-b-2 border-fg text-fg'
                  : 'text-muted hover:text-fg'
              }`}
            >
              <Activity className="h-4 w-4" />
              REQUESTS
            </button>
          </div>

          {/* Keys Tab */}
          {activeTab === 'keys' && (
            <div className="terminal-border bg-card/20">
              <div className="flex items-center justify-between border-b border-border bg-card/30 p-4">
                <div>
                  <h2 className="font-mono text-lg text-fg">API KEYS</h2>
                  <p className="sys-label mt-1">MANAGE ACCESS TOKENS</p>
                </div>
                <button
                  onClick={() => setShowNewKeyModal(true)}
                  className="terminal-btn primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  GENERATE
                </button>
              </div>

              <div className="p-4">
                {keys.length === 0 ? (
                  <div className="py-12 text-center">
                    <Key className="h-12 w-12 mx-auto text-muted" />
                    <p className="mt-4 sys-label">NO KEYS FOUND</p>
                    <button
                      onClick={() => setShowNewKeyModal(true)}
                      className="mt-4 text-info hover:underline font-mono"
                    >
                      CREATE FIRST KEY
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs sys-label border-b border-border">
                      <div className="col-span-3">NAME</div>
                      <div className="col-span-4">KEY</div>
                      <div className="col-span-2">CREATED</div>
                      <div className="col-span-2">USAGE</div>
                      <div className="col-span-1">ACTION</div>
                    </div>
                    
                    {keys.map((key) => (
                      <div
                        key={key.id}
                        className="grid grid-cols-12 gap-4 px-4 py-3 border border-border bg-bg/50 font-mono text-sm items-center"
                      >
                        <div className="col-span-3 truncate text-fg">
                          {key.name}
                        </div>
                        <div className="col-span-4 font-mono text-muted text-xs truncate">
                          {key.key.slice(0, 20)}...
                        </div>
                        <div className="col-span-2 text-xs text-muted">
                          {formatDate(key.createdAt).split(' ')[0]}
                        </div>
                        <div className="col-span-2 text-xs">
                          <span className={key.totalRequests > 0 ? 'text-success' : 'text-muted'}>
                            {String(key.totalRequests).padStart(4, '0')} REQ
                          </span>
                        </div>
                        <div className="col-span-1 flex gap-2">
                          <button
                            onClick={() => copyToClipboard(key.key, key.id)}
                            className="text-muted hover:text-fg transition-colors"
                            title="COPY"
                          >
                            {copiedId === key.id ? (
                              <Check className="h-4 w-4 text-success" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteKey(key.id)}
                            disabled={isDeleting === key.id}
                            className="text-muted hover:text-error transition-colors"
                            title="DELETE"
                          >
                            {isDeleting === key.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="terminal-border bg-card/20">
              <div className="border-b border-border bg-card/30 p-4">
                <h2 className="font-mono text-lg text-fg">RECENT REQUESTS</h2>
                <p className="sys-label mt-1">LAST 10 DOWNLOAD OPERATIONS</p>
              </div>

              <div className="p-4">
                {!stats?.recentRequests || stats.recentRequests.length === 0 ? (
                  <div className="py-12 text-center">
                    <Activity className="h-12 w-12 mx-auto text-muted" />
                    <p className="mt-4 sys-label">NO REQUESTS FOUND</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs sys-label border-b border-border">
                      <div className="col-span-1">STATUS</div>
                      <div className="col-span-4">URL</div>
                      <div className="col-span-2">KEY</div>
                      <div className="col-span-3">TIME</div>
                      <div className="col-span-2">DETAILS</div>
                    </div>
                    
                    {stats.recentRequests.map((request) => (
                      <div
                        key={request.id}
                        className="grid grid-cols-12 gap-4 px-4 py-3 border border-border bg-bg/50 font-mono text-sm items-center"
                      >
                        <div className={`col-span-1 ${getStatusColor(request.status)}`}>
                          {getStatusSymbol(request.status)}
                        </div>
                        <div className="col-span-4 truncate text-fg/80 text-xs" title={request.url}>
                          {request.url.length > 40 ? request.url.slice(0, 40) + '...' : request.url}
                        </div>
                        <div className="col-span-2 text-muted text-xs">
                          {request.apiKeyName}
                        </div>
                        <div className="col-span-3 text-muted text-xs">
                          {formatDate(request.createdAt)}
                        </div>
                        <div className="col-span-2 text-xs">
                          {request.status === 'failed' && request.error ? (
                            <span className="text-error truncate" title={request.error}>
                              {request.error.slice(0, 20)}...
                            </span>
                          ) : request.completedAt ? (
                            <span className="text-success">
                              {formatDate(request.completedAt).split(' ')[1]}
                            </span>
                          ) : (
                            <span className="text-warning">PENDING</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-bg px-4 py-2">
        <div className="flex justify-between text-xs sys-label">
          <span>YTAPI TERMINAL v1.0.0</span>
          <span className="flex items-center gap-2">
            <span className="text-success">●</span>
            CONNECTED
          </span>
        </div>
      </footer>

      {/* New Key Modal */}
      {showNewKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/90 p-4">
          <div className="terminal-border bg-card w-full max-w-md p-6">
            <div className="mb-4 flex items-center gap-2 border-b border-border pb-4">
              <span className="text-muted">[</span>
              <span className="text-warning">NEW_KEY</span>
              <span className="text-muted">]</span>
            </div>

            {newlyCreatedKey ? (
              <div>
                <div className="border border-success/50 bg-success/10 p-4 mb-4">
                  <p className="text-success font-mono mb-2">KEY GENERATED SUCCESSFULLY</p>
                  <p className="sys-label mb-4">COPY THIS KEY NOW - IT WON&apos;T BE SHOWN AGAIN</p>
                  <div className="flex items-center gap-2 bg-bg p-3 border border-border">
                    <code className="flex-1 font-mono text-xs break-all text-fg">
                      {newlyCreatedKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(newlyCreatedKey, 'new')}
                      className="terminal-btn"
                    >
                      {copiedId === 'new' ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowNewKeyModal(false);
                    setNewlyCreatedKey(null);
                    setNewKeyName('');
                  }}
                  className="terminal-btn primary w-full"
                >
                  CLOSE
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey}>
                <div className="mb-4">
                  <label className="sys-label mb-2 block">KEY IDENTIFIER</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. PRODUCTION"
                    className="terminal-input w-full"
                    required
                  />
                </div>
                {error && (
                  <p className="mb-4 text-error text-sm font-mono">{error}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewKeyModal(false);
                      setNewKeyName('');
                    }}
                    className="terminal-btn flex-1"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newKeyName.trim()}
                    className="terminal-btn primary flex-1"
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : (
                      'GENERATE'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
