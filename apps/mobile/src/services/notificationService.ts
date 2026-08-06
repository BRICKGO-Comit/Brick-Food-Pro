import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Configure default notification presentation options when app is in foreground.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string | boolean;
  seconds?: number;
  channelId?: string;
}

export interface NotificationPermissionResult {
  granted: boolean;
  status: Notifications.PermissionStatus;
  canAskAgain: boolean;
}

/**
 * Android default channel ID for notifications
 */
export const DEFAULT_CHANNEL_ID = 'default';

/**
 * Setup Android notification channel with system default sound.
 */
export async function setupAndroidNotificationChannel(
  channelId: string = DEFAULT_CHANNEL_ID,
  channelName: string = 'Default Notifications'
): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: channelName,
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D60309',
      sound: 'default', // system default sound on Android
    });
  }
}

/**
 * Check current notification permissions across Android, iOS, and Web.
 */
export async function getNotificationPermissions(): Promise<NotificationPermissionResult> {
  try {
    const { status, granted, canAskAgain } = await Notifications.getPermissionsAsync();
    return { status, granted, canAskAgain };
  } catch (error) {
    console.warn('[NotificationService] Error checking notification permissions:', error);
    return {
      status: Notifications.PermissionStatus.UNDETERMINED,
      granted: false,
      canAskAgain: true,
    };
  }
}

/**
 * Request notification permissions across Android, iOS, and Web.
 */
export async function requestNotificationPermissions(): Promise<NotificationPermissionResult> {
  try {
    if (Platform.OS === 'android') {
      await setupAndroidNotificationChannel();
    }

    const { status, granted, canAskAgain } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return { status, granted, canAskAgain };
  } catch (error) {
    console.warn('[NotificationService] Error requesting notification permissions:', error);
    return {
      status: Notifications.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: false,
    };
  }
}

/**
 * Register for push notifications and get Expo Push Token.
 * Works across iOS, Android, and Web with fallback if unavailable.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    const permResult = await requestNotificationPermissions();
    if (!permResult.granted) {
      console.log('[NotificationService] Notification permission not granted');
      return null;
    }

    if (Platform.OS === 'web') {
      console.log('[NotificationService] Web push tokens require VAPID keys; permissions granted.');
      return null;
    }

    // Skip remote Expo push token registration when running inside Expo Go app (SDK 53+)
    const executionEnv = (Constants as any).executionEnvironment;
    const appOwnership = (Constants as any).appOwnership;
    if (appOwnership === 'expo' || executionEnv === 'storeClient') {
      console.log('[NotificationService] Expo Go environment detected. Local notifications & sound alerts enabled.');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const pushTokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return pushTokenData.data;
  } catch (error) {
    console.warn('[NotificationService] Could not retrieve Expo push token:', error);
    return null;
  }
}

/**
 * Schedule a local notification (or trigger immediately if seconds is omitted/0).
 * Sound defaults to 'default' (system default sound).
 */
export async function scheduleNotification(payload: NotificationPayload): Promise<string> {
  const {
    title,
    body,
    data = {},
    sound = 'default',
    seconds,
    channelId = DEFAULT_CHANNEL_ID,
  } = payload;

  if (Platform.OS === 'android') {
    await setupAndroidNotificationChannel(channelId);
  }

  const soundValue = sound === true || sound === undefined ? 'default' : sound;

  const trigger: Notifications.NotificationTriggerInput =
    seconds && seconds > 0
      ? {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: false,
        }
      : null;

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: soundValue, // system default sound or specified custom sound
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
    trigger,
  });

  return notificationId;
}

/**
 * Send an immediate local notification with system default sound.
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<string> {
  return scheduleNotification({
    title,
    body,
    data,
    sound: 'default',
  });
}

/**
 * Dismiss a specific notification by ID.
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(notificationId);
  } catch (error) {
    console.warn(`[NotificationService] Failed to dismiss notification ${notificationId}:`, error);
  }
}

/**
 * Cancel all pending scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('[NotificationService] Failed to cancel scheduled notifications:', error);
  }
}

/**
 * Get current application badge count.
 */
export async function getBadgeCount(): Promise<number> {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.warn('[NotificationService] Failed to get badge count:', error);
    return 0;
  }
}

/**
 * Set application badge count.
 */
export async function setBadgeCount(count: number): Promise<boolean> {
  try {
    return await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.warn('[NotificationService] Failed to set badge count:', error);
    return false;
  }
}

/**
 * Subscribe to notifications received while the app is in the foreground.
 */
export function addNotificationReceivedListener(
  listener: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(listener);
}

/**
 * Subscribe to user interaction events with a notification (tapped/opened).
 */
export function addNotificationResponseReceivedListener(
  listener: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

/**
 * Initialize notification service on app load.
 * Sets up default Android channel and requests notification permissions.
 */
export async function initNotificationService(): Promise<NotificationPermissionResult> {
  return requestNotificationPermissions();
}

export const NotificationService = {
  initNotificationService,
  setupAndroidNotificationChannel,
  getNotificationPermissions,
  requestNotificationPermissions,
  registerForPushNotificationsAsync,
  scheduleNotification,
  sendLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  getBadgeCount,
  setBadgeCount,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
};

export default NotificationService;
