/**
 * User Agent Service - Simplified Agent Management
 * Manages user-created agents with simple prompt editing
 */

// Agent templates (formerly built-in agents)
export const AGENT_TEMPLATES = {
  clarity_style: {
    id: 'clarity_style',
    name: 'Clarity & Style Agent',
    description: 'Analyzes grammar, readability, and writing style',
    category: 'writing',
    icon: '✏️',
    defaultTier: 'fast',
    capabilities: ['style_analysis'],
    responseFormat: 'clarity_style_analysis',
    basePrompt: `You are a writing clarity and style specialist. Analyze the text for grammar, readability, and style issues.

IMPORTANT: Do NOT analyze factual content, claims, evidence, or arguments. Focus exclusively on how the text is written, not what it says.

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

REMEMBER: You are analyzing HOW the text is written, never WHAT the text claims. Ignore all factual content.`
  },

  logical_fallacy: {
    id: 'logical_fallacy',
    name: 'Logical Fallacy Detector',
    description: 'Identifies logical fallacies and reasoning errors',
    category: 'logic',
    icon: '🧠',
    defaultTier: 'fast',
    capabilities: ['logical_analysis'],
    responseFormat: 'logical_fallacy_analysis',
    basePrompt: `You are a logical fallacy detection specialist. Analyze the text for logical fallacies and weak reasoning patterns.

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
Be precise - only flag actual logical errors, not just weak arguments.`
  },

  evidence_quality: {
    id: 'evidence_quality',
    name: 'Evidence Quality Agent',
    description: 'Evaluates source credibility and evidence strength',
    category: 'research',
    icon: '📊',
    defaultTier: 'standard',
    capabilities: ['evidence_research', 'web_search'],
    responseFormat: 'evidence_quality_analysis',
    basePrompt: `You are an evidence quality assessment specialist. Evaluate the credibility of sources, relevance of evidence, and overall strength of support for claims.

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

Focus on:
- Identifying weak or questionable sources
- Highlighting strong evidence that supports claims well
- Suggesting better sources when current ones are inadequate
- Flagging missing evidence for important claims`
  },

  fact_checker: {
    id: 'fact_checker',
    name: 'Fact Checker',
    description: 'Verifies factual claims and identifies inaccuracies',
    category: 'research',
    icon: '🔍',
    defaultTier: 'standard',
    capabilities: ['fact_check', 'web_search'],
    responseFormat: 'fact_check_analysis',
    basePrompt: `You are a fact-checking specialist. Verify factual claims in the text and identify potential inaccuracies.

Focus on verifying:
- Statistical claims and numbers
- Historical facts and dates
- Scientific statements
- Current events and recent information
- Quotes and attributions
- Geographic information
- Biographical details

For each factual claim:
- Assess verifiability
- Note confidence level
- Identify sources if needed
- Flag potential inaccuracies
- Use claimType: "statistical|historical|scientific|current_event|quote|geographic|biographical|other"
- Use verificationStatus: "verified|likely_true|uncertain|likely_false|false"

Only flag claims you can reasonably assess - don't guess on specialized topics.`
  },

  purpose_alignment: {
    id: 'purpose_alignment',
    name: 'Purpose Alignment Agent',
    description: 'Evaluates how well writing serves its intended purpose',
    category: 'strategy',
    icon: '🎯',
    defaultTier: 'standard',
    capabilities: ['strategic_analysis', 'audience_analysis'],
    responseFormat: 'purpose_alignment_analysis',
    basePrompt: `You are a strategic writing effectiveness specialist. Evaluate how well the text accomplishes its stated purpose and goals.

Analyze effectiveness across these dimensions:

1. PURPOSE ALIGNMENT:
   - Does the content directly serve the stated purpose?
   - Are key objectives being met?
   - Is there focus or drift from main goals?

2. AUDIENCE EFFECTIVENESS:
   - Is the tone appropriate for the target audience?
   - Is complexity level suitable?
   - Are audience needs addressed?

3. STRUCTURAL COHERENCE:
   - Is the argument/narrative logically structured?
   - Do sections support the overall purpose?
   - Is there clear progression toward goals?

4. MESSAGE CLARITY:
   - Is the main message clear and prominent?
   - Are supporting points well-integrated?
   - Is the call-to-action (if any) effective?

For each effectiveness issue or strength:
- Use alignmentCategory: "purpose_match|audience_fit|structure|messaging|call_to_action"
- Provide effectivenessScore (0.0-1.0)
- Set impactLevel: "high|medium|low"
- Focus on actionable improvements that better serve the stated purpose`
  }
};

class UserAgentService {
  constructor() {
    this.userAgents = this.loadUserAgents();
  }

  /**
   * Load user-created agents from storage
   */
  loadUserAgents() {
    try {
      const stored = localStorage.getItem('userAgents');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to load user agents:', error);
      return {};
    }
  }

  /**
   * Save user agents to storage
   */
  saveUserAgents() {
    try {
      localStorage.setItem('userAgents', JSON.stringify(this.userAgents));
    } catch (error) {
      console.warn('Failed to save user agents:', error);
    }
  }

  /**
   * Get all available templates
   */
  getTemplates() {
    return Object.values(AGENT_TEMPLATES);
  }

  /**
   * Get all user-created agents
   */
  getAllAgents() {
    return Object.values(this.userAgents).sort((a, b) => 
      new Date(b.lastModified) - new Date(a.lastModified)
    );
  }

  /**
   * Create a new agent from scratch or template
   */
  createAgent(config) {
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const agent = {
      id: agentId,
      name: config.name || 'New Agent',
      description: config.description || 'Custom agent',
      category: config.category || 'custom',
      icon: config.icon || '🤖',
      defaultTier: config.defaultTier || 'fast',
      capabilities: config.capabilities || [],
      responseFormat: config.responseFormat || 'general_analysis',
      prompt: config.prompt || 'You are an AI assistant. Analyze the text and provide insights about its effectiveness, clarity, or other relevant aspects.',
      enabled: true,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      usageCount: 0,
      templateOrigin: config.templateId || null
    };

    this.userAgents[agentId] = agent;
    this.saveUserAgents();

    return agent;
  }

  /**
   * Create agent from template
   */
  createFromTemplate(templateId, customizations = {}) {
    const template = AGENT_TEMPLATES[templateId];
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    return this.createAgent({
      ...template,
      name: customizations.name || template.name,
      description: customizations.description || template.description,
      prompt: customizations.prompt || template.basePrompt,
      templateId: templateId,
      ...customizations
    });
  }

  /**
   * Update existing agent
   */
  updateAgent(agentId, updates) {
    const agent = this.userAgents[agentId];
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Update allowed fields
    const allowedFields = [
      'name', 'description', 'category', 'icon', 'defaultTier', 
      'capabilities', 'responseFormat', 'prompt', 'enabled'
    ];

    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        agent[field] = updates[field];
      }
    }

    agent.lastModified = new Date().toISOString();
    this.saveUserAgents();

    return agent;
  }

  /**
   * Delete agent
   */
  deleteAgent(agentId) {
    if (!this.userAgents[agentId]) {
      throw new Error(`Agent ${agentId} not found`);
    }

    delete this.userAgents[agentId];
    this.saveUserAgents();

    return true;
  }

  /**
   * Clone agent
   */
  cloneAgent(agentId, modifications = {}) {
    const sourceAgent = this.userAgents[agentId];
    if (!sourceAgent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    return this.createAgent({
      ...sourceAgent,
      name: modifications.name || `${sourceAgent.name} (Copy)`,
      ...modifications
    });
  }

  /**
   * Toggle agent enabled state
   */
  toggleAgent(agentId, enabled) {
    return this.updateAgent(agentId, { enabled });
  }

  /**
   * Get enabled agents only
   */
  getEnabledAgents() {
    return this.getAllAgents().filter(agent => agent.enabled);
  }

  /**
   * Generate final prompt for agent execution
   */
  generatePrompt(agent, content, purpose, additionalContext = {}) {
    let prompt = agent.prompt;
    
    // Replace template variables
    prompt = prompt.replace(/{CONTENT}/g, content);
    prompt = prompt.replace(/{PURPOSE}/g, purpose || 'General analysis');
    
    // Add any additional context if provided
    if (additionalContext && Object.keys(additionalContext).length > 0) {
      prompt += '\n\nADDITIONAL CONTEXT:\n' + JSON.stringify(additionalContext, null, 2);
    }
    
    return prompt;
  }

  /**
   * Get agent statistics
   */
  getStats() {
    const agents = this.getAllAgents();
    
    return {
      total: agents.length,
      enabled: agents.filter(a => a.enabled).length,
      byCategory: agents.reduce((acc, agent) => {
        acc[agent.category] = (acc[agent.category] || 0) + 1;
        return acc;
      }, {}),
      totalUsage: agents.reduce((sum, agent) => sum + (agent.usageCount || 0), 0)
    };
  }

  /**
   * Export agent configuration
   */
  exportAgent(agentId) {
    const agent = this.userAgents[agentId];
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    return {
      ...agent,
      exportedAt: new Date().toISOString(),
      exportVersion: '2.0'
    };
  }

  /**
   * Import agent configuration
   */
  importAgent(config) {
    if (!config || config.exportVersion !== '2.0') {
      throw new Error('Invalid or unsupported agent export format');
    }

    const { exportedAt, exportVersion, id, created, lastModified, usageCount, ...agentConfig } = config;
    
    agentConfig.name = `${agentConfig.name} (Imported)`;
    
    return this.createAgent(agentConfig);
  }

  /**
   * Export all agents to a single file
   */
  exportAllAgents() {
    const allAgents = this.getAllAgents();
    return {
      agents: allAgents.map(agent => ({
        ...agent,
        exportedAt: new Date().toISOString()
      })),
      exportedAt: new Date().toISOString(),
      exportVersion: '2.0',
      totalAgents: allAgents.length
    };
  }

  /**
   * Import multiple agents from a bulk export file
   */
  importMultipleAgents(config) {
    if (!config || config.exportVersion !== '2.0') {
      throw new Error('Invalid or unsupported agent export format');
    }

    if (!config.agents || !Array.isArray(config.agents)) {
      throw new Error('Invalid agents data in export file');
    }

    const importResults = {
      imported: [],
      skipped: [],
      errors: []
    };

    for (const agentConfig of config.agents) {
      try {
        const { exportedAt, exportVersion, id, created, lastModified, usageCount, ...cleanAgentConfig } = agentConfig;
        
        // Check if agent with same name exists
        const existingAgent = this.getAllAgents().find(a => a.name === cleanAgentConfig.name);
        if (existingAgent) {
          cleanAgentConfig.name = `${cleanAgentConfig.name} (Imported)`;
        }
        
        const importedAgent = this.createAgent(cleanAgentConfig);
        importResults.imported.push(importedAgent);
      } catch (error) {
        importResults.errors.push({
          agentName: agentConfig.name || 'Unknown',
          error: error.message
        });
      }
    }

    return importResults;
  }

  /**
   * Reset all agents (delete all user agents)
   */
  resetAll() {
    this.userAgents = {};
    this.saveUserAgents();
    return true;
  }
}

export default new UserAgentService();