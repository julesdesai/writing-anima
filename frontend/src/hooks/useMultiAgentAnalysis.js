/**
 * React Hook for Multi-Agent Writing Analysis
 * Provides seamless integration with the new multi-agent system
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { UserMultiAgentSystem } from '../agents/UserMultiAgentSystem';

export const useMultiAgentAnalysis = (options = {}) => {
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fastResults, setFastResults] = useState(null);
  const [enhancedResults, setEnhancedResults] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  
  // Configuration
  const {
    enableProgressiveEnhancement = true,
    defaultUrgency = 'normal',
    defaultBudget = 'standard',
    autoAnalyze = false,
    debounceMs = 500,
    maxHistorySize = 10,
    enableFallback = true
  } = options;
  
  // Refs for managing state
  const currentAnalysisRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const systemInitializedRef = useRef(false);
  
  // Initialize the multi-agent system
  useEffect(() => {
    const initializeSystem = async () => {
      if (systemInitializedRef.current) return;
      
      try {
        const multiAgentSystem = new UserMultiAgentSystem();
        await multiAgentSystem.initialize();
        setSystem(multiAgentSystem);
        systemInitializedRef.current = true;
      } catch (error) {
        console.error('Failed to initialize multi-agent system:', error);
        setError(error);
      }
    };
    
    initializeSystem();
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (currentAnalysisRef.current) {
        system?.orchestrator?.cancelAnalysis(currentAnalysisRef.current);
      }
    };
  }, [system]);
  
  /**
   * Main analysis function
   */
  const analyze = useCallback(async (content, analysisOptions = {}) => {
    if (!system || !content?.trim()) {
      return null;
    }
    
    // Cancel previous analysis if running
    if (currentAnalysisRef.current) {
      system.orchestrator.cancelAnalysis(currentAnalysisRef.current);
    }
    
    setLoading(true);
    setError(null);
    setProgress(null);
    
    const analysisConfig = {
      urgency: analysisOptions.urgency || defaultUrgency,
      budget: analysisOptions.budget || defaultBudget,
      thoroughness: analysisOptions.thoroughness,
      requestedAgents: analysisOptions.requestedAgents,
      
      // Progressive enhancement callbacks
      onProgress: (progressData) => {
        setProgress(progressData);
      },
      
      onFastComplete: (data) => {
        setFastResults(data.results);
        setLoading(false); // Fast phase complete
        
        // Store in history
        addToHistory({
          content: content.substring(0, 100) + '...',
          timestamp: Date.now(),
          stage: 'fast_complete',
          results: data.results
        });
      },
      
      onEnhancementAvailable: (data) => {
        setEnhancedResults(data.results);
        
        // Update history with enhanced results
        setAnalysisHistory(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              stage: 'enhanced',
              results: data.results,
              improvements: data.improvements
            };
          }
          return updated;
        });
      },
      
      onComplete: (data) => {
        setEnhancedResults(data.results);
        setProgress(null);
        currentAnalysisRef.current = null;
        
        // Final history update
        setAnalysisHistory(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              stage: 'complete',
              results: data.results,
              totalProcessingTime: data.totalProcessingTime
            };
          }
          return updated;
        });
      }
    };
    
    try {
      const result = await system.analyzeContent(content, analysisConfig);
      currentAnalysisRef.current = result.analysisId;
      
      // Set the results in the hook state for UI consumption
      console.log('[useMultiAgentAnalysis] Setting results:', result);
      setFastResults(result);
      setLoading(false);
      
      return result;
      
    } catch (error) {
      console.error('Analysis failed:', error);
      setError(error);
      setLoading(false);
      
      // Fallback to legacy system if enabled
      if (enableFallback) {
        console.warn('Multi-agent analysis failed, falling back to legacy system. Agent toggles will not be respected in fallback mode.');
        return await fallbackToLegacyAnalysis(content, analysisOptions);
      }
      
      throw error;
    }
  }, [system, defaultUrgency, defaultBudget, enableFallback]);
  
  /**
   * Debounced analysis for real-time typing
   */
  const analyzeDebounced = useCallback((content, analysisOptions = {}) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      analyze(content, {
        ...analysisOptions,
        urgency: 'realtime' // Override for real-time analysis
      });
    }, debounceMs);
  }, [analyze, debounceMs]);
  
  /**
   * Quick analysis (fast agents only)
   */
  const quickAnalyze = useCallback(async (content) => {
    return await analyze(content, {
      urgency: 'realtime',
      budget: 'minimal'
    });
  }, [analyze]);
  
  /**
   * Thorough analysis (all agents)
   */
  const thoroughAnalyze = useCallback(async (content) => {
    return await analyze(content, {
      urgency: 'low',
      budget: 'premium',
      thoroughness: 0.9
    });
  }, [analyze]);
  
  /**
   * Fallback to legacy analysis system
   */
  const fallbackToLegacyAnalysis = useCallback(async (content, options) => {
    try {
      // Import legacy agents
      const { analyzeTextStream: intellectualStream } = await import('../agents/intellectualCritic');
      const { analyzeTextStream: stylisticStream } = await import('../agents/stylisticCritic');
      
      const legacyResults = {
        insights: [],
        confidence: 0.6,
        source: 'legacy_fallback'
      };
      
      // Run legacy agents
      await Promise.allSettled([
        intellectualStream(content, options.purpose, 'local', (feedback) => {
          legacyResults.insights.push({
            ...feedback,
            agent: 'Legacy Intellectual Critic',
            fallback: true
          });
        }),
        stylisticStream(content, options.purpose, 'local', (feedback) => {
          legacyResults.insights.push({
            ...feedback,
            agent: 'Legacy Stylistic Critic', 
            fallback: true
          });
        })
      ]);
      
      setFastResults(legacyResults);
      return { results: legacyResults, stage: 'fallback_complete' };
      
    } catch (fallbackError) {
      console.error('Fallback analysis also failed:', fallbackError);
      throw new Error('Both multi-agent and legacy analysis failed');
    }
  }, []);
  
  /**
   * Cancel current analysis
   */
  const cancelAnalysis = useCallback(() => {
    if (currentAnalysisRef.current && system) {
      system.orchestrator.cancelAnalysis(currentAnalysisRef.current);
      currentAnalysisRef.current = null;
      setLoading(false);
      setProgress(null);
    }
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, [system]);
  
  /**
   * Process user feedback
   */
  const provideFeedback = useCallback((feedback) => {
    if (system) {
      system.processUserFeedback(feedback);
    }
  }, [system]);
  
  /**
   * Get system performance metrics
   */
  const getMetrics = useCallback(() => {
    return system?.getSystemMetrics();
  }, [system]);
  
  /**
   * Helper function to add to history
   */
  const addToHistory = useCallback((analysisData) => {
    setAnalysisHistory(prev => {
      const updated = [analysisData, ...prev];
      return updated.slice(0, maxHistorySize);
    });
  }, [maxHistorySize]);
  
  /**
   * Clear analysis history
   */
  const clearHistory = useCallback(() => {
    setAnalysisHistory([]);
  }, []);
  
  /**
   * Get current results (enhanced if available, otherwise fast)
   */
  const getCurrentResults = useCallback(() => {
    return enhancedResults || fastResults;
  }, [enhancedResults, fastResults]);
  
  /**
   * Check if enhancement is in progress
   */
  const isEnhancing = useCallback(() => {
    return Boolean(fastResults && !enhancedResults && currentAnalysisRef.current);
  }, [fastResults, enhancedResults, currentAnalysisRef.current]);
  
  return {
    // Core analysis functions
    analyze,
    analyzeDebounced,
    quickAnalyze,
    thoroughAnalyze,
    cancelAnalysis,
    
    // Results and state
    results: getCurrentResults(),
    fastResults,
    enhancedResults,
    loading,
    error,
    progress,
    
    // Analysis history
    analysisHistory,
    clearHistory,
    
    // System state
    systemReady: Boolean(system),
    isEnhancing: isEnhancing(),
    
    // User feedback and metrics
    provideFeedback,
    getMetrics,
    
    // Utility functions
    getCurrentResults,
    
    // System reference for advanced usage
    system
  };
};

export default useMultiAgentAnalysis;