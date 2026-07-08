# Payroll Roadmap — Équipe / Paie

Source of truth for planned payroll evolutions. Tasks are mirrored in
`prd.json` (groups `Sprint F1/F2/F3`). Constraints: AGENTS.md hard rules —
never mutate validated financial rows; corrections are append-only movements
through Bocal.

## Current state (July 2026)

Working: base salary, per-product commission (delivery only), bonuses
(primes), salary advances with installments, collection shortfall deduction,
draft adjustments (manual/override) before close, atomic close with Bocal
postings, frozen snapshots, CSV/PDF exports, history of closed runs.

Reference views/services:
- `apps/gerpain/src/services/payroll.ts` (+ `payroll-draft`, `payroll-posting`, `payroll-deductions`)
- `apps/gerpain/src/services/salary-advances.ts`, `salary-bonuses.ts`, `employee-commission.ts`
- `apps/gerpain/src/views/equipe/PaieView.tsx`, `RemunerationView.tsx`
- oRPC: `apps/gerpain/src/server/orpc/payroll.ts`

---

## F1 — Flexibility fixes (service layer)

| ID | Task | Notes | Effort |
|---|---|---|---|
| F1-A | Remove or wire `employees.commissionRate` | Ghost field, defined in schema, never read by `buildPayrollLines`. Decide: delete or implement % commission. | S |
| F1-B | Commissions for all roles | Drop `role === 'delivery'` gate in `buildPayrollLines`; any employee with active `employeeProducts` earns commission. | S |
| F1-C | Configurable collection shortfall rate | Bakery setting `collectionDeductionRate` (0–100%, default 100) + optional cap. Applied in `collectionShortfallDeduction`. | M |
| F1-D | Free-form deduction lines | `deductions[]` on payroll line (type, label, amount): disciplinary, absence, cotisation. Distinct from advance/collection. Schema + draft + close + PDF. | L |
| F1-E | Validate `duePeriod` format (`YYYY-MM`) | Zod regex on bonus create + month picker in `BonusesView`. Prevents unmatched bonuses. | S |
| F1-F | Preview warnings | Flag lines with net = 0 without draft, and active agents with no salary and no products. | S |
| F1-G | Totals bar: show commission + primes | Already computed in `totals`, just not displayed in `PaieView` synthesis. | S |
| F1-H | Bulk adjustment | Apply amount/rate to a selected group of lines (e.g. transport prime for all, −10% commissions). Produces draft override lines with shared reason. | M |
| F1-I | Computed vs override diff in expanded line | `computedSnapshot` already persisted; show old → new values. | M |
| F1-J | Forecast payroll mass in `RemunerationView` | Base salaries + previous-period average commissions. | M |

## F2 — Closed-period corrections & serious history (ERP-grade)

Design principle (Odoo/SAP): a closed run is never edited. It is either
**reversed** (contre-passation) or **amended** (adjustment run). All money
motions stay append-only in Bocal.

| ID | Task | Notes | Effort |
|---|---|---|---|
| F2-A | Schema: `runType`, `parentRunId`, `reversed` status, `payrollRunEvents` | `runType: 'regular'\|'adjustment'`; events table append-only: runId, eventType (`closed`,`reversed`,`adjusted`,`exported`), actor, occurredAt, payload. | S |
| F2-B | Audit journal UI | Timeline tab on run detail: who closed/reversed/adjusted, when, why. | S |
| F2-C | `reopenPayrollRun` (contre-passation) | Single tx: post exact inverse Bocal movements (`payroll_run_reversal`, `payroll_collection_deduction_reversal`); bonuses `paid→scheduled`; advance installments `paid→scheduled`; un-settle collections (inverse of `settleCashCollectionsPeriod`, idempotent). Run kept with status `reversed`, `reversedAt/By/Reason` (reason mandatory). Guard: refuse if later run exists (LIFO reopen only). | L |
| F2-D | Adjustment runs | New run with `runType='adjustment'` + `parentRunId`; free lines, positive or negative (rappel / trop-perçu), mandatory reason per line; posts delta to Bocal; PDF references origin period. For corrections after payment. | L |
| F2-E | Payroll lock date | Bakery setting `payrollLockDate`; reopen/adjust before it requires owner role. | S |
| F2-F | History chain UI | `reversed` runs stay visible (badge, strikethrough) with link to replacement; adjustment runs indented under parent. | M |
| F2-G | Per-agent payroll history | Tab on `FicheAgentView`: all run lines per period, net paid, adjustments, YTD cumuls (net, commissions). | M |
| F2-H | Period variance report | Delta net/brut vs previous period, top variations per agent. Error detection before reopening. | M |
| F2-I | Annual export | Aggregated CSV/PDF over calendar year: payroll mass, deductions, advances repaid. | M |
| F2-J | Correct closed-run metadata (label / closedAt) | **In-place correction of display-only fields only**: `periodLabel`, `closedAt`, `closedBy`. These are not functional keys (not used in ledger queries or commission/collection range filters). Allowed only with owner role; writes a `metadata_corrected` event to `payrollRunEvents` with old→new diff. **Dates (`startDate`/`endDate`) are functional keys tied to Bocal movements — they can only be fixed via F2-C (reopen → correct → re-close).** | S |

### Metadata vs functional-key correction decision tree

```
Is the mistake in periodLabel / closedAt / closedBy only?
  YES → F2-J (in-place, owner role, audit event). Safe.
  NO, dates (startDate/endDate) are wrong?
    → F2-C: reopen (reversal) → fix dates → re-close. Never rename dates in place.
    → Guard: refuse if payrollLockDate passed without owner override.
```

Risk note (F2-C): un-settling collections must verify no downstream
consumption of the settled rows between close and reopen.

## F3 — Official Senegalese payslip (client template)

Basis: client-provided bulletin (CCNC Travailleurs boulangers). Layout:
employer block, employee legal block, designation table
(Nombre/Base/Taux/Gain/Retenu/Taux/Retenue+/Retenue−), cotisations, cumuls
footer, signature.

| ID | Task | Notes | Effort |
|---|---|---|---|
| F3-A | Employee legal/fiscal fields | Schema: `matricule`, `qualification`, `categorie` (CCNC), `niveau`, `coefficient`, `indice`, `situationFamiliale`, `parts` (numeric, e.g. 2.5), `numeroIpresCss`, `emploiOccupe`, `horaireMensuel` (e.g. 173.33). Edit form on `FicheAgentView` / annuaire. | M |
| F3-B | Earnings lines | Sursalaire, heures supplémentaires (nombre × taux majoré), prime d'ancienneté (auto from `hireDate`, CCNC scale), transport non imposable. Extends payroll line model (structured earnings, like F1-D for deductions). | L |
| F3-C | Statutory contributions engine | Config-driven table (per org, versioned by effective date): CSS Prestations Familiales (7% employer, plafond 63 000), CSS Accident de travail (1–5% employer), IPRES-R Général (5.6% sal / 8.4% pat, plafond), IPRES-R Cadre (2.4%/3.6%), IPM, CFCE (3% employer), TRIMF (barème by parts), Impôt sur le Revenu (barème progressif + réduction par parts). Pure functions in a dedicated service, tests first. Rates stored in DB, never hardcoded. | XL |
| F3-D | Brut imposable vs brut total | Separate taxable base (excludes transport non imposable) feeding IR/TRIMF/CFCE. | M |
| F3-E | Payslip PDF matching template | Rework `payroll-pdf.ts` bulletin layout: header (employer, période, paiement date), legal block, designation table with Taux/Gain/Retenue columns, totals cotisation, cumuls row (brut, brut imposable, charges salariales/patronales, heures, avantages, net à payer), signature. | L |
| F3-F | Hours worked input | Monthly hours (default `horaireMensuel`) + overtime hours per employee per period; drives salaire de base proration and heures supp lines. Manual entry first; presence tracking later. | M |
| F3-G | Cumuls annuels on payslip | YTD brut, cotisations, net (depends on F2-G data). | S |

Sequencing: F3-A → F3-C (engine, tests-first) → F3-B/F3-D → F3-E → F3-F/G.
The contributions engine must be a pure, framework-free module (same
portability rule as Bocal) so it can be reused by EduPlan-like projects.

## Suggested order of execution

1. F1-A/B/E/F/G (quick wins, low risk)
2. F2-A/B (audit foundation)
3. F2-C (reopen) then F2-E (lock date)
4. F3-A + F3-C (payslip data + engine, tests first)
5. F1-D + F3-B/D (structured earnings/deductions — shared model)
6. F3-E (PDF template)
7. F2-D, F2-F/G/H/I, F1-C/H/I/J, F3-F/G
