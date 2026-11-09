export type NavIcon =
  | "LayoutDashboard"
  | "Landmark"
  | "MapPinned"
  | "ClipboardList"
  | "Users"
  | "MapPin"
  | "Warehouse"
  | "ShoppingCart"
  | "Wrench"
  | "Receipt"
  | "ShieldCheck"
  | "Files"
  | "BarChart3";

export type ScreenDef = {
  slug: string;
  href: string;
  label: string;
  group: string;
  icon: NavIcon;
  summary: string;
  intendedAction: string;
  implemented: boolean;
};

export const screens: ScreenDef[] = [
  { slug: "overview", href: "/", label: "Dashboard", group: "Overview", icon: "LayoutDashboard", summary: "Company operating picture for the selected workspace.", intendedAction: "Change the date range and filters.", implemented: true },
  { slug: "projects", href: "/projects", label: "Projects", group: "Delivery", icon: "Landmark", summary: "Project records, budgets, and milestones.", intendedAction: "Create a project inside the signed-in company.", implemented: false },
  { slug: "sites", href: "/sites", label: "Sites", group: "Delivery", icon: "MapPinned", summary: "Construction sites and the GPS radius for each site.", intendedAction: "Add a site and set its check-in radius.", implemented: false },
  { slug: "operations", href: "/operations", label: "Site operations", group: "Delivery", icon: "ClipboardList", summary: "Daily progress, site diary, and inspections.", intendedAction: "Open a daily progress report.", implemented: false },
  { slug: "workforce", href: "/workforce", label: "Workforce", group: "People", icon: "Users", summary: "Employees, labour, contractors, and supervisors.", intendedAction: "Register a worker and assign them to a site.", implemented: false },
  { slug: "attendance", href: "/attendance", label: "Attendance", group: "People", icon: "MapPin", summary: "Check-in and check-out evidence, exceptions, and corrections.", intendedAction: "Review a GPS exception without rewriting the original evidence.", implemented: false },
  { slug: "inventory", href: "/inventory", label: "Inventory", group: "Supply", icon: "Warehouse", summary: "Materials, warehouses, and stock movements.", intendedAction: "Post a stock movement inside a transaction.", implemented: false },
  { slug: "procurement", href: "/procurement", label: "Procurement", group: "Supply", icon: "ShoppingCart", summary: "Suppliers, requisitions, quotations, and goods receipts.", intendedAction: "Raise a purchase order.", implemented: false },
  { slug: "equipment", href: "/equipment", label: "Equipment", group: "Supply", icon: "Wrench", summary: "Plant, maintenance, hire, and fuel.", intendedAction: "Register a piece of equipment.", implemented: false },
  { slug: "finance", href: "/finance", label: "Finance", group: "Commercial", icon: "Receipt", summary: "Expenses, payments, payroll, and reports.", intendedAction: "Post a payment.", implemented: false },
  { slug: "safety", href: "/safety", label: "Safety", group: "Assurance", icon: "ShieldCheck", summary: "Incidents, inspections, quality checks, and nonconformances.", intendedAction: "Log an incident.", implemented: false },
  { slug: "documents", href: "/documents", label: "Documents", group: "Assurance", icon: "Files", summary: "Controlled files and version history.", intendedAction: "File a document against a project.", implemented: false },
  { slug: "analytics", href: "/analytics", label: "Analytics", group: "Assurance", icon: "BarChart3", summary: "Cross-project reporting from stored facts.", intendedAction: "Build a report from live records.", implemented: false },
  { slug: "settings", href: "/settings", label: "Settings", group: "Account", icon: "LayoutDashboard", summary: "Appearance and shell preferences for this browser.", intendedAction: "Save shell preferences.", implemented: true },
  { slug: "help", href: "/help", label: "Help", group: "Account", icon: "LayoutDashboard", summary: "How this shell behaves.", intendedAction: "Read the shell notes.", implemented: true },
  { slug: "account", href: "/account", label: "Account", group: "Account", icon: "LayoutDashboard", summary: "The development user for the selected tenant.", intendedAction: "Review the signed-in development user.", implemented: true },
];

export const navGroups = ["Overview", "Delivery", "People", "Supply", "Commercial", "Assurance"] as const;

export function screensInGroup(group: string) {
  return screens.filter((screen) => screen.group === group);
}

export function getScreen(slug: string) {
  return screens.find((screen) => screen.slug === slug);
}

export function screenForPath(pathname: string) {
  if (pathname === "/") return screens[0];
  return screens.find((screen) => screen.href === pathname);
}
