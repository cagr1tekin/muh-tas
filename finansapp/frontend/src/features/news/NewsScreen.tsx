// cursorrules §4.3: NewsScreen — iki sekme (Piyasa + AI Üretildi), NewsCard, Realtime.
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NewsStackParamList } from '@/types/navigation';
import { useAINews, useMarketNews, useInvalidateAINews } from '@/hooks/useNews';
import { AINewsCard, MarketNewsCard, NewsCardSkeleton } from '@/components/news/NewsCard';
import { AINews, MarketNews } from '@/services/news.service';
import { supabase } from '@/services/supabase';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors, Spacing, BorderRadius } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { useStrings } from '@/services/i18n';

type Props = NativeStackScreenProps<NewsStackParamList, 'News'>;

type Tab = 'market' | 'ai';

export function NewsScreen({ navigation }: Props): React.JSX.Element {
  const strings = useStrings();
  const [activeTab, setActiveTab] = useState<Tab>('market');
  const invalidateAINews = useInvalidateAINews();

  // Supabase Realtime — ai_analiz_sonucu tablosuna yeni kayıt gelince cache'i geçersiz kıl.
  // supabase null ise (ANON_KEY eksik) abonelik kurulmaz, uygulama sorunsuz çalışır.
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('ai_news_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_analiz_sonucu' },
        () => { void invalidateAINews(); },
      )
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [invalidateAINews]);

  const {
    data: aiNews = [],
    isLoading: aiLoading,
    isRefetching: aiRefetching,
    refetch: refetchAI,
  } = useAINews();

  const {
    data: marketNews = [],
    isLoading: marketLoading,
    isRefetching: marketRefetching,
    refetch: refetchMarket,
  } = useMarketNews();

  const isLoading = activeTab === 'ai' ? aiLoading : marketLoading;
  const isRefetching = activeTab === 'ai' ? aiRefetching : marketRefetching;
  const refetch = activeTab === 'ai' ? refetchAI : refetchMarket;

  function renderAIItem({ item }: { item: AINews }) {
    return (
      <AINewsCard
        item={item}
        onPress={() => navigation.navigate('NewsDetail', { id: item.id })}
      />
    );
  }

  function renderMarketItem({ item }: { item: MarketNews }) {
    return (
      <MarketNewsCard
        item={item}
        onPress={() =>
          navigation.navigate('NewsDetail', { id: item.url })
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Global Header ── */}
      <AppHeader title={strings.news} />

      {/* ── Sekme Bar ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'market' && styles.tabActive]}
          onPress={() => setActiveTab('market')}
        >
          <Text style={[styles.tabText, activeTab === 'market' && styles.tabTextActive]}>
            {strings.marketTab}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ai' && styles.tabActive]}
          onPress={() => setActiveTab('ai')}
        >
          <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>
            {strings.aiTab}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── İçerik ── */}
      {isLoading ? (
        <View style={styles.listPadding}>
          <NewsCardSkeleton />
          <NewsCardSkeleton />
          <NewsCardSkeleton />
        </View>
      ) : activeTab === 'ai' ? (
        <FlatList
          data={aiNews}
          keyExtractor={(item) => item.id}
          renderItem={renderAIItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => { void refetch(); }}
              tintColor={Colors.accent.primary}
              colors={[Colors.accent.primary]}
            />
          }
          ListEmptyComponent={<EmptyState tab="ai" strings={strings} />}
        />
      ) : (
        <FlatList
          data={marketNews}
          keyExtractor={(item, i) => `${item.url}-${i}`}
          renderItem={renderMarketItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => { void refetch(); }}
              tintColor={Colors.accent.primary}
              colors={[Colors.accent.primary]}
            />
          }
          ListEmptyComponent={<EmptyState tab="market" strings={strings} />}
        />
      )}
    </SafeAreaView>
  );
}

function EmptyState({ tab, strings }: { tab: Tab; strings: ReturnType<typeof useStrings> }): React.JSX.Element {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>{tab === 'ai' ? '🤖' : '📰'}</Text>
      <Text style={emptyStyles.title}>
        {tab === 'ai' ? strings.noAiNews : strings.noMarketNews}
      </Text>
      <Text style={emptyStyles.subtitle}>
        {tab === 'ai' ? strings.aiNewsSubtitle : strings.marketNewsSubtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    gap: Spacing[2],
    paddingBottom: Spacing[3],
  },
  tab: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.background.secondary,
  },
  tabActive: {
    backgroundColor: Colors.accent.primary,
    borderColor: Colors.accent.primary,
  },
  tabText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 13,
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: '#0A0A0A',
  },
  listContent: {
    padding: Spacing[4],
  },
  listPadding: {
    padding: Spacing[4],
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing[6],
  },
  icon: {
    fontSize: 48,
    marginBottom: Spacing[4],
  },
  title: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 18,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing[2],
  },
  subtitle: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
