import aiService from '../services/aiService';
import inquiryComplexService from '../services/inquiryComplexService';

/**
 * Agent that bridges writing assistance with inquiry complexes
 * - Detects when writing touches on complex intellectual topics
 * - Suggests creating inquiry complexes for deeper exploration  
 * - Pulls insights from existing complexes to inform writing
 * - Creates connections between current writing and broader intellectual frameworks
 */

export const analyzeText = async (content, purpose, existingComplexes = []) => {
  if (!content || content.length < 100) {
    return null;
  }

  try {
    const prompt = createAnalysisPrompt(content, purpose, existingComplexes);
    const response = await aiService.callAPI(prompt, undefined, {
      temperature: 0.6,
      maxTokens: 800
    });

    // Parse AI response
    let analysis;
    try {
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      analysis = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.warn('Failed to parse inquiry integration response:', parseError);
      return null;
    }

    // Process different types of insights
    const insights = [];

    // Complex creation suggestions
    if (analysis.shouldCreateComplex && analysis.complexSuggestion) {
      insights.push({
        type: 'complex_suggestion',
        priority: 'high',
        title: 'Deep Exploration Opportunity',
        message: analysis.complexSuggestion.reasoning,
        action: {
          type: 'create_complex',
          question: analysis.complexSuggestion.question,
          relevantText: analysis.complexSuggestion.relevantText
        },
        confidence: analysis.complexSuggestion.confidence || 0.7
      });
    }

    // Insights from existing complexes
    if (analysis.complexInsights && analysis.complexInsights.length > 0) {
      analysis.complexInsights.forEach(insight => {
        insights.push({
          type: 'complex_insight',
          priority: insight.priority || 'medium',
          title: 'Insight from Inquiry Complex',
          message: insight.insight,
          action: {
            type: 'apply_insight',
            suggestion: insight.applicationSuggestion,
            complexId: insight.complexId,
            nodeId: insight.nodeId
          },
          confidence: insight.confidence || 0.6
        });
      });
    }

    // Framework connections
    if (analysis.frameworkConnections && analysis.frameworkConnections.length > 0) {
      analysis.frameworkConnections.forEach(connection => {
        insights.push({
          type: 'framework_connection',
          priority: 'low',
          title: `Connection to ${connection.framework}`,
          message: connection.explanation,
          action: {
            type: 'explore_framework',
            framework: connection.framework,
            keyAuthorities: connection.keyAuthorities || [],
            suggestedResources: connection.suggestedResources || []
          },
          confidence: connection.confidence || 0.5
        });
      });
    }

    return insights.length > 0 ? insights : null;

  } catch (error) {
    console.error('Inquiry integration analysis failed:', error);
    return null;
  }
};

/**
 * Create analysis prompt for the inquiry integration agent
 */
const createAnalysisPrompt = (content, purpose, existingComplexes) => {
  const complexSummaries = existingComplexes.map(complex => ({
    question: complex.centralQuestion,
    nodeCount: complex.nodes.size,
    keyInsights: extractKeyInsights(complex)
  }));

  return `You are an intellectual integration agent that identifies complex ideas and tensions worthy of dialectical exploration.

WRITING PURPOSE: ${purpose}

CURRENT WRITING:
${content}

EXISTING INQUIRY COMPLEXES:
${complexSummaries.length > 0 ? 
  complexSummaries.map(c => `- "${c.question}" (${c.nodeCount} nodes): ${c.keyInsights.join(', ')}`).join('\n') : 
  'None created yet'
}

Analyze the writing for opportunities to deepen intellectual rigor:

1. **Complex Creation Opportunities**: Does the writing present claims, assumptions, or tensions that could benefit from dialectical examination (thesis-antithesis-synthesis)?

2. **Existing Complex Insights**: Can insights from existing complexes enhance this writing?

3. **Framework Connections**: What broader intellectual frameworks, methodologies, or domain-specific approaches relate to this writing?

Respond with ONLY valid JSON:

{
  "shouldCreateComplex": true/false,
  "complexSuggestion": {
    "question": "Deep question that emerges from the writing",
    "reasoning": "Why this question deserves complex exploration", 
    "relevantText": "Specific text passage that prompted this",
    "confidence": 0.75
  },
  "complexInsights": [
    {
      "complexId": "relevant_complex_id_if_applicable",
      "nodeId": "specific_node_if_applicable",
      "insight": "How this complex insight applies to the writing",
      "applicationSuggestion": "Specific way to incorporate this insight", 
      "priority": "high|medium|low",
      "confidence": 0.70
    }
  ],
  "frameworkConnections": [
    {
      "framework": "Name of intellectual framework, methodology, or domain approach",
      "explanation": "How this framework relates to the writing",
      "keyAuthorities": ["Relevant experts or authorities in this domain"],
      "suggestedResources": ["Suggested resources specific to this domain"],
      "confidence": 0.60
    }
  ]
}

Requirements:
- Provide 2-4 complexInsights when existing complexes are relevant 
- Provide 1-3 frameworkConnections when intellectual frameworks apply (could be scientific methods, business frameworks, literary theories, historical approaches, etc.)
- Only suggest complex creation for claims/assumptions that have meaningful opposing viewpoints and benefit from dialectical exploration
- Each insight should be distinct and actionable
- Order insights by priority (high to medium to low)
- Focus on connections that will genuinely enhance the intellectual rigor of the writing
- Consider domain-specific frameworks: scientific method for technical writing, business strategy for corporate writing, literary theory for creative writing, etc.`;
};

/**
 * Extract key insights from a complex for summarization
 */
const extractKeyInsights = (complex) => {
  const insights = [];
  
  // Get syntheses (these often contain key insights)
  for (const node of complex.nodes.values()) {
    if (node.type === 'synthesis' && node.metadata?.newInsight) {
      insights.push(node.metadata.newInsight);
    }
  }
  
  // If no syntheses, get strong refutations
  if (insights.length === 0) {
    for (const node of complex.nodes.values()) {
      if (node.type === 'refutation' && node.metadata?.strength > 0.7) {
        insights.push(node.summary);
      }
    }
  }
  
  // Fallback to central point
  if (insights.length === 0) {
    const centralNode = complex.nodes.get(complex.centralPointId);
    if (centralNode) {
      insights.push(centralNode.summary);
    }
  }
  
  return insights.slice(0, 3); // Max 3 insights for brevity
};

/**
 * Create an inquiry complex from writing context
 */
export const createComplexFromWriting = async (question, writingContext, purpose) => {
  try {
    // Enhance the question with writing context
    const contextualPrompt = `
Based on this writing context, refine and enhance the following question for deep inquiry exploration:

WRITING PURPOSE: ${purpose}
WRITING CONTEXT: ${writingContext}
INITIAL QUESTION: ${question}

Create a more nuanced, exploration-worthy version of this question that:
1. Incorporates relevant context from the writing
2. Is specific enough to generate meaningful objections
3. Is broad enough to support recursive exploration
4. Connects to the writer's actual intellectual needs

Respond with ONLY the refined question as plain text.
`;

    const refinedQuestion = await aiService.callAPI(contextualPrompt, undefined, {
      temperature: 0.7,
      maxTokens: 200
    });

    // Create the complex with the refined question
    const complex = await inquiryComplexService.createComplex(refinedQuestion.trim());
    
    return complex;
    
  } catch (error) {
    console.error('Failed to create complex from writing:', error);
    throw error;
  }
};

/**
 * Extract initial inquiry complexes from writing purpose
 * Identifies the deep questions and intellectual challenges inherent in the user's goals
 */
export const extractInitialComplexes = async (purpose) => {
  if (!purpose || purpose.length < 20) {
    return [];
  }

  try {
    const prompt = createPurposeAnalysisPrompt(purpose);
    const response = await aiService.callAPI(prompt, undefined, {
      temperature: 0.7,
      maxTokens: 1000
    });

    // Parse AI response
    let analysis;
    try {
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      analysis = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.warn('Failed to parse purpose analysis response:', parseError);
      return [];
    }

    // Extract the suggested complexes
    const complexSuggestions = analysis.suggestedComplexes || [];
    
    // Filter to high-quality suggestions
    return complexSuggestions
      .filter(suggestion => 
        suggestion.question && 
        suggestion.question.length > 20 &&
        suggestion.confidence > 0.6
      )
      .slice(0, 3) // Limit to 3 initial complexes
      .map(suggestion => ({
        question: suggestion.question,
        reasoning: suggestion.reasoning,
        relevance: suggestion.relevance,
        confidence: suggestion.confidence,
        priority: suggestion.priority || 'medium'
      }));

  } catch (error) {
    console.error('Failed to extract initial complexes:', error);
    return [];
  }
};

/**
 * Create analysis prompt for extracting complexes from writing purpose
 */
const createPurposeAnalysisPrompt = (purpose) => {
  return `You are an intellectual analysis agent that identifies complex claims, assumptions, and tensions worthy of dialectical exploration.

WRITING PURPOSE:
${purpose}

Analyze this writing purpose and identify 2-3 inquiry complexes that would strengthen the intellectual rigor of this work through thesis-antithesis-synthesis exploration.

An inquiry complex should:
1. Address key claims, assumptions, or tensions in the purpose that have meaningful opposing viewpoints
2. Be specific enough to generate substantive counter-arguments and alternative perspectives
3. Be broad enough to support recursive exploration and synthesis
4. Connect to relevant domain frameworks, methodologies, or expert knowledge
5. Help the writer anticipate objections and strengthen their arguments

Examples of GOOD complex questions across domains:
- Business: "Does rapid scaling necessarily compromise product quality and customer satisfaction?"
- Science: "Can peer review maintain objectivity while accommodating paradigm shifts?"
- Education: "Is standardized assessment compatible with personalized learning approaches?"
- Technology: "Does algorithm transparency inherently conflict with competitive advantage?"

Examples of POOR complex questions:
- "What is renewable energy?" (purely factual, no opposing viewpoints)
- "Should we do something about climate change?" (too broad, lacks specificity)
- "How do neural networks process data?" (technical explanation, not dialectical)

Respond with ONLY valid JSON:

{
  "suggestedComplexes": [
    {
      "question": "Deep question that emerges from this writing purpose",
      "reasoning": "Why exploring this question will strengthen the writing",
      "relevance": "How this connects specifically to the stated purpose",
      "confidence": 0.85,
      "priority": "high|medium|low"
    }
  ],
  "overallAssessment": {
    "intellectualDepth": "Assessment of how much dialectical thinking this purpose requires",
    "dialecticalOpportunities": "Key claims/assumptions where opposing viewpoints would strengthen the work",
    "recommendedApproach": "Suggested strategy for using these complexes to strengthen arguments"
  }
}

Focus on questions that will genuinely help the writer think more rigorously, anticipate counterarguments, and address potential objections to their work. Consider the specific domain and adjust complexity accordingly - business writing needs different dialectical exploration than scientific writing or creative writing.`;
};

/**
 * Apply insights from a complex back to writing
 */
export const applyComplexInsight = async (writingContent, insight, complexId, nodeId) => {
  try {
    const prompt = `
You are helping a writer incorporate insights from deep intellectual exploration.

CURRENT WRITING:
${writingContent}

INSIGHT TO INCORPORATE:
${insight}

Suggest specific, practical ways to incorporate this insight into the writing:

1. **Textual Integration**: Specific sentences or paragraphs to add/modify
2. **Structural Changes**: How this insight might reorganize or reframe arguments  
3. **New Connections**: Additional points or evidence this insight suggests

Respond with ONLY valid JSON:

{
  "textualSuggestions": [
    {
      "action": "add|modify|replace",
      "location": "Describe where in the text",
      "newText": "Specific text to add/change",
      "reasoning": "Why this change strengthens the writing"
    }
  ],
  "structuralSuggestions": [
    {
      "type": "reframe|reorganize|expand|clarify",
      "description": "How to restructure based on this insight",
      "impact": "What this achieves for the writing"
    }
  ],
  "newConnections": [
    {
      "connectionType": "evidence|counter-argument|implication|example",
      "suggestion": "New content this insight suggests adding"
    }
  ]
}
`;

    const response = await aiService.callAPI(prompt, undefined, {
      temperature: 0.6,
      maxTokens: 600
    });

    // Parse and return suggestions
    let suggestions;
    try {
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      suggestions = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.warn('Failed to parse insight application response:', parseError);
      return null;
    }

    return suggestions;
    
  } catch (error) {
    console.error('Failed to apply complex insight:', error);
    return null;
  }
};

export default { analyzeText, createComplexFromWriting, applyComplexInsight, extractInitialComplexes };