/**
 * Browser UI — Lightsheet Folder Validator
 *
 * Uses the File System Access API to let the user pick a local directory,
 * traverses the file/folder tree, runs the core validator, and renders the
 * results — all without a backend server.
 */

import { validate } from "@validator/validator";
import { RULES } from "@validator/rules";
import type { FolderNode, ValidationIssue, ValidationReport } from "@validator/types";
import "./style.css";

// ---------------------------------------------------------------------------
// DOM element references
// ---------------------------------------------------------------------------

const compatWarning = document.getElementById("compat-warning") as HTMLDivElement;
const pickerSection = document.getElementById("picker-section") as HTMLElement;
const pickBtn = document.getElementById("pick-btn") as HTMLButtonElement;
const selectedPath = document.getElementById("selected-path") as HTMLDivElement;
const progressSection = document.getElementById("progress-section") as HTMLElement;
const progressMsg = document.getElementById("progress-msg") as HTMLParagraphElement;
const resultsSection = document.getElementById("results-section") as HTMLElement;
const summaryRow = document.getElementById("summary-row") as HTMLDivElement;
const issueList = document.getElementById("issue-list") as HTMLDivElement;
const rerunBtn = document.getElementById("rerun-btn") as HTMLButtonElement;
const errorSection = document.getElementById("error-section") as HTMLElement;
const errorMsg = document.getElementById("error-msg") as HTMLParagraphElement;
const errorRerunBtn = document.getElementById("error-rerun-btn") as HTMLButtonElement;

// New control references
const filterBtns = Array.from(
  document.querySelectorAll<HTMLButtonElement>(".filter-btn"),
);
const groupBySelect = document.getElementById("group-by") as HTMLSelectElement;
const ruleSummaryDiv = document.getElementById("rule-summary") as HTMLDivElement;
const exportJsonBtn = document.getElementById("export-json-btn") as HTMLButtonElement;
const exportCsvBtn = document.getElementById("export-csv-btn") as HTMLButtonElement;

// ---------------------------------------------------------------------------
// UI state
// ---------------------------------------------------------------------------

let currentReport: ValidationReport | null = null;
let currentFilter = "all";
let currentGroupBy = "severity";

// ---------------------------------------------------------------------------
// Browser compatibility check
// ---------------------------------------------------------------------------

const hasFileSystemAccess =
  typeof window !== "undefined" &&
  "showDirectoryPicker" in window;

if (!hasFileSystemAccess) {
  compatWarning.classList.remove("hidden");
  pickBtn.disabled = true;
}

// ---------------------------------------------------------------------------
// File System Access API — tree traversal
// ---------------------------------------------------------------------------

/**
 * Recursively traverse a `FileSystemDirectoryHandle` and build an abstract
 * `FolderNode` tree that the validator can consume.
 */
async function traverseDirectory(
  handle: FileSystemDirectoryHandle,
  onProgress?: (message: string) => void,
): Promise<FolderNode> {
  const children: FolderNode[] = [];

  for await (const [name, entry] of handle) {
    if (entry.kind === "directory") {
      if (name.endsWith(".zarr")) {
        // Do not recurse into .zarr stores — they can contain millions of files.
        children.push({ name, type: "directory", children: [] });
      } else {
        onProgress?.(`Scanning ${name}/…`);
        const child = await traverseDirectory(entry as FileSystemDirectoryHandle, onProgress);
        children.push(child);
      }
    } else {
      children.push({ name, type: "file" });
    }
  }

  return { name: handle.name, type: "directory", children };
}

// ---------------------------------------------------------------------------
// UI state helpers
// ---------------------------------------------------------------------------

function showSection(section: HTMLElement): void {
  [pickerSection, progressSection, resultsSection, errorSection].forEach(
    (s) => s.classList.add("hidden"),
  );
  section.classList.remove("hidden");
}

function resetToPickerView(): void {
  selectedPath.textContent = "";
  selectedPath.classList.add("hidden");
  pickBtn.disabled = !hasFileSystemAccess;
  showSection(pickerSection);
}

// ---------------------------------------------------------------------------
// Results rendering
// ---------------------------------------------------------------------------

function renderBadge(label: string, count: number | undefined, variant: string): HTMLSpanElement {
  const badge = document.createElement("span");
  badge.className = `badge badge--${variant}`;
  badge.textContent = count !== undefined ? `${label}: ${count}` : label;
  return badge;
}

function renderIssueItem(issue: ValidationIssue): HTMLDivElement {
  const div = document.createElement("div");
  div.className = `issue-item issue-item--${issue.severity}`;

  const header = document.createElement("div");
  header.className = "issue-item__header";

  const severityTag = document.createElement("span");
  severityTag.className = `issue-item__severity severity-${issue.severity}`;
  severityTag.textContent = issue.severity;

  const ruleId = document.createElement("span");
  ruleId.textContent = issue.ruleId;

  header.appendChild(severityTag);
  header.appendChild(ruleId);

  const path = document.createElement("div");
  path.className = "issue-item__path";
  path.textContent = issue.path;

  const message = document.createElement("div");
  message.className = "issue-item__message";
  message.textContent = issue.message;

  div.appendChild(header);
  div.appendChild(path);
  div.appendChild(message);

  if (issue.suggestedFix) {
    const fix = document.createElement("div");
    fix.className = "issue-item__fix";
    fix.textContent = `💡 ${issue.suggestedFix}`;
    div.appendChild(fix);
  }

  return div;
}

function renderResults(report: ValidationReport): void {
  currentReport = report;
  currentFilter = "all";
  currentGroupBy = groupBySelect.value;

  summaryRow.innerHTML = "";

  const errors = report.issues.filter((i) => i.severity === "error").length;
  const warnings = report.issues.filter((i) => i.severity === "warning").length;
  const infos = report.issues.filter((i) => i.severity === "info").length;

  if (report.valid && errors === 0) {
    summaryRow.appendChild(renderBadge("✅ Valid", undefined, "success"));
  } else {
    summaryRow.appendChild(renderBadge("❌ Invalid", undefined, "error"));
  }
  if (errors > 0) summaryRow.appendChild(renderBadge("Errors", errors, "error"));
  if (warnings > 0) summaryRow.appendChild(renderBadge("Warnings", warnings, "warning"));
  if (infos > 0) summaryRow.appendChild(renderBadge("Info", infos, "info"));

  // Reset filter button active state
  filterBtns.forEach((btn) => {
    const isAll = btn.dataset.filter === "all";
    btn.classList.toggle("filter-btn--active", isAll);
    btn.setAttribute("aria-pressed", String(isAll));
  });

  renderRuleSummary(report);
  refreshIssueList();
}

// ---------------------------------------------------------------------------
// Rule status summary
// ---------------------------------------------------------------------------

function renderRuleSummary(report: ValidationReport): void {
  ruleSummaryDiv.innerHTML = "";

  const table = document.createElement("table");
  table.className = "rule-summary-table";
  table.setAttribute("role", "table");

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Rule ID", "Status", "Issues", "Description"].forEach((text) => {
    const th = document.createElement("th");
    th.setAttribute("scope", "col");
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const [key, rule] of Object.entries(RULES)) {
    const ruleIssues = report.issues.filter((i) => i.ruleId === key);
    const hasErrors = ruleIssues.some((i) => i.severity === "error");
    const hasWarnings = ruleIssues.some((i) => i.severity === "warning");
    const status = hasErrors ? "fail" : hasWarnings ? "warn" : "pass";

    const tr = document.createElement("tr");
    tr.className = `rule-row rule-row--${status}`;

    const tdRule = document.createElement("td");
    tdRule.className = "rule-id";
    tdRule.textContent = key;

    const tdStatus = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className = `rule-status rule-status--${status}`;
    statusBadge.textContent =
      status === "fail" ? "❌ Fail" : status === "warn" ? "⚠️ Warn" : "✅ Pass";
    tdStatus.appendChild(statusBadge);

    const tdCount = document.createElement("td");
    tdCount.className = "rule-count";
    tdCount.textContent = ruleIssues.length > 0 ? String(ruleIssues.length) : "—";

    const tdDesc = document.createElement("td");
    tdDesc.textContent = rule.description;

    tr.appendChild(tdRule);
    tr.appendChild(tdStatus);
    tr.appendChild(tdCount);
    tr.appendChild(tdDesc);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  ruleSummaryDiv.appendChild(table);
}

// ---------------------------------------------------------------------------
// Grouped / filtered issue rendering
// ---------------------------------------------------------------------------

function getFilteredIssues(report: ValidationReport, filter: string): ValidationIssue[] {
  if (filter === "all") return report.issues;
  return report.issues.filter((i) => i.severity === filter);
}

function renderIssueGroup(title: string, issues: ValidationIssue[]): HTMLElement {
  const container = document.createElement("div");
  container.className = "issue-group";

  const header = document.createElement("div");
  header.className = "issue-group__header";
  header.setAttribute("role", "heading");
  header.setAttribute("aria-level", "3");
  header.textContent = title;
  container.appendChild(header);

  issues.forEach((issue) => container.appendChild(renderIssueItem(issue)));
  return container;
}

function renderGroupedIssues(issues: ValidationIssue[], groupBy: string): void {
  issueList.innerHTML = "";

  if (issues.length === 0) {
    const noIssues = document.createElement("div");
    noIssues.className = "no-issues";
    noIssues.textContent =
      currentFilter === "all"
        ? "🎉 No issues found! Your folder structure looks great."
        : "No issues of this type found.";
    issueList.appendChild(noIssues);
    return;
  }

  if (groupBy === "none") {
    const sorted = [...issues].sort((a, b) => {
      const order: Record<string, number> = { error: 0, warning: 1, info: 2 };
      return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
    });
    sorted.forEach((issue) => issueList.appendChild(renderIssueItem(issue)));
    return;
  }

  if (groupBy === "severity") {
    const groups: Record<string, ValidationIssue[]> = { error: [], warning: [], info: [] };
    issues.forEach((i) => {
      (groups[i.severity] ??= []).push(i);
    });
    const labels: Record<string, string> = {
      error: "❌ Errors",
      warning: "⚠️ Warnings",
      info: "ℹ️ Info",
    };
    for (const sev of ["error", "warning", "info"]) {
      const group = groups[sev] ?? [];
      if (group.length === 0) continue;
      issueList.appendChild(
        renderIssueGroup(`${labels[sev]} (${group.length})`, group),
      );
    }
    return;
  }

  if (groupBy === "rule") {
    const groups = new Map<string, ValidationIssue[]>();
    issues.forEach((i) => {
      if (!groups.has(i.ruleId)) groups.set(i.ruleId, []);
      groups.get(i.ruleId)!.push(i);
    });
    for (const [ruleId, group] of groups) {
      issueList.appendChild(renderIssueGroup(`${ruleId} (${group.length})`, group));
    }
    return;
  }

  if (groupBy === "path") {
    const groups = new Map<string, ValidationIssue[]>();
    issues.forEach((i) => {
      const parts = i.path.split("/");
      const segment = parts.slice(0, 3).join("/") || i.path || "/";
      if (!groups.has(segment)) groups.set(segment, []);
      groups.get(segment)!.push(i);
    });
    for (const [seg, group] of groups) {
      issueList.appendChild(
        renderIssueGroup(`📁 ${seg} (${group.length})`, group),
      );
    }
    return;
  }
}

function refreshIssueList(): void {
  if (!currentReport) return;
  const filtered = getFilteredIssues(currentReport, currentFilter);
  renderGroupedIssues(filtered, currentGroupBy);
}

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------

function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAsJson(): void {
  if (!currentReport) return;
  downloadFile(
    "validation-report.json",
    JSON.stringify(currentReport, null, 2),
    "application/json",
  );
}

function exportAsCsv(): void {
  if (!currentReport) return;
  const headers = ["severity", "ruleId", "path", "message", "suggestedFix"];
  const escape = (v: unknown) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = currentReport.issues.map((i) =>
    [i.severity, i.ruleId, i.path, i.message, i.suggestedFix ?? ""]
      .map(escape)
      .join(","),
  );
  downloadFile(
    "validation-report.csv",
    [headers.join(","), ...rows].join("\n"),
    "text/csv",
  );
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

async function runValidation(): Promise<void> {
  // Prompt the user to pick a directory
  let dirHandle: FileSystemDirectoryHandle;
  try {
    dirHandle = await window.showDirectoryPicker({ mode: "read" });
  } catch (err) {
    // User cancelled the picker — stay on the picker screen silently
    if (err instanceof DOMException && err.name === "AbortError") return;
    throw err;
  }

  // Show selected folder name
  selectedPath.textContent = `📁 ${dirHandle.name}`;
  selectedPath.classList.remove("hidden");

  // Transition to progress view
  pickBtn.disabled = true;
  showSection(progressSection);
  progressMsg.textContent = "Scanning folder tree…";

  // Traverse the directory tree
  let tree: FolderNode;
  try {
    tree = await traverseDirectory(dirHandle, (msg) => {
      progressMsg.textContent = msg;
    });
  } catch (err) {
    showSection(pickerSection);
    pickBtn.disabled = !hasFileSystemAccess;
    errorMsg.textContent =
      err instanceof Error
        ? `Failed to read the folder: ${err.message}`
        : "An unknown error occurred while reading the folder.";
    showSection(errorSection);
    return;
  }

  // Run the validator
  progressMsg.textContent = "Running validation rules…";
  let report: ValidationReport;
  try {
    report = validate(tree);
  } catch (err) {
    errorMsg.textContent =
      err instanceof Error
        ? `Validation failed unexpectedly: ${err.message}`
        : "An unknown error occurred during validation.";
    showSection(errorSection);
    return;
  }

  // Render results
  renderResults(report);
  showSection(resultsSection);
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

pickBtn.addEventListener("click", () => {
  runValidation().catch((err: unknown) => {
    errorMsg.textContent =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    showSection(errorSection);
  });
});

rerunBtn.addEventListener("click", resetToPickerView);
errorRerunBtn.addEventListener("click", resetToPickerView);

// Filter buttons
filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter ?? "all";
    filterBtns.forEach((b) => {
      const active = b === btn;
      b.classList.toggle("filter-btn--active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    refreshIssueList();
  });
});

// Group-by select
groupBySelect.addEventListener("change", () => {
  currentGroupBy = groupBySelect.value;
  refreshIssueList();
});

// Export buttons
exportJsonBtn.addEventListener("click", exportAsJson);
exportCsvBtn.addEventListener("click", exportAsCsv);
