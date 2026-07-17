/**
 * Form score — rule-based depth + alignment (no TF.js).
 * Privacy: runs entirely in the browser with MediaPipe landmarks.
 */

export const loadFormModel = async () => ({ ready: true });

export const predictFormScore = async (_landmarks, config = null) => {
  if (config?.depthScore !== undefined && config?.alignScore !== undefined) {
    return Math.round(config.depthScore * 0.6 + config.alignScore * 0.4);
  }
  return 75;
};
