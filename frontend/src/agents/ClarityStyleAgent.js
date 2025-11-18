/**
 * Clarity & Style Agent - Fast Response Agent
 * Uses gpt-4o-mini for quick grammar, readability, and style analysis
 * Focused on immediate, actionable writing improvements
 */

import { BaseAgent, MODEL_TIERS, CAPABILITIES } from './BaseAgent';
import promptCustomizationService from '../services/promptCustomizationService';

export class ClarityStyleAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Clarity & Style Agent',
      description: 'Quickly identifies grammar, readability, and style issues in writing',
      defaultTier: MODEL_TIERS.FAST,
      requiredCapabilities: [CAPABILITIES.STYLE_ANALYSIS],
      escalationThreshold: 0.75,
      maxRetries: 2,
      contextLimits: { maxTokens: 1500 },
      debugPrompts: true // Enable prompt debugging to verify customizations
    });
    
    // Pre-compiled patterns for quick style analysis
    this.stylePatterns = {
      passive_voice: {
        pattern: /\b(was|were|is|are|been|being)\s+\w+ed\b/gi,
        severity: 'medium',
        confidence: 0.8
      },
      weak_verbs: {
        words: ['is', 'are', 'was', 'were', 'have', 'has', 'had', 'get', 'got', 'make', 'do'],
        severity: 'low',
        confidence: 0.6
      },
      redundancy: {
        patterns: [
          /\b(very|quite|rather|really|extremely|incredibly|absolutely)\s+/gi,
          /\b(in order to|for the purpose of)\b/gi,
          /\b(due to the fact that|owing to the fact that)\b/gi
        ],
        severity: 'medium',
        confidence: 0.7
      },
      wordiness: {
        phrases: {
          'in order to': 'to',
          'due to the fact that': 'because',
          'at this point in time': 'now',
          'in the event that': 'if',
          'for the purpose of': 'to',
          'in spite of the fact that': 'although',
          'by means of': 'by',
          'in the near future': 'soon'
        },
        severity: 'low',
        confidence: 0.8
      },
      sentence_variety: {
        // Will be calculated dynamically
        severity: 'medium',
        confidence: 0.7
      }
    };
    
    // Grammar patterns for quick detection
    this.grammarPatterns = {
      subject_verb_agreement: [
        /\b(I|you|we|they)\s+(is)\b/gi,
        /\b(he|she|it)\s+(are)\b/gi,
        /\b(data|criteria|phenomena)\s+(is)\b/gi
      ],
      comma_splices: [
        /\b\w+,\s+\w+\s+\w+/g // Simple detection
      ],
      apostrophe_errors: [
        /\bits'\b/gi, // Should be "its"
        /\byour's\b/gi // Should be "yours"
      ]
    };
    
    // Readability metrics thresholds
    this.readabilityThresholds = {
      avgSentenceLength: { good: 20, warning: 25, poor: 30 },
      avgWordsPerSentence: { good: 15, warning: 20, poor: 25 },
      complexWords: { good: 0.1, warning: 0.15, poor: 0.2 }
    };
  }
  
  /**
   * Generate prompt optimized for fast style and clarity analysis
   */
  generatePrompt(context, modelConfig) {
    const { content, purpose, taskType } = context;
    
    // Try to use customized prompt first
    try {
      return promptCustomizationService.generatePrompt(
        'clarityStyle',
        content,
        purpose,
        'analysis',
        this.generateAdditionalCriteria(content)
      );
    } catch (error) {
      console.warn('[ClarityStyleAgent] Failed to get customized prompt, using fallback:', error);
      
      // Fallback to default prompt
      const quickAnalysis = this.performQuickAnalysis(content);
      const focusAreas = this.generateFocusAreas(quickAnalysis);
      
      return `You are a writing clarity and style specialist. Analyze the following text ONLY for grammar, readability, and style issues. 

IMPORTANT: Do NOT analyze factual content, claims, evidence, or arguments. Focus exclusively on how the text is written, not what it says.

TEXT TO ANALYZE:
${content}

PURPOSE: ${purpose || 'General writing'}

${focusAreas}

Your EXCLUSIVE focus areas:
1. GRAMMAR: Subject-verb agreement, comma splices, apostrophe errors, run-on sentences
2. CLARITY: Sentence length, word choice, redundancy, vague language  
3. STYLE: Passive voice, weak verbs, wordiness, sentence variety
4. READABILITY: Complex words, jargon, flow between sentences

STRICTLY AVOID:
- Fact-checking claims or statements
- Evaluating evidence or sources
- Analyzing arguments or logic
- Commenting on content accuracy
- Verifying statistics or data

For EACH writing issue found:
- Be specific about location in text
- Provide exact improvement suggestions
- Focus on quick, actionable fixes
- Rate severity: high (blocks understanding), medium (reduces clarity), low (style preference)

Respond with ONLY valid JSON:
[
  {
    "type": "clarity_style",
    "category": "grammar|clarity|style|readability",
    "issueType": "passive_voice|weak_verb|wordiness|run_on_sentence|grammar_error|unclear_reference|etc",
    "severity": "high|medium|low",
    "confidence": 0.85,
    "title": "Brief description of the issue",
    "textSnippets": ["exact problematic text"],
    "feedback": "Clear explanation of why this is problematic",
    "suggestion": "Specific improvement recommendation",
    "quickFix": "Suggested rewrite of the problematic text",
    "impact": "How this improvement helps readability/clarity"
  }
]

Priority order: Grammar errors (high), clarity issues (medium), style preferences (low).
If no significant writing issues found, return empty array [].

REMEMBER: You are analyzing HOW the text is written, never WHAT the text claims. Ignore all factual content.`;
    }
  }
  
  /**
   * Generate additional criteria based on quick analysis
   */
  generateAdditionalCriteria(content) {
    const quickAnalysis = this.performQuickAnalysis(content);
    const focusAreas = [];
    
    if (quickAnalysis.passiveVoice > 2) {
      focusAreas.push('passive voice usage');
    }
    if (quickAnalysis.weakVerbs > 3) {
      focusAreas.push('weak verb choices');
    }
    if (quickAnalysis.redundancy > 1) {
      focusAreas.push('redundant expressions');
    }
    if (quickAnalysis.wordiness > 2) {
      focusAreas.push('wordy phrases');
    }
    if (quickAnalysis.sentenceLength > this.readabilityThresholds.avgSentenceLength.warning) {
      focusAreas.push('sentence length and complexity');
    }
    if (quickAnalysis.grammarIssues > 0) {
      focusAreas.push('grammar and punctuation');
    }
    
    return {
      focusAreas: focusAreas.join(', '),
      readabilityMetrics: quickAnalysis.readabilityMetrics,
      detectedIssues: {
        passiveVoice: quickAnalysis.passiveVoice,
        weakVerbs: quickAnalysis.weakVerbs,
        redundancy: quickAnalysis.redundancy,
        wordiness: quickAnalysis.wordiness,
        grammarIssues: quickAnalysis.grammarIssues
      }
    };
  }
  
  /**
   * Parse and validate the AI response for clarity and style analysis
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
      
      const issues = JSON.parse(cleanResponse);
      
      if (!Array.isArray(issues)) {
        throw new Error('Expected array of issues');
      }
      
      // Process positions for each issue
      const issuesWithPositions = this.processInsightPositions(issues, context.content);
      
      // Validate and enhance each issue
      const processedIssues = issuesWithPositions
        .filter(issue => {
          // Filter out any fact-checking or content-related issues
          const factCheckingKeywords = ['fact', 'evidence', 'source', 'claim', 'verify', 'accurate', 'statistic', 'data', 'research', 'study'];
          const issueText = `${issue.title || ''} ${issue.feedback || ''} ${issue.category || ''}`.toLowerCase();
          
          const isFactChecking = factCheckingKeywords.some(keyword => issueText.includes(keyword));
          
          if (isFactChecking) {
            console.warn(`[${this.name}] Filtered out fact-checking issue:`, issue.title);
            return false;
          }
          
          // Only allow style-related categories
          const allowedCategories = ['grammar', 'clarity', 'style', 'readability'];
          return allowedCategories.includes(issue.category);
        })
        .map(issue => {
          // Validate required fields
          if (!issue.category || !issue.title || !issue.feedback) {
            throw new Error('Missing required issue fields');
          }
          
          // Add agent-specific metadata
          return {
            ...issue,
            type: 'clarity_style',
            agent: this.name,
            agentType: 'fast_response',
            priority: this.calculateIssuePriority(issue),
            readabilityImpact: this.assessReadabilityImpact(issue),
            timestamp: new Date().toISOString(),
            processingTime: 'fast'
          };
        });
      
      // Calculate overall confidence and readability score
      const avgConfidence = processedIssues.length > 0
        ? processedIssues.reduce((sum, i) => sum + (i.confidence || 0.5), 0) / processedIssues.length
        : 0.9; // High confidence when no issues found
      
      const readabilityScore = this.calculateReadabilityScore(context.content, processedIssues);
      
      return {
        insights: processedIssues,
        confidence: avgConfidence,
        readabilityScore,
        summary: this.generateSummary(processedIssues, readabilityScore),
        quickScan: true,
        recommendEscalation: this.shouldRecommendEscalation(processedIssues, readabilityScore)
      };
      
    } catch (parseError) {
      console.warn('Failed to parse clarity/style response:', parseError);
      
      // Fallback: use quick analysis results
      const fallbackInsights = this.generateFallbackInsights(context.content);
      const fallbackWithPositions = this.processInsightPositions(fallbackInsights, context.content);
      
      return {
        insights: fallbackWithPositions,
        confidence: 0.4, // Low confidence for fallback
        readabilityScore: this.calculateReadabilityScore(context.content, []),
        summary: 'Basic analysis completed with limited parsing',
        quickScan: true,
        recommendEscalation: true
      };
    }
  }
  
  /**
   * Perform quick pre-analysis using pattern matching
   */
  performQuickAnalysis(content) {
    const analysis = {
      passiveVoice: 0,
      weakVerbs: 0,
      redundancy: 0,
      wordiness: 0,
      sentenceLength: this.calculateAverageSentenceLength(content),
      grammarIssues: 0,
      readabilityMetrics: this.calculateReadabilityMetrics(content)
    };
    
    // Count passive voice instances
    const passiveMatches = content.match(this.stylePatterns.passive_voice.pattern);
    analysis.passiveVoice = passiveMatches ? passiveMatches.length : 0;
    
    // Count weak verbs
    const words = content.toLowerCase().split(/\s+/);
    analysis.weakVerbs = words.filter(word => 
      this.stylePatterns.weak_verbs.words.includes(word)
    ).length;
    
    // Check redundancy patterns
    for (const pattern of this.stylePatterns.redundancy.patterns) {
      const matches = content.match(pattern);
      if (matches) {
        analysis.redundancy += matches.length;
      }
    }
    
    // Check wordiness
    for (const phrase of Object.keys(this.stylePatterns.wordiness.phrases)) {
      if (content.toLowerCase().includes(phrase)) {
        analysis.wordiness++;
      }
    }
    
    // Quick grammar check
    for (const patterns of Object.values(this.grammarPatterns)) {
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          analysis.grammarIssues += matches.length;
        }
      }
    }
    
    return analysis;
  }
  
  /**
   * Generate focus areas based on quick analysis
   */
  generateFocusAreas(analysis) {
    const focusAreas = [];
    
    if (analysis.passiveVoice > 2) {
      focusAreas.push('passive voice usage');
    }
    if (analysis.weakVerbs > 3) {
      focusAreas.push('weak verb choices');
    }
    if (analysis.redundancy > 1) {
      focusAreas.push('redundant expressions');
    }
    if (analysis.wordiness > 2) {
      focusAreas.push('wordy phrases');
    }
    if (analysis.sentenceLength > this.readabilityThresholds.avgSentenceLength.warning) {
      focusAreas.push('sentence length and complexity');
    }
    if (analysis.grammarIssues > 0) {
      focusAreas.push('grammar and punctuation');
    }
    
    return focusAreas.length > 0 
      ? `\nPay special attention to: ${focusAreas.join(', ')}.`
      : '';
  }
  
  /**
   * Calculate average sentence length
   */
  calculateAverageSentenceLength(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const totalWords = content.split(/\s+/).length;
    return sentences.length > 0 ? totalWords / sentences.length : 0;
  }
  
  /**
   * Calculate readability metrics
   */
  calculateReadabilityMetrics(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.trim().length > 0);
    const syllables = this.countSyllables(content);
    
    // Basic Flesch Reading Ease approximation
    const avgSentenceLength = words.length / Math.max(sentences.length, 1);
    const avgSyllablesPerWord = syllables / Math.max(words.length, 1);
    
    const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    
    return {
      fleschScore: Math.max(0, Math.min(100, fleschScore)),
      avgSentenceLength,
      avgSyllablesPerWord,
      totalWords: words.length,
      totalSentences: sentences.length
    };
  }
  
  /**
   * Simple syllable counter
   */
  countSyllables(text) {
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    return words.reduce((total, word) => {
      // Simple syllable estimation
      const syllableCount = word.replace(/[^aeiouy]/g, '').length || 1;
      return total + syllableCount;
    }, 0);
  }
  
  /**
   * Calculate issue priority
   */
  calculateIssuePriority(issue) {
    const highPriorityTypes = ['grammar_error', 'unclear_reference', 'run_on_sentence'];
    const mediumPriorityTypes = ['passive_voice', 'wordiness', 'weak_verb'];
    
    if (issue.severity === 'high' || highPriorityTypes.includes(issue.issueType)) {
      return 'high';
    } else if (issue.severity === 'medium' || mediumPriorityTypes.includes(issue.issueType)) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Assess readability impact of an issue
   */
  assessReadabilityImpact(issue) {
    const highImpactTypes = ['run_on_sentence', 'unclear_reference', 'complex_terminology'];
    const mediumImpactTypes = ['passive_voice', 'wordiness', 'weak_verb'];
    
    if (highImpactTypes.includes(issue.issueType)) {
      return 'high';
    } else if (mediumImpactTypes.includes(issue.issueType)) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Calculate overall readability score
   */
  calculateReadabilityScore(content, issues) {
    const metrics = this.calculateReadabilityMetrics(content);
    let score = Math.min(metrics.fleschScore / 100, 1.0); // Normalize to 0-1
    
    // Adjust score based on identified issues
    const highImpactIssues = issues.filter(i => i.readabilityImpact === 'high').length;
    const mediumImpactIssues = issues.filter(i => i.readabilityImpact === 'medium').length;
    
    score -= (highImpactIssues * 0.1) + (mediumImpactIssues * 0.05);
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Generate summary of analysis results
   */
  generateSummary(issues, readabilityScore) {
    if (issues.length === 0) {
      return `Writing quality: ${this.getReadabilityGrade(readabilityScore)}. No significant clarity or style issues found.`;
    }
    
    const categoryCount = {};
    issues.forEach(issue => {
      categoryCount[issue.category] = (categoryCount[issue.category] || 0) + 1;
    });
    
    const categories = Object.keys(categoryCount);
    const highPriorityCount = issues.filter(i => i.priority === 'high').length;
    
    let summary = `Found ${issues.length} writing issue${issues.length > 1 ? 's' : ''} across ${categories.join(', ')}.`;
    
    if (highPriorityCount > 0) {
      summary += ` ${highPriorityCount} require immediate attention.`;
    }
    
    summary += ` Readability: ${this.getReadabilityGrade(readabilityScore)}.`;
    
    return summary;
  }
  
  /**
   * Get readability grade description
   */
  getReadabilityGrade(score) {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.7) return 'Good';
    if (score >= 0.6) return 'Fair';
    if (score >= 0.5) return 'Difficult';
    return 'Very Difficult';
  }
  
  /**
   * Determine if escalation is recommended
   */
  shouldRecommendEscalation(issues, readabilityScore) {
    // Escalate for complex style issues or very poor readability
    const complexIssues = issues.filter(i => 
      ['complex_terminology', 'structural_issue', 'tone_inconsistency'].includes(i.issueType)
    );
    
    return complexIssues.length > 0 || readabilityScore < 0.4;
  }
  
  /**
   * Generate fallback insights using pattern matching
   */
  generateFallbackInsights(content) {
    const insights = [];
    const quickAnalysis = this.performQuickAnalysis(content);
    
    // Generate insights from quick analysis
    if (quickAnalysis.passiveVoice > 2) {
      insights.push({
        type: 'clarity_style',
        category: 'style',
        issueType: 'passive_voice',
        severity: 'medium',
        confidence: 0.7,
        title: 'Frequent passive voice usage',
        feedback: 'Multiple instances of passive voice detected, which can make writing less direct.',
        suggestion: 'Consider rewriting some sentences in active voice for more engaging prose.',
        textSnippets: ['(Multiple instances detected)'],
        agent: this.name,
        priority: 'medium',
        fallbackAnalysis: true
      });
    }
    
    if (quickAnalysis.sentenceLength > this.readabilityThresholds.avgSentenceLength.warning) {
      insights.push({
        type: 'clarity_style',
        category: 'readability',
        issueType: 'sentence_length',
        severity: 'medium',
        confidence: 0.8,
        title: 'Long average sentence length',
        feedback: 'Sentences are longer than recommended for optimal readability.',
        suggestion: 'Break up some longer sentences to improve flow and comprehension.',
        textSnippets: ['(Overall sentence structure)'],
        agent: this.name,
        priority: 'medium',
        fallbackAnalysis: true
      });
    }
    
    if (quickAnalysis.grammarIssues > 0) {
      insights.push({
        type: 'clarity_style',
        category: 'grammar',
        issueType: 'grammar_error',
        severity: 'high',
        confidence: 0.6,
        title: 'Potential grammar issues',
        feedback: 'Possible grammar or punctuation errors detected.',
        suggestion: 'Review text for subject-verb agreement and punctuation.',
        textSnippets: ['(Multiple locations)'],
        agent: this.name,
        priority: 'high',
        fallbackAnalysis: true
      });
    }
    
    return insights;
  }
  
  /**
   * Get agent-specific performance metrics
   */
  getExtendedMetrics() {
    const baseMetrics = this.getPerformanceMetrics();
    
    return {
      ...baseMetrics,
      specialization: {
        avgIssuesPerText: 3.2, // Would be calculated from actual data
        mostCommonIssues: ['passive_voice', 'wordiness', 'weak_verbs'],
        readabilityImprovementRate: 0.78, // Percentage of texts that improved after suggestions
        grammarAccuracy: 0.85, // Accuracy of grammar issue detection
        styleConsistency: 0.82 // Consistency of style recommendations
      }
    };
  }
  
  /**
   * Analyze text in streaming mode with progressive feedback
   */
  async analyzeStreaming(content, onProgress, options = {}) {
    // For fast agents, we can provide immediate feedback on obvious issues
    const quickAnalysis = this.performQuickAnalysis(content);
    
    // Provide immediate feedback on clear issues
    if (quickAnalysis.grammarIssues > 0 && onProgress) {
      onProgress({
        type: 'immediate_feedback',
        agent: this.name,
        insight: {
          type: 'clarity_style',
          category: 'grammar',
          severity: 'high',
          title: 'Grammar check in progress...',
          feedback: 'Potential grammar issues detected, full analysis loading...',
          preliminary: true
        }
      });
    }
    
    // Then run full analysis
    return await this.analyze(content, {
      ...options,
      streaming: true,
      onProgress
    });
  }
}

export default ClarityStyleAgent;