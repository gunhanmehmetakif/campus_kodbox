"use client";

import { ClipboardList, FileText, Megaphone, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Single "+ Paylaş" entry point for announcements, materials and assignments. */
export function ShareMenu({ courseId }: { courseId: string }) {
  const base = `/egitmen/dersler/${courseId}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" className="h-11">
          <Plus aria-hidden="true" />
          Paylaş
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem asChild className="min-h-11">
          <Link href={`${base}/paylasim/yeni?tur=duyuru`}>
            <Megaphone aria-hidden="true" />
            Duyuru
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-11">
          <Link href={`${base}/paylasim/yeni?tur=materyal`}>
            <FileText aria-hidden="true" />
            Materyal
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-11">
          <Link href={`${base}/odev/yeni`}>
            <ClipboardList aria-hidden="true" />
            Ödev
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
