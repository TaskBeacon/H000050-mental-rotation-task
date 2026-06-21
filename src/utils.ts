export const ANGLE_DEGREES = [0, 50, 100, 150];
export const SAME_KEY = "b";
export const DIFFERENT_KEY = "n";

export type MentalRotationTrialSpec = {
  condition: string;
  condition_label: string;
  block_kind: "practice" | "scored";
  block_id: string;
  block_idx: number;
  practice: boolean;
  trial_index_in_block: number;
  baseline_id: number;
  angle_deg: number;
  angle_index: number;
  baseline_index: number;
  trial_type: "same" | "different";
  correct_key: string;
  correct_label: string;
  stimulus_filename: string;
  stimulus_summary: string;
};

export type SessionBlock = {
  block_kind: "practice" | "scored";
  block_id: string;
  block_idx: number;
  trial_count: number;
  trials: string[];
  show_feedback: boolean;
};

function seededShuffle<T>(items: T[], seed: number): T[] {
  let value = seed >>> 0;
  const random = () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function intList(value: unknown, fallback: number[]): number[] {
  if (Array.isArray(value)) {
    const parsed = value.map(Number).filter(Number.isFinite);
    if (parsed.length > 0) return parsed;
  }
  return fallback;
}

function rangeList(value: unknown, fallback: Array<[number, number]>): Array<[number, number]> {
  if (Array.isArray(value)) {
    const parsed = value
      .filter((item): item is unknown[] => Array.isArray(item) && item.length >= 2)
      .map((item) => [Number(item[0]), Number(item[1])] as [number, number])
      .filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end) && start <= end);
    if (parsed.length > 0) return parsed;
  }
  return fallback;
}

function expandRange([start, end]: [number, number]): number[] {
  const out: number[] = [];
  for (let value = start; value <= end; value += 1) out.push(value);
  return out;
}

export function resolveStimulusFilename(baselineId: number, angleDeg: number, trialType: string): string {
  const suffix = trialType === "different" ? "_R" : "";
  return `${baselineId}_${angleDeg}${suffix}.jpg`;
}

function makeSpec(options: {
  label: string;
  blockKind: "practice" | "scored";
  blockId: string;
  blockIdx: number;
  trialIndexInBlock: number;
  baselineId: number;
  angleDeg: number;
  trialType: "same" | "different";
  practice: boolean;
  angleIndex: number;
  baselineIndex: number;
}): MentalRotationTrialSpec {
  const correctKey = options.trialType === "same" ? SAME_KEY : DIFFERENT_KEY;
  return {
    condition: options.label,
    condition_label: options.label,
    block_kind: options.blockKind,
    block_id: options.blockId,
    block_idx: options.blockIdx,
    practice: options.practice,
    trial_index_in_block: options.trialIndexInBlock,
    baseline_id: options.baselineId,
    angle_deg: options.angleDeg,
    angle_index: options.angleIndex,
    baseline_index: options.baselineIndex,
    trial_type: options.trialType,
    correct_key: correctKey,
    correct_label: options.trialType === "same" ? "Same" : "Different",
    stimulus_filename: resolveStimulusFilename(options.baselineId, options.angleDeg, options.trialType),
    stimulus_summary: "two-object mental-rotation pair"
  };
}

export function buildTrialBank(settings: Record<string, unknown>): Record<string, MentalRotationTrialSpec> {
  const overallSeed = Number(settings.overall_seed ?? 2026);
  const practiceBaselines = intList(settings.practice_baseline_ids, [13, 14, 15]);
  const scoredRanges = rangeList(settings.scored_baseline_ranges, [[1, 6], [7, 12]]);
  const scoredTrialsPerBlock = Math.max(1, Number(settings.trial_per_block ?? settings.trials_per_block ?? 48));
  const totalBlocks = Math.min(Math.max(1, Number(settings.total_blocks ?? scoredRanges.length)), scoredRanges.length);
  const bank: Record<string, MentalRotationTrialSpec> = {};

  let practiceIndex = 1;
  for (const [angleIndex, angleDeg] of ANGLE_DEGREES.entries()) {
    for (const [baselineIndex, baselineId] of practiceBaselines.entries()) {
      const trialType = (angleIndex + baselineIndex) % 2 === 0 ? "same" : "different";
      const label = `practice_${String(practiceIndex).padStart(2, "0")}`;
      bank[label] = makeSpec({ label, blockKind: "practice", blockId: "practice", blockIdx: 0, trialIndexInBlock: practiceIndex, baselineId, angleDeg, trialType, practice: true, angleIndex, baselineIndex });
      practiceIndex += 1;
    }
  }

  for (let blockIdx = 1; blockIdx <= totalBlocks; blockIdx += 1) {
    const baselineIds = expandRange(scoredRanges[blockIdx - 1]);
    const baselineCount = Math.floor(scoredTrialsPerBlock / (ANGLE_DEGREES.length * 2));
    const selectedBaselines = baselineIds.slice(0, baselineCount);
    let trialIndex = 1;
    for (const [angleIndex, angleDeg] of ANGLE_DEGREES.entries()) {
      const orderedBaselines = seededShuffle(selectedBaselines, overallSeed * 1000003 + blockIdx * 1009 + (angleIndex + 71) * 97);
      const pairOrder: Array<"same" | "different"> = angleIndex % 2 === 0 ? ["same", "different"] : ["different", "same"];
      for (const [baselineIndex, baselineId] of orderedBaselines.entries()) {
        for (const trialType of pairOrder) {
          const label = `block${blockIdx}_${String(trialIndex).padStart(2, "0")}`;
          bank[label] = makeSpec({ label, blockKind: "scored", blockId: `block_${blockIdx}`, blockIdx, trialIndexInBlock: trialIndex, baselineId, angleDeg, trialType, practice: false, angleIndex, baselineIndex });
          trialIndex += 1;
        }
      }
    }
  }

  return bank;
}

export function buildSessionPlan(settings: Record<string, unknown>): SessionBlock[] {
  const practiceTrials = Math.max(1, Number(settings.practice_trials ?? 12));
  const scoredTrialsPerBlock = Math.max(1, Number(settings.trial_per_block ?? settings.trials_per_block ?? 48));
  const scoredBlockCount = Math.max(1, Number(settings.total_blocks ?? 2));
  const plan: SessionBlock[] = [{
    block_kind: "practice",
    block_id: "practice",
    block_idx: 0,
    trial_count: practiceTrials,
    trials: Array.from({ length: practiceTrials }, (_, idx) => `practice_${String(idx + 1).padStart(2, "0")}`),
    show_feedback: true
  }];
  for (let blockIdx = 1; blockIdx <= scoredBlockCount; blockIdx += 1) {
    plan.push({
      block_kind: "scored",
      block_id: `block_${blockIdx}`,
      block_idx: blockIdx,
      trial_count: scoredTrialsPerBlock,
      trials: Array.from({ length: scoredTrialsPerBlock }, (_, idx) => `block${blockIdx}_${String(idx + 1).padStart(2, "0")}`),
      show_feedback: false
    });
  }
  return plan;
}

function boolValue(value: unknown): boolean {
  return value === true || value === 1 || String(value).toLowerCase() === "true";
}

export function summarizeTrials(rows: Array<Record<string, unknown>>): Record<string, number> {
  const correct = rows.filter((row) => boolValue(row.response_correct));
  const rts = correct.map((row) => Number(row.response_rt)).filter(Number.isFinite);
  const sameTrials = rows.filter((row) => String(row.trial_type) === "same");
  const differentTrials = rows.filter((row) => String(row.trial_type) === "different");
  const sameCorrect = sameTrials.filter((row) => boolValue(row.response_correct));
  const differentCorrect = differentTrials.filter((row) => boolValue(row.response_correct));
  return {
    n_trials: rows.length,
    n_responded: rows.filter((row) => boolValue(row.responded)).length,
    n_correct: correct.length,
    accuracy: rows.length > 0 ? correct.length / rows.length : 0,
    mean_correct_rt_ms: rts.length > 0 ? (rts.reduce((sum, value) => sum + value, 0) / rts.length) * 1000 : 0,
    timeout_count: rows.filter((row) => boolValue(row.timed_out)).length,
    same_accuracy: sameTrials.length > 0 ? sameCorrect.length / sameTrials.length : 0,
    different_accuracy: differentTrials.length > 0 ? differentCorrect.length / differentTrials.length : 0
  };
}
