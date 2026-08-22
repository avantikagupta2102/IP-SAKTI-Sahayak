"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Leaf,
  LayoutDashboard,
  MessageSquare,
  UploadCloud,
  LogOut,
  UserCheck,
  Sparkles,
  Shield,
  BookOpen,
  Calendar as CalendarIcon,
  FileText,
  Clock
} from "lucide-react";
import { getUser, clearUser, UserProfile } from "@/lib/auth";
import LanguageSelector from "@/components/shared/LanguageSelector";
import StatusDot from "@/components/shared/StatusDot";
import HistorySidebar from "@/components/chat/HistorySidebar";

interface Props {
  children: React.ReactNode;
}

export default function AppShell({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentLang, setCurrentLang] = useState("en");

  useEffect(() => {
    const u = getUser();
    if (!u && pathname !== "/login") {
      router.push("/login");
    } else if (u) {
      setUser(u);
      setCurrentLang(u.language || "en");
    }
  }, [pathname, router]);

  const handleLogout = () => {
    clearUser();
    router.push("/login");
  };

  const handleLangChange = (code: string) => {
    setCurrentLang(code);
    if (user) {
      const updated = { ...user, language: code };
      setUser(updated);
      localStorage.setItem("ipsakti_user", JSON.stringify(updated));
    }
  };

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-dvh bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* ── Persistent Left Navigation Sidebar ── */}
      <aside className="w-64 bg-[#0c1911] text-white flex flex-col justify-between p-4 flex-shrink-0 border-r border-emerald-950">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/50">
              <Leaf size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">IP-SAKTI Sahayak</h1>
              <p className="text-[11px] text-emerald-400">Explainable IP & AYUSH Twin</p>
            </div>
          </div>

          {/* Core Navigation Items */}
          <nav className="space-y-1 mb-6">
            <button
              onClick={() => router.push("/dashboard")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                pathname === "/dashboard"
                  ? "bg-emerald-700/40 text-emerald-300 border border-emerald-600/50 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <LayoutDashboard size={18} className={pathname === "/dashboard" ? "text-emerald-400" : ""} />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => router.push("/passport")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                pathname === "/passport"
                  ? "bg-emerald-700/40 text-emerald-300 border border-emerald-600/50 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Shield size={18} className={pathname === "/passport" ? "text-emerald-400" : ""} />
              <span>Compliance Passport</span>
            </button>
            <button
              onClick={() => router.push("/tk-risk")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                pathname === "/tk-risk"
                  ? "bg-emerald-700/40 text-emerald-300 border border-emerald-600/50 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Leaf size={18} className={pathname === "/tk-risk" ? "text-emerald-400" : ""} />
              <span>TKDL Risk Assessor</span>
            </button>
            <button
              onClick={() => router.push("/regulations")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                pathname === "/regulations"
                  ? "bg-emerald-700/40 text-emerald-300 border border-emerald-600/50 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <BookOpen size={18} className={pathname === "/regulations" ? "text-emerald-400" : ""} />
              <span>IP Regulations</span>
            </button>
            <button
              onClick={() => router.push("/calendar")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                pathname === "/calendar"
                  ? "bg-emerald-700/40 text-emerald-300 border border-emerald-600/50 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <CalendarIcon size={18} className={pathname === "/calendar" ? "text-emerald-400" : ""} />
              <span>Deadline Calendar</span>
            </button>
            <button
              onClick={() => router.push("/expert-brief")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                pathname === "/expert-brief"
                  ? "bg-emerald-700/40 text-emerald-300 border border-emerald-600/50 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <FileText size={18} className={pathname === "/expert-brief" ? "text-emerald-400" : ""} />
              <span>Expert Brief</span>
            </button>
            <button
              onClick={() => router.push("/chat")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                pathname === "/chat"
                  ? "bg-emerald-700/40 text-emerald-300 border border-emerald-600/50 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <MessageSquare size={18} className={pathname === "/chat" ? "text-emerald-400" : ""} />
              <span>Ask AI Advisor</span>
            </button>
          </nav>

          {/* Active User Context Badge */}
          {user && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Profile Context</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-bold border border-emerald-700/50">
                  {user.role}
                </span>
              </div>
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user.org || "Independent Developer"}</p>
            </div>
          )}

          {/* Session Chat History Component (rendered in sidebar if on /chat) */}
          {pathname === "/chat" && <HistorySidebar />}
        </div>

        {/* Footer: Backend Health Status + Logout */}
        <div className="border-t border-white/10 pt-3 space-y-3">
          <StatusDot />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main View Area with Topbar Header ── */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-900">
              {pathname === "/dashboard" ? "Compliance & IP Dashboard" : "AI Legal & AYUSH Consultation"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Multilingual Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Language:</span>
              <LanguageSelector value={currentLang} onChange={handleLangChange} />
            </div>

            {/* Profile Avatar Chip */}
            {user && (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-500">{user.role}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content Children */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
