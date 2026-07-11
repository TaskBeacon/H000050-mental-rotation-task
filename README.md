# H000050 Mental Rotation Task

Browser companion for `T000050-mental-rotation-task`.

## Contract

- Runtime: `psyflow-web`
- Variant: `html`
- TAPS contract: `v0.2.0`
- Canonical source: `T000050-mental-rotation-task`

## Preserved Flow

1. Instruction screen with `B = Same` and `N = Different` mapping.
2. Twelve practice trials generated from baselines 13-15 across 0, 50, 100, and 150 degree rotations.
3. Two scored blocks of 48 trials each, using the intended baseline ranges and same/different image-pair filenames from `src/utils.py`.
4. Practice-only feedback, scored block summaries, and final accuracy/RT/timeout summary.

## Source Note

The local T000050 task is the canonical source. This H port preserves its deterministic practice/scored session plan, same/different scoring semantics, participant-facing instructions, and static object-pair asset naming.

## Development

Run shared runtime checks from `../psyflow-web`:

```bash
npm run typecheck
```
