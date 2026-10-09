import type { ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * Güvenli Markdown gösterimi (duyuru, materyal, ödev açıklaması).
 *
 * - GFM: tablo, görev listesi, üstü çizili, otomatik link.
 * - Ham HTML İŞLENMEZ (react-markdown varsayılanı) + rehype-sanitize (GitHub şeması) ile
 *   ek güvenlik katmanı. `javascript:` vb. protokoller temizlenir.
 * - Dış linkler yeni sekmede, `rel="noopener noreferrer nofollow ugc"` ile açılır.
 * - Sunucu bileşenidir; istemciye JS göndermez.
 *
 *   <Markdown>{post.bodyMd}</Markdown>
 */

/** GitHub şeması + link/görsel protokolleri sadece http(s)/mailto ile sınırlı. */
const schema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
  },
};

function isExternal(href: string | undefined): boolean {
  return Boolean(href && /^https?:\/\//i.test(href));
}

const components: Components = {
  a: ({ href, children, node: _node, ...props }) => {
    void _node;
    const external = isExternal(href);
    return (
      <a
        href={href}
        {...props}
        {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" } : {})}
        className="font-medium text-laurel underline decoration-laurel/35 underline-offset-[3px] transition-colors hover:decoration-laurel"
      >
        {children}
        {external ? <span className="sr-only"> (yeni sekmede açılır)</span> : null}
      </a>
    );
  },
  img: ({ src, alt, node: _node, ...props }) => {
    void _node;
    // Platform dosya barındırmaz; dış görseller link olarak gösterilir (izleme/sızıntıyı önler).
    return (
      <a
        href={typeof src === "string" ? src : undefined}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className="text-laurel underline underline-offset-[3px]"
        {...(props as ComponentProps<"a">)}
      >
        {alt || "Görseli aç"}
      </a>
    );
  },
  table: ({ node: _node, ...props }) => {
    void _node;
    return (
      <div className="my-4 overflow-x-auto rounded-lg border border-line">
        <table {...props} className="w-full border-collapse text-sm" />
      </div>
    );
  },
};

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-[72ch] text-sm leading-[1.65] text-ink break-words",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_p]:my-3",
        "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-lg [&_h1]:font-bold",
        "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-bold",
        "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold",
        "[&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:text-sm [&_h4]:font-semibold",
        "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_li]:pl-0.5",
        "[&_li>ul]:my-1 [&_li>ol]:my-1 [&_.contains-task-list]:list-none [&_.contains-task-list]:pl-1",
        "[&_.task-list-item_input]:mr-2 [&_.task-list-item_input]:translate-y-px [&_.task-list-item_input]:accent-laurel",
        "[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-line-strong [&_blockquote]:pl-4 [&_blockquote]:text-ink-soft",
        "[&_code]:rounded [&_code]:bg-paper [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
        "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-line [&_pre]:bg-paper [&_pre]:p-4 [&_pre]:text-label",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_hr]:my-6 [&_hr]:border-line",
        "[&_th]:border-b [&_th]:border-line [&_th]:bg-paper [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-label [&_th]:font-medium [&_th]:text-ink-soft",
        "[&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_tr:last-child_td]:border-b-0",
        "[&_strong]:font-semibold [&_del]:text-ink-soft",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeSanitize, schema]]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
