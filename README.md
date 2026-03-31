# mind-lightsheet-validator

[![GitHub Pages](https://img.shields.io/badge/Browser%20Validator-GitHub%20Pages-blue?logo=github)](https://khanlab.github.io/mind-lightsheet-validator/)
[![Deploy](https://github.com/khanlab/mind-lightsheet-validator/actions/workflows/deploy.yml/badge.svg)](https://github.com/khanlab/mind-lightsheet-validator/actions/workflows/deploy.yml)

Validator for file/folder naming standards for raw lightsheet data in the MIND project.

---

# Part 1 — Running the Validator

## Browser Validator

The easiest way to validate your folder structure is the **browser-based validator**, hosted on GitHub Pages — no installation required.

**🌐 [Launch the Browser Validator](https://khanlab.github.io/mind-lightsheet-validator/)**

### Getting Started

1. Open the link above in a supported browser (see [Supported Browsers](#supported-browsers) below).
2. Select a **Validation level**:
   - **Lightsheet root** — validate the full `lightsheet/` tree
   - **PI directory** — validate a single PI folder (one level down)
   - **Project directory** — validate a single project folder (two levels down)
3. Click **Choose folder…** and select the directory on your computer.
4. Review the results — issues are grouped by severity (errors, warnings, info), and can be re-grouped by rule or location.
5. Optionally **export** the full report as JSON or CSV for sharing or archiving.

### Supported Browsers

| Browser | Support |
|---------|---------|
| Chrome ≥ 86 | ✅ Full support |
| Edge ≥ 86 | ✅ Full support |
| Firefox | ❌ File System Access API not supported |
| Safari | ❌ File System Access API not supported |

> The validator requires the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
> (`showDirectoryPicker`). Currently only Chromium-based browsers (Chrome, Edge) support this API.

### Security & Privacy

- **No data leaves your computer.** The validator runs entirely in your browser; no files or folder names are uploaded to any server.
- The page is served as a static site over HTTPS from GitHub Pages.
- Read access to the selected folder is requested only for the duration of the validation session and is not persisted.

### Limitations

- Requires Chrome or Edge (v86+); Firefox and Safari are not supported.
- Very large folder trees (thousands of directories) may take a moment to scan.
- `.zarr` directories are not recursed into — they are treated as opaque data stores and only their presence is noted.

---

## Running Locally / Developer Setup

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Install Dependencies

```bash
# Root library (validator engine + tests)
npm install

# Browser UI
cd web && npm install
```

### Start the Dev Server

```bash
npm run web:dev
```

The web app will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run web:build
```

Output is written to `web/dist/`.

### Run Tests

```bash
npm test
```

---

## Contributing

Contributions are welcome! Please open a pull request or an issue on
[GitHub](https://github.com/khanlab/mind-lightsheet-validator/issues).

### Adding or Modifying Validation Rules

Rules are defined in `src/rules.ts`. Each rule is a plain object with:

- `id` — unique identifier following the pattern `<LEVEL>_NNN` (e.g. `PI_001`, `RAW_003`)
- `description` — short human-readable description of what the rule checks
- `severity` — `"error"`, `"warning"`, or `"info"`

Rule logic is applied in `src/validator.ts`. After adding or changing a rule, add
corresponding test cases in `tests/validator.test.ts` and run `npm test` to verify.

### UI Tweaks

The browser UI lives in `web/src/`. The main entry point is `web/src/main.ts` and
styles are in `web/src/style.css`. Run `npm run web:dev` to start a hot-reloading
dev server.

### Reporting Bugs

Please open an issue at
👉 <https://github.com/khanlab/mind-lightsheet-validator/issues>

When reporting a bug, include:
- Browser name and version
- A description of the folder structure that triggered the issue (anonymise if needed)
- Expected vs. actual behaviour
- A screenshot if relevant

---

## Changelog / Roadmap

See [issue #4](https://github.com/khanlab/mind-lightsheet-validator/issues/4) for
the full roadmap and release milestones.

---

# Part 2 — Lightsheet File & Folder Standards

Status: Internal standard (publicly readable)  
Applies to: Local filesystem storage for MIND Platform lightsheet microscopy data  
Audience: MIND members acquiring, organizing, and processing lightsheet data

This document defines the required and recommended folder structure, naming conventions, and data organization for lightsheet microscopy datasets stored under the MIND Platform filesystem.

The goals are to:
- Ensure consistency across projects and PIs
- Enable automated processing (e.g. SPIMprep, SPIMquant)
- Preserve provenance from microscope output → BIDS → derivatives
- Minimize ambiguity and manual intervention

Normative language follows RFC 2119:
- MUST / MUST NOT
- SHOULD / SHOULD NOT
- MAY

## Storage Locations and Data Mirroring

The folder structure described in this document is implemented consistently across multiple storage systems used by the MIND Platform.

### Primary Local Storage

Lightsheet data are stored on multiple locally accessible filesystems, including (but not limited to):

- `trident`
- `trident2`
- `trident3`

Each of these filesystems contains a top-level `lightsheet/` directory that follows **the same directory structure and naming conventions** described in this document.

From the perspective of data organization and processing, these filesystems should be treated as equivalent:
- The same rules apply regardless of which filesystem a given project resides on
- Projects MAY be distributed across filesystems for capacity or performance reasons, but SHOULD ideally exist on the same filesystem
- Folder layout and naming MUST remain identical across all storage locations
- The trident3 share uses our latest fileserver which allow NFS mounting from the cluster, thus this is the preferred location for active projects. 

---

## 1. Top-Level Layout

All lightsheet data MUST live under a single top-level directory:

    lightsheet/

Hidden files and directories (names beginning with `.`, e.g. `.DS_Store`, `.snakemake`) are **ignored** by the validator and are not recursed into.

---

## 2. Principal Investigator (PI) Level

Structure:

    lightsheet/<pi_id>/

Rules:
- `<pi_id>` MUST be lowercase
- `<pi_id>` MUST contain no spaces
- `<pi_id>` MUST contain letters only (a–z)

Examples:

    lightsheet/prado/
    lightsheet/everling/

This level groups all lightsheet projects associated with a PI or lab.

---

## 3. Project / Batch Level

Structure:

    lightsheet/<pi_id>/<project_id>/

Definition:
- `<project_id>` represents a coherent batch of lightsheet samples
  (e.g. same study, cohort, or acquisition campaign)

Rules:
- `<project_id>` MUST be lowercase
- `<project_id>` MUST contain only letters, numbers, and underscores
- `<project_id>` MAY encode species, model, intervention, and batch identifiers

Examples:

    mouse_app_lecanemab_batch3
    mouse_app_lecanemab_ki3_batch1
    marmoset

Each project directory MUST contain:
- raw/

Each project directory SHOULD contain:
- README.md (absence triggers a warning, not an error)

Each project directory MAY contain:
- bids/
- derivatives/
- etc/

---

## 4. Recommended Project README

Each project directory SHOULD contain:

    lightsheet/<pi_id>/<project_id>/README.md

If `README.md` is absent, the validator will emit a **warning** (not an error).

The project README SHOULD include:
- Brief project description
- Species and model
- Staining(s)
- Acquisition overview
- Project manager / contact
- Notes on known issues or deviations

No strict README template is enforced at this time.

---
## 5. raw/ — Microscope-Origin Data

Structure:

    raw/
      ├── tif_<objective>x[<zoom>][_<proc>]/
      └── ims_<objective>x[<zoom>][_<proc>]/

The raw/ directory contains data originating directly from the microscope or minimal format conversions.

---

### 5.1 Raw Folder Naming

Raw data folders MUST follow this pattern:

    <tif|ims>_<objective>x[<zoom>][_<proc>]

Where square brackets indicate optional components.

#### Prefix
- `tif_` = raw TIFF tiles from the microscope
- `ims_` = Imaris format data

#### Objective
- Expressed as `<objective>x` (e.g. `4x`, `1x`)
- The `x` suffix is mandatory
- Objective refers to the microscope objective used during acquisition

#### Zoom (optional)
- If zoom ≠ 1×, it MUST be encoded immediately after the objective
- Zoom MUST be encoded using digits only
  - Decimal zoom factors are multiplied by 100
  - Example: `1.66` → `166`
- If zoom = 1×, it MUST be omitted

#### Processing suffix (optional)
- Indicates that some preprocessing has occurred
- MUST be prefixed by an underscore
- MUST use standardized, alphanumeric tokens
- Multiple processing steps MAY be concatenated using underscores

---

### 5.2 Semantics of Raw Folder Names

- `tif_<objective>x`
  - Raw TIFF tiles directly from acquisition
- `ims_<objective>x`
  - Imaris-converted data with no additional preprocessing
  - Often redundant with corresponding tif_ data
- `_<proc>` suffix
  - Indicates a processing step has been applied
  - Common examples include:
    - `stitched`
- If no processing suffix is present, data is assumed untouched

Examples:

    tif_4x
    tif_4x166
    ims_4x
    ims_4x_stitched
    ims_4x166_stitched

Note:
ims_<objective>x folders are typically intermediate and MAY be removed once stitched data are generated.


## 6. Sample-Level Organization in raw/

Inside each tif_* or ims_* folder, directories are named by `lightsheet_id`:

    lightsheet_id = <bag_id>_<subject_id>_<modifier_id>

- `modifier_id` can be used to identify additional information, such as specific hemispheres, or other ROIs 
- lightsheet_id MUST contain no whitespace (e.g. spaces)

- each tif_* or ims_* acquisition folder MUST **only** contain subfolders named by `lightsheet_id`
- the same `lightsheet_id` SHOULD be used for the same samples across different acquisition folders (e.g. tif_4x, ims_4x_stitched)
- as a quality-control step, users SHOULD check that every expected `lightsheet_id` appears in all corresponding tif_* / ims_* folders
- it is often helpful to list all `lightsheet_id` names per folder and compare them to identify missing or extra samples
- when reviewing names, watch for likely mistakes such as different lettercase in `bag_id` or differing prefixes in `subject_id` that may indicate an unintentional mismatch

---

### 6.1 bag_id

- Labels the physical sample in the SmartBatch 
- MUST be a single  letter (a, b, c, or A, B, C,  …)
- MUST be unique within the batch

E.g. A batch of 10 samples will use a–j.

---

### 6.2 subject_id
        
- `subject_id` is a unique identifier assigned by the project manager
- `subject_id` MUST contain letters and numbers only

- The subject_id becomes the participant_label in BIDS

Examples:

    a_AS134F1
    b_AS134F3
    
    a_Benny_lefthemi
    
    a_523M1
    b_598F2
    

---

### 6.3 Contents of tif Folders

- folders have lightsheet_id naming
- Contain TIFF tiles directly
- MUST NOT contain additional subdirectories
- TIFF files MUST NOT be renamed

---

### 6.4 Contents of ims folders

- folders have lightsheet_id naming
- should contain only one .ims file
- more than one is allowed if variations in stitching or conversion are being tested (validator should give warning)
- .ims files MAY be renamed if needed


---



## 7. bids/ — BIDS-Formatted Lightsheet Dataset

Structure:

    bids/
      ├── dataset_description.json
      ├── samples.tsv
      ├── samples.json
      ├── participants.tsv
      ├── README.md
      └── sub-<subject_id>/
            └── micr/
                  ├── sub-<subject_id>_sample-brain_acq-<acq>_*.ome.zarr
                  ├── sub-<subject_id>_sample-brain_acq-<acq>_*.ozx
                  └── sub-<subject_id>_sample-brain_acq-<acq>_*.json

Notes:
- bids/ is produced by SPIMprep
- Data in bids/ MUST NOT be manually edited
- Underlying image data may be stored as directory-based OME-Zarr or zipped OZX
- Both formats are considered equivalent
- MRI data is stored outside this BIDS dataset

---

### 7.1 Acquisition Encoding (acq-)

- Objective, zoom, and preprocessing differences from raw/
  are encoded using the BIDS acq- entity
- Multiple acquisitions of the same sample appear as
  separate files with different acq- values

---

## 8. derivatives/ — Post-Processing Outputs

Structure:

    derivatives/
      └── <pipeline_name>_<version>/

Rules:
- Each subfolder represents a distinct processing pipeline run
- Folder names SHOULD include pipeline name and version identifier
  (release tag or commit SHA)

Examples:

    spimquant_v0.4.0rc1
    spimquant_82c76d8

Expectations:
- Derivative folders SHOULD themselves be valid BIDS derivatives datasets
- Internal structure is pipeline-defined
- Machine-generated derivatives are considered validated by construction

---

## 9. etc/ — Ancillary Project Materials

Structure:

    etc/

Purpose:
- Stores project-level ancillary files, such as:
  - spreadsheets
  - acquisition notes
  - original file listings

Rules:
- No standard internal structure is enforced
- Contents are not consumed by automated pipelines

---

## 10. Validation Status

Validated by construction:
- bids/
- machine-generated derivative datasets

Validation in progress:
- raw/ folder structure and naming

Until validators are available, adherence to this document is required by convention.

---

## 11. Discouraged / Deprecated Practices

The following SHOULD NOT be done:

- Using spaces or uppercase letters in folder names
- Nesting TIFF tiles inside additional subfolders
- Renaming TIFF files
- Mixing raw, BIDS, and derivative data at the same level
- Performing ad-hoc preprocessing without encoding it in folder names or BIDS metadata

Additional examples will be added over time.

---

## 12. Future Extensions

- Automated raw-data validators
- Formal project README template
- Expanded lightsheet-BIDS conventions
- Support for additional intermediate formats

        
---
        
## 13. Step-by-step: Ingesting a New Lightsheet Project (Raw → Stitched → BIDS → Derivatives)

This section describes the recommended workflow for adding a new lightsheet project to the MIND filesystem, starting from microscope output and ending with standardized BIDS and derivative datasets. At present, these steps are typically performed manually using graphical tools; future automation will follow the same logical structure.

> Conventions used in this example  
> - PI: `prado`  
> - Project/batch: `mouse_app_example_batch1`  
> - Objective: `4x` (default 1× zoom)  
> - Two samples: `a_AS134F1`, `b_AS134F3`

---

### Step 1 — Create the project directory and README

Under the appropriate PI directory, create a new project folder:

    lightsheet/prado/mouse_app_example_batch1/

Create a `README.md` file at the project root.

At minimum, record:
- project description and scientific context
- species, model, and staining(s)
- acquisition overview
- project manager / point of contact
- known issues or deviations

---

### Step 2 — Create the raw acquisition folder

Within the project directory, create the `raw/` folder.

Under `raw/`, create an acquisition-specific folder following the naming convention:

    tif_<objective>x[<zoom>]

Examples:
- `tif_4x`
- `tif_4x166`

Use this folder to store TIFF tiles copied directly from the microscope.

---

### Step 3 — Organize raw TIFF data by sample

Inside the `tif_<objective>x.../` folder, create one subfolder per sample using:

    <lightsheet_id>_<subject_id>/

Example:

    tif_4x/
      ├── a_AS134F1/
      └── b_AS134F3/

Copy the TIFF tiles for each sample into the corresponding folder.

Important rules:
- TIFF tiles MUST be placed directly inside the sample folder
- No additional subfolder levels are allowed
- TIFF files MUST NOT be renamed

At this stage, the raw data should be organized but otherwise untouched.

---

### Step 4 — Perform stitching and save Imaris outputs

After stitching has been performed, create a new folder under `raw/` to store stitched Imaris outputs:

    ims_<objective>x[<zoom>]_stitched/

Example:

    ims_4x_stitched/

Within this folder, create one subfolder per sample, matching the same
`<lightsheet_id>_<subject_id>` naming used for TIFF data.

Save the stitched `.ims` file(s) for each sample into its corresponding folder.

Notes:
- `.ims` files MAY be renamed if helpful
- Unstitched Imaris conversions (e.g. `ims_4x/`) are optional and typically temporary
- TIFF data MUST remain unchanged and preserved

---

### Subsequent steps run on the compute cluster

The following steps generate standardized, machine-produced datasets and are typically executed on the compute cluster.

---

### Step 5 — Generate a BIDS dataset using SPIMprep

Using the stitched Imaris data as input, run the SPIMprep pipeline.

SPIMprep:
- reads from `raw/ims_<objective>x..._stitched/`
- writes a complete BIDS dataset to:

    bids/

The resulting `bids/` directory:
- MUST be considered read-only
- MUST NOT be manually edited
- contains lightsheet data stored as `*.ome.zarr` and/or `*.ozx`
- stores acquisition differences using the BIDS `acq-` entity

Example output structure:

    bids/
      ├── dataset_description.json
      ├── participants.tsv
      ├── samples.tsv
      ├── samples.json
      ├── README.md
      └── sub-<subject_id>/
            └── micr/
                  ├── sub-<subject_id>_acq-..._micr.ome.zarr
                  └── sub-<subject_id>_acq-..._micr.json

---

### Step 6 — Run SPIMquant to produce derivatives

Using the BIDS dataset as input, run the SPIMquant pipeline.

Create a new derivatives subfolder named with:
- the pipeline name
- a version identifier (release tag or commit SHA)

Example:

    derivatives/spimquant_v0.5.0-alpha1/

SPIMquant:
- reads from the `bids/` directory
- writes all outputs to the corresponding `derivatives/spimquant_<version>/` folder

Derivative datasets:
- SHOULD be valid BIDS derivatives
- are considered validated by construction
- MUST NOT overwrite previous derivative runs

---

### Step 7 — Final organizational checklist

Before considering the project ingested, verify that:

- A project-level `README.md` exists
- Raw TIFF data is stored under `raw/tif_<objective>x.../<lightsheet_id>_<subject_id>/`
- TIFF files were not renamed or nested
- Stitched Imaris data exists under `raw/ims_<objective>x..._stitched/`
- The `bids/` folder was produced by SPIMprep and not manually modified
- One or more versioned derivative folders exist under `derivatives/`

Following this procedure ensures consistency across projects and enables reliable downstream processing and analysis.

        
## Off-site Mirroring to Digital Alliance

All lightsheet data stored under the `lightsheet/` hierarchy are mirrored to a Digital Alliance project space for:

- long-term storage
- disaster recovery
- off-site access

This mirroring applies to:
- raw data
- BIDS datasets
- derivatives
- ancillary project materials

Important notes:
- The Digital Alliance copy is considered a **mirror**, not the primary working location
- Users SHOULD NOT directly modify data in the mirrored project space
- All authoritative edits and processing occur on the local filesystems
- Mirroring is managed separately from the directory structure described here

By maintaining a consistent layout across local storage and mirrored copies, the MIND Platform ensures data integrity, reproducibility, and portability across compute environments.

