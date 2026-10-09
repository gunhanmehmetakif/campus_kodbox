"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import {
  FieldError,
  FormError,
  SubmitButton,
  fieldMessages,
  formError,
  useFocusOnError,
} from "@/components/auth/form-parts";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCourseAction, updateCourseAction } from "@/server/courses/actions";
import { COURSE_CODE_MAX, COURSE_DESCRIPTION_MAX, COURSE_NAME_MAX } from "@/server/courses/schemas";
import type { TermOption } from "./types";

type EditableCourse = { id: string; code: string; name: string; description: string | null };

type CourseFormDialogProps = {
  trigger: React.ReactNode;
  /** Required for creation; editing never changes the term. */
  terms?: TermOption[];
  /** Present when editing an existing course. */
  course?: EditableCourse;
};

/** Create (redirects to the roster tab) or edit course dialog. */
export function CourseFormDialog({ trigger, terms = [], course }: CourseFormDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{course ? "Dersi düzenle" : "Yeni ders"}</DialogTitle>
          <DialogDescription>
            {course ? "Dönem sonradan değiştirilemez." : "Dersi oluşturduktan sonra öğrenci listesini ekleyebilirsiniz."}
          </DialogDescription>
        </DialogHeader>
        <CourseForm terms={terms} course={course} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CourseForm({ terms, course, onDone }: { terms: TermOption[]; course?: EditableCourse; onDone: () => void }) {
  const [state, formAction] = useActionState(course ? updateCourseAction : createCourseAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusOnError(formRef, state);
  const ids = { code: useId(), name: useId(), term: useId(), description: useId() };
  const noTerms = !course && terms.length === 0;

  useEffect(() => {
    if (state?.ok) {
      toast.success("Ders güncellendi.", { id: "course-updated" });
      onDone();
    }
  }, [state, onDone]);

  const field = (key: string, id: string) => {
    const errors = fieldMessages(state, key);
    return {
      errors,
      props: {
        id,
        "aria-invalid": errors?.length ? (true as const) : undefined,
        "aria-describedby": errors?.length ? `${id}-error` : undefined,
      },
    };
  };
  const code = field("code", ids.code);
  const name = field("name", ids.name);
  const term = field("termId", ids.term);
  const description = field("description", ids.description);

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4">
      <FormError message={formError(state)} />
      {course ? <input type="hidden" name="id" value={course.id} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor={ids.code}>Ders kodu</Label>
        <Input
          {...code.props}
          name="code"
          defaultValue={course?.code}
          maxLength={COURSE_CODE_MAX + 5}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="Örn. BİL101"
          className="h-11 font-mono uppercase"
          autoFocus
        />
        <FieldError id={`${ids.code}-error`} messages={code.errors} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={ids.name}>Ders adı</Label>
        <Input
          {...name.props}
          name="name"
          defaultValue={course?.name}
          maxLength={COURSE_NAME_MAX}
          autoComplete="off"
          placeholder="Örn. Programlamaya Giriş"
          className="h-11"
        />
        <FieldError id={`${ids.name}-error`} messages={name.errors} />
      </div>
      {course ? null : (
        <div className="space-y-1.5">
          <Label htmlFor={ids.term}>Dönem</Label>
          {noTerms ? (
            <p className="rounded-lg bg-accent px-3 py-2.5 text-sm text-accent-foreground">
              Tanımlı dönem yok. Ders açabilmek için yöneticinin bir dönem tanımlaması gerekir.
            </p>
          ) : (
            <Select name="termId" defaultValue={terms.find((t) => t.isActive)?.id ?? terms[0]?.id}>
              <SelectTrigger {...term.props} className="h-11 w-full">
                <SelectValue placeholder="Dönem seçin" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.isActive ? " (aktif)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <FieldError id={`${ids.term}-error`} messages={term.errors} />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={ids.description}>
          Açıklama <span className="font-normal text-muted-foreground">(isteğe bağlı)</span>
        </Label>
        <Textarea
          {...description.props}
          name="description"
          defaultValue={course?.description ?? ""}
          maxLength={COURSE_DESCRIPTION_MAX}
          rows={3}
          className="max-h-40 min-h-20"
        />
        <FieldError id={`${ids.description}-error`} messages={description.errors} />
      </div>
      <SubmitButton pendingLabel={course ? "Kaydediliyor…" : "Oluşturuluyor…"} disabled={noTerms}>
        {course ? "Kaydet" : "Dersi oluştur"}
      </SubmitButton>
    </form>
  );
}
