/**
 * Dynamic Agent - User-configurable agent that can be spawned at runtime
 * Allows users to create custom agents with specific capabilities and behaviors
 */

import { BaseAgent, MODEL_TIERS, CAPABILITIES } from './BaseAgent';

export class DynamicAgent extends BaseAgent {
  constructor(config) {
    const {
      name = 'Custom Agent',
      description = 'User-configured dynamic agent',
      specialization,
      customPrompt,
      modelTier = MODEL_TIERS.STANDARD,
      capabilities = [],
      focusAreas = [],
      outputFormat = 'standard',
      persona = 'neutral',
      agentId,
      created,
      lastModified,
      usageCount = 0,
      userSettings = {}
    } = config;

    super({
      name,
      description,
      defaultTier: modelTier,
      requiredCapabilities: capabilities,
      escalationThreshold: userSettings.escalationThreshold || 0.75,
      maxRetries: userSettings.maxRetries || 2,
      contextLimits: { maxTokens: userSettings.maxTokens || 2000 }
    });

    // Dynamic configuration
    this.specialization = specialization;
    this.customPrompt = customPrompt;
    this.focusAreas = focusAreas;
    this.outputFormat = outputFormat;
    this.persona = persona;
    this.agentId = agentId || this.generateAgentId();
    this.created = created || new Date().toISOString();
    this.lastModified = lastModified || new Date().toISOString();
    this.usageCount = usageCount;
    this.userSettings = userSettings;
    
    // Dynamic learning capabilities
    this.learningData = {
      averageConfidence: 0.5,
      successfulAnalyses: 0,
      userFeedback: [],
      performanceHistory: []
    };
    
    // Validation
    this.validateDynamicConfig();
  }

  /**
   * Generate unique agent ID
   */
  generateAgentId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `dynamic_${timestamp}_${random}`;
  }

  /**
   * Validate dynamic configuration
   */
  validateDynamicConfig() {
    if (!this.specialization) {
      throw new Error('Dynamic agent must have a specialization');
    }
    
    if (!this.customPrompt || this.customPrompt.trim().length === 0) {
      throw new Error('Dynamic agent must have a custom prompt');
    }
    
    if (this.customPrompt.length > 2000) {
      throw new Error('Custom prompt must be under 2000 characters');
    }
  }

  /**
   * Generate agent-specific prompt using custom configuration
   */
  generatePrompt(context, modelConfig) {
    const { content, purpose, taskType, userPreferences } = context;
    
    // Build persona-based introduction
    const personaIntros = {
      neutral: "You are a specialized writing analysis agent.",
      friendly: "You are a helpful and encouraging writing assistant.",
      academic: "You are a rigorous academic writing specialist.",
      creative: "You are an innovative creative writing expert.",
      professional: "You are a professional communication specialist.",
      critical: "You are a thorough and analytical writing critic."
    };
    
    const intro = personaIntros[this.persona] || personaIntros.neutral;
    
    // Build focus areas section
    const focusSection = this.focusAreas.length > 0 
      ? `\n\nFocus specifically on these areas:\n${this.focusAreas.map(area => `- ${area}`).join('\n')}`
      : '';
    
    // Build output format instructions
    const formatInstructions = this.getFormatInstructions();
    
    // Build the complete prompt
    const prompt = `${intro}

Your specialization: ${this.specialization}

${this.customPrompt}

${focusSection}

Content to analyze:
"""
${content}
"""

Purpose/Context: ${purpose || 'General writing analysis'}

${formatInstructions}

Provide your analysis as a JSON array of insights with the following structure:
[
  {
    "type": "improvement",
    "title": "Brief title of the insight",
    "feedback": "Detailed explanation of the issue or suggestion", 
    "suggestion": "Specific actionable recommendation",
    "confidence": 0.85,
    "severity": "medium",
    "positions": [{"start": 0, "end": 10}],
    "textSnippets": ["exact text from content that this insight applies to"],
    "agent": "${this.name}",
    "category": "${this.specialization}"
  }
]

IMPORTANT for positioning:
- If you can identify specific text positions, use "positions" with exact start/end character indices
- If you cannot determine exact positions, use "textSnippets" with the exact text phrases your insight applies to
- Always include either "positions" OR "textSnippets" to enable text highlighting
- Be precise with text matching to ensure accurate highlighting`;

    return prompt;
  }

  /**
   * Get format-specific instructions
   */
  getFormatInstructions() {
    const formatMap = {
      standard: "Provide standard writing insights focusing on improvement opportunities.",
      detailed: "Provide comprehensive analysis with detailed explanations and examples.",
      bullet_points: "Structure your feedback as clear, actionable bullet points.",
      conversational: "Use a conversational tone as if discussing the writing with a colleague.",
      checklist: "Provide a checklist-style analysis with clear pass/fail criteria."
    };
    
    return formatMap[this.outputFormat] || formatMap.standard;
  }

  /**
   * Parse and validate the AI response with dynamic handling
   */
  parseResult(result, context) {
    try {
      // Track usage
      this.usageCount++;
      this.lastModified = new Date().toISOString();
      
      // Try to parse JSON response
      let insights;
      try {
        insights = JSON.parse(result);
      } catch (parseError) {
        // Fallback: try to extract JSON from markdown code blocks
        const jsonMatch = result.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
        if (jsonMatch) {
          insights = JSON.parse(jsonMatch[1]);
        } else {
          throw parseError;
        }
      }
      
      if (!Array.isArray(insights)) {
        insights = [insights];
      }
      
      // Process positions for each insight
      const insightsWithPositions = this.processInsightPositions(insights, context.content);
      
      // Enhance insights with dynamic agent metadata
      const enhancedInsights = insightsWithPositions.map(insight => ({
        ...insight,
        agent: this.name,
        agentId: this.agentId,
        specialization: this.specialization,
        dynamicAgent: true,
        timestamp: new Date().toISOString(),
        type: insight.type || 'improvement',
        confidence: this.normalizeConfidence(insight.confidence),
        severity: insight.severity || 'medium'
      }));
      
      // Calculate overall confidence
      const avgConfidence = enhancedInsights.length > 0
        ? enhancedInsights.reduce((sum, insight) => sum + (insight.confidence || 0.5), 0) / enhancedInsights.length
        : 0.5;
      
      // Update learning data
      this.updateLearningData(avgConfidence, enhancedInsights.length);
      
      return {
        insights: enhancedInsights,
        confidence: avgConfidence,
        agentSpecialization: this.specialization,
        dynamicAgent: true,
        processingMetadata: {
          agentId: this.agentId,
          usageCount: this.usageCount,
          learningData: this.getLearningMetrics()
        }
      };
      
    } catch (error) {
      console.error(`Dynamic agent ${this.name} failed to parse result:`, error);
      
      // Return a fallback result
      return {
        insights: [{
          type: 'system_error',
          title: 'Dynamic Agent Analysis Failed',
          feedback: `The ${this.name} encountered an error during analysis: ${error.message}`,
          suggestion: 'Consider adjusting the agent configuration or trying again.',
          confidence: 0.3,
          severity: 'medium',
          agent: this.name,
          agentId: this.agentId,
          specialization: this.specialization,
          dynamicAgent: true,
          positions: []
        }],
        confidence: 0.3,
        error: true,
        errorMessage: error.message
      };
    }
  }

  /**
   * Normalize confidence scores
   */
  normalizeConfidence(confidence) {
    if (typeof confidence !== 'number') return 0.5;
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Update learning data based on performance
   */
  updateLearningData(confidence, insightCount) {
    this.learningData.successfulAnalyses++;
    
    // Update rolling average confidence
    const totalAnalyses = this.learningData.successfulAnalyses;
    this.learningData.averageConfidence = (
      (this.learningData.averageConfidence * (totalAnalyses - 1)) + confidence
    ) / totalAnalyses;
    
    // Store performance history (keep last 50 entries)
    this.learningData.performanceHistory.push({
      timestamp: new Date().toISOString(),
      confidence,
      insightCount,
      context: 'analysis'
    });
    
    if (this.learningData.performanceHistory.length > 50) {
      this.learningData.performanceHistory = this.learningData.performanceHistory.slice(-50);
    }
  }

  /**
   * Process user feedback to improve agent performance
   */
  processFeedback(feedback) {
    const {
      rating, // 1-5 scale
      helpful = true,
      insightId,
      comments,
      suggestedImprovements
    } = feedback;
    
    this.learningData.userFeedback.push({
      timestamp: new Date().toISOString(),
      rating,
      helpful,
      insightId,
      comments,
      suggestedImprovements
    });
    
    // Adjust agent behavior based on feedback
    if (!helpful && rating < 3) {
      // Lower confidence threshold for this agent
      this.escalationThreshold = Math.max(0.4, this.escalationThreshold - 0.05);
    } else if (helpful && rating > 4) {
      // Increase confidence threshold
      this.escalationThreshold = Math.min(0.9, this.escalationThreshold + 0.02);
    }
    
    // Keep only recent feedback (last 100 entries)
    if (this.learningData.userFeedback.length > 100) {
      this.learningData.userFeedback = this.learningData.userFeedback.slice(-100);
    }
    
    this.lastModified = new Date().toISOString();
  }

  /**
   * Get learning metrics for monitoring
   */
  getLearningMetrics() {
    const recentFeedback = this.learningData.userFeedback.slice(-10);
    const avgRating = recentFeedback.length > 0
      ? recentFeedback.reduce((sum, fb) => sum + (fb.rating || 3), 0) / recentFeedback.length
      : 3;
    
    const helpfulnessRate = recentFeedback.length > 0
      ? recentFeedback.filter(fb => fb.helpful).length / recentFeedback.length
      : 0.5;
    
    return {
      averageConfidence: this.learningData.averageConfidence,
      totalAnalyses: this.learningData.successfulAnalyses,
      recentRating: avgRating,
      helpfulnessRate,
      feedbackCount: this.learningData.userFeedback.length,
      improvementTrend: this.calculateImprovementTrend()
    };
  }

  /**
   * Calculate improvement trend over time
   */
  calculateImprovementTrend() {
    const recent = this.learningData.performanceHistory.slice(-10);
    const older = this.learningData.performanceHistory.slice(-20, -10);
    
    if (recent.length === 0 || older.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, p) => sum + p.confidence, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.confidence, 0) / older.length;
    
    return recentAvg - olderAvg; // Positive means improving
  }

  /**
   * Export agent configuration for saving/sharing
   */
  exportConfig() {
    return {
      name: this.name,
      description: this.description,
      specialization: this.specialization,
      customPrompt: this.customPrompt,
      modelTier: this.defaultTier,
      capabilities: this.requiredCapabilities,
      focusAreas: this.focusAreas,
      outputFormat: this.outputFormat,
      persona: this.persona,
      agentId: this.agentId,
      created: this.created,
      lastModified: this.lastModified,
      usageCount: this.usageCount,
      userSettings: this.userSettings,
      learningData: this.learningData
    };
  }

  /**
   * Update agent configuration
   */
  updateConfig(newConfig) {
    const allowedUpdates = [
      'name', 'description', 'specialization', 'customPrompt', 
      'focusAreas', 'outputFormat', 'persona', 'userSettings'
    ];
    
    for (const key of allowedUpdates) {
      if (newConfig.hasOwnProperty(key)) {
        this[key] = newConfig[key];
      }
    }
    
    // Update model tier if provided and valid
    if (newConfig.modelTier && Object.values(MODEL_TIERS).includes(newConfig.modelTier)) {
      this.defaultTier = newConfig.modelTier;
    }
    
    // Update capabilities if provided
    if (Array.isArray(newConfig.capabilities)) {
      this.requiredCapabilities = newConfig.capabilities;
      this.validateCapabilities();
    }
    
    this.lastModified = new Date().toISOString();
    this.validateDynamicConfig();
  }

  /**
   * Clone this agent with modifications
   */
  clone(modifications = {}) {
    const config = {
      ...this.exportConfig(),
      ...modifications,
      agentId: undefined, // Generate new ID
      created: undefined, // Generate new timestamp
      usageCount: 0,
      learningData: {
        averageConfidence: 0.5,
        successfulAnalyses: 0,
        userFeedback: [],
        performanceHistory: []
      }
    };
    
    return new DynamicAgent(config);
  }
}

export default DynamicAgent;