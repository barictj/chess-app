export const INVALID_TOKEN_ERROR = "Invalid token";

type AuthedFetchDeps = {
  fetchImpl?: typeof fetch;
  clearTokenImpl?: () => Promise<void> | void;
};

export async function authedFetch(
  token: string,
  input: string,
  init: RequestInit = {},
  deps: AuthedFetchDeps = {},
) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const clearTokenImpl = deps.clearTokenImpl;

  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetchImpl(input, {
    ...init,
    headers,
  });

  if (res.status === 401) {
    let responseText = "";
    try {
      responseText = await res.clone().text();
    } catch {
      responseText = "";
    }

    if (/invalid token/i.test(responseText)) {
      if (clearTokenImpl) await clearTokenImpl();
      throw new Error(INVALID_TOKEN_ERROR);
    }
  }

  return res;
}
