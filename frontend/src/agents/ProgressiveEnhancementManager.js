/**
 * Progressive Enhancement Manager
 * Orchestrates progressive enhancement: fast agents stream immediately,
 * research agents work in background and update suggestions in-place
 */

import AgentOrchestrator, { URGENCY_LEVELS } from './AgentOrchestrator';

export class ProgressiveEnhancementManager extends AgentOrchestrator {
  constructor() {
    super();
    
    this.activeAnalyses = new Map(); // analysisId -> analysis state
    this.enhancementQueue = new Map(); // analysisId -> queued enhancements
    this.progressCallbacks = new Map(); // analysisId -> callback functions
    
    // Progressive enhancement configuration
    this.config = {
      fastResponseTimeout: 8000, // 8 seconds for fast agents (increased for reliability)
      researchTimeout: 30000, // 30 seconds for research agents
      maxConcurrentAnalyses: 5,
      enhancementBatchSize: 3
    };
  }
  
  /**
   * Start progressive analysis: fast agents immediately, research agents in background
   */
  async startProgressiveAnalysis(content, options = {}) {
    const {
      analysisId = this.generateAnalysisId(),
      onProgress = null,
      onFastComplete = null,
      onEnhancementAvailable = null,
      onComplete = null,
      urgency = URGENCY_LEVELS.NORMAL,
      budget = 'standard',
      maxParallelAgents = 3,
      requestedAgents = null
    } = options;
    
    // Initialize analysis state
    this.activeAnalyses.set(analysisId, {
      id: analysisId,
      content,
      stage: 'initializing',
      fastResults: null,
      researchResults: new Map(),
      enhancedResults: null,
      startTime: Date.now(),
      callbacks: {
        onProgress,
        onFastComplete,
        onEnhancementAvailable,
        onComplete
      }
    });
    
    // Set up progress callback
    if (onProgress) {
      this.progressCallbacks.set(analysisId, onProgress);
    }
    
    try {
      // Phase 1: Fast agents (parallel execution with streaming)
      const fastPhasePromise = this.executeFastPhase(analysisId, content, {
        urgency,
        budget,
        maxParallelAgents: Math.min(maxParallelAgents, 3), // Limit fast agents
        requestedAgents
      });
      
      // Phase 2: Research agents (background execution)
      const researchPhasePromise = this.executeResearchPhase(analysisId, content, {
        urgency: urgency === URGENCY_LEVELS.REALTIME ? URGENCY_LEVELS.HIGH : urgency,
        budget,
        maxParallelAgents: Math.min(maxParallelAgents, 2), // Limit research agents
        requestedAgents
      });
      
      // Wait for fast phase and notify
      const fastResults = await fastPhasePromise;
      this.updateAnalysisState(analysisId, 'fast_complete', { fastResults });
      
      if (onFastComplete) {
        onFastComplete({
          analysisId,
          results: fastResults,
          stage: 'fast_complete',
          processingTime: Date.now() - this.activeAnalyses.get(analysisId).startTime
        });
      }
      
      // Continue with research phase in background
      researchPhasePromise.then(researchResults => {
        this.enhanceWithResearchResults(analysisId, fastResults, researchResults);
      }).catch(error => {
        console.warn('Research phase failed:', error);
        // Still complete with fast results
        this.finalizeAnalysis(analysisId, fastResults);
      });
      
      // Return immediate fast results
      return {
        analysisId,
        results: fastResults,
        stage: 'fast_complete',
        enhancementsInProgress: true
      };
      
    } catch (error) {
      this.updateAnalysisState(analysisId, 'error', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Execute fast response agents with streaming
   */
  async executeFastPhase(analysisId, content, options) {
    this.updateAnalysisState(analysisId, 'fast_phase');
    
    // Select fast response agents
    const fastAgents = this.selectFastAgents(content, options);
    
    if (fastAgents.length === 0) {
      throw new Error('No fast agents available');
    }
    
    const fastResults = [];
    const progressCallback = this.progressCallbacks.get(analysisId);
    
    // Execute fast agents in parallel with streaming
    const fastPromises = fastAgents.map(async (agentInfo) => {
      const { id, agent } = agentInfo;
      
      try {
        const result = await agent.analyze(content, {
          taskComplexity: 'low', // Fast processing
          urgency: options.urgency,
          costBudget: options.budget,
          streaming: true,
          onProgress: progressCallback ? (progress) => {
            this.notifyProgress(analysisId, {
              ...progress,
              agentId: id,
              stage: 'fast_streaming',
              type: 'fast_insight'
            });
          } : null,
          additionalContext: {
            contentType: options.contentType,
            progressiveMode: true,
            analysisPhase: 'fast'
          }
        });
        
        return { agentId: id, result, success: true, processingTime: 'fast' };
        
      } catch (error) {
        console.warn(`Fast agent ${id} failed:`, error.message);
        return { agentId: id, error: error.message, success: false };
      }
    });
    
    // Wait for all fast agents (with timeout)
    let fastAgentResults;
    try {
      fastAgentResults = await Promise.race([
        Promise.allSettled(fastPromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Fast phase timeout after ${this.config.fastResponseTimeout}ms`)), this.config.fastResponseTimeout)
        )
      ]);
    } catch (error) {
      console.error('Fast phase timeout occurred. Fast agents status:', {
        selectedFastAgents: fastAgents.map(agentInfo => ({ id: agentInfo.id, agent: agentInfo.agent?.name })),
        timeout: this.config.fastResponseTimeout,
        content_length: content?.length || 0,
        promisesLength: fastPromises.length
      });
      
      // Instead of throwing, let's wait a bit more and collect what we can
      console.log('Attempting to collect partial results from fast agents...');
      try {
        fastAgentResults = await Promise.allSettled(fastPromises);
        console.log('Successfully collected partial fast agent results');
      } catch (partialError) {
        console.error('Failed to collect even partial results:', partialError);
        throw new Error(`Fast phase completely failed: ${error.message}`);
      }
    }
    
    // Process successful fast results
    const successfulFastResults = fastAgentResults
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value);
    
    const failedFastResults = fastAgentResults
      .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
    
    if (failedFastResults.length > 0) {
      console.warn('Some fast agents failed:', failedFastResults.map(r => 
        r.status === 'rejected' ? r.reason?.message : r.value?.error
      ));
    }
    
    if (successfulFastResults.length === 0) {
      throw new Error('No fast agents completed successfully');
    }
    
    // Aggregate fast results
    const aggregatedFast = this.aggregateResults(successfulFastResults);
    
    return {
      ...aggregatedFast,
      analysisPhase: 'fast',
      processingTime: Date.now() - this.activeAnalyses.get(analysisId).startTime,
      agentCount: successfulFastResults.length
    };
  }
  
  /**
   * Execute research agents in background
   */
  async executeResearchPhase(analysisId, content, options) {
    this.updateAnalysisState(analysisId, 'research_phase');
    
    // Select research agents
    const researchAgents = this.selectResearchAgents(content, options);
    
    if (researchAgents.length === 0) {
      return []; // No research agents available
    }
    
    const progressCallback = this.progressCallbacks.get(analysisId);
    
    // Execute research agents with longer timeout
    const researchPromises = researchAgents.map(async (agentInfo) => {
      const { id, agent } = agentInfo;
      
      try {
        const result = await agent.analyze(content, {
          taskComplexity: 'high', // Thorough research
          urgency: options.urgency,
          costBudget: options.budget,
          streaming: true,
          onProgress: progressCallback ? (progress) => {
            this.notifyProgress(analysisId, {
              ...progress,
              agentId: id,
              stage: 'research_streaming',
              type: 'research_insight'
            });
          } : null,
          additionalContext: {
            contentType: options.contentType,
            progressiveMode: true,
            analysisPhase: 'research'
          }
        });
        
        return { agentId: id, result, success: true, processingTime: 'research' };
        
      } catch (error) {
        console.warn(`Research agent ${id} failed:`, error.message);
        return { agentId: id, error: error.message, success: false };
      }
    });
    
    // Wait for research agents with timeout
    const researchResults = await Promise.race([
      Promise.allSettled(researchPromises),
      new Promise(resolve => 
        setTimeout(() => resolve([]), this.config.researchTimeout)
      )
    ]);
    
    // Process successful research results
    return researchResults
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value);
  }
  
  /**
   * Select fast response agents
   */
  selectFastAgents(content, options) {
    const availableAgents = Array.from(this.agents.entries());
    
    let filteredAgents = availableAgents
      .filter(([id, agent]) => agent.defaultTier === 'fast');
    
    console.log('Fast agents before filtering by requestedAgents:', filteredAgents.map(([id]) => id));
    console.log('requestedAgents:', options.requestedAgents);
    
    // If specific agents requested, filter to only those
    if (options.requestedAgents && options.requestedAgents.length > 0) {
      filteredAgents = filteredAgents
        .filter(([id, agent]) => options.requestedAgents.includes(id));
    }
    
    const selectedAgents = filteredAgents
      .map(([id, agent]) => ({ id, agent }))
      .slice(0, options.maxParallelAgents || 3);
    
    console.log('Selected fast agents:', selectedAgents.map(a => a.id));
    return selectedAgents;
  }
  
  /**
   * Select research agents
   */
  selectResearchAgents(content, options) {
    const availableAgents = Array.from(this.agents.entries());
    
    let filteredAgents = availableAgents
      .filter(([id, agent]) => agent.defaultTier !== 'fast');
    
    // If specific agents requested, filter to only those
    if (options.requestedAgents && options.requestedAgents.length > 0) {
      filteredAgents = filteredAgents
        .filter(([id, agent]) => options.requestedAgents.includes(id));
    }
    
    return filteredAgents
      .map(([id, agent]) => ({ id, agent }))
      .slice(0, options.maxParallelAgents || 2);
  }
  
  /**
   * Enhance fast results with research results
   */
  async enhanceWithResearchResults(analysisId, fastResults, researchResults) {
    if (researchResults.length === 0) {
      this.finalizeAnalysis(analysisId, fastResults);
      return;
    }
    
    this.updateAnalysisState(analysisId, 'enhancing');
    
    try {
      // Combine fast and research results intelligently
      const enhancedResults = this.combineResults(fastResults, researchResults);
      
      // Update analysis with enhanced results
      this.updateAnalysisState(analysisId, 'enhanced', { enhancedResults });
      
      // Notify about enhancement
      const analysis = this.activeAnalyses.get(analysisId);
      if (analysis?.callbacks.onEnhancementAvailable) {
        analysis.callbacks.onEnhancementAvailable({
          analysisId,
          results: enhancedResults,
          stage: 'enhanced',
          improvements: this.calculateImprovements(fastResults, enhancedResults)
        });
      }
      
      this.finalizeAnalysis(analysisId, enhancedResults);
      
    } catch (error) {
      console.warn('Enhancement failed:', error);
      this.finalizeAnalysis(analysisId, fastResults);
    }
  }
  
  /**
   * Combine fast and research results intelligently
   */
  combineResults(fastResults, researchResults) {
    const combined = {
      ...fastResults,
      insights: [...(fastResults.insights || [])],
      analysisPhase: 'enhanced',
      enhancementSources: []
    };
    
    // Add research insights
    for (const researchResult of researchResults) {
      if (researchResult.result.insights) {
        // Mark research insights as enhancements
        const enhancedInsights = researchResult.result.insights.map(insight => ({
          ...insight,
          enhancement: true,
          enhancementType: 'research_depth',
          sourceAgent: researchResult.agentId
        }));
        
        combined.insights.push(...enhancedInsights);
        combined.enhancementSources.push(researchResult.agentId);
      }
    }
    
    // Re-sort insights by priority and confidence
    combined.insights.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority] || 1;
      const bPriority = priorityWeight[b.priority] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return (b.confidence || 0.5) - (a.confidence || 0.5);
    });
    
    // Update aggregate metrics
    combined.confidence = this.calculateCombinedConfidence(fastResults, researchResults);
    combined.totalAgents = (fastResults.agentCount || 0) + researchResults.length;
    
    return combined;
  }
  
  /**
   * Calculate improvements from enhancement
   */
  calculateImprovements(fastResults, enhancedResults) {
    const improvements = {
      insightCount: (enhancedResults.insights?.length || 0) - (fastResults.insights?.length || 0),
      confidenceImprovement: (enhancedResults.confidence || 0.5) - (fastResults.confidence || 0.5),
      newCategories: this.findNewCategories(fastResults, enhancedResults),
      enhancedCapabilities: ['research_depth', 'evidence_validation', 'expert_perspectives']
    };
    
    return improvements;
  }
  
  /**
   * Find new insight categories from research
   */
  findNewCategories(fastResults, enhancedResults) {
    const fastCategories = new Set(
      (fastResults.insights || []).map(i => i.type)
    );
    const enhancedCategories = new Set(
      (enhancedResults.insights || []).map(i => i.type)
    );
    
    return [...enhancedCategories].filter(cat => !fastCategories.has(cat));
  }
  
  /**
   * Calculate combined confidence score
   */
  calculateCombinedConfidence(fastResults, researchResults) {
    const fastConfidence = fastResults.confidence || 0.5;
    const researchConfidences = researchResults
      .map(r => r.result.confidence || 0.5)
      .filter(c => c > 0);
    
    if (researchConfidences.length === 0) {
      return fastConfidence;
    }
    
    const avgResearchConfidence = researchConfidences.reduce((a, b) => a + b, 0) / researchConfidences.length;
    
    // Weighted combination favoring research for higher confidence
    return (fastConfidence * 0.3) + (avgResearchConfidence * 0.7);
  }
  
  /**
   * Update analysis state
   */
  updateAnalysisState(analysisId, stage, data = {}) {
    const analysis = this.activeAnalyses.get(analysisId);
    if (analysis) {
      analysis.stage = stage;
      Object.assign(analysis, data);
    }
  }
  
  /**
   * Notify progress callback
   */
  notifyProgress(analysisId, progressData) {
    const callback = this.progressCallbacks.get(analysisId);
    if (callback) {
      callback({
        ...progressData,
        analysisId,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Finalize analysis and clean up
   */
  finalizeAnalysis(analysisId, finalResults) {
    const analysis = this.activeAnalyses.get(analysisId);
    
    if (analysis?.callbacks.onComplete) {
      analysis.callbacks.onComplete({
        analysisId,
        results: finalResults,
        stage: 'complete',
        totalProcessingTime: Date.now() - analysis.startTime
      });
    }
    
    this.updateAnalysisState(analysisId, 'complete', { finalResults });
    
    // Clean up after delay to allow final callbacks
    setTimeout(() => {
      this.activeAnalyses.delete(analysisId);
      this.progressCallbacks.delete(analysisId);
      this.enhancementQueue.delete(analysisId);
    }, 5000);
  }
  
  /**
   * Generate unique analysis ID
   */
  generateAnalysisId() {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get active analysis status
   */
  getAnalysisStatus(analysisId) {
    return this.activeAnalyses.get(analysisId);
  }
  
  /**
   * Cancel active analysis
   */
  cancelAnalysis(analysisId) {
    const analysis = this.activeAnalyses.get(analysisId);
    if (analysis) {
      this.updateAnalysisState(analysisId, 'cancelled');
      this.activeAnalyses.delete(analysisId);
      this.progressCallbacks.delete(analysisId);
      this.enhancementQueue.delete(analysisId);
      return true;
    }
    return false;
  }
  
  /**
   * Get system performance metrics
   */
  getSystemMetrics() {
    return {
      ...this.getPerformanceMetrics(),
      progressiveEnhancement: {
        activeAnalyses: this.activeAnalyses.size,
        avgFastResponseTime: 1200, // Would be calculated from actual data
        avgEnhancementTime: 15000,
        enhancementSuccessRate: 0.87,
        maxConcurrentAnalyses: this.config.maxConcurrentAnalyses
      }
    };
  }
}

export default ProgressiveEnhancementManager;