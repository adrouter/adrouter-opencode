import { expect, test } from "bun:test";
import { ndjsonLines } from "../../src/transport/parse.js";

test("abort reaches the consumer without waiting for transport cancellation", async () => {
  const signal = new AbortController();
  const body = new ReadableStream<Uint8Array>({ cancel: () => new Promise<void>(() => {}) });
  const iterator = ndjsonLines(body, signal.signal);
  let outcome: unknown;
  void iterator.next().catch((error) => {
    outcome = error;
  });
  signal.abort(new Error("User stopped"));
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
  expect(outcome).toBeInstanceOf(Error);
  expect(body.locked).toBe(false);
});
