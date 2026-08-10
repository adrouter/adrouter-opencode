import { describe, expect, test } from "bun:test";
import {
  ADROUTER_PALETTE,
  AdRouterPanelState,
  formatSubsidy,
  renderAdFooterLines,
  renderCompactAd,
  truncateVisible,
  visibleWidth,
} from "../../src/presentation.js";

const tierC = {
  id: "c",
  tier: "C" as const,
  title: "\u001b[31mDeveloper Tools\u001b[0m",
  body: "Build faster",
  url: "https://example.test",
  label: "Sponsored",
};

describe("tiered presentation", () => {
  test("matches native truncation at representative widths", () => {
    for (const width of [20, 40, 80, 120]) {
      expect(renderCompactAd(tierC, width).length).toBeLessThanOrEqual(width);
    }
    expect(truncateVisible("abcdef", 1)).toBe(".");
    expect(truncateVisible("abcdef", 2)).toBe("..");
    expect(truncateVisible("abcdef", 3)).toBe("...");
    expect(renderCompactAd(tierC, 120)).toBe(
      "Sponsored · TIER C: Developer Tools — Build faster — https://example.test",
    );
  });

  test("renders every sponsored tier with the same compact shape", () => {
    for (const tier of ["A", "B", "C"] as const) {
      expect(
        renderCompactAd(
          {
            id: tier.toLowerCase(),
            tier,
            title: "Acme",
            body: "Ship",
            cta: "Try it",
            url: "https://acme.test",
            label: "Sponsored",
          },
          120,
        ),
      ).toBe(`Sponsored · TIER ${tier}: Acme — Ship — https://acme.test`);
    }
  });

  test("renders at most three width-bounded rows with economics ahead of the URL", () => {
    expect(
      renderAdFooterLines({ ...tierC, cta: "Try it" }, 120, {
        currentSubsidy: 0.002,
        cumulativeSavings: 0.012,
      }),
    ).toEqual([
      "Sponsored · TIER C: Developer Tools",
      "Build faster · Try it",
      "subsidy $0.002000 · saved $0.012 · https://example.test",
    ]);

    for (const width of [0, 1, 2, 3, 4, 12, 20, 38, 80, 120]) {
      const lines = renderAdFooterLines(
        {
          ...tierC,
          title: "工具 🚀 Developer Tools",
          body: "Build\u0000 faster with a deliberately long terminal-safe sponsor message",
          cta: "\u001b[31mTry it\u001b[0m",
        },
        width,
        { currentSubsidy: 0.002, cumulativeSavings: 0.012 },
      );
      expect(lines.length).toBeLessThanOrEqual(3);
      expect(lines.every((line) => visibleWidth(line) <= width)).toBe(true);
      expect(lines.join("\n")).not.toContain("\u0000");
      expect(lines.join("\n")).not.toContain("\u001b");
    }
    expect(
      renderAdFooterLines(tierC, 38, {
        currentSubsidy: 0.002,
        cumulativeSavings: 0.012,
      })[2],
    ).toContain("subsidy $0.002000 · saved $0.012");
    expect(
      renderAdFooterLines(tierC, 38, {
        currentSubsidy: 0.002,
        cumulativeSavings: 0.012,
      })[2],
    ).not.toContain("https://");
  });

  test("uses safe fallbacks, pending economics, and a single compact NONE row", () => {
    expect(
      renderAdFooterLines({ id: "missing", tier: "C", title: "", body: "", label: "" }, 120, {
        currentSubsidy: Number.NaN,
        cumulativeSavings: -1,
      }),
    ).toEqual(["Sponsored · TIER C: Sponsored placement", "subsidy pending · saved $0.000000"]);
    expect(
      renderAdFooterLines(
        {
          id: "none",
          tier: "NONE",
          title: "ignored",
          body: "Privacy guardrail",
          label: "TIER NONE",
        },
        120,
        { currentSubsidy: 99, cumulativeSavings: 99 },
      ),
    ).toEqual(["TIER NONE: No sponsored content — Privacy guardrail"]);
    expect(renderAdFooterLines(tierC, 0, { cumulativeSavings: 0 })).toEqual([]);
    expect(renderAdFooterLines(tierC, Number.NaN, { cumulativeSavings: 0 })).toEqual([]);
    expect(renderAdFooterLines(tierC, Number.POSITIVE_INFINITY, { cumulativeSavings: 0 })).toEqual(
      [],
    );
  });

  test("renders NONE and keeps the compact palette and savings formatter", () => {
    expect(
      renderCompactAd(
        {
          id: "none",
          tier: "NONE",
          title: "ignored",
          body: "Privacy guardrail",
          label: "TIER NONE",
        },
        120,
      ),
    ).toBe("TIER NONE: No sponsored content — Privacy guardrail");
    expect(ADROUTER_PALETTE.dark).toEqual({ label: "#8fcfff" });
    expect(ADROUTER_PALETTE.light).toEqual({ label: "#1769aa" });
    expect(formatSubsidy(0.009)).toBe("0.009000");
    expect(formatSubsidy(0.02)).toBe("0.020");
  });

  test("reconstructs ordered messages, accepts only highest sequences, and clears stale ads", () => {
    const state = new AdRouterPanelState();
    const settled = {
      adrouter: {
        version: 1,
        sequence: 2,
        phase: "settled",
        status: "live",
        turnId: "turn-1",
        ads: [tierC],
        settlement: { ad_subsidy: 0.002 },
      },
    };
    const lower = {
      adrouter: {
        ...settled.adrouter,
        sequence: 1,
        ads: [{ ...tierC, title: "Stale" }],
        settlement: { ad_subsidy: 99 },
      },
    };
    state.reconstruct("s1", [
      { id: "u1", role: "user", parts: [] },
      {
        id: "a1",
        role: "assistant",
        parts: [{ metadata: settled }, { metadata: lower }, { metadata: settled }],
      },
      {
        id: "a1-late",
        role: "assistant",
        parts: [{ metadata: lower }],
      },
    ]);
    expect(state.cumulativeSavings()).toBe(0.002);
    expect(state.snapshot()?.ads[0]?.title).not.toBe("Stale");

    const secondTurn = {
      adrouter: {
        ...settled.adrouter,
        turnId: "turn-2",
        sequence: 3,
        settlement: { ad_subsidy: 0.004 },
      },
    };
    state.reconstruct("s1", [
      { id: "u1", role: "user", parts: [] },
      { id: "a1", role: "assistant", parts: [{ metadata: settled }, { metadata: settled }] },
      { id: "a2", role: "assistant", parts: [{ metadata: secondTurn }] },
    ]);
    expect(state.cumulativeSavings()).toBe(0.006);

    state.reconstruct("s1", [
      {
        id: "a1",
        role: "assistant",
        parts: [{ metadata: settled }],
      },
      { id: "u2", role: "user", parts: [] },
    ]);
    expect(state.snapshot()).toBeUndefined();
    expect(state.cumulativeSavings()).toBe(0.002);

    state.reconstruct("s2", []);
    expect(state.cumulativeSavings()).toBe(0);
  });
});
