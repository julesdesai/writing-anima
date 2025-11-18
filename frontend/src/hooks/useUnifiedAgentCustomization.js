/**
 * Unified Agent Customization Hook
 * Provides React interface for both prompt customization and dynamic agent management
 */

import { useState, useEffect, useCallback } from 'react';
import unifiedAgentCustomizationService, { AGENT_TYPES, CUSTOMIZATION_LEVELS } from '../services/unifiedAgentCustomizationService';

export const useUnifiedAgentCustomization = () => {
  const [agents, setAgents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const allAgents = unifiedAgentCustomizationService.getAllAgents();
      const allTemplates = unifiedAgentCustomizationService.getTemplates();

      setAgents(allAgents);
      setTemplates(allTemplates);
      setInitialized(true);
    } catch (err) {
      console.error('Failed to load agent data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (!initialized) {
      loadData();
    }
  }, [initialized, loadData]);

  // Get agents by type
  const getBuiltInAgents = useCallback(() => {
    return agents.filter(agent => agent.type === AGENT_TYPES.BUILT_IN);
  }, [agents]);

  const getDynamicAgents = useCallback(() => {
    return agents.filter(agent => agent.type === AGENT_TYPES.DYNAMIC);
  }, [agents]);

  const getCustomizableAgents = useCallback(() => {
    return agents.filter(agent => agent.customizationLevel === CUSTOMIZATION_LEVELS.PROMPT_ONLY);
  }, [agents]);

  // Get agents by category
  const getAgentsByCategory = useCallback((category) => {
    return unifiedAgentCustomizationService.getAgentsByCategory(category);
  }, []);

  // Search functionality
  const searchAgents = useCallback((query) => {
    return unifiedAgentCustomizationService.searchAgents(query);
  }, []);

  // Built-in agent customization
  const customizeBuiltInAgent = useCallback(async (agentId, customElements) => {
    try {
      setLoading(true);
      setError(null);

      await unifiedAgentCustomizationService.customizeBuiltInAgent(agentId, customElements);
      await loadData(); // Refresh data

      return { success: true };
    } catch (err) {
      console.error('Failed to customize built-in agent:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  const resetBuiltInAgent = useCallback(async (agentId) => {
    try {
      setLoading(true);
      setError(null);

      await unifiedAgentCustomizationService.resetBuiltInAgent(agentId);
      await loadData();

      return { success: true };
    } catch (err) {
      console.error('Failed to reset built-in agent:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  // Dynamic agent management
  const createDynamicAgent = useCallback(async (config) => {
    try {
      setLoading(true);
      setError(null);

      const newAgent = unifiedAgentCustomizationService.createDynamicAgent(config);
      await loadData();

      return newAgent;
    } catch (err) {
      console.error('Failed to create dynamic agent:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  const createFromTemplate = useCallback(async (templateKey, customizations = {}) => {
    try {
      setLoading(true);
      setError(null);

      const newAgent = unifiedAgentCustomizationService.createFromTemplate(templateKey, customizations);
      await loadData();

      return newAgent;
    } catch (err) {
      console.error('Failed to create agent from template:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  const updateDynamicAgent = useCallback(async (agentId, updates) => {
    try {
      setLoading(true);
      setError(null);

      const updatedAgent = unifiedAgentCustomizationService.updateDynamicAgent(agentId, updates);
      await loadData();

      return updatedAgent;
    } catch (err) {
      console.error('Failed to update dynamic agent:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  const deleteDynamicAgent = useCallback(async (agentId) => {
    try {
      setLoading(true);
      setError(null);

      await unifiedAgentCustomizationService.deleteDynamicAgent(agentId);
      await loadData();

      return { success: true };
    } catch (err) {
      console.error('Failed to delete dynamic agent:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  const cloneDynamicAgent = useCallback(async (agentId, modifications = {}) => {
    try {
      setLoading(true);
      setError(null);

      const clonedAgent = unifiedAgentCustomizationService.cloneDynamicAgent(agentId, modifications);
      await loadData();

      return clonedAgent;
    } catch (err) {
      console.error('Failed to clone dynamic agent:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  // Agent retrieval
  const getAgent = useCallback((agentId) => {
    return unifiedAgentCustomizationService.getAgent(agentId);
  }, []);

  // Import/Export
  const exportAgent = useCallback((agentId) => {
    try {
      return unifiedAgentCustomizationService.exportAgent(agentId);
    } catch (err) {
      console.error('Failed to export agent:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  const importAgent = useCallback(async (exportedConfig) => {
    try {
      setLoading(true);
      setError(null);

      const importedAgent = await unifiedAgentCustomizationService.importAgent(exportedConfig);
      await loadData();

      return importedAgent;
    } catch (err) {
      console.error('Failed to import agent:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  // Statistics and analytics
  const getAgentStats = useCallback(() => {
    return unifiedAgentCustomizationService.getAgentStats();
  }, []);

  // Utility functions
  const cleanupUnusedAgents = useCallback(async (daysThreshold = 30) => {
    try {
      setLoading(true);
      const cleanedCount = unifiedAgentCustomizationService.cleanupUnusedAgents(daysThreshold);
      await loadData();
      return cleanedCount;
    } catch (err) {
      console.error('Failed to cleanup agents:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  const resetAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await unifiedAgentCustomizationService.resetAll();
      await loadData();

      return { success: true };
    } catch (err) {
      console.error('Failed to reset all:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  // Computed values
  const stats = getAgentStats();
  const builtInAgents = getBuiltInAgents();
  const dynamicAgents = getDynamicAgents();
  const customizableAgents = getCustomizableAgents();

  // Helper functions for UI
  const hasCustomizations = useCallback(() => {
    return builtInAgents.some(agent => 
      Object.keys(agent.currentCustomization || {}).length > 0
    ) || dynamicAgents.length > 0;
  }, [builtInAgents, dynamicAgents]);

  const getCustomizationSummary = useCallback(() => {
    const customizedBuiltIn = builtInAgents.filter(agent => 
      Object.keys(agent.currentCustomization || {}).length > 0
    ).length;
    
    return {
      customizedBuiltIn,
      dynamicAgents: dynamicAgents.length,
      total: customizedBuiltIn + dynamicAgents.length
    };
  }, [builtInAgents, dynamicAgents]);

  // Error handling
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Refresh data
  const refresh = useCallback(() => {
    return loadData();
  }, [loadData]);

  return {
    // State
    agents,
    templates,
    loading,
    error,
    initialized,

    // Computed values
    stats,
    builtInAgents,
    dynamicAgents,
    customizableAgents,

    // Data retrieval
    getAgent,
    getAgentsByCategory,
    searchAgents,

    // Built-in agent customization
    customizeBuiltInAgent,
    resetBuiltInAgent,

    // Dynamic agent management
    createDynamicAgent,
    createFromTemplate,
    updateDynamicAgent,
    deleteDynamicAgent,
    cloneDynamicAgent,

    // Import/Export
    exportAgent,
    importAgent,

    // Utilities
    getAgentStats,
    cleanupUnusedAgents,
    resetAll,
    hasCustomizations,
    getCustomizationSummary,

    // Actions
    refresh,
    clearError,

    // Service access (for advanced use cases)
    service: unifiedAgentCustomizationService
  };
};

export default useUnifiedAgentCustomization;