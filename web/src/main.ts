/**
 * Browser UI — Lightsheet Folder Validator
 *
 * Uses the File System Access API to let the user pick a local directory,
 * traverses the file/folder tree, runs the core validator, and renders the
 * results — all without a backend server.
 */

import { validate } from "@validator/validator";
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

function renderBadge(label: string, count: number, variant: string): HTMLSpanElement {
  const badge = document.createElement("span");
  badge.className = `badge badge--${variant}`;
  badge.textContent = `${label}: ${count}`;
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
  summaryRow.innerHTML = "";
  issueList.innerHTML = "";

  const errors = report.issues.filter((i) => i.severity === "error").length;
  const warnings = report.issues.filter((i) => i.severity === "warning").length;
  const infos = report.issues.filter((i) => i.severity === "info").length;

  if (report.valid && errors === 0) {
    summaryRow.appendChild(renderBadge("✅ Valid", 1, "success"));
  } else {
    summaryRow.appendChild(renderBadge("❌ Invalid", 1, "error"));
  }
  if (errors > 0) summaryRow.appendChild(renderBadge("Errors", errors, "error"));
  if (warnings > 0) summaryRow.appendChild(renderBadge("Warnings", warnings, "warning"));
  if (infos > 0) summaryRow.appendChild(renderBadge("Info", infos, "info"));

  if (report.issues.length === 0) {
    const noIssues = document.createElement("div");
    noIssues.className = "no-issues";
    noIssues.textContent = "🎉 No issues found! Your folder structure looks great.";
    issueList.appendChild(noIssues);
  } else {
    // Sort: errors first, then warnings, then info
    const sorted = [...report.issues].sort((a, b) => {
      const order: Record<string, number> = { error: 0, warning: 1, info: 2 };
      return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
    });
    sorted.forEach((issue) => issueList.appendChild(renderIssueItem(issue)));
  }
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
