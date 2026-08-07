import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Edit2, Trash2, Calendar, Link as LinkIcon, X } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/axios';
import { ActionItem } from '../types';

type Tab = 'All' | 'Open' | 'In Progress' | 'Done' | 'Cancelled';

export function ActionItemsPage() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ActionItem['status']>('OPEN');
  const [dueAt, setDueAt] = useState('');

  const tabs: Tab[] = ['All', 'Open', 'In Progress', 'Done', 'Cancelled'];

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      // Map UI tabs to backend status
      let queryStatus = '';
      if (activeTab === 'Open') queryStatus = 'OPEN';
      else if (activeTab === 'In Progress') queryStatus = 'IN_PROGRESS';
      else if (activeTab === 'Done') queryStatus = 'DONE';
      else if (activeTab === 'Cancelled') queryStatus = 'CANCELLED';

      const res = await api.get('/memory/action-items', { 
        params: queryStatus ? { status: queryStatus } : {} 
      });
      console.log('Action items response:', res.data);
      setItems(res.data.data || res.data);
    } catch (error) {
      console.error('Failed to fetch action items:', error);
      // Mock empty state
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (item: ActionItem) => {
    const newStatus = item.status === 'DONE' ? 'OPEN' : 'DONE';
    try {
      // Optimistic update
      setItems(items.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
      await api.patch(`/memory/action-items/${item.id}`, { status: newStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
      // Revert on failure
      fetchItems();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/memory/action-items/${id}`);
      fetchItems();
    } catch (error) {
      console.error('Failed to delete action item:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title,
        description: description || null,
        status,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      };

      if (editingItem) {
        await api.patch(`/memory/action-items/${editingItem.id}`, payload);
      } else {
        await api.post('/memory/action-items', payload);
      }
      
      closeModal();
      fetchItems();
    } catch (error) {
      console.error('Failed to save action item:', error);
    }
  };

  const openModal = (item?: ActionItem) => {
    if (item) {
      setEditingItem(item);
      setTitle(item.title);
      setDescription(item.description || '');
      setStatus(item.status);
      setDueAt(item.dueAt ? new Date(item.dueAt).toISOString().split('T')[0] : '');
    } else {
      setEditingItem(null);
      setTitle('');
      setDescription('');
      setStatus('OPEN');
      setDueAt('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'CANCELLED': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      case 'OPEN':
      default: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    }
  };

  const isOverdue = (dateString: string | null) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isToday = (dateString: string | null) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Action Items</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Tasks identified by your agent
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]"
        >
          <Plus size={16} />
          Add Manual Item
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] mb-6 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
              activeTab === tab
                ? "border-[var(--color-brand)] text-[var(--color-brand-light)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-hover)]"
            )}
          >
            {tab}
            {/* Mock badges based on total items just to show structure */}
            {activeTab === tab && items.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[var(--color-brand-dim)] text-[10px] text-[var(--color-brand-light)]">
                {items.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {!isLoading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]/50">
          <div className="w-16 h-16 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center mb-4">
            <CheckSquare size={32} className="text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">No action items</h3>
          <p className="text-[var(--color-text-muted)] max-w-sm">
            {activeTab === 'All' 
              ? "Your agent hasn't identified any action items yet. You can add one manually." 
              : `You have no ${activeTab.toLowerCase()} action items.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const overdue = item.status !== 'DONE' && item.status !== 'CANCELLED' && isOverdue(item.dueAt);
            const dueToday = item.status !== 'DONE' && item.status !== 'CANCELLED' && isToday(item.dueAt);
            
            return (
              <div 
                key={item.id} 
                className={cn(
                  "group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border bg-[var(--color-surface)] hover:border-[var(--color-border-hover)] transition-colors relative",
                  overdue ? "border-l-4 border-l-red-500 border-t-[var(--color-border)] border-r-[var(--color-border)] border-b-[var(--color-border)]" : "border-[var(--color-border)]"
                )}
              >
                <div className="flex items-start gap-4 flex-1">
                  <button
                    onClick={() => handleToggleStatus(item)}
                    className={cn(
                      "mt-0.5 flex-shrink-0 w-5 h-5 rounded border transition-colors flex items-center justify-center",
                      item.status === 'DONE' 
                        ? "bg-green-500 border-green-500 text-white" 
                        : "border-[var(--color-border-hover)] text-transparent hover:border-green-500"
                    )}
                  >
                    {item.status === 'DONE' && <CheckSquare size={14} className="opacity-100" />}
                  </button>
                  <div className="flex flex-col min-w-0 flex-1">
                    <h3 className={cn(
                      "text-sm font-medium mb-1 truncate transition-colors",
                      item.status === 'DONE' ? "text-[var(--color-text-muted)] line-through" : "text-[var(--color-text-primary)]"
                    )}>
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-[var(--color-text-muted)] line-clamp-1 mb-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded border capitalize", getStatusColor(item.status))}>
                        {item.status.replace('_', ' ')}
                      </span>
                      
                      {item.dueAt && (
                        <div className={cn(
                          "flex items-center gap-1 text-[11px]",
                          overdue ? "text-red-500 font-medium" : 
                          dueToday ? "text-yellow-500 font-medium" : 
                          "text-[var(--color-text-muted)]"
                        )}>
                          <Calendar size={12} />
                          {new Date(item.dueAt).toLocaleDateString()}
                          {overdue && " (Overdue)"}
                          {dueToday && " (Today)"}
                        </div>
                      )}
                      
                      {/* Mock source reference */}
                      {(item as any).sourceRef && (
                        <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                          <LinkIcon size={12} />
                          {(item as any).sourceRef}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity self-end sm:self-center">
                  <button
                    onClick={() => openModal(item)}
                    className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-brand-light)] hover:bg-[var(--color-brand-dim)] transition-colors"
                    title="Edit item"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-dim)] transition-colors"
                    title="Delete item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl max-w-md w-full shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {editingItem ? 'Edit Action Item' : 'New Action Item'}
              </h2>
              <button onClick={closeModal} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)] transition-colors"
                  placeholder="e.g. Schedule team meeting"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)] transition-colors resize-none"
                  placeholder="Optional details..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ActionItem['status'])}
                    className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)] transition-colors"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)] transition-colors"
                  />
                </div>
              </div>
            </form>
            
            <div className="p-4 border-t border-[var(--color-border)] flex justify-end gap-3 bg-[var(--color-surface)] rounded-b-xl">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
