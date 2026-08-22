"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  X,
  FileText,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import {
  BusinessProfile,
  CalendarEventsResponse,
  ComplianceEvent,
  ComplianceEventCreate,
  ComplianceEventUpdate,
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  getProfiles,
  updateCalendarEvent,
} from "@/lib/api";

const CATEGORIES = [
  { value: "PATENT", label: "Patent Filing & Working" },
  { value: "TRADEMARK", label: "Trademark Class Renewal" },
  { value: "AYUSH_LICENSE", label: "Form 25-D AYUSH License" },
  { value: "BIODIVERSITY", label: "NBA Section 6 Disclosure" },
  { value: "GENERAL", label: "General Corporate IP Audit" },
];

export default function CalendarPage() {
  const router = useRouter();

  // Profiles State
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  // Calendar Data State
  const [calendarData, setCalendarData] = useState<CalendarEventsResponse>({
    total: 0,
    upcoming_count: 0,
    overdue_count: 0,
    done_count: 0,
    events: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("PATENT");
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [formStatus, setFormStatus] = useState("UPCOMING");
  const [formAuthority, setFormAuthority] = useState("CGPDTM");
  const [formDescription, setFormDescription] = useState("");

  // Load profiles and calendar events on mount
  useEffect(() => {
    async function init() {
      try {
        const profs = await getProfiles();
        setProfiles(profs);
        if (profs.length > 0 && profs[0].id) {
          setSelectedProfileId(profs[0].id);
        }
      } catch (err) {
        console.error("Failed to load profiles:", err);
      }
    }
    init();
  }, []);

  // Fetch events when selectedProfileId or statusFilter changes
  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const sf = statusFilter === "ALL" ? undefined : statusFilter;
      const res = await getCalendarEvents(selectedProfileId || undefined, sf);
      setCalendarData(res);
    } catch (err) {
      console.error("Failed to load calendar events:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [selectedProfileId, statusFilter]);

  // Reset & open create modal
  const handleOpenCreateModal = () => {
    setEditingEventId(null);
    setFormTitle("");
    setFormCategory("PATENT");
    setFormDueDate(new Date().toISOString().split("T")[0]);
    setFormStatus("UPCOMING");
    setFormAuthority("CGPDTM");
    setFormDescription("");
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (evt: ComplianceEvent) => {
    setEditingEventId(evt.id);
    setFormTitle(evt.title);
    setFormCategory(evt.category);
    setFormDueDate(evt.due_date);
    setFormStatus(evt.status);
    setFormAuthority(evt.authority || "CGPDTM");
    setFormDescription(evt.description || "");
    setIsModalOpen(true);
  };

  // Save Event (Create or Update)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDueDate) {
      alert("Please provide an event title and due date.");
      return;
    }

    try {
      if (editingEventId) {
        const updatePayload: ComplianceEventUpdate = {
          profile_id: selectedProfileId || undefined,
          title: formTitle,
          category: formCategory,
          due_date: formDueDate,
          status: formStatus,
          authority: formAuthority,
          description: formDescription,
        };
        await updateCalendarEvent(editingEventId, updatePayload);
      } else {
        const createPayload: ComplianceEventCreate = {
          profile_id: selectedProfileId || undefined,
          title: formTitle,
          category: formCategory,
          due_date: formDueDate,
          status: formStatus,
          authority: formAuthority,
          description: formDescription,
        };
        await createCalendarEvent(createPayload);
      }

      setIsModalOpen(false);
      await loadEvents();
    } catch (err: any) {
      alert(`Save failed: ${err.message || err}`);
    }
  };

  // Toggle status DONE
  const handleToggleDone = async (evt: ComplianceEvent) => {
    try {
      const nextStatus = evt.status === "DONE" ? "UPCOMING" : "DONE";
      await updateCalendarEvent(evt.id, { status: nextStatus });
      await loadEvents();
    } catch (err: any) {
      alert(`Status update failed: ${err.message || err}`);
    }
  };

  // Delete event
  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this compliance deadline event?")) return;
    try {
      await deleteCalendarEvent(id);
      await loadEvents();
    } catch (err: any) {
      alert(`Delete failed: ${err.message || err}`);
    }
  };

  return (
    <AppShell>
      <div className="h-full overflow-y-auto bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Banner */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                  Compliance Deadline Tracker
                </span>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs font-semibold text-slate-500">Statutory IP Filings &amp; Renewals</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Compliance Deadline Calendar</h1>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                Track mandatory statutory deadlines (Form 27 Working Statements, Form 25-D Renewals, Trademark Class Maintenance, NBA Disclosures) tied to your business profile.
              </p>
            </div>

            {/* Profile Context Selector & Add Button */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 min-w-[220px]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5 flex items-center gap-1">
                  <Building2 size={12} className="text-emerald-700" />
                  <span>Business Profile</span>
                </label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="">All Profiles</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors"
              >
                <Plus size={16} />
                <span>Add Event</span>
              </button>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Tracked Events</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{calendarData.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <CalendarIcon size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Upcoming Deadlines</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{calendarData.upcoming_count}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Clock size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overdue Actions</p>
                <p className="text-2xl font-black text-rose-600 mt-1">{calendarData.overdue_count}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                <AlertTriangle size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed Filings</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{calendarData.done_count}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 size={22} />
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Filter size={14} />
              <span>Status Filter:</span>
            </span>
            {["ALL", "UPCOMING", "OVERDUE", "DONE"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === st
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Events List Grid */}
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <RefreshCw size={32} className="mx-auto text-emerald-600 animate-spin" />
              <p className="text-sm font-bold text-slate-700">Loading compliance events...</p>
            </div>
          ) : calendarData.events.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <CalendarIcon size={36} className="mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No compliance deadline events found.</p>
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors"
              >
                Create First Deadline Event
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {calendarData.events.map((evt) => (
                <div
                  key={evt.id}
                  className={`bg-white rounded-2xl border p-5 shadow-2xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    evt.status === "OVERDUE"
                      ? "border-rose-300 hover:border-rose-400 bg-rose-50/20"
                      : evt.status === "DONE"
                      ? "border-emerald-200 bg-emerald-50/20 opacity-85"
                      : "border-slate-200 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Status Toggle Button */}
                    <button
                      onClick={() => handleToggleDone(evt)}
                      title={evt.status === "DONE" ? "Mark as Upcoming" : "Mark as Completed"}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center mt-1 flex-shrink-0 transition-colors ${
                        evt.status === "DONE"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 border border-slate-300 text-transparent hover:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      <Check size={16} />
                    </button>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-base font-bold ${evt.status === "DONE" ? "line-through text-slate-500" : "text-slate-900"}`}>
                          {evt.title}
                        </h3>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            evt.status === "OVERDUE"
                              ? "bg-rose-100 text-rose-900 border border-rose-300"
                              : evt.status === "DONE"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : "bg-amber-100 text-amber-900 border border-amber-300"
                          }`}
                        >
                          {evt.status}
                        </span>

                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                          {evt.category.replace("_", " ")}
                        </span>
                      </div>

                      {evt.description && <p className="text-xs text-slate-600">{evt.description}</p>}

                      <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <CalendarIcon size={13} className="text-emerald-700" />
                          Due: {evt.due_date}
                        </span>
                        {evt.authority && (
                          <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-600">
                            Authority: {evt.authority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <button
                      onClick={() =>
                        router.push(
                          `/chat?prompt=${encodeURIComponent(
                            `How do I fulfill compliance for '${evt.title}' due on ${evt.due_date} under ${evt.authority || "Indian IP regulations"}?`
                          )}`
                        )
                      }
                      className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Sparkles size={13} className="text-emerald-600" />
                      <span>Filing Help</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(evt)}
                      className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                      title="Edit Event"
                    >
                      <Edit2 size={15} />
                    </button>

                    <button
                      onClick={() => handleDeleteEvent(evt.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Delete Event"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CREATE / EDIT EVENT MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {editingEventId ? "Edit Compliance Event" : "Create Compliance Deadline Event"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Form 27 Annual Working Statement Filing"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="UPCOMING">UPCOMING</option>
                    <option value="OVERDUE">OVERDUE</option>
                    <option value="DONE">DONE</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Authority</label>
                  <input
                    type="text"
                    value={formAuthority}
                    onChange={(e) => setFormAuthority(e.target.value)}
                    placeholder="e.g. CGPDTM / NBA"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description &amp; Compliance Notes</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Additional notes, filing fee receipt numbers, or statutory rules..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  {editingEventId ? "Update Event" : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
