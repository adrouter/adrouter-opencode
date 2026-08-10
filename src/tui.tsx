/** @jsxImportSource @opentui/solid */

import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui";
import type { Message } from "@opencode-ai/sdk/v2";
import { createSignal } from "solid-js";
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
    refreshSession();
    if (event.properties.info.role === "user") changed();
  });

  api.event.on("session.updated", () => {
    refreshSession();
    changed();
  });

  api.slots.register({
    order: 900,
    slots: {
      app_bottom: () => {
        revision();
        refreshSession();
        const snapshot = state.snapshot();
        const savings = state.cumulativeSavings();
        if (
          !snapshot ||
          snapshot.status === "off" ||
          snapshot.status === "degraded" ||
          !snapshot.ads[0]
        ) {
          return null;
        }
        const ad = snapshot.ads[0];
        const width = Math.max(0, api.renderer.width);
        const palette = ADROUTER_PALETTE[api.theme.mode()];
        const lines = renderAdFooterLines(ad, width, {
          currentSubsidy: snapshot.settlement?.ad_subsidy,
          cumulativeSavings: savings,
        });
        if (lines.length === 0) return null;
        return (
          <box flexDirection="column">
            {lines.map((line) => (
              <text fg={palette.label}>{line}</text>
            ))}
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
