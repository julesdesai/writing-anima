/**
 * Unified Agent Customization Service
 * Manages both prompt customization for existing agents and creation of new dynamic agents
 */

import promptCustomizationService from './promptCustomizationService';
import { AGENT_TEMPLATES } from '../agents/AgentTemplates';

export const CUSTOMIZATION_LEVELS = {
  PROMPT_ONLY: 'prompt_only',     // Customize existing agent prompts
  FULL_AGENT: 'full_agent'        // Create new dynamic agents
};

export const AGENT_TYPES = {
  BUILT_IN: 'built_in',           // Pre-existing system agents
  DYNAMIC: 'dynamic',             // User-created agents
  TEMPLATE: 'template'            // Created from templates
};

class UnifiedAgentCustomizationService {
  constructor() {
    this.builtInAgents = this.loadBuiltInAgents();
    this.userCustomizations = this.loadUserCustomizations();
  }

  /**
   * Load built-in agents from prompt customization service
   */
  loadBuiltInAgents() {
    const prompts = promptCustomizationService.getAllPrompts();
    return prompts.map(prompt => ({
      id: prompt.id,
      name: prompt.name,
      description: prompt.description,
      type: AGENT_TYPES.BUILT_IN,
      customizationLevel: CUSTOMIZATION_LEVELS.PROMPT_ONLY,
      customizableElements: prompt.customizableElements,
      currentCustomization: promptCustomizationService.getPrompt(prompt.id)?.customElements || {},
      responseStructure: prompt.responseStructure,
      isActive: true,
      category: this.inferCategoryFromAgent(prompt.id),
      icon: this.getAgentIcon(prompt.id),
      lastModified: new Date().toISOString()
    }));
  }

  /**
   * Load user customizations from localStorage
   */
  loadUserCustomizations() {
    try {
      const saved = localStorage.getItem('unifiedAgentCustomizations');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.warn('Failed to load user customizations:', error);
      return {};
    }
  }

  /**
   * Save user customizations to localStorage
   */
  saveUserCustomizations() {
    try {
      localStorage.setItem('unifiedAgentCustomizations', JSON.stringify(this.userCustomizations));
    } catch (error) {
      console.warn('Failed to save user customizations:', error);
    }
  }

  /**
   * Get all available agents (built-in + dynamic)
   */
  getAllAgents() {
    const builtInAgents = this.builtInAgents.map(agent => ({
      ...agent,
      currentCustomization: promptCustomizationService.getPrompt(agent.id)?.customElements || {}
    }));

    const dynamicAgents = Object.values(this.userCustomizations).filter(
      customization => customization.type === AGENT_TYPES.DYNAMIC
    );

    return [
      ...builtInAgents,
      ...dynamicAgents
    ].sort((a, b) => {
      // Sort by: built-in first, then by name
      if (a.type !== b.type) {
        return a.type === AGENT_TYPES.BUILT_IN ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get agents by category
   */
  getAgentsByCategory(category) {
    return this.getAllAgents().filter(agent => agent.category === category);
  }

  /**
   * Get customizable agents (built-in that can be customized)
   */
  getCustomizableAgents() {
    return this.builtInAgents;
  }

  /**
   * Get dynamic agents only
   */
  getDynamicAgents() {
    return Object.values(this.userCustomizations).filter(
      customization => customization.type === AGENT_TYPES.DYNAMIC
    );
  }

  /**
   * Get available templates
   */
  getTemplates() {
    return Object.entries(AGENT_TEMPLATES).map(([key, template]) => ({
      ...template,
      id: key,
      type: AGENT_TYPES.TEMPLATE,
      customizationLevel: CUSTOMIZATION_LEVELS.FULL_AGENT
    }));
  }

  /**
   * Customize a built-in agent's prompts
   */
  async customizeBuiltInAgent(agentId, customElements) {
    try {
      await promptCustomizationService.updatePromptElements(agentId, customElements);
      
      // Update local cache
      const agentIndex = this.builtInAgents.findIndex(a => a.id === agentId);
      if (agentIndex !== -1) {
        this.builtInAgents[agentIndex].currentCustomization = customElements;
        this.builtInAgents[agentIndex].lastModified = new Date().toISOString();
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to customize built-in agent:', error);
      throw error;
    }
  }

  /**
   * Reset built-in agent to defaults
   */
  async resetBuiltInAgent(agentId) {
    try {
      await promptCustomizationService.resetToDefaults(agentId);
      
      // Update local cache
      const agentIndex = this.builtInAgents.findIndex(a => a.id === agentId);
      if (agentIndex !== -1) {
        this.builtInAgents[agentIndex].currentCustomization = {};
        this.builtInAgents[agentIndex].lastModified = new Date().toISOString();
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to reset built-in agent:', error);
      throw error;
    }
  }

  /**
   * Create a new dynamic agent
   */
  createDynamicAgent(config) {
    const agentId = `dynamic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const dynamicAgent = {
      id: agentId,
      name: config.name,
      description: config.description,
      type: AGENT_TYPES.DYNAMIC,
      customizationLevel: CUSTOMIZATION_LEVELS.FULL_AGENT,
      specialization: config.specialization,
      customPrompt: config.customPrompt,
      modelTier: config.modelTier,
      capabilities: config.capabilities || [],
      focusAreas: config.focusAreas || [],
      outputFormat: config.outputFormat,
      persona: config.persona,
      userSettings: config.userSettings || {},
      category: config.category || 'custom',
      icon: config.icon || '🤖',
      isActive: true,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      usageCount: 0,
      templateOrigin: config.templateOrigin || null,
      learningData: {
        averageConfidence: 0.5,
        successfulAnalyses: 0,
        userFeedback: [],
        performanceHistory: []
      }
    };

    this.userCustomizations[agentId] = dynamicAgent;
    this.saveUserCustomizations();

    return dynamicAgent;
  }

  /**
   * Create dynamic agent from template
   */
  createFromTemplate(templateKey, customizations = {}) {
    const template = AGENT_TEMPLATES[templateKey];
    if (!template) {
      throw new Error(`Template ${templateKey} not found`);
    }

    const config = {
      ...template,
      ...customizations,
      templateOrigin: templateKey,
      category: template.category
    };

    return this.createDynamicAgent(config);
  }

  /**
   * Update dynamic agent
   */
  updateDynamicAgent(agentId, updates) {
    const agent = this.userCustomizations[agentId];
    if (!agent || agent.type !== AGENT_TYPES.DYNAMIC) {
      throw new Error(`Dynamic agent ${agentId} not found`);
    }

    // Update allowed fields
    const allowedUpdates = [
      'name', 'description', 'specialization', 'customPrompt', 
      'focusAreas', 'outputFormat', 'persona', 'userSettings', 'category'
    ];

    for (const key of allowedUpdates) {
      if (updates.hasOwnProperty(key)) {
        agent[key] = updates[key];
      }
    }

    agent.lastModified = new Date().toISOString();
    this.saveUserCustomizations();

    return agent;
  }

  /**
   * Delete dynamic agent
   */
  deleteDynamicAgent(agentId) {
    const agent = this.userCustomizations[agentId];
    if (!agent || agent.type !== AGENT_TYPES.DYNAMIC) {
      throw new Error(`Dynamic agent ${agentId} not found`);
    }

    delete this.userCustomizations[agentId];
    this.saveUserCustomizations();

    return { success: true };
  }

  /**
   * Clone dynamic agent
   */
  cloneDynamicAgent(agentId, modifications = {}) {
    const agent = this.userCustomizations[agentId];
    if (!agent || agent.type !== AGENT_TYPES.DYNAMIC) {
      throw new Error(`Dynamic agent ${agentId} not found`);
    }

    const config = {
      ...agent,
      ...modifications,
      name: modifications.name || `${agent.name} (Copy)`,
      templateOrigin: agent.templateOrigin,
      // Reset usage and learning data
      usageCount: 0,
      learningData: {
        averageConfidence: 0.5,
        successfulAnalyses: 0,
        userFeedback: [],
        performanceHistory: []
      }
    };

    return this.createDynamicAgent(config);
  }

  /**
   * Get agent by ID (works for both built-in and dynamic)
   */
  getAgent(agentId) {
    // Check built-in agents first
    const builtIn = this.builtInAgents.find(a => a.id === agentId);
    if (builtIn) {
      return {
        ...builtIn,
        currentCustomization: promptCustomizationService.getPrompt(agentId)?.customElements || {}
      };
    }

    // Check dynamic agents
    return this.userCustomizations[agentId] || null;
  }

  /**
   * Export agent configuration
   */
  exportAgent(agentId) {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    return {
      ...agent,
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0'
    };
  }

  /**
   * Import agent configuration
   */
  importAgent(exportedConfig) {
    if (!exportedConfig || exportedConfig.exportVersion !== '1.0') {
      throw new Error('Invalid or unsupported agent export format');
    }

    if (exportedConfig.type === AGENT_TYPES.BUILT_IN) {
      // Import as prompt customization
      const { currentCustomization } = exportedConfig;
      return this.customizeBuiltInAgent(exportedConfig.id, currentCustomization);
    } else {
      // Import as new dynamic agent
      const { exportedAt, exportVersion, id, created, lastModified, ...config } = exportedConfig;
      config.name = `${config.name} (Imported)`;
      return this.createDynamicAgent(config);
    }
  }

  /**
   * Search agents by query
   */
  searchAgents(query) {
    const searchTerm = query.toLowerCase();
    return this.getAllAgents().filter(agent =>
      agent.name.toLowerCase().includes(searchTerm) ||
      agent.description.toLowerCase().includes(searchTerm) ||
      (agent.specialization && agent.specialization.toLowerCase().includes(searchTerm)) ||
      (agent.focusAreas && agent.focusAreas.some(area => area.toLowerCase().includes(searchTerm)))
    );
  }

  /**
   * Get agent statistics
   */
  getAgentStats() {
    const allAgents = this.getAllAgents();
    const dynamicAgents = this.getDynamicAgents();
    const customizedBuiltIn = this.builtInAgents.filter(a => 
      Object.keys(a.currentCustomization).length > 0
    );

    return {
      total: allAgents.length,
      builtIn: this.builtInAgents.length,
      dynamic: dynamicAgents.length,
      customizedBuiltIn: customizedBuiltIn.length,
      templates: Object.keys(AGENT_TEMPLATES).length,
      totalUsage: dynamicAgents.reduce((sum, agent) => sum + (agent.usageCount || 0), 0),
      averagePerformance: dynamicAgents.length > 0 
        ? dynamicAgents.reduce((sum, agent) => sum + (agent.learningData?.averageConfidence || 0.5), 0) / dynamicAgents.length
        : 0.5
    };
  }

  /**
   * Helper methods
   */
  inferCategoryFromAgent(agentId) {
    const categoryMap = {
      intellectualCritic: 'analysis',
      clarityStyle: 'writing',
      evidenceQuality: 'research',
      logicalFallacy: 'analysis',
      purposeFulfillment: 'analysis'
    };
    return categoryMap[agentId] || 'general';
  }

  getAgentIcon(agentId) {
    const iconMap = {
      intellectualCritic: '🧠',
      clarityStyle: '📝',
      evidenceQuality: '📊',
      logicalFallacy: '🔍',
      purposeFulfillment: '🎯'
    };
    return iconMap[agentId] || '⚙️';
  }

  /**
   * Cleanup unused dynamic agents
   */
  cleanupUnusedAgents(daysThreshold = 30) {
    const threshold = new Date(Date.now() - (daysThreshold * 24 * 60 * 60 * 1000));
    let cleanedCount = 0;

    for (const [agentId, agent] of Object.entries(this.userCustomizations)) {
      if (agent.type === AGENT_TYPES.DYNAMIC && 
          agent.usageCount === 0 && 
          new Date(agent.lastModified) < threshold) {
        delete this.userCustomizations[agentId];
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.saveUserCustomizations();
    }

    return cleanedCount;
  }

  /**
   * Reset all customizations
   */
  async resetAll() {
    // Reset built-in agent customizations
    for (const agent of this.builtInAgents) {
      await this.resetBuiltInAgent(agent.id);
    }

    // Clear all dynamic agents
    this.userCustomizations = {};
    this.saveUserCustomizations();

    return { success: true };
  }
}

export default new UnifiedAgentCustomizationService();