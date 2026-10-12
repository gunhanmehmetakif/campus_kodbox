"use client";

import { Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { FieldError, FormError, fieldMessages, formError, useFocusOnError, type FormState } from "@/components/auth/form-parts";
import { Markdown } from "@/components/common/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { saveAssignmentAction } from "@/server/assignments/actions";
import { toIstanbulLocalInput } from "@/server/assignments/rules";
import { assignmentHref, daysFromNow, formatScore } from "./format";

const TITLE_MAX = 200;
const BODY_MAX = 20000;
const LINKS_MAX = 10;
const MAX_SCORE_LIMIT = 1000;

export type EditableAssignment = {
  id: string;
  title: string;
  bodyMd: string;
  links: { title: string; url: string }[];
  status: "draft" | "published";
  submissionType: "link" | "none";
  allowAnyLink: boolean;
  dueAt: Date | null;
  lateAllowed: boolean;
  lateUntil: Date | null;
  latePenaltyType: "none" | "points" | "percent";
  latePenaltyValue: number | null;
  maxScore: number | null;
};

type AssignmentEditorProps = {
  courseId: string;
  assignment?: EditableAssignment;
  /** `YYYY-MM-DDTHH:mm` (Istanbul) pre-filled for new assignments; computed on the server. */
  defaultDue?: string;
};

type LinkRow = { key: number; title: string; url: string };
type PenaltyType = "none" | "points" | "percent";

type Values = {
  title: string;
  bodyMd: string;
  links: LinkRow[];
  submissionType: "link" | "none";
  allowAnyLink: boolean;
  dueMode: "none" | "date";
  dueAt: string;
  lateAllowed: boolean;
  lateUntil: string;
  penaltyType: PenaltyType;
  penaltyValue: string;
  grading: boolean;
  maxScore: string;
};

function initialValues(assignment: EditableAssignment | undefined, defaultDue: string): Values {
  if (!assignment) {
    return {
      title: "",
      bodyMd: "",
      links: [],
      submissionType: "link",
      allowAnyLink: false,
      dueMode: defaultDue ? "date" : "none",
      dueAt: defaultDue,
      lateAllowed: false,
      lateUntil: "",
      penaltyType: "none",
      penaltyValue: "",
      grading: true,
      maxScore: "100",
    };
  }
  return {
    title: assignment.title,
    bodyMd: assignment.bodyMd,
    links: assignment.links.map((l, key) => ({ key, ...l })),
    submissionType: assignment.submissionType,
    allowAnyLink: assignment.allowAnyLink,
    dueMode: assignment.dueAt ? "date" : "none",
    dueAt: assignment.dueAt ? toIstanbulLocalInput(assignment.dueAt) : "",
    lateAllowed: assignment.lateAllowed,
    lateUntil: assignment.lateUntil ? toIstanbulLocalInput(assignment.lateUntil) : "",
    penaltyType: assignment.latePenaltyType,
    penaltyValue: assignment.latePenaltyValue === null ? "" : formatScore(assignment.latePenaltyValue),
    grading: assignment.maxScore !== null,
    maxScore: assignment.maxScore === null ? "100" : formatScore(assignment.maxScore),
  };
}

/** Create/edit form for assignments. Few clicks to a publishable assignment; warns before losing edits. */
export function AssignmentEditor({ courseId, assignment, defaultDue = "" }: AssignmentEditorProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveAssignmentAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusOnError(formRef, state);
  const ids = { title: useId(), body: useId(), due: useId(), lateUntil: useId(), penalty: useId(), max: useId() };
  const published = assignment?.status === "published";
  const intentRef = useRef<"draft" | "publish">("publish");
  const nextKey = useRef(assignment?.links.length ?? 0);

  const [initial] = useState(() => initialValues(assignment, defaultDue));
  const [v, setV] = useState<Values>(initial);
  const [editedAt, setEditedAt] = useState<FormState | undefined>(undefined);
  const dirty = editedAt !== undefined && (editedAt === state || (state !== null && !state.ok));

  function update(patch: Partial<Values>) {
    setEditedAt(state);
    setV((prev) => ({ ...prev, ...patch }));
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!state?.ok) return;
    const { id } = state.data;
    if (intentRef.current === "draft") {
      toast.success("Taslak kaydedildi.", { id: "assignment-saved" });
      if (!assignment) router.replace(`/egitmen/odevler/${id}/duzenle`);
    } else {
      toast.success(published ? "Değişiklikler kaydedildi." : "Ödev yayınlandı.", { id: "assignment-saved" });
      router.push(assignmentHref(id));
    }
  }, [state, assignment, published, router]);

  const isLink = v.submissionType === "link";
  const hasDue = v.dueMode === "date" && v.dueAt !== "";
  const lateSection = isLink && hasDue;
  const lateOn = lateSection && v.lateAllowed;
  const datesChanged =
    published &&
    (v.dueAt !== initial.dueAt ||
      v.dueMode !== initial.dueMode ||
      lateOn !== (initial.lateAllowed && initial.dueMode === "date" && initial.submissionType === "link") ||
      (lateOn && v.lateUntil !== initial.lateUntil));

  const submittedLinks = v.links.filter((l) => l.title.trim() || l.url.trim()).map(({ title, url }) => ({ title, url }));
  const titleErrors = fieldMessages(state, "title");
  const bodyErrors = fieldMessages(state, "bodyMd");
  const linksError = fieldMessages(state, "links");
  const dueErrors = fieldMessages(state, "dueAt");
  const lateUntilErrors = fieldMessages(state, "lateUntil");
  const penaltyErrors = fieldMessages(state, "latePenaltyValue");
  const maxErrors = fieldMessages(state, "maxScore");

  function updateLink(key: number, patch: Partial<Pick<LinkRow, "title" | "url">>) {
    update({ links: v.links.map((row) => (row.key === key ? { ...row, ...patch } : row)) });
  }

  function leave(event: React.MouseEvent) {
    if (dirty && !window.confirm("Kaydedilmemiş değişiklikler var. Sayfadan ayrılmak istiyor musunuz?")) {
      event.preventDefault();
    }
  }

  const backHref = assignment ? assignmentHref(assignment.id) : `/egitmen/dersler/${courseId}?filtre=odev`;

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-5">
      <FormError message={formError(state)} />
      <input type="hidden" name="courseId" value={courseId} />
      {assignment ? <input type="hidden" name="id" value={assignment.id} /> : null}
      <input type="hidden" name="bodyMd" value={v.bodyMd} />
      <input type="hidden" name="links" value={JSON.stringify(submittedLinks)} />
      <input type="hidden" name="submissionType" value={v.submissionType} />
      {isLink && v.allowAnyLink ? <input type="hidden" name="allowAnyLink" value="on" /> : null}
      {hasDue ? <input type="hidden" name="dueAt" value={v.dueAt} /> : null}
      {lateOn ? <input type="hidden" name="lateAllowed" value="on" /> : null}
      {lateOn && v.lateUntil ? <input type="hidden" name="lateUntil" value={v.lateUntil} /> : null}
      <input type="hidden" name="latePenaltyType" value={lateOn ? v.penaltyType : "none"} />
      {lateOn && v.penaltyType !== "none" ? (
        <input type="hidden" name="latePenaltyValue" value={v.penaltyValue.replace(",", ".")} />
      ) : null}
      {v.grading ? <input type="hidden" name="grading" value="on" /> : null}
      {v.grading ? <input type="hidden" name="maxScore" value={v.maxScore.replace(",", ".")} /> : null}

      <Section title="Temel">
        <div className="space-y-1.5">
          <Label htmlFor={ids.title}>Başlık</Label>
          <Input
            id={ids.title}
            name="title"
            value={v.title}
            onChange={(e) => update({ title: e.target.value })}
            maxLength={TITLE_MAX}
            autoComplete="off"
            placeholder="Örn. 2. hafta laboratuvar ödevi"
            aria-invalid={titleErrors?.length ? true : undefined}
            aria-describedby={titleErrors?.length ? `${ids.title}-error` : undefined}
            className="h-11"
            autoFocus={!assignment}
          />
          <FieldError id={`${ids.title}-error`} messages={titleErrors} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={ids.body}>Açıklama</Label>
          <Tabs defaultValue="write" className="gap-3">
            <TabsList className="h-11! w-full sm:w-fit">
              <TabsTrigger value="write" className="min-w-28">
                Yaz
              </TabsTrigger>
              <TabsTrigger value="preview" className="min-w-28">
                Önizle
              </TabsTrigger>
            </TabsList>
            <TabsContent value="write" className="space-y-1.5">
              <Textarea
                id={ids.body}
                value={v.bodyMd}
                onChange={(e) => update({ bodyMd: e.target.value })}
                maxLength={BODY_MAX}
                placeholder="Markdown kullanabilirsiniz: **kalın**, listeler, [link](https://…)"
                aria-invalid={bodyErrors?.length ? true : undefined}
                aria-describedby={bodyErrors?.length ? `${ids.body}-error` : undefined}
                className="max-h-[60dvh] min-h-44"
              />
              <FieldError id={`${ids.body}-error`} messages={bodyErrors} />
            </TabsContent>
            <TabsContent value="preview">
              <div className="min-h-44 rounded-lg border bg-card p-4">
                {v.bodyMd.trim() ? (
                  <Markdown>{v.bodyMd}</Markdown>
                ) : (
                  <p className="text-sm text-muted-foreground">Önizlenecek bir metin yok.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-1.5 text-sm font-medium">
            Linkler <span className="font-normal text-muted-foreground">(isteğe bağlı)</span>
          </legend>
          {v.links.length > 0 ? (
            <ul className="space-y-3">
              {v.links.map((row) => {
                const position = submittedLinks.findIndex((l) => l.title === row.title && l.url === row.url);
                const titleError = position >= 0 ? fieldMessages(state, `links.${position}.title`) : undefined;
                const urlError = position >= 0 ? fieldMessages(state, `links.${position}.url`) : undefined;
                return (
                  <li key={row.key} className="flex items-start gap-2">
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_1.5fr]">
                      <div className="space-y-1">
                        <Input
                          value={row.title}
                          onChange={(e) => updateLink(row.key, { title: e.target.value })}
                          aria-label="Link başlığı"
                          placeholder="Başlık"
                          autoComplete="off"
                          aria-invalid={titleError?.length ? true : undefined}
                          className="h-11"
                        />
                        <FieldError id={`link-${row.key}-title-error`} messages={titleError} />
                      </div>
                      <div className="space-y-1">
                        <Input
                          value={row.url}
                          onChange={(e) => updateLink(row.key, { url: e.target.value })}
                          aria-label="Link adresi"
                          placeholder="https://"
                          type="url"
                          inputMode="url"
                          autoComplete="off"
                          aria-invalid={urlError?.length ? true : undefined}
                          className="h-11"
                        />
                        <FieldError id={`link-${row.key}-url-error`} messages={urlError} />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Linki kaldır"
                      onClick={() => update({ links: v.links.filter((r) => r.key !== row.key) })}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <FieldError id="links-error" messages={linksError} />
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={v.links.length >= LINKS_MAX}
            onClick={() => update({ links: [...v.links, { key: nextKey.current++, title: "", url: "" }] })}
          >
            <Plus aria-hidden="true" />
            Link ekle
          </Button>
        </fieldset>
      </Section>

      <Section title="Teslim">
        <Segmented
          label="Teslim şekli"
          value={v.submissionType}
          onChange={(submissionType) => update({ submissionType })}
          options={[
            { value: "link", label: "Link ile teslim" },
            { value: "none", label: "Teslim gerekmiyor" },
          ]}
        />
        {isLink ? (
          <Toggle
            label="Her linki kabul et"
            description="Kapalıyken yalnız Google Drive ve Docs bağlantıları kabul edilir."
            checked={v.allowAnyLink}
            onChange={(allowAnyLink) => update({ allowAnyLink })}
          />
        ) : null}
      </Section>

      <Section title="Süre">
        <Segmented
          label="Son teslim"
          value={v.dueMode}
          onChange={(dueMode) => update({ dueMode, ...(dueMode === "date" && !v.dueAt ? { dueAt: daysFromNow(7) } : {}) })}
          options={[
            { value: "none", label: "Süresiz" },
            { value: "date", label: "Tarih belirle" },
          ]}
        />
        {v.dueMode === "date" ? (
          <div className="space-y-2">
            <Label htmlFor={ids.due}>Son teslim tarihi ve saati</Label>
            <Input
              id={ids.due}
              type="datetime-local"
              value={v.dueAt}
              onChange={(e) => update({ dueAt: e.target.value })}
              aria-invalid={dueErrors?.length ? true : undefined}
              className="h-11 sm:max-w-64"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => update({ dueAt: daysFromNow(7) })}>
                1 hafta sonra 23:59
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => update({ dueAt: daysFromNow(14) })}>
                2 hafta sonra 23:59
              </Button>
            </div>
            <FieldError id={`${ids.due}-error`} messages={dueErrors} />
          </div>
        ) : null}
        {datesChanged ? (
          <p role="status" className="rounded-lg bg-status-pending-bg px-3 py-2 text-sm text-status-pending">
            Öğrencilere tarih değişikliği bildirimi gidecek.
          </p>
        ) : null}
      </Section>

      {lateSection ? (
        <Section title="Geç teslim">
          <Toggle
            label="Süre dolduktan sonra teslime izin ver"
            description="Geç teslimler işaretlenir; isterseniz puan cezası önerilir."
            checked={v.lateAllowed}
            onChange={(lateAllowed) => update({ lateAllowed })}
          />
          {v.lateAllowed ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor={ids.lateUntil}>
                  Son kabul tarihi <span className="font-normal text-muted-foreground">(boşsa sınırsız)</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={ids.lateUntil}
                    type="datetime-local"
                    value={v.lateUntil}
                    onChange={(e) => update({ lateUntil: e.target.value })}
                    aria-invalid={lateUntilErrors?.length ? true : undefined}
                    className="h-11 sm:max-w-64"
                  />
                  {v.lateUntil ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0 text-muted-foreground"
                      aria-label="Son kabul tarihini temizle"
                      onClick={() => update({ lateUntil: "" })}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
                <FieldError id={`${ids.lateUntil}-error`} messages={lateUntilErrors} />
              </div>
              <Segmented
                label="Geç teslim cezası"
                value={v.penaltyType}
                onChange={(penaltyType) => update({ penaltyType })}
                options={[
                  { value: "none", label: "Ceza yok" },
                  { value: "points", label: "Puan düş" },
                  { value: "percent", label: "Yüzde düş" },
                ]}
              />
              {v.penaltyType !== "none" ? (
                <div className="space-y-1.5">
                  <Label htmlFor={ids.penalty}>{v.penaltyType === "percent" ? "Ceza yüzdesi (%)" : "Düşülecek puan"}</Label>
                  <Input
                    id={ids.penalty}
                    value={v.penaltyValue}
                    onChange={(e) => update({ penaltyValue: e.target.value })}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={v.penaltyType === "percent" ? "10" : "5"}
                    aria-invalid={penaltyErrors?.length ? true : undefined}
                    className="h-11 sm:max-w-32"
                  />
                  <FieldError id={`${ids.penalty}-error`} messages={penaltyErrors} />
                </div>
              ) : null}
            </div>
          ) : null}
        </Section>
      ) : null}

      <Section title="Puanlama">
        <Toggle
          label="Bu ödev puanlanacak"
          description="Kapalıyken teslimler yalnız takip edilir."
          checked={v.grading}
          onChange={(grading) => update({ grading })}
        />
        {v.grading ? (
          <div className="space-y-1.5">
            <Label htmlFor={ids.max}>Maksimum puan</Label>
            <Input
              id={ids.max}
              value={v.maxScore}
              onChange={(e) => update({ maxScore: e.target.value })}
              inputMode="decimal"
              autoComplete="off"
              placeholder={`1–${MAX_SCORE_LIMIT}`}
              aria-invalid={maxErrors?.length ? true : undefined}
              className="h-11 sm:max-w-32"
            />
            <FieldError id={`${ids.max}-error`} messages={maxErrors} />
          </div>
        ) : null}
      </Section>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-end">
        <Button asChild variant="ghost" className="h-11">
          <Link href={backHref} onClick={leave}>
            Vazgeç
          </Link>
        </Button>
        {published ? (
          <IntentButton intent="publish" intentRef={intentRef} primary>
            Güncelle
          </IntentButton>
        ) : (
          <>
            <IntentButton intent="draft" intentRef={intentRef}>
              Taslak kaydet
            </IntentButton>
            <IntentButton intent="publish" intentRef={intentRef} primary>
              Yayınla
            </IntentButton>
          </>
        )}
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="font-heading text-base font-medium">{title}</h2>
      {children}
    </section>
  );
}

type SegmentedProps<T extends string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
};

/** Mutually exclusive choice rendered as large buttons. */
function Segmented<T extends string>({ label, value, onChange, options }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-11 items-center rounded-lg border px-4 text-sm transition-colors",
              selected ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-4 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="block text-sm text-muted-foreground">{description}</span> : null}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-input",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 size-5 rounded-full bg-background shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
      </span>
    </button>
  );
}

type IntentButtonProps = {
  intent: "draft" | "publish";
  intentRef: React.RefObject<"draft" | "publish">;
  primary?: boolean;
  children: React.ReactNode;
};

/** Submit button carrying the `intent` value; all of them disable while the form is pending. */
function IntentButton({ intent, intentRef, primary, children }: IntentButtonProps) {
  const { pending, data } = useFormStatus();
  const active = pending && data?.get("intent") === intent;
  return (
    <Button
      type="submit"
      name="intent"
      value={intent}
      onClick={() => {
        intentRef.current = intent;
      }}
      variant={primary ? "default" : "outline"}
      disabled={pending}
      className="h-11 sm:min-w-32"
    >
      {active ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {active ? "Kaydediliyor…" : children}
    </Button>
  );
}
