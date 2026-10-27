import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '@/types/navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateTo(name: 'AlertsModal' | 'NotificationsModal' | 'AddAsset'): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name);
  }
}
