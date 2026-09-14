import { expect, test } from "bun:test";
import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import { createTestRenderer } from "@opentui/core/testing";
import { type JSX, render } from "@opentui/solid";
import plugin from "../../src/tui.js";

test("keeps three mounted rows and reacts to metadata, clearing, and resizing", async () => {
  const terminal = await createTestRenderer({ width: 80, height: 8 });
  let slot!: () => JSX.Element;
  let routeSessionID = "session";
  const messages = new Map<string, unknown[]>([["session", []]]);
  const parts = new Map<string, unknown[]>();
  const handlers = new Map<string, (event: unknown) => void>();
  const api = {
    route: {
      get current() {
        return { name: "session", params: { sessionID: routeSessionID } };
      },
    },
    state: {
      session: { messages: (sessionID: string) => messages.get(sessionID) ?? [] },
      part: (messageID: string) => parts.get(messageID) ?? [],
    },
    theme: { mode: () => "dark" },
    renderer: terminal.renderer,
    event: { on: (name: string, handler: (event: unknown) => void) => handlers.set(name, handler) },
    slots: {
      register: (input: { slots: { app_bottom: () => JSX.Element } }) => {
        slot = input.slots.app_bottom;
      },
    },
  } as unknown as TuiPluginApi;
  try {
    await plugin.tui(api, undefined, {} as never);
    await render(() => slot(), terminal.renderer);
    await terminal.renderOnce();
    const panel = terminal.renderer.root.getChildren()[0];
    expect(panel?.height).toBe(3);
    expect(terminal.captureCharFrame().trim()).toBe("");
    messages.set("session", [{ id: "assistant", role: "assistant", sessionID: "session" }]);
    parts.set("assistant", [
      {
        metadata: {
          adrouter: {
            version: 1,
            sequence: 1,
            turnId: "turn",
            phase: "routed",
            status: "live",
            ads: [
              {
                id: "fixture",
                tier: "A",
                title: "Visible fixture",
                body: "Display text",
                label: "Sponsored",
              },
            ],
          },
        },
      },
    ]);
    handlers.get("message.part.updated")?.({ properties: { sessionID: "session" } });
    await terminal.renderOnce();
    expect(terminal.captureCharFrame()).toContain("Visible fixture");
    expect(terminal.renderer.root.getChildren()[0]).toBe(panel);
    terminal.renderer.resize(20, 8);
    await terminal.renderOnce();
    expect(panel?.height).toBe(3);
    parts.set("assistant", [{ type: "step-start" }]);
    handlers.get("message.part.updated")?.({ properties: { sessionID: "session" } });
    await terminal.renderOnce();
    expect(terminal.captureCharFrame().trim()).toBe("");
    expect(terminal.renderer.root.getChildren()[0]).toBe(panel);

    parts.set("assistant", []);
    handlers.get("message.part.updated")?.({ properties: { sessionID: "stale-session" } });
    await terminal.renderOnce();
    expect(terminal.captureCharFrame().trim()).toBe("");

    routeSessionID = "other-session";
    messages.set("other-session", []);
    handlers.get("session.updated")?.({ properties: { info: { id: "other-session" } } });
    await terminal.renderOnce();
    expect(terminal.captureCharFrame().trim()).toBe("");
    expect(terminal.renderer.root.getChildren()[0]).toBe(panel);
  } finally {
    terminal.renderer.destroy();
  }
});
