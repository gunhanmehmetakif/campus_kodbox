"use client";

import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DateTimePicker } from "@/components/date-time-picker";
import { EmailLocalInput } from "@/components/email-local-input";
import { FormField } from "@/components/form-field";
import { PasswordInput } from "@/components/password-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MKU_IDENTITY, type LoginKind } from "@/lib/identity";

export function FormDemos() {
  const [kind, setKind] = useState<LoginKind>("student");
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Tabs value={kind} onValueChange={(v) => setKind(v as LoginKind)}>
          <TabsList className="w-full">
            <TabsTrigger value="student">Öğrenci</TabsTrigger>
            <TabsTrigger value="staff">Personel</TabsTrigger>
          </TabsList>
        </Tabs>
        <FormField id="demo-login" label="Okul mailin" description="Tam mail yapıştırmayı dene: ahmet.yilmaz@mku.edu.tr">
          <EmailLocalInput name="login" kind={kind} school={MKU_IDENTITY} onDomainDetected={setKind} placeholder={kind === "student" ? "260000009" : "ad.soyad"} />
        </FormField>
        <FormField id="demo-password" label="Şifre">
          <PasswordInput name="password" />
        </FormField>
        <FormField id="demo-code" label="Ders kodu" error="Ders kodu en az 3 karakter olmalı. Örn. BİL101 yaz.">
          <Input defaultValue="B1" />
        </FormField>
      </div>
      <div className="flex flex-col gap-4">
        <FormField id="demo-due" label="Son teslim" description="İstanbul saatiyle. Forma 2026-10-12T23:59 biçiminde gider.">
          <DateTimePicker name="dueAt" />
        </FormField>
        <FormField id="demo-type" label="Teslim tipi">
          <Select defaultValue="link">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="link">Link teslimi (Google Drive)</SelectItem>
              <SelectItem value="none">Teslim gerektirmeyen</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="demo-body" label="Açıklama" description="Markdown desteklenir.">
          <Textarea placeholder="Ödevin ayrıntılarını yaz…" />
        </FormField>
        <div className="flex items-center gap-2.5">
          <Checkbox id="demo-late" defaultChecked />
          <Label htmlFor="demo-late">Geç teslime izin ver</Label>
        </div>
        <div className="flex items-center gap-2.5">
          <Switch id="demo-score" defaultChecked />
          <Label htmlFor="demo-score">Puanlama açık</Label>
        </div>
      </div>
    </div>
  );
}

export function OverlayDemos() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Diyalog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Öğrenci ekle</DialogTitle>
            <DialogDescription>Numaraları alt alta veya virgülle ayırarak yapıştır.</DialogDescription>
          </DialogHeader>
          <Textarea className="font-mono" placeholder={"260000009\n260000010"} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Vazgeç</Button>
            </DialogClose>
            <Button>Öğrencileri ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive-soft">Onay diyaloğu</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dersi arşivle?</AlertDialogTitle>
            <AlertDialogDescription>Arşivlenen ders salt okunur olur ve öğrenci panelinde “Geçmiş dersler” altında görünür.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction variant="destructive">Dersi arşivle</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Sheet</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Teslim geçmişi</SheetTitle>
            <SheetDescription>Öğrencinin bu ödeve yaptığı tüm teslimler.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Eylemler">
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem>
            <PencilIcon /> Düzenle
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <Trash2Icon /> Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Popover</Button>
        </PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>Geç teslim cezası</PopoverTitle>
            <PopoverDescription>Ham puan 80 · Geç teslim −%10 → Önerilen 72</PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost">Tooltip</Button>
        </TooltipTrigger>
        <TooltipContent>Teslimden sonra dosyayı değiştirme</TooltipContent>
      </Tooltip>

      <Button variant="secondary" onClick={() => toast.success("Ödev yayınlandı")}>
        Toast: başarı
      </Button>
      <Button variant="ghost" onClick={() => toast.error("Bu link Google Drive'a ait değil.")}>
        Toast: hata
      </Button>
    </div>
  );
}

export function TabsDemo() {
  return (
    <Tabs defaultValue="akis">
      <TabsList variant="line">
        <TabsTrigger value="akis">Akış</TabsTrigger>
        <TabsTrigger value="materyaller">Materyaller</TabsTrigger>
        <TabsTrigger value="odevler">Ödevler</TabsTrigger>
      </TabsList>
      <TabsContent value="akis" className="pt-2 text-ink-soft">
        Duyurular burada.
      </TabsContent>
      <TabsContent value="materyaller" className="pt-2 text-ink-soft">
        Materyaller burada.
      </TabsContent>
      <TabsContent value="odevler" className="pt-2 text-ink-soft">
        Ödevler burada.
      </TabsContent>
    </Tabs>
  );
}
