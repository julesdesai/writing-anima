/**
 * Custom Agents Hook - Integration with MultiAgentSystem
 * Provides React interface for managing dynamic agents
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMultiAgentAnalysis } from './useMultiAgentAnalysis';

export const useCustomAgents = () => {
  const { system } = useMultiAgentAnalysis();
  const [userAgents, setUserAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  
  // Use a ref to store current user ID (would come from auth in real app)
  const userIdRef = useRef('default_user');
  const userId = userIdRef.current;

  // Initialize and load user agents
  const loadUserAgents = useCallback(async () => {
    if (!system?.orchestrator) return;

    try {
      setLoading(true);
      setError(null);
      
      const agents = system.orchestrator.getUserDynamicAgents(userId);
      setUserAgents(agents);
      setInitialized(true);
    } catch (err) {
      console.error('Failed to load user agents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [system, userId]);

  // Load agents when system is ready
  useEffect(() => {
    if (system?.orchestrator && !initialized) {
      loadUserAgents();
    }
  }, [system, initialized, loadUserAgents]);

  // Create a new dynamic agent
  const createAgent = useCallback(async (config) => {
    if (!system?.orchestrator) {
      throw new Error('Agent system not ready');
    }

    try {
      setLoading(true);
      setError(null);

      const newAgent = system.orchestrator.createDynamicAgent(userId, config);
      
      // Reload agents to get updated list
      await loadUserAgents();
      
      return newAgent;
    } catch (err) {
      console.error('Failed to create agent:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [system, userId, loadUserAgents]);

  // Create agent from template
  const createAgentFromTemplate = useCallback(async (templateKey, customizations = {}) => {
    if (!system?.orchestrator) {
      throw new Error('Agent system not ready');
    }

    try {
      setLoading(true);
      setError(null);

      const newAgent = system.orchestrator.createDynamicAgentFromTemplate(
        userId, 
        templateKey, 
        customizations
      );
      
      // Reload agents to get updated list
      await loadUserAgents();
      
      return newAgent;
    } catch (err) {
      console.error('Failed to create agent from template:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [system, userId, loadUserAgents]);

  // Update an existing agent
  const updateAgent = useCallback(async (agentId, updates) => {
    if (!system?.orchestrator) {
      throw new Error('Agent system not ready');
    }

    try {
      setLoading(true);
      setError(null);

      const updatedAgent = system.orchestrator.updateDynamicAgent(userId, agentId, updates);
      
      // Update local state
      setUserAgents(prev => prev.map(agent => 
        agent.agentId === agentId 
          ? { ...agent, ...updatedAgent.exportConfig() }
          : agent
      ));
      
      return updatedAgent;
    } catch (err) {
      console.error('Failed to update agent:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [system, userId]);

  // Delete an agent
  const deleteAgent = useCallback(async (agentId) => {
    if (!system?.orchestrator) {
      throw new Error('Agent system not ready');
    }

    try {
      setLoading(true);
      setError(null);

      system.orchestrator.deleteDynamicAgent(userId, agentId);
      
      // Update local state
      setUserAgents(prev => prev.filter(agent => agent.agentId !== agentId));
    } catch (err) {
      console.error('Failed to delete agent:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [system, userId]);

  // Clone an agent
  const cloneAgent = useCallback(async (agentId, modifications = {}) => {
    if (!system?.orchestrator) {
      throw new Error('Agent system not ready');
    }

    try {
      setLoading(true);
      setError(null);

      const clonedAgent = system.orchestrator.cloneDynamicAgent(userId, agentId, modifications);
      
      // Reload agents to get updated list
      await loadUserAgents();
      
      return clonedAgent;
    } catch (err) {
      console.error('Failed to clone agent:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [system, userId, loadUserAgents]);

  // Process feedback for an agent
  const processFeedback = useCallback(async (agentId, feedback) => {
    if (!system?.orchestrator) {
      throw new Error('Agent system not ready');
    }

    try {
      setError(null);

      system.orchestrator.processDynamicAgentFeedback(userId, agentId, feedback);
      
      // Reload agents to get updated performance metrics
      await loadUserAgents();
    } catch (err) {
      console.error('Failed to process feedback:', err);
      setError(err.message);
      throw err;
    }
  }, [system, userId, loadUserAgents]);

  // Export an agent configuration
  const exportAgent = useCallback((agentId) => {
    if (!system?.orchestrator) {
      throw new Error('Agent system not ready');
    }

    try {
      return system.orchestrator.exportDynamicAgent(userId, agentId);
    } catch (err) {
      console.error('Failed to export agent:', err);
      setError(err.message);
      throw err;
    }
  }, [system, userId]);

  // Import an agent configuration
  const importAgent = useCallback(async (exportedConfig) => {
    if (!system?.orchestrator) {
      throw new Error('Agent system not ready');
    }

    try {
      setLoading(true);
      setError(null);

      const importedAgent = system.orchestrator.importDynamicAgent(userId, exportedConfig);
      
      // Reload agents to get updated list
      await loadUserAgents();
      
      return importedAgent;
    } catch (err) {
      console.error('Failed to import agent:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [system, userId, loadUserAgents]);

  // Get agent statistics
  const getAgentStats = useCallback(() => {
    if (!system?.orchestrator) {
      return null;
    }

    try {
      return system.orchestrator.getDynamicAgentStats();
    } catch (err) {
      console.error('Failed to get agent stats:', err);
      return null;
    }
  }, [system]);

  // Get a specific agent by ID
  const getAgent = useCallback((agentId) => {
    return userAgents.find(agent => agent.agentId === agentId) || null;
  }, [userAgents]);

  // Check if user can create more agents
  const canCreateMore = useCallback(() => {
    if (!system?.orchestrator) return false;
    return userAgents.length < system.orchestrator.maxDynamicAgentsPerUser;
  }, [system, userAgents.length]);

  // Get user limits info
  const getLimitsInfo = useCallback(() => {
    if (!system?.orchestrator) return { current: 0, max: 10 };
    
    return {
      current: userAgents.length,
      max: system.orchestrator.maxDynamicAgentsPerUser,
      canCreate: userAgents.length < system.orchestrator.maxDynamicAgentsPerUser
    };
  }, [system, userAgents.length]);

  // Cleanup unused agents
  const cleanupAgents = useCallback(async () => {
    if (!system?.orchestrator) {
      throw new Error('Agent system not ready');
    }

    try {
      setLoading(true);
      setError(null);

      const cleanedCount = system.orchestrator.cleanupDynamicAgents();
      
      // Reload agents to reflect cleanup
      await loadUserAgents();
      
      return cleanedCount;
    } catch (err) {
      console.error('Failed to cleanup agents:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [system, loadUserAgents]);

  // Reset all agents (for development/testing)
  const resetAllAgents = useCallback(async () => {
    if (!system?.orchestrator) {
      throw new Error('Agent system not ready');
    }

    try {
      setLoading(true);
      setError(null);

      // Delete all user agents
      const agentIds = userAgents.map(agent => agent.agentId);
      for (const agentId of agentIds) {
        system.orchestrator.deleteDynamicAgent(userId, agentId);
      }
      
      setUserAgents([]);
    } catch (err) {
      console.error('Failed to reset agents:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [system, userId, userAgents]);

  // Refresh agents from system
  const refreshAgents = useCallback(() => {
    return loadUserAgents();
  }, [loadUserAgents]);

  // Analyze content with custom agents included
  const analyzeWithCustomAgents = useCallback(async (content, options = {}) => {
    if (!system) {
      throw new Error('Agent system not ready');
    }

    try {
      // Include user's custom agents in the requested agents
      const customAgentIds = userAgents
        .filter(agent => agent.usageCount >= 0) // Include all agents, even unused ones
        .map(agent => agent.agentId);

      const enhancedOptions = {
        ...options,
        requestedAgents: [
          ...(options.requestedAgents || []),
          ...customAgentIds
        ]
      };

      return await system.analyzeContent(content, enhancedOptions);
    } catch (err) {
      console.error('Failed to analyze with custom agents:', err);
      throw err;
    }
  }, [system, userAgents]);

  return {
    // State
    userAgents,
    loading,
    error,
    initialized,
    
    // Agent management
    createAgent,
    createAgentFromTemplate,
    updateAgent,
    deleteAgent,
    cloneAgent,
    getAgent,
    
    // Feedback and analytics
    processFeedback,
    getAgentStats,
    
    // Import/Export
    exportAgent,
    importAgent,
    
    // Utilities
    canCreateMore,
    getLimitsInfo,
    cleanupAgents,
    resetAllAgents,
    refreshAgents,
    
    // Analysis
    analyzeWithCustomAgents,
    
    // System info
    systemReady: !!system?.orchestrator,
    userId
  };
};

export default useCustomAgents;