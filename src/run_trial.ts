import { TrialBuilder, set_trial_context, type StimBank, type TaskSettings } from "psyflow-web";

import type { MentalRotationTrialSpec } from "./utils";

type MentalRotationSettings = TaskSettings & Record<string, unknown>;

type RunTrialOptions = {
  settings: MentalRotationSettings;
  stimBank: StimBank;
};

function numberSetting(settings: MentalRotationSettings, key: string, fallback: number): number {
  const parsed = Number(settings[key]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stimulusUrl(filename: string): string {
  return new URL(`../assets/stimuli/${filename}`, import.meta.url).href;
}

export function runTrial(trial: TrialBuilder, trialSpec: MentalRotationTrialSpec, options: RunTrialOptions): TrialBuilder {
  const settings = options.settings;
  const sameKey = String(settings.same_key ?? "b").toLowerCase();
  const differentKey = String(settings.different_key ?? "n").toLowerCase();
  const responseKeys = [sameKey, differentKey];
  const correctKey = trialSpec.trial_type === "same" ? sameKey : differentKey;
  const triggerMap = (settings.triggers as Record<string, number | null | undefined>) ?? {};
  const responseTriggers: Record<string, number> = {};
  if (typeof triggerMap.response_b === "number") responseTriggers[sameKey] = triggerMap.response_b;
  if (typeof triggerMap.response_n === "number") responseTriggers[differentKey] = triggerMap.response_n;
  const blankDuration = numberSetting(settings, "blank_duration", 0.25);
  const responseDeadline = numberSetting(settings, "response_deadline", 8);
  const feedbackDuration = numberSetting(settings, "practice_feedback_duration", 0.8);

  trial.setTrialState("block_id", trialSpec.block_id);
  trial.setTrialState("block_idx", trialSpec.block_idx);
  trial.setTrialState("block_kind", trialSpec.block_kind);
  trial.setTrialState("condition", trialSpec.condition);
  trial.setTrialState("condition_label", trialSpec.condition_label);
  trial.setTrialState("practice", trialSpec.practice);
  trial.setTrialState("baseline_id", trialSpec.baseline_id);
  trial.setTrialState("angle_deg", trialSpec.angle_deg);
  trial.setTrialState("angle_index", trialSpec.angle_index);
  trial.setTrialState("baseline_index", trialSpec.baseline_index);
  trial.setTrialState("trial_type", trialSpec.trial_type);
  trial.setTrialState("correct_key", correctKey);
  trial.setTrialState("correct_label", trialSpec.correct_label);
  trial.setTrialState("stimulus_filename", trialSpec.stimulus_filename);
  trial.setTrialState("stimulus_summary", trialSpec.stimulus_summary);

  const blank = trial.unit("blank_screen").addStim(options.stimBank.get("blank_screen"));
  set_trial_context(blank, {
    trial_id: trial.trial_id,
    phase: "blank_screen",
    deadline_s: blankDuration,
    valid_keys: [],
    block_id: trialSpec.block_id,
    condition_id: trialSpec.condition_label,
    task_factors: { stage: "blank_screen", block_kind: trialSpec.block_kind, trial_type: trialSpec.trial_type, angle_deg: trialSpec.angle_deg },
    stim_id: "blank_screen"
  });
  blank.show({ duration: blankDuration, onset_trigger: triggerMap.blank_onset ?? null });

  const response = trial.unit("response_window").addStim(
    options.stimBank.rebuild("stimulus_image", { image: stimulusUrl(trialSpec.stimulus_filename) })
  );
  set_trial_context(response, {
    trial_id: trial.trial_id,
    phase: "response_window",
    deadline_s: responseDeadline,
    valid_keys: responseKeys,
    block_id: trialSpec.block_id,
    condition_id: trialSpec.condition_label,
    task_factors: {
      stage: "response_window",
      block_kind: trialSpec.block_kind,
      baseline_id: trialSpec.baseline_id,
      angle_deg: trialSpec.angle_deg,
      trial_type: trialSpec.trial_type,
      correct_key: correctKey
    },
    stim_id: trialSpec.stimulus_filename
  });
  response.captureResponse({
    keys: responseKeys,
    correct_keys: [correctKey],
    duration: responseDeadline,
    terminate_on_response: true,
    onset_trigger: triggerMap.stimulus_onset ?? null,
    response_trigger: responseTriggers,
    timeout_trigger: triggerMap.response_timeout ?? null
  });

  if (trialSpec.practice) {
    const feedback = trial.unit("practice_feedback").addStim((snapshot) => {
      const responseKey = String(snapshot.units.response_window?.response ?? "").toLowerCase();
      const responded = responseKeys.includes(responseKey);
      const feedbackStim = !responded
        ? "practice_feedback_timeout"
        : responseKey === correctKey
          ? "practice_feedback_correct"
          : "practice_feedback_incorrect";
      return options.stimBank.get(feedbackStim);
    });
    set_trial_context(feedback, {
      trial_id: trial.trial_id,
      phase: "practice_feedback",
      deadline_s: feedbackDuration,
      valid_keys: [],
      block_id: trialSpec.block_id,
      condition_id: trialSpec.condition_label,
      task_factors: { stage: "practice_feedback", trial_type: trialSpec.trial_type, correct_key: correctKey },
      stim_id: "practice_feedback"
    });
    feedback.show({ duration: feedbackDuration, onset_trigger: triggerMap.practice_feedback_onset ?? null });
  }

  trial.finalize((snapshot, _runtime, helpers) => {
    const responseState = snapshot.units.response_window ?? {};
    const responseKey = String(responseState.response ?? "").toLowerCase();
    const responded = responseKeys.includes(responseKey);
    const responseRt = typeof responseState.rt === "number" && Number.isFinite(responseState.rt) ? responseState.rt : null;
    const responseCorrect = responded && responseKey === correctKey;
    helpers.setTrialState("responded", responded);
    helpers.setTrialState("response_key", responded ? responseKey : "");
    helpers.setTrialState("response_rt", responseRt);
    helpers.setTrialState("response_correct", responseCorrect);
    helpers.setTrialState("timed_out", !responded);
    helpers.setTrialState("feedback_kind", trialSpec.practice ? (!responded ? "timeout" : responseCorrect ? "correct" : "incorrect") : null);
  });

  return trial;
}

export { runTrial as run_trial };

export default runTrial;
