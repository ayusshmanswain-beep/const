import type { DevCompany } from "@/data/dev/types";
import type { DashboardModel, StockRow } from "@/lib/dashboard/query";
import { formatDate, formatMoney } from "@/lib/format";

export type RecordDetail = {
  id: string;
  kind: string;
  title: string;
  fields: { label: string; value: string }[];
  note: string;
};

function projectName(company: DevCompany, projectId: string) {
  return company.projects.find((project) => project.id === projectId)?.name ?? projectId;
}

function siteName(company: DevCompany, siteId: string) {
  return company.sites.find((site) => site.id === siteId)?.name ?? siteId;
}

export function alertRecord(company: DevCompany, model: DashboardModel, id: string): RecordDetail | null {
  const alert = model.alerts.find((item) => item.id === id);
  if (!alert) return null;
  return {
    id: alert.id,
    kind: "Operational alert",
    title: alert.title,
    note: "Development record. No live monitoring produced this alert.",
    fields: [
      { label: "Severity", value: alert.severity },
      { label: "Project", value: projectName(company, alert.projectId) },
      { label: "Site", value: alert.siteId ? siteName(company, alert.siteId) : "Company" },
      { label: "Detail", value: alert.detail },
      { label: "Dataset date", value: formatDate(alert.date, company.locale) },
    ],
  };
}

export function approvalRecord(company: DevCompany, model: DashboardModel, id: string): RecordDetail | null {
  const approval = model.approvals.find((item) => item.id === id);
  if (!approval) return null;
  return {
    id: approval.id,
    kind: "Pending approval",
    title: approval.title,
    note: "Opening this record does not approve it. Approval posting is not implemented.",
    fields: [
      { label: "Kind", value: approval.kind },
      { label: "Project", value: projectName(company, approval.projectId) },
      { label: "Requested by", value: approval.requestedBy },
      { label: "Amount", value: approval.amount === null ? "No amount" : formatMoney(approval.amount, company.currency, company.locale) },
      { label: "Status", value: approval.status },
    ],
  };
}

export function transactionRecord(company: DevCompany, model: DashboardModel, id: string): RecordDetail | null {
  const transaction = model.transactions.find((item) => item.id === id);
  if (!transaction) return null;
  return {
    id: transaction.id,
    kind: "Transaction",
    title: transaction.reference,
    note: "Development ledger line. It has not been posted to a general ledger.",
    fields: [
      { label: "Kind", value: transaction.kind },
      { label: "Counterparty", value: transaction.counterparty },
      { label: "Project", value: projectName(company, transaction.projectId) },
      { label: "Amount", value: formatMoney(transaction.amount, company.currency, company.locale) },
      { label: "Date", value: formatDate(transaction.date, company.locale) },
    ],
  };
}

export function activityRecord(company: DevCompany, model: DashboardModel, id: string): RecordDetail | null {
  const activity = model.activities.find((item) => item.id === id);
  if (!activity) return null;
  return {
    id: activity.id,
    kind: "Activity",
    title: activity.text,
    note: "Site clock time on the development record. Not a device timestamp from this browser.",
    fields: [
      { label: "When", value: `${formatDate(activity.date, company.locale)} ${activity.time}` },
      { label: "Actor", value: activity.actor },
      { label: "Project", value: projectName(company, activity.projectId) },
      { label: "Site", value: siteName(company, activity.siteId) },
    ],
  };
}

export function stockRecord(company: DevCompany, row: StockRow): RecordDetail {
  return {
    id: row.id,
    kind: "Material",
    title: row.name,
    note: "Development stock balance. Adjustments are not posted.",
    fields: [
      { label: "SKU", value: row.sku },
      { label: "Site", value: row.siteName },
      { label: "On hand", value: `${row.onHand} ${row.unit}` },
      { label: "Reorder point", value: `${row.reorder} ${row.unit}` },
      { label: "Level", value: row.level },
      { label: "Project", value: projectName(company, row.projectId) },
    ],
  };
}

export function siteRecord(company: DevCompany, id: string): RecordDetail | null {
  const site = company.sites.find((item) => item.id === id);
  if (!site) return null;
  const variance = site.hoursToday - site.hoursPlanned;
  return {
    id: site.id,
    kind: "Site",
    title: site.name,
    note: "Development site. The radius is configuration data, not a live geofence check.",
    fields: [
      { label: "Place", value: site.place },
      { label: "Project", value: projectName(company, site.projectId) },
      { label: "GPS radius", value: `${site.radiusMeters} m` },
      { label: "Hours today", value: String(site.hoursToday) },
      { label: "Hours planned", value: String(site.hoursPlanned) },
      { label: "Variance", value: `${variance > 0 ? "+" : ""}${variance}` },
      { label: "Open issues", value: String(site.openIssues) },
    ],
  };
}

export function projectRecord(company: DevCompany, id: string): RecordDetail | null {
  const project = company.projects.find((item) => item.id === id);
  if (!project) return null;
  return {
    id: project.id,
    kind: "Project",
    title: project.name,
    note: "Development project. Creating or editing projects is not implemented.",
    fields: [
      { label: "Code", value: project.code },
      { label: "Phase", value: project.status },
      { label: "Progress", value: `${project.progress}%` },
      { label: "Budget", value: formatMoney(project.budget, company.currency, company.locale) },
      { label: "Spent", value: formatMoney(project.spent, company.currency, company.locale) },
      { label: "Finish", value: formatDate(project.finish, company.locale) },
    ],
  };
}
