/**
 * Contextual Research Critic - Research Agent
 * Uses gpt-4o with web search for counter-argument discovery and expert perspective analysis
 * Focuses on finding alternative viewpoints and field consensus checking
 */

import { BaseAgent, MODEL_TIERS, CAPABILITIES } from './BaseAgent';
import promptCustomizationService from '../services/promptCustomizationService';

export class ContextualResearchCritic extends BaseAgent {
  constructor() {
    super({
      name: 'Contextual Research Critic',
      description: 'Discovers counter-arguments, expert perspectives, and alternative viewpoints',
      defaultTier: MODEL_TIERS.STANDARD,
      requiredCapabilities: [CAPABILITIES.WEB_SEARCH, CAPABILITIES.EVIDENCE_RESEARCH],
      escalationThreshold: 0.7,
      maxRetries: 3,
      contextLimits: { maxTokens: 3500 },
      debugPrompts: true // Enable prompt debugging
    });
  }
  
  generatePrompt(context, modelConfig) {
    const { content, purpose } = context;
    
    // Try to use customized prompt first
    try {
      return promptCustomizationService.generatePrompt(
        'contextualResearch',
        content,
        purpose,
        'analysis',
        { contentLength: content.length, analysisMode: 'research_critic' }
      );
    } catch (error) {
      console.warn('[ContextualResearchCritic] Failed to get customized prompt, using fallback:', error);
      
      // Fallback to default prompt
      const fallbackPrompt = `You are a contextual research specialist. Find counter-arguments, alternative perspectives, and expert opinions that challenge or complement the main arguments.

TEXT TO ANALYZE:
${content}

PURPOSE: ${purpose || 'Research critique'}

Your task is to identify:

1. COUNTER-ARGUMENTS: What opposing viewpoints exist?
2. EXPERT PERSPECTIVES: What do field experts say about these topics?
3. ALTERNATIVE VIEWPOINTS: Are there different ways to approach these issues?
4. FIELD CONSENSUS: Where does current expert opinion stand?
5. MISSING PERSPECTIVES: What viewpoints are not represented?

For each area of critique:

Respond with ONLY valid JSON:
[
  {
    "type": "contextual_research",
    "critiqueType": "counter_argument|expert_perspective|alternative_viewpoint|consensus_check|missing_perspective",
    "confidence": 0.75,
    "title": "Brief description of the critique",
    "originalClaim": "The claim being critiqued",
    "critique": "Detailed alternative perspective or counter-argument", 
    "expertSources": ["Names or institutions of relevant experts"],
    "supportingEvidence": "Evidence supporting the alternative view",
    "fieldConsensus": "Current state of expert opinion on this topic",
    "suggestion": "How to address this perspective in the writing",
    "textSnippets": ["relevant text from original"],
    "researchDepth": "preliminary|thorough|comprehensive"
  }
]`;
      
      console.log('[ContextualResearchCritic] *** RETURNING FALLBACK PROMPT ***');
      console.log('Fallback prompt length:', fallbackPrompt.length);
      return fallbackPrompt;
    }
  }
  
  parseResult(result, context) {
    try {
      let cleanResponse = result.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      
      const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      const critiques = JSON.parse(cleanResponse);
      
      const processedCritiques = critiques.map(critique => ({
        ...critique,
        type: 'contextual_research',
        agent: this.name,
        agentType: 'research',
        priority: this.calculateCritiquePriority(critique),
        timestamp: new Date().toISOString()
      }));
      
      return {
        insights: processedCritiques,
        confidence: processedCritiques.length > 0 
          ? processedCritiques.reduce((sum, c) => sum + (c.confidence || 0.5), 0) / processedCritiques.length
          : 0.8,
        summary: this.generateSummary(processedCritiques),
        researchDepth: 'thorough'
      };
    } catch (error) {
      return {
        insights: [],
        confidence: 0.3,
        summary: 'Limited contextual research completed',
        researchDepth: 'limited'
      };
    }
  }
  
  calculateCritiquePriority(critique) {
    if (critique.critiqueType === 'counter_argument' || critique.confidence > 0.8) {
      return 'high';
    }
    return 'medium';
  }
  
  generateSummary(critiques) {
    if (critiques.length === 0) {
      return 'No significant alternative perspectives or counter-arguments found.';
    }
    
    const counterArgs = critiques.filter(c => c.critiqueType === 'counter_argument').length;
    const expertViews = critiques.filter(c => c.critiqueType === 'expert_perspective').length;
    
    return `Found ${critiques.length} research insight${critiques.length > 1 ? 's' : ''}: ${counterArgs} counter-argument${counterArgs !== 1 ? 's' : ''}, ${expertViews} expert perspective${expertViews !== 1 ? 's' : ''}.`;
  }
}

export default ContextualResearchCritic;