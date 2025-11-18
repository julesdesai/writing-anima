/**
 * Multi-Agent System - Main entry point for the new agent architecture
 * Integrates all agents with progressive enhancement and dynamic thresholds
 */

import ProgressiveEnhancementManager from './ProgressiveEnhancementManager';
import LogicalFallacyDetector from './LogicalFallacyDetector';
import ClarityStyleAgent from './ClarityStyleAgent';
import QuickFactChecker from './QuickFactChecker';
import EvidenceQualityAgent from './EvidenceQualityAgent';
import ContextualResearchCritic from './ContextualResearchCritic';
import DeepFactVerificationAgent from './DeepFactVerificationAgent';
import PurposeFulfillmentAgent from './PurposeFulfillmentAgent';

export class MultiAgentSystem {
  constructor() {
    this.orchestrator = new ProgressiveEnhancementManager();
    this.agents = new Map();
    this.initialized = false;
    
    // Dynamic confidence threshold configuration
    this.confidenceConfig = {
      baseThreshold: 0.75,
      adjustmentFactors: {
        urgency: {
          realtime: -0.15, // Lower threshold for speed
          high: -0.10,
          normal: 0.0,
          low: +0.05
        },
        userThoroughness: {
          // Multiplier based on user preference (0-1)
          multiplier: 0.2 // Max 20% adjustment
        },
        costSensitivity: {
          // Higher cost sensitivity = higher threshold (avoid escalation)
          multiplier: 0.15 // Max 15% adjustment
        },
        taskComplexity: {
          low: +0.05,
          medium: 0.0,
          high: -0.10 // Lower threshold for complex tasks
        }
      }
    };
    
    // User preference learning
    this.userPreferences = {
      thoroughness: 0.7, // 0-1 scale
      costSensitivity: 0.5, // 0-1 scale
      speedPriority: 0.5, // 0-1 scale
      preferredAgentTypes: new Set(),
      feedbackHistory: [],
      adaptiveThresholds: {},
      enabledAgents: new Map() // Track which agents are enabled/disabled
    };
  }
  
  /**
   * Initialize the multi-agent system
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Register all agents with default enabled state
      const agentConfigs = [
        { id: 'logical_fallacy_detector', instance: new LogicalFallacyDetector(), enabled: true },
        { id: 'clarity_style_agent', instance: new ClarityStyleAgent(), enabled: true },
        { id: 'quick_fact_checker', instance: new QuickFactChecker(), enabled: true },
        { id: 'evidence_quality_agent', instance: new EvidenceQualityAgent(), enabled: true },
        { id: 'contextual_research_critic', instance: new ContextualResearchCritic(), enabled: true },
        { id: 'deep_fact_verification_agent', instance: new DeepFactVerificationAgent(), enabled: true },
        { id: 'purpose_fulfillment_agent', instance: new PurposeFulfillmentAgent(), enabled: true }
      ];
      
      for (const config of agentConfigs) {
        this.orchestrator.registerAgent(config.id, config.instance);
        // Set default enabled state (can be overridden by user preferences)
        this.userPreferences.enabledAgents.set(config.id, config.enabled);
      }
      
      // Load user preferences
      await this.loadUserPreferences();
      
      this.initialized = true;
      console.log('Multi-Agent System initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Multi-Agent System:', error);
      throw error;
    }
  }
  
  /**
   * Main analysis method with progressive enhancement
   */
  async analyzeContent(content, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      urgency = 'normal',
      budget = 'standard',
      thoroughness = this.userPreferences.thoroughness,
      onProgress = null,
      onFastComplete = null,
      onEnhancementAvailable = null,
      onComplete = null,
      requestedAgents = null
    } = options;
    
    // Calculate dynamic confidence thresholds
    const dynamicThresholds = this.calculateDynamicThresholds({
      urgency,
      thoroughness,
      taskComplexity: this.estimateTaskComplexity(content),
      costSensitivity: this.userPreferences.costSensitivity
    });
    
    // Update agent thresholds
    this.updateAgentThresholds(dynamicThresholds);
    
    try {
      console.log('[MultiAgentSystem] Starting analysis with config:', {
        contentLength: content?.length,
        urgency,
        budget,
        agentsAvailable: Object.keys(this.agents).length,
        hasApiKey: !!process.env.REACT_APP_OPENAI_API_KEY,
        orchestratorAvailable: !!this.orchestrator
      });
      
      // Quick validation
      if (!content || content.trim().length === 0) {
        throw new Error('No content provided for analysis');
      }

      if (!this.orchestrator) {
        throw new Error('Orchestrator not available');
      }
      
      // Filter enabled agents for analysis
      const enabledAgents = this.getEnabledAgents();
      
      // Start progressive analysis
      const result = await this.orchestrator.startProgressiveAnalysis(content, {
        urgency,
        budget,
        maxParallelAgents: this.calculateMaxParallelAgents(budget, urgency),
        requestedAgents: requestedAgents || enabledAgents,
        onProgress: (progress) => {
          // Add system context to progress
          const enhancedProgress = {
            ...progress,
            systemContext: {
              dynamicThresholds,
              userPreferences: this.getUserPreferencesForProgress(),
              activeAgents: this.getActiveAgentCount()
            }
          };
          
          if (onProgress) onProgress(enhancedProgress);
        },
        onFastComplete: (data) => {
          // Learn from fast phase results
          this.learnFromResults(data.results, 'fast_phase');
          
          if (onFastComplete) onFastComplete(data);
        },
        onEnhancementAvailable: (data) => {
          // Learn from enhancement quality
          this.learnFromEnhancement(data);
          
          if (onEnhancementAvailable) onEnhancementAvailable(data);
        },
        onComplete: (data) => {
          // Final learning and preference update
          this.learnFromResults(data.results, 'complete');
          
          if (onComplete) onComplete(data);
        }
      });
      
      console.log('[MultiAgentSystem] Analysis completed:', {
        insightsCount: result?.insights?.length || 0,
        confidence: result?.confidence
      });
      
      return result;
      
    } catch (error) {
      console.error('Multi-agent analysis failed:', error);
      
      // Return a fallback result instead of throwing
      return {
        insights: [{
          type: 'system_error',
          agent: 'Multi-Agent System',
          title: 'Analysis Failed',
          feedback: `Multi-agent analysis failed: ${error.message}`,
          suggestion: 'Please check your API configuration and try again.',
          confidence: 0.1,
          severity: 'high',
          timestamp: new Date().toISOString(),
          positions: []
        }],
        confidence: 0.1,
        processingTime: 0,
        agentsUsed: [],
        errors: [error.message]
      };
    }
  }
  
  /**
   * Calculate dynamic confidence thresholds based on context
   */
  calculateDynamicThresholds(context) {
    const { urgency, thoroughness, taskComplexity, costSensitivity } = context;
    const base = this.confidenceConfig.baseThreshold;
    
    let adjustment = 0;
    
    // Urgency adjustment
    adjustment += this.confidenceConfig.adjustmentFactors.urgency[urgency] || 0;
    
    // User thoroughness adjustment
    const thoroughnessAdjustment = (thoroughness - 0.5) * 
      this.confidenceConfig.adjustmentFactors.userThoroughness.multiplier;
    adjustment += thoroughnessAdjustment;
    
    // Cost sensitivity adjustment
    const costAdjustment = (costSensitivity - 0.5) * 
      this.confidenceConfig.adjustmentFactors.costSensitivity.multiplier;
    adjustment += costAdjustment;
    
    // Task complexity adjustment
    adjustment += this.confidenceConfig.adjustmentFactors.taskComplexity[taskComplexity] || 0;
    
    const finalThreshold = Math.max(0.4, Math.min(0.95, base + adjustment));
    
    return {
      escalationThreshold: finalThreshold,
      adjustmentFactors: {
        urgency: this.confidenceConfig.adjustmentFactors.urgency[urgency] || 0,
        thoroughness: thoroughnessAdjustment,
        costSensitivity: costAdjustment,
        taskComplexity: this.confidenceConfig.adjustmentFactors.taskComplexity[taskComplexity] || 0
      },
      context
    };
  }
  
  /**
   * Update all agent confidence thresholds
   */
  updateAgentThresholds(dynamicThresholds) {
    for (const [agentId, agent] of this.orchestrator.agents) {
      // Store original threshold if not already stored
      if (!agent.originalEscalationThreshold) {
        agent.originalEscalationThreshold = agent.escalationThreshold;
      }
      
      // Apply dynamic threshold
      agent.escalationThreshold = dynamicThresholds.escalationThreshold;
    }
  }
  
  /**
   * Estimate task complexity from content
   */
  estimateTaskComplexity(content) {
    const wordCount = content.split(/\s+/).length;
    const sentenceCount = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);
    
    // Check for complex indicators
    const complexIndicators = [
      /\b(research|study|data|statistics|evidence)\b/gi,
      /\b(however|nevertheless|furthermore|consequently|therefore)\b/gi,
      /\b(according to|in contrast|on the other hand)\b/gi
    ];
    
    let complexityScore = 0;
    
    // Word count factor
    if (wordCount > 500) complexityScore += 0.3;
    if (wordCount > 1000) complexityScore += 0.2;
    
    // Sentence complexity factor
    if (avgWordsPerSentence > 20) complexityScore += 0.2;
    
    // Complex language indicators
    for (const pattern of complexIndicators) {
      const matches = content.match(pattern);
      if (matches && matches.length > 2) {
        complexityScore += 0.1;
      }
    }
    
    if (complexityScore >= 0.6) return 'high';
    if (complexityScore >= 0.3) return 'medium';
    return 'low';
  }
  
  /**
   * Calculate maximum parallel agents based on budget and urgency
   */
  calculateMaxParallelAgents(budget, urgency) {
    const budgetLimits = {
      'minimal': 2,
      'standard': 4,
      'premium': 6
    };
    
    const urgencyMultipliers = {
      'realtime': 0.5, // Fewer agents for speed
      'high': 0.75,
      'normal': 1.0,
      'low': 1.2 // More agents when not urgent
    };
    
    const baseLimit = budgetLimits[budget] || 3;
    const multiplier = urgencyMultipliers[urgency] || 1.0;
    
    return Math.max(1, Math.floor(baseLimit * multiplier));
  }
  
  /**
   * Learn from analysis results to improve future performance
   */
  learnFromResults(results, phase) {
    // Track user implicit preferences from results
    if (results.insights) {
      for (const insight of results.insights) {
        // Learn from insight types user encounters
        if (insight.agent) {
          this.userPreferences.preferredAgentTypes.add(insight.agent);
        }
        
        // Learn from confidence patterns
        if (insight.confidence) {
          this.updateConfidenceLearning(insight.confidence, phase);
        }
      }
    }
    
    // Store learning data
    this.userPreferences.feedbackHistory.push({
      phase,
      timestamp: Date.now(),
      resultsSummary: {
        insightCount: results.insights?.length || 0,
        avgConfidence: results.confidence || 0.5,
        agentCount: results.agentCount || 0
      }
    });
    
    // Limit history size
    if (this.userPreferences.feedbackHistory.length > 100) {
      this.userPreferences.feedbackHistory = this.userPreferences.feedbackHistory.slice(-50);
    }
  }
  
  /**
   * Learn from enhancement quality
   */
  learnFromEnhancement(enhancementData) {
    const { improvements } = enhancementData;
    
    if (improvements) {
      // If enhancements provided significant value, increase thoroughness preference
      if (improvements.insightCount > 2 || improvements.confidenceImprovement > 0.1) {
        this.userPreferences.thoroughness = Math.min(1.0, 
          this.userPreferences.thoroughness + 0.02
        );
      }
      
      // If enhancements were minimal, user might prefer speed
      if (improvements.insightCount === 0 && improvements.confidenceImprovement < 0.05) {
        this.userPreferences.speedPriority = Math.min(1.0,
          this.userPreferences.speedPriority + 0.01
        );
      }
    }
  }
  
  /**
   * Update confidence learning patterns
   */
  updateConfidenceLearning(confidence, phase) {
    if (!this.userPreferences.adaptiveThresholds[phase]) {
      this.userPreferences.adaptiveThresholds[phase] = {
        avgConfidence: confidence,
        count: 1
      };
    } else {
      const current = this.userPreferences.adaptiveThresholds[phase];
      current.avgConfidence = (current.avgConfidence * current.count + confidence) / (current.count + 1);
      current.count++;
    }
  }
  
  /**
   * Process explicit user feedback to improve system
   */
  processUserFeedback(feedback) {
    const {
      rating, // 1-5 scale
      helpful_insights = [],
      unhelpful_insights = [],
      speed_satisfaction, // 1-5 scale
      thoroughness_satisfaction, // 1-5 scale
      preferred_agents = [],
      blocked_agents = []
    } = feedback;
    
    // Update preferences based on feedback
    if (speed_satisfaction && thoroughness_satisfaction) {
      // Adjust speed vs thoroughness balance
      if (speed_satisfaction > thoroughness_satisfaction) {
        this.userPreferences.speedPriority = Math.min(1.0,
          this.userPreferences.speedPriority + 0.05
        );
      } else {
        this.userPreferences.thoroughness = Math.min(1.0,
          this.userPreferences.thoroughness + 0.05
        );
      }
    }
    
    // Update agent preferences
    if (preferred_agents.length > 0) {
      preferred_agents.forEach(agent => 
        this.userPreferences.preferredAgentTypes.add(agent)
      );
    }
    
    // Update orchestrator preferences
    this.orchestrator.updateUserPreferences({
      preferredAgents: preferred_agents,
      blockedAgents: blocked_agents,
      thoroughness: this.userPreferences.thoroughness,
      costSensitivity: this.userPreferences.costSensitivity,
      speedPriority: this.userPreferences.speedPriority
    });
    
    // Save updated preferences
    this.saveUserPreferences();
  }
  
  /**
   * Get system performance metrics
   */
  getSystemMetrics() {
    const orchestratorMetrics = this.orchestrator.getSystemMetrics();
    
    return {
      ...orchestratorMetrics,
      multiAgentSystem: {
        totalAgents: this.orchestrator.agents.size,
        userPreferences: {
          thoroughness: this.userPreferences.thoroughness,
          speedPriority: this.userPreferences.speedPriority,
          costSensitivity: this.userPreferences.costSensitivity,
          preferredAgentTypes: Array.from(this.userPreferences.preferredAgentTypes)
        },
        adaptiveThresholds: this.userPreferences.adaptiveThresholds,
        learningData: {
          feedbackHistorySize: this.userPreferences.feedbackHistory.length,
          avgSystemRating: this.calculateAvgSystemRating()
        }
      }
    };
  }
  
  /**
   * Helper methods for progress callbacks
   */
  getUserPreferencesForProgress() {
    return {
      thoroughness: this.userPreferences.thoroughness,
      speedPriority: this.userPreferences.speedPriority,
      costSensitivity: this.userPreferences.costSensitivity
    };
  }
  
  getActiveAgentCount() {
    return this.orchestrator.agents.size;
  }
  
  calculateAvgSystemRating() {
    // Would be calculated from actual user ratings
    return 4.2; // Placeholder
  }
  
  /**
   * Load user preferences from storage
   */
  async loadUserPreferences() {
    try {
      // In a real implementation, this would load from localStorage, database, etc.
      const saved = localStorage.getItem('multiAgentSystem_userPreferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.userPreferences = {
          ...this.userPreferences,
          ...parsed,
          preferredAgentTypes: new Set(parsed.preferredAgentTypes || []),
          enabledAgents: new Map(parsed.enabledAgents || [])
        };
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }
  
  /**
   * Save user preferences to storage
   */
  async saveUserPreferences() {
    try {
      const toSave = {
        ...this.userPreferences,
        preferredAgentTypes: Array.from(this.userPreferences.preferredAgentTypes),
        enabledAgents: Array.from(this.userPreferences.enabledAgents)
      };
      localStorage.setItem('multiAgentSystem_userPreferences', JSON.stringify(toSave));
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  }
  
  /**
   * Reset system to defaults
   */
  async reset() {
    // Reset user preferences
    this.userPreferences = {
      thoroughness: 0.7,
      costSensitivity: 0.5,
      speedPriority: 0.5,
      preferredAgentTypes: new Set(),
      feedbackHistory: [],
      adaptiveThresholds: {},
      enabledAgents: new Map()
    };
    
    // Reset all agents to enabled state
    for (const agentId of this.orchestrator.agents.keys()) {
      this.userPreferences.enabledAgents.set(agentId, true);
    }
    
    // Reset agent thresholds
    for (const [agentId, agent] of this.orchestrator.agents) {
      if (agent.originalEscalationThreshold) {
        agent.escalationThreshold = agent.originalEscalationThreshold;
      }
    }
    
    // Clear stored preferences
    localStorage.removeItem('multiAgentSystem_userPreferences');
    
    console.log('Multi-Agent System reset to defaults');
  }
  
  /**
   * Toggle agent enabled/disabled state
   */
  toggleAgent(agentId, enabled) {
    if (this.orchestrator.agents.has(agentId)) {
      this.userPreferences.enabledAgents.set(agentId, enabled);
      this.saveUserPreferences();
      console.log(`Agent ${agentId} ${enabled ? 'enabled' : 'disabled'}`);
      console.log('Current enabled agents:', Array.from(this.userPreferences.enabledAgents.entries()));
      return true;
    }
    return false;
  }
  
  /**
   * Get list of enabled agent IDs
   */
  getEnabledAgents() {
    const enabledAgents = [];
    for (const [agentId, enabled] of this.userPreferences.enabledAgents) {
      if (enabled) {
        enabledAgents.push(agentId);
      }
    }
    return enabledAgents;
  }
  
  /**
   * Get all available agents with their enabled state
   */
  getAllAgentsStatus() {
    const agentsStatus = [];
    for (const [agentId, agent] of this.orchestrator.agents) {
      agentsStatus.push({
        id: agentId,
        name: agent.name,
        description: agent.description,
        enabled: this.userPreferences.enabledAgents.get(agentId) || false,
        capabilities: agent.requiredCapabilities || [],
        defaultTier: agent.defaultTier
      });
    }
    return agentsStatus;
  }
  
  /**
   * Enable multiple agents at once
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
}

export default MultiAgentSystem;