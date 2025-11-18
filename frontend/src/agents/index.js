/**
 * Multi-Agent System Exports
 * Provides access to all agents and system components
 */

// Main System
import MultiAgentSystem from './MultiAgentSystem';
export { MultiAgentSystem };

// Core Architecture
export { BaseAgent, MODEL_TIERS, CAPABILITIES } from './BaseAgent';
export { default as AgentOrchestrator, URGENCY_LEVELS, CONTENT_TYPES } from './AgentOrchestrator';
export { default as ProgressiveEnhancementManager } from './ProgressiveEnhancementManager';

// Fast Response Agents (gpt-4o-mini)
export { default as LogicalFallacyDetector } from './LogicalFallacyDetector';
export { default as ClarityStyleAgent } from './ClarityStyleAgent';
export { default as QuickFactChecker } from './QuickFactChecker';

// Research Agents (gpt-4o)
export { default as EvidenceQualityAgent } from './EvidenceQualityAgent';
export { default as ContextualResearchCritic } from './ContextualResearchCritic';
export { default as DeepFactVerificationAgent } from './DeepFactVerificationAgent';
export { default as PurposeFulfillmentAgent } from './PurposeFulfillmentAgent';

// Legacy Agents (for backward compatibility)
export { analyzeText as intellectualCriticAnalyze, analyzeTextStream as intellectualCriticStream } from './intellectualCritic';
export { analyzeText as stylisticCriticAnalyze, analyzeTextStream as stylisticCriticStream } from './stylisticCritic';
export { default as crossReferenceAgent } from './crossReferenceAgent';
export { default as inquiryIntegrationAgent } from './inquiryIntegrationAgent';

/**
 * Factory function to create and initialize the multi-agent system
 */
export const createMultiAgentSystem = async () => {
  const system = new MultiAgentSystem();
  await system.initialize();
  return system;
};

/**
 * Quick analysis function for simple use cases
 */
export const quickAnalyze = async (content, options = {}) => {
  const system = await createMultiAgentSystem();
  return await system.analyzeContent(content, {
    ...options,
    urgency: 'realtime',
    budget: 'minimal'
  });
};

/**
 * Thorough analysis function for comprehensive feedback
 */
export const thoroughAnalyze = async (content, options = {}) => {
  const system = await createMultiAgentSystem();
  return await system.analyzeContent(content, {
    ...options,
    urgency: 'normal',
    budget: 'premium',
    thoroughness: 0.9
  });
};

/**
 * Streaming analysis with progressive enhancement
 */
export const streamingAnalyze = async (content, callbacks = {}, options = {}) => {
  const system = await createMultiAgentSystem();
  return await system.analyzeContent(content, {
    ...options,
    ...callbacks
  });
};

/**
 * Agent type constants for easy reference
 */
export const AGENT_TYPES = {
  FAST_RESPONSE: 'fast_response',
  RESEARCH: 'research',
  LEGACY: 'legacy'
};

/**
 * Available agent IDs
 */
export const AGENT_IDS = {
  LOGICAL_FALLACY: 'logical_fallacy_detector',
  CLARITY_STYLE: 'clarity_style_agent', 
  QUICK_FACT_CHECK: 'quick_fact_checker',
  EVIDENCE_QUALITY: 'evidence_quality_agent',
  CONTEXTUAL_RESEARCH: 'contextual_research_critic',
  DEEP_FACT_VERIFICATION: 'deep_fact_verification_agent',
  PURPOSE_FULFILLMENT: 'purpose_fulfillment_agent'
};

/**
 * Migration helper to gradually transition from legacy agents
 */
export const createMigrationPlan = (currentUsage) => {
  return {
    phase1: 'Replace intellectualCritic with LogicalFallacyDetector for argument analysis',
    phase2: 'Replace stylisticCritic with ClarityStyleAgent for style improvements', 
    phase3: 'Add QuickFactChecker for basic fact verification',
    phase4: 'Integrate research agents for comprehensive analysis',
    phase5: 'Enable progressive enhancement for optimal user experience',
    migration_steps: [
      'Initialize MultiAgentSystem alongside existing agents',
      'Run both systems in parallel during transition',
      'Gradually shift traffic to new system',
      'Collect performance comparison data',
      'Complete migration once stability confirmed'
    ]
  };
};

/**
 * System health check
 */
export const checkSystemHealth = async () => {
  try {
    const system = await createMultiAgentSystem();
    const metrics = system.getSystemMetrics();
    
    return {
      status: 'healthy',
      agentCount: metrics.orchestrator.registeredAgents,
      avgResponseTime: metrics.orchestrator.avgDecisionTime,
      successRate: metrics.orchestrator.successRate,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};