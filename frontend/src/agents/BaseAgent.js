/**
 * Base Agent Class - Foundation for all specialized agents
 * Handles model selection, context requirements, and common functionality
 */

import aiService, { AI_PROVIDERS } from '../services/aiService';
import { findTextSnippets } from '../utils/textMatching';

// Agent capability requirements
export const CAPABILITIES = {
  WEB_SEARCH: 'web_search',
  DOCUMENT_SEARCH: 'document_search', 
  FACT_CHECK: 'fact_check',
  STYLE_ANALYSIS: 'style_analysis',
  LOGICAL_ANALYSIS: 'logical_analysis',
  EVIDENCE_RESEARCH: 'evidence_research',
  STRATEGIC_ANALYSIS: 'strategic_analysis',
  AUDIENCE_ANALYSIS: 'audience_analysis'
};

// Model tiers with different capabilities and costs
export const MODEL_TIERS = {
  FAST: 'fast',        // gpt-4o-mini, fast responses, minimal tools
  STANDARD: 'standard', // gpt-4o, balanced performance
  PREMIUM: 'premium'    // gpt-4, highest quality, all tools - perhaps rename as sounds producty
};

// Model configuration mapping
const MODEL_CONFIGS = {
  [MODEL_TIERS.FAST]: {
    openai: 'gpt-4o-mini',
    claude: 'claude-3-haiku-20240307',
    temperature: 0.3,
    maxTokens: 600,
    cost: 0.1,
    capabilities: [CAPABILITIES.STYLE_ANALYSIS, CAPABILITIES.LOGICAL_ANALYSIS]
  },
  [MODEL_TIERS.STANDARD]: {
    openai: 'gpt-4o',
    claude: 'claude-3-sonnet-20240229', 
    temperature: 0.4,
    maxTokens: 1000,
    cost: 1.0,
    capabilities: [
      CAPABILITIES.WEB_SEARCH,
      CAPABILITIES.DOCUMENT_SEARCH,
      CAPABILITIES.FACT_CHECK,
      CAPABILITIES.STYLE_ANALYSIS,
      CAPABILITIES.LOGICAL_ANALYSIS,
      CAPABILITIES.EVIDENCE_RESEARCH,
      CAPABILITIES.STRATEGIC_ANALYSIS,
      CAPABILITIES.AUDIENCE_ANALYSIS
    ]
  },
  [MODEL_TIERS.PREMIUM]: {
    openai: 'gpt-4',
    claude: 'claude-3-opus-20240229',
    temperature: 0.5,
    maxTokens: 2000,
    cost: 5.0,
    capabilities: Object.values(CAPABILITIES)
  }
};

export class BaseAgent {
  constructor({
    name,
    description,
    defaultTier = MODEL_TIERS.FAST,
    requiredCapabilities = [],
    escalationThreshold = 0.75,
    maxRetries = 2,
    contextLimits = { maxTokens: 2000 },
    debugPrompts = false
  }) {
    this.name = name;
    this.description = description;
    this.defaultTier = defaultTier;
    this.requiredCapabilities = requiredCapabilities;
    this.escalationThreshold = escalationThreshold;
    this.maxRetries = maxRetries;
    this.contextLimits = contextLimits;
    this.debugPrompts = debugPrompts;
    
    // Performance tracking
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      escalations: 0,
      totalCost: 0,
      avgResponseTime: 0,
      confidenceScores: []
    };
    
    // Validation
    this.validateCapabilities();
  }
  
  /**
   * Validate that required capabilities are supported by the default tier
   */
  validateCapabilities() {
    const tierConfig = MODEL_CONFIGS[this.defaultTier];
    const unsupported = this.requiredCapabilities.filter(
      cap => !tierConfig.capabilities.includes(cap)
    );
    
    if (unsupported.length > 0) {
      throw new Error(
        `Agent ${this.name} requires capabilities [${unsupported.join(', ')}] ` +
        `not supported by ${this.defaultTier} tier`
      );
    }
  }
  
  /**
   * Select optimal model configuration based on task complexity and requirements
   */
  selectModelConfig(taskComplexity = 'medium', urgency = 'normal', costBudget = 'standard') {
    let selectedTier = this.defaultTier;
    
    // Escalate tier based on complexity and requirements
    if (taskComplexity === 'high' || this.requiredCapabilities.includes(CAPABILITIES.EVIDENCE_RESEARCH)) {
      selectedTier = MODEL_TIERS.PREMIUM;
    } else if (taskComplexity === 'medium' && costBudget !== 'minimal') {
      selectedTier = MODEL_TIERS.STANDARD;
    }
    
    // De-escalate for urgent tasks if cost is a concern
    if (urgency === 'realtime' && costBudget === 'minimal') {
      selectedTier = MODEL_TIERS.FAST;
    }
    
    const config = MODEL_CONFIGS[selectedTier];
    
    // Select provider (prefer OpenAI for now, can be made configurable)
    const provider = AI_PROVIDERS.OPENAI;
    const model = config[provider.toLowerCase()];
    
    return {
      provider,
      model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      cost: config.cost,
      tier: selectedTier,
      capabilities: config.capabilities
    };
  }
  
  /**
   * Check if the agent should escalate to a higher tier model
   */
  shouldEscalate(confidence, taskComplexity, errorCount = 0) {
    return (
      confidence < this.escalationThreshold ||
      taskComplexity === 'high' ||
      errorCount > 0
    );
  }
  
  /**
   * Prepare context for the model, respecting token limits
   */
  prepareContext(content, additionalContext = {}) {
    const {
      purpose,
      userPreferences = {},
      recentFeedback = [],
      taskType = 'analysis'
    } = additionalContext;
    
    // Truncate content if it exceeds limits
    let processedContent = content;
    if (content.length > this.contextLimits.maxTokens * 4) { // Rough token estimation
      processedContent = content.substring(0, this.contextLimits.maxTokens * 4) + '...';
    }
    
    return {
      content: processedContent,
      purpose,
      taskType,
      agentName: this.name,
      userPreferences,
      recentFeedback: recentFeedback.slice(-3), // Only recent feedback
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Execute analysis with model selection and escalation logic
   */
  async analyze(content, options = {}) {
    console.log(`[${this.name}] *** ANALYZE METHOD CALLED ***`);
    
    const startTime = Date.now();
    const {
      taskComplexity = 'medium',
      urgency = 'normal', 
      costBudget = 'standard',
      streaming = false,
      onProgress = null,
      additionalContext = {}
    } = options;
    
    console.log(`[${this.name}] Starting analysis with options:`, {
      taskComplexity,
      urgency,
      costBudget,
      streaming,
      contentLength: content?.length,
      additionalContext
    });
    
    let attempt = 0;
    let lastError = null;
    let currentTier = this.defaultTier;
    
    this.stats.totalCalls++;
    
    while (attempt < this.maxRetries) {
      try {
        // Select model configuration
        const modelConfig = this.selectModelConfig(
          attempt > 0 ? 'high' : taskComplexity, // Escalate on retry
          urgency,
          costBudget
        );
        
        console.log(`[${this.name}] Selected model config:`, modelConfig);
        
        // Track escalations
        if (modelConfig.tier !== this.defaultTier) {
          this.stats.escalations++;
        }
        
        // Prepare context
        const context = this.prepareContext(content, additionalContext);
        
        // Generate prompt using agent-specific logic
        console.log(`[${this.name}] *** ABOUT TO CALL generatePrompt ***`);
        console.log(`[${this.name}] Generating prompt for context:`, { contextLength: context?.content?.length });
        let prompt;
        try {
          console.log(`[${this.name}] *** CALLING generatePrompt NOW ***`);
          prompt = this.generatePrompt(context, modelConfig);
          console.log(`[${this.name}] *** generatePrompt RETURNED ***`);
          console.log(`[${this.name}] Generated prompt length:`, prompt?.length);
          
          // LOG THE ACTUAL PROMPT FOR DEBUGGING CUSTOMIZATIONS
          // Always log for now to debug the issue
          console.log(`\n===== ${this.name} PROMPT =====`);
          console.log(prompt);
          console.log(`===== END ${this.name} PROMPT =====\n`);
          
        } catch (promptError) {
          console.error(`[${this.name}] *** generatePrompt FAILED ***:`, promptError);
          throw promptError;
        }
        
        // Execute the analysis
        let result;
        if (streaming && onProgress) {
          console.log(`[${this.name}] Using streaming execution`);
          result = await this.executeStreaming(prompt, modelConfig, onProgress);
        } else {
          console.log(`[${this.name}] Using standard execution`);
          result = await this.executeStandard(prompt, modelConfig);
        }
        console.log(`[${this.name}] Execution completed`);
        
        // Parse and validate result
        const analysis = this.parseResult(result, context);
        
        // Update statistics
        const responseTime = Date.now() - startTime;
        this.updateStats(true, modelConfig.cost, responseTime, analysis.confidence || 0.5);
        
        // Check if escalation is needed for next time
        if (this.shouldEscalate(analysis.confidence, taskComplexity, attempt)) {
          this.stats.escalations++;
        }
        
        return {
          ...analysis,
          metadata: {
            agent: this.name,
            modelUsed: `${modelConfig.provider}:${modelConfig.model}`,
            tier: modelConfig.tier,
            attempt: attempt + 1,
            responseTime,
            cost: modelConfig.cost,
            timestamp: new Date().toISOString()
          }
        };
        
      } catch (error) {
        attempt++;
        lastError = error;
        console.warn(`${this.name} attempt ${attempt} failed:`, error.message);
        
        // Don't retry on certain types of errors
        if (error.message.includes('API key') || error.message.includes('authentication')) {
          break;
        }
      }
    }
    
    // All attempts failed
    const responseTime = Date.now() - startTime;
    this.updateStats(false, 0, responseTime, 0);
    
    throw new Error(
      `${this.name} failed after ${this.maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }
  
  /**
   * Execute standard (non-streaming) analysis
   */
  async executeStandard(prompt, modelConfig) {
    try {
      console.log(`[${this.name}] Starting API call with config:`, {
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        model: modelConfig.model,
        promptLength: prompt?.length,
        hasApiKey: !!process.env.REACT_APP_OPENAI_API_KEY
      });
      
      const result = await aiService.callAPI(prompt, undefined, {
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        model: modelConfig.model
      });
      
      console.log(`[${this.name}] API call successful, response length:`, result?.length);
      console.log(`[${this.name}] API RESPONSE:`, result);
      return result;
    } catch (error) {
      console.error(`[${this.name}] API call failed with error:`, {
        message: error.message,
        stack: error.stack,
        modelConfig: modelConfig
      });
      
      // If this is an API key error, throw it up so user knows
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        throw new Error(`${this.name}: ${error.message}`);
      }
      
      // Fallback response for other errors
      console.warn(`[${this.name}] Using fallback response due to error:`, error.message);
      return JSON.stringify([{
        type: 'system_message',
        title: 'Agent Temporarily Unavailable',
        feedback: `The ${this.name} is currently experiencing issues: ${error.message}`,
        suggestion: 'Please check your API configuration or try again later.',
        confidence: 0.5,
        agent: this.name,
        priority: 'low',
        positions: []
      }]);
    }
  }
  
  /**
   * Execute streaming analysis with progress callbacks
   */
  async executeStreaming(prompt, modelConfig, onProgress) {
    let fullResponse = '';
    
    await aiService.callAPIStream(
      prompt,
      (chunk, completeObjects, fullText) => {
        fullResponse = fullText;
        if (onProgress) {
          onProgress({
            chunk,
            completeObjects,
            fullText,
            agent: this.name
          });
        }
      },
      undefined,
      {
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        model: modelConfig.model
      }
    );
    
    return fullResponse;
  }
  
  /**
   * Update performance statistics
   */
  updateStats(success, cost, responseTime, confidence) {
    if (success) {
      this.stats.successfulCalls++;
      this.stats.confidenceScores.push(confidence);
      
      // Keep only recent confidence scores (last 100)
      if (this.stats.confidenceScores.length > 100) {
        this.stats.confidenceScores = this.stats.confidenceScores.slice(-100);
      }
    }
    
    this.stats.totalCost += cost;
    
    // Update rolling average response time
    this.stats.avgResponseTime = (
      (this.stats.avgResponseTime * (this.stats.totalCalls - 1)) + responseTime
    ) / this.stats.totalCalls;
  }
  
  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics() {
    const avgConfidence = this.stats.confidenceScores.length > 0 
      ? this.stats.confidenceScores.reduce((a, b) => a + b, 0) / this.stats.confidenceScores.length
      : 0;
    
    return {
      agent: this.name,
      successRate: this.stats.totalCalls > 0 ? this.stats.successfulCalls / this.stats.totalCalls : 0,
      escalationRate: this.stats.totalCalls > 0 ? this.stats.escalations / this.stats.totalCalls : 0,
      avgResponseTime: this.stats.avgResponseTime,
      avgConfidence,
      totalCost: this.stats.totalCost,
      totalCalls: this.stats.totalCalls,
      recentConfidenceScores: this.stats.confidenceScores.slice(-10)
    };
  }
  
  /**
   * Reset performance statistics
   */
  resetStats() {
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      escalations: 0,
      totalCost: 0,
      avgResponseTime: 0,
      confidenceScores: []
    };
  }

  /**
   * Process position data for insights - converts textSnippets to positions if needed
   */
  processInsightPositions(insights, content) {
    if (!Array.isArray(insights) || !content) {
      return insights;
    }

    return insights.map(insight => {
      // If insight already has positions, return as-is
      if (insight.positions && insight.positions.length > 0) {
        return insight;
      }

      // If insight has textSnippets, convert to positions
      if (insight.textSnippets && Array.isArray(insight.textSnippets)) {
        const matches = findTextSnippets(content, insight.textSnippets, 0.75);
        
        if (matches.length > 0) {
          return {
            ...insight,
            positions: matches.map(match => ({
              start: match.start,
              end: match.end,
              text: match.text,
              similarity: match.similarity,
              originalSnippet: match.originalSnippet
            }))
          };
        }
      }

      // If insight has single position, convert to positions array
      if (insight.position && !insight.positions) {
        return {
          ...insight,
          positions: [{
            start: insight.position.start,
            end: insight.position.end,
            text: content.substring(insight.position.start, insight.position.end)
          }]
        };
      }

      // Try to find position based on title or feedback content
      if (!insight.positions || insight.positions.length === 0) {
        const searchText = insight.title || insight.feedback || '';
        if (searchText.length > 10) {
          // Try to find a relevant snippet in the content
          const matches = findTextSnippets(content, [searchText], 0.6);
          if (matches.length > 0) {
            return {
              ...insight,
              positions: [{
                start: matches[0].start,
                end: matches[0].end,
                text: matches[0].text,
                similarity: matches[0].similarity,
                inferred: true
              }]
            };
          }
        }

        // Fallback: add a position at the beginning with minimal text
        return {
          ...insight,
          positions: [{
            start: 0,
            end: Math.min(50, content.length),
            text: content.substring(0, Math.min(50, content.length)),
            fallback: true
          }]
        };
      }

      return insight;
    });
  }
  
  // Abstract methods to be implemented by subclasses
  
  /**
   * Generate agent-specific prompt
   * @param {Object} context - Prepared context object
   * @param {Object} modelConfig - Selected model configuration
   * @returns {string} The prompt to send to the AI model
   */
  generatePrompt(context, modelConfig) {
    throw new Error(`${this.name} must implement generatePrompt method`);
  }
  
  /**
   * Parse and validate the AI response
   * @param {string} result - Raw response from AI model
   * @param {Object} context - The context that was sent
   * @returns {Object} Parsed analysis result with confidence score
   */
  parseResult(result, context) {
    throw new Error(`${this.name} must implement parseResult method`);
  }
}

export default BaseAgent;