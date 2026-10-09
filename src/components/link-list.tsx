import {
  ExternalLinkIcon,
  FileTextIcon,
  FolderGit2Icon,
  FolderOpenIcon,
  HardDriveIcon,
  Link2Icon,
  ListChecksIcon,
  PresentationIcon,
  SheetIcon,
  SquarePlayIcon,
  type LucideIcon,
} from "lucide-react";

import type { LinkItem } from "@/db/schema";
import { LINK_KIND_LABEL, detectLinkKind, displayHost, type LinkKind } from "@/lib/links";
import { cn } from "@/lib/utils";

/**
 * Materyal / ödev kaynak linkleri. Domaine göre ikon (Drive, Dokümanlar, YouTube, genel).
 * Platform dosya barındırmaz; her şey yeni sekmede açılan linktir.
 *
 *   <LinkList links={post.links} />
 */

const ICONS: Record<LinkKind, LucideIcon> = {
  "drive-file": HardDriveIcon,
  "drive-folder": FolderOpenIcon,
  docs: FileTextIcon,
  sheets: SheetIcon,
  slides: PresentationIcon,
  forms: ListChecksIcon,
  youtube: SquarePlayIcon,
  github: FolderGit2Icon,
  generic: Link2Icon,
};

const ICON_TONE: Partial<Record<LinkKind, string>> = {
  "drive-file": "bg-laurel-tint text-laurel",
  "drive-folder": "bg-laurel-tint text-laurel",
  docs: "bg-sky-tint text-sky",
  sheets: "bg-laurel-tint text-laurel",
  slides: "bg-saffron-tint text-saffron-ink",
  forms: "bg-sky-tint text-sky",
  youtube: "bg-brick-tint text-brick",
};

export function LinkList({ links, className }: { links: readonly LinkItem[]; className?: string }) {
  if (links.length === 0) return null;
  return (
    <ul className={cn("flex flex-col gap-2", className)} aria-label="Bağlantılar">
      {links.map((link, i) => {
        const kind = detectLinkKind(link.url);
        const Icon = ICONS[kind];
        const title = link.title.trim() || displayHost(link.url);
        return (
          <li key={`${link.url}-${i}`}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="group/link flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 transition-colors hover:border-line-strong hover:bg-paper"
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md",
                  ICON_TONE[kind] ?? "bg-paper text-ink-soft",
                )}
              >
                <Icon className="size-4" strokeWidth={1.9} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-ink group-hover/link:text-laurel">{title}</span>
                <span className="truncate text-xs text-ink-soft">
                  {LINK_KIND_LABEL[kind]}
                  {kind === "generic" ? ` · ${displayHost(link.url)}` : null}
                </span>
              </span>
              <ExternalLinkIcon aria-hidden className="size-4 shrink-0 text-ink-soft group-hover/link:text-laurel" />
              <span className="sr-only">(yeni sekmede açılır)</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
