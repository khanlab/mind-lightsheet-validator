/**
 * Core type definitions for the lightsheet folder validator.
 *
 * These types define the abstract folder-tree representation accepted by
 * the validation engine, as well as the report format it produces.
 */

// ---------------------------------------------------------------------------
// Abstract folder-tree representation
// ---------------------------------------------------------------------------

/**
 * Represents a single node in an abstract folder/file tree.
 * The validator operates purely on this structure – no filesystem I/O required.
 */
export interface FolderNode {
  /** Name of the file or directory (basename only, no path separators). */
  name: string;
  /** Whether this node is a file or a directory. */
  type: "file" | "directory";
  /**
   * Children of a directory node.
   * MUST be omitted or empty for file nodes.
   * MAY be empty for an empty directory.
   */
  children?: FolderNode[];
  /**
   * Full path from the validation root, e.g. `"lightsheet/prado/myproject/raw"`.
   * Populated automatically by the validator; callers may leave it undefined.
   */
  path?: string;
}

// ---------------------------------------------------------------------------
// Validation report types
// ---------------------------------------------------------------------------

/** Severity level of a validation finding. */
export type Severity = "error" | "warning" | "info";

/**
 * A single finding produced by the validation engine.
 *
 * Each finding is associated with exactly one rule and one path in the tree.
 */
export interface ValidationIssue {
  /** Unique identifier of the rule that produced this finding. */
  ruleId: string;
  /** Human-readable description of the violation or observation. */
  message: string;
  /** Path in the folder tree where the issue was detected. */
  path: string;
  /** Severity of the issue. */
  severity: Severity;
  /**
   * Optional machine-readable hint about how to resolve the issue.
   * Not guaranteed to be present for every finding.
   */
  suggestedFix?: string;
}

// ---------------------------------------------------------------------------
// Dataset summary types
// ---------------------------------------------------------------------------

/**
 * Validation status of a single node in the dataset summary.
 *  - `"valid"`   – no issues found at or below this node
 *  - `"warning"` – only warnings found (no errors)
 *  - `"error"`   – at least one error found
 */
export type SummaryStatus = "valid" | "warning" | "error";

/**
 * Summary entry for a single subject (lightsheet_id directory) found inside
 * one or more acquisition folders.
 */
export interface SubjectSummary {
  /** The lightsheet_id name, e.g. `"a_AS134F1"`. */
  id: string;
  /** Aggregated validation status across all acquisition folders this subject appears in. */
  status: SummaryStatus;
  /** Acquisition folder names where this subject was found, e.g. `["tif_4x", "ims_4x"]`. */
  acquisitions: string[];
}

/** Summary entry for a project directory. */
export interface ProjectSummary {
  /** The project directory name (project_id). */
  id: string;
  /** Full path from the validation root, e.g. `"lightsheet/prado/myproject"`. */
  path: string;
  /** Aggregated validation status for this project and all its children. */
  status: SummaryStatus;
  /** Whether a `raw/` subdirectory was found. */
  hasRaw: boolean;
  /** Whether a `README.md` file was found. */
  hasReadme: boolean;
  /** Subjects found within this project's raw acquisition folders. */
  subjects: SubjectSummary[];
}

/** Summary entry for a PI directory. */
export interface PISummary {
  /** The PI directory name (pi_id). */
  id: string;
  /** Full path from the validation root, e.g. `"lightsheet/prado"`. */
  path: string;
  /** Aggregated validation status for this PI and all its children. */
  status: SummaryStatus;
  /** Projects found within this PI directory. */
  projects: ProjectSummary[];
}

/**
 * Dataset hierarchy summary included in a {@link ValidationReport}.
 *
 * Provides a concise pi → project → subject overview so callers can quickly
 * see what data is present and whether each item passed validation, without
 * parsing the full issues list.
 */
export interface DatasetSummary {
  /** PI-level entries discovered during validation. */
  pis: PISummary[];
}

// ---------------------------------------------------------------------------
// Validation report
// ---------------------------------------------------------------------------

/**
 * The complete report returned by the validator after inspecting a tree.
 */
export interface ValidationReport {
  /** `true` when no errors are present (warnings are allowed). */
  valid: boolean;
  /** All findings produced during validation, in tree-walk order. */
  issues: ValidationIssue[];
  /**
   * Hierarchical pi → project → subject summary.
   * Present when validation starts at the lightsheet root (`validate()`) or
   * PI level (`validateFromPI()`); absent for project-level entry points.
   */
  summary?: DatasetSummary;
}
