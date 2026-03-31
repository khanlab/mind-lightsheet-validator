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

/**
 * The complete report returned by the validator after inspecting a tree.
 */
export interface ValidationReport {
  /** `true` when no errors are present (warnings are allowed). */
  valid: boolean;
  /** All findings produced during validation, in tree-walk order. */
  issues: ValidationIssue[];
}
