/**
 * Comprehensive tests for the lightsheet folder validator.
 *
 * Test organisation:
 *  1. Pattern / rule unit tests (test each regex in isolation)
 *  2. validate() integration tests per rule
 *  3. End-to-end scenarios (full valid tree, complex negative cases)
 *
 * Every rule defined in RULES has at least one passing and one failing example.
 */

import { validate, validateFromPI, validateFromProject } from "../src/validator";
import {
  BAG_ID_PATTERN,
  DERIVATIVES_FOLDER_PATTERN,
  LIGHTSHEET_ID_PATTERN,
  PI_ID_PATTERN,
  PROJECT_ID_PATTERN,
  RAW_FOLDER_PATTERN,
  RULES,
  SUBJECT_ID_PATTERN,
} from "../src/rules";
import type { FolderNode, ValidationIssue } from "../src/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid project tree (pi: 'prado', project: 'myproject'). */
function buildValidTree(overrides?: {
  piName?: string;
  projectName?: string;
  projectChildren?: FolderNode[];
  rawChildren?: FolderNode[];
}): FolderNode {
  const rawChildren = overrides?.rawChildren ?? [
    {
      name: "tif_4x",
      type: "directory",
      children: [
        {
          name: "a_AS134F1",
          type: "directory",
          children: [{ name: "tile_001.tif", type: "file" }],
        },
      ],
    },
  ];

  const projectChildren: FolderNode[] = overrides?.projectChildren ?? [
    { name: "README.md", type: "file" },
    { name: "raw", type: "directory", children: rawChildren },
  ];

  return {
    name: "lightsheet",
    type: "directory",
    children: [
      {
        name: overrides?.piName ?? "prado",
        type: "directory",
        children: [
          {
            name: overrides?.projectName ?? "myproject",
            type: "directory",
            children: projectChildren,
          },
        ],
      },
    ],
  };
}

/** Filter issues by ruleId. */
function issuesFor(issues: ValidationIssue[], ruleId: string): ValidationIssue[] {
  return issues.filter((i) => i.ruleId === ruleId);
}

// ---------------------------------------------------------------------------
// 1. Pattern unit tests
// ---------------------------------------------------------------------------

describe("PI_ID_PATTERN", () => {
  test.each(["prado", "everling", "abc"])("accepts valid pi_id: %s", (v) => {
    expect(PI_ID_PATTERN.test(v)).toBe(true);
  });

  test.each(["Prado", "prado1", "pi_id", "pi id", "123", ""])(
    "rejects invalid pi_id: %s",
    (v) => {
      expect(PI_ID_PATTERN.test(v)).toBe(false);
    },
  );
});

describe("PROJECT_ID_PATTERN", () => {
  test.each([
    "myproject",
    "mouse_app_lecanemab_batch3",
    "mouse_app_lecanemab_ki3_batch1",
    "marmoset",
    "batch1",
    "abc123",
  ])("accepts valid project_id: %s", (v) => {
    expect(PROJECT_ID_PATTERN.test(v)).toBe(true);
  });

  test.each(["MyProject", "my-project", "my project", "my.project", ""])(
    "rejects invalid project_id: %s",
    (v) => {
      expect(PROJECT_ID_PATTERN.test(v)).toBe(false);
    },
  );
});

describe("RAW_FOLDER_PATTERN", () => {
  test.each([
    "tif_4x",
    "tif_4x166",
    "ims_4x",
    "ims_4x_stitched",
    "ims_4x166_stitched",
    "tif_1x",
    "tif_10x",
    "ims_4x_stitched_denoised",
  ])("accepts valid raw folder: %s", (v) => {
    expect(RAW_FOLDER_PATTERN.test(v)).toBe(true);
  });

  test.each([
    "tiff_4x",        // wrong prefix
    "raw_4x",         // wrong prefix
    "tif4x",          // missing underscore
    "tif_4",          // missing 'x'
    "tif_X4x",        // non-digit objective
    "tif_4x_",        // trailing underscore with empty token
    "tif_4x_Stitched", // uppercase in proc
    "",
  ])("rejects invalid raw folder: %s", (v) => {
    expect(RAW_FOLDER_PATTERN.test(v)).toBe(false);
  });
});

describe("BAG_ID_PATTERN", () => {
  test.each(["a", "z", "A", "Z", "b"])("accepts valid bag_id: %s", (v) => {
    expect(BAG_ID_PATTERN.test(v)).toBe(true);
  });

  test.each(["ab", "1", "_a", "aa", ""])(
    "rejects invalid bag_id: %s",
    (v) => {
      expect(BAG_ID_PATTERN.test(v)).toBe(false);
    },
  );
});

describe("SUBJECT_ID_PATTERN", () => {
  test.each(["AS134F1", "523M1", "Benny", "abc123"])(
    "accepts valid subject_id: %s",
    (v) => {
      expect(SUBJECT_ID_PATTERN.test(v)).toBe(true);
    },
  );

  test.each(["AS134-F1", "AS 134F1", "AS_134F1", ""])(
    "rejects invalid subject_id: %s",
    (v) => {
      expect(SUBJECT_ID_PATTERN.test(v)).toBe(false);
    },
  );
});

describe("LIGHTSHEET_ID_PATTERN", () => {
  test.each([
    "a_AS134F1",
    "b_AS134F3",
    "a_Benny_lefthemi",
    "a_523M1",
    "b_598F2",
    "A_Sample1",
    "c_Mouse1_righthemi",
  ])("accepts valid lightsheet_id: %s", (v) => {
    expect(LIGHTSHEET_ID_PATTERN.test(v)).toBe(true);
  });

  test.each([
    "ab_AS134F1",      // bag_id too long
    "1_AS134F1",       // bag_id is digit
    "a_",              // missing subject_id
    "aAS134F1",        // missing underscore separator
    "a_AS 134F1",      // whitespace in subject_id
    "",
  ])("rejects invalid lightsheet_id: %s", (v) => {
    expect(LIGHTSHEET_ID_PATTERN.test(v)).toBe(false);
  });
});

describe("DERIVATIVES_FOLDER_PATTERN", () => {
  test.each([
    "spimquant_v0.4.0rc1",
    "spimquant_82c76d8",
    "spimprep_v1.0.0",
    "my_pipeline_v2.1-beta",
  ])("accepts valid derivatives folder: %s", (v) => {
    expect(DERIVATIVES_FOLDER_PATTERN.test(v)).toBe(true);
  });

  test.each(["spimquant", "_v1.0", ""])(
    "rejects invalid derivatives folder: %s",
    (v) => {
      expect(DERIVATIVES_FOLDER_PATTERN.test(v)).toBe(false);
    },
  );
});

// ---------------------------------------------------------------------------
// 2. validate() – LIGHTSHEET_ROOT rule
// ---------------------------------------------------------------------------

describe("LIGHTSHEET_ROOT rule", () => {
  test("passes when root node is named 'lightsheet'", () => {
    const report = validate({ name: "lightsheet", type: "directory" });
    expect(issuesFor(report.issues, "LIGHTSHEET_ROOT")).toHaveLength(0);
  });

  test("passes when lightsheet/ is a child of the provided root", () => {
    const root: FolderNode = {
      name: "filesystem",
      type: "directory",
      children: [{ name: "lightsheet", type: "directory" }],
    };
    const report = validate(root);
    expect(issuesFor(report.issues, "LIGHTSHEET_ROOT")).toHaveLength(0);
  });

  test("reports error when no lightsheet/ found", () => {
    const root: FolderNode = {
      name: "data",
      type: "directory",
      children: [{ name: "projects", type: "directory" }],
    };
    const report = validate(root);
    expect(report.valid).toBe(false);
    expect(issuesFor(report.issues, "LIGHTSHEET_ROOT")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 3. validate() – PI_ID_LOWERCASE rule
// ---------------------------------------------------------------------------

describe("PI_ID_LOWERCASE rule", () => {
  test("passes for a valid lowercase pi_id", () => {
    const report = validate(buildValidTree({ piName: "prado" }));
    expect(issuesFor(report.issues, "PI_ID_LOWERCASE")).toHaveLength(0);
    expect(report.valid).toBe(true);
  });

  test("reports error for uppercase pi_id", () => {
    const report = validate(buildValidTree({ piName: "Prado" }));
    expect(issuesFor(report.issues, "PI_ID_LOWERCASE")).toHaveLength(1);
    expect(report.valid).toBe(false);
  });

  test("reports error for pi_id containing digits", () => {
    const report = validate(buildValidTree({ piName: "pi1" }));
    expect(issuesFor(report.issues, "PI_ID_LOWERCASE")).toHaveLength(1);
  });

  test("reports error for pi_id with spaces", () => {
    const report = validate(buildValidTree({ piName: "my pi" }));
    expect(issuesFor(report.issues, "PI_ID_LOWERCASE")).toHaveLength(1);
  });

  test("error has a suggestedFix", () => {
    const report = validate(buildValidTree({ piName: "Prado" }));
    const issue = issuesFor(report.issues, "PI_ID_LOWERCASE")[0];
    expect(issue.suggestedFix).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 4. validate() – PROJECT_ID_FORMAT rule
// ---------------------------------------------------------------------------

describe("PROJECT_ID_FORMAT rule", () => {
  test("passes for valid project_id values", () => {
    for (const name of ["myproject", "mouse_app_batch3", "batch1"]) {
      const report = validate(buildValidTree({ projectName: name }));
      expect(issuesFor(report.issues, "PROJECT_ID_FORMAT")).toHaveLength(0);
    }
  });

  test("reports error for project_id with hyphens", () => {
    const report = validate(buildValidTree({ projectName: "my-project" }));
    expect(issuesFor(report.issues, "PROJECT_ID_FORMAT")).toHaveLength(1);
    expect(report.valid).toBe(false);
  });

  test("reports error for project_id with uppercase letters", () => {
    const report = validate(buildValidTree({ projectName: "MyProject" }));
    expect(issuesFor(report.issues, "PROJECT_ID_FORMAT")).toHaveLength(1);
  });

  test("reports error for project_id with spaces", () => {
    const report = validate(buildValidTree({ projectName: "my project" }));
    expect(issuesFor(report.issues, "PROJECT_ID_FORMAT")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 5. validate() – PROJECT_REQUIRES_RAW rule
// ---------------------------------------------------------------------------

describe("PROJECT_REQUIRES_RAW rule", () => {
  test("passes when raw/ directory is present", () => {
    const report = validate(buildValidTree());
    expect(issuesFor(report.issues, "PROJECT_REQUIRES_RAW")).toHaveLength(0);
  });

  test("reports error when raw/ is absent", () => {
    const report = validate(
      buildValidTree({
        projectChildren: [{ name: "README.md", type: "file" }],
      }),
    );
    expect(issuesFor(report.issues, "PROJECT_REQUIRES_RAW")).toHaveLength(1);
    expect(report.valid).toBe(false);
  });

  test("reports error when raw exists as a file, not a directory", () => {
    const report = validate(
      buildValidTree({
        projectChildren: [
          { name: "README.md", type: "file" },
          { name: "raw", type: "file" }, // file, not directory
        ],
      }),
    );
    expect(issuesFor(report.issues, "PROJECT_REQUIRES_RAW")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 6. validate() – PROJECT_REQUIRES_README rule
// ---------------------------------------------------------------------------

describe("PROJECT_REQUIRES_README rule", () => {
  test("passes when README.md file is present", () => {
    const report = validate(buildValidTree());
    expect(issuesFor(report.issues, "PROJECT_REQUIRES_README")).toHaveLength(0);
  });

  test("reports error when README.md is absent", () => {
    const report = validate(
      buildValidTree({
        projectChildren: [
          { name: "raw", type: "directory", children: [] },
        ],
      }),
    );
    expect(issuesFor(report.issues, "PROJECT_REQUIRES_README")).toHaveLength(1);
    expect(report.valid).toBe(false);
  });

  test("reports error when README.md is a directory instead of a file", () => {
    const report = validate(
      buildValidTree({
        projectChildren: [
          { name: "README.md", type: "directory" }, // wrong type
          { name: "raw", type: "directory", children: [] },
        ],
      }),
    );
    expect(issuesFor(report.issues, "PROJECT_REQUIRES_README")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 7. validate() – RAW_FOLDER_NAMING rule
// ---------------------------------------------------------------------------

describe("RAW_FOLDER_NAMING rule", () => {
  const rawWith = (acqName: string): FolderNode =>
    buildValidTree({
      rawChildren: [{ name: acqName, type: "directory", children: [] }],
    });

  test.each([
    "tif_4x",
    "tif_4x166",
    "ims_4x",
    "ims_4x_stitched",
    "ims_4x166_stitched",
  ])("passes for valid acquisition folder '%s'", (name) => {
    const report = validate(rawWith(name));
    expect(issuesFor(report.issues, "RAW_FOLDER_NAMING")).toHaveLength(0);
  });

  test.each([
    "tiff_4x",
    "4x_tif",
    "tif_4",
    "tif_",
    "raw_data",
  ])("reports error for invalid acquisition folder '%s'", (name) => {
    const report = validate(rawWith(name));
    expect(issuesFor(report.issues, "RAW_FOLDER_NAMING")).toHaveLength(1);
    expect(report.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8. validate() – SAMPLE_NO_WHITESPACE rule
// ---------------------------------------------------------------------------

describe("SAMPLE_NO_WHITESPACE rule", () => {
  const treeWithSample = (sampleName: string): FolderNode =>
    buildValidTree({
      rawChildren: [
        {
          name: "tif_4x",
          type: "directory",
          children: [{ name: sampleName, type: "directory", children: [] }],
        },
      ],
    });

  test("passes for sample without whitespace", () => {
    const report = validate(treeWithSample("a_AS134F1"));
    expect(issuesFor(report.issues, "SAMPLE_NO_WHITESPACE")).toHaveLength(0);
  });

  test("reports error for sample with a space", () => {
    const report = validate(treeWithSample("a_AS134 F1"));
    expect(issuesFor(report.issues, "SAMPLE_NO_WHITESPACE")).toHaveLength(1);
    expect(report.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 9. validate() – SAMPLE_BAG_ID_FORMAT rule
// ---------------------------------------------------------------------------

describe("SAMPLE_BAG_ID_FORMAT rule", () => {
  const treeWithSample = (sampleName: string): FolderNode =>
    buildValidTree({
      rawChildren: [
        {
          name: "tif_4x",
          type: "directory",
          children: [{ name: sampleName, type: "directory", children: [] }],
        },
      ],
    });

  test.each(["a_AS134F1", "A_Sample1", "z_Z1"])(
    "passes for valid bag_id in sample '%s'",
    (name) => {
      const report = validate(treeWithSample(name));
      expect(issuesFor(report.issues, "SAMPLE_BAG_ID_FORMAT")).toHaveLength(0);
    },
  );

  test("reports error for multi-char bag_id", () => {
    const report = validate(treeWithSample("ab_AS134F1"));
    expect(issuesFor(report.issues, "SAMPLE_BAG_ID_FORMAT")).toHaveLength(1);
  });

  test("reports error for digit bag_id", () => {
    const report = validate(treeWithSample("1_AS134F1"));
    expect(issuesFor(report.issues, "SAMPLE_BAG_ID_FORMAT")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 10. validate() – SAMPLE_SUBJECT_ID_FORMAT rule
// ---------------------------------------------------------------------------

describe("SAMPLE_SUBJECT_ID_FORMAT rule", () => {
  const treeWithSample = (sampleName: string): FolderNode =>
    buildValidTree({
      rawChildren: [
        {
          name: "tif_4x",
          type: "directory",
          children: [{ name: sampleName, type: "directory", children: [] }],
        },
      ],
    });

  test.each(["a_AS134F1", "b_523M1", "a_Benny"])(
    "passes for valid subject_id in sample '%s'",
    (name) => {
      const report = validate(treeWithSample(name));
      expect(issuesFor(report.issues, "SAMPLE_SUBJECT_ID_FORMAT")).toHaveLength(0);
    },
  );

  test("reports error for subject_id with special characters", () => {
    const report = validate(treeWithSample("a_AS134-F1"));
    expect(issuesFor(report.issues, "SAMPLE_SUBJECT_ID_FORMAT")).toHaveLength(1);
  });

  test("reports error when subject_id is missing", () => {
    const report = validate(treeWithSample("a_"));
    expect(issuesFor(report.issues, "SAMPLE_SUBJECT_ID_FORMAT")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 11. validate() – TIFF_SAMPLE_NO_SUBDIRS rule
// ---------------------------------------------------------------------------

describe("TIFF_SAMPLE_NO_SUBDIRS rule", () => {
  test("passes when tif_ sample contains only files", () => {
    const report = validate(buildValidTree());
    expect(issuesFor(report.issues, "TIFF_SAMPLE_NO_SUBDIRS")).toHaveLength(0);
  });

  test("reports error when tif_ sample contains a subdirectory", () => {
    const tree = buildValidTree({
      rawChildren: [
        {
          name: "tif_4x",
          type: "directory",
          children: [
            {
              name: "a_AS134F1",
              type: "directory",
              children: [
                { name: "tile_001.tif", type: "file" },
                { name: "subdir", type: "directory", children: [] }, // violation
              ],
            },
          ],
        },
      ],
    });
    const report = validate(tree);
    expect(issuesFor(report.issues, "TIFF_SAMPLE_NO_SUBDIRS")).toHaveLength(1);
    expect(report.valid).toBe(false);
  });

  test("does NOT flag subdirectories inside ims_ sample folders", () => {
    const tree = buildValidTree({
      rawChildren: [
        {
          name: "ims_4x_stitched",
          type: "directory",
          children: [
            {
              name: "a_AS134F1",
              type: "directory",
              children: [
                { name: "subdir", type: "directory", children: [] }, // allowed for ims_
              ],
            },
          ],
        },
      ],
    });
    const report = validate(tree);
    expect(issuesFor(report.issues, "TIFF_SAMPLE_NO_SUBDIRS")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 12. validate() – ACQ_FOLDER_ONLY_SUBDIRS rule
// ---------------------------------------------------------------------------

describe("ACQ_FOLDER_ONLY_SUBDIRS rule", () => {
  const acqWithFile = (acqName: string, fileName: string): FolderNode =>
    buildValidTree({
      rawChildren: [
        {
          name: acqName,
          type: "directory",
          children: [
            { name: fileName, type: "file" },
            {
              name: "a_AS134F1",
              type: "directory",
              children: [{ name: "tile_001.tif", type: "file" }],
            },
          ],
        },
      ],
    });

  test("passes when tif_ acquisition folder contains only subdirectories", () => {
    const report = validate(buildValidTree());
    expect(issuesFor(report.issues, "ACQ_FOLDER_ONLY_SUBDIRS")).toHaveLength(0);
  });

  test("reports error when tif_ acquisition folder contains a loose file", () => {
    const report = validate(acqWithFile("tif_4x", "stray_file.txt"));
    const issues = issuesFor(report.issues, "ACQ_FOLDER_ONLY_SUBDIRS");
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("error");
    expect(report.valid).toBe(false);
  });

  test("reports error when ims_ acquisition folder contains a loose file", () => {
    const report = validate(acqWithFile("ims_4x_stitched", "notes.txt"));
    const issues = issuesFor(report.issues, "ACQ_FOLDER_ONLY_SUBDIRS");
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("error");
    expect(report.valid).toBe(false);
  });

  test("reports one error per loose file in the acquisition folder", () => {
    const tree = buildValidTree({
      rawChildren: [
        {
          name: "tif_4x",
          type: "directory",
          children: [
            { name: "file1.txt", type: "file" },
            { name: "file2.txt", type: "file" },
            {
              name: "a_AS134F1",
              type: "directory",
              children: [{ name: "tile_001.tif", type: "file" }],
            },
          ],
        },
      ],
    });
    const issues = issuesFor(validate(tree).issues, "ACQ_FOLDER_ONLY_SUBDIRS");
    expect(issues).toHaveLength(2);
  });

  test("error includes the file name in the message", () => {
    const report = validate(acqWithFile("tif_4x", "notes.md"));
    const issue = issuesFor(report.issues, "ACQ_FOLDER_ONLY_SUBDIRS")[0];
    expect(issue.message).toContain("notes.md");
    expect(issue.suggestedFix).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 13. validate() – IMS_SAMPLE_MULTIPLE_IMS rule
// ---------------------------------------------------------------------------

describe("IMS_SAMPLE_MULTIPLE_IMS rule", () => {
  const imsTreeWithFiles = (fileNames: string[]): FolderNode =>
    buildValidTree({
      rawChildren: [
        {
          name: "ims_4x_stitched",
          type: "directory",
          children: [
            {
              name: "a_AS134F1",
              type: "directory",
              children: fileNames.map((n) => ({ name: n, type: "file" as const })),
            },
          ],
        },
      ],
    });

  test("passes when ims_ sample contains exactly one .ims file", () => {
    const report = validate(imsTreeWithFiles(["sample.ims"]));
    expect(issuesFor(report.issues, "IMS_SAMPLE_MULTIPLE_IMS")).toHaveLength(0);
    expect(report.valid).toBe(true);
  });

  test("passes when ims_ sample contains no .ims files", () => {
    const report = validate(imsTreeWithFiles([]));
    expect(issuesFor(report.issues, "IMS_SAMPLE_MULTIPLE_IMS")).toHaveLength(0);
  });

  test("emits a warning (not error) when ims_ sample contains multiple .ims files", () => {
    const report = validate(imsTreeWithFiles(["sample_v1.ims", "sample_v2.ims"]));
    const issues = issuesFor(report.issues, "IMS_SAMPLE_MULTIPLE_IMS");
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("warning");
    // Warnings don't invalidate the report
    expect(report.valid).toBe(true);
  });

  test("warning message includes the count of .ims files", () => {
    const report = validate(imsTreeWithFiles(["a.ims", "b.ims", "c.ims"]));
    const issue = issuesFor(report.issues, "IMS_SAMPLE_MULTIPLE_IMS")[0];
    expect(issue.message).toContain("3");
    expect(issue.suggestedFix).toBeDefined();
  });

  test("does NOT flag multiple .ims files inside tif_ sample folders (rule only applies to ims_)", () => {
    const tree = buildValidTree({
      rawChildren: [
        {
          name: "tif_4x",
          type: "directory",
          children: [
            {
              name: "a_AS134F1",
              type: "directory",
              children: [
                { name: "one.ims", type: "file" },
                { name: "two.ims", type: "file" },
              ],
            },
          ],
        },
      ],
    });
    expect(issuesFor(validate(tree).issues, "IMS_SAMPLE_MULTIPLE_IMS")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 14. validate() – DERIVATIVES_FOLDER_NAMING rule
// ---------------------------------------------------------------------------

describe("DERIVATIVES_FOLDER_NAMING rule", () => {
  const treeWithDerivative = (derivName: string): FolderNode =>
    buildValidTree({
      projectChildren: [
        { name: "README.md", type: "file" },
        { name: "raw", type: "directory", children: [] },
        {
          name: "derivatives",
          type: "directory",
          children: [{ name: derivName, type: "directory", children: [] }],
        },
      ],
    });

  test.each(["spimquant_v0.4.0rc1", "spimquant_82c76d8", "spimprep_v1.0.0"])(
    "passes for valid derivatives folder '%s'",
    (name) => {
      const report = validate(treeWithDerivative(name));
      expect(issuesFor(report.issues, "DERIVATIVES_FOLDER_NAMING")).toHaveLength(0);
    },
  );

  test("emits a warning (not error) for non-conforming derivatives folder", () => {
    const report = validate(treeWithDerivative("outputfolder"));
    const issues = issuesFor(report.issues, "DERIVATIVES_FOLDER_NAMING");
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("warning");
    // Warnings don't make the report invalid
    expect(report.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 15. ValidationReport shape
// ---------------------------------------------------------------------------

describe("ValidationReport shape", () => {
  test("report.valid is true for a fully valid tree", () => {
    const report = validate(buildValidTree());
    expect(report.valid).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  test("report.valid is false when any error is present", () => {
    const report = validate(buildValidTree({ piName: "BadPI" }));
    expect(report.valid).toBe(false);
  });

  test("issues include ruleId, message, path, and severity", () => {
    const report = validate(buildValidTree({ piName: "Bad" }));
    const issue = report.issues[0];
    expect(issue).toHaveProperty("ruleId");
    expect(issue).toHaveProperty("message");
    expect(issue).toHaveProperty("path");
    expect(issue).toHaveProperty("severity");
  });

  test("issue path reflects tree location", () => {
    const report = validate(buildValidTree({ piName: "BadPI" }));
    const issue = issuesFor(report.issues, "PI_ID_LOWERCASE")[0];
    expect(issue.path).toContain("BadPI");
  });
});

// ---------------------------------------------------------------------------
// 16. RULES registry
// ---------------------------------------------------------------------------

describe("RULES registry", () => {
  test("all expected rule IDs exist", () => {
    const expectedIds = [
      "LIGHTSHEET_ROOT",
      "PI_ID_LOWERCASE",
      "PROJECT_ID_FORMAT",
      "PROJECT_REQUIRES_RAW",
      "PROJECT_REQUIRES_README",
      "RAW_FOLDER_NAMING",
      "SAMPLE_NO_WHITESPACE",
      "SAMPLE_BAG_ID_FORMAT",
      "SAMPLE_SUBJECT_ID_FORMAT",
      "TIFF_SAMPLE_NO_SUBDIRS",
      "ACQ_FOLDER_ONLY_SUBDIRS",
      "IMS_SAMPLE_MULTIPLE_IMS",
      "DERIVATIVES_FOLDER_NAMING",
    ];
    for (const id of expectedIds) {
      expect(RULES).toHaveProperty(id);
    }
  });

  test("each rule has an id and description", () => {
    for (const [key, rule] of Object.entries(RULES)) {
      expect(rule.id).toBe(key);
      expect(typeof rule.description).toBe("string");
      expect(rule.description.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 17. End-to-end scenarios
// ---------------------------------------------------------------------------

describe("End-to-end: fully valid tree from README example", () => {
  test("no issues for the full example from the ingestion workflow", () => {
    const tree: FolderNode = {
      name: "lightsheet",
      type: "directory",
      children: [
        {
          name: "prado",
          type: "directory",
          children: [
            {
              name: "mouse_app_example_batch1",
              type: "directory",
              children: [
                { name: "README.md", type: "file" },
                {
                  name: "raw",
                  type: "directory",
                  children: [
                    {
                      name: "tif_4x",
                      type: "directory",
                      children: [
                        {
                          name: "a_AS134F1",
                          type: "directory",
                          children: [{ name: "tile_001.tif", type: "file" }],
                        },
                        {
                          name: "b_AS134F3",
                          type: "directory",
                          children: [{ name: "tile_001.tif", type: "file" }],
                        },
                      ],
                    },
                    {
                      name: "ims_4x_stitched",
                      type: "directory",
                      children: [
                        {
                          name: "a_AS134F1",
                          type: "directory",
                          children: [{ name: "sample.ims", type: "file" }],
                        },
                        {
                          name: "b_AS134F3",
                          type: "directory",
                          children: [{ name: "sample.ims", type: "file" }],
                        },
                      ],
                    },
                  ],
                },
                {
                  name: "bids",
                  type: "directory",
                  children: [
                    { name: "dataset_description.json", type: "file" },
                    { name: "README.md", type: "file" },
                  ],
                },
                {
                  name: "derivatives",
                  type: "directory",
                  children: [
                    {
                      name: "spimquant_v0.4.0rc1",
                      type: "directory",
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const report = validate(tree);
    expect(report.valid).toBe(true);
    expect(report.issues).toHaveLength(0);
  });
});

describe("End-to-end: multiple PIs and projects", () => {
  test("validates all branches independently", () => {
    const tree: FolderNode = {
      name: "lightsheet",
      type: "directory",
      children: [
        {
          name: "prado",
          type: "directory",
          children: [
            {
              name: "mouse_batch1",
              type: "directory",
              children: [
                { name: "README.md", type: "file" },
                { name: "raw", type: "directory", children: [] },
              ],
            },
          ],
        },
        {
          name: "everling",
          type: "directory",
          children: [
            {
              name: "marmoset",
              type: "directory",
              children: [
                { name: "README.md", type: "file" },
                {
                  name: "raw",
                  type: "directory",
                  children: [
                    {
                      name: "tif_4x166",
                      type: "directory",
                      children: [
                        {
                          name: "a_Benny_lefthemi",
                          type: "directory",
                          children: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const report = validate(tree);
    expect(report.valid).toBe(true);
    expect(report.issues).toHaveLength(0);
  });
});

describe("End-to-end: multiple errors accumulate", () => {
  test("both pi_id and project_id errors are reported", () => {
    const report = validate(
      buildValidTree({ piName: "BadPI", projectName: "Bad-Project" }),
    );
    expect(issuesFor(report.issues, "PI_ID_LOWERCASE")).toHaveLength(1);
    expect(issuesFor(report.issues, "PROJECT_ID_FORMAT")).toHaveLength(1);
    expect(report.valid).toBe(false);
  });

  test("missing raw/ and README.md both reported", () => {
    const report = validate(
      buildValidTree({ projectChildren: [] }),
    );
    expect(issuesFor(report.issues, "PROJECT_REQUIRES_RAW")).toHaveLength(1);
    expect(issuesFor(report.issues, "PROJECT_REQUIRES_README")).toHaveLength(1);
  });
});

describe("End-to-end: caller passes filesystem root with lightsheet/ child", () => {
  test("validates correctly when lightsheet/ is nested inside the root", () => {
    const filesystemRoot: FolderNode = {
      name: "trident3",
      type: "directory",
      children: [
        {
          name: "lightsheet",
          type: "directory",
          children: [
            {
              name: "prado",
              type: "directory",
              children: [
                {
                  name: "myproject",
                  type: "directory",
                  children: [
                    { name: "README.md", type: "file" },
                    { name: "raw", type: "directory", children: [] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const report = validate(filesystemRoot);
    expect(report.valid).toBe(true);
    expect(issuesFor(report.issues, "LIGHTSHEET_ROOT")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 18. .zarr folder handling
// ---------------------------------------------------------------------------

describe(".zarr folder: validator does not recurse into zarr stores", () => {
  /**
   * Build a deeply-nested .zarr tree simulating a Zarr store with many
   * internal chunk directories.
   */
  function buildZarrChildren(depth: number): FolderNode[] {
    if (depth === 0) return [{ name: "0", type: "file" }];
    return [
      { name: "0", type: "directory", children: buildZarrChildren(depth - 1) },
      { name: "1", type: "directory", children: buildZarrChildren(depth - 1) },
    ];
  }

  test("zarr store inside derivatives is not recursed into and does not produce spurious issues", () => {
    const tree: FolderNode = buildValidTree({
      projectChildren: [
        { name: "README.md", type: "file" },
        { name: "raw", type: "directory", children: [
          { name: "tif_4x", type: "directory", children: [
            { name: "a_AS134F1", type: "directory", children: [{ name: "tile_001.tif", type: "file" }] },
          ]},
        ]},
        {
          name: "derivatives",
          type: "directory",
          children: [
            {
              name: "spimquant_v0.4.0",
              type: "directory",
              children: [
                {
                  name: "output.zarr",
                  type: "directory",
                  // Simulate a deeply nested Zarr store
                  children: buildZarrChildren(5),
                },
              ],
            },
          ],
        },
      ],
    });
    const report = validate(tree);
    expect(report.valid).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  test("zarr store at the project level does not cause issues for deeply nested contents", () => {
    const tree: FolderNode = buildValidTree({
      projectChildren: [
        { name: "README.md", type: "file" },
        { name: "raw", type: "directory", children: [
          { name: "tif_4x", type: "directory", children: [
            { name: "a_AS134F1", type: "directory", children: [{ name: "tile_001.tif", type: "file" }] },
          ]},
        ]},
        // A .zarr folder at the project level should not be recursed into
        {
          name: "dataset.zarr",
          type: "directory",
          children: buildZarrChildren(5),
        },
      ],
    });
    const report = validate(tree);
    expect(report.valid).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  test("zarr store with many children is treated as a leaf (children stripped)", () => {
    // Provide a tree where the zarr store has many children
    // The validator should not emit any issues originating from inside the zarr store
    const zarrChildren = Array.from({ length: 100 }, (_, i) => ({
      name: String(i),
      type: "directory" as const,
      children: Array.from({ length: 100 }, (_, j) => ({
        name: String(j),
        type: "file" as const,
      })),
    }));

    const tree: FolderNode = buildValidTree({
      projectChildren: [
        { name: "README.md", type: "file" },
        { name: "raw", type: "directory", children: [] },
        {
          name: "big.zarr",
          type: "directory",
          children: zarrChildren,
        },
      ],
    });
    // Should produce no issues about contents inside big.zarr
    const report = validate(tree);
    expect(report.valid).toBe(true);
    expect(report.issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 17. validateFromPI – PI-level entry-point
// ---------------------------------------------------------------------------

describe("validateFromPI", () => {
  test("returns valid:true for a PI directory with a valid project", () => {
    const piNode: FolderNode = {
      name: "prado",
      type: "directory",
      children: [
        {
          name: "myproject",
          type: "directory",
          children: [
            { name: "README.md", type: "file" },
            { name: "raw", type: "directory", children: [] },
          ],
        },
      ],
    };
    const report = validateFromPI(piNode);
    expect(report.valid).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  test("does NOT report LIGHTSHEET_ROOT when lightsheet/ directory is absent", () => {
    const piNode: FolderNode = { name: "prado", type: "directory", children: [] };
    const report = validateFromPI(piNode);
    expect(issuesFor(report.issues, "LIGHTSHEET_ROOT")).toHaveLength(0);
  });

  test("reports PI_ID_LOWERCASE for an invalid PI name", () => {
    const piNode: FolderNode = { name: "BadPI", type: "directory", children: [] };
    const report = validateFromPI(piNode);
    expect(issuesFor(report.issues, "PI_ID_LOWERCASE").length).toBeGreaterThan(0);
    expect(report.valid).toBe(false);
  });

  test("validates projects inside the PI directory", () => {
    const piNode: FolderNode = {
      name: "prado",
      type: "directory",
      children: [
        {
          name: "Bad_Project",
          type: "directory",
          children: [
            { name: "README.md", type: "file" },
            { name: "raw", type: "directory", children: [] },
          ],
        },
      ],
    };
    const report = validateFromPI(piNode);
    expect(issuesFor(report.issues, "PROJECT_ID_FORMAT").length).toBeGreaterThan(0);
    expect(report.valid).toBe(false);
  });

  test("reports PROJECT_REQUIRES_RAW for a project missing raw/", () => {
    const piNode: FolderNode = {
      name: "prado",
      type: "directory",
      children: [
        {
          name: "myproject",
          type: "directory",
          children: [{ name: "README.md", type: "file" }],
        },
      ],
    };
    const report = validateFromPI(piNode);
    expect(issuesFor(report.issues, "PROJECT_REQUIRES_RAW").length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 18. validateFromProject – project-level entry-point
// ---------------------------------------------------------------------------

describe("validateFromProject", () => {
  test("returns valid:true for a valid project directory", () => {
    const projectNode: FolderNode = {
      name: "myproject",
      type: "directory",
      children: [
        { name: "README.md", type: "file" },
        { name: "raw", type: "directory", children: [] },
      ],
    };
    const report = validateFromProject(projectNode);
    expect(report.valid).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  test("does NOT report LIGHTSHEET_ROOT or PI_ID_LOWERCASE", () => {
    const projectNode: FolderNode = {
      name: "myproject",
      type: "directory",
      children: [
        { name: "README.md", type: "file" },
        { name: "raw", type: "directory", children: [] },
      ],
    };
    const report = validateFromProject(projectNode);
    expect(issuesFor(report.issues, "LIGHTSHEET_ROOT")).toHaveLength(0);
    expect(issuesFor(report.issues, "PI_ID_LOWERCASE")).toHaveLength(0);
  });

  test("reports PROJECT_ID_FORMAT for an invalid project name", () => {
    const projectNode: FolderNode = {
      name: "Bad-Project",
      type: "directory",
      children: [
        { name: "README.md", type: "file" },
        { name: "raw", type: "directory", children: [] },
      ],
    };
    const report = validateFromProject(projectNode);
    expect(issuesFor(report.issues, "PROJECT_ID_FORMAT").length).toBeGreaterThan(0);
    expect(report.valid).toBe(false);
  });

  test("reports PROJECT_REQUIRES_RAW when raw/ is missing", () => {
    const projectNode: FolderNode = {
      name: "myproject",
      type: "directory",
      children: [{ name: "README.md", type: "file" }],
    };
    const report = validateFromProject(projectNode);
    expect(issuesFor(report.issues, "PROJECT_REQUIRES_RAW").length).toBeGreaterThan(0);
    expect(report.valid).toBe(false);
  });

  test("reports PROJECT_REQUIRES_README when README.md is missing", () => {
    const projectNode: FolderNode = {
      name: "myproject",
      type: "directory",
      children: [{ name: "raw", type: "directory", children: [] }],
    };
    const report = validateFromProject(projectNode);
    expect(issuesFor(report.issues, "PROJECT_REQUIRES_README").length).toBeGreaterThan(0);
    expect(report.valid).toBe(false);
  });

  test("validates raw acquisition folder naming inside the project", () => {
    const projectNode: FolderNode = {
      name: "myproject",
      type: "directory",
      children: [
        { name: "README.md", type: "file" },
        {
          name: "raw",
          type: "directory",
          children: [
            { name: "bad_folder", type: "directory", children: [] },
          ],
        },
      ],
    };
    const report = validateFromProject(projectNode);
    expect(issuesFor(report.issues, "RAW_FOLDER_NAMING").length).toBeGreaterThan(0);
    expect(report.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 19. DatasetSummary — validate()
// ---------------------------------------------------------------------------

describe("DatasetSummary – validate()", () => {
  test("summary is present on the report for a full lightsheet tree", () => {
    const report = validate(buildValidTree());
    expect(report.summary).toBeDefined();
  });

  test("summary has one PI entry matching the pi_id", () => {
    const report = validate(buildValidTree({ piName: "prado" }));
    expect(report.summary!.pis).toHaveLength(1);
    expect(report.summary!.pis[0].id).toBe("prado");
  });

  test("PI summary has one project entry matching the project_id", () => {
    const report = validate(buildValidTree({ projectName: "myproject" }));
    const pi = report.summary!.pis[0];
    expect(pi.projects).toHaveLength(1);
    expect(pi.projects[0].id).toBe("myproject");
  });

  test("project summary reflects hasRaw and hasReadme for a valid tree", () => {
    const report = validate(buildValidTree());
    const project = report.summary!.pis[0].projects[0];
    expect(project.hasRaw).toBe(true);
    expect(project.hasReadme).toBe(true);
  });

  test("project summary hasReadme is false when README.md is absent", () => {
    const report = validate(
      buildValidTree({
        projectChildren: [
          { name: "raw", type: "directory", children: [] },
        ],
      }),
    );
    const project = report.summary!.pis[0].projects[0];
    expect(project.hasReadme).toBe(false);
  });

  test("project summary hasRaw is false when raw/ is absent", () => {
    const report = validate(
      buildValidTree({
        projectChildren: [{ name: "README.md", type: "file" }],
      }),
    );
    const project = report.summary!.pis[0].projects[0];
    expect(project.hasRaw).toBe(false);
  });

  test("subjects list is populated from raw acquisition folders", () => {
    const report = validate(buildValidTree());
    const subjects = report.summary!.pis[0].projects[0].subjects;
    expect(subjects).toHaveLength(1);
    expect(subjects[0].id).toBe("a_AS134F1");
  });

  test("subject acquisitions list contains the acquisition folder name", () => {
    const report = validate(buildValidTree());
    const subject = report.summary!.pis[0].projects[0].subjects[0];
    expect(subject.acquisitions).toContain("tif_4x");
  });

  test("subject appearing in multiple acquisition folders is listed once with both acquisitions", () => {
    const tree = buildValidTree({
      rawChildren: [
        {
          name: "tif_4x",
          type: "directory",
          children: [
            {
              name: "a_AS134F1",
              type: "directory",
              children: [{ name: "tile.tif", type: "file" }],
            },
          ],
        },
        {
          name: "ims_4x",
          type: "directory",
          children: [
            {
              name: "a_AS134F1",
              type: "directory",
              children: [{ name: "sample.ims", type: "file" }],
            },
          ],
        },
      ],
    });
    const report = validate(tree);
    const subjects = report.summary!.pis[0].projects[0].subjects;
    expect(subjects).toHaveLength(1);
    expect(subjects[0].acquisitions).toContain("tif_4x");
    expect(subjects[0].acquisitions).toContain("ims_4x");
  });

  test("valid node has status 'valid'", () => {
    const report = validate(buildValidTree());
    const pi = report.summary!.pis[0];
    expect(pi.status).toBe("valid");
    expect(pi.projects[0].status).toBe("valid");
    expect(pi.projects[0].subjects[0].status).toBe("valid");
  });

  test("PI with invalid name has status 'error' in summary", () => {
    const report = validate(buildValidTree({ piName: "PI_Bad" }));
    const pi = report.summary!.pis[0];
    expect(pi.status).toBe("error");
  });

  test("project with invalid name has status 'error' in summary", () => {
    const report = validate(buildValidTree({ projectName: "Bad-Project" }));
    const project = report.summary!.pis[0].projects[0];
    expect(project.status).toBe("error");
  });

  test("subject in ims_ folder with multiple .ims files has status 'warning'", () => {
    const tree = buildValidTree({
      rawChildren: [
        {
          name: "ims_4x",
          type: "directory",
          children: [
            {
              name: "a_AS134F1",
              type: "directory",
              children: [
                { name: "one.ims", type: "file" },
                { name: "two.ims", type: "file" },
              ],
            },
          ],
        },
      ],
    });
    const report = validate(tree);
    const subject = report.summary!.pis[0].projects[0].subjects[0];
    expect(subject.status).toBe("warning");
  });

  test("summary is absent when no lightsheet/ root is found", () => {
    const report = validate({
      name: "notlightsheet",
      type: "directory",
      children: [],
    });
    expect(report.summary).toBeUndefined();
  });

  test("multiple PIs and projects appear in summary", () => {
    const tree: FolderNode = {
      name: "lightsheet",
      type: "directory",
      children: [
        {
          name: "prado",
          type: "directory",
          children: [
            {
              name: "project_a",
              type: "directory",
              children: [
                { name: "README.md", type: "file" },
                { name: "raw", type: "directory", children: [] },
              ],
            },
          ],
        },
        {
          name: "smith",
          type: "directory",
          children: [
            {
              name: "project_b",
              type: "directory",
              children: [
                { name: "README.md", type: "file" },
                { name: "raw", type: "directory", children: [] },
              ],
            },
          ],
        },
      ],
    };
    const report = validate(tree);
    const piIds = report.summary!.pis.map((p) => p.id);
    expect(piIds).toContain("prado");
    expect(piIds).toContain("smith");
  });
});

// ---------------------------------------------------------------------------
// 20. DatasetSummary — validateFromPI()
// ---------------------------------------------------------------------------

describe("DatasetSummary – validateFromPI()", () => {
  test("summary is present for validateFromPI", () => {
    const piNode: FolderNode = {
      name: "prado",
      type: "directory",
      children: [
        {
          name: "myproject",
          type: "directory",
          children: [
            { name: "README.md", type: "file" },
            { name: "raw", type: "directory", children: [] },
          ],
        },
      ],
    };
    const report = validateFromPI(piNode);
    expect(report.summary).toBeDefined();
    expect(report.summary!.pis).toHaveLength(1);
    expect(report.summary!.pis[0].id).toBe("prado");
  });

  test("validateFromPI summary contains project and subject info", () => {
    const piNode: FolderNode = {
      name: "prado",
      type: "directory",
      children: [
        {
          name: "myproject",
          type: "directory",
          children: [
            { name: "README.md", type: "file" },
            {
              name: "raw",
              type: "directory",
              children: [
                {
                  name: "tif_4x",
                  type: "directory",
                  children: [
                    {
                      name: "a_AS134F1",
                      type: "directory",
                      children: [{ name: "tile.tif", type: "file" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const report = validateFromPI(piNode);
    const pi = report.summary!.pis[0];
    expect(pi.projects[0].id).toBe("myproject");
    expect(pi.projects[0].subjects[0].id).toBe("a_AS134F1");
  });
});

// ---------------------------------------------------------------------------
// 21. DatasetSummary — validateFromProject() (no summary)
// ---------------------------------------------------------------------------

describe("DatasetSummary – validateFromProject()", () => {
  test("summary is absent for validateFromProject", () => {
    const projectNode: FolderNode = {
      name: "myproject",
      type: "directory",
      children: [
        { name: "README.md", type: "file" },
        { name: "raw", type: "directory", children: [] },
      ],
    };
    const report = validateFromProject(projectNode);
    expect(report.summary).toBeUndefined();
  });
});
