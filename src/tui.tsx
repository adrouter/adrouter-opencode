/** @jsxImportSource @opentui/solid */

import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui";
import type { Message } from "@opencode-ai/sdk/v2";
import type { JSX } from "@opentui/solid";
import { createMemo, createSignal, onCleanup } from "solid-js";
import { ADROUTER_PALETTE, AdRouterPanelState, renderAdFooterLines } from "./presentation.js";

const tui: TuiPlugin = async (api) => {
  const state = new AdRouterPanelState();
  const [revision, setRevision] = createSignal(0);

  function routeSession(): string | undefined {
    const current = api.route.current;
    if (current.name !== "session" || !current.params) return undefined;
    return typeof current.params.sessionID === "string" ? current.params.sessionID : undefined;
  }

  function orderedMessages(sessionID: string | undefined) {
    if (!sessionID) return [];
    return api.state.session.messages(sessionID).map((message: Message) => ({
      id: message.id,
      role: message.role,
      failed: message.role === "assistant" && Boolean(message.error),
      parts: api.state.part(message.id),
    }));
  }

  function refreshSession(): string | undefined {
    const sessionID = routeSession();
    state.reconstruct(sessionID, orderedMessages(sessionID));
    return sessionID;
  }

  function changed(): void {
    setRevision((value) => value + 1);
  }

  api.event.on("message.part.updated", (event) => {
    const sessionID = refreshSession();
    if (sessionID === event.properties.sessionID) changed();
  });

  api.event.on("message.updated", (event) => {
    const sessionID = refreshSession();
    if (sessionID === event.properties.info.sessionID) changed();
  });

  api.event.on("session.updated", () => {
    refreshSession();
    changed();
  });

  api.slots.register({
    order: 900,
    slots: {
      app_bottom: () => {
        api.renderer.on("resize", changed);
        onCleanup(() => api.renderer.off("resize", changed));
        const lines = createMemo(() => {
          revision();
          refreshSession();
          const snapshot = state.snapshot();
          const savings = state.cumulativeSavings();
          const ad =
            snapshot &&
            snapshot.status !== "off" &&
            snapshot.status !== "degraded" &&
            snapshot.phase !== "error"
              ? snapshot.ads[0]
              : undefined;
          const width = Math.max(0, api.renderer.width);
          return ad
            ? renderAdFooterLines(ad, width, {
                currentSubsidy: snapshot?.settlement?.ad_subsidy,
                cumulativeSavings: savings,
              })
            : [];
        });
        return (
          <box flexDirection="column" height={3} minHeight={3} flexShrink={0} overflow="hidden">
            {
              (() =>
                [0, 1, 2].map((row) => (
                  <text height={1} fg={ADROUTER_PALETTE[api.theme.mode()].label}>
                    {lines()[row] || " "}
                  </text>
                ))) as unknown as JSX.Element
            }
          </box>
        );
      },
    },
  });
};

const plugin: TuiPluginModule & { id: string } = {
  id: "adrouter",
  tui,
};

export default plugin;
