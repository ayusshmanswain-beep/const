import { describe, expect, it } from "vitest";

import { developmentCompanies } from "@/data/dev/companies";
import { DATA_ORIGIN } from "@/data/dev/types";
import { addDays, presetRange, rangeSchema } from "@/lib/dates";
import { buildDashboard, defaultDashboardQuery, overviewNarrative } from "@/lib/dashboard/query";
import { searchDevelopmentData } from "@/lib/search";
import { stockLevel } from "@/lib/stock";
import { screens } from "@/lib/navigation";

describe("development dataset", () => {
  it("marks every company as development data", () => {
    for (const company of developmentCompanies) {
      expect(company.origin).toBe(DATA_ORIGIN);
      expect(company.datasetNote.toLowerCase()).toContain("fictional");
    }
  });

  it("keeps Northline roster totals consistent with the Monday attendance", () => {
    const company = developmentCompanies[0];
    const onSite = company.roster.reduce((sum, row) => sum + row.onSite, 0);
    const assigned = company.roster.reduce((sum, row) => sum + row.assigned, 0);
    expect(onSite).toBe(128);
    expect(assigned).toBe(146);
    expect(company.attendance.at(-1)).toMatchObject({ date: "2026-11-09", onSite: 128, expected: 146 });
  });
});

describe("dashboard query", () => {
  const company = developmentCompanies[0];

  it("hides the September mobilisation payment from the default week", () => {
    const model = buildDashboard(company, defaultDashboardQuery());
    expect(model.transactions.some((item) => item.id === "tx-7")).toBe(false);
    expect(model.transactions.length).toBeGreaterThan(0);
  });

  it("filters projects, stock, and exceptions by site", () => {
    const model = buildDashboard(company, { ...defaultDashboardQuery(), siteId: "harbor-apron" });
    expect(model.projects.map((project) => project.id)).toEqual(["harbor"]);
    expect(model.stock.map((item) => item.id)).toEqual(["stk-ply"]);
    expect(model.outsideRadius).toBe(3);
    expect(model.onSite).toBe(16);
  });

  it("excludes approved requests from pending approvals", () => {
    const model = buildDashboard(company, defaultDashboardQuery());
    expect(model.approvals.every((item) => item.status === "pending")).toBe(true);
  });

  it("writes a narrative from the filtered figures", () => {
    const model = buildDashboard(company, defaultDashboardQuery());
    expect(overviewNarrative(model)).toContain("128 of 146");
    expect(overviewNarrative(model)).toContain("3 outside");
  });
});

describe("dates and stock", () => {
  it("builds a seven day window ending on the dataset day", () => {
    expect(presetRange("7d")).toEqual({ from: addDays("2026-11-09", -6), to: "2026-11-09" });
  });

  it("rejects an inverted range", () => {
    const result = rangeSchema.safeParse({ from: "2026-11-09", to: "2026-11-01" });
    expect(result.success).toBe(false);
  });

  it("classifies reorder levels", () => {
    expect(stockLevel(18, 40)).toBe("critical");
    expect(stockLevel(48, 80)).toBe("low");
    expect(stockLevel(640, 500)).toBe("ok");
  });
});

describe("search", () => {
  it("finds a project and a screen without treating them as production records", () => {
    const hits = searchDevelopmentData(developmentCompanies[0], "harbor", screens);
    expect(hits.some((hit) => hit.kind === "Project" && hit.projectId === "harbor")).toBe(true);
    expect(hits.every((hit) => hit.href.startsWith("/"))).toBe(true);
  });
});
