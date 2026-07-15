import { Input } from "@/components/SearchBox";
import { copy } from "@/lib/copy";

const f = copy.meetings.form;

export type MeetingDefaults = {
  session?: number;
  academicYear?: string;
  name?: string;
  kind?: string;
  meetingAt?: string; // datetime-local 值
  location?: string | null;
  meetingUrl?: string | null;
  docNumber?: string | null;
  proposalDeadline?: string | null; // datetime-local 值
  notes?: string | null;
};

const labelCls = "font-sans text-caption font-medium text-ink";
const fieldCls = "flex flex-col gap-1.5";

/** 會議建立/編輯共用欄位。放進呼叫端的 <form action=…>。 */
export function MeetingFields({ d = {} }: { d?: MeetingDefaults }) {
  return (
    <div className="grid gap-4 hero:grid-cols-2">
      <div className={fieldCls}>
        <label htmlFor="mf-session" className={labelCls}>
          {f.session}
        </label>
        <Input id="mf-session" name="session" type="number" required defaultValue={d.session ?? 21} />
      </div>
      <div className={fieldCls}>
        <label htmlFor="mf-ay" className={labelCls}>
          {f.academicYear}
        </label>
        <Input
          id="mf-ay"
          name="academicYear"
          required
          defaultValue={d.academicYear ?? ""}
          placeholder={f.academicYearPlaceholder}
        />
      </div>
      <div className={`${fieldCls} hero:col-span-2`}>
        <label htmlFor="mf-name" className={labelCls}>
          {f.name}
        </label>
        <Input
          id="mf-name"
          name="name"
          required
          defaultValue={d.name ?? ""}
          placeholder={f.namePlaceholder}
        />
      </div>
      <div className={fieldCls}>
        <label htmlFor="mf-kind" className={labelCls}>
          {f.kind}
        </label>
        <select
          id="mf-kind"
          name="kind"
          defaultValue={d.kind ?? "REGULAR"}
          className="w-full rounded-sm border border-line bg-paper px-3.5 py-2.5 font-sans text-body text-ink focus:border-accent"
        >
          <option value="REGULAR">{copy.meetings.kind.REGULAR}</option>
          <option value="SPECIAL">{copy.meetings.kind.SPECIAL}</option>
          <option value="COMMITTEE">{copy.meetings.kind.COMMITTEE}</option>
        </select>
      </div>
      <div className={fieldCls}>
        <label htmlFor="mf-at" className={labelCls}>
          {f.meetingAt}
        </label>
        <Input
          id="mf-at"
          name="meetingAt"
          type="datetime-local"
          required
          defaultValue={d.meetingAt ?? ""}
        />
      </div>
      <div className={fieldCls}>
        <label htmlFor="mf-loc" className={labelCls}>
          {f.location}
        </label>
        <Input
          id="mf-loc"
          name="location"
          defaultValue={d.location ?? ""}
          placeholder={f.locationPlaceholder}
        />
      </div>
      <div className={fieldCls}>
        <label htmlFor="mf-url" className={labelCls}>
          {f.meetingUrl}
        </label>
        <Input
          id="mf-url"
          name="meetingUrl"
          defaultValue={d.meetingUrl ?? ""}
          placeholder={f.meetingUrlPlaceholder}
        />
      </div>
      <div className={fieldCls}>
        <label htmlFor="mf-doc" className={labelCls}>
          {f.docNumber}
        </label>
        <Input
          id="mf-doc"
          name="docNumber"
          defaultValue={d.docNumber ?? ""}
          placeholder={f.docNumberPlaceholder}
        />
      </div>
      <div className={fieldCls}>
        <label htmlFor="mf-dl" className={labelCls}>
          {f.proposalDeadline}
        </label>
        <Input
          id="mf-dl"
          name="proposalDeadline"
          type="datetime-local"
          defaultValue={d.proposalDeadline ?? ""}
        />
      </div>
      <div className={`${fieldCls} hero:col-span-2`}>
        <label htmlFor="mf-notes" className={labelCls}>
          {f.notes}
        </label>
        <textarea
          id="mf-notes"
          name="notes"
          rows={3}
          defaultValue={d.notes ?? ""}
          placeholder={f.notesPlaceholder}
          className="w-full rounded-sm border border-line bg-paper px-3.5 py-2.5 font-sans text-body text-ink placeholder:text-meta focus:border-accent"
        />
      </div>
    </div>
  );
}
