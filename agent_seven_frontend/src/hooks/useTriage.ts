import { useState, useEffect, useCallback } from 'react';
import { triageService, ClassifiedEmail, TriageSummary, TriageFilters } from '../services/triage.service';

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
