export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export type ParamBag = Record<string, string | string[] | undefined>;

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function pageParam(params: ParamBag): number {
  return Math.max(1, Number.parseInt(firstParam(params.sayfa) ?? "1", 10) || 1);
}

export function statusParam(params: ParamBag): "active" | "disabled" | undefined {
  const v = firstParam(params.durum);
  return v === "active" || v === "disabled" ? v : undefined;
}
