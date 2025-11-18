/**
 * Multi-Agent System Sharing Service
 * Handles saving, syncing, and sharing complete multiagent configurations
 */

import unifiedAgentCustomizationService from './unifiedAgentCustomizationService';

export const SHARING_FORMATS = {
  FULL_SYSTEM: 'full_system',
  AGENTS_ONLY: 'agents_only',
  PREFERENCES_ONLY: 'preferences_only'
};

export const SHARE_TYPES = {
  LOCAL: 'local',
  EXPORT: 'export',
  CLOUD: 'cloud', // Future implementation
  URL: 'url'       // Future implementation
};

class MultiAgentSharingService {
  constructor() {
    this.configurations = this.loadSavedConfigurations();
  }

  /**
   * Export complete multiagent system configuration
   */
  async exportSystemConfiguration(system, options = {}) {
    const {
      format = SHARING_FORMATS.FULL_SYSTEM,
      includeHistory = false,
      includeLearningData = false,
      name = null,
      description = null
    } = options;

    try {
      const config = {
        exportMetadata: {
          name: name || `MultiAgent Config ${new Date().toLocaleDateString()}`,
          description: description || 'Exported multiagent system configuration',
          exportedAt: new Date().toISOString(),
          exportVersion: '2.0',
          format,
          generatedBy: 'Writing Assistant v2.0'
        }
      };

      // Export system preferences and agent states
      if (format === SHARING_FORMATS.FULL_SYSTEM || format === SHARING_FORMATS.PREFERENCES_ONLY) {
        config.systemPreferences = {
          userPreferences: this.sanitizeUserPreferences(system.userPreferences, includeHistory),
          confidenceConfig: system.confidenceConfig,
          agentStates: this.exportAgentStates(system),
          systemSettings: {
            autoAnalysis: true, // Default value, can be customized
            progressiveEnhancement: true,
            fallbackEnabled: true
          }
        };
      }

      // Export all agents (built-in customizations + dynamic agents)
      if (format === SHARING_FORMATS.FULL_SYSTEM || format === SHARING_FORMATS.AGENTS_ONLY) {
        config.agents = {
          builtInCustomizations: await this.exportBuiltInCustomizations(),
          dynamicAgents: await this.exportDynamicAgents(includeLearningData),
          templates: unifiedAgentCustomizationService.getTemplates()
        };
      }

      return config;

    } catch (error) {
      console.error('Failed to export system configuration:', error);
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  /**
   * Import complete multiagent system configuration
   */
  async importSystemConfiguration(config, system, options = {}) {
    const {
      overwriteExisting = false,
      mergeAgents = true,
      restorePreferences = true,
      validateBeforeImport = true
    } = options;

    try {
      // Validate import format
      if (validateBeforeImport && !this.validateImportConfig(config)) {
        throw new Error('Invalid configuration format');
      }

      const results = {
        imported: {
          agents: 0,
          preferences: false,
          agentStates: 0
        },
        errors: []
      };

      // Import system preferences
      if (restorePreferences && config.systemPreferences) {
        try {
          await this.importSystemPreferences(config.systemPreferences, system, overwriteExisting);
          results.imported.preferences = true;
        } catch (error) {
          results.errors.push(`Preferences import failed: ${error.message}`);
        }
      }

      // Import agents
      if (config.agents) {
        // Import built-in agent customizations
        if (config.agents.builtInCustomizations) {
          for (const [agentId, customization] of Object.entries(config.agents.builtInCustomizations)) {
            try {
              if (overwriteExisting || !this.hasBuiltInCustomization(agentId)) {
                await unifiedAgentCustomizationService.customizeBuiltInAgent(agentId, customization);
                results.imported.agents++;
              }
            } catch (error) {
              results.errors.push(`Built-in agent ${agentId} import failed: ${error.message}`);
            }
          }
        }

        // Import dynamic agents
        if (config.agents.dynamicAgents) {
          for (const agentConfig of config.agents.dynamicAgents) {
            try {
              const imported = await this.importDynamicAgent(agentConfig, mergeAgents);
              if (imported) {
                results.imported.agents++;
              }
            } catch (error) {
              results.errors.push(`Dynamic agent ${agentConfig.name} import failed: ${error.message}`);
            }
          }
        }

        // Restore agent states
        if (config.systemPreferences?.agentStates) {
          results.imported.agentStates = await this.importAgentStates(
            config.systemPreferences.agentStates, 
            system
          );
        }
      }

      return results;

    } catch (error) {
      console.error('Failed to import system configuration:', error);
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  /**
   * Save configuration locally for later use
   */
  saveConfiguration(config, metadata = {}) {
    const configId = `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const savedConfig = {
      id: configId,
      ...config,
      savedMetadata: {
        ...metadata,
        savedAt: new Date().toISOString(),
        version: '2.0'
      }
    };

    this.configurations[configId] = savedConfig;
    this.saveToBrowser();

    return configId;
  }

  /**
   * Load saved configuration
   */
  loadConfiguration(configId) {
    return this.configurations[configId] || null;
  }

  /**
   * Get all saved configurations
   */
  getSavedConfigurations() {
    return Object.values(this.configurations).map(config => ({
      id: config.id,
      name: config.exportMetadata?.name || config.savedMetadata?.name || 'Unnamed Configuration',
      description: config.exportMetadata?.description || config.savedMetadata?.description || '',
      savedAt: config.savedMetadata?.savedAt || config.exportMetadata?.exportedAt,
      format: config.exportMetadata?.format || SHARING_FORMATS.FULL_SYSTEM,
      agentCount: this.countAgentsInConfig(config)
    }));
  }

  /**
   * Delete saved configuration
   */
  deleteConfiguration(configId) {
    if (this.configurations[configId]) {
      delete this.configurations[configId];
      this.saveToBrowser();
      return true;
    }
    return false;
  }

  /**
   * Generate shareable link (future implementation)
   */
  async generateShareableLink(config, options = {}) {
    // This would integrate with a backend service
    // For now, return a data URL
    const encoded = btoa(JSON.stringify(config));
    return `data:application/json;base64,${encoded}`;
  }

  /**
   * Import from shareable link (future implementation)
   */
  async importFromShareableLink(link) {
    try {
      if (link.startsWith('data:application/json;base64,')) {
        const encoded = link.split(',')[1];
        const decoded = atob(encoded);
        return JSON.parse(decoded);
      }
      // Future: Handle cloud URLs
      throw new Error('Unsupported link format');
    } catch (error) {
      throw new Error(`Failed to import from link: ${error.message}`);
    }
  }

  /**
   * Helper methods
   */
  sanitizeUserPreferences(preferences, includeHistory) {
    const sanitized = {
      thoroughness: preferences.thoroughness,
      costSensitivity: preferences.costSensitivity,
      speedPriority: preferences.speedPriority,
      preferredAgentTypes: Array.from(preferences.preferredAgentTypes || []),
      adaptiveThresholds: preferences.adaptiveThresholds || {},
      enabledAgents: Array.from(preferences.enabledAgents || [])
    };

    if (includeHistory) {
      sanitized.feedbackHistory = (preferences.feedbackHistory || []).slice(-50); // Last 50 items
    }

    return sanitized;
  }

  exportAgentStates(system) {
    const states = {};
    if (system.orchestrator && system.orchestrator.agents) {
      for (const [agentId, agent] of system.orchestrator.agents) {
        states[agentId] = {
          enabled: system.userPreferences.enabledAgents.get(agentId) ?? true,
          escalationThreshold: agent.escalationThreshold,
          originalThreshold: agent.originalEscalationThreshold,
          capabilities: agent.capabilities || [],
          modelTier: agent.modelTier || 'fast'
        };
      }
    }
    return states;
  }

  async exportBuiltInCustomizations() {
    const customizations = {};
    const builtInAgents = unifiedAgentCustomizationService.getCustomizableAgents();
    
    for (const agent of builtInAgents) {
      if (Object.keys(agent.currentCustomization).length > 0) {
        customizations[agent.id] = agent.currentCustomization;
      }
    }
    
    return customizations;
  }

  async exportDynamicAgents(includeLearningData) {
    const dynamicAgents = unifiedAgentCustomizationService.getDynamicAgents();
    
    return dynamicAgents.map(agent => {
      const exported = { ...agent };
      
      if (!includeLearningData) {
        // Remove learning data for cleaner exports
        delete exported.learningData;
        delete exported.usageCount;
      }
      
      return exported;
    });
  }

  async importSystemPreferences(preferences, system, overwrite) {
    if (!system || !preferences) return;

    const currentPrefs = system.userPreferences;
    
    if (overwrite) {
      // Complete replacement
      system.userPreferences = {
        ...system.userPreferences,
        thoroughness: preferences.thoroughness ?? currentPrefs.thoroughness,
        costSensitivity: preferences.costSensitivity ?? currentPrefs.costSensitivity,
        speedPriority: preferences.speedPriority ?? currentPrefs.speedPriority,
        preferredAgentTypes: new Set(preferences.preferredAgentTypes || []),
        adaptiveThresholds: preferences.adaptiveThresholds || {},
        enabledAgents: new Map(preferences.enabledAgents || [])
      };
    } else {
      // Merge preferences
      if (preferences.thoroughness !== undefined) currentPrefs.thoroughness = preferences.thoroughness;
      if (preferences.costSensitivity !== undefined) currentPrefs.costSensitivity = preferences.costSensitivity;
      if (preferences.speedPriority !== undefined) currentPrefs.speedPriority = preferences.speedPriority;
      
      // Merge adaptive thresholds
      Object.assign(currentPrefs.adaptiveThresholds, preferences.adaptiveThresholds || {});
    }

    await system.saveUserPreferences();
  }

  async importAgentStates(agentStates, system) {
    let importedCount = 0;
    
    for (const [agentId, state] of Object.entries(agentStates)) {
      try {
        // Set enabled state
        if (state.enabled !== undefined) {
          system.userPreferences.enabledAgents.set(agentId, state.enabled);
        }
        
        // Update agent if it exists
        if (system.orchestrator && system.orchestrator.agents.has(agentId)) {
          const agent = system.orchestrator.agents.get(agentId);
          if (state.escalationThreshold !== undefined) {
            agent.escalationThreshold = state.escalationThreshold;
          }
        }
        
        importedCount++;
      } catch (error) {
        console.warn(`Failed to import state for agent ${agentId}:`, error);
      }
    }
    
    await system.saveUserPreferences();
    return importedCount;
  }

  async importDynamicAgent(agentConfig, merge) {
    try {
      // Check if agent already exists
      const existingAgent = unifiedAgentCustomizationService.getAgent(agentConfig.id);
      
      if (existingAgent && !merge) {
        // Skip if exists and not merging
        return false;
      }
      
      // Remove ID to create new agent
      const { id, created, lastModified, ...configWithoutMeta } = agentConfig;
      configWithoutMeta.name = existingAgent && merge ? 
        `${configWithoutMeta.name} (Imported)` : 
        configWithoutMeta.name;
      
      unifiedAgentCustomizationService.createDynamicAgent(configWithoutMeta);
      return true;
      
    } catch (error) {
      console.error('Failed to import dynamic agent:', error);
      return false;
    }
  }

  hasBuiltInCustomization(agentId) {
    const agent = unifiedAgentCustomizationService.getAgent(agentId);
    return agent && Object.keys(agent.currentCustomization || {}).length > 0;
  }

  validateImportConfig(config) {
    // Basic validation
    if (!config || typeof config !== 'object') return false;
    if (!config.exportMetadata) return false;
    if (!config.exportMetadata.exportVersion) return false;
    
    // Version compatibility check
    const version = parseFloat(config.exportMetadata.exportVersion);
    if (version < 1.0 || version > 2.0) return false;
    
    return true;
  }

  countAgentsInConfig(config) {
    let count = 0;
    
    if (config.agents) {
      if (config.agents.builtInCustomizations) {
        count += Object.keys(config.agents.builtInCustomizations).length;
      }
      if (config.agents.dynamicAgents) {
        count += config.agents.dynamicAgents.length;
      }
    }
    
    return count;
  }

  loadSavedConfigurations() {
    try {
      const saved = localStorage.getItem('multiagentSharing_configurations');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.warn('Failed to load saved configurations:', error);
      return {};
    }
  }

  saveToBrowser() {
    try {
      localStorage.setItem('multiagentSharing_configurations', JSON.stringify(this.configurations));
    } catch (error) {
      console.warn('Failed to save configurations:', error);
    }
  }

  /**
   * Cleanup old configurations
   */
  cleanup(daysThreshold = 90) {
    const threshold = new Date(Date.now() - (daysThreshold * 24 * 60 * 60 * 1000));
    let cleanedCount = 0;

    for (const [configId, config] of Object.entries(this.configurations)) {
      const savedDate = new Date(config.savedMetadata?.savedAt || config.exportMetadata?.exportedAt);
      if (savedDate < threshold) {
        delete this.configurations[configId];
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.saveToBrowser();
    }

    return cleanedCount;
  }

  /**
   * Get sharing statistics
   */
  getStats() {
    const configs = Object.values(this.configurations);
    
    return {
      totalConfigurations: configs.length,
      totalAgents: configs.reduce((sum, config) => sum + this.countAgentsInConfig(config), 0),
      formatBreakdown: configs.reduce((acc, config) => {
        const format = config.exportMetadata?.format || SHARING_FORMATS.FULL_SYSTEM;
        acc[format] = (acc[format] || 0) + 1;
        return acc;
      }, {}),
      averageAgentsPerConfig: configs.length > 0 
        ? configs.reduce((sum, config) => sum + this.countAgentsInConfig(config), 0) / configs.length 
        : 0
    };
  }
}

const multiAgentSharingService = new MultiAgentSharingService();
export default multiAgentSharingService;