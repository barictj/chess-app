export type LoadState<T> =
  | { status: "idle" | "loading"; data: T | null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "empty"; data: T; error: null }
  | { status: "error"; data: T | null; error: string };

export function msg(e: any) {
  const s = e?.message ?? String(e);
  try {
    const j = JSON.parse(s);
    return j?.error ?? j?.message ?? s;
  } catch {
    return s;
  }
}
