// cursorrules §4.5: FCM push bildirim servisi — izin, token kaydı, lokal alarm tetikleyici.
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { PriceAlert } from '@/features/menu/AlertsScreen';

const NOTIF_HISTORY_KEY = 'finans_notif_history';
const MAX_HISTORY = 50;

export interface NotifRecord {
  id: string;
  title: string;
  body: string;
  triggeredAt: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** İzin ister. Fiziksel cihazda çalışır, simülatörde token alınamaz. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('price-alerts', {
      name: 'Fiyat Alarmları',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00BFFF',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Lokal bildirim gönderir ve geçmişe kaydeder. */
export async function sendLocalAlert(alert: PriceAlert, currentRate: number): Promise<void> {
  const directionLabel = alert.direction === 'above' ? 'üzerine çıktı' : 'altına düştü';
  const title = `${alert.code} Alarm`;
  const body = `${alert.code} ${currentRate.toFixed(4)} ₺ ile ${alert.threshold.toFixed(2)} ₺ eşiğinin ${directionLabel}.`;

  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // anında gönder
  });

  await appendNotifHistory({ id: Date.now().toString(), title, body, triggeredAt: new Date().toISOString() });
}

async function appendNotifHistory(record: NotifRecord): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_HISTORY_KEY);
    const list: NotifRecord[] = raw ? (JSON.parse(raw) as NotifRecord[]) : [];
    list.unshift(record);
    if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
    await AsyncStorage.setItem(NOTIF_HISTORY_KEY, JSON.stringify(list));
  } catch {
    // sessizce geç
  }
}

export async function getNotifHistory(): Promise<NotifRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as NotifRecord[]) : [];
  } catch {
    return [];
  }
}

export async function clearNotifHistory(): Promise<void> {
  await AsyncStorage.removeItem(NOTIF_HISTORY_KEY);
}
