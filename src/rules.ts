/**
 * Formal rule definitions for the lightsheet folder/file naming standard.
 *
 * Each rule is described by:
 *  - a stable `id` used in ValidationIssue.ruleId
 *  - a human-readable `description`
 *  - a `test` function (or compiled pattern) used by the validator
 *
 * Adding a new rule:
 *  1. Add a `Rule` entry to the `RULES` object below.
 *  2. Call the rule inside `validator.ts` at the appropriate tree-walk level.
 *  3. Add Jest test cases covering both passing and failing examples.
 */

// ---------------------------------------------------------------------------
// Pattern constants (exported so tests can reference them directly)
// ---------------------------------------------------------------------------

/**
 * `pi_id` MUST be lowercase letters only (a–z).  No digits, underscores, or spaces.
 * @see README §2
 */
export const PI_ID_PATTERN = /^[a-z]+$/;

/**
 * `project_id` MUST be lowercase and contain only letters, numbers, and underscores.
 * @see README §3
 */
export const PROJECT_ID_PATTERN = /^[a-z0-9_]+$/;

/**
 * Raw-folder name MUST match:
 *   `<tif|ims>_<objective>x[<zoom>][_<proc>]`
 *
 * Components:
 *  - prefix:    `tif` or `ims`
 *  - objective: one or more digits followed by literal `x`
 *  - zoom:      optional block of digits immediately after the objective (no separator)
 *  - proc:      optional one or more `_<token>` suffixes where each token is alphanumeric
 *
 * @see README §5.1
 */
export const RAW_FOLDER_PATTERN =
  /^(tif|ims)_(\d+)x(\d+)?(_[a-z0-9]+)*$/;

/**
 * `bag_id` MUST be a single letter (a–z or A–Z).
 * @see README §6.1
 */
export const BAG_ID_PATTERN = /^[a-zA-Z]$/;

/**
 * `subject_id` MUST contain letters and numbers only.
 * @see README §6.2
 */
export const SUBJECT_ID_PATTERN = /^[a-zA-Z0-9]+$/;

/**
 * Full lightsheet_id = `<bag_id>_<subject_id>[_<modifier_id>]`
 *
 * The complete name:
 *  - First segment (bag_id):    single letter
 *  - Second segment (subject_id): letters and numbers
 *  - Remaining segments (modifier_id): one or more non-whitespace, non-underscore characters
 *    (underscore is exclusively a segment separator)
 *  - No whitespace anywhere
 *
 * Using `[^\s_]+` instead of `\S+` for modifier segments avoids ReDoS – it
 * prevents the ambiguity that arises when `_` (the separator) is also allowed
 * inside a segment body.
 *
 * @see README §6
 */
export const LIGHTSHEET_ID_PATTERN =
  /^[a-zA-Z]_[a-zA-Z0-9]+(_[^\s_]+)*$/;

/**
 * Derivatives subfolder naming SHOULD follow `<pipeline_name>_<version>`.
 *
 * Pattern breakdown:
 *  - Pipeline name:  one or more alphanumeric/underscore characters
 *  - Separator:      a single `_`
 *  - Version string: starts with an alphanumeric character, followed by
 *                    any combination of alphanumeric characters, dots, and hyphens
 *
 * Examples: `spimquant_v0.4.0rc1`, `spimquant_82c76d8`, `my_pipeline_v2.1-beta`
 * @see README §8
 */
export const DERIVATIVES_FOLDER_PATTERN =
  /^[a-zA-Z0-9][a-zA-Z0-9_]*_[a-zA-Z0-9][a-zA-Z0-9.\-]*$/;

// ---------------------------------------------------------------------------
// Rule registry
// ---------------------------------------------------------------------------

export interface Rule {
  /** Stable identifier referenced in ValidationIssue.ruleId. */
  id: string;
  /** Short human-readable description of what the rule enforces. */
  description: string;
}

/**
 * All rules in the lightsheet naming standard.
 *
 * Kept as a plain record so tooling can enumerate them for documentation or
 * reporting purposes without needing to run the full validator.
 */
export const RULES: Readonly<Record<string, Rule>> = {
  // ---- top-level ----------------------------------------------------------
  LIGHTSHEET_ROOT: {
    id: "LIGHTSHEET_ROOT",
    description:
      "All lightsheet data MUST live under a top-level directory named 'lightsheet/'.",
  },

  // ---- PI level -----------------------------------------------------------
  PI_ID_LOWERCASE: {
    id: "PI_ID_LOWERCASE",
    description: "pi_id MUST be lowercase letters only (a–z).",
  },

  // ---- project level ------------------------------------------------------
  PROJECT_ID_FORMAT: {
    id: "PROJECT_ID_FORMAT",
    description:
      "project_id MUST be lowercase and contain only letters, numbers, and underscores.",
  },
  PROJECT_REQUIRES_RAW: {
    id: "PROJECT_REQUIRES_RAW",
    description: "Each project directory MUST contain a 'raw/' subdirectory.",
  },
  PROJECT_REQUIRES_README: {
    id: "PROJECT_REQUIRES_README",
    description: "Each project directory MUST contain a 'README.md' file.",
  },

  // ---- raw folder level ---------------------------------------------------
  RAW_FOLDER_NAMING: {
    id: "RAW_FOLDER_NAMING",
    description:
      "Raw data folders MUST follow the pattern: <tif|ims>_<objective>x[<zoom>][_<proc>].",
  },

  // ---- sample (lightsheet_id) level ---------------------------------------
  SAMPLE_NO_WHITESPACE: {
    id: "SAMPLE_NO_WHITESPACE",
    description: "lightsheet_id MUST contain no whitespace.",
  },
  SAMPLE_BAG_ID_FORMAT: {
    id: "SAMPLE_BAG_ID_FORMAT",
    description: "bag_id (first segment of lightsheet_id) MUST be a single letter (a–z or A–Z).",
  },
  SAMPLE_SUBJECT_ID_FORMAT: {
    id: "SAMPLE_SUBJECT_ID_FORMAT",
    description:
      "subject_id (second segment of lightsheet_id) MUST contain letters and numbers only.",
  },
  TIFF_SAMPLE_NO_SUBDIRS: {
    id: "TIFF_SAMPLE_NO_SUBDIRS",
    description:
      "Sample folders inside tif_* acquisition folders MUST NOT contain subdirectories.",
  },

  // ---- derivatives level --------------------------------------------------
  DERIVATIVES_FOLDER_NAMING: {
    id: "DERIVATIVES_FOLDER_NAMING",
    description:
      "Derivative subfolders SHOULD follow the pattern: <pipeline_name>_<version>.",
  },
} as const;
