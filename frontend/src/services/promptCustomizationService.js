/**
 * Prompt Customization Service
 * Manages custom user prompts while preserving response structure
 */

import { intellectualCriticPrompt } from '../prompts/intellectualCritic';

// Default prompts registry
const DEFAULT_PROMPTS = {
  intellectualCritic: {
    id: 'intellectualCritic',
    name: 'Intellectual Critic',
    description: 'Analyzes reasoning, logic, and argumentation',
    basePromptGenerator: intellectualCriticPrompt,
    customizableElements: {
      tone: {
        default: 'sophisticated intellectual partner engaging in dialectical thinking',
        description: 'The tone and approach the AI critic should take'
      },
      focus: {
        default: 'reasoning, logic, and argumentation',
        description: 'Primary areas the critic should focus on'
      },
      criteria: {
        default: 'logical consistency, evidence integration, counter-argument engagement',
        description: 'Key criteria for evaluation'
      },
      engagement: {
        default: 'thoughtful colleague, addressing the writer directly',
        description: 'How the AI should engage with the writer'
      }
    },
    responseStructure: {
      type: 'JSON array',
      required: ['type', 'severity', 'title', 'feedback', 'suggestion', 'textSnippets'],
      preserveExact: true
    }
  },
  clarityStyle: {
    id: 'clarityStyle',
    name: 'Clarity & Style Critic',
    description: 'Focuses on grammar, readability, and writing style',
    customizableElements: {
      tone: {
        default: 'writing clarity and style specialist',
        description: 'The professional identity the AI should adopt'
      },
      priorities: {
        default: 'Grammar errors (high), clarity issues (medium), style preferences (low)',
        description: 'How to prioritize different types of issues'
      },
      exclusions: {
        default: 'factual content, claims, evidence, or arguments',
        description: 'What the AI should explicitly avoid analyzing'
      },
      style: {
        default: 'quick, actionable fixes',
        description: 'The approach to suggestions and improvements'
      }
    },
    responseStructure: {
      type: 'JSON array',
      required: ['type', 'category', 'issueType', 'severity', 'confidence', 'title', 'textSnippets', 'feedback', 'suggestion'],
      preserveExact: true
    }
  },
  evidenceQuality: {
    id: 'evidenceQuality',
    name: 'Evidence Quality Agent',
    description: 'Evaluates source credibility, evidence relevance, and citation quality',
    customizableElements: {
      role: {
        default: 'evidence quality assessment specialist',
        description: 'Professional identity and expertise area'
      },
      priorities: {
        default: 'source credibility, evidence relevance, methodological rigor, currency & consistency',
        description: 'Key evaluation dimensions to prioritize'
      },
      credibilityFactors: {
        default: 'authority, bias, reputation, publication venue',
        description: 'Factors to consider when assessing source credibility'
      },
      standards: {
        default: 'academic rigor with practical applicability',
        description: 'Standards to apply when evaluating evidence quality'
      },
      suggestions: {
        default: 'specific ways to enhance evidence quality and address weaknesses',
        description: 'Type of improvement recommendations to provide'
      }
    },
    responseStructure: {
      type: 'JSON array',
      required: ['type', 'evidenceType', 'credibilityScore', 'confidence', 'title', 'textSnippets', 'feedback'],
      preserveExact: true
    }
  },
  logicalFallacy: {
    id: 'logicalFallacy',
    name: 'Logical Fallacy Detector',
    description: 'Identifies logical fallacies and reasoning errors',
    customizableElements: {
      role: {
        default: 'logical reasoning specialist',
        description: 'Professional identity and area of expertise'
      },
      approach: {
        default: 'constructive and educational',
        description: 'How to approach fallacy detection and correction'
      },
      focus: {
        default: 'common logical fallacies, reasoning errors, argument structure',
        description: 'Primary areas to analyze for logical issues'
      },
      severity: {
        default: 'major fallacies (high priority), minor issues (medium priority)',
        description: 'How to prioritize different types of logical errors'
      },
      corrections: {
        default: 'clear explanations with better reasoning alternatives',
        description: 'Style of corrections and suggestions to provide'
      }
    },
    responseStructure: {
      type: 'JSON array',
      required: ['type', 'fallacyType', 'severity', 'confidence', 'title', 'textSnippets', 'feedback', 'correction'],
      preserveExact: true
    }
  },
  quickFactChecker: {
    id: 'quickFactChecker',
    name: 'Quick Fact Checker',
    description: 'Rapid verification of basic factual claims',
    customizableElements: {
      role: {
        default: 'fact-checking specialist',
        description: 'Professional identity and verification approach'
      },
      scope: {
        default: 'basic factual claims, common knowledge verification, obvious inconsistencies',
        description: 'Types of claims to focus on for quick verification'
      },
      confidence: {
        default: 'high-confidence assessments only, escalate uncertain claims',
        description: 'Confidence threshold and escalation criteria'
      },
      style: {
        default: 'concise and definitive',
        description: 'Communication style for fact-checking results'
      }
    },
    responseStructure: {
      type: 'JSON array',
      required: ['type', 'claimType', 'verificationStatus', 'confidence', 'title', 'textSnippets', 'feedback'],
      preserveExact: true
    }
  },
  deepFactVerification: {
    id: 'deepFactVerification',
    name: 'Deep Fact Verification Agent',
    description: 'Comprehensive fact-checking for complex claims',
    customizableElements: {
      role: {
        default: 'comprehensive fact verification specialist',
        description: 'Professional identity and thorough verification approach'
      },
      methodology: {
        default: 'multi-source verification, academic database cross-referencing, expert consultation',
        description: 'Verification methodology and standards'
      },
      scope: {
        default: 'complex claims, statistical data, academic assertions, controversial topics',
        description: 'Types of claims requiring deep verification'
      },
      reporting: {
        default: 'detailed evidence trails with source attribution',
        description: 'How to present verification results and evidence'
      },
      uncertainty: {
        default: 'acknowledge limitations and degrees of certainty',
        description: 'How to handle uncertain or disputed information'
      }
    },
    responseStructure: {
      type: 'JSON array',
      required: ['type', 'claimComplexity', 'verificationStatus', 'evidenceStrength', 'confidence', 'title', 'textSnippets', 'feedback'],
      preserveExact: true
    }
  },
  contextualResearch: {
    id: 'contextualResearch',
    name: 'Contextual Research Critic',
    description: 'Suggests additional research and context expansion',
    customizableElements: {
      role: {
        default: 'research guidance specialist',
        description: 'Professional identity and research advisory approach'
      },
      focus: {
        default: 'research gap identification, additional source suggestions, context expansion',
        description: 'Primary areas for research improvement suggestions'
      },
      depth: {
        default: 'comprehensive coverage with practical feasibility',
        description: 'Depth of research suggestions to provide'
      },
      connections: {
        default: 'interdisciplinary connections and broader implications',
        description: 'Types of connections and context to highlight'
      },
      priorities: {
        default: 'most impactful research additions first',
        description: 'How to prioritize research suggestions'
      }
    },
    responseStructure: {
      type: 'JSON array',
      required: ['type', 'researchType', 'priority', 'confidence', 'title', 'textSnippets', 'feedback', 'suggestions'],
      preserveExact: true
    }
  },
  purposeFulfillment: {
    id: 'purposeFulfillment',
    name: 'Purpose Fulfillment Agent',
    description: 'Evaluates how effectively writing accomplishes its stated purpose and goals',
    customizableElements: {
      role: {
        default: 'strategic writing effectiveness specialist',
        description: 'Professional identity and strategic analysis approach'
      },
      analysisDepth: {
        default: 'comprehensive purpose fulfillment analysis across multiple dimensions',
        description: 'Depth and scope of strategic analysis to provide'
      },
      evaluationCriteria: {
        default: 'purpose alignment, audience effectiveness, goal achievement, strategic structure, message effectiveness',
        description: 'Key criteria for evaluating writing effectiveness'
      },
      feedbackStyle: {
        default: 'strategic, high-level analysis with actionable recommendations',
        description: 'Style and level of strategic feedback to provide'
      },
      prioritization: {
        default: 'critical alignment issues first, then optimization opportunities',
        description: 'How to prioritize improvement recommendations'
      },
      audienceConsideration: {
        default: 'infer audience needs and tailor effectiveness assessment accordingly',
        description: 'How to factor audience considerations into the analysis'
      }
    },
    responseStructure: {
      type: 'JSON array',
      required: ['type', 'fulfillmentCategory', 'effectivenessScore', 'impactLevel', 'confidence', 'title', 'textSnippets', 'feedback'],
      preserveExact: true
    }
  }
};

class PromptCustomizationService {
  constructor() {
    this.customPrompts = this.loadCustomPrompts();
    this.initializeDefaultPrompts();
  }

  /**
   * Initialize default prompts if they don't exist
   */
  initializeDefaultPrompts() {
    Object.keys(DEFAULT_PROMPTS).forEach(promptId => {
      if (!this.customPrompts[promptId]) {
        this.customPrompts[promptId] = {
          ...DEFAULT_PROMPTS[promptId],
          isCustomized: false,
          customElements: {}
        };
      }
    });
    this.saveCustomPrompts();
  }

  /**
   * Load custom prompts from storage
   */
  loadCustomPrompts() {
    try {
      const stored = localStorage.getItem('customPrompts');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to load custom prompts:', error);
      return {};
    }
  }

  /**
   * Save custom prompts to storage
   */
  saveCustomPrompts() {
    try {
      localStorage.setItem('customPrompts', JSON.stringify(this.customPrompts));
    } catch (error) {
      console.error('Failed to save custom prompts:', error);
    }
  }

  /**
   * Get all available prompts with their customization status
   */
  getAllPrompts() {
    return Object.values(this.customPrompts).map(prompt => ({
      id: prompt.id,
      name: prompt.name,
      description: prompt.description,
      isCustomized: prompt.isCustomized,
      customizableElements: prompt.customizableElements,
      lastModified: prompt.lastModified
    }));
  }

  /**
   * Get a specific prompt configuration
   */
  getPrompt(promptId) {
    return this.customPrompts[promptId] || null;
  }

  /**
   * Update customizable elements of a prompt
   */
  updatePromptElements(promptId, customElements) {
    if (!this.customPrompts[promptId]) {
      throw new Error(`Prompt ${promptId} not found`);
    }

    // Validate that only allowed elements are being customized
    const allowedElements = Object.keys(this.customPrompts[promptId].customizableElements);
    const invalidElements = Object.keys(customElements).filter(
      key => !allowedElements.includes(key)
    );

    if (invalidElements.length > 0) {
      throw new Error(`Invalid customizable elements: ${invalidElements.join(', ')}`);
    }

    // Update the prompt
    this.customPrompts[promptId] = {
      ...this.customPrompts[promptId],
      customElements,
      isCustomized: Object.keys(customElements).length > 0,
      lastModified: new Date().toISOString()
    };

    this.saveCustomPrompts();
    return this.customPrompts[promptId];
  }

  /**
   * Reset a prompt to its default configuration
   */
  resetToDefaults(promptId) {
    if (!DEFAULT_PROMPTS[promptId]) {
      throw new Error(`Default prompt ${promptId} not found`);
    }

    this.customPrompts[promptId] = {
      ...DEFAULT_PROMPTS[promptId],
      isCustomized: false,
      customElements: {}
    };

    this.saveCustomPrompts();
    return this.customPrompts[promptId];
  }

  /**
   * Reset all prompts to defaults
   */
  resetAllToDefaults() {
    Object.keys(DEFAULT_PROMPTS).forEach(promptId => {
      this.resetToDefaults(promptId);
    });
    return this.getAllPrompts();
  }

  /**
   * Generate the actual prompt using custom elements
   */
  generatePrompt(promptId, content, purpose, mode, additionalCriteria) {
    const promptConfig = this.customPrompts[promptId];
    if (!promptConfig) {
      throw new Error(`Prompt ${promptId} not found`);
    }

    // Get the base prompt generator
    const baseGenerator = promptConfig.basePromptGenerator;
    if (!baseGenerator) {
      // Generate default prompts for agents without base generators
      switch (promptId) {
        case 'clarityStyle':
          return this.generateDefaultClarityStylePrompt(content, purpose, mode, additionalCriteria);
        case 'evidenceQuality':
          return this.generateDefaultEvidenceQualityPrompt(content, purpose, mode, additionalCriteria);
        case 'logicalFallacy':
          return this.generateDefaultLogicalFallacyPrompt(content, purpose, mode, additionalCriteria);
        case 'quickFactChecker':
          return this.generateDefaultQuickFactCheckerPrompt(content, purpose, mode, additionalCriteria);
        case 'deepFactVerification':
          return this.generateDefaultDeepFactVerificationPrompt(content, purpose, mode, additionalCriteria);
        case 'contextualResearch':
          return this.generateDefaultContextualResearchPrompt(content, purpose, mode, additionalCriteria);
        case 'purposeFulfillment':
          return this.generateDefaultPurposeFulfillmentPrompt(content, purpose, mode, additionalCriteria);
        default:
          throw new Error(`No base prompt generator for ${promptId}`);
      }
    }

    // Apply customizations to the prompt
    if (!promptConfig.isCustomized) {
      // Use default prompt
      return baseGenerator(content, purpose, mode, additionalCriteria);
    }

    // Generate customized prompt
    return this.applyCustomizations(
      promptId,
      baseGenerator,
      content,
      purpose,
      mode,
      additionalCriteria
    );
  }

  /**
   * Apply customizations to the base prompt
   */
  applyCustomizations(promptId, baseGenerator, content, purpose, mode, additionalCriteria) {
    const promptConfig = this.customPrompts[promptId];
    let basePrompt = baseGenerator(content, purpose, mode, additionalCriteria);

    console.log(`[PromptCustomization] *** APPLYING CUSTOMIZATIONS FOR ${promptId} ***`);
    console.log('Base prompt length:', basePrompt.length);
    console.log('Custom elements:', promptConfig.customElements);

    // Apply each customization
    Object.entries(promptConfig.customElements).forEach(([elementKey, customValue]) => {
      const defaultConfig = promptConfig.customizableElements[elementKey];
      if (defaultConfig && customValue.trim() !== '') {
        const searchText = defaultConfig.default;
        console.log(`[PromptCustomization] Trying to replace "${searchText}" with "${customValue}"`);
        
        // Replace the default value with the custom value
        const originalPrompt = basePrompt;
        basePrompt = basePrompt.replace(
          new RegExp(this.escapeRegExp(defaultConfig.default), 'gi'),
          customValue
        );
        
        if (originalPrompt === basePrompt) {
          console.log(`[PromptCustomization] *** REPLACEMENT FAILED - TEXT NOT FOUND ***`);
          console.log('Searched for:', searchText);
          console.log('In prompt starting with:', basePrompt.substring(0, 200) + '...');
        } else {
          console.log(`[PromptCustomization] ✅ Successfully replaced text`);
        }
      }
    });

    console.log(`[PromptCustomization] Final customized prompt length:`, basePrompt.length);
    return basePrompt;
  }

  /**
   * Generate default clarity style prompt
   */
  generateDefaultClarityStylePrompt(content, purpose, mode, additionalCriteria) {
    return `You are a writing clarity and style specialist. Analyze the following text ONLY for grammar, readability, and style issues. 

IMPORTANT: Do NOT analyze factual content, claims, evidence, or arguments. Focus exclusively on how the text is written, not what it says.

TEXT TO ANALYZE:
${content}

PURPOSE: ${purpose || 'General writing'}

${additionalCriteria || ''}

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

  /**
   * Generate default evidence quality prompt
   */
  generateDefaultEvidenceQualityPrompt(content, purpose, mode, additionalCriteria) {
    return `You are an evidence quality assessment specialist. Evaluate the credibility of sources, relevance of evidence, and overall strength of support for claims.

TEXT TO ANALYZE:
${content}

PURPOSE: ${purpose || 'Evidence assessment'}

${additionalCriteria || ''}

Evaluate evidence quality across these dimensions:

1. SOURCE CREDIBILITY:
   - Authority: Is the source an expert/institution in the field?
   - Bias: Does the source have conflicts of interest?
   - Reputation: Is this a well-regarded source?
   - Publication venue: Journal quality, editorial standards

2. EVIDENCE RELEVANCE:
   - Direct support: Does evidence directly address the claim?
   - Scope: Does evidence scope match claim scope?
   - Context: Is evidence used appropriately?

3. METHODOLOGICAL RIGOR:
   - Study design: Appropriate methodology for conclusions?
   - Sample size: Sufficient for generalization?
   - Controls: Proper controls and comparisons?
   - Peer review: Has work been vetted?

4. CURRENCY & CONSISTENCY:
   - Recency: Is evidence current for the topic?
   - Consensus: Does evidence align with expert consensus?
   - Replication: Has research been replicated?

For EACH source or piece of evidence, assess:

Respond with ONLY valid JSON:
[
  {
    "type": "evidence_quality",
    "evidenceType": "primary_source|secondary_source|expert_opinion|statistical_data|study|report|news",
    "credibilityScore": 0.85,
    "relevanceScore": 0.90,
    "methodologyScore": 0.75,
    "recencyScore": 0.80,
    "overallQuality": "excellent|good|fair|poor",
    "confidence": 0.80,
    "title": "Assessment of [source/evidence type]",
    "textSnippets": ["exact text containing the evidence"],
    "feedback": "Detailed assessment of evidence quality",
    "strengths": ["What makes this evidence strong"],
    "weaknesses": ["What limitations or concerns exist"],
    "suggestions": "How to strengthen evidence or address weaknesses",
    "credibilityFactors": {
      "sourceAuthority": "high|medium|low",
      "publicationVenue": "academic|news|blog|social|other",
      "bias_indicators": ["potential bias sources if any"],
      "verification_needed": true
    },
    "improvementRecommendations": "Specific ways to enhance evidence quality"
  }
]

Focus on:
- Identifying weak or questionable sources
- Highlighting strong evidence that supports claims well
- Suggesting better sources when current ones are inadequate
- Flagging missing evidence for important claims

If no sources or evidence found, return empty array [].`;
  }

  /**
   * Generate default logical fallacy detection prompt
   */
  generateDefaultLogicalFallacyPrompt(content, purpose, mode, additionalCriteria) {
    return `You are a logical reasoning specialist. Identify logical fallacies, reasoning errors, and problems in argument structure.

TEXT TO ANALYZE:
${content}

PURPOSE: ${purpose || 'Logical analysis'}

${additionalCriteria || ''}

Analyze for these common logical fallacies and reasoning errors:

1. FORMAL FALLACIES:
   - Invalid syllogisms, circular reasoning, false dilemma
   - Affirming the consequent, denying the antecedent

2. INFORMAL FALLACIES:
   - Ad hominem, straw man, slippery slope
   - Appeal to authority, appeal to emotion, appeal to popularity
   - Hasty generalization, false analogy

3. ARGUMENT STRUCTURE ISSUES:
   - Unsupported premises, missing links in reasoning
   - Conflation of correlation and causation

For EACH logical issue found:

Respond with ONLY valid JSON:
[
  {
    "type": "logical_fallacy",
    "fallacyType": "ad_hominem|straw_man|false_dilemma|hasty_generalization|appeal_to_authority|circular_reasoning|etc",
    "severity": "high|medium|low",
    "confidence": 0.85,
    "title": "Name of the logical fallacy or error",
    "textSnippets": ["exact text containing the fallacy"],
    "feedback": "Explanation of why this is a logical error",
    "correction": "How to fix or improve the reasoning",
    "impact": "How this fallacy weakens the argument",
    "betterApproach": "Suggested logical alternative"
  }
]

Focus on:
- Clear explanations of why something is a fallacy
- Constructive suggestions for better reasoning
- Educational approach that helps improve logic

If no logical fallacies found, return empty array [].`;
  }

  /**
   * Generate default quick fact checker prompt
   */
  generateDefaultQuickFactCheckerPrompt(content, purpose, mode, additionalCriteria) {
    return `You are a fact-checking specialist focused on rapid verification of basic factual claims.

TEXT TO ANALYZE:
${content}

PURPOSE: ${purpose || 'Fact verification'}

${additionalCriteria || ''}

Focus on verifying:

1. BASIC FACTUAL CLAIMS:
   - Dates, numbers, basic statistics
   - Common knowledge facts
   - Historical events and figures

2. OBVIOUS INCONSISTENCIES:
   - Internal contradictions
   - Clearly incorrect information
   - Impossible claims

IMPORTANT: Only flag issues you can verify with high confidence. Escalate complex or uncertain claims.

For EACH factual issue found:

Respond with ONLY valid JSON:
[
  {
    "type": "fact_check",
    "claimType": "date|statistic|historical|scientific|general_knowledge",
    "verificationStatus": "verified|false|misleading|uncertain",
    "confidence": 0.90,
    "title": "Fact check of specific claim",
    "textSnippets": ["exact claim being fact-checked"],
    "feedback": "Verification result with correct information",
    "correction": "Accurate information if claim is wrong",
    "source": "Basis for verification"
  }
]

Only include high-confidence assessments. If uncertain, do not include.
If no clear factual issues found, return empty array [].`;
  }

  /**
   * Generate default deep fact verification prompt
   */
  generateDefaultDeepFactVerificationPrompt(content, purpose, mode, additionalCriteria) {
    return `You are a comprehensive fact verification specialist handling complex claims requiring thorough investigation.

TEXT TO ANALYZE:
${content}

PURPOSE: ${purpose || 'Deep fact verification'}

${additionalCriteria || ''}

Conduct thorough verification for:

1. COMPLEX CLAIMS:
   - Statistical assertions requiring context
   - Scientific or technical claims
   - Controversial or disputed information

2. MULTI-SOURCE VERIFICATION:
   - Cross-reference multiple reliable sources
   - Academic database consultation
   - Expert opinion consideration

3. NUANCED ASSESSMENT:
   - Degrees of certainty
   - Context-dependent accuracy
   - Limitations and caveats

For EACH complex claim verified:

Respond with ONLY valid JSON:
[
  {
    "type": "deep_fact_verification",
    "claimComplexity": "high|medium",
    "verificationStatus": "confirmed|partially_confirmed|disputed|false|insufficient_evidence",
    "evidenceStrength": "strong|moderate|weak",
    "confidence": 0.75,
    "title": "Deep verification of complex claim",
    "textSnippets": ["exact claim being verified"],
    "feedback": "Comprehensive verification analysis",
    "evidenceTrail": ["Sources and evidence consulted"],
    "limitations": "Uncertainties or limitations in verification",
    "context": "Important context affecting accuracy"
  }
]

Provide detailed evidence trails and acknowledge limitations.
If insufficient evidence for verification, indicate uncertainty clearly.`;
  }

  /**
   * Generate default contextual research prompt
   */
  generateDefaultContextualResearchPrompt(content, purpose, mode, additionalCriteria) {
    return `You are a research guidance specialist identifying opportunities for additional research and context expansion.

TEXT TO ANALYZE:
${content}

PURPOSE: ${purpose || 'Research enhancement'}

${additionalCriteria || ''}

Identify opportunities for:

1. RESEARCH GAPS:
   - Missing perspectives or viewpoints
   - Unexplored aspects of the topic
   - Additional evidence needed

2. CONTEXT EXPANSION:
   - Historical background
   - Broader implications
   - Related fields or disciplines

3. SOURCE DIVERSIFICATION:
   - Additional authoritative sources
   - Different types of evidence
   - International or cross-cultural perspectives

For EACH research enhancement opportunity:

Respond with ONLY valid JSON:
[
  {
    "type": "contextual_research",
    "researchType": "additional_sources|broader_context|missing_perspective|methodology_enhancement",
    "priority": "high|medium|low",
    "confidence": 0.80,
    "title": "Research enhancement suggestion",
    "textSnippets": ["relevant text that could benefit from enhancement"],
    "feedback": "Explanation of research gap or opportunity",
    "suggestions": ["Specific research directions or sources to explore"],
    "impact": "How this research would strengthen the work",
    "feasibility": "Practical considerations for implementing suggestion"
  }
]

Focus on most impactful and feasible research improvements.
Prioritize suggestions that significantly strengthen the argument or analysis.`;
  }

  /**
   * Generate default purpose fulfillment prompt
   */
  generateDefaultPurposeFulfillmentPrompt(content, purpose, mode, additionalCriteria) {
    return `You are a strategic writing effectiveness specialist. Evaluate how well the writing accomplishes its stated purpose and provides strategic feedback for improvement.

TEXT TO ANALYZE:
${content}

STATED PURPOSE: ${purpose || 'General writing effectiveness'}

${additionalCriteria || ''}

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
   * Escape special regex characters
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Validate that response structure is preserved
   */
  validateResponseStructure(promptId, response) {
    const promptConfig = this.customPrompts[promptId];
    if (!promptConfig?.responseStructure?.preserveExact) {
      return { valid: true };
    }

    try {
      const parsedResponse = JSON.parse(response);
      const required = promptConfig.responseStructure.required;

      if (Array.isArray(parsedResponse)) {
        // Validate each item in array has required fields
        for (const item of parsedResponse) {
          for (const field of required) {
            if (!(field in item)) {
              return {
                valid: false,
                error: `Missing required field: ${field}`,
                promptId
              };
            }
          }
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid JSON response structure',
        promptId
      };
    }
  }

  /**
   * Export custom prompts configuration
   */
  exportConfiguration() {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      prompts: Object.fromEntries(
        Object.entries(this.customPrompts)
          .filter(([_, config]) => config.isCustomized)
          .map(([id, config]) => [id, {
            customElements: config.customElements,
            lastModified: config.lastModified
          }])
      )
    };
  }

  /**
   * Import custom prompts configuration
   */
  importConfiguration(configData) {
    try {
      const { prompts } = configData;
      
      Object.entries(prompts).forEach(([promptId, importedConfig]) => {
        if (this.customPrompts[promptId]) {
          this.updatePromptElements(promptId, importedConfig.customElements);
        }
      });

      return { success: true, importedCount: Object.keys(prompts).length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get customization statistics
   */
  getCustomizationStats() {
    const allPrompts = Object.values(this.customPrompts);
    const customizedCount = allPrompts.filter(p => p.isCustomized).length;
    
    return {
      totalPrompts: allPrompts.length,
      customizedPrompts: customizedCount,
      defaultPrompts: allPrompts.length - customizedCount,
      lastModified: allPrompts
        .filter(p => p.lastModified)
        .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))[0]?.lastModified
    };
  }

  /**
   * Sync with user profile (for authenticated users)
   */
  async syncWithUserProfile(authService) {
    try {
      const userData = await authService.getUserData();
      if (userData && userData.customPrompts) {
        // Merge remote prompts with local ones
        Object.entries(userData.customPrompts).forEach(([promptId, remoteConfig]) => {
          const localConfig = this.customPrompts[promptId];
          
          // Use the most recently modified version
          if (!localConfig || 
              !localConfig.lastModified || 
              new Date(remoteConfig.lastModified) > new Date(localConfig.lastModified)) {
            this.updatePromptElements(promptId, remoteConfig.customElements);
          }
        });
      }

      // Save local customizations to user profile
      await authService.updateUserData({
        customPrompts: Object.fromEntries(
          Object.entries(this.customPrompts)
            .filter(([_, config]) => config.isCustomized)
            .map(([id, config]) => [id, {
              customElements: config.customElements,
              lastModified: config.lastModified
            }])
        )
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to sync prompts with user profile:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new PromptCustomizationService();