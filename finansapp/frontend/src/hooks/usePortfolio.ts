// cursorrules §3.4: TanStack Query — tüm sunucu verisi; Zustand'da portföy tutulmaz.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPortfolio, addAsset, deleteAsset } from '@/services/portfolio.service';
import { AddAssetPayload } from '@/types/portfolio';
import { QUERY_STALE_TIMES } from '@/constants';

const PORTFOLIO_KEY = ['portfolio'] as const;

export function usePortfolio() {
  return useQuery({
    queryKey: PORTFOLIO_KEY,
    queryFn: getPortfolio,
    staleTime: QUERY_STALE_TIMES.portfolio,
    retry: 1,
  });
}

export function useAddAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddAssetPayload) => addAsset(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEY });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEY });
    },
  });
}
