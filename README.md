# H000050 Mental Rotation Task

Browser companion for the intended `T000050-mental-rotation-task`.

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

The local T000050 directory is internally inconsistent: `taskbeacon.yaml`, `src/utils.py`, and `assets/stimuli/*.jpg` define a Mental Rotation task, while `config/config.yaml`, `README.md`, and `src/run_trial.py` still contain Matrix Reasoning content. This H port follows the T000050 task identity and the Mental Rotation schedule/stimulus generator from `src/utils.py`, with a web config reconstructed around those canonical assets.

## Development

Run shared runtime checks from `../psyflow-web`:

```bash
npm run typecheck
```
