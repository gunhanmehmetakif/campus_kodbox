/** Shared paginated list shape (docs/SOZLESME.md 2.3). Pure module. */
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
