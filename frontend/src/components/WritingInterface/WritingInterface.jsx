import React, { useState, useEffect, useCallback, useRef } from 'react';
import WritingArea from '../WritingArea';
import FeedbackPanel from '../FeedbackPanel';
import PromptCustomizationPanel from '../PromptCustomization/PromptCustomizationPanel';
import APITestPanel from '../Debug/APITestPanel';
import ThoughtProcess from '../ThoughtProcess/ThoughtProcess';
import { useWritingAnalysis } from '../../hooks/useWritingAnalysis';
import { useMultiAgentAnalysis } from '../../hooks/useMultiAgentAnalysis';
import { useUnifiedAgentCustomization } from '../../hooks/useUnifiedAgentCustomization';
import UnifiedAgentCustomizationPanel from '../AgentCustomization/UnifiedAgentCustomizationPanel';
import feedbackHistoryService from '../../services/feedbackHistoryService';
import animaService from '../../services/animaService';
import { useAuth } from '../../contexts/AuthContext';

const WritingInterface = ({ purpose, content, onContentChange, feedback, setFeedback, onBackToPurpose, project, writingCriteria, isMonitoring, onToggleMonitoring, onFeedbackGenerated }) => {
  const { currentUser } = useAuth();
  const [hoveredFeedback, setHoveredFeedback] = useState(null);
  const [useMultiAgentSystem, setUseMultiAgentSystem] = useState(false); // Disabled - using flow-based agents only
  const [multiAgentFeedback, setMultiAgentFeedback] = useState([]);
  const [resolvedFeedback, setResolvedFeedback] = useState([]); // Separate storage for resolved feedback
  const [showResolvedFeedback, setShowResolvedFeedback] = useState(false); // Toggle for viewing resolved
  const [showAPITest, setShowAPITest] = useState(false);
  const [showAgentCustomization, setShowAgentCustomization] = useState(false);
  const [isExecutingFlow, setIsExecutingFlow] = useState(false);
  const [availablePersonas, setAvailablePersonas] = useState([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [thoughtSteps, setThoughtSteps] = useState([]);
  const isExecutingRef = useRef(false);
  
  // Legacy writing analysis hook - DISABLED (using flow-based agents only)
  const legacyAnalysis = useWritingAnalysis(content, purpose, false, writingCriteria); // Always disabled
  
  // New multi-agent analysis hook
  const multiAgentAnalysis = useMultiAgentAnalysis();
  
  // Unified agent customization hook
  const agentCustomization = useUnifiedAgentCustomization();
  
  // Multi-agent feedback management functions
  const handleMultiAgentDismiss = (feedbackId) => {
    // Find the feedback item before removing it
    const feedbackItem = multiAgentFeedback.find(item => item.id === feedbackId);

    if (feedbackItem) {
      // Record this as rejected feedback for agent learning
      feedbackHistoryService.recordRejected(feedbackItem);
      console.log('[WritingInterface] Recorded dismissed feedback for learning:', feedbackItem.title);
    }

    // Remove from local state
    setMultiAgentFeedback(prev => prev.filter(item => item.id !== feedbackId));

    // IMPORTANT: Also remove from parent state to prevent reappearing on re-render
    if (setFeedback) {
      setFeedback(prev => prev.filter(item => item.id !== feedbackId));
    }
  };

  const handleMultiAgentResolve = (feedbackId) => {
    // Move resolved feedback to separate storage
    setMultiAgentFeedback(prev => {
      const resolvedItem = prev.find(item => item.id === feedbackId);
      if (resolvedItem) {
        // Record this as accepted feedback for agent learning
        feedbackHistoryService.recordAccepted(resolvedItem);
        console.log('[WritingInterface] Recorded resolved feedback for learning:', resolvedItem.title);

        // Add to resolved storage with timestamp
        setResolvedFeedback(prevResolved => [
          ...prevResolved,
          { ...resolvedItem, status: 'resolved', resolvedAt: new Date().toISOString() }
        ]);
      }
      // Remove from active feedback
      return prev.filter(item => item.id !== feedbackId);
    });

    // IMPORTANT: Also remove from parent state to prevent reappearing on re-render
    if (setFeedback) {
      setFeedback(prev => prev.filter(item => item.id !== feedbackId));
    }
  };

  const handleMultiAgentClear = () => {
    setMultiAgentFeedback([]);

    // IMPORTANT: Also clear parent state to prevent reappearing on re-render
    if (setFeedback) {
      setFeedback([]);
    }
  };

  // Load available personas
  useEffect(() => {
    if (currentUser) {
      animaService.getPersonas(currentUser.uid)
        .then(personas => {
          setAvailablePersonas(personas);
          // Auto-select first persona with corpus
          const personaWithCorpus = personas.find(p => p.chunk_count > 0);
          if (personaWithCorpus && !selectedPersonaId) {
            setSelectedPersonaId(personaWithCorpus.id);
          }
        })
        .catch(error => console.error('Error loading personas:', error));
    }
  }, [currentUser]);

  // Handle Anima analysis with streaming
  const handleExecuteFlowClick = useCallback(async () => {
    // Prevent double-clicks using ref for immediate check
    if (isExecutingRef.current) {
      console.log('[WritingInterface] Already executing, ignoring click');
      return;
    }

    if (!selectedPersonaId) {
      alert('Please select an anima first. Go to the Animas tab to create one.');
      return;
    }

    if (!content || content.trim().length === 0) {
      alert('Please write some content first.');
      return;
    }

    // Set loading state immediately and synchronously
    isExecutingRef.current = true;
    setIsExecutingFlow(true);
    setAnalysisStatus('Initializing...');
    setThoughtSteps([]); // Clear previous thought steps

    console.log('[WritingInterface] Starting Anima analysis...', {
      personaId: selectedPersonaId,
      contentLength: content.length,
      userId: currentUser.uid
    });

    let statusClearTimeout = null;

    try {
      const selectedPersona = availablePersonas.find(p => p.id === selectedPersonaId);
      const feedbackItems = [];

      // Convert purpose to string if it's an object
      const purposeText = typeof purpose === 'object' && purpose !== null
        ? (purpose.topic || purpose.context || '')
        : (purpose || '');

      // Use streaming analysis
      await animaService.streamAnalysis(
        content,
        selectedPersonaId,
        currentUser.uid,
        {
          purpose: purposeText,
          criteria: writingCriteria?.criteria || [],
          feedbackHistory: feedback.slice(-3) // Last 3 feedback items
        },
        {
          onStatus: (status) => {
            const statusMsg = status.tool
              ? `${status.message} (tool: ${status.tool})`
              : status.message;
            console.log('[Anima Status]:', statusMsg);
            setAnalysisStatus(statusMsg);

            // Determine step type based on message content
            let stepType = 'status';
            if (status.tool === 'search_corpus' || statusMsg.includes('Searching')) {
              stepType = 'search';
            } else if (statusMsg.includes('Synthesizing') || statusMsg.includes('Analyzing')) {
              stepType = 'generate';
            } else if (statusMsg.includes('Complete') || statusMsg.includes('✓')) {
              stepType = 'complete';
            }

            // Add step to thought process
            setThoughtSteps(prev => [...prev, {
              type: stepType,
              message: status.message,
              details: status.tool ? `Tool: ${status.tool}` : null,
              timestamp: new Date().toISOString()
            }]);
          },
          onFeedback: (item) => {
            console.log('[Anima Feedback]:', item);
            // Add source and timestamp
            const enrichedItem = {
              ...item,
              source: 'anima',
              personaName: selectedPersona?.name || 'Unknown',
              timestamp: new Date().toISOString(),
              status: 'active'
            };
            feedbackItems.push(enrichedItem);

            // Update feedback in real-time
            if (onFeedbackGenerated) {
              onFeedbackGenerated([enrichedItem]);
            }

            // Clear any existing timeout
            if (statusClearTimeout) {
              clearTimeout(statusClearTimeout);
            }

            // Set timeout to clear status if completion message doesn't arrive
            // This prevents status from hanging indefinitely
            statusClearTimeout = setTimeout(() => {
              console.log('[Anima] Clearing status (no completion message received)');
              setAnalysisStatus(null);
              isExecutingRef.current = false;
              setIsExecutingFlow(false);
            }, 5000); // 5 seconds after last feedback item
          },
          onComplete: (result) => {
            console.log('[Anima Complete]:', result);

            // Clear the fallback timeout since we got completion
            if (statusClearTimeout) {
              clearTimeout(statusClearTimeout);
              statusClearTimeout = null;
            }

            // Clear execution state immediately
            isExecutingRef.current = false;
            setIsExecutingFlow(false);

            setAnalysisStatus(`Complete! Generated ${result.total_items} feedback items in ${result.processing_time.toFixed(1)}s`);

            setTimeout(() => {
              setAnalysisStatus(null);
            }, 3000);
          },
          onError: (error) => {
            console.error('[Anima Error]:', error);

            // Clear the fallback timeout on error
            if (statusClearTimeout) {
              clearTimeout(statusClearTimeout);
              statusClearTimeout = null;
            }

            // Clear execution state
            isExecutingRef.current = false;
            setIsExecutingFlow(false);

            alert(`Analysis failed: ${error.message}`);
            setAnalysisStatus(null);
          }
        }
      );

    } catch (error) {
      console.error('[WritingInterface] Anima analysis error:', error);
      alert(`Analysis error: ${error.message}`);
      setAnalysisStatus(null);

      // Clean up on catch
      if (statusClearTimeout) {
        clearTimeout(statusClearTimeout);
      }
      isExecutingRef.current = false;
      setIsExecutingFlow(false);
    }
    // Note: Don't clear execution state in finally - callbacks are async and will handle cleanup
  }, [selectedPersonaId, content, currentUser, purpose, writingCriteria, feedback, availablePersonas, onFeedbackGenerated]);

  // Choose which system to use based on feature flag
  // Sync feedback prop to local state for display
  // This ensures Anima execution results show up
  useEffect(() => {
    // Filter out any legacy agent feedback, only keep Anima feedback
    const animaFeedback = feedback.filter(f => f.source === 'anima' || f.source === 'flow');

    // Simply replace with new feedback
    // Dismissed items are gone forever and won't come back
    // Resolved items are in separate resolvedFeedback storage
    setMultiAgentFeedback(animaFeedback);
  }, [feedback]);

  // Clear any legacy feedback on mount
  useEffect(() => {
    console.log('[WritingInterface] Clearing legacy feedback on mount');
    if (setFeedback) {
      setFeedback(prev => {
        const flowOnly = prev.filter(f => f.source === 'flow');
        if (flowOnly.length !== prev.length) {
          console.log('[WritingInterface] Removed', prev.length - flowOnly.length, 'legacy feedback items');
        }
        return flowOnly;
      });
    }
  }, []); // Only on mount

  // Always use flow-based feedback system (no legacy agents)
  const currentAnalysis = {
    feedback: multiAgentFeedback,
    clearFeedback: handleMultiAgentClear,
    dismissSuggestion: handleMultiAgentDismiss,
    markSuggestionResolved: handleMultiAgentResolve,
    isEvaluating: false,
    isAnalyzing: false,
    runDocumentAnalysis: () => console.log('Legacy analysis disabled - use flow execution'),
    isDocumentAnalyzing: false
  };

  // NOTE: We don't sync feedback back to parent here because:
  // 1. New feedback is already sent via onFeedbackGenerated callback (line 155)
  // 2. Syncing here creates a circular dependency and infinite re-render loop
  // The useEffect at line 186 handles incoming feedback from parent -> local state

  // Always use current analysis feedback for display since it handles filtering correctly
  // Only use passed feedback for initial state synchronization
  const activeFeedback = currentAnalysis.feedback || [];
  const activeFeedbackSetter = setFeedback || (() => {});

  // Sync multi-agent results to local feedback state - DISABLED
  useEffect(() => {
    // Legacy multi-agent system disabled - using flow-based execution only
    console.log('[WritingInterface] Multi-agent system disabled, using flows');
  }, [useMultiAgentSystem, multiAgentAnalysis.results?.insights]);

  // Auto-analyze content with multi-agent system when monitoring is enabled
  // DISABLED: Now using flow-based execution instead
  useEffect(() => {
    // Legacy auto-analysis disabled - use flow execution instead
    console.log('Auto-analysis disabled - using flow execution');
  }, [content, isMonitoring, useMultiAgentSystem, purpose]);

  // Remove local handleToggleMonitoring since it's now passed as prop

  const handleFeedbackHover = (feedbackId) => {
    setHoveredFeedback(feedbackId);
  };

  const handleFeedbackLeave = () => {
    setHoveredFeedback(null);
  };


  const handleExploreFramework = (framework, keyAuthorities, suggestedResources) => {
    console.log('Framework exploration:', { framework, keyAuthorities, suggestedResources });
    // Optionally show a modal with framework information or navigate to resources
  };

  const handleJumpToText = (feedbackId) => {
    // Find the feedback item
    const feedbackItem = activeFeedback.find(f => f.id === feedbackId);
    if (feedbackItem && feedbackItem.positions && feedbackItem.positions.length > 0) {
      const position = feedbackItem.positions[0];
      // Trigger scroll by setting hovered feedback temporarily
      setHoveredFeedback(feedbackId);
      // Clear after scroll animation completes
      setTimeout(() => setHoveredFeedback(null), 2000);
    }
  };


  return (
    <>
      <div className="mx-auto px-2 py-3 space-y-3">
        {/* Anima Analysis Toolbar - Minimal */}
        <div className="obsidian-panel p-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-obsidian-accent-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-semibold text-obsidian-text-primary whitespace-nowrap">Anima</span>
              </div>
              <div className="flex-1 min-w-0">
                {availablePersonas.length > 0 ? (
                  <select
                    value={selectedPersonaId || ''}
                    onChange={(e) => setSelectedPersonaId(e.target.value)}
                    className="obsidian-input w-full max-w-xs"
                    disabled={isExecutingFlow}
                  >
                    <option value="">Select anima...</option>
                    {availablePersonas.map(persona => (
                      <option key={persona.id} value={persona.id}>
                        {persona.name} {persona.chunk_count === 0 ? '(empty)' : `· ${persona.chunk_count.toLocaleString()}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm text-obsidian-text-tertiary">No animas</span>
                )}
              </div>
            </div>
            <button
              onClick={handleExecuteFlowClick}
              disabled={isExecutingFlow || !content || !selectedPersonaId}
              className={`whitespace-nowrap ${
                isExecutingFlow || !content || !selectedPersonaId
                  ? 'obsidian-button bg-obsidian-bg text-obsidian-text-muted cursor-not-allowed'
                  : 'obsidian-button-primary'
              }`}
            >
              {isExecutingFlow ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Thinking
                </span>
              ) : (
                'Think'
              )}
            </button>
        </div>

        {/* Thought Process Display */}
        {thoughtSteps.length > 0 && (
          <ThoughtProcess
            steps={thoughtSteps}
            isAnalyzing={isExecutingFlow}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
        <div>
          <WritingArea
            content={content}
            onContentChange={onContentChange}
            autoFocus={true}
            feedback={activeFeedback.filter(item => !item.status || item.status === 'active')}
            hoveredFeedback={hoveredFeedback}
          />
        </div>

        <div>
          <FeedbackPanel
            feedback={activeFeedback}
            resolvedFeedback={resolvedFeedback}
            showResolved={showResolvedFeedback}
            onToggleResolved={() => setShowResolvedFeedback(!showResolvedFeedback)}
            isMonitoring={isMonitoring}
            onFeedbackHover={handleFeedbackHover}
            onFeedbackLeave={handleFeedbackLeave}
            hoveredFeedback={hoveredFeedback}
            onDismissSuggestion={currentAnalysis.dismissSuggestion}
            onMarkSuggestionResolved={currentAnalysis.markSuggestionResolved}
            isEvaluating={currentAnalysis.isEvaluating}
            isAnalyzing={currentAnalysis.isAnalyzing}
            onExploreFramework={handleExploreFramework}
            onJumpToText={handleJumpToText}
          />
        </div>
      </div>
      </div>

      {/* Unified Agent Customization Panel */}
      <UnifiedAgentCustomizationPanel
        isOpen={showAgentCustomization}
        onClose={() => setShowAgentCustomization(false)}
        initialTab="control" // Start with the control tab
        multiAgentSystem={multiAgentAnalysis.system}
        onAgentsUpdated={() => {
          console.log('Agents updated - analysis will use new configuration on next run');
        }}
      />

      {/* API Test Panel */}
      {showAPITest && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowAPITest(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl">
            <div className="flex h-full flex-col">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">API Configuration Test</h2>
                  <button
                    onClick={() => setShowAPITest(false)}
                    className="rounded-md p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <APITestPanel />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WritingInterface;