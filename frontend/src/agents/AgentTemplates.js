/**
 * Agent Templates - Pre-configured templates for common agent types
 * Provides quick starting points for users to create specialized agents
 */

import { MODEL_TIERS, CAPABILITIES } from './BaseAgent';

export const AGENT_CATEGORIES = {
  WRITING: 'writing',
  RESEARCH: 'research', 
  ANALYSIS: 'analysis',
  CREATIVE: 'creative',
  ACADEMIC: 'academic',
  BUSINESS: 'business',
  TECHNICAL: 'technical'
};

export const PERSONA_TYPES = {
  NEUTRAL: 'neutral',
  FRIENDLY: 'friendly',
  ACADEMIC: 'academic',
  CREATIVE: 'creative',
  PROFESSIONAL: 'professional',
  CRITICAL: 'critical'
};

export const OUTPUT_FORMATS = {
  STANDARD: 'standard',
  DETAILED: 'detailed',
  BULLET_POINTS: 'bullet_points',
  CONVERSATIONAL: 'conversational',
  CHECKLIST: 'checklist'
};

export const AGENT_TEMPLATES = {
  // Writing-focused templates
  GRAMMAR_EXPERT: {
    name: 'Grammar & Syntax Expert',
    description: 'Specialized in detecting grammar errors, syntax issues, and punctuation problems',
    category: AGENT_CATEGORIES.WRITING,
    specialization: 'Grammar and Syntax Analysis',
    customPrompt: `You are an expert grammar and syntax analyzer. Focus on identifying:
- Subject-verb agreement issues
- Tense consistency problems
- Pronoun reference errors
- Comma splices and run-on sentences
- Incorrect apostrophe usage
- Misplaced modifiers
- Parallel structure violations

Provide clear explanations of grammar rules and specific corrections.`,
    modelTier: MODEL_TIERS.FAST,
    capabilities: [CAPABILITIES.STYLE_ANALYSIS],
    focusAreas: ['Grammar', 'Syntax', 'Punctuation', 'Sentence Structure'],
    outputFormat: OUTPUT_FORMATS.STANDARD,
    persona: PERSONA_TYPES.PROFESSIONAL,
    icon: '📝',
    difficulty: 'beginner'
  },

  READABILITY_OPTIMIZER: {
    name: 'Readability Optimizer',
    description: 'Improves text clarity, flow, and accessibility for target audiences',
    category: AGENT_CATEGORIES.WRITING,
    specialization: 'Readability and Clarity Enhancement',
    customPrompt: `You are a readability specialist focused on making text clear and accessible. Analyze:
- Sentence length and complexity
- Word choice and vocabulary level
- Paragraph structure and flow
- Transition effectiveness
- Reading level appropriateness
- Information hierarchy
- Clarity of explanations

Suggest specific improvements to enhance readability without losing meaning.`,
    modelTier: MODEL_TIERS.STANDARD,
    capabilities: [CAPABILITIES.STYLE_ANALYSIS, CAPABILITIES.AUDIENCE_ANALYSIS],
    focusAreas: ['Sentence Length', 'Word Choice', 'Flow', 'Clarity'],
    outputFormat: OUTPUT_FORMATS.DETAILED,
    persona: PERSONA_TYPES.FRIENDLY,
    icon: '👁️',
    difficulty: 'intermediate'
  },

  TONE_ANALYZER: {
    name: 'Tone & Voice Analyzer',
    description: 'Evaluates and optimizes the tone, voice, and emotional impact of writing',
    category: AGENT_CATEGORIES.WRITING,
    specialization: 'Tone and Voice Analysis',
    customPrompt: `You are a tone and voice specialist. Analyze the writing for:
- Overall tone (formal, casual, persuasive, informative, etc.)
- Consistency of voice throughout the text
- Emotional impact and reader engagement
- Appropriateness for intended audience
- Word choice that affects tone
- Sentence rhythm and pace
- Use of rhetorical devices

Provide recommendations for achieving the desired tone and maintaining consistency.`,
    modelTier: MODEL_TIERS.STANDARD,
    capabilities: [CAPABILITIES.STYLE_ANALYSIS, CAPABILITIES.AUDIENCE_ANALYSIS],
    focusAreas: ['Tone Consistency', 'Voice', 'Emotional Impact', 'Audience Appropriateness'],
    outputFormat: OUTPUT_FORMATS.CONVERSATIONAL,
    persona: PERSONA_TYPES.CREATIVE,
    icon: '🎭',
    difficulty: 'intermediate'
  },

  // Research-focused templates
  SOURCE_VALIDATOR: {
    name: 'Source & Citation Validator',
    description: 'Evaluates source credibility, citation accuracy, and research methodology',
    category: AGENT_CATEGORIES.RESEARCH,
    specialization: 'Source Validation and Citation Analysis',
    customPrompt: `You are a research methodology expert specializing in source validation. Examine:
- Source credibility and authority
- Citation format and accuracy
- Recency and relevance of sources
- Potential bias in source selection
- Missing citations for claims
- Quality of evidence presented
- Research methodology soundness

Flag questionable sources and suggest improvements to research foundation.`,
    modelTier: MODEL_TIERS.PREMIUM,
    capabilities: [CAPABILITIES.EVIDENCE_RESEARCH, CAPABILITIES.FACT_CHECK],
    focusAreas: ['Source Credibility', 'Citation Accuracy', 'Research Quality', 'Evidence Strength'],
    outputFormat: OUTPUT_FORMATS.CHECKLIST,
    persona: PERSONA_TYPES.ACADEMIC,
    icon: '🔍',
    difficulty: 'advanced'
  },

  BIAS_DETECTOR: {
    name: 'Bias & Perspective Detector',
    description: 'Identifies potential biases, blind spots, and missing perspectives',
    category: AGENT_CATEGORIES.ANALYSIS,
    specialization: 'Bias Detection and Perspective Analysis',
    customPrompt: `You are a bias detection specialist. Analyze the text for:
- Confirmation bias in source selection
- Loaded language and emotional appeals
- Missing counterarguments or perspectives
- Cultural, political, or ideological bias
- Statistical manipulation or misrepresentation
- Overgeneralization and stereotyping
- Selection bias in examples

Suggest ways to present a more balanced and objective analysis.`,
    modelTier: MODEL_TIERS.STANDARD,
    capabilities: [CAPABILITIES.LOGICAL_ANALYSIS, CAPABILITIES.STRATEGIC_ANALYSIS],
    focusAreas: ['Bias Detection', 'Perspective Balance', 'Objectivity', 'Fairness'],
    outputFormat: OUTPUT_FORMATS.DETAILED,
    persona: PERSONA_TYPES.CRITICAL,
    icon: '⚖️',
    difficulty: 'advanced'
  },

  // Creative templates
  STORYTELLING_COACH: {
    name: 'Storytelling & Narrative Coach',
    description: 'Enhances narrative structure, character development, and storytelling techniques',
    category: AGENT_CATEGORIES.CREATIVE,
    specialization: 'Storytelling and Narrative Enhancement',
    customPrompt: `You are a storytelling expert focused on narrative craft. Analyze:
- Story structure and pacing
- Character development and consistency
- Dialogue naturalness and purpose
- Setting description and world-building
- Plot coherence and tension
- Theme development
- Narrative voice and perspective
- Use of literary devices

Provide specific suggestions to strengthen the narrative and engage readers.`,
    modelTier: MODEL_TIERS.STANDARD,
    capabilities: [CAPABILITIES.STYLE_ANALYSIS, CAPABILITIES.STRATEGIC_ANALYSIS],
    focusAreas: ['Story Structure', 'Character Development', 'Dialogue', 'Pacing'],
    outputFormat: OUTPUT_FORMATS.CONVERSATIONAL,
    persona: PERSONA_TYPES.CREATIVE,
    icon: '📚',
    difficulty: 'intermediate'
  },

  METAPHOR_SPECIALIST: {
    name: 'Metaphor & Imagery Specialist',
    description: 'Enhances figurative language, metaphors, and sensory descriptions',
    category: AGENT_CATEGORIES.CREATIVE,
    specialization: 'Figurative Language and Imagery',
    customPrompt: `You are a specialist in figurative language and vivid imagery. Focus on:
- Effectiveness of metaphors and similes
- Sensory description opportunities
- Symbolism and deeper meaning
- Consistency of imagery themes
- Cliché identification and alternatives
- Emotional resonance of descriptions
- Visual, auditory, and tactile elements

Suggest ways to make language more vivid and emotionally engaging.`,
    modelTier: MODEL_TIERS.STANDARD,
    capabilities: [CAPABILITIES.STYLE_ANALYSIS],
    focusAreas: ['Metaphors', 'Imagery', 'Sensory Details', 'Symbolism'],
    outputFormat: OUTPUT_FORMATS.BULLET_POINTS,
    persona: PERSONA_TYPES.CREATIVE,
    icon: '🎨',
    difficulty: 'intermediate'
  },

  // Academic templates
  THESIS_ADVISOR: {
    name: 'Thesis & Argument Advisor',
    description: 'Strengthens thesis statements, argument structure, and academic reasoning',
    category: AGENT_CATEGORIES.ACADEMIC,
    specialization: 'Academic Argument Development',
    customPrompt: `You are an academic writing advisor specializing in argument development. Evaluate:
- Thesis statement clarity and specificity
- Argument structure and logical flow
- Evidence quality and relevance
- Counterargument acknowledgment
- Conclusion strength and synthesis
- Academic tone and register
- Paragraph unity and transitions
- Critical thinking depth

Provide guidance to strengthen academic argumentation and scholarly presentation.`,
    modelTier: MODEL_TIERS.PREMIUM,
    capabilities: [CAPABILITIES.LOGICAL_ANALYSIS, CAPABILITIES.EVIDENCE_RESEARCH, CAPABILITIES.STRATEGIC_ANALYSIS],
    focusAreas: ['Thesis Development', 'Argument Structure', 'Evidence Quality', 'Academic Tone'],
    outputFormat: OUTPUT_FORMATS.DETAILED,
    persona: PERSONA_TYPES.ACADEMIC,
    icon: '🎓',
    difficulty: 'advanced'
  },

  METHODOLOGY_REVIEWER: {
    name: 'Research Methodology Reviewer',
    description: 'Evaluates research design, methodology, and statistical analysis',
    category: AGENT_CATEGORIES.ACADEMIC,
    specialization: 'Research Methodology Analysis',
    customPrompt: `You are a research methodology expert. Analyze:
- Research design appropriateness
- Sample size and selection methods
- Data collection procedures
- Statistical analysis accuracy
- Variable definitions and measurements
- Limitations acknowledgment
- Reproducibility of methods
- Ethical considerations

Provide feedback on methodological rigor and suggest improvements.`,
    modelTier: MODEL_TIERS.PREMIUM,
    capabilities: [CAPABILITIES.EVIDENCE_RESEARCH, CAPABILITIES.LOGICAL_ANALYSIS],
    focusAreas: ['Research Design', 'Statistical Analysis', 'Methodology', 'Scientific Rigor'],
    outputFormat: OUTPUT_FORMATS.CHECKLIST,
    persona: PERSONA_TYPES.ACADEMIC,
    icon: '🧪',
    difficulty: 'advanced'
  },

  // Business templates
  EXECUTIVE_SUMMARY_EXPERT: {
    name: 'Executive Summary Expert',
    description: 'Optimizes business communications for clarity, impact, and decision-making',
    category: AGENT_CATEGORIES.BUSINESS,
    specialization: 'Business Communication Optimization',
    customPrompt: `You are a business communication expert specializing in executive-level writing. Focus on:
- Key message clarity and prominence
- Executive summary effectiveness
- Action item identification
- Decision-supporting information
- Stakeholder relevance
- Conciseness without losing impact
- Professional tone and credibility
- Strategic recommendation clarity

Ensure the writing serves business decision-making and executive needs.`,
    modelTier: MODEL_TIERS.STANDARD,
    capabilities: [CAPABILITIES.STRATEGIC_ANALYSIS, CAPABILITIES.AUDIENCE_ANALYSIS],
    focusAreas: ['Key Messages', 'Executive Summary', 'Action Items', 'Business Impact'],
    outputFormat: OUTPUT_FORMATS.BULLET_POINTS,
    persona: PERSONA_TYPES.PROFESSIONAL,
    icon: '💼',
    difficulty: 'intermediate'
  },

  // Technical templates
  TECHNICAL_CLARITY_EXPERT: {
    name: 'Technical Clarity Expert',
    description: 'Improves technical documentation, API docs, and developer communications',
    category: AGENT_CATEGORIES.TECHNICAL,
    specialization: 'Technical Documentation Enhancement',
    customPrompt: `You are a technical writing specialist. Analyze for:
- Technical accuracy and precision
- Accessibility to intended audience
- Step-by-step procedure clarity
- Code example quality and relevance
- Error handling documentation
- Assumption identification
- Missing prerequisites or context
- Consistency in terminology

Make technical content more accessible without sacrificing accuracy.`,
    modelTier: MODEL_TIERS.STANDARD,
    capabilities: [CAPABILITIES.LOGICAL_ANALYSIS, CAPABILITIES.AUDIENCE_ANALYSIS],
    focusAreas: ['Technical Accuracy', 'Clarity', 'Documentation', 'User Experience'],
    outputFormat: OUTPUT_FORMATS.CHECKLIST,
    persona: PERSONA_TYPES.PROFESSIONAL,
    icon: '💻',
    difficulty: 'advanced'
  }
};

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category) {
  return Object.entries(AGENT_TEMPLATES)
    .filter(([key, template]) => template.category === category)
    .reduce((acc, [key, template]) => {
      acc[key] = template;
      return acc;
    }, {});
}

/**
 * Get templates by difficulty level
 */
export function getTemplatesByDifficulty(difficulty) {
  return Object.entries(AGENT_TEMPLATES)
    .filter(([key, template]) => template.difficulty === difficulty)
    .reduce((acc, [key, template]) => {
      acc[key] = template;
      return acc;
    }, {});
}

/**
 * Search templates by keywords
 */
export function searchTemplates(query) {
  const searchTerm = query.toLowerCase();
  return Object.entries(AGENT_TEMPLATES)
    .filter(([key, template]) => {
      return template.name.toLowerCase().includes(searchTerm) ||
             template.description.toLowerCase().includes(searchTerm) ||
             template.specialization.toLowerCase().includes(searchTerm) ||
             template.focusAreas.some(area => area.toLowerCase().includes(searchTerm));
    })
    .reduce((acc, [key, template]) => {
      acc[key] = template;
      return acc;
    }, {});
}

/**
 * Get recommended templates based on user preferences
 */
export function getRecommendedTemplates(userPreferences = {}) {
  const { 
    experienceLevel = 'intermediate',
    primaryUseCase = 'writing',
    preferredComplexity = 'standard',
    recentActivity = []
  } = userPreferences;
  
  // Start with templates matching user experience
  let candidates = getTemplatesByDifficulty(experienceLevel);
  
  // If no matches, expand to adjacent levels
  if (Object.keys(candidates).length === 0) {
    if (experienceLevel === 'advanced') {
      candidates = { ...candidates, ...getTemplatesByDifficulty('intermediate') };
    } else if (experienceLevel === 'beginner') {
      candidates = { ...candidates, ...getTemplatesByDifficulty('intermediate') };
    }
  }
  
  // Weight by category preference
  const categoryBonus = {
    [AGENT_CATEGORIES.WRITING]: primaryUseCase === 'writing' ? 2 : 1,
    [AGENT_CATEGORIES.RESEARCH]: primaryUseCase === 'research' ? 2 : 1,
    [AGENT_CATEGORIES.ANALYSIS]: primaryUseCase === 'analysis' ? 2 : 1,
    [AGENT_CATEGORIES.CREATIVE]: primaryUseCase === 'creative' ? 2 : 1,
    [AGENT_CATEGORIES.ACADEMIC]: primaryUseCase === 'academic' ? 2 : 1,
    [AGENT_CATEGORIES.BUSINESS]: primaryUseCase === 'business' ? 2 : 1,
    [AGENT_CATEGORIES.TECHNICAL]: primaryUseCase === 'technical' ? 2 : 1
  };
  
  // Score templates
  const scored = Object.entries(candidates).map(([key, template]) => ({
    key,
    template,
    score: categoryBonus[template.category] || 1
  }));
  
  // Sort by score and return top 6
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .reduce((acc, { key, template }) => {
      acc[key] = template;
      return acc;
    }, {});
}

/**
 * Validate template configuration
 */
export function validateTemplate(template) {
  const errors = [];
  
  if (!template.name || template.name.trim().length === 0) {
    errors.push('Template name is required');
  }
  
  if (!template.description || template.description.trim().length === 0) {
    errors.push('Template description is required');
  }
  
  if (!template.specialization || template.specialization.trim().length === 0) {
    errors.push('Template specialization is required');
  }
  
  if (!template.customPrompt || template.customPrompt.trim().length === 0) {
    errors.push('Custom prompt is required');
  }
  
  if (template.customPrompt && template.customPrompt.length > 2000) {
    errors.push('Custom prompt must be under 2000 characters');
  }
  
  if (!Object.values(AGENT_CATEGORIES).includes(template.category)) {
    errors.push('Invalid template category');
  }
  
  if (!Object.values(MODEL_TIERS).includes(template.modelTier)) {
    errors.push('Invalid model tier');
  }
  
  if (!Object.values(OUTPUT_FORMATS).includes(template.outputFormat)) {
    errors.push('Invalid output format');
  }
  
  if (!Object.values(PERSONA_TYPES).includes(template.persona)) {
    errors.push('Invalid persona type');
  }
  
  return errors;
}

/**
 * Create a custom template from user input
 */
export function createCustomTemplate(config) {
  const errors = validateTemplate(config);
  if (errors.length > 0) {
    throw new Error(`Template validation failed: ${errors.join(', ')}`);
  }
  
  return {
    ...config,
    created: new Date().toISOString(),
    isCustom: true,
    id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

export default AGENT_TEMPLATES;