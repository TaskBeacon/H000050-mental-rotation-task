import { StimBank, SubInfo, TaskSettings, TrialBuilder, count_down, mountTaskApp, next_trial_id, parsePsyflowConfig, reset_trial_counter, set_trial_context, type CompiledTrial } from "psyflow-web";

import { runTrial } from "./src/run_trial";
import { buildSessionPlan, buildTrialBank, summarizeTrials, type SessionBlock } from "./src/utils";

const TASK_ID = "H000050-mental-rotation-task";
const TASK_NAME = "Mental Rotation Task";
const TASK_DESCRIPTION = "Browser companion for the intended canonical T000050 Mental Rotation Task.";

type TaskSettingsView = TaskSettings & Record<string, unknown>;

async function loadConfig() {
  const response = await fetch(new URL("./config/config.yaml", import.meta.url));
  if (!response.ok) throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
  return parsePsyflowConfig(await response.text(), import.meta.url);
}

function textTrial(stimBank: StimBank, id: string, stimName: string): CompiledTrial {
  const trial = new TrialBuilder({ trial_id: id, block_id: id, trial_index: -1, condition: id });
  const unit = trial.unit(stimName).addStim(stimBank.get(stimName));
  set_trial_context(unit, { trial_id: trial.trial_id, phase: id, deadline_s: null, valid_keys: ["space"], block_id: id, condition_id: id, task_factors: { phase: id }, stim_id: stimName });
  unit.waitAndContinue({ keys: ["space"] });
  return trial.build();
}

function blockRows(runtimeRows: Array<Record<string, unknown>>, block: SessionBlock): Array<Record<string, unknown>> {
  return runtimeRows.filter((row) => String(row.block_id ?? "") === block.block_id);
}

function blockBreakTrial(stimBank: StimBank, block: SessionBlock, scoredIndex: number, totalScored: number): CompiledTrial {
  const trial = new TrialBuilder({ trial_id: `block_break_${scoredIndex}`, block_id: block.block_id, trial_index: -1, condition: "block_break" });
  const unit = trial.unit("block_break").addStim((_, runtime) => {
    const summary = summarizeTrials(blockRows(runtime.getReducedRows(), block));
    return stimBank.get_and_format("block_break", { block_num: scoredIndex, total_blocks: totalScored, ...summary });
  });
  set_trial_context(unit, { trial_id: trial.trial_id, phase: "block_break", deadline_s: null, valid_keys: ["space"], block_id: block.block_id, condition_id: "block_break", task_factors: { phase: "block_break", block_num: scoredIndex, total_blocks: totalScored }, stim_id: "block_break" });
  unit.waitAndContinue({ keys: ["space"] });
  return trial.build();
}

function goodbyeTrial(stimBank: StimBank): CompiledTrial {
  const trial = new TrialBuilder({ trial_id: "good_bye", block_id: "good_bye", trial_index: 9999, condition: "good_bye" });
  const unit = trial.unit("good_bye").addStim((_, runtime) => stimBank.get_and_format("good_bye", summarizeTrials(runtime.getReducedRows())));
  set_trial_context(unit, { trial_id: trial.trial_id, phase: "good_bye", deadline_s: null, valid_keys: ["space"], block_id: "good_bye", condition_id: "good_bye", task_factors: { phase: "good_bye" }, stim_id: "good_bye" });
  unit.waitAndContinue({ keys: ["space"] });
  return trial.build();
}

function buildTrials(settings: TaskSettingsView, stimBank: StimBank): CompiledTrial[] {
  reset_trial_counter();
  const bank = buildTrialBank(settings);
  const plan = buildSessionPlan(settings);
  const scoredBlocks = plan.filter((block) => block.block_kind === "scored");
  const trials: CompiledTrial[] = [textTrial(stimBank, "instruction", "instruction_text")];

  for (const block of plan) {
    if (block.block_kind === "scored") {
      trials.push(...count_down({ seconds: 3, block_id: block.block_id, condition: "countdown", trial_id_prefix: `countdown_${block.block_id}`, unit_label: "countdown", duration_s: 1, stim: { color: "black", height: 42, alignment: "center" } }));
    }
    for (const [trialIndex, label] of block.trials.entries()) {
      const spec = bank[label];
      if (!spec) throw new Error(`Missing Mental Rotation trial spec: ${label}`);
      const trial = new TrialBuilder({ trial_id: next_trial_id(), block_id: block.block_id, trial_index: trialIndex, condition: label });
      runTrial(trial, spec, { settings, stimBank });
      trials.push(trial.build());
    }
    if (block.block_kind === "practice") {
      trials.push(textTrial(stimBank, "practice_break", "practice_break"));
    } else {
      trials.push(blockBreakTrial(stimBank, block, scoredBlocks.findIndex((item) => item.block_id === block.block_id) + 1, scoredBlocks.length));
    }
  }

  trials.push(goodbyeTrial(stimBank));
  return trials;
}

export async function main(root: HTMLElement): Promise<unknown> {
  const parsed = await loadConfig();
  const settings = TaskSettings.from_dict(parsed.task_config) as TaskSettingsView;
  settings.triggers = parsed.trigger_config;
  const subInfo = new SubInfo(parsed.subform_config);
  const stimBank = new StimBank(parsed.stim_config);
  return mountTaskApp({ root, task_id: TASK_ID, task_name: TASK_NAME, task_description: TASK_DESCRIPTION, settings, subInfo, stimBank, buildTrials: () => buildTrials(settings, stimBank) });
}

export default main;
