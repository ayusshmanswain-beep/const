import type { DevCompany, ProjectStatus, WorkspaceLens } from "@/data/dev/types";
import { inRange, presetRange } from "@/lib/dates";
import { stockLevel, type StockLevel } from "@/lib/stock";

export type DashboardQuery = {
  projectId: string | "all";
  siteId: string | "all";
  status: ProjectStatus | "all";
  from: string;
  to: string;
};

export type TradeTotal = {
  trade: string;
  onSite: number;
  assigned: number;
};

export type StockRow = {
  id: string;
  sku: string;
  name: string;
  siteId: string;
  siteName: string;
  projectId: string;
  onHand: number;
  reorder: number;
  unit: string;
  level: StockLevel;
};

export type DashboardModel = {
  projects: DevCompany["projects"];
  sites: DevCompany["sites"];
  trades: TradeTotal[];
  onSite: number;
  assigned: number;
  attendance: DevCompany["attendance"];
  exceptions: DevCompany["exceptions"];
  outsideRadius: number;
  stock: StockRow[];
  stockAlerts: StockRow[];
  healthyStock: number;
  approvals: DevCompany["approvals"];
  transactions: DevCompany["transactions"];
  activities: DevCompany["activities"];
  alerts: DevCompany["alerts"];
};

export function defaultDashboardQuery(): DashboardQuery {
  const range = presetRange("7d");
  return { projectId: "all", siteId: "all", status: "all", from: range.from, to: range.to };
}

export function queriesEqual(left: DashboardQuery, right: DashboardQuery) {
  return (
    left.projectId === right.projectId &&
    left.siteId === right.siteId &&
    left.status === right.status &&
    left.from === right.from &&
    left.to === right.to
  );
}

export function buildDashboard(company: DevCompany, query: DashboardQuery): DashboardModel {
  const selectedSite = query.siteId === "all" ? null : (company.sites.find((site) => site.id === query.siteId) ?? null);

  const projectMatches = (projectId: string) => {
    if (selectedSite && projectId !== selectedSite.projectId) return false;
    if (query.projectId !== "all" && projectId !== query.projectId) return false;
    return true;
  };

  const siteMatches = (siteId: string | null) => {
    if (!selectedSite) return true;
    return siteId === selectedSite.id;
  };

  const projects = company.projects.filter(
    (project) => projectMatches(project.id) && (query.status === "all" || project.status === query.status),
  );
  const projectIds = new Set(projects.map((project) => project.id));

  const sites = company.sites.filter((site) => projectIds.has(site.projectId) && siteMatches(site.id));
  const siteIds = new Set(sites.map((site) => site.id));

  const roster = company.roster.filter((row) => siteIds.has(row.siteId));
  const tradeMap = new Map<string, TradeTotal>();
  for (const row of roster) {
    const current = tradeMap.get(row.trade) ?? { trade: row.trade, onSite: 0, assigned: 0 };
    current.onSite += row.onSite;
    current.assigned += row.assigned;
    tradeMap.set(row.trade, current);
  }

  const exceptions = company.exceptions.filter(
    (item) => inRange(item.date, query.from, query.to) && projectIds.has(item.projectId) && siteIds.has(item.siteId),
  );

  const stock = company.stock
    .filter((item) => siteIds.has(item.siteId))
    .map((item) => {
      const site = company.sites.find((entry) => entry.id === item.siteId);
      return {
        ...item,
        siteName: site?.name ?? item.siteId,
        projectId: site?.projectId ?? "",
        level: stockLevel(item.onHand, item.reorder),
      };
    });

  return {
    projects,
    sites,
    trades: [...tradeMap.values()],
    onSite: roster.reduce((sum, row) => sum + row.onSite, 0),
    assigned: roster.reduce((sum, row) => sum + row.assigned, 0),
    attendance: company.attendance.filter((day) => inRange(day.date, query.from, query.to)),
    exceptions,
    outsideRadius: exceptions.filter((item) => item.kind === "outside-radius").reduce((sum, item) => sum + item.count, 0),
    stock,
    stockAlerts: stock.filter((item) => item.level !== "ok"),
    healthyStock: stock.filter((item) => item.level === "ok").length,
    approvals: company.approvals.filter((item) => item.status === "pending" && projectIds.has(item.projectId) && inRange(item.date, query.from, query.to)),
    transactions: company.transactions.filter((item) => projectIds.has(item.projectId) && inRange(item.date, query.from, query.to)),
    activities: company.activities.filter(
      (item) => projectIds.has(item.projectId) && siteIds.has(item.siteId) && inRange(item.date, query.from, query.to),
    ),
    alerts: company.alerts.filter(
      (item) => projectIds.has(item.projectId) && siteMatches(item.siteId) && inRange(item.date, query.from, query.to),
    ),
  };
}

export function overviewNarrative(model: DashboardModel) {
  const closing = model.projects.filter((project) => project.status === "closing").length;
  const projectLabel = model.projects.length === 1 ? "project matches" : "projects match";
  const exceptionLabel = model.exceptions.reduce((sum, item) => sum + item.count, 0);
  const exceptionWord = exceptionLabel === 1 ? "exception is" : "exceptions are";
  return `${model.onSite} of ${model.assigned} assigned workers are on site. ${model.projects.length} ${projectLabel} this view, ${closing} closing. ${exceptionLabel} attendance ${exceptionWord} open, ${model.outsideRadius} outside a site radius.`;
}

export const workspaceOrder: Record<
  WorkspaceLens,
  { id: SectionId; span: string }[][]
> = {
  operations: [
    [
      { id: "overview", span: "desktop:col-span-7" },
      { id: "alerts", span: "desktop:col-span-5" },
    ],
    [
      { id: "projects", span: "desktop:col-span-7" },
      { id: "workforce", span: "desktop:col-span-5" },
    ],
    [
      { id: "attendance", span: "desktop:col-span-5" },
      { id: "sites", span: "desktop:col-span-7" },
    ],
    [
      { id: "stock", span: "desktop:col-span-4" },
      { id: "approvals", span: "desktop:col-span-4" },
      { id: "progress", span: "desktop:col-span-4" },
    ],
    [
      { id: "transactions", span: "desktop:col-span-7" },
      { id: "activity", span: "desktop:col-span-5" },
    ],
  ],
  commercial: [
    [
      { id: "overview", span: "desktop:col-span-5" },
      { id: "transactions", span: "desktop:col-span-7" },
    ],
    [
      { id: "approvals", span: "desktop:col-span-5" },
      { id: "progress", span: "desktop:col-span-7" },
    ],
    [
      { id: "projects", span: "desktop:col-span-8" },
      { id: "stock", span: "desktop:col-span-4" },
    ],
    [
      { id: "alerts", span: "desktop:col-span-4" },
      { id: "attendance", span: "desktop:col-span-4" },
      { id: "sites", span: "desktop:col-span-4" },
    ],
    [
      { id: "workforce", span: "desktop:col-span-5" },
      { id: "activity", span: "desktop:col-span-7" },
    ],
  ],
  assurance: [
    [
      { id: "alerts", span: "desktop:col-span-5" },
      { id: "attendance", span: "desktop:col-span-7" },
    ],
    [
      { id: "sites", span: "desktop:col-span-7" },
      { id: "overview", span: "desktop:col-span-5" },
    ],
    [
      { id: "activity", span: "desktop:col-span-5" },
      { id: "workforce", span: "desktop:col-span-7" },
    ],
    [
      { id: "projects", span: "desktop:col-span-8" },
      { id: "stock", span: "desktop:col-span-4" },
    ],
    [
      { id: "approvals", span: "desktop:col-span-4" },
      { id: "progress", span: "desktop:col-span-4" },
      { id: "transactions", span: "desktop:col-span-4" },
    ],
  ],
};

export type SectionId =
  | "overview"
  | "alerts"
  | "projects"
  | "workforce"
  | "attendance"
  | "sites"
  | "stock"
  | "approvals"
  | "progress"
  | "transactions"
  | "activity";
