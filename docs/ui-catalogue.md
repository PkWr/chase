---
type: reference
status: draft
updated: 2026-11-05
---
# UI catalogue

One list of the interface assets, so an existing one is found before a new one is made. Rule: reuse the Form asset as is. Where a project needs something Form does not have, it is added here first, named, and marked as an addition. Form source lines refer to `~/Sites/form/style.css` and `app.js` on 2026-11-05.

Status: match (same markup and CSS as Form), adapted (same pattern, changed on purpose, reason given), addition (not in Form), check (not yet compared).

## Shell

| Asset | Class or id | Form source | Type-setting | Status |
|---|---|---|---|---|
| Control panel | `#panel` (`.container` in type-setting) | style.css 14, 65 | `styles/form-shell.css` | adapted: fixed 380px, floating at every width, not a bottom sheet |
| Panel head | `.cp-head`, `.cp-now` | 69, 405, 482 | index.html, grep.html | match |
| Fold handle | `.cp-grab` | style.css 41, 67; app.js 748 | `src/layer-cycle.js` | adapted: shown at every width (Form: phones only); folds everything except head and foot |
| Panel body | `.cp-body` | 70 | not used; type-setting scrolls `.container` | check |
| Panel foot | `.cp-foot` | 71, 78 | index.html | match |
| Card | `.cp-sec` with `h3` | 483, 484 | all cards | match |
| Hint text | `.hint` | 39 | scale line, helper lines | match |
| Link row | `.links` | 81 to 83 | foot links | match |
| Page shadow | `0 6px 30px rgba(0,0,0,.5)` | 264, 470 | `#visualizationContainer svg` | match |

## Controls

| Asset | Class or id | Form source | Type-setting | Status |
|---|---|---|---|---|
| Button | `button` | 34 | Back, Next, Download | match |
| Step pager | `.row.nav`, `.next`, `.back` | 170 to 172 | `.page-nav` under the page; Next is full-width yellow | adapted: yellow, named "Next / step" |
| Step list | `.step-list` (steps card) | none; Form's `.step` is a content switch | `#cpSteps` | addition |
| Step switch | `.step`, `.step.on` | 166, 167 | `body[data-step]` with `[data-step]` hide rules | adapted |
| Rule sentence word | `.rule-word` | 507 to 509 | not used | n/a |
| Code row | `.code-row` | 450 | not used | n/a |
| Icon toggle (View) | `.layer-checkbox` with `.ic` | none | View card, alignment icons | addition |
| Cycle icon (off, outline, solid) | `.layer-checkbox.is-solid` | none | Margins and Columns | addition |
| Column picker | `.start-cols`, `.start-col`, `.start-ctrl` | none | Columns step | addition |
| Icon button | `.icon-btn` | `#palette button` is the nearest (line 20) | text tools, pop-out | check |
| Pop-out | `popout.js`, `body.popped` | none | page tools | addition |
| Intro stack | `.visualization-container.stack` | none | Intro step | addition |

## Open

- Decide whether additions move into Form's stylesheet so the two stay in one place.
- Check the `.cp-body` and icon button rows, then change status.
- Review again whenever Form's `style.css` changes. Master for this list should live in the vault under Digital projects once agreed.
