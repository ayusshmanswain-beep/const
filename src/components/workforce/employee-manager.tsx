"use client";

// ==============================================================================
// CONSTRUCT360 EMPLOYEE DIRECTORY & LIFECYCLE MANAGER
// Registration, Auto-ID, Profiles, Salary, Documents & Verification Workflow
// ==============================================================================

import React, { useEffect, useState, useId } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  FileDown,
  Upload,
  Eye,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  FileText,
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  History,
} from "lucide-react";

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  departmentId?: string;
  designationId?: string;
  employmentType: "PERMANENT" | "TEMPORARY" | "PROBATION" | "CONTRACT";
  status: "ACTIVE" | "PROBATION" | "ON_NOTICE" | "TERMINATED" | "RESIGNED";
  joiningDate: string;
  assignedSiteId?: string;
  assignedProjectId?: string;
  department?: { id: string; name: string; code: string };
  designation?: { id: string; title: string; level: number };
  site?: { id: string; name: string };
  photoUrl?: string;
}

export default function EmployeeManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Selected Employee Profile Drawer State
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [empProfile, setEmpProfile] = useState<any | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form State for New Employee
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    employmentType: "PERMANENT",
    joiningDate: new Date().toISOString().slice(0, 10),
    departmentId: "",
    designationId: "",
    assignedSiteId: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "Spouse",
    address: "",
    panNumber: "",
    aadhaarNumber: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankName: "",
    baseSalary: 65000,
    hra: 25000,
    siteAllowance: 10000,
  });

  // Upload Doc State
  const [docData, setDocData] = useState({
    documentType: "AADHAAR_CARD",
    title: "",
    fileName: "",
    fileUrl: "",
  });

  // Bulk Import State
  const [csvContent, setCsvContent] = useState("");
  const [importResult, setImportResult] = useState<any | null>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append("search", search);
      if (filterType !== "ALL") params.append("employmentType", filterType);
      if (filterStatus !== "ALL") params.append("status", filterStatus);

      const res = await fetch(`/api/v1/workforce/employees?${params.toString()}`, {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setEmployees(json.data);
        if (json.meta) setTotalCount(json.meta.total);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, filterType, filterStatus, page]);

  // Load detailed profile
  const openProfile = async (id: string) => {
    setSelectedEmpId(id);
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/v1/workforce/employees/${id}`, {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setEmpProfile(json.data);
      }
    } catch {
    } finally {
      setProfileLoading(false);
    }
  };

  // Submit New Employee Registration
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim(),
        employmentType: formData.employmentType,
        joiningDate: formData.joiningDate,
        departmentId: formData.departmentId || undefined,
        designationId: formData.designationId || undefined,
        assignedSiteId: formData.assignedSiteId || undefined,
        emergencyContactName: formData.emergencyContactName || undefined,
        emergencyContactPhone: formData.emergencyContactPhone || undefined,
        emergencyContactRelation: formData.emergencyContactRelation || undefined,
        address: formData.address || undefined,
        panNumber: formData.panNumber || undefined,
        aadhaarNumber: formData.aadhaarNumber || undefined,
        bankAccountNumber: formData.bankAccountNumber || undefined,
        bankIfsc: formData.bankIfsc || undefined,
        bankName: formData.bankName || undefined,
        baseSalary: Number(formData.baseSalary) || 0,
        hra: Number(formData.hra) || 0,
        siteAllowance: Number(formData.siteAllowance) || 0,
      };

      const res = await fetch("/api/v1/workforce/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        fetchEmployees();
      } else {
        setActionError(json.error?.message || "Failed to create employee");
      }
    } catch (err: any) {
      setActionError(err?.message || "An unexpected error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  // Upload Employee Document
  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/workforce/employees/${selectedEmpId}/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({
          documentType: docData.documentType,
          title: docData.title || `${docData.documentType} Copy`,
          fileName: docData.fileName || `${docData.documentType.toLowerCase()}.pdf`,
          fileUrl: docData.fileUrl || `https://documents.construct360.local/vault/${Date.now()}.pdf`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowDocModal(false);
        openProfile(selectedEmpId);
      }
    } catch {
    } finally {
      setActionLoading(false);
    }
  };

  // Document Verification Workflow
  const handleVerifyDocument = async (docId: string, status: "VERIFIED" | "REJECTED") => {
    if (!selectedEmpId) return;
    try {
      const res = await fetch(`/api/v1/workforce/employees/${selectedEmpId}/documents`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({
          documentId: docId,
          status,
          rejectionReason: status === "REJECTED" ? "Document expired or unreadable" : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        openProfile(selectedEmpId);
      }
    } catch {}
  };

  // Bulk CSV Import
  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/v1/workforce/employees/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({ csvContent }),
      });
      const json = await res.json();
      if (json.success) {
        setImportResult(json.data);
        fetchEmployees();
      } else {
        setActionError(json.error?.message || "Import failed");
      }
    } catch (err: any) {
      setActionError(err?.message || "Error submitting CSV");
    } finally {
      setActionLoading(false);
    }
  };

  const sampleCsvTemplate = `firstName,lastName,email,phone,employmentType,joiningDate,baseSalary,department,designation
Arun,Kumar,arun.kumar@apexinfra.com,+91 98765 43210,PERMANENT,2025-01-15,85000,CIVIL-ENG,Site In-Charge Engineer
Meera,Nair,meera.nair@apexinfra.com,+91 98765 43211,PROBATION,2025-02-01,70000,QA-QC-HSE,Safety & Quality Officer`;

  return (
    <div className="space-y-6">
      {/* Action Header & Tools */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">
            Permanent & Contract Employee Directory
          </h2>
          <p className="text-xs text-muted">
            Lifecycle tracking, automated serial ID generation, compliance vaults, and pay structures
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/v1/workforce/employees/export"
            download
            className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/20 transition-colors"
          >
            <FileDown className="h-3.5 w-3.5 text-muted" />
            Export CSV
          </a>
          <button
            onClick={() => {
              setCsvContent(sampleCsvTemplate);
              setImportResult(null);
              setShowImportModal(true);
            }}
            className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/20 transition-colors"
          >
            <Upload className="h-3.5 w-3.5 text-muted" />
            Bulk CSV Import
          </button>
          <button
            onClick={() => {
              setActionError(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-canvas hover:bg-ink/90 transition-colors shadow-xs"
          >
            <UserPlus className="h-3.5 w-3.5 text-accent" />
            Register Employee
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search by name, code (e.g. EMP-APEX-001), phone or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-line bg-canvas pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus:outline-hidden focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
          >
            <option value="ALL">All Employment Types</option>
            <option value="PERMANENT">Permanent</option>
            <option value="PROBATION">Probation</option>
            <option value="TEMPORARY">Temporary</option>
            <option value="CONTRACT">Contract</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PROBATION">Probation</option>
            <option value="ON_NOTICE">On Notice</option>
            <option value="RESIGNED">Resigned</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>
      </div>

      {/* Main Employee Table */}
      <div className="rounded-lg border border-line bg-panel shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-canvas/70 text-muted uppercase text-[10px] font-semibold">
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Emp ID</th>
                <th className="py-2.5 px-3">Department & Role</th>
                <th className="py-2.5 px-3">Assigned Site</th>
                <th className="py-2.5 px-3">Employment Type</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-canvas/50 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-xs uppercase">
                        {emp.firstName[0]}
                        {emp.lastName[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-ink">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-[11px] text-muted flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" />
                          {emp.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-accent">
                    {emp.employeeCode}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-ink">
                      {emp.designation?.title || "Staff Member"}
                    </div>
                    <div className="text-[10px] text-muted">
                      {emp.department?.name || "Civil Engineering"}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 text-muted">
                      <MapPin className="h-3 w-3 text-accent" />
                      {emp.site?.name || "Corporate HQ"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="rounded bg-stone/40 px-2 py-0.5 font-mono text-[10px] text-ink font-medium">
                      {emp.employmentType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        emp.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800"
                          : emp.status === "PROBATION"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => openProfile(emp.id)}
                      className="inline-flex items-center gap-1 rounded border border-line bg-canvas px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-stone/20 transition-colors"
                    >
                      <Eye className="h-3 w-3 text-accent" />
                      View Dossier
                    </button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No employees found matching the specified search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Dossier Drawer Modal */}
      {selectedEmpId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border border-line bg-panel shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-4 bg-canvas">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-accent text-canvas flex items-center justify-center font-bold text-sm">
                  {empProfile?.employee?.firstName?.[0]}
                  {empProfile?.employee?.lastName?.[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">
                    {empProfile?.employee?.firstName} {empProfile?.employee?.lastName}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="font-mono font-bold text-accent">
                      {empProfile?.employee?.employeeCode}
                    </span>
                    <span>&bull;</span>
                    <span>{empProfile?.employee?.designation?.title || "Designation"}</span>
                    <span>&bull;</span>
                    <span className="font-mono text-emerald-700 font-semibold">
                      {empProfile?.employee?.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmpId(null)}
                className="rounded p-1 text-muted hover:bg-stone/20 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {profileLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : (
                empProfile && (
                  <>
                    {/* Key Details Grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="rounded-md border border-line bg-canvas p-3 space-y-1">
                        <span className="text-[10px] font-semibold text-muted uppercase">Contact & Personal</span>
                        <div className="text-xs text-ink"><strong>Phone:</strong> {empProfile.employee.phone}</div>
                        <div className="text-xs text-ink truncate"><strong>Email:</strong> {empProfile.employee.email || "N/A"}</div>
                        <div className="text-xs text-ink"><strong>Joined:</strong> {empProfile.employee.joiningDate}</div>
                      </div>

                      <div className="rounded-md border border-line bg-canvas p-3 space-y-1">
                        <span className="text-[10px] font-semibold text-muted uppercase">Site & Department</span>
                        <div className="text-xs text-ink"><strong>Dept:</strong> {empProfile.employee.department?.name || "Civil Engineering"}</div>
                        <div className="text-xs text-ink"><strong>Site:</strong> {empProfile.employee.site?.name || "HQ Site"}</div>
                        <div className="text-xs text-ink"><strong>Type:</strong> {empProfile.employee.employmentType}</div>
                      </div>

                      <div className="rounded-md border border-line bg-canvas p-3 space-y-1">
                        <span className="text-[10px] font-semibold text-muted uppercase">Emergency Contact</span>
                        <div className="text-xs text-ink"><strong>Name:</strong> {empProfile.employee.emergencyContactName || "N/A"}</div>
                        <div className="text-xs text-ink"><strong>Phone:</strong> {empProfile.employee.emergencyContactPhone || "N/A"}</div>
                        <div className="text-xs text-ink"><strong>Relation:</strong> {empProfile.employee.emergencyContactRelation || "N/A"}</div>
                      </div>
                    </div>

                    {/* Compensation & Salary Structure */}
                    <div className="rounded-md border border-line bg-canvas p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-accent" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                            Salary & Compensation Breakdown
                          </h4>
                        </div>
                        {empProfile.salary && (
                          <span className="font-mono text-xs font-bold text-emerald-800">
                            CTC: ₹{empProfile.salary.netMonthlyPay?.toLocaleString("en-IN")}/mo Net
                          </span>
                        )}
                      </div>
                      {empProfile.salary ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-muted block text-[10px]">Base Salary:</span>
                            <span className="font-mono font-bold text-ink">₹{empProfile.salary.basePayMonthly?.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-muted block text-[10px]">House Rent (HRA):</span>
                            <span className="font-mono font-bold text-ink">₹{empProfile.salary.hraMonthly?.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-muted block text-[10px]">Site Allowance:</span>
                            <span className="font-mono font-bold text-ink">₹{empProfile.salary.siteAllowanceMonthly?.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-muted block text-[10px]">Gross Monthly:</span>
                            <span className="font-mono font-bold text-ink">₹{empProfile.salary.grossMonthlySalary?.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted">No salary structure configured for this employee.</p>
                      )}
                    </div>

                    {/* Compliance & Verification Documents */}
                    <div className="rounded-md border border-line bg-canvas p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-accent" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                            Compliance Documents & ID Vault
                          </h4>
                        </div>
                        <button
                          onClick={() => {
                            setDocData({
                              documentType: "AADHAAR_CARD",
                              title: "",
                              fileName: "",
                              fileUrl: "",
                            });
                            setShowDocModal(true);
                          }}
                          className="flex items-center gap-1 rounded border border-line bg-panel px-2 py-1 text-[11px] font-medium text-ink hover:bg-stone/20"
                        >
                          <Upload className="h-3 w-3 text-accent" />
                          Add Document
                        </button>
                      </div>

                      <div className="space-y-2">
                        {empProfile.documents && empProfile.documents.length > 0 ? (
                          empProfile.documents.map((doc: any) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between rounded border border-line/60 bg-panel px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted" />
                                <div>
                                  <div className="font-medium text-ink">{doc.title}</div>
                                  <div className="text-[10px] text-muted">
                                    {doc.documentType} &bull; {doc.fileName}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    doc.verificationStatus === "VERIFIED"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : doc.verificationStatus === "REJECTED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {doc.verificationStatus}
                                </span>
                                {doc.verificationStatus === "PENDING" && (
                                  <div className="flex items-center gap-1 ml-2">
                                    <button
                                      onClick={() => handleVerifyDocument(doc.id, "VERIFIED")}
                                      className="rounded bg-emerald-700 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-800"
                                    >
                                      Verify
                                    </button>
                                    <button
                                      onClick={() => handleVerifyDocument(doc.id, "REJECTED")}
                                      className="rounded bg-red-700 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-red-800"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted">No documents uploaded yet.</p>
                        )}
                      </div>
                    </div>

                    {/* Change & Audit History */}
                    <div className="rounded-md border border-line bg-canvas p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <History className="h-4 w-4 text-accent" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                          Lifecycle Change History
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {empProfile.history && empProfile.history.length > 0 ? (
                          empProfile.history.map((hist: any) => (
                            <div key={hist.id} className="text-xs border-l-2 border-accent pl-3 py-1">
                              <div className="font-semibold text-ink">
                                {hist.eventType}: {hist.toValue || "Recorded"}
                              </div>
                              <div className="text-[10px] text-muted">
                                {new Date(hist.createdAt).toLocaleString()} &bull; Reason: {hist.reason || "N/A"}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted">No lifecycle changes recorded.</p>
                        )}
                      </div>
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Register Employee */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-line bg-panel p-6 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-ink">Register New Enterprise Employee</h3>
                <p className="text-xs text-muted">
                  Serial ID will be automatically generated with standard sequence (e.g. EMP-APEX-XXX)
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded p-1 text-muted hover:bg-stone/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {actionError && (
              <div className="mb-4 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-800">
                {actionError}
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Corporate Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Employment Type *</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as any })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  >
                    <option value="PERMANENT">Permanent</option>
                    <option value="PROBATION">Probation</option>
                    <option value="TEMPORARY">Temporary</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t border-line/60 pt-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Base Monthly Pay (₹)</label>
                  <input
                    type="number"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">HRA Allowance (₹)</label>
                  <input
                    type="number"
                    value={formData.hra}
                    onChange={(e) => setFormData({ ...formData, hra: Number(e.target.value) })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Site Allowance (₹)</label>
                  <input
                    type="number"
                    value={formData.siteAllowance}
                    onChange={(e) => setFormData({ ...formData, siteAllowance: Number(e.target.value) })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-line/60 pt-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded bg-ink px-4 py-1.5 text-xs font-medium text-canvas hover:bg-ink/90 flex items-center gap-1.5"
                >
                  {actionLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                  Register Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload Document */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-xl">
            <h3 className="text-sm font-bold text-ink mb-3">Add Compliance Document</h3>
            <form onSubmit={handleAddDocument} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">Document Type</label>
                <select
                  value={docData.documentType}
                  onChange={(e) => setDocData({ ...docData, documentType: e.target.value })}
                  className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                >
                  <option value="AADHAAR_CARD">Aadhaar Card</option>
                  <option value="PAN_CARD">PAN Card</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                  <option value="POLICE_VERIFICATION">Police Verification</option>
                  <option value="MEDICAL_FITNESS">Medical Fitness Certificate</option>
                  <option value="SAFETY_TRAINING_CERT">Safety Training Certificate</option>
                  <option value="EMPLOYMENT_CONTRACT">Employment Contract</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aadhaar Card Copy"
                  value={docData.title}
                  onChange={(e) => setDocData({ ...docData, title: e.target.value })}
                  className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">File Name</label>
                <input
                  type="text"
                  required
                  placeholder="aadhaar_front.pdf"
                  value={docData.fileName}
                  onChange={(e) => setDocData({ ...docData, fileName: e.target.value })}
                  className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="rounded border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded bg-ink px-4 py-1.5 text-xs font-medium text-canvas hover:bg-ink/90 flex items-center gap-1.5"
                >
                  {actionLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                  Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk CSV Import */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl rounded-lg border border-line bg-panel p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <h3 className="text-sm font-bold text-ink">Bulk Import Employee Roster (CSV)</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="rounded p-1 text-muted hover:bg-stone/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {actionError && (
              <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-800">
                {actionError}
              </div>
            )}

            {importResult && (
              <div className="mb-4 rounded border border-line bg-canvas p-3 text-xs space-y-1">
                <div className="font-bold text-emerald-800">
                  Import Summary: {importResult.importedCount} records successfully imported.
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="text-red-700">
                    Failed rows: {importResult.errors.length}
                    <ul className="list-disc pl-4 text-[11px] mt-1">
                      {importResult.errors.map((err: any, i: number) => (
                        <li key={i}>Row {err.row}: {err.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleBulkImport} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">
                  Paste Raw CSV Data (Header Required):
                </label>
                <textarea
                  rows={8}
                  required
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full rounded border border-line bg-canvas p-2.5 font-mono text-xs text-ink focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="rounded border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/20"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded bg-ink px-4 py-1.5 text-xs font-medium text-canvas hover:bg-ink/90 flex items-center gap-1.5"
                >
                  {actionLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                  Execute Bulk Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
