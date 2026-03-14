export const INVALID_TOKEN_ERROR = "Invalid token";

function isAuthFailure(status: number, responseText: string) {
  if (status !== 401 && status !== 403) return false;
  return /invalid token|user not found|no token provided|unauthorized/i.test(
    responseText,
  );
}

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

  if (res.status === 401 || res.status === 403) {
    let responseText = "";
    try {
      responseText = await res.clone().text();
    } catch {
      responseText = "";
    }

    if (isAuthFailure(res.status, responseText)) {
      if (clearTokenImpl) await clearTokenImpl();
      throw new Error(INVALID_TOKEN_ERROR);
    }
  }

  return res;
}
