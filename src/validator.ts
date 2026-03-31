/**
 * Lightsheet folder-structure validation engine.
 *
 * ## Quick start
 *
 * ```ts
 * import { validate } from "./validator";
 * import type { FolderNode } from "./types";
 *
 * const tree: FolderNode = {
 *   name: "lightsheet",
 *   type: "directory",
 *   children: [
 *     {
 *       name: "prado",
 *       type: "directory",
 *       children: [
 *         {
 *           name: "mouse_app_batch1",
 *           type: "directory",
 *           children: [
 *             { name: "README.md", type: "file" },
 *             {
 *               name: "raw",
 *               type: "directory",
 *               children: [
 *                 {
 *                   name: "tif_4x",
 *                   type: "directory",
 *                   children: [
 *                     {
 *                       name: "a_AS134F1",
 *                       type: "directory",
 *                       children: [{ name: "tile_001.tif", type: "file" }],
 *                     },
 *                   ],
 *                 },
 *               ],
 *             },
 *           ],
 *         },
 *       ],
 *     },
 *   ],
 * };
 *
 * const report = validate(tree);
 * console.log(report.valid); // true
 * ```
 *
 * ## Adding new rules
 *
 * 1. Add an entry to `RULES` in `rules.ts`.
 * 2. Call the rule helper (or inline logic) inside the appropriate
 *    `validate*` function in this file.
 * 3. Add Jest tests to `tests/validator.test.ts`.
 */

import type { FolderNode, ValidationIssue, ValidationReport } from "./types";
import {
  BAG_ID_PATTERN,
  DERIVATIVES_FOLDER_PATTERN,
  LIGHTSHEET_ID_PATTERN,
  PI_ID_PATTERN,
  PROJECT_ID_PATTERN,
  RAW_FOLDER_PATTERN,
  RULES,
  SUBJECT_ID_PATTERN,
} from "./rules";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build a path string from parent path + child name. */
function joinPath(parent: string, name: string): string {
  return parent ? `${parent}/${name}` : name;
}

/** Resolve the `path` field for every node in the tree (mutates a copy). */
function normalisePaths(node: FolderNode, parentPath: string): FolderNode {
  const currentPath = joinPath(parentPath, node.name);
  // Do not recurse into .zarr stores — they can contain millions of files.
  if (node.type === "directory" && node.name.endsWith(".zarr")) {
    return { ...node, path: currentPath, children: [] };
  }
  const children = node.children?.map((c) => normalisePaths(c, currentPath));
  return { ...node, path: currentPath, children };
}

/** Convenience – push one issue onto the issues array. */
function addIssue(
  issues: ValidationIssue[],
  ruleId: keyof typeof RULES,
  message: string,
  path: string,
  severity: ValidationIssue["severity"],
  suggestedFix?: string,
): void {
  const issue: ValidationIssue = { ruleId, message, path, severity };
  if (suggestedFix !== undefined) {
    issue.suggestedFix = suggestedFix;
  }
  issues.push(issue);
}

// ---------------------------------------------------------------------------
// Level validators
// ---------------------------------------------------------------------------

/**
 * Validate a PI-level directory (`lightsheet/<pi_id>/`).
 *
 * Checks:
 *  - RULE: PI_ID_LOWERCASE – name must match `[a-z]+`
 *  - Recurses into each child project directory
 */
function validatePiLevel(piNode: FolderNode, issues: ValidationIssue[]): void {
  const path = piNode.path ?? piNode.name;

  if (!PI_ID_PATTERN.test(piNode.name)) {
    addIssue(
      issues,
      "PI_ID_LOWERCASE",
      `PI directory '${piNode.name}' is invalid: pi_id must be lowercase letters only (a–z).`,
      path,
      "error",
      `Rename to '${piNode.name.toLowerCase().replace(/[^a-z]/g, "")}'.`,
    );
  }

  for (const child of piNode.children ?? []) {
    if (child.type === "directory") {
      validateProjectLevel(child, issues);
    }
  }
}

/**
 * Validate a project-level directory (`lightsheet/<pi_id>/<project_id>/`).
 *
 * Checks:
 *  - RULE: PROJECT_ID_FORMAT   – name must match `[a-z0-9_]+`
 *  - RULE: PROJECT_REQUIRES_RAW    – must contain a `raw/` child directory
 *  - RULE: PROJECT_REQUIRES_README – must contain a `README.md` child file
 *  - Recurses into `raw/`, `bids/`, and `derivatives/` subdirectories
 */
function validateProjectLevel(
  projectNode: FolderNode,
  issues: ValidationIssue[],
): void {
  const path = projectNode.path ?? projectNode.name;
  const children = projectNode.children ?? [];

  if (!PROJECT_ID_PATTERN.test(projectNode.name)) {
    addIssue(
      issues,
      "PROJECT_ID_FORMAT",
      `Project directory '${projectNode.name}' is invalid: project_id must be lowercase and contain only letters, numbers, and underscores.`,
      path,
      "error",
      `Rename to a string matching [a-z0-9_]+.`,
    );
  }

  const hasRaw = children.some(
    (c) => c.type === "directory" && c.name === "raw",
  );
  if (!hasRaw) {
    addIssue(
      issues,
      "PROJECT_REQUIRES_RAW",
      `Project directory '${projectNode.name}' is missing a required 'raw/' subdirectory.`,
      path,
      "error",
      `Create a 'raw/' directory inside '${path}'.`,
    );
  }

  const hasReadme = children.some(
    (c) => c.type === "file" && c.name === "README.md",
  );
  if (!hasReadme) {
    addIssue(
      issues,
      "PROJECT_REQUIRES_README",
      `Project directory '${projectNode.name}' is missing a required 'README.md' file.`,
      path,
      "error",
      `Create a 'README.md' file inside '${path}'.`,
    );
  }

  for (const child of children) {
    if (child.type === "directory") {
      if (child.name === "raw") {
        validateRawDirectory(child, issues);
      } else if (child.name === "derivatives") {
        validateDerivativesDirectory(child, issues);
      }
      // bids/ and etc/ have no structural rules enforced by this validator
    }
  }
}

/**
 * Validate the `raw/` directory inside a project.
 *
 * Checks:
 *  - RULE: RAW_FOLDER_NAMING – each child directory must match the acquisition pattern
 *  - Recurses into each acquisition folder
 */
function validateRawDirectory(
  rawNode: FolderNode,
  issues: ValidationIssue[],
): void {
  for (const child of rawNode.children ?? []) {
    if (child.type === "directory") {
      validateAcquisitionFolder(child, issues);
    }
  }
}

/**
 * Validate a raw acquisition folder (`tif_4x`, `ims_4x_stitched`, …).
 *
 * Checks:
 *  - RULE: RAW_FOLDER_NAMING        – name must match the raw-folder pattern
 *  - RULE: ACQ_FOLDER_ONLY_SUBDIRS  – no files at the acquisition folder level
 *  - Recurses into sample-level directories, passing whether this is a tif_ folder
 */
function validateAcquisitionFolder(
  acqNode: FolderNode,
  issues: ValidationIssue[],
): void {
  const path = acqNode.path ?? acqNode.name;

  if (!RAW_FOLDER_PATTERN.test(acqNode.name)) {
    addIssue(
      issues,
      "RAW_FOLDER_NAMING",
      `Acquisition folder '${acqNode.name}' does not match the required pattern '<tif|ims>_<objective>x[<zoom>][_<proc>]'.`,
      path,
      "error",
      `Rename using the pattern, e.g. 'tif_4x' or 'ims_4x_stitched'.`,
    );
  }

  const isTif = acqNode.name.startsWith("tif_");

  for (const child of acqNode.children ?? []) {
    if (child.type === "file") {
      addIssue(
        issues,
        "ACQ_FOLDER_ONLY_SUBDIRS",
        `Acquisition folder '${acqNode.name}' contains a file '${child.name}' at the top level; only lightsheet_id subdirectories are allowed here.`,
        path,
        "error",
        `Move '${child.name}' into a lightsheet_id subdirectory inside '${path}'.`,
      );
    } else {
      validateSampleFolder(child, issues, isTif);
    }
  }
}

/**
 * Validate a sample folder (lightsheet_id directory).
 *
 * Checks:
 *  - RULE: SAMPLE_NO_WHITESPACE     – name must contain no whitespace
 *  - RULE: SAMPLE_BAG_ID_FORMAT     – first segment must be a single letter
 *  - RULE: SAMPLE_SUBJECT_ID_FORMAT – second segment must be letters/numbers only
 *  - RULE: TIFF_SAMPLE_NO_SUBDIRS   – tif_ sample folders must not contain subdirectories
 *  - RULE: IMS_SAMPLE_MULTIPLE_IMS  – ims_ sample folders should contain only one .ims file
 */
function validateSampleFolder(
  sampleNode: FolderNode,
  issues: ValidationIssue[],
  isTifAcquisition: boolean,
): void {
  const path = sampleNode.path ?? sampleNode.name;
  const name = sampleNode.name;

  // Whitespace check (fast fail)
  if (/\s/.test(name)) {
    addIssue(
      issues,
      "SAMPLE_NO_WHITESPACE",
      `Sample folder '${name}' contains whitespace, which is not allowed.`,
      path,
      "error",
      `Remove all spaces from the folder name.`,
    );
    // We still continue with remaining checks on the segments we can parse
  }

  if (!LIGHTSHEET_ID_PATTERN.test(name)) {
    // Determine which segment is failing for a more targeted message
    const segments = name.split("_");
    const bagId = segments[0] ?? "";
    const subjectId = segments[1] ?? "";

    if (!BAG_ID_PATTERN.test(bagId)) {
      addIssue(
        issues,
        "SAMPLE_BAG_ID_FORMAT",
        `Sample folder '${name}' has an invalid bag_id '${bagId}': must be a single letter (a–z or A–Z).`,
        path,
        "error",
        `Use a single letter as bag_id (e.g. 'a', 'b', 'A').`,
      );
    }

    if (subjectId === "") {
      addIssue(
        issues,
        "SAMPLE_SUBJECT_ID_FORMAT",
        `Sample folder '${name}' is missing a subject_id (expected format: <bag_id>_<subject_id>).`,
        path,
        "error",
        `Add a subject_id after the bag_id, e.g. 'a_AS134F1'.`,
      );
    } else if (!SUBJECT_ID_PATTERN.test(subjectId)) {
      addIssue(
        issues,
        "SAMPLE_SUBJECT_ID_FORMAT",
        `Sample folder '${name}' has an invalid subject_id '${subjectId}': must contain letters and numbers only.`,
        path,
        "error",
        `Use only letters and numbers in the subject_id.`,
      );
    }
  }

  // tif_ sample folders must NOT contain subdirectories
  if (isTifAcquisition) {
    for (const child of sampleNode.children ?? []) {
      if (child.type === "directory") {
        addIssue(
          issues,
          "TIFF_SAMPLE_NO_SUBDIRS",
          `Sample folder '${name}' inside a tif_* acquisition folder MUST NOT contain subdirectories (found '${child.name}').`,
          path,
          "error",
          `Move all TIFF tiles directly into '${path}' and remove the subdirectory.`,
        );
      }
    }
  } else {
    // ims_ sample folders: warn if more than one .ims file is present
    const imsFiles = (sampleNode.children ?? []).filter(
      (c) => c.type === "file" && c.name.endsWith(".ims"),
    );
    if (imsFiles.length > 1) {
      addIssue(
        issues,
        "IMS_SAMPLE_MULTIPLE_IMS",
        `Sample folder '${name}' inside an ims_* acquisition folder contains ${imsFiles.length} .ims files; typically only one is expected.`,
        path,
        "warning",
        `Remove extra .ims files or confirm that multiple versions are intentional.`,
      );
    }
  }
}

/**
 * Validate the `derivatives/` directory.
 *
 * Checks:
 *  - RULE: DERIVATIVES_FOLDER_NAMING (warning) – each subfolder should follow `<name>_<version>`
 */
function validateDerivativesDirectory(
  derivativesNode: FolderNode,
  issues: ValidationIssue[],
): void {
  for (const child of derivativesNode.children ?? []) {
    if (child.type === "directory") {
      const childPath = child.path ?? child.name;
      if (!DERIVATIVES_FOLDER_PATTERN.test(child.name)) {
        addIssue(
          issues,
          "DERIVATIVES_FOLDER_NAMING",
          `Derivatives subfolder '${child.name}' does not follow the recommended pattern '<pipeline_name>_<version>' (e.g. 'spimquant_v0.4.0').`,
          childPath,
          "warning",
          `Rename using the pattern, e.g. 'spimquant_v0.4.0rc1'.`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate an abstract folder tree against the lightsheet naming standard.
 *
 * The `root` node represents the **top-most directory that will be examined**.
 * It should be a directory named `"lightsheet"` to satisfy LIGHTSHEET_ROOT;
 * alternatively it can be an ancestor (e.g. the filesystem root) – in that
 * case the validator looks for a `lightsheet` child among the root's children.
 *
 * @param root - Root of the abstract folder tree to validate.
 * @returns A {@link ValidationReport} with all findings.
 *
 * @example
 * ```ts
 * const report = validate({ name: "lightsheet", type: "directory", children: [] });
 * ```
 */
export function validate(root: FolderNode): ValidationReport {
  const issues: ValidationIssue[] = [];

  // Resolve paths so every node has a usable `path` string
  const normRoot = normalisePaths(root, "");

  let lightsheetNode: FolderNode | undefined;

  if (normRoot.name === "lightsheet" && normRoot.type === "directory") {
    // The caller passed the lightsheet/ directory directly
    lightsheetNode = normRoot;
  } else if (normRoot.type === "directory") {
    // Look for a lightsheet/ child (e.g. caller passed the filesystem root)
    lightsheetNode = (normRoot.children ?? []).find(
      (c) => c.name === "lightsheet" && c.type === "directory",
    );
    if (!lightsheetNode) {
      addIssue(
        issues,
        "LIGHTSHEET_ROOT",
        "No 'lightsheet/' directory found at the root. All lightsheet data MUST live under a top-level 'lightsheet/' directory.",
        normRoot.path ?? normRoot.name,
        "error",
        "Create a top-level 'lightsheet/' directory and move all lightsheet data into it.",
      );
    }
  }

  if (lightsheetNode) {
    // Walk PI directories
    for (const piChild of lightsheetNode.children ?? []) {
      if (piChild.type === "directory") {
        validatePiLevel(piChild, issues);
      }
    }
  }

  return {
    valid: issues.every((i) => i.severity !== "error"),
    issues,
  };
}
