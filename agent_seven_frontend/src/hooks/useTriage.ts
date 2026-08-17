import { useState, useEffect, useCallback } from 'react';
import { triageService, ClassifiedEmail, TriageSummary, TriageFilters, WatchlistItem, WatchlistMatch, WatchlistItemInput } from '../services/triage.service';

export function useTriage(filters?: TriageFilters) {
  const [emails, setEmails] = useState<ClassifiedEmail[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<TriageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTriageData = useCallback(async () => {
    setLoading(true);
    try {
      const [emailData, summaryData] = await Promise.all([
        triageService.getEmails(filters),
        triageService.getTriageSummary(filters?.workspaceId)
      ]);
      setEmails(emailData.emails);
      setTotal(emailData.total);
      setSummary(summaryData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch triage data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTriageData();
  }, [fetchTriageData]);

  const triggerTriage = async () => {
    const result = await triageService.triggerTriage();
    return result;
  };

  const markActedOn = async (id: string) => {
    await triageService.markActedOn(id);
    setEmails(emails.map(e => e.id === id ? { ...e, isActedOn: true } : e));
    if (summary) {
      setSummary({ ...summary, unacted: Math.max(0, summary.unacted - 1) });
    }
  };

  return {
    emails,
    total,
    summary,
    loading,
    error,
    refresh: fetchTriageData,
    triggerTriage,
    markActedOn
  };
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<WatchlistMatch[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsData, alertsData, countData] = await Promise.all([
        triageService.getWatchlistItems(),
        triageService.getAlerts(true), // unread only
        triageService.getUnreadAlertCount()
      ]);
      setItems(itemsData);
      setAlerts(alertsData);
      setUnreadCount(countData);
    } catch (err) {
      console.error('Failed to fetch watchlist data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addItem = async (data: WatchlistItemInput) => {
    const newItem = await triageService.addWatchlistItem(data);
    setItems([newItem, ...items]);
    return newItem;
  };

  const updateItem = async (id: string, data: Partial<WatchlistItemInput>) => {
    const updated = await triageService.updateWatchlistItem(id, data);
    setItems(items.map(item => item.id === id ? updated : item));
    return updated;
  };

  const deleteItem = async (id: string) => {
    await triageService.deleteWatchlistItem(id);
    setItems(items.filter(item => item.id !== id));
  };

  const toggleItem = async (id: string) => {
    const updated = await triageService.toggleWatchlistItem(id);
    setItems(items.map(item => item.id === id ? updated : item));
  };

  const markRead = async (id: string) => {
    await triageService.markAlertRead(id);
    setAlerts(alerts.filter(a => a.id !== id));
    setUnreadCount(Math.max(0, unreadCount - 1));
  };

  const markAllRead = async () => {
    await triageService.markAllAlertsRead();
    setAlerts([]);
    setUnreadCount(0);
  };

  return {
    items,
    alerts,
    unreadCount,
    loading,
    refresh: fetchData,
    addItem,
    updateItem,
    deleteItem,
    toggleItem,
    markRead,
    markAllRead
  };
}
