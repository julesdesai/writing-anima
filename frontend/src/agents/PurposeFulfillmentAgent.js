/**
 * Purpose Fulfillment Agent - Strategic Writing Agent
 * Uses gpt-4o to evaluate how effectively the writing accomplishes its stated purpose
 * Provides strategic feedback on goal achievement, audience alignment, and messaging effectiveness
 */

import { BaseAgent, MODEL_TIERS, CAPABILITIES } from './BaseAgent';

export class PurposeFulfillmentAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Purpose Fulfillment Agent',
      description: 'Evaluates how effectively writing accomplishes its stated purpose and goals',
      defaultTier: MODEL_TIERS.STANDARD,
      requiredCapabilities: [CAPABILITIES.STRATEGIC_ANALYSIS, CAPABILITIES.AUDIENCE_ANALYSIS],
      escalationThreshold: 0.70, // Strategic analysis requires good confidence
      maxRetries: 2,
      contextLimits: { maxTokens: 2500 }
    });
    
    // Purpose categories and their evaluation criteria
    this.purposeCategories = {
      persuasive: {
        criteria: ['argument_strength', 'audience_targeting', 'call_to_action', 'emotional_appeal', 'credibility'],
        keyQuestions: [
          'Does the writing convince the reader?',
          'Is the call to action clear and compelling?',
          'Are counterarguments addressed?',
          'Does it build trust and credibility?'
        ]
      },
      informative: {
        criteria: ['clarity', 'completeness', 'accuracy', 'organization', 'accessibility'],
        keyQuestions: [
          'Does the writing clearly explain the topic?',
          'Is the information comprehensive enough?',
          'Is it organized logically?',
          'Can the target audience understand it?'
        ]
      },
      analytical: {
        criteria: ['depth_of_analysis', 'evidence_quality', 'logical_structure', 'insights', 'conclusions'],
        keyQuestions: [
          'Does the analysis go beyond surface-level observations?',
          'Are the conclusions well-supported?',
          'Does it provide new insights?',
          'Is the reasoning sound throughout?'
        ]
      },
      narrative: {
        criteria: ['engagement', 'character_development', 'plot_structure', 'theme', 'resolution'],
        keyQuestions: [
          'Does the story engage the reader?',
          'Are characters well-developed?',
          'Is the narrative structure effective?',
          'Does it convey its themes clearly?'
        ]
      },
      instructional: {
        criteria: ['step_clarity', 'completeness', 'logical_sequence', 'usability', 'error_prevention'],
        keyQuestions: [
          'Are the instructions easy to follow?',
          'Are all necessary steps included?',
          'Is the sequence logical?',
          'Can someone actually complete the task?'
        ]
      },
      academic: {
        criteria: ['thesis_clarity', 'argument_development', 'evidence_integration', 'scholarly_rigor', 'originality'],
        keyQuestions: [
          'Is the thesis clearly stated and defended?',
          'Does it meet academic standards?',
          'Is the argument well-developed?',
          'Does it contribute new knowledge?'
        ]
      },
      marketing: {
        criteria: ['audience_alignment', 'value_proposition', 'brand_consistency', 'conversion_potential', 'differentiation'],
        keyQuestions: [
          'Does it resonate with the target audience?',
          'Is the value proposition clear?',
          'Does it drive the desired action?',
          'Does it differentiate from competitors?'
        ]
      },
      creative: {
        criteria: ['originality', 'voice', 'style_consistency', 'emotional_impact', 'artistic_merit'],
        keyQuestions: [
          'Is the writing original and creative?',
          'Does it have a distinctive voice?',
          'Does it evoke the intended emotions?',
          'Is the style appropriate for the purpose?'
        ]
      }
    };

    // Audience types and their characteristics
    this.audienceProfiles = {
      general_public: {
        characteristics: ['varied_backgrounds', 'limited_expertise', 'short_attention_span'],
        requirements: ['clear_language', 'engaging_introduction', 'practical_relevance']
      },
      professionals: {
        characteristics: ['domain_expertise', 'time_constrained', 'results_focused'],
        requirements: ['technical_accuracy', 'actionable_insights', 'executive_summary']
      },
      academics: {
        characteristics: ['deep_expertise', 'critical_thinking', 'evidence_focused'],
        requirements: ['rigorous_methodology', 'comprehensive_citations', 'original_contribution']
      },
      students: {
        characteristics: ['learning_focused', 'varied_skill_levels', 'guidance_seeking'],
        requirements: ['clear_explanations', 'examples', 'progressive_complexity']
      },
      decision_makers: {
        characteristics: ['authority', 'strategic_thinking', 'impact_focused'],
        requirements: ['executive_summary', 'recommendations', 'risk_assessment']
      }
    };

    // Success metrics for different purposes
    this.successMetrics = {
      engagement: ['hook_effectiveness', 'flow_maintenance', 'reader_retention'],
      clarity: ['message_comprehension', 'key_points_identification', 'confusion_elimination'],
      persuasion: ['argument_acceptance', 'action_motivation', 'resistance_reduction'],
      education: ['learning_facilitation', 'concept_mastery', 'application_ability'],
      conversion: ['goal_achievement', 'next_step_clarity', 'objection_handling']
    };
  }
  
  /**
   * Generate prompt optimized for purpose fulfillment analysis
   */
  generatePrompt(context, modelConfig) {
    const { content, purpose, taskType } = context;
    
    // Analyze the stated purpose to determine category and criteria
    const purposeAnalysis = this.analyzePurpose(purpose);
    const audienceInsights = this.inferAudience(content, purpose);
    const strategicContext = this.buildStrategicContext(purposeAnalysis, audienceInsights);
    
    return `You are a strategic writing effectiveness specialist. Evaluate how well the writing accomplishes its stated purpose and provides strategic feedback for improvement.

TEXT TO ANALYZE:
${content}

STATED PURPOSE: ${purpose || 'General writing effectiveness'}

${strategicContext}

Conduct a comprehensive purpose fulfillment analysis across these dimensions:

1. PURPOSE ALIGNMENT:
   - Does the writing directly address its stated purpose?
   - Are all elements working toward the same goal?
   - Is the purpose clearly communicated to the reader?
   - Does the scope match the stated objectives?

2. AUDIENCE EFFECTIVENESS:
   - Is the content appropriate for the intended audience?
   - Does the tone and style match audience expectations?
   - Will the audience understand and connect with the message?
   - Are audience needs and concerns addressed?

3. GOAL ACHIEVEMENT:
   - How likely is the writing to achieve its intended outcome?
   - Are key success factors present and strong?
   - What obstacles might prevent goal achievement?
   - Is the desired reader response clearly guided?

4. STRATEGIC STRUCTURE:
   - Does the organization support the purpose?
   - Are key messages positioned for maximum impact?
   - Is there a clear progression toward the goal?
   - Are transitions and flow supporting the purpose?

5. MESSAGE EFFECTIVENESS:
   - Is the core message clear and memorable?
   - Are supporting points aligned with the main purpose?
   - Is the value proposition evident?
   - Does it differentiate from alternatives?

6. OUTCOME OPTIMIZATION:
   - What specific changes would improve purpose fulfillment?
   - Are there missing elements crucial for success?
   - How could impact be amplified?
   - What are the highest-leverage improvements?

For your analysis, provide strategic feedback on purpose fulfillment:

Respond with ONLY valid JSON:
[
  {
    "type": "purpose_fulfillment",
    "fulfillmentCategory": "alignment|audience|goal_achievement|structure|messaging|optimization",
    "effectivenessScore": 0.75,
    "impactLevel": "high|medium|low",
    "confidence": 0.85,
    "title": "Purpose fulfillment assessment",
    "textSnippets": ["specific text relevant to the assessment"],
    "feedback": "Strategic analysis of how well this aspect serves the purpose",
    "gapAnalysis": "What's missing or could be stronger",
    "strategicRecommendation": "Specific high-impact improvement suggestion",
    "expectedOutcome": "How this improvement would enhance purpose fulfillment",
    "priorityLevel": "critical|important|beneficial",
    "implementationGuidance": "How to implement the recommendation effectively",
    "successIndicators": ["How to measure improvement"]
  }
]

Focus on:
- Strategic, high-level analysis of purpose achievement
- Actionable recommendations that significantly improve effectiveness
- Understanding of audience needs and motivations
- Clear prioritization of improvement opportunities
- Practical implementation guidance

Consider the relationship between purpose, audience, and desired outcomes.
Provide strategic insights that go beyond surface-level observations.

If the writing strongly fulfills its purpose, focus on optimization and enhancement opportunities.
If there are significant gaps, prioritize critical alignment issues first.`;
  }
  
  /**
   * Analyze the stated purpose to determine category and evaluation criteria
   */
  analyzePurpose(purpose) {
    if (!purpose) return { category: 'general', criteria: [], confidence: 0.5 };
    
    const purposeLower = purpose.toLowerCase();
    
    // Purpose detection patterns
    const patterns = {
      persuasive: ['convince', 'persuade', 'argue', 'advocate', 'promote', 'sell', 'influence'],
      informative: ['inform', 'explain', 'describe', 'overview', 'summary', 'educate', 'clarify'],
      analytical: ['analyze', 'examine', 'evaluate', 'assess', 'compare', 'critique', 'investigate'],
      narrative: ['story', 'narrative', 'experience', 'journey', 'tell', 'recount'],
      instructional: ['how to', 'guide', 'tutorial', 'instructions', 'steps', 'process', 'method'],
      academic: ['research', 'thesis', 'study', 'scholarly', 'academic', 'theory', 'hypothesis'],
      marketing: ['marketing', 'campaign', 'brand', 'product', 'service', 'customer', 'sales'],
      creative: ['creative', 'artistic', 'expressive', 'poetry', 'fiction', 'imaginative']
    };
    
    let bestMatch = { category: 'general', score: 0 };
    
    Object.entries(patterns).forEach(([category, keywords]) => {
      const matches = keywords.filter(keyword => purposeLower.includes(keyword)).length;
      const score = matches / keywords.length;
      
      if (score > bestMatch.score) {
        bestMatch = { category, score };
      }
    });
    
    const categoryInfo = this.purposeCategories[bestMatch.category] || {};
    
    return {
      category: bestMatch.category,
      criteria: categoryInfo.criteria || [],
      keyQuestions: categoryInfo.keyQuestions || [],
      confidence: Math.min(bestMatch.score * 2, 0.95) // Scale to reasonable confidence
    };
  }
  
  /**
   * Infer audience characteristics from content and purpose
   */
  inferAudience(content, purpose) {
    const indicators = {
      general_public: ['simple', 'everyday', 'common', 'basic', 'anyone'],
      professionals: ['industry', 'professional', 'business', 'enterprise', 'corporate'],
      academics: ['research', 'study', 'academic', 'scholarly', 'peer', 'journal'],
      students: ['learn', 'student', 'education', 'course', 'class', 'beginner'],
      decision_makers: ['executive', 'manager', 'leader', 'decision', 'strategy', 'policy']
    };
    
    const combinedText = `${purpose} ${content.substring(0, 500)}`.toLowerCase();
    
    let audienceScores = {};
    Object.entries(indicators).forEach(([audience, keywords]) => {
      audienceScores[audience] = keywords.filter(keyword => 
        combinedText.includes(keyword)
      ).length / keywords.length;
    });
    
    // Find the best match
    const bestAudience = Object.entries(audienceScores)
      .sort(([,a], [,b]) => b - a)[0];
    
    return {
      primaryAudience: bestAudience[0],
      confidence: bestAudience[1],
      profile: this.audienceProfiles[bestAudience[0]] || {}
    };
  }
  
  /**
   * Build strategic context for the analysis
   */
  buildStrategicContext(purposeAnalysis, audienceInsights) {
    return `
STRATEGIC CONTEXT:
- Purpose Category: ${purposeAnalysis.category} (confidence: ${Math.round(purposeAnalysis.confidence * 100)}%)
- Key Evaluation Criteria: ${purposeAnalysis.criteria.join(', ')}
- Primary Audience: ${audienceInsights.primaryAudience}
- Audience Requirements: ${audienceInsights.profile.requirements ? audienceInsights.profile.requirements.join(', ') : 'General effectiveness'}

STRATEGIC QUESTIONS TO CONSIDER:
${purposeAnalysis.keyQuestions ? purposeAnalysis.keyQuestions.map(q => `- ${q}`).join('\n') : '- Does the writing achieve its intended impact?'}`;
  }
  
  /**
   * Parse and validate the AI response for purpose fulfillment analysis
   */
  parseResult(result, context) {
    try {
      const parsed = JSON.parse(result);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Response must be a JSON array');
      }
      
      return parsed.map(item => {
        // Add purpose fulfillment specific processing
        return {
          ...item,
          agent: this.name,
          category: 'strategic_analysis',
          timestamp: new Date().toISOString(),
          
          // Add purpose fulfillment metadata
          purposeContext: {
            originalPurpose: context.purpose,
            fulfillmentScore: item.effectivenessScore || 0.5,
            impactLevel: item.impactLevel || 'medium',
            priorityLevel: item.priorityLevel || 'important'
          },
          
          // Strategic analysis specific fields
          strategicValue: this.calculateStrategicValue(item),
          implementationComplexity: this.assessComplexity(item.implementationGuidance),
          
          // Enhanced positioning for strategic feedback
          positions: this.extractPositions(item.textSnippets, context.content)
        };
      }).filter(item => item.confidence >= this.escalationThreshold);
      
    } catch (error) {
      console.error('[PurposeFulfillmentAgent] Failed to parse result:', error);
      
      // Return structured fallback
      return [{
        type: 'purpose_fulfillment',
        agent: this.name,
        title: 'Purpose Analysis Available',
        feedback: 'Purpose fulfillment analysis is available but encountered a parsing issue.',
        suggestion: 'The AI provided feedback on how well your writing achieves its purpose, but the response format needs adjustment.',
        confidence: 0.3,
        severity: 'low',
        timestamp: new Date().toISOString()
      }];
    }
  }
  
  /**
   * Calculate strategic value of a recommendation
   */
  calculateStrategicValue(item) {
    let value = 0.5; // Base value
    
    // High-impact items are more valuable
    if (item.impactLevel === 'high') value += 0.3;
    else if (item.impactLevel === 'low') value -= 0.2;
    
    // Critical priority items are more valuable
    if (item.priorityLevel === 'critical') value += 0.3;
    else if (item.priorityLevel === 'beneficial') value -= 0.1;
    
    // High effectiveness scores indicate good alignment
    if (item.effectivenessScore) {
      value += (item.effectivenessScore - 0.5) * 0.4;
    }
    
    return Math.max(0.1, Math.min(1.0, value));
  }
  
  /**
   * Assess implementation complexity
   */
  assessComplexity(guidance) {
    if (!guidance) return 'medium';
    
    const complexityIndicators = {
      low: ['simple', 'easy', 'quick', 'minor', 'small'],
      high: ['restructure', 'major', 'significant', 'comprehensive', 'overhaul']
    };
    
    const guidanceLower = guidance.toLowerCase();
    
    if (complexityIndicators.low.some(indicator => guidanceLower.includes(indicator))) {
      return 'low';
    }
    
    if (complexityIndicators.high.some(indicator => guidanceLower.includes(indicator))) {
      return 'high';
    }
    
    return 'medium';
  }
  
  /**
   * Extract text positions for highlighting
   */
  extractPositions(textSnippets, fullContent) {
    if (!textSnippets || !Array.isArray(textSnippets)) return [];
    
    return textSnippets.map(snippet => {
      if (!snippet) return null;
      
      const index = fullContent.indexOf(snippet);
      if (index === -1) return null;
      
      return {
        start: index,
        end: index + snippet.length,
        text: snippet
      };
    }).filter(Boolean);
  }
  
  /**
   * Get capabilities this agent provides
   */
  getCapabilities() {
    return [
      ...super.getCapabilities(),
      CAPABILITIES.STRATEGIC_ANALYSIS,
      CAPABILITIES.AUDIENCE_ANALYSIS,
      'PURPOSE_EVALUATION',
      'GOAL_ASSESSMENT',
      'EFFECTIVENESS_MEASUREMENT'
    ];
  }
  
  /**
   * Get agent performance metrics
   */
  getPerformanceProfile() {
    return {
      ...super.getPerformanceProfile(),
      specialties: [
        'Strategic writing assessment',
        'Purpose-goal alignment',
        'Audience effectiveness analysis',
        'Outcome optimization',
        'Message impact evaluation'
      ],
      responseTime: {
        fast: '3-4 seconds',
        typical: '5-7 seconds',
        complex: '8-12 seconds'
      },
      bestUseCase: 'Strategic analysis of writing effectiveness and purpose achievement'
    };
  }
}

export default PurposeFulfillmentAgent;