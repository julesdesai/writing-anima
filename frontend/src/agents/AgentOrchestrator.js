/**
 * Agent Orchestrator - Manages multiple agents with priority-based selection,
 * conflict resolution, and performance monitoring
 */

import { BaseAgent } from './BaseAgent';
import { DynamicAgent } from './DynamicAgent';
import { AGENT_TEMPLATES } from './AgentTemplates';

// Task urgency levels for priority calculation
export const URGENCY_LEVELS = {
  REALTIME: 'realtime',   // Real-time typing feedback
  HIGH: 'high',           // User actively waiting
  NORMAL: 'normal',       // Background analysis
  LOW: 'low'              // Batch processing
};

// Content types that help determine agent relevance
export const CONTENT_TYPES = {
  TECHNICAL: 'technical',
  CREATIVE: 'creative', 
  ACADEMIC: 'academic',
  BUSINESS: 'business',
  CONVERSATIONAL: 'conversational',
  ARGUMENTATIVE: 'argumentative'
};

export class AgentOrchestrator {
  constructor() {
    this.agents = new Map(); // agentId -> agent instance
    this.agentCapabilities = new Map(); // agentId -> capabilities array
    this.dynamicAgents = new Map(); // userId -> Map of user's dynamic agents
    this.userPreferences = {
      preferredAgents: new Set(),
      blockedAgents: new Set(),
      thoroughness: 0.7, // 0-1 scale
      costSensitivity: 0.5, // 0-1 scale 
      speedPriority: 0.5 // 0-1 scale
    };
    
    // Performance tracking
    this.orchestrationStats = {
      totalTasks: 0,
      successfulTasks: 0,
      conflicts: 0,
      escalations: 0,
      avgDecisionTime: 0,
      agentUsageStats: new Map(),
      dynamicAgentStats: {
        totalCreated: 0,
        totalUsage: 0,
        averagePerformance: 0.5
      }
    };
    
    // Dynamic agent management
    this.maxDynamicAgentsPerUser = 10;
    this.dynamicAgentCleanupThreshold = 30; // days
  }
  
  /**
   * Register an agent with the orchestrator
   */
  registerAgent(agentId, agent) {
    if (!(agent instanceof BaseAgent)) {
      throw new Error(`Agent ${agentId} must extend BaseAgent`);
    }
    
    this.agents.set(agentId, agent);
    this.agentCapabilities.set(agentId, agent.requiredCapabilities);
    this.orchestrationStats.agentUsageStats.set(agentId, {
      tasksAssigned: 0,
      successRate: 0,
      avgConfidence: 0,
      lastUsed: null
    });
    
    console.log(`Registered agent: ${agentId} (${agent.name})`);
  }
  
  /**
   * Unregister an agent
   */
  unregisterAgent(agentId) {
    this.agents.delete(agentId);
    this.agentCapabilities.delete(agentId);
    this.orchestrationStats.agentUsageStats.delete(agentId);
    
    console.log(`Unregistered agent: ${agentId}`);
  }
  
  /**
   * Analyze content using the optimal agent selection strategy
   */
  async analyzeContent(content, options = {}) {
    const startTime = Date.now();
    const {
      urgency = URGENCY_LEVELS.NORMAL,
      contentType = CONTENT_TYPES.CONVERSATIONAL,
      requestedAgents = null, // Specific agents requested by user
      streaming = false,
      onProgress = null,
      maxParallelAgents = 3,
      budget = 'standard',
      requireConsensus = false
    } = options;
    
    this.orchestrationStats.totalTasks++;
    
    try {
      // Detect content characteristics for better agent selection
      const contentAnalysis = this.analyzeContentCharacteristics(content);
      
      // Select optimal agents based on priority scoring
      const selectedAgents = this.selectOptimalAgents({
        content,
        contentType,
        contentAnalysis,
        urgency,
        requestedAgents,
        budget,
        maxParallelAgents
      });
      
      if (selectedAgents.length === 0) {
        throw new Error('No suitable agents available for this content');
      }
      
      // Execute analysis with selected agents
      const results = await this.executeWithAgents(
        selectedAgents,
        content,
        {
          urgency,
          contentType,
          streaming,
          onProgress,
          budget
        }
      );
      
      // Resolve conflicts and aggregate results
      const finalResult = requireConsensus 
        ? this.resolveConflictsWithConsensus(results)
        : this.aggregateResults(results);
      
      // Update orchestration statistics
      const decisionTime = Date.now() - startTime;
      this.updateOrchestrationStats(true, decisionTime, selectedAgents);
      
      return {
        ...finalResult,
        orchestration: {
          agentsUsed: selectedAgents.map(a => a.id),
          decisionTime,
          totalAgents: this.agents.size,
          budget,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      const decisionTime = Date.now() - startTime;
      this.updateOrchestrationStats(false, decisionTime, []);
      throw error;
    }
  }
  
  /**
   * Analyze content characteristics to help with agent selection
   */
  analyzeContentCharacteristics(content) {
    const characteristics = {
      length: content.length,
      complexity: this.estimateComplexity(content),
      hasArguments: this.detectArguments(content),
      hasClaims: this.detectClaims(content),
      hasEvidence: this.detectEvidence(content),
      technicalTerms: this.countTechnicalTerms(content),
      styleIssues: this.detectBasicStyleIssues(content),
      logicalPatterns: this.detectLogicalPatterns(content)
    };
    
    return characteristics;
  }
  
  /**
   * Select optimal agents based on multi-factor priority scoring
   */
  selectOptimalAgents({
    content,
    contentType,
    contentAnalysis,
    urgency,
    requestedAgents,
    budget,
    maxParallelAgents
  }) {
    const agentScores = [];
    
    for (const [agentId, agent] of this.agents) {
      // Skip blocked agents
      if (this.userPreferences.blockedAgents.has(agentId)) {
        continue;
      }
      
      const score = this.calculateAgentPriorityScore(
        agentId,
        agent,
        {
          content,
          contentType, 
          contentAnalysis,
          urgency,
          budget
        }
      );
      
      if (score > 0) {
        agentScores.push({
          id: agentId,
          agent,
          score,
          reasoning: score.reasoning || 'Standard priority calculation'
        });
      }
    }
    
    // Sort by score (highest first)
    agentScores.sort((a, b) => b.score - a.score);
    
    // Apply user preferences and constraints
    let selectedAgents = agentScores;
    
    // If specific agents requested, prioritize them
    if (requestedAgents && requestedAgents.length > 0) {
      selectedAgents = agentScores.filter(a => requestedAgents.includes(a.id));
      // Add others if we don't have enough
      if (selectedAgents.length < maxParallelAgents) {
        const remaining = agentScores.filter(a => !requestedAgents.includes(a.id));
        selectedAgents = selectedAgents.concat(remaining);
      }
    }
    
    // Apply budget constraints
    if (budget === 'minimal') {
      selectedAgents = selectedAgents.filter(a => a.agent.defaultTier === 'fast');
    }
    
    // Limit to max parallel agents
    return selectedAgents.slice(0, maxParallelAgents);
  }
  
  /**
   * Calculate priority score for an agent based on multiple factors
   */
  calculateAgentPriorityScore(agentId, agent, context) {
    const { content, contentType, contentAnalysis, urgency, budget } = context;
    
    let score = 0;
    const weights = {
      urgency: 0.4,
      specialization: 0.3,
      userPreference: 0.2,
      costEfficiency: 0.1
    };
    
    // Urgency factor (40% weight)
    const urgencyScore = this.calculateUrgencyScore(urgency, agent);
    score += urgencyScore * weights.urgency;
    
    // Specialization match (30% weight)
    const specializationScore = this.calculateSpecializationScore(
      agent, contentType, contentAnalysis
    );
    score += specializationScore * weights.specialization;
    
    // User preference (20% weight)
    const preferenceScore = this.calculateUserPreferenceScore(agentId);
    score += preferenceScore * weights.userPreference;
    
    // Cost efficiency (10% weight)
    const costScore = this.calculateCostEfficiencyScore(agent, budget);
    score += costScore * weights.costEfficiency;
    
    return score;
  }
  
  /**
   * Calculate urgency-based score
   */
  calculateUrgencyScore(urgency, agent) {
    const urgencyMap = {
      [URGENCY_LEVELS.REALTIME]: agent.defaultTier === 'fast' ? 1.0 : 0.3,
      [URGENCY_LEVELS.HIGH]: agent.defaultTier === 'fast' ? 0.9 : 0.7,
      [URGENCY_LEVELS.NORMAL]: 0.8,
      [URGENCY_LEVELS.LOW]: agent.defaultTier === 'premium' ? 1.0 : 0.6
    };
    
    return urgencyMap[urgency] || 0.5;
  }
  
  /**
   * Calculate specialization match score
   */
  calculateSpecializationScore(agent, contentType, contentAnalysis) {
    let score = 0.5; // Base score
    
    // Agent-specific specialization logic would go here
    // For now, use heuristics based on agent name and capabilities
    const agentName = agent.name.toLowerCase();
    
    if (agentName.includes('fallacy') && contentAnalysis.hasArguments) {
      score += 0.4;
    }
    if (agentName.includes('style') && contentAnalysis.styleIssues > 0) {
      score += 0.3;
    }
    if (agentName.includes('fact') && contentAnalysis.hasClaims) {
      score += 0.4;
    }
    if (agentName.includes('evidence') && contentAnalysis.hasEvidence) {
      score += 0.3;
    }
    
    return Math.min(score, 1.0);
  }
  
  /**
   * Calculate user preference score
   */
  calculateUserPreferenceScore(agentId) {
    if (this.userPreferences.preferredAgents.has(agentId)) {
      return 1.0;
    }
    
    // Neutral for non-preferred agents
    return 0.5;
  }
  
  /**
   * Calculate cost efficiency score
   */
  calculateCostEfficiencyScore(agent, budget) {
    const costSensitivity = this.userPreferences.costSensitivity;
    const agentCostTier = agent.defaultTier;
    
    if (budget === 'minimal') {
      return agentCostTier === 'fast' ? 1.0 : 0.2;
    } else if (budget === 'premium') {
      return agentCostTier === 'premium' ? 1.0 : 0.7;
    }
    
    // Standard budget - balanced approach
    const tierScores = { fast: 0.9, standard: 1.0, premium: 0.7 };
    return tierScores[agentCostTier] || 0.5;
  }
  
  /**
   * Execute analysis with selected agents
   */
  async executeWithAgents(selectedAgents, content, options) {
    const { urgency, contentType, streaming, onProgress, budget } = options;
    
    const promises = selectedAgents.map(async (agentInfo) => {
      const { id, agent } = agentInfo;
      
      try {
        const result = await agent.analyze(content, {
          taskComplexity: content.length > 1000 ? 'high' : 'medium',
          urgency,
          costBudget: budget,
          streaming,
          onProgress: streaming ? (progress) => {
            if (onProgress) {
              onProgress({ ...progress, agentId: id });
            }
          } : null,
          additionalContext: {
            contentType,
            orchestratorContext: true
          }
        });
        
        // Update agent usage stats
        const agentStats = this.orchestrationStats.agentUsageStats.get(id);
        if (agentStats) {
          agentStats.tasksAssigned++;
          agentStats.lastUsed = new Date().toISOString();
          agentStats.avgConfidence = (
            (agentStats.avgConfidence * (agentStats.tasksAssigned - 1)) + 
            (result.confidence || 0.5)
          ) / agentStats.tasksAssigned;
        }
        
        return { agentId: id, result, success: true };
        
      } catch (error) {
        console.warn(`Agent ${id} failed:`, error.message);
        return { agentId: id, error: error.message, success: false };
      }
    });
    
    const results = await Promise.allSettled(promises);
    
    return results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value);
  }
  
  /**
   * Aggregate results from multiple agents
   */
  aggregateResults(results) {
    if (results.length === 0) {
      throw new Error('No successful agent results to aggregate');
    }
    
    if (results.length === 1) {
      return results[0].result;
    }
    
    // Merge insights from multiple agents
    const aggregated = {
      insights: [],
      confidence: 0,
      sources: [],
      conflicts: []
    };
    
    let totalConfidence = 0;
    const confidenceWeights = [];
    
    for (const { agentId, result } of results) {
      if (result.insights) {
        // Add agent identification to insights
        const agentInsights = result.insights.map(insight => ({
          ...insight,
          source: agentId,
          sourceAgent: agentId
        }));
        aggregated.insights.push(...agentInsights);
      }
      
      if (result.confidence) {
        totalConfidence += result.confidence;
        confidenceWeights.push(result.confidence);
      }
      
      aggregated.sources.push({
        agentId,
        agentName: this.agents.get(agentId)?.name || agentId,
        confidence: result.confidence || 0.5,
        timestamp: result.metadata?.timestamp
      });
    }
    
    // Calculate weighted average confidence
    aggregated.confidence = confidenceWeights.length > 0 
      ? totalConfidence / confidenceWeights.length
      : 0.5;
    
    // Detect and resolve conflicts
    const conflicts = this.detectConflicts(results);
    if (conflicts.length > 0) {
      aggregated.conflicts = conflicts;
      this.orchestrationStats.conflicts++;
    }
    
    // Sort insights by priority/confidence
    aggregated.insights.sort((a, b) => (b.confidence || 0.5) - (a.confidence || 0.5));
    
    return aggregated;
  }
  
  /**
   * Detect conflicts between agent results
   */
  detectConflicts(results) {
    const conflicts = [];
    
    // Simple conflict detection - look for contradictory insights
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const result1 = results[i].result;
        const result2 = results[j].result;
        
        // Check for contradictory confidence levels
        if (Math.abs((result1.confidence || 0.5) - (result2.confidence || 0.5)) > 0.4) {
          conflicts.push({
            type: 'confidence_mismatch',
            agents: [results[i].agentId, results[j].agentId],
            details: `Confidence mismatch: ${result1.confidence} vs ${result2.confidence}`
          });
        }
        
        // Check for contradictory insights on same topic
        if (result1.insights && result2.insights) {
          const topicConflicts = this.findTopicConflicts(
            result1.insights, result2.insights,
            results[i].agentId, results[j].agentId
          );
          conflicts.push(...topicConflicts);
        }
      }
    }
    
    return conflicts;
  }
  
  /**
   * Find conflicts between insights on similar topics
   */
  findTopicConflicts(insights1, insights2, agent1Id, agent2Id) {
    const conflicts = [];
    
    for (const insight1 of insights1) {
      for (const insight2 of insights2) {
        // Simple topic similarity check (could be enhanced with NLP)
        const similarity = this.calculateInsightSimilarity(insight1, insight2);
        
        if (similarity > 0.7) {
          // Check if they have contradictory recommendations
          const isContradictory = this.areInsightsContradictory(insight1, insight2);
          
          if (isContradictory) {
            conflicts.push({
              type: 'contradictory_insights',
              agents: [agent1Id, agent2Id],
              insights: [insight1, insight2],
              similarity,
              details: 'Agents provided contradictory recommendations on similar topic'
            });
          }
        }
      }
    }
    
    return conflicts;
  }
  
  /**
   * Resolve conflicts using consensus building
   */
  resolveConflictsWithConsensus(results) {
    // For now, implement a simple majority rule
    // Could be enhanced with more sophisticated consensus algorithms
    
    const aggregated = this.aggregateResults(results);
    
    if (aggregated.conflicts && aggregated.conflicts.length > 0) {
      // Filter out low-confidence insights that conflict
      aggregated.insights = aggregated.insights.filter(insight => {
        const hasHighConfidenceConflict = aggregated.conflicts.some(conflict => 
          conflict.type === 'contradictory_insights' &&
          conflict.insights.some(ci => ci.id === insight.id) &&
          (insight.confidence || 0.5) < 0.7
        );
        
        return !hasHighConfidenceConflict;
      });
    }
    
    return aggregated;
  }
  
  /**
   * Update user preferences based on feedback
   */
  updateUserPreferences(feedback) {
    const { preferredAgents = [], blockedAgents = [], thoroughness, costSensitivity, speedPriority } = feedback;
    
    preferredAgents.forEach(agentId => this.userPreferences.preferredAgents.add(agentId));
    blockedAgents.forEach(agentId => this.userPreferences.blockedAgents.add(agentId));
    
    if (typeof thoroughness === 'number') {
      this.userPreferences.thoroughness = Math.max(0, Math.min(1, thoroughness));
    }
    if (typeof costSensitivity === 'number') {
      this.userPreferences.costSensitivity = Math.max(0, Math.min(1, costSensitivity));
    }
    if (typeof speedPriority === 'number') {
      this.userPreferences.speedPriority = Math.max(0, Math.min(1, speedPriority));
    }
  }
  
  /**
   * Get orchestrator performance metrics
   */
  getPerformanceMetrics() {
    const agentMetrics = {};
    for (const [agentId, stats] of this.orchestrationStats.agentUsageStats) {
      agentMetrics[agentId] = {
        ...stats,
        agentPerformance: this.agents.get(agentId)?.getPerformanceMetrics()
      };
    }
    
    return {
      orchestrator: {
        successRate: this.orchestrationStats.totalTasks > 0 
          ? this.orchestrationStats.successfulTasks / this.orchestrationStats.totalTasks 
          : 0,
        avgDecisionTime: this.orchestrationStats.avgDecisionTime,
        conflictRate: this.orchestrationStats.totalTasks > 0
          ? this.orchestrationStats.conflicts / this.orchestrationStats.totalTasks
          : 0,
        totalTasks: this.orchestrationStats.totalTasks,
        registeredAgents: this.agents.size
      },
      agents: agentMetrics,
      userPreferences: this.userPreferences
    };
  }
  
  /**
   * Update orchestration statistics
   */
  updateOrchestrationStats(success, decisionTime, selectedAgents) {
    if (success) {
      this.orchestrationStats.successfulTasks++;
    }
    
    // Update rolling average decision time
    this.orchestrationStats.avgDecisionTime = (
      (this.orchestrationStats.avgDecisionTime * (this.orchestrationStats.totalTasks - 1)) + decisionTime
    ) / this.orchestrationStats.totalTasks;
  }

  // ======================
  // DYNAMIC AGENT MANAGEMENT
  // ======================

  /**
   * Create a new dynamic agent from template
   */
  createDynamicAgentFromTemplate(userId, templateKey, customizations = {}) {
    const template = AGENT_TEMPLATES[templateKey];
    if (!template) {
      throw new Error(`Template ${templateKey} not found`);
    }

    // Check user limits
    this.checkUserAgentLimits(userId);

    // Merge template with customizations
    const agentConfig = {
      ...template,
      ...customizations,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      templateOrigin: templateKey,
      userId,
      isTemplate: false
    };

    return this.createDynamicAgent(userId, agentConfig);
  }

  /**
   * Create a completely custom dynamic agent
   */
  createDynamicAgent(userId, config) {
    // Validate configuration
    this.validateDynamicAgentConfig(config);
    
    // Check user limits
    this.checkUserAgentLimits(userId);

    // Create the dynamic agent
    const dynamicAgent = new DynamicAgent({
      ...config,
      userId
    });

    // Initialize user's dynamic agents map if needed
    if (!this.dynamicAgents.has(userId)) {
      this.dynamicAgents.set(userId, new Map());
    }

    // Store the agent
    const userAgents = this.dynamicAgents.get(userId);
    userAgents.set(dynamicAgent.agentId, dynamicAgent);

    // Register with orchestrator
    this.registerAgent(dynamicAgent.agentId, dynamicAgent);

    // Update stats
    this.orchestrationStats.dynamicAgentStats.totalCreated++;

    console.log(`Created dynamic agent: ${dynamicAgent.name} (${dynamicAgent.agentId}) for user ${userId}`);

    return dynamicAgent;
  }

  /**
   * Update an existing dynamic agent
   */
  updateDynamicAgent(userId, agentId, updates) {
    const userAgents = this.dynamicAgents.get(userId);
    if (!userAgents || !userAgents.has(agentId)) {
      throw new Error(`Dynamic agent ${agentId} not found for user ${userId}`);
    }

    const agent = userAgents.get(agentId);
    if (!(agent instanceof DynamicAgent)) {
      throw new Error(`Agent ${agentId} is not a dynamic agent`);
    }

    // Validate updates
    this.validateDynamicAgentConfig(updates, true);

    // Apply updates
    agent.updateConfig(updates);

    console.log(`Updated dynamic agent: ${agent.name} (${agentId})`);

    return agent;
  }

  /**
   * Delete a dynamic agent
   */
  deleteDynamicAgent(userId, agentId) {
    const userAgents = this.dynamicAgents.get(userId);
    if (!userAgents || !userAgents.has(agentId)) {
      throw new Error(`Dynamic agent ${agentId} not found for user ${userId}`);
    }

    // Unregister from orchestrator
    this.unregisterAgent(agentId);

    // Remove from user's agents
    userAgents.delete(agentId);

    // Clean up empty user maps
    if (userAgents.size === 0) {
      this.dynamicAgents.delete(userId);
    }

    console.log(`Deleted dynamic agent: ${agentId} for user ${userId}`);
  }

  /**
   * Clone an existing dynamic agent
   */
  cloneDynamicAgent(userId, agentId, modifications = {}) {
    const userAgents = this.dynamicAgents.get(userId);
    if (!userAgents || !userAgents.has(agentId)) {
      throw new Error(`Dynamic agent ${agentId} not found for user ${userId}`);
    }

    const originalAgent = userAgents.get(agentId);
    if (!(originalAgent instanceof DynamicAgent)) {
      throw new Error(`Agent ${agentId} is not a dynamic agent`);
    }

    // Check user limits
    this.checkUserAgentLimits(userId);

    // Clone with modifications
    const clonedAgent = originalAgent.clone({
      ...modifications,
      name: modifications.name || `${originalAgent.name} (Copy)`,
      userId
    });

    // Store the cloned agent
    userAgents.set(clonedAgent.agentId, clonedAgent);
    this.registerAgent(clonedAgent.agentId, clonedAgent);

    console.log(`Cloned dynamic agent: ${originalAgent.name} -> ${clonedAgent.name}`);

    return clonedAgent;
  }

  /**
   * Get all dynamic agents for a user
   */
  getUserDynamicAgents(userId) {
    const userAgents = this.dynamicAgents.get(userId);
    if (!userAgents) {
      return [];
    }

    return Array.from(userAgents.values()).map(agent => ({
      ...agent.exportConfig(),
      performanceMetrics: agent.getPerformanceMetrics(),
      learningMetrics: agent.getLearningMetrics()
    }));
  }

  /**
   * Get a specific dynamic agent
   */
  getDynamicAgent(userId, agentId) {
    const userAgents = this.dynamicAgents.get(userId);
    if (!userAgents || !userAgents.has(agentId)) {
      return null;
    }

    const agent = userAgents.get(agentId);
    return {
      ...agent.exportConfig(),
      performanceMetrics: agent.getPerformanceMetrics(),
      learningMetrics: agent.getLearningMetrics()
    };
  }

  /**
   * Process feedback for a dynamic agent
   */
  processDynamicAgentFeedback(userId, agentId, feedback) {
    const userAgents = this.dynamicAgents.get(userId);
    if (!userAgents || !userAgents.has(agentId)) {
      throw new Error(`Dynamic agent ${agentId} not found for user ${userId}`);
    }

    const agent = userAgents.get(agentId);
    if (!(agent instanceof DynamicAgent)) {
      throw new Error(`Agent ${agentId} is not a dynamic agent`);
    }

    agent.processFeedback(feedback);

    // Update system-wide dynamic agent performance
    this.updateDynamicAgentStats();

    console.log(`Processed feedback for dynamic agent: ${agent.name}`);
  }

  /**
   * Export dynamic agent configuration for sharing/backup
   */
  exportDynamicAgent(userId, agentId) {
    const userAgents = this.dynamicAgents.get(userId);
    if (!userAgents || !userAgents.has(agentId)) {
      throw new Error(`Dynamic agent ${agentId} not found for user ${userId}`);
    }

    const agent = userAgents.get(agentId);
    return {
      ...agent.exportConfig(),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * Import dynamic agent configuration
   */
  importDynamicAgent(userId, exportedConfig) {
    if (!exportedConfig || exportedConfig.version !== '1.0') {
      throw new Error('Invalid or unsupported agent export format');
    }

    // Remove import-specific metadata
    const { exportedAt, version, agentId, created, userId: originalUserId, ...config } = exportedConfig;

    // Create new agent with imported config
    return this.createDynamicAgent(userId, {
      ...config,
      name: `${config.name} (Imported)`
    });
  }

  /**
   * Get dynamic agent usage statistics
   */
  getDynamicAgentStats() {
    const stats = {
      ...this.orchestrationStats.dynamicAgentStats,
      activeAgents: 0,
      agentsByUser: {},
      topPerformers: [],
      recentActivity: []
    };

    // Count active agents and collect performance data
    const allAgents = [];
    for (const [userId, userAgents] of this.dynamicAgents) {
      stats.agentsByUser[userId] = userAgents.size;
      stats.activeAgents += userAgents.size;

      for (const agent of userAgents.values()) {
        allAgents.push({
          userId,
          agentId: agent.agentId,
          name: agent.name,
          ...agent.getLearningMetrics()
        });
      }
    }

    // Sort by performance and get top performers
    stats.topPerformers = allAgents
      .sort((a, b) => (b.recentRating * b.helpfulnessRate) - (a.recentRating * a.helpfulnessRate))
      .slice(0, 10);

    return stats;
  }

  /**
   * Clean up old or unused dynamic agents
   */
  cleanupDynamicAgents() {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() - (this.dynamicAgentCleanupThreshold * 24 * 60 * 60 * 1000));
    
    let cleanedCount = 0;

    for (const [userId, userAgents] of this.dynamicAgents) {
      const agentsToDelete = [];

      for (const [agentId, agent] of userAgents) {
        const lastUsed = new Date(agent.lastModified);
        
        // Mark for deletion if old and unused
        if (lastUsed < thresholdDate && agent.usageCount === 0) {
          agentsToDelete.push(agentId);
        }
      }

      // Delete marked agents
      for (const agentId of agentsToDelete) {
        this.deleteDynamicAgent(userId, agentId);
        cleanedCount++;
      }
    }

    console.log(`Cleaned up ${cleanedCount} unused dynamic agents`);
    return cleanedCount;
  }

  // ======================
  // HELPER METHODS
  // ======================

  /**
   * Check if user has reached agent limits
   */
  checkUserAgentLimits(userId) {
    const userAgents = this.dynamicAgents.get(userId);
    if (userAgents && userAgents.size >= this.maxDynamicAgentsPerUser) {
      throw new Error(`User ${userId} has reached the maximum limit of ${this.maxDynamicAgentsPerUser} dynamic agents`);
    }
  }

  /**
   * Validate dynamic agent configuration
   */
  validateDynamicAgentConfig(config, isUpdate = false) {
    const required = isUpdate ? [] : ['name', 'specialization', 'customPrompt'];
    
    for (const field of required) {
      if (!config[field] || config[field].trim().length === 0) {
        throw new Error(`${field} is required for dynamic agent`);
      }
    }

    if (config.customPrompt && config.customPrompt.length > 2000) {
      throw new Error('Custom prompt must be under 2000 characters');
    }

    if (config.name && config.name.length > 100) {
      throw new Error('Agent name must be under 100 characters');
    }

    if (config.description && config.description.length > 500) {
      throw new Error('Agent description must be under 500 characters');
    }
  }

  /**
   * Update system-wide dynamic agent performance statistics
   */
  updateDynamicAgentStats() {
    let totalUsage = 0;
    let totalPerformance = 0;
    let agentCount = 0;

    for (const userAgents of this.dynamicAgents.values()) {
      for (const agent of userAgents.values()) {
        totalUsage += agent.usageCount;
        totalPerformance += agent.learningData.averageConfidence;
        agentCount++;
      }
    }

    this.orchestrationStats.dynamicAgentStats.totalUsage = totalUsage;
    this.orchestrationStats.dynamicAgentStats.averagePerformance = 
      agentCount > 0 ? totalPerformance / agentCount : 0.5;
  }
  
  // Helper methods for content analysis
  
  estimateComplexity(content) {
    // Simple complexity estimation
    const avgSentenceLength = content.split('.').reduce((acc, sentence) => 
      acc + sentence.split(' ').length, 0) / content.split('.').length;
    
    if (avgSentenceLength > 25) return 'high';
    if (avgSentenceLength > 15) return 'medium';
    return 'low';
  }
  
  detectArguments(content) {
    const argumentPatterns = /\b(because|therefore|thus|hence|consequently|as a result)\b/gi;
    return (content.match(argumentPatterns) || []).length > 0;
  }
  
  detectClaims(content) {
    const claimPatterns = /\b(claim|assert|argue|maintain|contend|believe)\b/gi;
    return (content.match(claimPatterns) || []).length > 0;
  }
  
  detectEvidence(content) {
    const evidencePatterns = /\b(study|research|data|evidence|statistics|according to)\b/gi;
    return (content.match(evidencePatterns) || []).length > 0;
  }
  
  countTechnicalTerms(content) {
    // Simple technical term detection (could be enhanced with domain-specific dictionaries)
    const technicalPatterns = /\b([A-Z][a-z]*[A-Z][a-z]*|API|HTTP|JSON|SQL|AI|ML|API)\b/g;
    return (content.match(technicalPatterns) || []).length;
  }
  
  detectBasicStyleIssues(content) {
    let issues = 0;
    
    // Passive voice detection
    if (/\b(was|were|is|are)\s+\w+ed\b/g.test(content)) issues++;
    
    // Long sentences
    const sentences = content.split(/[.!?]+/);
    if (sentences.some(s => s.split(' ').length > 30)) issues++;
    
    // Repetitive words
    const words = content.toLowerCase().match(/\b\w+\b/g) || [];
    const wordCounts = {};
    words.forEach(word => wordCounts[word] = (wordCounts[word] || 0) + 1);
    if (Object.values(wordCounts).some(count => count > 5)) issues++;
    
    return issues;
  }
  
  detectLogicalPatterns(content) {
    const patterns = /\b(if|then|when|unless|provided|assuming)\b/gi;
    return (content.match(patterns) || []).length;
  }
  
  calculateInsightSimilarity(insight1, insight2) {
    // Simple similarity calculation based on overlapping words
    const words1 = new Set((insight1.title || '').toLowerCase().split(/\s+/));
    const words2 = new Set((insight2.title || '').toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
  
  areInsightsContradictory(insight1, insight2) {
    // Simple contradiction detection
    const text1 = (insight1.feedback || '').toLowerCase();
    const text2 = (insight2.feedback || '').toLowerCase();
    
    const contradictoryPairs = [
      ['good', 'bad'], ['correct', 'incorrect'], ['appropriate', 'inappropriate'],
      ['clear', 'unclear'], ['strong', 'weak'], ['effective', 'ineffective']
    ];
    
    return contradictoryPairs.some(([pos, neg]) =>
      (text1.includes(pos) && text2.includes(neg)) ||
      (text1.includes(neg) && text2.includes(pos))
    );
  }
}

export default AgentOrchestrator;