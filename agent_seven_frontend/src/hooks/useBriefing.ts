import { useState, useEffect, useCallback } from 'react';
import { briefingService, Briefing, BriefingStatus } from '../services/briefing.service';

interface UseBriefingReturn {
  latestBriefing: Briefing | null;
  history: Briefing[];
  status: BriefingStatus | null;
  loading: boolean;
  generating: boolean;
  error: string | null;
  triggerBriefing: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useBriefing(): UseBriefingReturn {
  const [latestBriefing, setLatestBriefing] = useState<Briefing | null>(null);
  const [history, setHistory] = useState<Briefing[]>([]);
  const [status, setStatus] = useState<BriefingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const [latest, hist, stat] = await Promise.all([
        briefingService.getLatestBriefing(),
        briefingService.getBriefingHistory(30),
        briefingService.getBriefingStatus(),
      ]);
      setLatestBriefing(latest);
      setHistory(hist);
      setStatus(stat);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load briefing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const triggerBriefing = useCallback(async () => {
    try {
      setGenerating(true);
      setError(null);
      await briefingService.triggerBriefing();

      // Poll for the briefing to appear (every 8s, up to 90s)
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const [latest, stat] = await Promise.all([
            briefingService.getLatestBriefing(),
            briefingService.getBriefingStatus(),
          ]);

          // Check if a new briefing appeared (created within last 2 minutes)
          const isNew =
            latest &&
            new Date(latest.createdAt).getTime() > Date.now() - 2 * 60 * 1000;

          if (isNew || attempts >= 12) {
            clearInterval(poll);
            setLatestBriefing(latest);
            setStatus(stat);
            const hist = await briefingService.getBriefingHistory(30);
            setHistory(hist);
            setGenerating(false);
          }
        } catch {
          // keep polling
        }
      }, 8000);
    } catch (err: any) {
      setError(err.message ?? 'Failed to trigger briefing');
      setGenerating(false);
    }
  }, []);

  return {
    latestBriefing,
    history,
    status,
    loading,
    generating,
    error,
    triggerBriefing,
    refetch: fetchAll,
  };
}
