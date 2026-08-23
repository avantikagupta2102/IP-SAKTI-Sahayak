/**
 * lib/notifications.ts — Notification state model & helpers with local persistence.
 */

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  read: boolean;
  moduleName: string;
  moduleRoute: string;
}

const STORAGE_KEY = "ip_sakti_notifications_v1";

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-001",
    title: "High TKDL Risk",
    description: "Herbal formulation requires traditional knowledge review.",
    timestamp: "10 min ago",
    severity: "HIGH",
    read: false,
    moduleName: "TKDL Risk Assessor",
    moduleRoute: "/tk-risk",
  },
  {
    id: "notif-002",
    title: "Deadline Approaching",
    description: "Trademark response deadline is in 7 days.",
    timestamp: "2 hrs ago",
    severity: "MEDIUM",
    read: false,
    moduleName: "Deadline Calendar",
    moduleRoute: "/calendar",
  },
  {
    id: "notif-003",
    title: "IoT Compliance Deviation",
    description: "Storage temperature exceeded the configured limit.",
    timestamp: "3 hrs ago",
    severity: "HIGH",
    read: false,
    moduleName: "Smart IoT Compliance",
    moduleRoute: "/iot-compliance",
  },
  {
    id: "notif-004",
    title: "Compliance Passport Updated",
    description: "Your latest compliance assessment has been saved.",
    timestamp: "Yesterday",
    severity: "LOW",
    read: true,
    moduleName: "Compliance Passport",
    moduleRoute: "/passport",
  },
];

/** Fetch stored notifications or load initial defaults */
export function getNotifications(): NotificationItem[] {
  if (typeof window === "undefined") return INITIAL_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

/** Save notification list to local storage */
export function saveNotifications(items: NotificationItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Failed to save notifications:", err);
  }
}

/** Mark single notification as read */
export function markNotificationAsRead(id: string): NotificationItem[] {
  const items = getNotifications().map((item) =>
    item.id === id ? { ...item, read: true } : item
  );
  saveNotifications(items);
  return items;
}

/** Mark all notifications as read */
export function markAllNotificationsAsRead(): NotificationItem[] {
  const items = getNotifications().map((item) => ({ ...item, read: true }));
  saveNotifications(items);
  return items;
}
