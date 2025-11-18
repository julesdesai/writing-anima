/**
 * User Agent - Dynamic Agent Based on User-Created Configuration
 * Handles agents created by users with custom prompts
 */

import { BaseAgent, MODEL_TIERS, CAPABILITIES } from './BaseAgent';

export class UserAgent extends BaseAgent {
  constructor(userAgentConfig) {
    super({
      name: userAgentConfig.name,
      description: userAgentConfig.description,
      defaultTier: userAgentConfig.defaultTier || MODEL_TIERS.FAST,
      requiredCapabilities: userAgentConfig.capabilities || [],
      escalationThreshold: 0.75,
      maxRetries: 2,
      contextLimits: { maxTokens: 2000 },
      debugPrompts: true // Always show prompts for user agents
    });

    this.userConfig = userAgentConfig;
    this.category = userAgentConfig.category;
    this.icon = userAgentConfig.icon;
    this.responseFormat = userAgentConfig.responseFormat;
    this.customPrompt = userAgentConfig.prompt;
  }

  /**
   * Generate prompt using user's custom prompt template
   */
  generatePrompt(context, modelConfig) {
    const { content, purpose } = context;
    
    // Handle both old format (string) and new format (object with topic/context)
    let topicText = 'General analysis';
    let contextText = '';
    
    if (typeof purpose === 'object' && purpose !== null) {
      topicText = purpose.topic || 'General analysis';
      contextText = purpose.context || '';
    } else if (typeof purpose === 'string') {
      topicText = purpose;
    }
    
    // Standard prompt beginning that users cannot modify
    const standardBeginning = `WRITING TOPIC: ${topicText}
${contextText ? `WRITING CONTEXT: ${contextText}` : ''}

TEXT TO ANALYZE:
${content}

ANALYSIS INSTRUCTIONS:`;

    // Use the user's custom prompt (without template variables since we're providing the content directly)
    let userPrompt = this.customPrompt;
    
    // Remove template variables from user prompt since we're providing content directly above
    userPrompt = userPrompt.replace(/{CONTENT}/g, '').replace(/{PURPOSE}/g, '');
    
    // Combine: standard beginning + user's custom analysis instructions
    let prompt = standardBeginning + '\n' + userPrompt;
    
    // Add any additional context
    if (context.additionalContext && Object.keys(context.additionalContext).length > 0) {
      prompt += '\n\nADDITIONAL CONTEXT:\n' + JSON.stringify(context.additionalContext, null, 2);
    }
    
    // Append standard formatting instructions that users cannot modify
    const standardFormatting = `

CRITICAL RESPONSE FORMAT REQUIREMENTS:
- Respond with ONLY a valid JSON array
- No markdown code blocks (no \`\`\`json)
- No additional text before or after the JSON
- Each insight must be a JSON object with these exact fields:
  {
    "type": "string (required)",
    "title": "string (required)", 
    "feedback": "string (required)",
    "suggestion": "string (required)",
    "confidence": number between 0 and 1 (required),
    "severity": "high|medium|low" (required),
    "textSnippets": ["array", "of", "relevant", "text", "excerpts"]
  }

EXAMPLE RESPONSE FORMAT:
[
  {
    "type": "analysis_type",
    "title": "Brief Title",
    "feedback": "Your analysis of the content",
    "suggestion": "Actionable suggestion for improvement",
    "confidence": 0.9,
    "severity": "medium",
    "textSnippets": ["relevant excerpt from text"]
  }
]

If no significant issues or insights found, return empty array: []`;

    prompt += standardFormatting;
    
    console.log(`[UserAgent] Using custom prompt for ${this.name}`);
    
    return prompt;
  }

  /**
   * Parse result based on expected response format
   */
  parseResult(apiResult, context) {
    console.log(`[UserAgent] ${this.name} - parseResult called with:`, apiResult);
    try {
      // Clean and parse JSON response
      let cleanResponse = apiResult.trim();
      console.log(`[UserAgent] ${this.name} - cleanResponse:`, cleanResponse);
      
      // Remove code blocks if present - more robust approach
      cleanResponse = cleanResponse.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
      
      console.log(`[UserAgent] ${this.name} - after removing code blocks:`, cleanResponse);
      
      // Extract JSON array if needed
      const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      console.log(`[UserAgent] ${this.name} - cleanResponse after processing:`, cleanResponse);
      const insights = JSON.parse(cleanResponse);
      console.log(`[UserAgent] ${this.name} - parsed insights:`, insights);
      
      if (!Array.isArray(insights)) {
        throw new Error('Expected array of insights');
      }

      // Process positions for each insight
      const insightsWithPositions = this.processInsightPositions(insights, context.content);
      
      // Add agent metadata to each insight
      const processedInsights = insightsWithPositions.map(insight => ({
        ...insight,
        agent: this.name,
        agentId: this.userConfig.id,
        agentCategory: this.category,
        agentIcon: this.icon,
        timestamp: new Date().toISOString(),
        userCreated: true
      }));

      // Calculate overall confidence
      const avgConfidence = processedInsights.length > 0
        ? processedInsights.reduce((sum, i) => sum + (i.confidence || 0.5), 0) / processedInsights.length
        : 0.9;

      // Update usage count
      this.updateUsageCount();

      const result = {
        insights: processedInsights,
        confidence: avgConfidence,
        summary: this.generateSummary(processedInsights),
        agentConfig: {
          id: this.userConfig.id,
          name: this.name,
          category: this.category,
          responseFormat: this.responseFormat
        }
      };
      
      return result;

    } catch (parseError) {
      console.warn(`[UserAgent] Failed to parse response from ${this.name}:`, parseError);
      console.warn(`[UserAgent] Raw result that failed to parse:`, apiResult);
      
      // Return error insight
      return {
        insights: [{
          type: 'parse_error',
          agent: this.name,
          agentId: this.userConfig.id,
          title: 'Agent Response Parse Error',
          feedback: `The agent "${this.name}" returned a response that couldn't be parsed as JSON. This might indicate an issue with the agent's prompt or the AI's response format.`,
          suggestion: 'Check the agent\'s prompt to ensure it requests JSON output, or try running the analysis again.',
          confidence: 0.1,
          severity: 'medium',
          timestamp: new Date().toISOString(),
          positions: [],
          textSnippets: [],
          parseError: true,
          rawResponse: apiResult.substring(0, 500) + (apiResult.length > 500 ? '...' : '')
        }],
        confidence: 0.1,
        summary: `Parse error from agent "${this.name}"`,
        agentConfig: {
          id: this.userConfig.id,
          name: this.name,
          category: this.category
        }
      };
    }
  }

  /**
   * Generate summary of analysis results
   */
  generateSummary(insights) {
    if (insights.length === 0) {
      return `${this.name}: No issues or insights found.`;
    }

    const categories = [...new Set(insights.map(i => i.category || i.type))];
    const highPriorityCount = insights.filter(i => i.severity === 'high' || i.priority === 'high').length;

    let summary = `${this.name}: Found ${insights.length} insight${insights.length > 1 ? 's' : ''}`;
    
    if (categories.length > 0) {
      summary += ` across ${categories.join(', ')}`;
    }
    
    if (highPriorityCount > 0) {
      summary += `. ${highPriorityCount} require${highPriorityCount === 1 ? 's' : ''} immediate attention`;
    }

    return summary + '.';
  }

  /**
   * Update usage count for this agent
   */
  updateUsageCount() {
    // This would be handled by the UserAgentService
    // For now, just log the usage
    console.log(`[UserAgent] ${this.name} used for analysis`);
  }

  /**
   * Get agent-specific performance metrics
   */
  getExtendedMetrics() {
    const baseMetrics = this.getPerformanceMetrics();
    
    return {
      ...baseMetrics,
      userAgent: {
        id: this.userConfig.id,
        category: this.category,
        responseFormat: this.responseFormat,
        templateOrigin: this.userConfig.templateOrigin,
        created: this.userConfig.created,
        lastModified: this.userConfig.lastModified,
        usageCount: this.userConfig.usageCount || 0
      }
    };
  }

  /**
   * Validate agent configuration
   */
  static validateConfig(config) {
    const required = ['name', 'prompt'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate prompt has required template variables
    if (!config.prompt.includes('{CONTENT}')) {
      console.warn('Agent prompt does not include {CONTENT} variable - agent may not work correctly');
    }

    return true;
  }

  /**
   * Create agent instance from user config
   */
  static fromConfig(userAgentConfig) {
    UserAgent.validateConfig(userAgentConfig);
    return new UserAgent(userAgentConfig);
  }
}

export default UserAgent;