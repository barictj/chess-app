import test from "node:test";
import assert from "node:assert/strict";

import { authedFetch, INVALID_TOKEN_ERROR } from "../lib/authedFetch";

test("authedFetch clears token and throws on invalid token response", async () => {
  let cleared = false;

  await assert.rejects(
    authedFetch(
      "abc",
      "https://example.com/api",
      {},
      {
        fetchImpl: async (_input, init) => {
          const headers = new Headers(init?.headers);
          assert.equal(headers.get("Authorization"), "Bearer abc");
          return new Response("invalid token", { status: 401 });
        },
        clearTokenImpl: async () => {
          cleared = true;
        },
      },
    ),
    new Error(INVALID_TOKEN_ERROR),
  );

  assert.equal(cleared, true);
});

test("authedFetch does not clear token for non-invalid 401", async () => {
  let cleared = false;

  const response = await authedFetch(
    "abc",
    "https://example.com/api",
    {},
    {
      fetchImpl: async () => new Response("Unauthorized", { status: 401 }),
      clearTokenImpl: async () => {
        cleared = true;
      },
    },
  );

  assert.equal(response.status, 401);
  assert.equal(cleared, false);
});
