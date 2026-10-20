/* One-tap Google Calendar export: a single task as a prefilled event, or the whole workspace as a live subscription (ICS feed). */
import type { Snapshot, Task } from "./types";
import { TASK_META } from "./types";
import { addDays, dateOf } from "./date";
import { taskSubjectParts } from "./repo";

const ymd = (iso: string) => iso.replace(/-/g, "");
const utc = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** calendar.google.com link that opens a new, prefilled event for the task (the user only taps Save). */
export function gcalEventUrl(s: Snapshot, t: Task): string {
  const parts = taskSubjectParts(s, t); const company = s.companies.find(c => c.id === t.company_id);
  const dates = t.all_day ? `${ymd(dateOf(t.due_at))}/${ymd(addDays(dateOf(t.due_at), 1))}` : `${utc(new Date(t.due_at).getTime())}/${utc(new Date(t.due_at).getTime() + 3600_000)}`;
  const details = [...parts, t.note ? `Megjegyzés: ${t.note}` : ""].filter(Boolean).join("\n") + "\n\nBenAde – tachográf emlékeztető";
  const q = new URLSearchParams({ action: "TEMPLATE", text: `${TASK_META[t.type].name} – ${parts.slice(1).join(", ") || parts[0]}`, dates, details, location: (t.type === "training" ? t.address : company?.address) || "", ctz: "Europe/Budapest" });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Subscribes Google Calendar to the workspace's live ICS feed: every deadline, kept up to date by Google. */
export function gcalSubscribeUrl(icsToken: string): string {
  const feed = `${location.origin}/api/ics/${icsToken}`.replace(/^https?:/, "webcal:");
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(feed)}`;
}
