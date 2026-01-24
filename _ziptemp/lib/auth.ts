import { jwtDecode } from "jwt-decode";

export function getUserIdFromToken(token: string): string | null {
  try {
    const decoded: any = jwtDecode(token);
    return decoded?.sub ? String(decoded.sub) : null;
  } catch {
    return null;
  }
}
