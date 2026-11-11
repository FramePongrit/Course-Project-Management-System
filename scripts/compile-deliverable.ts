import fs from "fs";
import path from "path";

const rootDir = path.resolve(__dirname, "..");

const headerContent = `# CPE 334 Deliverable 1 — Engineering Baseline and Working Sprint 1
**Course:** CPE 334 Software Engineering · Semester 1/2026
**Theme:** Theme 6: Course Project Management System (CPMS)
**Repository:** https://github.com/FramePongrit/Course-Project-Management-System
**Target Release Tag:** \`v1.0.0-sprint1\` on \`main\`

### Student Team Members
1. **Supanut Watthanasimakorn** (GitHub: Beethoven190)
2. **Pongrit Frame** (GitHub: FramePongrit)

---

## Navigation and Contents Table

| Part | Rubric Item | Content Summary & Key IDs | Status |
|:---:|:---|:---|:---:|
| **Part A** | **SRS and Product Scope** (10 pts) | Stakeholder problem, Actors, Scope/Exclusions, FR-01..23, BR-01..20, NFR-01..10, Assumptions, ADR-0001..0004 | Complete |
| **Part B** | **Feature Inventory & Traceability** (10 pts) | Features F-01..F-17, Sprint allocations, Requirements-to-Test Traceability Matrix | Complete |
| **Part C** | **System-Level SDS** (15 pts) | Modular monolith architecture, PostgreSQL Prisma data model, API conventions, Role matrix, JWT auth, Deployment | Complete |
| **Part D** | **Three-Sprint Plan** (5 pts) | Sprints 1, 2, 3 roadmap, dependencies, Sprint 1 domain slice scope, Lab reservations | Complete |
| **Part E** | **Sprint 1 Engineering Contracts** (20 pts) | Feature contracts F-01, F-02, F-04, F-05, F-06, F-07, F-08 (SDS, AC, STS, DoD) | Complete |
| **Part F** | **Working Sprint 1 & Verification** (20 pts) | Executed test suite (49/49 passed), AC execution matrix, test code excerpts, demo scenarios, Git workflow & review evidence | Complete |

\\pagebreak
`;

const filesToInclude = [
  { part: "Part A — Software Requirements Specification (SRS)", file: "docs/srs.md" },
  { part: "Part B — Feature Inventory", file: "docs/features.md" },
  { part: "Part B — Traceability Matrix", file: "docs/traceability.md" },
  { part: "Part C — System-Level Software Design Specification (SDS)", file: "docs/system-sds.md" },
  { part: "Part D — Three-Sprint Plan", file: "docs/sprints/plan.md" },
  { part: "Part E — Sprint 1 Contracts Index & Definition of Done", file: "docs/sprints/sprint-1/README.md" },
  { part: "Part E — F-01 Contract: Authentication", file: "docs/sprints/sprint-1/F-01-authentication.md" },
  { part: "Part E — F-02 Contract: Authorization & Ownership", file: "docs/sprints/sprint-1/F-02-authorization.md" },
  { part: "Part E — F-04 Contract: Milestone Creation", file: "docs/sprints/sprint-1/F-04-milestone-creation.md" },
  { part: "Part E — F-05 Contract: Submission Create / Overwrite", file: "docs/sprints/sprint-1/F-05-submission.md" },
  { part: "Part E — F-06 Contract: Feedback Recording", file: "docs/sprints/sprint-1/F-06-feedback.md" },
  { part: "Part E — F-07 Contract: Milestone Status Derivation", file: "docs/sprints/sprint-1/F-07-milestone-status.md" },
  { part: "Part E — F-08 Contract: Project Progress View", file: "docs/sprints/sprint-1/F-08-project-progress.md" },
  { part: "Part F — Working Sprint 1 and Verification Report", file: "docs/part-f-verification.md" },
];

let fullDocument = headerContent;

for (const item of filesToInclude) {
  const filePath = path.join(rootDir, item.file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    fullDocument += `\n\n---\n\n<!-- SECTION: ${item.part} -->\n\n` + content + "\n\n\\pagebreak\n";
  } else {
    console.warn(`File not found: ${item.file}`);
  }
}

const outputPath = path.join(rootDir, "docs/DELIVERABLE-1-CONSOLIDATED.md");
fs.writeFileSync(outputPath, fullDocument, "utf-8");
console.log(`Successfully compiled Deliverable 1 document into ${outputPath}`);

