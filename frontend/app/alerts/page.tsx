"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  Bell,
  CheckCheck,
  ArrowRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Filter,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  NotificationItem,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/notifications";
import { getUser } from "@/lib/auth";

export default function AlertsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "HIGH">("ALL");

  const refreshData = () => {
    setItems(getNotifications());
  };

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    refreshData();
  }, [router]);

  const handleMarkRead = (id: string) => {
    const updated = markNotificationAsRead(id);
    setItems(updated);
  };

  const handleMarkAllRead = () => {
    const updated = markAllNotificationsAsRead();
    setItems(updated);
  };

  const filteredItems = items.filter((item) => {
    if (filter === "UNREAD") return !item.read;
    if (filter === "HIGH") return item.severity === "HIGH";
    return true;
  });

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <AppShell>
      <div className="h-full overflow-y-auto bg-slate-50 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Header Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Bell size={12} />
                  Statutory Radar
                </span>
                <span className="text-xs text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-500">{items.length} Logged Alerts</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notifications &amp; Alerts</h1>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Track real-time traditional knowledge warnings, trademark filing deadlines, IoT telemetry breaches, and compliance passport updates.
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors"
              >
                <CheckCheck size={16} />
                <span>Mark All as Read</span>
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="font-bold text-slate-700">Filter Alerts:</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                  filter === "ALL"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({items.length})
              </button>

              <button
                onClick={() => setFilter("UNREAD")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                  filter === "UNREAD"
                    ? "bg-emerald-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Unread ({unreadCount})
              </button>

              <button
                onClick={() => setFilter("HIGH")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                  filter === "HIGH"
                    ? "bg-rose-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                High Severity
              </button>
            </div>
          </div>

          {/* Alert Item Cards List */}
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs space-y-2">
                <Bell size={28} className="mx-auto text-slate-300" />
                <p className="font-bold text-slate-600">No alerts match the selected filter.</p>
              </div>
            ) : (
              filteredItems.map((notif) => (
                <div
                  key={notif.id}
                  className={`bg-white rounded-2xl border p-5 transition-all shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    !notif.read
                      ? "border-emerald-300 bg-emerald-50/20"
                      : "border-slate-200 opacity-90"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold ${
                        notif.severity === "HIGH"
                          ? "bg-rose-600 shadow-sm"
                          : notif.severity === "MEDIUM"
                          ? "bg-amber-600 shadow-sm"
                          : "bg-emerald-600 shadow-sm"
                      }`}
                    >
                      {notif.severity === "HIGH" ? (
                        <ShieldAlert size={20} />
                      ) : notif.severity === "MEDIUM" ? (
                        <Clock size={20} />
                      ) : (
                        <CheckCircle2 size={20} />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            notif.severity === "HIGH"
                              ? "bg-rose-100 text-rose-800 border-rose-300"
                              : notif.severity === "MEDIUM"
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : "bg-emerald-100 text-emerald-800 border-emerald-300"
                          }`}
                        >
                          {notif.severity === "HIGH" ? "HIGH RISK" : notif.severity === "MEDIUM" ? "WARNING" : "INFORMATIONAL"}
                        </span>

                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {notif.moduleName}
                        </span>

                        <span className="text-xs text-slate-400 font-medium">• {notif.timestamp}</span>

                        {!notif.read && (
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                            Unread
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm text-slate-900">{notif.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0">
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkRead(notif.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                      >
                        Mark Read
                      </button>
                    )}

                    <button
                      onClick={() => {
                        handleMarkRead(notif.id);
                        router.push(notif.moduleRoute);
                      }}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <span>Open Module</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
