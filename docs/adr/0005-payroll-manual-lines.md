# ADR 0005 — Manual payroll lines and draft worksheets

- Status: Proposed
- Date: 2026-07-07
- Related: ADR 0004, `progress.md` (Sprint F+)

## Decision

Admins can **add and edit payroll lines manually** on a period worksheet before
close. Manual lines support **immediate print/export for one agent** or
**persistence on a draft run** for later bulk export. **Bocal postings remain
exclusive to period close** (ADR 0004); draft and ad-hoc export are workflow-only.

## Context

Paie today computes a live preview (`buildPayrollLines`) and persists rows only
on **close**. Operators sometimes need to:

- Pay or document an agent **outside** the auto-computed grid (new hire mid-period,
  exceptional prime, correction before close).
- **Print one bulletin now** without closing the whole period.
- **Save a working set** of lines (computed + manual) and export in bulk later.

The schema already has `payroll_runs.status = 'draft' | 'closed'` but **draft
is unused** in application code.

## Concepts

| Concept | Meaning |
|---------|---------|
| **Computed line** | From `buildPayrollLines` (base, commission, bonuses, deductions) |
| **Manual line** | Operator-authored row on the worksheet |
| **Merged preview** | Computed lines + manual overrides/additions for the period |
| **Draft run** | Persisted `payroll_runs` with `status = 'draft'` and lines |
| **Ad-hoc generate** | Print/CSV for one line without saving draft (optional) or after saving one manual line |

## Workflow

### 1. Draft worksheet (default persistence)

For bakery + `startDate` + `endDate`:

1. If no draft exists, **upsert** `payroll_runs` with `status = 'draft'`.
2. Manual actions write `payroll_run_lines`:
   - **Add agent** — line for employee not in computed set, or extra one-off row.
   - **Override** — store manual amounts; mark in `detail_snapshot` (see below).
3. **Preview API** returns `merge(computed, draftLines)`:
   - Same `employeeId` in draft → draft amounts win (or field-level merge — v1: full line override).
   - Draft-only employees → appended to preview.
4. **Export/print** uses merged preview (same helpers as today).
5. **Close** (ADR 0004) snapshots **merged** lines, posts Bocal, sets `status = 'closed'`.

One **draft** per bakery + period range. Close deletes/replaces draft semantics:
draft is consumed on close (run becomes `closed`).

### 2. Immediate singular generate

From Paie UI: **Ajouter une ligne** → pick employee → edit amounts → actions:

- **Générer** — print/CSV for that line only (client uses merged single-line payload).
- **Enregistrer** — persist to draft run (enables bulk export later with other lines).

No Bocal movement until period close.

## Line shape

Reuse `payroll_run_lines` columns. Extend `detail_snapshot`:

```json
{
  "source": "manual" | "computed" | "override",
  "manualReason": "optional operator note",
  "computedSnapshot": { }
}
```

- `source: manual` — row created by admin; amounts are authoritative.
- `source: override` — started from computed preview; admin changed fields.
- `computedSnapshot` — optional copy of auto values at save time (audit).

v1 does **not** require new columns; JSON is enough. Add `line_source` column
later if reporting needs it.

## API surface (planned)

| Procedure | Role |
|-----------|------|
| `payroll.preview` | Existing; extend to merge draft lines |
| `payroll.saveDraftLine` | Create/update manual line on draft run |
| `payroll.removeDraftLine` | Delete manual line |
| `payroll.discardDraft` | Delete draft run + lines for period |
| `payroll.close` | Unchanged contract; closes merged worksheet |

Thin oRPC; logic in `services/payroll-draft.ts` (or extend `payroll.ts`).

## UI (Sprint F+)

- **Ajouter une ligne** on Paie (manager-only).
- Row badge: `Manuel` / `Ajusté` vs computed.
- Per-row **Générer** (print one) + period-level **Exporter / Imprimer** (bulk).
- Filter/selection (separate UX item) scopes export to subset.

## Rules

1. **No Bocal on draft or ad-hoc print** — financial truth on close only.
2. **Closed period is immutable** — edit manual lines only while `draft` or preview-open.
3. **Tenant scope** — all draft queries filter `organizationId` + `bakeryId`.
4. **Manual net** — admin-entered `netAmount` must be ≥ 0; gross/deduction fields
   should reconcile for display (warn if inconsistent; block close if invalid).
5. **Close side effects** — bonuses/advances/settle still run from **merged** line
   amounts; manual override of bonus does not auto-cancel `salary_bonuses` rows
   unless we add explicit linking (defer to v2).

## Consequences

- Export/print reads merged preview for open periods; frozen `payroll_run_lines`
  when closed (unchanged).
- Bulk print (Sprint F+) and manual lines share the same print pipeline.
- Optional v2: one-off **immediate payout** with Bocal (`sourceType: payroll_ad_hoc`)
  — out of scope for v1.

## Implementation order

1. Draft run upsert + `saveDraftLine` / `removeDraftLine`
2. Merge in `previewPayroll`
3. Paie UI: add line + singular generate
4. Agent filter + bulk print on merged dataset
5. Integration test: manual line → export → close → Bocal
