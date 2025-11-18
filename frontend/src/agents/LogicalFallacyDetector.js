/**
 * Logical Fallacy Detector - Fast Response Agent
 * Uses gpt-4o-mini for quick identification of logical fallacies
 * Minimal tool access, focused on pattern matching and prompt engineering
 */

import { BaseAgent, MODEL_TIERS, CAPABILITIES } from './BaseAgent';
import promptCustomizationService from '../services/promptCustomizationService';

export class LogicalFallacyDetector extends BaseAgent {
  constructor() {
    super({
      name: 'Logical Fallacy Detector',
      description: 'Quickly identifies common logical fallacies in arguments and reasoning',
      defaultTier: MODEL_TIERS.FAST,
      requiredCapabilities: [CAPABILITIES.LOGICAL_ANALYSIS],
      escalationThreshold: 0.7,
      maxRetries: 2,
      contextLimits: { maxTokens: 1500 }, // Shorter context for fast response
      debugPrompts: true // Enable prompt debugging to verify customizations
    });
    
    // Pre-compiled fallacy patterns for quick matching
    this.fallacyPatterns = {
      'ad_hominem': {
        keywords: ['you are', 'he is', 'she is', 'they are', 'person who', 'coming from'],
        patterns: [/you (can't|cannot|shouldn't)/gi, /consider the source/gi],
        confidence: 0.8
      },
      'straw_man': {
        keywords: ['you think', 'you believe', 'you want', 'you say', 'your position'],
        patterns: [/so you're saying/gi, /you think that/gi],
        confidence: 0.7
      },
      'false_dichotomy': {
        keywords: ['either', 'only two', 'you must choose', 'there are only'],
        patterns: [/either .+ or .+/gi, /only two (options|choices|ways)/gi],
        confidence: 0.8
      },
      'slippery_slope': {
        keywords: ['if we', 'next thing', 'leads to', 'eventually'],
        patterns: [/if .+ then .+ will/gi, /this will lead to/gi],
        confidence: 0.7
      },
      'appeal_to_authority': {
        keywords: ['expert says', 'according to', 'famous', 'authority'],
        patterns: [/[A-Z][a-z]+ says/gi, /according to [A-Z]/gi],
        confidence: 0.6
      },
      'circular_reasoning': {
        keywords: ['because', 'therefore', 'proves that'],
        patterns: [/because .+ is .+/gi],
        confidence: 0.5
      }
    };
    
    // Common fallacy triggers for quick pre-screening
    this.quickTriggers = [
      'because', 'therefore', 'since', 'you are', 'either', 'only',
      'expert', 'authority', 'everyone', 'nobody', 'always', 'never'
    ];
  }
  
  /**
   * Generate prompt optimized for fast fallacy detection
   */
  generatePrompt(context, modelConfig) {
    const { content, purpose, taskType } = context;
    
    // Try to use customized prompt first
    try {
      return promptCustomizationService.generatePrompt(
        'logicalFallacy',
        content,
        purpose,
        'analysis',
        this.generateAdditionalCriteria(content)
      );
    } catch (error) {
      console.warn('[LogicalFallacyDetector] Failed to get customized prompt, using fallback:', error);
      
      // Fallback to default prompt
      const potentialFallacies = this.quickFallacyScreen(content);
      const focusAreas = potentialFallacies.length > 0 
        ? `\nFocus especially on these potential issues: ${potentialFallacies.join(', ')}`
        : '';
      
      return `You are a logical fallacy detection specialist. Analyze the following text for logical fallacies and weak reasoning patterns.

TEXT TO ANALYZE:
${content}

PURPOSE: ${purpose || 'General analysis'}

${focusAreas}

Common fallacies to detect:
- Ad Hominem: Attacking the person instead of their argument
- Straw Man: Misrepresenting someone's position to make it easier to attack  
- False Dichotomy: Presenting only two options when more exist
- Slippery Slope: Claiming one event will lead to extreme consequences
- Appeal to Authority: Using authority as evidence without expertise relevance
- Circular Reasoning: Using the conclusion as evidence for itself
- Hasty Generalization: Drawing broad conclusions from limited examples
- Red Herring: Diverting attention from the main argument

For EACH fallacy found, provide a confidence score (0.0-1.0) and be concise.

Respond with ONLY valid JSON:
[
  {
    "type": "logical_fallacy",
    "fallacyType": "ad_hominem|straw_man|false_dichotomy|slippery_slope|appeal_to_authority|circular_reasoning|hasty_generalization|red_herring|other",
    "severity": "high|medium|low",
    "confidence": 0.85,
    "title": "Brief title describing the issue",
    "textSnippets": ["exact text that contains the fallacy"],
    "feedback": "Concise explanation of the logical error",
    "suggestion": "Specific way to fix this reasoning",
    "quickFix": "One-sentence rewrite suggestion"
  }
]

If no fallacies found, return empty array [].
Be precise - only flag actual logical errors, not just weak arguments.`;
    }
  }
  
  /**
   * Generate additional criteria based on quick analysis
   */
  generateAdditionalCriteria(content) {
    const potentialFallacies = this.quickFallacyScreen(content);
    
    return {
      potentialFallacies: potentialFallacies.join(', '),
      triggerCount: this.quickTriggers.filter(trigger => 
        content.toLowerCase().includes(trigger)
      ).length,
      contentLength: content.length,
      analysisMode: 'fast_detection'
    };
  }
  
  /**
   * Parse and validate the AI response for fallacy detection
   */
  parseResult(result, context) {
    try {
      // Clean and parse JSON
      let cleanResponse = result.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      const fallacies = JSON.parse(cleanResponse);
      
      if (!Array.isArray(fallacies)) {
        throw new Error('Expected array of fallacies');
      }
      
      // Validate and enhance each fallacy
      const processedFallacies = fallacies.map(fallacy => {
        // Validate required fields
        if (!fallacy.fallacyType || !fallacy.title || !fallacy.feedback) {
          throw new Error('Missing required fallacy fields');
        }
        
        // Add agent-specific metadata
        return {
          ...fallacy,
          type: 'logical_fallacy',
          agent: this.name,
          agentType: 'fast_response',
          priority: this.calculateFallacyPriority(fallacy),
          timestamp: new Date().toISOString(),
          processingTime: 'fast'
        };
      });
      
      // Calculate overall confidence based on individual fallacies
      const avgConfidence = processedFallacies.length > 0
        ? processedFallacies.reduce((sum, f) => sum + (f.confidence || 0.5), 0) / processedFallacies.length
        : 0.8; // High confidence when no fallacies found
      
      return {
        insights: processedFallacies,
        confidence: avgConfidence,
        summary: this.generateSummary(processedFallacies),
        quickScan: true,
        recommendEscalation: this.shouldRecommendEscalation(processedFallacies)
      };
      
    } catch (parseError) {
      console.warn('Failed to parse fallacy detection response:', parseError);
      
      // Fallback: try to extract insights from raw text
      const fallbackInsights = this.extractFallbackInsights(result, context.content);
      
      return {
        insights: fallbackInsights,
        confidence: 0.3, // Low confidence for fallback parsing
        summary: 'Analysis completed with limited parsing',
        quickScan: true,
        recommendEscalation: true
      };
    }
  }
  
  /**
   * Quick pre-screening for potential fallacies using pattern matching
   */
  quickFallacyScreen(content) {
    const potentialFallacies = [];
    const lowerContent = content.toLowerCase();
    
    // Check for trigger words and patterns
    for (const [fallacyType, config] of Object.entries(this.fallacyPatterns)) {
      let score = 0;
      
      // Check keywords
      for (const keyword of config.keywords) {
        if (lowerContent.includes(keyword)) {
          score += 0.3;
        }
      }
      
      // Check regex patterns
      for (const pattern of config.patterns) {
        if (pattern.test(content)) {
          score += 0.5;
        }
      }
      
      if (score >= 0.5) {
        potentialFallacies.push(fallacyType.replace('_', ' '));
      }
    }
    
    return potentialFallacies;
  }
  
  /**
   * Calculate priority for a detected fallacy
   */
  calculateFallacyPriority(fallacy) {
    const highPriorityFallacies = ['ad_hominem', 'straw_man', 'false_dichotomy'];
    const mediumPriorityFallacies = ['slippery_slope', 'circular_reasoning'];
    
    if (highPriorityFallacies.includes(fallacy.fallacyType)) {
      return 'high';
    } else if (mediumPriorityFallacies.includes(fallacy.fallacyType)) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Generate summary of fallacy detection results
   */
  generateSummary(fallacies) {
    if (fallacies.length === 0) {
      return 'No logical fallacies detected. Arguments appear to follow sound reasoning patterns.';
    }
    
    const fallacyTypes = [...new Set(fallacies.map(f => f.fallacyType))];
    const highPriorityCount = fallacies.filter(f => f.priority === 'high').length;
    
    let summary = `Found ${fallacies.length} logical fallacy/fallacies: ${fallacyTypes.join(', ')}.`;
    
    if (highPriorityCount > 0) {
      summary += ` ${highPriorityCount} require immediate attention.`;
    }
    
    return summary;
  }
  
  /**
   * Determine if escalation to a more powerful model is recommended
   */
  shouldRecommendEscalation(fallacies) {
    // Recommend escalation for complex reasoning patterns
    const complexFallacies = ['circular_reasoning', 'false_cause', 'composition'];
    const hasComplexFallacies = fallacies.some(f => complexFallacies.includes(f.fallacyType));
    
    // Or if confidence is consistently low
    const avgConfidence = fallacies.length > 0
      ? fallacies.reduce((sum, f) => sum + f.confidence, 0) / fallacies.length
      : 0.8;
    
    return hasComplexFallacies || avgConfidence < 0.6;
  }
  
  /**
   * Extract fallback insights when JSON parsing fails
   */
  extractFallbackInsights(rawResult, content) {
    const insights = [];
    
    // Look for common fallacy mentions in the response
    const fallacyTypes = [
      'ad hominem', 'straw man', 'false dichotomy', 'slippery slope',
      'appeal to authority', 'circular reasoning', 'hasty generalization'
    ];
    
    for (const fallacyType of fallacyTypes) {
      if (rawResult.toLowerCase().includes(fallacyType)) {
        insights.push({
          type: 'logical_fallacy',
          fallacyType: fallacyType.replace(' ', '_'),
          severity: 'medium',
          confidence: 0.4,
          title: `Possible ${fallacyType}`,
          feedback: `The analysis suggests a possible ${fallacyType} in the text.`,
          suggestion: `Review the reasoning for ${fallacyType} patterns.`,
          textSnippets: [content.substring(0, 100) + '...'],
          agent: this.name,
          agentType: 'fast_response',
          priority: 'medium',
          timestamp: new Date().toISOString(),
          fallbackParsing: true
        });
      }
    }
    
    return insights;
  }
  
  /**
   * Quick batch analysis for multiple text segments
   */
  async batchAnalyze(textSegments, options = {}) {
    const results = await Promise.all(
      textSegments.map(async (segment, index) => {
        try {
          const result = await this.analyze(segment, {
            ...options,
            urgency: 'realtime', // Force fast processing
            taskComplexity: 'low'
          });
          
          return { index, result, success: true };
        } catch (error) {
          return { index, error: error.message, success: false };
        }
      })
    );
    
    return results;
  }
  
  /**
   * Get agent-specific performance metrics
   */
  getExtendedMetrics() {
    const baseMetrics = this.getPerformanceMetrics();
    
    // Calculate fallacy-specific statistics
    const fallacyStats = {};
    this.stats.confidenceScores.forEach((score, index) => {
      // This would be enhanced with actual fallacy tracking in a real implementation
      fallacyStats.avgDetectionConfidence = score;
    });
    
    return {
      ...baseMetrics,
      specialization: {
        fallacyDetectionRate: this.stats.successfulCalls / Math.max(this.stats.totalCalls, 1),
        avgFallaciesPerText: 2.3, // Would be calculated from actual data
        mostCommonFallacies: ['ad_hominem', 'straw_man', 'false_dichotomy'],
        quickScreenAccuracy: 0.85 // Would be calculated from validation data
      }
    };
  }
}

export default LogicalFallacyDetector;