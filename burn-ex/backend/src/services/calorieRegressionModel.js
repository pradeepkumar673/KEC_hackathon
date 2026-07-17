// ── Placeholder regression layer ────────────────────────────────────────
// This is a hand-set linear model standing in for a real trained model.
// It exists so the calorie engine has an ML adjustment slot from day one.
//
// To upgrade to actual gradient boosting (XGBoost) later:
//   1. Collect real session data (weight, reps/min, form score, MET,
//      actual measured calories from a wearable/lab reference)
//   2. Train an XGBoost regressor offline (Python) predicting the
//      "multiplier" target = actualCalories / baseMETCalories
//   3. Export to ONNX, load it here with onnxruntime-node, OR stand up
//      a small Python FastAPI service and call it over HTTP from
//      calorieEngine.js
//   4. Replace only the body of predict() below — the interface
//      (input shape, output range) stays identical, so nothing else
//      in the app needs to change.

const WEIGHTS = {
  intercept: 1.0,
  repsPerMinutePerUnit: 0.01, // higher pace → slightly more calorie burn
  formScoreDeviationPerUnit: 0.002, // better form → marginally more controlled effort
};

const MIN_MULTIPLIER = 0.8;
const MAX_MULTIPLIER = 1.3;

class CalorieRegressionModel {
  /**
   * @param {Object} features
   * @param {number} features.repsPerMinute
   * @param {number} features.avgFormScore - 0-100
   * @returns {number} multiplier to apply to the base MET calorie estimate
   */
  predict({ repsPerMinute = 0, avgFormScore = 70 }) {
    const formDeviation = avgFormScore - 70; // baseline "average" form
    let multiplier =
      WEIGHTS.intercept +
      WEIGHTS.repsPerMinutePerUnit * repsPerMinute +
      WEIGHTS.formScoreDeviationPerUnit * formDeviation;

    return Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, multiplier));
  }
}

export default new CalorieRegressionModel();
