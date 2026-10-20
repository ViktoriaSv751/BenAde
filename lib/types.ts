export type Role = "owner" | "member" | "viewer";
export type TaskType = "vu_download" | "card_download" | "calibration" | "card_expiry" | "training" | "invoice";
export type TaskStatus = "open" | "done" | "skipped";

export interface WorkspaceDefaults {
  vuDays: number; cardDays: number; calibrationDays: number; cardExpiryDays: number; invoiceDays: number;
  remindDaysBefore: number[]; remindTime: string; trainingTimes: string[]; quietFrom: string; quietTo: string; vatPercent: number;
  /** Munkarend: from `start` (a work day) `work` locked days, then `free` open days, repeating. */
  workRota?: WorkRota | null;
  /** Manual changes to single days: "lock" = locked, "free" = open even if the pattern locks it. */
  dayOverrides?: Record<string, "lock" | "free">;
}
export interface WorkRota { enabled: boolean; start: string; work?: number; free?: number;
  /** legacy shape (first version): `on` open days from `start`, then `off` locked days */ on?: number; off?: number; }
export interface Workspace {
  id: string; name: string; phone?: string | null; email?: string | null; address?: string | null; tax_id?: string | null;
  logo_path?: string | null; timezone: string; defaults: WorkspaceDefaults; ics_token: string; created_by?: string | null; created_at: string;
}
export interface Membership { workspace_id: string; user_id: string; role: Role; created_at: string; email?: string | null; full_name?: string | null; }
export interface Invite { id: string; workspace_id: string; email: string; role: Role; token: string; accepted_at?: string | null; created_at: string; }
export interface Profile { user_id: string; full_name?: string | null; theme: "system" | "light" | "dark"; notif_prefs: { push: boolean; email: boolean; sms: boolean; weeklyDigest: boolean; dailyDigest: boolean }; last_workspace_id?: string | null; }

export interface Company { id: string; workspace_id: string; name: string; tax_id?: string | null; address?: string | null; email?: string | null; phone?: string | null; notes?: string | null; tags: string[]; invoice_days?: number | null; archived_at?: string | null; created_at: string; updated_at: string; }
export interface Contact { id: string; workspace_id: string; company_id: string; name: string; phone?: string | null; email?: string | null; role?: string | null; is_primary: boolean; created_at: string; }
export interface Vehicle { id: string; workspace_id: string; company_id: string; plate: string; plate_key?: string; make?: string | null; model?: string | null; vu_type?: string | null; notes?: string | null; archived_at?: string | null; created_at: string; updated_at: string; }
export interface Driver { id: string; workspace_id: string; company_id: string; name: string; card_number?: string | null; phone?: string | null; notes?: string | null; archived_at?: string | null; created_at: string; updated_at: string; }
export interface Schedule { id: string; workspace_id: string; type: TaskType; vehicle_id?: string | null; driver_id?: string | null; cycle_days: number; active: boolean; created_at: string; }

export interface Task {
  id: string; workspace_id: string; company_id: string; type: TaskType;
  vehicle_id?: string | null; driver_id?: string | null; schedule_id?: string | null;
  base_date?: string | null; due_at: string; all_day: boolean; remind_at: string[];
  /** Reminders before moving them off locked days (Munkarend); remind_at is derived from it in the database. */
  remind_plan?: string[] | null;
  status: TaskStatus; done_at?: string | null; done_by?: string | null; note?: string | null;
  address?: string | null; contact_name?: string | null; contact_phone?: string | null; participants?: number | null; topic?: string | null;
  invoice_no?: string | null; issue_date?: string | null; net_amount?: number | null; vat_percent?: number | null; gross_amount?: number | null; paid_at?: string | null; attachment_path?: string | null;
  created_by?: string | null; created_at: string; updated_at: string;
}
export interface Notification { id: string; workspace_id: string; task_id?: string | null; user_id?: string | null; channel: "push" | "email" | "sms" | "inapp"; scheduled_at: string; status: string; title: string; body: string; sent_at?: string | null; opened_at?: string | null; created_at: string; }
export interface Activity { id: number; workspace_id: string; user_id?: string | null; entity: string; entity_id?: string | null; action: string; before?: Record<string, unknown> | null; after?: Record<string, unknown> | null; created_at: string; }
export interface SearchHit { kind: "company" | "vehicle" | "driver" | "task"; id: string; title: string; subtitle: string; company_id: string; }

export interface Snapshot {
  workspace: Workspace; role: Role; profile: Profile;
  companies: Company[]; contacts: Contact[]; vehicles: Vehicle[]; drivers: Driver[]; schedules: Schedule[]; tasks: Task[];
  notifications: Notification[]; members: Membership[]; invites: Invite[];
}

export const TASK_META: Record<TaskType, { name: string; short: string; cls: string; cycleKey?: "vuDays" | "cardDays" | "calibrationDays" | "cardExpiryDays"; subject: "vehicle" | "driver" | "none" }> = {
  vu_download: { name: "Fedélzeti egység letöltés", short: "Fedélzeti egység", cls: "t-vu", cycleKey: "vuDays", subject: "vehicle" },
  card_download: { name: "Vezetői kártya letöltés", short: "Vezetői kártya", cls: "t-card", cycleKey: "cardDays", subject: "driver" },
  calibration: { name: "Tachográf kalibráció", short: "Kalibráció", cls: "t-cal", cycleKey: "calibrationDays", subject: "vehicle" },
  card_expiry: { name: "Vezetői kártya lejárat", short: "Kártya lejárat", cls: "t-exp", cycleKey: "cardExpiryDays", subject: "driver" },
  training: { name: "Oktatás", short: "Oktatás", cls: "t-training", subject: "none" },
  invoice: { name: "Számla fizetési határidő", short: "Számla", cls: "t-invoice", subject: "none" },
};
