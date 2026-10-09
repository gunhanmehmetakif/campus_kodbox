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
import { savePostAction } from "@/server/courses/actions";
import { POST_BODY_MAX, POST_LINKS_MAX, POST_TITLE_MAX } from "@/server/courses/schemas";
import { courseHref } from "./utils";

type PostType = "announcement" | "material";

export type EditablePost = {
  id: string;
  title: string;
  bodyMd: string;
  links: { title: string; url: string }[];
  status: "draft" | "published";
};

type PostEditorProps = {
  courseId: string;
  type: PostType;
  post?: EditablePost;
};

type LinkRow = { key: number; title: string; url: string };

const LABELS = {
  announcement: { noun: "duyuru", tab: "akis", titlePlaceholder: "Örn. Vize tarihi değişti" },
  material: { noun: "materyal", tab: "materyaller", titlePlaceholder: "Örn. 3. hafta ders notları" },
} as const;

/** Create/edit form for announcements and materials. Warns before losing unsaved changes. */
export function PostEditor({ courseId, type, post }: PostEditorProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(savePostAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusOnError(formRef, state);
  const ids = { title: useId(), body: useId() };
  const nextKey = useRef(post?.links.length ?? 0);
  const intentRef = useRef<"draft" | "publish">("publish");
  const labels = LABELS[type];
  const published = post?.status === "published";

  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.bodyMd ?? "");
  const [links, setLinks] = useState<LinkRow[]>(() => (post?.links ?? []).map((l, key) => ({ key, ...l })));
  // The action state at the time of the last edit: unsaved while it still matches the current
  // state (or the last save failed). A newer successful result marks the form clean.
  const [editedAt, setEditedAt] = useState<FormState | undefined>(undefined);
  const dirty = editedAt !== undefined && (editedAt === state || (state !== null && !state.ok));
  const markEdited = () => setEditedAt(state);

  const submittedLinks = links.filter((l) => l.title.trim() || l.url.trim()).map(({ title, url }) => ({ title, url }));

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!state?.ok) return;
    const listHref = courseHref(courseId, labels.tab);
    if (intentRef.current === "draft" && !post) {
      toast.success("Taslak kaydedildi.", { id: "post-saved" });
      router.replace(`/egitmen/dersler/${courseId}/paylasim/${state.data.id}`);
    } else if (intentRef.current === "draft") {
      toast.success("Taslak kaydedildi.", { id: "post-saved" });
    } else {
      toast.success(published ? "Değişiklikler kaydedildi." : `${capitalize(labels.noun)} yayınlandı.`, {
        id: "post-saved",
      });
      router.push(listHref);
    }
  }, [state, courseId, labels, post, published, router]);

  const titleErrors = fieldMessages(state, "title");
  const bodyErrors = fieldMessages(state, "bodyMd");
  const linksError = fieldMessages(state, "links");

  function updateLink(key: number, patch: Partial<Pick<LinkRow, "title" | "url">>) {
    markEdited();
    setLinks((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function leave(event: React.MouseEvent) {
    if (dirty && !window.confirm("Kaydedilmemiş değişiklikler var. Sayfadan ayrılmak istiyor musunuz?")) {
      event.preventDefault();
    }
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-5">
      <FormError message={formError(state)} />
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="type" value={type} />
      {post ? <input type="hidden" name="id" value={post.id} /> : null}
      <input type="hidden" name="bodyMd" value={body} />
      <input type="hidden" name="links" value={JSON.stringify(submittedLinks)} />

      <div className="space-y-1.5">
        <Label htmlFor={ids.title}>Başlık</Label>
        <Input
          id={ids.title}
          name="title"
          value={title}
          onChange={(e) => {
            markEdited();
            setTitle(e.target.value);
          }}
          maxLength={POST_TITLE_MAX}
          autoComplete="off"
          placeholder={labels.titlePlaceholder}
          aria-invalid={titleErrors?.length ? true : undefined}
          aria-describedby={titleErrors?.length ? `${ids.title}-error` : undefined}
          className="h-11"
          autoFocus={!post}
        />
        <FieldError id={`${ids.title}-error`} messages={titleErrors} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.body}>Metin</Label>
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
              value={body}
              onChange={(e) => {
                markEdited();
                setBody(e.target.value);
              }}
              maxLength={POST_BODY_MAX}
              placeholder="Markdown kullanabilirsiniz: **kalın**, listeler, [link](https://…)"
              aria-invalid={bodyErrors?.length ? true : undefined}
              aria-describedby={bodyErrors?.length ? `${ids.body}-error` : undefined}
              className="max-h-[60dvh] min-h-56"
            />
            <FieldError id={`${ids.body}-error`} messages={bodyErrors} />
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-56 rounded-lg border bg-card p-4">
              {body.trim() ? (
                <Markdown>{body}</Markdown>
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
        {links.length > 0 ? (
          <ul className="space-y-3">
            {links.map((row) => {
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
                    onClick={() => {
                      markEdited();
                      setLinks((rows) => rows.filter((r) => r.key !== row.key));
                    }}
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
          disabled={links.length >= POST_LINKS_MAX}
          onClick={() => {
            markEdited();
            setLinks((rows) => [...rows, { key: nextKey.current++, title: "", url: "" }]);
          }}
        >
          <Plus aria-hidden="true" />
          Link ekle
        </Button>
      </fieldset>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-end">
        <Button asChild variant="ghost" className="h-11">
          <Link href={courseHref(courseId, labels.tab)} onClick={leave}>
            Vazgeç
          </Link>
        </Button>
        {published ? (
          <IntentButton intent="publish" intentRef={intentRef} primary>
            Güncelle
          </IntentButton>
        ) : (
          <>
            <IntentButton intent="draft" intentRef={intentRef}>Taslak kaydet</IntentButton>
            <IntentButton intent="publish" intentRef={intentRef} primary>
              Yayınla
            </IntentButton>
          </>
        )}
      </div>
    </form>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("tr-TR") + value.slice(1);
}

/** Submit button carrying the `intent` value; all of them disable while the form is pending. */
type IntentButtonProps = {
  intent: "draft" | "publish";
  intentRef: React.RefObject<"draft" | "publish">;
  primary?: boolean;
  children: React.ReactNode;
};

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
