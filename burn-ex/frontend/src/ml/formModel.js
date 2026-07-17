/**
 * Form score — rule-based depth + alignment (no TF.js).
 * Synchronous so MediaPipe pose loop is never blocked.
 */

export const loadFormModel = async () => ({ ready: true });

export const computeFormScore = (config = null) => {
  if (config?.depthScore !== undefined && config?.alignScore !== undefined) {
    return Math.round(config.depthScore * 0.6 + config.alignScore * 0.4);
  }
  return 75;
};

/** @deprecated Use computeFormScore — kept for compatibility */
export const predictFormScore = async (_landmarks, config = null) => computeFormScore(config);
