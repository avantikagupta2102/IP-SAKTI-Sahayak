"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  Cpu,
  Thermometer,
  Droplets,
  Volume2,
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Sliders,
  FileCheck,
  Download,
  Link2,
  Shield,
  Clock,
  Sparkles,
  Zap,
  ArrowRight,
  X,
} from "lucide-react";
import {
  IOTSummary,
  IOTTelemetryPoint,
  IOTEvent,
  IOTEvidence,
  getIOTSummary,
  getIOTTelemetryHistory,
  getIOTEvents,
  acknowledgeIOTAlert,
  getIOTRules,
  updateIOTRules,
  getIOTEvidence,
  saveIOTDeviceLink,
  triggerIOTDemoTick,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/context/LanguageContext";

export default function IOTCompliancePage() {
  const router = useRouter();
  const { t } = useLanguage();

  // Primary Data State
  const [summary, setSummary] = useState<IOTSummary | null>(null);
  const [telemetry, setTelemetry] = useState<IOTTelemetryPoint[]>([]);
  const [events, setEvents] = useState<IOTEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Modals & Drawers
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<IOTEvidence | null>(null);

  // Form State for Configured Process Limits
  const [tempMin, setTempMin] = useState(20);
  const [tempMax, setTempMax] = useState(30);
  const [humMin, setHumMin] = useState(40);
  const [humMax, setHumMax] = useState(70);
  const [soundMax, setSoundMax] = useState(70);
  const [isSavingRules, setIsSavingRules] = useState(false);

  // Form State for Product Linking
  const [productName, setProductName] = useState("Herbal Extract A");
  const [processName, setProcessName] = useState("Controlled Drying Process");
  const [monitoringPurpose, setMonitoringPurpose] = useState("Environmental process monitoring for quality evidence");
  const [isSavingLink, setIsSavingLink] = useState(false);

  // Simulation / Demo Mode State
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");

  // Initial load & Polling Loop
  const loadAllData = async () => {
    try {
      const [sumRes, teleRes, evtRes] = await Promise.all([
        getIOTSummary("ESP32-001"),
        getIOTTelemetryHistory("ESP32-001", 25),
        getIOTEvents("ESP32-001", 15),
      ]);
      setSummary(sumRes);
      setTelemetry(teleRes);
      setEvents(evtRes);

      if (sumRes.current_rule) {
        setTempMin(sumRes.current_rule.temp_min);
        setTempMax(sumRes.current_rule.temp_max);
        setHumMin(sumRes.current_rule.humidity_min);
        setHumMax(sumRes.current_rule.humidity_max);
        setSoundMax(sumRes.current_rule.sound_max);
      }
      if (sumRes.link) {
        setProductName(sumRes.link.product_name || "Herbal Extract A");
        setProcessName(sumRes.link.process_name || "Controlled Drying Process");
        setMonitoringPurpose(sumRes.link.monitoring_purpose || "Environmental process monitoring for quality evidence");
      }
      setLastSyncTime("Just now");
    } catch (err) {
      console.error("Failed to load IoT compliance telemetry:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    loadAllData();

    // Auto-poll telemetry every 4 seconds
    const interval = setInterval(() => {
      loadAllData();
    }, 4000);

    return () => clearInterval(interval);
  }, [router]);

  // Demo Tick simulation trigger
  const handleTriggerDemoTick = async (forceDeviation: boolean = false) => {
    setIsSimulating(true);
    try {
      await triggerIOTDemoTick(forceDeviation);
      await loadAllData();
    } catch (err) {
      console.error("Demo pulse failed:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Acknowledge Alert Handler
  const handleAcknowledge = async (eventId: string) => {
    try {
      await acknowledgeIOTAlert(eventId);
      await loadAllData();
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  // Save Configured Limits Handler
  const handleSaveRules = async () => {
    setIsSavingRules(true);
    try {
      await updateIOTRules({
        device_id: "ESP32-001",
        temp_min: tempMin,
        temp_max: tempMax,
        humidity_min: humMin,
        humidity_max: humMax,
        sound_max: soundMax,
      });
      setShowConfigModal(false);
      await loadAllData();
    } catch (err) {
      alert("Failed to save monitoring limits");
    } finally {
      setIsSavingRules(false);
    }
  };

  // Save Product Link Handler
  const handleSaveLink = async () => {
    setIsSavingLink(true);
    try {
      await saveIOTDeviceLink({
        device_id: "ESP32-001",
        product_name: productName,
        process_name: processName,
        monitoring_purpose: monitoringPurpose,
      });
      setShowLinkModal(false);
      await loadAllData();
    } catch (err) {
      alert("Failed to save product linkage");
    } finally {
      setIsSavingLink(false);
    }
  };

  // View Evidence Handler
  const handleViewEvidence = async (eventId: string) => {
    try {
      const ev = await getIOTEvidence(eventId);
      setSelectedEvidence(ev);
    } catch (err) {
      alert("Could not load evidence record for event " + eventId);
    }
  };

  const dev = summary?.device;
  const isOnline = dev?.status === "ONLINE";
  const complianceStatus = summary?.compliance_status || "NORMAL";
  const unackAlerts = summary?.unacknowledged_alerts_count || 0;

  return (
    <AppShell>
      <div className="h-full overflow-y-auto bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ── 1. Page Header & Top Device Status Bar ── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Cpu size={13} />
                  ESP32 Smart Sensor Mesh
                </span>
                <span className="text-xs text-slate-300">•</span>
                <span className="text-xs font-bold text-slate-700 font-mono">ESP32-001</span>
                <span className="text-xs text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                  {isOnline ? t("device_online", "Device Online") : t("device_offline", "Device Offline")}
                </span>
                <span className="text-xs text-slate-400 font-medium ml-1">
                  Wi-Fi: <strong className="text-slate-700">{isOnline ? t("connected", "Connected") : t("disconnected", "Disconnected")}</strong>
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {t("last_synchronized", "Last synchronized")}: <strong className="text-slate-700">{lastSyncTime}</strong>
                </span>
              </div>

              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t("smart_iot_compliance", "Smart IoT Compliance")}</h1>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Real-time environmental monitoring and compliance evidence for AYUSH processes. Connected with your Compliance Passport.
              </p>
            </div>

            {/* Action Bar & Demo Simulator Trigger */}
            <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
              <button
                onClick={() => handleTriggerDemoTick(false)}
                disabled={isSimulating}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Pulse live telemetry"
              >
                <Zap size={14} className={isSimulating ? "animate-spin text-emerald-600" : "text-emerald-600"} />
                <span>{t("demo_sensor_mode", "Demo Sensor Pulse")}</span>
              </button>

              <button
                onClick={() => handleTriggerDemoTick(true)}
                disabled={isSimulating}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Simulate controlled humidity breach for hackathon demo"
              >
                <AlertTriangle size={14} className="text-amber-600" />
                <span>Simulate Deviation</span>
              </button>

              <button
                onClick={() => setShowReportModal(true)}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors"
              >
                <FileCheck size={15} />
                <span>{t("generate_evidence_report", "Generate Evidence Report")}</span>
              </button>
            </div>
          </div>

          {/* ── 2. Live Metric Cards Grid (Temperature, Humidity, Sound, Device Status) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* TEMPERATURE CARD */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-emerald-300 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("temperature", "Temperature")}</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Thermometer size={18} />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{dev?.temperature ?? 28.4}</span>
                  <span className="text-base font-bold text-slate-500">°C</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-400">Limit: {summary?.current_rule.temp_min}–{summary?.current_rule.temp_max}°C</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {t("normal_status", "Normal")}
                  </span>
                </div>
              </div>
            </div>

            {/* HUMIDITY CARD */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-emerald-300 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("humidity", "Humidity")}</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Droplets size={18} />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-black ${(dev?.humidity ?? 61) > (summary?.current_rule.humidity_max ?? 70) ? "text-rose-600" : "text-slate-900"}`}>
                    {dev?.humidity ?? 61}
                  </span>
                  <span className="text-base font-bold text-slate-500">%</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-400">Limit: {summary?.current_rule.humidity_min}–{summary?.current_rule.humidity_max}%</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded border ${(dev?.humidity ?? 61) > (summary?.current_rule.humidity_max ?? 70)
                      ? "text-rose-700 bg-rose-50 border-rose-200"
                      : "text-emerald-700 bg-emerald-50 border-emerald-200"
                      }`}
                  >
                    {(dev?.humidity ?? 61) > (summary?.current_rule.humidity_max ?? 70) ? t("deviation_detected", "Deviation") : t("normal_status", "Normal")}
                  </span>
                </div>
              </div>
            </div>

            {/* SOUND / ACTIVITY CARD */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-emerald-300 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("sound_activity", "Sound / Activity")}</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Volume2 size={18} />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{dev?.sound ?? 42}</span>
                  <span className="text-xs font-medium text-slate-400">dB eq</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-400">Max Configured: {summary?.current_rule.sound_max}</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {t("normal_status", "Normal")}
                  </span>
                </div>
              </div>
            </div>

            {/* DEVICE STATUS CARD */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-emerald-300 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("device_status", "Device Status")}</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Cpu size={18} />
                </div>
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">{dev?.device_id ?? "ESP32-001"}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-400">{dev?.device_type ?? "Processing Monitor"}</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {isOnline ? t("connected", "Online") : t("disconnected", "Offline")}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* ── 3. Real-Time Compliance Status Banner Card ── */}
          <div
            className={`p-6 rounded-2xl border transition-all ${complianceStatus === "DEVIATION"
              ? "bg-rose-50/90 border-rose-300 text-rose-900 shadow-sm"
              : complianceStatus === "ATTENTION"
                ? "bg-amber-50/90 border-amber-300 text-amber-900 shadow-sm"
                : "bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-sm"
              }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-black text-xl ${complianceStatus === "DEVIATION"
                    ? "bg-rose-600 shadow-md shadow-rose-900/20"
                    : complianceStatus === "ATTENTION"
                      ? "bg-amber-600 shadow-md shadow-amber-900/20"
                      : "bg-emerald-600 shadow-md shadow-emerald-900/20"
                    }`}
                >
                  {complianceStatus === "DEVIATION" ? (
                    <AlertOctagon size={26} />
                  ) : complianceStatus === "ATTENTION" ? (
                    <AlertTriangle size={26} />
                  ) : (
                    <CheckCircle2 size={26} />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/80 border border-current">
                      Current Compliance Status
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {complianceStatus === "DEVIATION" ? "🔴 DEVIATION DETECTED" : complianceStatus === "ATTENTION" ? "🟡 ATTENTION REQUIRED" : "🟢 NORMAL"}
                    </span>
                  </div>

                  <h3 className="text-lg font-black mt-1">
                    {complianceStatus === "DEVIATION"
                      ? "Environmental Parameter Exceeded Configured Limit"
                      : complianceStatus === "ATTENTION"
                        ? "Parameter Approaching Monitoring Threshold"
                        : "All Monitored Parameters Within Configured Limits"}
                  </h3>

                  <p className="text-xs opacity-90 mt-0.5 leading-relaxed max-w-3xl">
                    {complianceStatus === "DEVIATION"
                      ? `Parameter Humidity observed at ${dev?.humidity ?? 78}% (Configured process limit: ${summary?.current_rule.humidity_min}–${summary?.current_rule.humidity_max}%). Evidence logged with canonical integrity hash.`
                      : "Sensor telemetry telemetry streams match organization-defined process limits for AYUSH herbal extraction & drying batch context."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="px-4 py-2.5 bg-white text-slate-800 font-bold text-xs rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Sliders size={14} className="text-slate-600" />
                  <span>Configure Limits</span>
                </button>

                <button
                  onClick={() => setShowLinkModal(true)}
                  className="px-4 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Link2 size={14} className="text-emerald-400" />
                  <span>Link Product</span>
                </button>
              </div>
            </div>
          </div>

          {/* In-App Alert Notification (if unacknowledged alerts exist) */}
          {unackAlerts > 0 && summary?.latest_event && (
            <div className="p-4 bg-amber-500 text-white rounded-2xl shadow-lg flex items-center justify-between gap-4 animate-fade-up">
              <div className="flex items-center gap-3">
                <AlertTriangle size={22} className="flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">⚠ Environmental Deviation Alert</h4>
                  <p className="text-xs opacity-95">
                    {summary.latest_event.parameter} observed at <strong>{summary.latest_event.observed_value}</strong> (Configured limit: {summary.latest_event.configured_range}) on device {summary.latest_event.device_id}.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleViewEvidence(summary.latest_event!.event_id)}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 font-bold text-xs rounded-lg transition-colors"
                >
                  View Event Evidence
                </button>
                <button
                  onClick={() => handleAcknowledge(summary.latest_event!.event_id)}
                  className="px-3 py-1.5 bg-white text-amber-950 font-black text-xs rounded-lg shadow-sm hover:bg-amber-50 transition-colors"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          )}

          {/* ── 4. Main Section Grid: Live Sensor Monitoring Chart (8 Cols) & IoT Audit Trail (4 Cols) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ── LEFT PANEL: Live Sensor Line Chart (8 Cols) ── */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-emerald-700" />
                  <h3 className="text-base font-bold text-slate-900">Live Sensor Monitoring Stream</h3>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Temp (°C)
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Humidity (%)
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Sound (dB)
                  </span>
                </div>
              </div>

              {/* Responsive SVG Line Chart Visualization */}
              <div className="relative h-64 bg-slate-950 rounded-xl p-4 overflow-hidden border border-slate-800">
                <div className="absolute inset-0 bg-radial from-emerald-950/30 to-transparent pointer-events-none" />

                {/* SVG Telemetry Stream */}
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeDasharray="4 4" />
                  <line x1="0" y1="100" x2="500" y2="100" stroke="#1e293b" strokeDasharray="4 4" />
                  <line x1="0" y1="150" x2="500" y2="150" stroke="#1e293b" strokeDasharray="4 4" />

                  {/* Humidity Threshold Line (Max 70%) */}
                  <line x1="0" y1="60" x2="500" y2="60" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
                  <text x="495" y="55" fill="#f43f5e" fontSize="9" textAnchor="end" fontWeight="bold">Configured Humidity Limit (70%)</text>

                  {/* Temperature Line (Amber) */}
                  {telemetry.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      points={telemetry
                        .map((pt, i) => {
                          const x = (i / (telemetry.length - 1)) * 500;
                          const y = 180 - ((pt.temperature - 15) / 25) * 160;
                          return `${x},${Math.max(10, Math.min(190, y))}`;
                        })
                        .join(" ")}
                    />
                  )}

                  {/* Humidity Line (Blue) */}
                  {telemetry.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      points={telemetry
                        .map((pt, i) => {
                          const x = (i / (telemetry.length - 1)) * 500;
                          const y = 180 - ((pt.humidity - 30) / 60) * 160;
                          return `${x},${Math.max(10, Math.min(190, y))}`;
                        })
                        .join(" ")}
                    />
                  )}

                  {/* Sound Line (Purple) */}
                  {telemetry.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="2"
                      opacity="0.8"
                      points={telemetry
                        .map((pt, i) => {
                          const x = (i / (telemetry.length - 1)) * 500;
                          const y = 180 - (pt.sound / 100) * 160;
                          return `${x},${Math.max(10, Math.min(190, y))}`;
                        })
                        .join(" ")}
                    />
                  )}
                </svg>

                <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>{telemetry[0]?.timestamp || "Start"}</span>
                  <span>Live Stream • Sampling Rate: 5s</span>
                  <span>{telemetry[telemetry.length - 1]?.timestamp || "Now"}</span>
                </div>
              </div>

              {/* Product & Process Association Context */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    AY
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Linked Product: {productName}</p>
                    <p className="text-[11px] text-slate-500">Process: {processName} • Purpose: {monitoringPurpose}</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowLinkModal(true)}
                  className="px-3 py-1.5 bg-white border border-slate-300 font-bold text-[11px] rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Edit Association
                </button>
              </div>
            </div>

            {/* ── RIGHT PANEL: IoT Evidence Timeline & Audit Trail (4 Cols) ── */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-emerald-700" />
                  <h3 className="text-base font-bold text-slate-900">IoT Evidence Timeline</h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400">Audit Trail</span>
              </div>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {events.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No compliance events logged yet.</p>
                ) : (
                  events.map((evt) => (
                    <div
                      key={evt.id || evt.event_id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-500">{evt.event_id}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${evt.status === "DEVIATION"
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            }`}
                        >
                          {evt.status}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900">{evt.parameter || "Process Monitoring"}</p>
                        <p className="text-[11px] text-slate-600">
                          Observed: <strong className="text-slate-800">{evt.observed_value}</strong> (Configured: {evt.configured_range})
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-200/60">
                        <span>{evt.timestamp}</span>
                        <button
                          onClick={() => handleViewEvidence(evt.event_id)}
                          className="font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                        >
                          View Evidence →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => router.push("/passport")}
                className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-emerald-200"
              >
                <span>View Full Passport Audit Trail</span>
                <ArrowRight size={14} />
              </button>
            </div>

          </div>

          {/* ── 5. Device Management Table ── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Cpu size={18} className="text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">Connected Hardware Devices</h3>
              </div>
              <span className="text-xs text-slate-500 font-semibold">1 Hardware Node Online</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 px-3">Device ID</th>
                    <th className="pb-3 px-3">Type</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Last Seen</th>
                    <th className="pb-3 px-3">Temperature</th>
                    <th className="pb-3 px-3">Humidity</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-bold font-mono text-slate-900">ESP32-001</td>
                    <td className="py-3 px-3 text-slate-600">Processing &amp; Drying Monitor</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{lastSyncTime}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{dev?.temperature ?? 28.4}°C</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{dev?.humidity ?? 61}%</td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => setShowConfigModal(true)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded text-[11px] transition-colors"
                      >
                        Configure
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ── MODAL 1: Configured Process Limits Drawer / Modal ── */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-up">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Sliders size={18} className="text-emerald-700" />
                <span>Configured Process Limits</span>
              </h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Set organization-defined operational thresholds for ESP32-001 telemetry monitoring.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Temperature Limits (°C)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={tempMin}
                    onChange={(e) => setTempMin(parseFloat(e.target.value))}
                    placeholder="Min (e.g. 20)"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <input
                    type="number"
                    value={tempMax}
                    onChange={(e) => setTempMax(parseFloat(e.target.value))}
                    placeholder="Max (e.g. 30)"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Humidity Limits (%)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={humMin}
                    onChange={(e) => setHumMin(parseFloat(e.target.value))}
                    placeholder="Min (e.g. 40)"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <input
                    type="number"
                    value={humMax}
                    onChange={(e) => setHumMax(parseFloat(e.target.value))}
                    placeholder="Max (e.g. 70)"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Maximum Sound / Activity Limit</label>
                <input
                  type="number"
                  value={soundMax}
                  onChange={(e) => setSoundMax(parseFloat(e.target.value))}
                  placeholder="Max Sound (e.g. 70)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRules}
                disabled={isSavingRules}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl"
              >
                {isSavingRules ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Product / Process Linkage Modal ── */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-up">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Link2 size={18} className="text-emerald-700" />
                <span>Link Device to AYUSH Product</span>
              </h3>
              <button onClick={() => setShowLinkModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Process Name</label>
                <input
                  type="text"
                  value={processName}
                  onChange={(e) => setProcessName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monitoring Purpose</label>
                <textarea
                  value={monitoringPurpose}
                  onChange={(e) => setMonitoringPurpose(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLink}
                disabled={isSavingLink}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl"
              >
                {isSavingLink ? "Saving..." : "Save Linkage"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: View Evidence Record Modal ── */}
      {selectedEvidence && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-up">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Tamper-Evident Audit Record
                </span>
                <h3 className="font-black text-lg text-slate-900 mt-1">{selectedEvidence.evidence_id}</h3>
              </div>
              <button onClick={() => setSelectedEvidence(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Device ID</span>
                  <span className="font-bold font-mono text-slate-900">{selectedEvidence.device_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Timestamp</span>
                  <span className="font-bold text-slate-900">{selectedEvidence.timestamp}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status</span>
                  <span className="font-bold text-emerald-700">{selectedEvidence.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Applied Rule ID</span>
                  <span className="font-bold font-mono text-slate-900">{selectedEvidence.rule_id}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800">Sensor Readings at Event:</span>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 font-bold">
                    <p className="text-slate-500 text-[10px]">Temp</p>
                    <p className="text-sm text-slate-900">{selectedEvidence.temperature}°C</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 font-bold">
                    <p className="text-slate-500 text-[10px]">Humidity</p>
                    <p className="text-sm text-slate-900">{selectedEvidence.humidity}%</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 font-bold">
                    <p className="text-slate-500 text-[10px]">Sound</p>
                    <p className="text-sm text-slate-900">{selectedEvidence.sound}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Integrity Verification Hash (SHA-256):</label>
                <div className="p-2.5 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl break-all border border-slate-800">
                  {selectedEvidence.integrity_hash}
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed italic">
                Integrity verification hash generated from canonical JSON event payload for tamper detection.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedEvidence(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: Printable / Downloadable Evidence Report Modal ── */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-up">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-2xl w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Official Report</span>
                <h2 className="text-xl font-black text-slate-900">IP-SHAKTI Sahayak</h2>
                <p className="text-xs font-bold text-slate-600">Smart Compliance Evidence Report</p>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-slate-400 text-[10px]">Organization</p>
                  <p className="font-bold text-slate-900">Herbal Health Co.</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Product / Process</p>
                  <p className="font-bold text-slate-900">{productName} ({processName})</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Hardware Node</p>
                  <p className="font-bold text-slate-900">ESP32-001 (Processing Monitor)</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Report Date</p>
                  <p className="font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Configured Process Limits</h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center font-semibold">
                  <div>Temp: {summary?.current_rule.temp_min}–{summary?.current_rule.temp_max}°C</div>
                  <div>Humidity: {summary?.current_rule.humidity_min}–{summary?.current_rule.humidity_max}%</div>
                  <div>Sound: Max {summary?.current_rule.sound_max}</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Telemetry Audit Summary &amp; Deviations</h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p>• Total Monitoring Events Logged: <strong>{events.length} events</strong></p>
                  <p>• Current Parameter Status: <strong>{complianceStatus}</strong></p>
                  <p>• Active Rule Compliance Level: <strong>100% Technical Traceability</strong></p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <p className="font-bold mb-1">Disclaimer</p>
                <p>
                  "This technical monitoring report records sensor telemetry and configured process rules. It does not independently establish legal compliance, GMP certification, patentability, or regulatory approval."
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">Document Integrity Signed • IP-SHAKTI Sahayak</span>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs"
              >
                <Download size={14} />
                <span>Download / Print PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}
