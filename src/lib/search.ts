import type { DevCompany } from "@/data/dev/types";
import type { ScreenDef } from "@/lib/navigation";

export type SearchHit = {
  id: string;
  kind: string;
  title: string;
  hint: string;
  href: string;
  projectId?: string;
  siteId?: string;
};

export function searchDevelopmentData(company: DevCompany, query: string, catalog: ScreenDef[]): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const hits: SearchHit[] = [];
  const push = (hit: SearchHit) => {
    if (hits.length < 12) hits.push(hit);
  };

  for (const screen of catalog) {
    const haystack = `${screen.label} ${screen.group} ${screen.summary}`.toLowerCase();
    if (haystack.includes(needle)) {
      push({ id: `screen-${screen.slug}`, kind: "Screen", title: screen.label, hint: screen.group, href: screen.href });
    }
  }

  for (const project of company.projects) {
    if (`${project.code} ${project.name} ${project.status}`.toLowerCase().includes(needle)) {
      push({ id: project.id, kind: "Project", title: project.name, hint: project.code, href: "/", projectId: project.id });
    }
  }

  for (const site of company.sites) {
    if (`${site.name} ${site.place}`.toLowerCase().includes(needle)) {
      push({
        id: site.id,
        kind: "Site",
        title: site.name,
        hint: `${site.place} · ${site.radiusMeters} m radius`,
        href: "/",
        projectId: site.projectId,
        siteId: site.id,
      });
    }
  }

  for (const person of company.people) {
    if (`${person.name} ${person.role} ${person.kind}`.toLowerCase().includes(needle)) {
      push({ id: person.id, kind: person.kind, title: person.name, hint: person.role, href: "/workforce", projectId: person.projectId, siteId: person.siteId });
    }
  }

  for (const item of company.stock) {
    if (`${item.sku} ${item.name}`.toLowerCase().includes(needle)) {
      const site = company.sites.find((entry) => entry.id === item.siteId);
      push({ id: item.id, kind: "Material", title: item.name, hint: item.sku, href: "/inventory", projectId: site?.projectId, siteId: item.siteId });
    }
  }

  for (const approval of company.approvals) {
    if (`${approval.title} ${approval.kind}`.toLowerCase().includes(needle)) {
      push({ id: approval.id, kind: "Approval", title: approval.title, hint: approval.kind, href: "/", projectId: approval.projectId });
    }
  }

  return hits;
}
