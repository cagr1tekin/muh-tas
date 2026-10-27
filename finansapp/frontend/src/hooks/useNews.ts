// cursorrules §6.3: TanStack Query anahtar stratejisi — newsMarket, newsAI.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAINews, getMarketNews } from '@/services/news.service';

// staleTime: 5dk (cursorrules §6.3)
const STALE = 5 * 60 * 1000;
const GC = 10 * 60 * 1000;

export function useAINews() {
  return useQuery({
    queryKey: ['news', 'ai'],
    queryFn: getAINews,
    staleTime: STALE,
    gcTime: GC,
    retry: 1,
  });
}

export function useMarketNews() {
  return useQuery({
    queryKey: ['news', 'market'],
    queryFn: getMarketNews,
    staleTime: STALE,
    gcTime: GC,
    retry: 1,
  });
}

// Realtime yeni kayıt gelince AI haber cache'ini geçersiz kılmak için kullanılır.
export function useInvalidateAINews() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['news', 'ai'] });
}
