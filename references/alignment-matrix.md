# Alignment Matrix

Use this matrix before changing code.
The purpose is to keep alignment decisions explicit instead of letting the web task drift.

## Must Align

- `slug`
- conceptual task title
- local/web task pairing: `Txxxxxx-*` to `Hxxxxxx-*`
- block and condition semantics
- stage order inside each logical trial
- response windows and valid keys
- hit, miss, timeout, and scoring logic
- controller or adaptive timing rules
- instruction meaning
- reduced export semantics

## May Differ

- total block count for preview builds
- total trial count for preview builds
- fullscreen shell
- cursor visibility
- force quit behavior
- browser speech synthesis implementation
- deployment and hosting
- absence of EEG or hardware trigger layers

## Keep In Task Repo

- `taskbeacon.yaml`
- `main.ts`
- `config/config.yaml`
- `src/run_trial.ts`
- `src/controller.ts`
- `src/utils.ts`
- task-specific assets and texts
- task-specific adaptive/scoring helpers that fill a real `psyflow-web` gap
- custom condition generation only when native label-level scheduling cannot express the canonical task

## Move To `psyflow-web`

- fullscreen policy
- start/preflight shell
- export UI
- shared jsPsych adapter
- keyboard and pointer handling
- countdown helper
- speech synthesis bridge
- generic break or waiting screen helpers when reusable
- shared timing, response, export, or display adapters
- helpers copied across multiple `H` repos

## Do Not Add To `H` Repos

- per-task `node_modules`, `vite.config`, `dist`, or app-shell files
- direct `jsPsych` imports from task files
- unified manager/controller/scheduler layers without task-specific need
- fallback or legacy condition-shape parsers
- hardcoded participant-facing text that belongs in config
- raw condition tokens or debug labels as participant-facing stimuli

## Review Questions

- If the local and web tasks produce different trial outcomes for the same condition, why?
- If a parameter differs, is it a preview-length override or an unintended semantic drift?
- If a helper appears in multiple `H` tasks, should it move into `psyflow-web`?
- If the task author has to understand `jsPsych` to modify the task, did the port leak the wrong abstraction?
- If `run_trial.ts` is hard to audit phase-by-phase, what logic should move to config, `utils.ts`, `controller.ts`, or `psyflow-web`?
