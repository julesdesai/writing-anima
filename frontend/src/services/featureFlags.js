/**
 * Simple Feature Flags for Multi-Agent System
 * Toggle between legacy and new system easily
 */

export const FEATURE_FLAGS = {
  MULTI_AGENT_SYSTEM: 'multiAgentSystem',
  PROGRESSIVE_ENHANCEMENT: 'progressiveEnhancement',
  DYNAMIC_THRESHOLDS: 'dynamicThresholds'
};

class FeatureFlags {
  constructor() {
    this.flags = this.loadFlags();
  }

  loadFlags() {
    const defaults = {
      [FEATURE_FLAGS.MULTI_AGENT_SYSTEM]: false, // Start disabled
      [FEATURE_FLAGS.PROGRESSIVE_ENHANCEMENT]: false,
      [FEATURE_FLAGS.DYNAMIC_THRESHOLDS]: false
    };

    try {
      const stored = localStorage.getItem('featureFlags');
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch {
      return defaults;
    }
  }

  isEnabled(flagName) {
    // URL override
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get(flagName) === 'true') return true;
    if (urlParams.get(flagName) === 'false') return false;
    
    return this.flags[flagName] || false;
  }

  enable(flagName) {
    this.flags[flagName] = true;
    this.saveFlags();
  }

  disable(flagName) {
    this.flags[flagName] = false;
    this.saveFlags();
  }

  saveFlags() {
    localStorage.setItem('featureFlags', JSON.stringify(this.flags));
  }

  getAll() {
    return { ...this.flags };
  }
}

export default new FeatureFlags();