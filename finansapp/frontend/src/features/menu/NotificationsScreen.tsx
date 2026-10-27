// cursorrules §4.5: NotificationsScreen — geçmiş push bildirimleri listesi
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getNotifHistory, clearNotifHistory, NotifRecord } from '@/services/push.service';
import { formatDateLong } from '@/utils';
import { Inbox, Bell, Trash2 } from 'lucide-react-native';
import { Colors, Spacing } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { useStrings } from '@/services/i18n';

export function NotificationsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const strings = useStrings();
  const [history, setHistory] = useState<NotifRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, []),
  );

  async function load() {
    const list = await getNotifHistory();
    setHistory(list);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function handleClear() {
    Alert.alert(strings.clearHistoryTitle, strings.clearHistoryMsg, [
      { text: strings.cancel, style: 'cancel' },
      {
        text: strings.clear,
        style: 'destructive',
        onPress: async () => {
          await clearNotifHistory();
          setHistory([]);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Üst bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>{strings.back}</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{strings.notificationsTitle}</Text>
        {history.length > 0 ? (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={18} color={Colors.danger} strokeWidth={1.75} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { void handleRefresh(); }}
            tintColor={Colors.accent.primary}
            colors={[Colors.accent.primary]}
          />
        }
      >
        {history.length === 0 ? (
          <View style={styles.empty}>
            <Inbox size={56} color={Colors.text.disabled} strokeWidth={1.25} />
            <Text style={styles.emptyTitle}>{strings.noNotifications}</Text>
            <Text style={styles.emptyText}>
              {strings.noNotificationsSub}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {history.map((item, index) => (
              <React.Fragment key={item.id}>
                <NotifRow item={item} />
                {index < history.length - 1 && <View style={styles.separator} />}
              </React.Fragment>
            ))}
          </View>
        )}
        <View style={{ height: Spacing[8] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function NotifRow({ item }: { item: NotifRecord }): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Bell size={16} color={Colors.accent.primary} strokeWidth={1.75} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowBody}>{item.body}</Text>
        <Text style={styles.rowDate}>{formatDateLong(item.triggeredAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  backText: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 16,
    color: Colors.accent.primary,
  },
  topBarTitle: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 17,
    color: Colors.text.primary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing[6],
    gap: Spacing[3],
  },
  emptyTitle: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 20,
    color: Colors.text.primary,
  },
  emptyText: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  list: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing[3],
    paddingVertical: Spacing[4],
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,191,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontFamily: FontFamily.inter.semiBold,
    fontSize: 14,
    color: Colors.text.primary,
  },
  rowBody: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 19,
  },
  rowDate: {
    fontFamily: FontFamily.inter.regular,
    fontSize: 11,
    color: Colors.text.disabled,
    marginTop: 2,
  },
});
