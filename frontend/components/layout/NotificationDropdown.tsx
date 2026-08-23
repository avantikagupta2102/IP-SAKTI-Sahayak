"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ArrowRight,
  ShieldAlert,
  Clock,
  Cpu,
  Shield,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  NotificationItem,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/notifications";

export default function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refreshNotifications = () => {
    setItems(getNotifications());
  };

  useEffect(() => {
    refreshNotifications();

    // Close dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = items.filter((n) => !n.read).length;

  const handleItemClick = (notif: NotificationItem) => {
    const updated = markNotificationAsRead(notif.id);
    setItems(updated);
    setIsOpen(false);
    router.push(notif.moduleRoute);
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = markAllNotificationsAsRead();
    setItems(updated);
  };

  const getSeverityIcon = (notif: NotificationItem) => {
    if (notif.severity === "HIGH") {
      return (
        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center flex-shrink-0">
          <ShieldAlert size={16} />
        </div>
      );
    }
    if (notif.severity === "MEDIUM") {
      return (
        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
          <Clock size={16} />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 size={16} />
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
        title="Notifications & Alerts"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-fade-up">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <CheckCheck size={14} />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {items.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No notifications right now.
              </div>
            ) : (
              items.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer relative ${
                    !notif.read ? "bg-emerald-50/40 font-medium" : "opacity-80"
                  }`}
                >
                  {!notif.read && (
                    <span className="absolute top-4 right-3 w-2 h-2 rounded-full bg-emerald-600" />
                  )}

                  {getSeverityIcon(notif)}

                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4
                        className={`text-xs font-bold truncate ${
                          notif.severity === "HIGH"
                            ? "text-rose-950"
                            : notif.severity === "MEDIUM"
                            ? "text-amber-950"
                            : "text-slate-900"
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{notif.timestamp}</span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                      {notif.description}
                    </p>

                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200/80">
                        {notif.moduleName}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Link */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/80 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/alerts");
              }}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center justify-center gap-1 w-full"
            >
              <span>View all alerts</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
