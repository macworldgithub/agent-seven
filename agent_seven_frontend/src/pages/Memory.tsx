import React, { useState, useEffect } from 'react';
import { Brain, Search, Filter, Trash2, Download, AlertTriangle, CheckCircle, LayoutGrid, List } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/axios';
import { Memory } from '../types';

interface MemoryStats {
  total: number;
  byType: Record<string, number>;
  lastUpdated: string;
}

export function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const filterOptions = ['All', 'Conversation', 'Decision', 'Action Item', 'Stakeholder', 'Knowledge', 'Activity Log'];

  useEffect(() => {
    fetchMemories();
    fetchStats();
  }, [search, typeFilter]);

  const fetchMemories = async () => {
    try {
      setIsLoading(true);
      // In a real app, we would pass search and typeFilter to the API
      // const res = await api.get('/api/memory', { params: { search, type: typeFilter !== 'All' ? typeFilter : undefined } });
      const res = await api.get('/memory');
      // Mock filtering on frontend if backend doesn't support it yet
      let data = res.data.data || res.data;
      if (search) {
        data = data.filter((m: any) => m.content.toLowerCase().includes(search.toLowerCase()));
      }
      if (typeFilter !== 'All') {
        // Just an example, maybe map UI types to backend types if needed
        data = data.filter((m: any) => m.type.toLowerCase() === typeFilter.toLowerCase());
      }
      setMemories(data);
    } catch (error) {
      console.error('Failed to fetch memories:', error);
      // Fallback for empty state testing
      setMemories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/memory/summary');
      setStats(res.data.data || res.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats({
        total: 0,
        byType: {},
        lastUpdated: new Date().toISOString()
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/memory/${id}`);
      fetchMemories();
      fetchStats();
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  const handleWipeAll = async () => {
    try {
      await api.delete('/memory/wipe');
      setIsWipeModalOpen(false);
      fetchMemories();
      fetchStats();
    } catch (error) {
      console.error('Failed to wipe memories:', error);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/memory/export');
      const blob = new Blob([JSON.stringify(res.data.data || res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agent-memory-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export memories:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'preference':
      case 'stakeholder':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'fact':
      case 'knowledge':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'relationship':
      case 'conversation':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'decision':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Memory</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Everything your agent has learned and remembered
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            <Download size={16} />
            Export All
          </button>
          <button
            onClick={() => setIsWipeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-danger)',
            }}
          >
            <Trash2 size={16} />
            Wipe All
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="text-sm text-[var(--color-text-muted)] mb-1">Total Memories</div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)]">
            {stats?.total || 0}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="text-sm text-[var(--color-text-muted)] mb-1">Breakdown</div>
          <div className="flex gap-2 flex-wrap mt-2">
            {stats?.byType && Object.entries(stats.byType).length > 0 ? (
              Object.entries(stats.byType).map(([type, count]) => (
                <span key={type} className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
                  {type}: {count}
                </span>
              ))
            ) : (
              <span className="text-sm text-[var(--color-text-muted)]">No data yet</span>
            )}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="text-sm text-[var(--color-text-muted)] mb-1">Last Updated</div>
          <div className="text-lg font-medium text-[var(--color-text-primary)] mt-1">
            {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString() : 'Never'}
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={18} />
          <input
            type="text"
            placeholder="Search memories by content or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand)] transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={16} />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] appearance-none focus:outline-none focus:border-[var(--color-brand)] transition-colors cursor-pointer"
            >
              {filterOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="flex bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn("p-2 transition-colors", viewMode === 'grid' ? 'bg-[var(--color-surface-2)] text-[var(--color-brand-light)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]')}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn("p-2 transition-colors", viewMode === 'list' ? 'bg-[var(--color-surface-2)] text-[var(--color-brand-light)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]')}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Memory List */}
      {!isLoading && memories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]/50">
          <div className="w-16 h-16 rounded-full bg-[var(--color-brand-dim)] flex items-center justify-center mb-4 border border-[var(--color-brand)]/20">
            <Brain size={32} className="text-[var(--color-brand-light)]" />
          </div>
          <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">No memories yet</h3>
          <p className="text-[var(--color-text-muted)] max-w-sm">
            Start chatting with your agent to build memory. It will automatically learn your preferences, relationships, and important facts.
          </p>
        </div>
      ) : (
        <div className={cn(
          "gap-4",
          viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "flex flex-col"
        )}>
          {memories.map((memory: any) => (
            <div key={memory.id} className="group flex flex-col p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)] transition-colors relative">
              <div className="flex justify-between items-start mb-3">
                <span className={cn("text-xs px-2 py-0.5 rounded-md border font-medium capitalize", getTypeColor(memory.type))}>
                  {memory.type}
                </span>
                <button
                  onClick={() => handleDelete(memory.id)}
                  className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-dim)] transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete memory"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-2 line-clamp-1">
                {/* Fallback to content snippet if title doesn't exist */}
                {memory.title || "Memory Entry"}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-4 flex-1">
                {memory.content}
              </p>
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--color-border)]">
                <div className="flex flex-wrap gap-1">
                  {/* Mock tags if they don't exist in type */}
                  {memory.tags?.map((tag: string, i: number) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  {/* Mock isVerified if not in type */}
                  {memory.isVerified !== false && (
                    <span className="flex items-center gap-1 text-green-500" title="Verified memory">
                      <CheckCircle size={12} />
                    </span>
                  )}
                  {new Date(memory.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Wipe Confirmation Modal */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl max-w-md w-full p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-4 mb-4 text-[var(--color-danger)]">
              <div className="p-3 rounded-full bg-[var(--color-danger-dim)]">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-xl font-bold">Wipe All Memories?</h2>
            </div>
            <p className="text-[var(--color-text-secondary)] mb-6">
              This will permanently delete all memories your agent has collected. This cannot be undone. Are you sure you want to proceed?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsWipeModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeAll}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-danger)] text-white hover:bg-red-600 transition-colors"
              >
                Yes, Wipe Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
