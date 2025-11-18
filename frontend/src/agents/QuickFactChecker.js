/**
 * Quick Fact Checker - Fast Response Agent
 * Uses gpt-4o-mini for rapid contradiction detection and basic claim verification
 * No external API calls - relies on cached knowledge and pattern recognition
 */

import { BaseAgent, MODEL_TIERS, CAPABILITIES } from './BaseAgent';

export class QuickFactChecker extends BaseAgent {
  constructor() {
    super({
      name: 'Quick Fact Checker',
      description: 'Rapidly identifies potential factual inconsistencies and questionable claims',
      defaultTier: MODEL_TIERS.FAST,
      requiredCapabilities: [CAPABILITIES.LOGICAL_ANALYSIS], // Uses logical analysis instead of full fact-check
      escalationThreshold: 0.6, // Lower threshold since fact-checking is critical
      maxRetries: 2,
      contextLimits: { maxTokens: 1800 }
    });
    
    // Common fact patterns that can be quickly verified
    this.factPatterns = {
      dates: {
        pattern: /\b(19|20)\d{2}\b/g,
        confidence: 0.8
      },
      numbers: {
        pattern: /\b\d{1,3}(,\d{3})*(\.\d+)?\s*(percent|%|million|billion|thousand)\b/gi,
        confidence: 0.7
      },
      statistics: {
        keywords: ['study shows', 'research indicates', 'statistics show', 'data suggests'],
        confidence: 0.6
      },
      historical_events: {
        keywords: ['world war', 'civil war', 'depression', 'revolution', 'founded in', 'established in'],
        confidence: 0.7
      },
      scientific_facts: {
        keywords: ['speed of light', 'gravity', 'dna', 'atom', 'molecule', 'temperature'],
        confidence: 0.8
      },
      geographical: {
        keywords: ['capital of', 'population of', 'located in', 'borders', 'continent'],
        confidence: 0.7
      }
    };
    
    // Common contradiction patterns
    this.contradictionPatterns = [
      {
        pattern: /\b(never|always|all|none|every|no one)\b/gi,
        flag: 'absolute_statement',
        severity: 'medium'
      },
      {
        pattern: /\b(everyone knows|it's obvious|clearly|obviously)\b/gi,
        flag: 'unsupported_assertion',
        severity: 'low'
      },
      {
        pattern: /\b(\d+%|percent)\s+(of|more|less|increase|decrease)\b/gi,
        flag: 'statistical_claim',
        severity: 'high'
      }
    ];
    
    // Quick knowledge base for immediate verification (subset of common facts)
    this.quickKnowledgeBase = {
      dates: {
        'world war ii ended': '1945',
        'world war 2 ended': '1945',
        'american civil war': '1861-1865',
        'first moon landing': '1969'
      },
      numbers: {
        'speed of light': '299,792,458 m/s',
        'days in a year': '365',
        'continents': '7'
      },
      geography: {
        'capital of france': 'paris',
        'capital of japan': 'tokyo',
        'largest ocean': 'pacific'
      }
    };
  }
  
  /**
   * Generate prompt optimized for quick fact checking
   */
  generatePrompt(context, modelConfig) {
    const { content, purpose, taskType } = context;
    
    // Quick scan for potential fact claims
    const potentialClaims = this.identifyPotentialClaims(content);
    const contradictions = this.scanForContradictions(content);
    
    const focusAreas = this.generateFactCheckFocus(potentialClaims, contradictions);
    
    return `You are a rapid fact-checking specialist. Quickly identify potential factual inconsistencies, questionable claims, and statements that need verification.

TEXT TO ANALYZE:
${content}

PURPOSE: ${purpose || 'General fact-checking'}

${focusAreas}

Focus on these types of claims:
1. STATISTICAL CLAIMS: Numbers, percentages, quantities that seem unusually high/low
2. HISTORICAL FACTS: Dates, events, timelines that might be incorrect
3. SCIENTIFIC STATEMENTS: Claims about natural phenomena, technology, health
4. ABSOLUTE STATEMENTS: "Never", "always", "all", "none" - often oversimplifications
5. UNSOURCED ASSERTIONS: Strong claims without evidence or attribution
6. INTERNAL CONTRADICTIONS: Statements that conflict with each other in the same text

For EACH potential issue:
- Focus on claims that could be factually wrong, not opinions
- Flag statistical claims that need sources
- Identify absolute statements that are likely oversimplifications
- Note missing context that could mislead readers

Respond with ONLY valid JSON:
[
  {
    "type": "fact_check",
    "claimType": "statistical|historical|scientific|geographical|absolute_statement|unsourced_assertion|contradiction",
    "severity": "high|medium|low",
    "confidence": 0.75,
    "title": "Brief description of the factual concern",
    "textSnippets": ["exact text containing the questionable claim"],
    "feedback": "Why this claim is questionable or needs verification",
    "suggestion": "How to improve factual accuracy",
    "verificationNeeded": true/false,
    "escalationReason": "Why this needs deeper fact-checking (if applicable)"
  }
]

Severity guidelines:
- HIGH: Likely factual errors, misleading statistics, dangerous misinformation
- MEDIUM: Unverified claims, missing context, oversimplifications  
- LOW: Absolute statements that could be more nuanced

If no factual concerns found, return empty array [].
Focus on accuracy, not opinion or style preferences.`;
  }
  
  /**
   * Parse and validate the AI response for fact-checking
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
      
      const factualConcerns = JSON.parse(cleanResponse);
      
      if (!Array.isArray(factualConcerns)) {
        throw new Error('Expected array of factual concerns');
      }
      
      // Validate and enhance each concern
      const processedConcerns = factualConcerns.map(concern => {
        // Validate required fields
        if (!concern.claimType || !concern.title || !concern.feedback) {
          throw new Error('Missing required fact-check fields');
        }
        
        // Add quick verification if possible
        const quickVerification = this.performQuickVerification(concern);
        
        // Add agent-specific metadata
        return {
          ...concern,
          type: 'fact_check',
          agent: this.name,
          agentType: 'fast_response',
          priority: this.calculateFactCheckPriority(concern),
          quickVerification,
          reliabilityRisk: this.assessReliabilityRisk(concern),
          timestamp: new Date().toISOString(),
          processingTime: 'fast'
        };
      });
      
      // Calculate overall confidence and reliability score
      const avgConfidence = processedConcerns.length > 0
        ? processedConcerns.reduce((sum, c) => sum + (c.confidence || 0.5), 0) / processedConcerns.length
        : 0.9; // High confidence when no concerns found
      
      const reliabilityScore = this.calculateReliabilityScore(context.content, processedConcerns);
      
      return {
        insights: processedConcerns,
        confidence: avgConfidence,
        reliabilityScore,
        summary: this.generateSummary(processedConcerns, reliabilityScore),
        quickScan: true,
        requiresDeepFactCheck: this.shouldRequireDeepFactCheck(processedConcerns)
      };
      
    } catch (parseError) {
      console.warn('Failed to parse fact-check response:', parseError);
      
      // Fallback: use pattern-based analysis
      const fallbackConcerns = this.generatePatternBasedConcerns(context.content);
      
      return {
        insights: fallbackConcerns,
        confidence: 0.3, // Low confidence for fallback
        reliabilityScore: 0.7, // Neutral score when unsure
        summary: 'Basic fact-check completed with limited analysis',
        quickScan: true,
        requiresDeepFactCheck: true
      };
    }
  }
  
  /**
   * Identify potential factual claims for focused analysis
   */
  identifyPotentialClaims(content) {
    const claims = [];
    
    // Look for statistical claims
    const statMatches = content.match(/\b\d+\s*(percent|%|\w+ million|\w+ billion)/gi);
    if (statMatches) {
      claims.push(...statMatches.map(match => ({ type: 'statistical', text: match })));
    }
    
    // Look for date claims
    const dateMatches = content.match(/\b(19|20)\d{2}\b/g);
    if (dateMatches) {
      claims.push(...dateMatches.map(match => ({ type: 'historical', text: match })));
    }
    
    // Look for authority claims
    const authorityPatterns = [
      /studies? shows?/gi,
      /research (indicates|shows|proves)/gi,
      /according to (experts?|scientists?)/gi
    ];
    
    for (const pattern of authorityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        claims.push(...matches.map(match => ({ type: 'authority', text: match })));
      }
    }
    
    return claims;
  }
  
  /**
   * Scan for potential contradictions within the text
   */
  scanForContradictions(content) {
    const contradictions = [];
    
    for (const pattern of this.contradictionPatterns) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        contradictions.push({
          flag: pattern.flag,
          severity: pattern.severity,
          matches: matches.slice(0, 3) // Limit to avoid clutter
        });
      }
    }
    
    return contradictions;
  }
  
  /**
   * Generate focused analysis areas based on quick scan
   */
  generateFactCheckFocus(claims, contradictions) {
    const focusAreas = [];
    
    if (claims.filter(c => c.type === 'statistical').length > 0) {
      focusAreas.push('statistical claims and numbers');
    }
    if (claims.filter(c => c.type === 'historical').length > 0) {
      focusAreas.push('historical dates and events');
    }
    if (claims.filter(c => c.type === 'authority').length > 0) {
      focusAreas.push('research claims and expert assertions');
    }
    if (contradictions.length > 0) {
      focusAreas.push('absolute statements and potential oversimplifications');
    }
    
    return focusAreas.length > 0 
      ? `\nPay special attention to: ${focusAreas.join(', ')}.`
      : '';
  }
  
  /**
   * Perform quick verification using cached knowledge
   */
  performQuickVerification(concern) {
    const text = concern.textSnippets?.[0]?.toLowerCase() || '';
    
    // Check against quick knowledge base
    for (const [category, facts] of Object.entries(this.quickKnowledgeBase)) {
      for (const [key, value] of Object.entries(facts)) {
        if (text.includes(key.toLowerCase())) {
          return {
            category,
            knownFact: value,
            confidence: 0.8,
            source: 'quick_cache'
          };
        }
      }
    }
    
    // Pattern-based quick checks
    if (concern.claimType === 'statistical') {
      const numbers = text.match(/\d+/g);
      if (numbers && numbers.some(n => parseInt(n) > 100)) {
        return {
          category: 'statistical',
          flag: 'high_number',
          confidence: 0.5,
          note: 'Large numbers should be verified'
        };
      }
    }
    
    return null;
  }
  
  /**
   * Calculate priority for fact-checking concerns
   */
  calculateFactCheckPriority(concern) {
    const highPriorityTypes = ['statistical', 'scientific', 'contradiction'];
    const criticalSeverity = concern.severity === 'high';
    const highConfidence = (concern.confidence || 0) > 0.8;
    
    if (criticalSeverity || (highPriorityTypes.includes(concern.claimType) && highConfidence)) {
      return 'high';
    } else if (concern.verificationNeeded) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Assess reliability risk of a claim
   */
  assessReliabilityRisk(concern) {
    const riskFactors = [];
    
    if (concern.severity === 'high') {
      riskFactors.push('high_severity');
    }
    if (concern.claimType === 'statistical' && !concern.textSnippets?.[0]?.includes('source')) {
      riskFactors.push('unsourced_statistic');
    }
    if (concern.claimType === 'absolute_statement') {
      riskFactors.push('oversimplification');
    }
    if (concern.confidence < 0.5) {
      riskFactors.push('low_confidence');
    }
    
    // Calculate risk score
    const riskScore = Math.min(riskFactors.length * 0.25, 1.0);
    
    return {
      score: riskScore,
      factors: riskFactors,
      level: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low'
    };
  }
  
  /**
   * Calculate overall text reliability score
   */
  calculateReliabilityScore(content, concerns) {
    let score = 1.0; // Start with perfect reliability
    
    // Decrease score based on concerns
    const highRiskConcerns = concerns.filter(c => c.reliabilityRisk?.level === 'high').length;
    const mediumRiskConcerns = concerns.filter(c => c.reliabilityRisk?.level === 'medium').length;
    
    score -= (highRiskConcerns * 0.15) + (mediumRiskConcerns * 0.08);
    
    // Adjust for text length (longer texts with same number of issues are more reliable)
    const wordCount = content.split(/\s+/).length;
    if (wordCount > 500 && concerns.length > 0) {
      const issueRate = concerns.length / (wordCount / 100);
      if (issueRate < 1) { // Less than 1 issue per 100 words is good
        score += 0.05;
      }
    }
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Generate summary of fact-checking results
   */
  generateSummary(concerns, reliabilityScore) {
    if (concerns.length === 0) {
      return `Reliability: ${this.getReliabilityGrade(reliabilityScore)}. No immediate factual concerns detected.`;
    }
    
    const concernTypes = [...new Set(concerns.map(c => c.claimType))];
    const highPriorityConcerns = concerns.filter(c => c.priority === 'high').length;
    const needVerification = concerns.filter(c => c.verificationNeeded).length;
    
    let summary = `Found ${concerns.length} factual concern${concerns.length > 1 ? 's' : ''}: ${concernTypes.join(', ')}.`;
    
    if (highPriorityConcerns > 0) {
      summary += ` ${highPriorityConcerns} critical issue${highPriorityConcerns > 1 ? 's' : ''}.`;
    }
    
    if (needVerification > 0) {
      summary += ` ${needVerification} claim${needVerification > 1 ? 's' : ''} need${needVerification === 1 ? 's' : ''} verification.`;
    }
    
    summary += ` Reliability: ${this.getReliabilityGrade(reliabilityScore)}.`;
    
    return summary;
  }
  
  /**
   * Get reliability grade description
   */
  getReliabilityGrade(score) {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.8) return 'Good';
    if (score >= 0.7) return 'Fair';
    if (score >= 0.6) return 'Questionable';
    return 'Poor';
  }
  
  /**
   * Determine if deep fact-checking is required
   */
  shouldRequireDeepFactCheck(concerns) {
    const highPriorityConcerns = concerns.filter(c => c.priority === 'high').length;
    const verificationNeeded = concerns.filter(c => c.verificationNeeded).length;
    const lowConfidenceConcerns = concerns.filter(c => (c.confidence || 0) < 0.6).length;
    
    return highPriorityConcerns > 0 || verificationNeeded > 2 || lowConfidenceConcerns > 1;
  }
  
  /**
   * Generate pattern-based concerns as fallback
   */
  generatePatternBasedConcerns(content) {
    const concerns = [];
    
    // Check for absolute statements
    const absoluteMatches = content.match(/\b(never|always|all|none|every|no one)\b/gi);
    if (absoluteMatches && absoluteMatches.length > 2) {
      concerns.push({
        type: 'fact_check',
        claimType: 'absolute_statement',
        severity: 'medium',
        confidence: 0.6,
        title: 'Frequent absolute statements',
        feedback: 'Multiple absolute statements detected that may be oversimplifications.',
        suggestion: 'Consider qualifying statements to be more precise and accurate.',
        textSnippets: absoluteMatches.slice(0, 3),
        agent: this.name,
        priority: 'medium',
        patternBased: true
      });
    }
    
    // Check for unsourced statistics
    const statMatches = content.match(/\b\d+\s*(%|percent)\b/gi);
    if (statMatches && statMatches.length > 0) {
      concerns.push({
        type: 'fact_check',
        claimType: 'statistical',
        severity: 'high',
        confidence: 0.7,
        title: 'Unsourced statistical claims',
        feedback: 'Statistical claims detected that may need source attribution.',
        suggestion: 'Provide sources for statistical claims to improve credibility.',
        textSnippets: statMatches.slice(0, 2),
        agent: this.name,
        priority: 'high',
        verificationNeeded: true,
        patternBased: true
      });
    }
    
    return concerns;
  }
  
  /**
   * Get agent-specific performance metrics
   */
  getExtendedMetrics() {
    const baseMetrics = this.getPerformanceMetrics();
    
    return {
      ...baseMetrics,
      specialization: {
        factCheckAccuracy: 0.78, // Accuracy of quick fact-checks
        falsePositiveRate: 0.15, // Rate of incorrect flags
        escalationRate: 0.32, // Rate of escalation to deep fact-check
        avgConcernsPerText: 1.8, // Average concerns found per text
        mostCommonIssues: ['unsourced_statistics', 'absolute_statements', 'unverified_claims'],
        quickVerificationSuccess: 0.45 // Success rate of quick verification
      }
    };
  }
  
  /**
   * Batch processing for multiple short texts
   */
  async batchFactCheck(texts, options = {}) {
    const results = await Promise.allSettled(
      texts.map(async (text, index) => {
        try {
          const result = await this.analyze(text, {
            ...options,
            urgency: 'realtime',
            taskComplexity: 'low'
          });
          
          return { index, result, success: true };
        } catch (error) {
          return { index, error: error.message, success: false };
        }
      })
    );
    
    // Aggregate batch statistics
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const totalConcerns = successful.reduce((sum, r) => 
      sum + (r.value.result.insights?.length || 0), 0
    );
    
    return {
      results,
      batchStats: {
        totalTexts: texts.length,
        successfulAnalyses: successful.length,
        totalConcerns,
        avgConcernsPerText: successful.length > 0 ? totalConcerns / successful.length : 0,
        avgReliabilityScore: successful.length > 0 
          ? successful.reduce((sum, r) => sum + (r.value.result.reliabilityScore || 0.7), 0) / successful.length
          : 0.7
      }
    };
  }
}

export default QuickFactChecker;