/**
 * Live calorie multiplier — rule-based MET hybrid (no TF.js).
 * Privacy: runs entirely in the browser.
 */

export const loadCalorieModel = async () => ({ ready: true });

export const predictMultiplier = async (features) => {
  const { repsPerMinute, avgFormScore } = features;
  const rpm = repsPerMinute ?? 0;
  const form = avgFormScore ?? 70;
  const base = 1.0 + 0.012 * rpm + 0.003 * (form - 70);
  return Math.min(1.35, Math.max(0.85, base));
};
