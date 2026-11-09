/** Development records only. Production modules must not import this folder. */

export const DATA_ORIGIN = "development" as const;

export type DataOrigin = typeof DATA_ORIGIN;

export type ProjectStatus = "mobilising" | "active" | "closing";

export type WorkspaceLens = "operations" | "commercial" | "assurance";

export type PersonKind = "employee" | "labour" | "contractor" | "supervisor";

export type Project = {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  progress: number;
  budget: number;
  spent: number;
  siteIds: string[];
  start: string;
  finish: string;
};

export type Site = {
  id: string;
  projectId: string;
  name: string;
  place: string;
  radiusMeters: number;
  hoursToday: number;
  hoursPlanned: number;
  openIssues: number;
};

export type RosterRow = {
  siteId: string;
  trade: string;
  onSite: number;
  assigned: number;
};

export type AttendanceDay = {
  date: string;
  onSite: number;
  expected: number;
};

export type ExceptionKind = "outside-radius" | "late" | "missed-checkout";

export type AttendanceException = {
  id: string;
  date: string;
  siteId: string;
  projectId: string;
  kind: ExceptionKind;
  count: number;
  detail: string;
};

export type StockItem = {
  id: string;
  sku: string;
  name: string;
  siteId: string;
  onHand: number;
  reorder: number;
  unit: string;
};

export type Approval = {
  id: string;
  kind: string;
  title: string;
  projectId: string;
  amount: number | null;
  requestedBy: string;
  status: "pending" | "approved";
  date: string;
};

export type Transaction = {
  id: string;
  date: string;
  reference: string;
  kind: string;
  projectId: string;
  amount: number;
  counterparty: string;
};

export type Activity = {
  id: string;
  date: string;
  time: string;
  projectId: string;
  siteId: string;
  actor: string;
  text: string;
};

export type OperationalAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  projectId: string;
  siteId: string | null;
  date: string;
};

export type Person = {
  id: string;
  name: string;
  role: string;
  kind: PersonKind;
  projectId: string;
  siteId: string;
  fictional: true;
};

export type DevNotification = {
  id: string;
  title: string;
  body: string;
  date: string;
  time: string;
  href: string;
};

export type DevUser = {
  id: string;
  name: string;
  role: string;
  email: string;
  fictional: true;
};

export type Workspace = {
  id: string;
  name: string;
  lens: WorkspaceLens;
};

export type DevCompany = {
  origin: DataOrigin;
  id: string;
  name: string;
  legalName: string;
  currency: string;
  locale: string;
  datasetNote: string;
  user: DevUser;
  workspaces: Workspace[];
  projects: Project[];
  sites: Site[];
  roster: RosterRow[];
  attendance: AttendanceDay[];
  exceptions: AttendanceException[];
  stock: StockItem[];
  approvals: Approval[];
  transactions: Transaction[];
  activities: Activity[];
  alerts: OperationalAlert[];
  people: Person[];
  notifications: DevNotification[];
};
