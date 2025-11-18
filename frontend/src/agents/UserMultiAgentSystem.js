/**
 * User Multi-Agent System - Simplified Agent System
 * Uses only user-created agents from templates or scratch
 */

import UserAgent from './UserAgent';
import userAgentService from '../services/userAgentService';

export class UserMultiAgentSystem {
  constructor() {
    this.userAgents = new Map();
    this.initialized = false;
    
    // Simplified configuration
    this.config = {
      maxParallelAgents: 4,
      defaultTimeout: 30000,
      retryAttempts: 2
    };
    
    // Performance tracking
    this.systemMetrics = {
      totalAnalyses: 0,
      successfulAnalyses: 0,
      totalAgentsRun: 0,
      averageResponseTime: 0,
      errorRate: 0
    };
  }

  /**
   * Initialize the system with user agents
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('[UserMultiAgentSystem] Initializing with user agents...');
      
      // Load all enabled user agents
      const enabledAgents = userAgentService.getEnabledAgents();
      
      console.log(`[UserMultiAgentSystem] Found ${enabledAgents.length} enabled user agents`);
      
      // Create UserAgent instances for each enabled user agent
      for (const agentConfig of enabledAgents) {
        try {
          const userAgent = UserAgent.fromConfig(agentConfig);
          this.userAgents.set(agentConfig.id, {
            instance: userAgent,
            config: agentConfig,
            enabled: true
          });
          
          console.log(`[UserMultiAgentSystem] Registered agent: ${agentConfig.name}`);
        } catch (error) {
          console.error(`[UserMultiAgentSystem] Failed to create agent ${agentConfig.name}:`, error);
        }
      }

      this.initialized = true;
      console.log(`[UserMultiAgentSystem] Successfully initialized with ${this.userAgents.size} agents`);
      
    } catch (error) {
      console.error('[UserMultiAgentSystem] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Refresh agents (reload from userAgentService)
   */
  async refresh() {
    console.log('[UserMultiAgentSystem] Refreshing agent configuration...');
    this.userAgents.clear();
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Main analysis method
   */
  async analyzeContent(content, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const {
      purpose = 'General analysis',
      urgency = 'normal',
      maxAgents = this.config.maxParallelAgents,
      onProgress = null,
      requestedAgents = null // Specific agent IDs to run
    } = options;

    console.log('[UserMultiAgentSystem] Starting analysis with options:', {
      contentLength: content?.length,
      purpose,
      urgency,
      maxAgents,
      totalAgents: this.userAgents.size,
      requestedAgents
    });

    if (!content || content.trim().length === 0) {
      throw new Error('No content provided for analysis');
    }

    if (this.userAgents.size === 0) {
      return {
        insights: [{
          type: 'system_info',
          agent: 'System',
          title: 'No Agents Available',
          feedback: 'No user agents are currently enabled. Please create and enable some agents to perform analysis.',
          suggestion: 'Go to the Agent Management page to create agents from templates or build custom ones.',
          confidence: 1.0,
          severity: 'medium',
          timestamp: new Date().toISOString(),
          positions: [],
          textSnippets: []
        }],
        confidence: 1.0,
        processingTime: Date.now() - startTime,
        agentsUsed: [],
        systemInfo: 'No agents available'
      };
    }

    try {
      // Select agents to run
      const agentsToRun = this.selectAgentsForAnalysis(requestedAgents, maxAgents);
      
      console.log(`[UserMultiAgentSystem] Running ${agentsToRun.length} agents:`, 
        agentsToRun.map(a => a.config.name));

      // Run agents in parallel
      const agentPromises = agentsToRun.map(async (agentData, index) => {
        const { instance, config } = agentData;
        
        try {
          if (onProgress) {
            onProgress({
              phase: 'running',
              agentName: config.name,
              agentIndex: index,
              totalAgents: agentsToRun.length,
              status: 'starting'
            });
          }

          const result = await instance.analyze(content, {
            taskComplexity: 'medium',
            urgency,
            additionalContext: { purpose }
          });

          if (onProgress) {
            onProgress({
              phase: 'completed',
              agentName: config.name,
              agentIndex: index,
              totalAgents: agentsToRun.length,
              result: result
            });
          }

          // Update usage count
          userAgentService.updateAgent(config.id, { 
            usageCount: (config.usageCount || 0) + 1 
          });

          return {
            agentId: config.id,
            agentName: config.name,
            success: true,
            result: result,
            processingTime: result.metadata?.responseTime || 0
          };

        } catch (error) {
          console.error(`[UserMultiAgentSystem] Agent ${config.name} failed:`, error);
          
          if (onProgress) {
            onProgress({
              phase: 'error',
              agentName: config.name,
              agentIndex: index,
              totalAgents: agentsToRun.length,
              error: error.message
            });
          }

          return {
            agentId: config.id,
            agentName: config.name,
            success: false,
            error: error.message,
            processingTime: 0
          };
        }
      });

      // Wait for all agents to complete
      const results = await Promise.all(agentPromises);
      
      // Process results
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);
      
      // Combine all insights
      const allInsights = [];
      for (const result of successfulResults) {
        allInsights.push(...(result.result.insights || []));
      }

      // Add error insights for failed agents
      for (const result of failedResults) {
        allInsights.push({
          type: 'agent_error',
          agent: result.agentName,
          agentId: result.agentId,
          title: `Agent "${result.agentName}" Failed`,
          feedback: `The agent encountered an error during analysis: ${result.error}`,
          suggestion: 'Check the agent configuration or try running the analysis again.',
          confidence: 0.1,
          severity: 'low',
          timestamp: new Date().toISOString(),
          positions: [],
          textSnippets: [],
          error: true
        });
      }

      // Calculate overall confidence
      const validInsights = allInsights.filter(i => !i.error && !i.parseError);
      const overallConfidence = validInsights.length > 0
        ? validInsights.reduce((sum, i) => sum + (i.confidence || 0.5), 0) / validInsights.length
        : 0.5;

      // Update system metrics
      this.updateSystemMetrics(results, Date.now() - startTime);

      const finalResult = {
        insights: allInsights,
        confidence: overallConfidence,
        processingTime: Date.now() - startTime,
        agentsUsed: results.map(r => ({
          id: r.agentId,
          name: r.agentName,
          success: r.success,
          processingTime: r.processingTime,
          insightCount: r.success ? (r.result.insights?.length || 0) : 0
        })),
        systemMetrics: {
          totalAgents: this.userAgents.size,
          agentsRun: agentsToRun.length,
          successRate: successfulResults.length / results.length,
          avgProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length
        }
      };

      console.log('[UserMultiAgentSystem] Analysis completed:', {
        totalInsights: allInsights.length,
        agentsRun: agentsToRun.length,
        successRate: finalResult.systemMetrics.successRate,
        processingTime: finalResult.processingTime
      });

      return finalResult;

    } catch (error) {
      console.error('[UserMultiAgentSystem] Analysis failed:', error);
      
      return {
        insights: [{
          type: 'system_error',
          agent: 'Multi-Agent System',
          title: 'Analysis Failed',
          feedback: `Multi-agent analysis failed: ${error.message}`,
          suggestion: 'Please check your configuration and try again.',
          confidence: 0.1,
          severity: 'high',
          timestamp: new Date().toISOString(),
          positions: [],
          textSnippets: []
        }],
        confidence: 0.1,
        processingTime: Date.now() - startTime,
        agentsUsed: [],
        errors: [error.message]
      };
    }
  }

  /**
   * Select which agents to run for analysis
   */
  selectAgentsForAnalysis(requestedAgents, maxAgents) {
    const availableAgents = Array.from(this.userAgents.values()).filter(a => a.enabled);
    
    // If specific agents requested, use those
    if (requestedAgents && requestedAgents.length > 0) {
      return availableAgents.filter(a => requestedAgents.includes(a.config.id));
    }

    // Otherwise, use all enabled agents up to maxAgents limit
    return availableAgents.slice(0, maxAgents);
  }

  /**
   * Update system performance metrics
   */
  updateSystemMetrics(results, totalTime) {
    this.systemMetrics.totalAnalyses++;
    
    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      this.systemMetrics.successfulAnalyses++;
    }
    
    this.systemMetrics.totalAgentsRun += results.length;
    
    // Update average response time
    const avgTime = (this.systemMetrics.averageResponseTime * (this.systemMetrics.totalAnalyses - 1) + totalTime) / this.systemMetrics.totalAnalyses;
    this.systemMetrics.averageResponseTime = avgTime;
    
    // Update error rate
    this.systemMetrics.errorRate = (this.systemMetrics.totalAnalyses - this.systemMetrics.successfulAnalyses) / this.systemMetrics.totalAnalyses;
  }

  /**
   * Get all agents status for UI
   */
  getAllAgentsStatus() {
    const allAgents = userAgentService.getAllAgents();
    
    return allAgents.map(config => ({
      id: config.id,
      name: config.name,
      description: config.description,
      category: config.category,
      icon: config.icon,
      enabled: config.enabled,
      defaultTier: config.defaultTier,
      capabilities: config.capabilities || [],
      usageCount: config.usageCount || 0,
      created: config.created,
      lastModified: config.lastModified,
      templateOrigin: config.templateOrigin
    }));
  }

  /**
   * Toggle agent enabled state
   */
  toggleAgent(agentId, enabled) {
    try {
      userAgentService.toggleAgent(agentId, enabled);
      
      // Update local cache
      const agentData = this.userAgents.get(agentId);
      if (agentData) {
        agentData.enabled = enabled;
        agentData.config.enabled = enabled;
      }

      console.log(`[UserMultiAgentSystem] Agent ${agentId} ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    } catch (error) {
      console.error(`[UserMultiAgentSystem] Failed to toggle agent ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Enable/disable multiple agents
   */
  setMultipleAgentsEnabled(agentIds, enabled) {
    let changedCount = 0;
    
    for (const agentId of agentIds) {
      if (this.toggleAgent(agentId, enabled)) {
        changedCount++;
      }
    }
    
    return changedCount;
  }

  /**
   * Get system performance metrics
   */
  getSystemMetrics() {
    return {
      ...this.systemMetrics,
      totalAgents: this.userAgents.size,
      enabledAgents: Array.from(this.userAgents.values()).filter(a => a.enabled).length,
      agentStats: userAgentService.getStats()
    };
  }

  /**
   * Reset system (refresh agents)
   */
  async reset() {
    console.log('[UserMultiAgentSystem] Resetting system...');
    await this.refresh();
  }
}

export default UserMultiAgentSystem;