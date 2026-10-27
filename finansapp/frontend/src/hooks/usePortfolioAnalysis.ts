import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyzePortfolio } from '@/services/portfolio.service';
import { PortfolioAnalysis } from '@/types/portfolio';

const STORAGE_KEY = 'finans_portfolio_analysis';
const COOLDOWN_MS = 15 * 60 * 1000; // 15 dakika

interface StoredAnalysis {
  data: PortfolioAnalysis;
  timestamp: number;
}

export interface UsePortfolioAnalysisResult {
  lastAnalysis: PortfolioAnalysis | null;
  lastAnalysisTime: number | null;
  isAnalyzing: boolean;
  canAnalyze: boolean;
  triggerAnalysis: () => Promise<void>;
}

export function usePortfolioAnalysis(enabled: boolean): UsePortfolioAnalysisResult {
  const [lastAnalysis, setLastAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Uygulama açılışında AsyncStorage'dan son analizi yükle
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const stored = JSON.parse(raw) as StoredAnalysis;
        setLastAnalysis(stored.data);
        setLastAnalysisTime(stored.timestamp);
      })
      .catch(() => {});
  }, []);

  const canAnalyze = false;

  const triggerAnalysis = useCallback(async () => {
    if (!canAnalyze) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzePortfolio();
      const now = Date.now();
      setLastAnalysis(result);
      setLastAnalysisTime(now);
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ data: result, timestamp: now } satisfies StoredAnalysis),
      );
    } catch {
      // hata — mevcut analiz kalır, kullanıcı tekrar deneyebilir
    } finally {
      setIsAnalyzing(false);
    }
  }, [canAnalyze]);

  return { lastAnalysis, lastAnalysisTime, isAnalyzing, canAnalyze, triggerAnalysis };
}
