import { useState, useEffect, useRef } from 'react';
import { analyzeText as analyzeIntellectual, analyzeTextStream as analyzeIntellectualStream } from '../agents/intellectualCritic';
import { analyzeText as analyzeStylistic, analyzeTextStream as analyzeStylisticStream } from '../agents/stylisticCritic';
import { analyzeText as analyzeInquiryIntegration } from '../agents/inquiryIntegrationAgent';
import textChangeDetector from '../utils/textChangeDetector';
import suggestionEvaluator from '../services/suggestionEvaluator';
import inquiryComplexService from '../services/inquiryComplexService';
import { extractLocalContext, shouldTriggerLocalAnalysis } from '../utils/contextExtraction';

export const useWritingAnalysis = (content, purpose, isMonitoring, criteria = null) => {
  const [feedback, setFeedback] = useState([]);
  const [lastAnalyzedLength, setLastAnalyzedLength] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isDocumentAnalyzing, setIsDocumentAnalyzing] = useState(false);
  const previousContentRef = useRef('');
  const originalContentRef = useRef(''); // Content when suggestions were created
  const lastAnalyzedContentRef = useRef(''); // Content from last local analysis

  // Effect to handle text changes and update existing suggestions
  useEffect(() => {
    if (previousContentRef.current && previousContentRef.current !== content) {
      const changeAnalysis = textChangeDetector.analyzeChanges(content);
      
      if (changeAnalysis.type === 'update' && changeAnalysis.changes.length > 0) {
        setFeedback(currentFeedback => {
          // First update positions for all suggestions
          const updatedFeedback = textChangeDetector.updateSuggestionPositions(currentFeedback, changeAnalysis.changes);
          
          // Then identify suggestions that need AI evaluation
          const suggestionsNeedingEvaluation = updatedFeedback.filter(item => 
            item.status === 'active' && 
            textChangeDetector.needsAIEvaluation(item, changeAnalysis.changes)
          );

          // Queue AI evaluations for affected suggestions
          if (suggestionsNeedingEvaluation.length > 0 && !isEvaluating) {
            setIsEvaluating(true);
            
            // Process AI evaluations asynchronously
            Promise.all(
              suggestionsNeedingEvaluation.map(async (suggestion) => {
                try {
                  const evaluation = await suggestionEvaluator.queueForEvaluation(
                    suggestion,
                    originalContentRef.current,
                    content,
                    changeAnalysis.changes
                  );
                  
                  return {
                    suggestionId: suggestion.id,
                    evaluation
                  };
                } catch (error) {
                  console.error(`Failed to evaluate suggestion ${suggestion.id}:`, error);
                  return {
                    suggestionId: suggestion.id,
                    evaluation: {
                      status: 'active',
                      confidence: 0.1,
                      reasoning: 'Evaluation failed, keeping active'
                    }
                  };
                }
              })
            ).then(evaluationResults => {
              // Apply AI evaluation results
              setFeedback(prevFeedback => {
                return prevFeedback.map(item => {
                  const result = evaluationResults.find(r => r.suggestionId === item.id);
                  if (result) {
                    const { evaluation } = result;
                    
                    if (evaluation.status === 'resolved') {
                      return { 
                        ...item, 
                        status: 'resolved', 
                        resolvedAt: new Date(),
                        resolvedBy: 'ai',
                        aiEvaluation: evaluation
                      };
                    } else if (evaluation.status === 'retracted') {
                      return { 
                        ...item, 
                        status: 'retracted',
                        retractedReason: evaluation.reasoning,
                        aiEvaluation: evaluation
                      };
                    }
                    
                    // Keep as active but store AI evaluation for debugging
                    return { ...item, aiEvaluation: evaluation };
                  }
                  return item;
                });
              });
              
              setIsEvaluating(false);
            });
          }
          
          return updatedFeedback;
        });
      }
    }
    previousContentRef.current = content;
  }, [content, isEvaluating]);

  useEffect(() => {
    // Check if we should trigger analysis and what type
    if (!isMonitoring) return;
    
    const analysisDecision = shouldTriggerLocalAnalysis(content, lastAnalyzedContentRef.current, 30);
    
    console.log('Analysis decision:', analysisDecision);
    console.log('Content length:', content.length, 'Last analyzed length:', lastAnalyzedContentRef.current.length);
    
    if (!analysisDecision.shouldTrigger) {
      console.log('Analysis not triggered');
      return;
    }

    const timer = setTimeout(async () => {
      
      // Handle different analysis types
      if (analysisDecision.type === 'global') {
        // Large paste detected - run global analysis automatically
        console.log('🌍 GLOBAL ANALYSIS TRIGGERED - Large paste detected:', analysisDecision.addedChars, 'characters');
        
        // Set analyzing state for streaming indicator
        setIsAnalyzing(true);
        
        // Show brief notification that global analysis is being triggered
        setFeedback(prev => [...prev, {
          id: `auto-global-notice-${Date.now()}`,
          type: 'system',
          agent: 'System',
          severity: 'low',
          title: 'Large Text Addition Detected',
          feedback: `You pasted ${analysisDecision.addedChars} characters. Running comprehensive document analysis...`,
          suggestion: 'This will provide thorough feedback on your complete content.',
          positions: [{ start: 0, end: 50, text: content.substring(0, 50) }],
          timestamp: new Date(),
          status: 'active',
          isTemporary: true
        }]);
        
        // Run global analysis and remove the notification
        await runDocumentAnalysis();
        
        // Remove the temporary notification and turn off analyzing indicator
        setFeedback(prev => prev.filter(item => !item.isTemporary));
        setIsAnalyzing(false);
        
        lastAnalyzedContentRef.current = content;
      } else if (analysisDecision.type === 'local') {
        // Regular local analysis
        console.log('📍 LOCAL ANALYSIS TRIGGERED - Reason:', analysisDecision.reason);
        console.log('Starting local analysis - setting isAnalyzing to true');
        setIsAnalyzing(true);
        
        try {
          // Extract local context around recent changes
          const contextResult = extractLocalContext(content, lastAnalyzedContentRef.current);
          
          // Stream both critics concurrently
          const streamingFeedback = [];
          let completedStreams = 0;
          const totalStreams = 2; // intellectual + stylistic
          
          const handleStreamedFeedback = (feedbackItem) => {
            const processedItem = {
              id: `${feedbackItem.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: feedbackItem.type,
              agent: feedbackItem.agent,
              severity: feedbackItem.severity || 'medium',
              title: feedbackItem.title || 'Analysis',
              feedback: feedbackItem.feedback || feedbackItem.message || 'Analysis provided',
              suggestion: feedbackItem.suggestion || '',
              positions: feedbackItem.positions || [{ start: 0, end: 100 }],
              timestamp: new Date(),
              status: 'active'
            };
            
            streamingFeedback.push(processedItem);
            
            // Update UI immediately with new feedback
            setFeedback(prev => {
              const combined = [...prev, processedItem];
              return combined;
            });
          };
          
          const completeStream = () => {
            completedStreams++;
            console.log(`Stream completed: ${completedStreams}/${totalStreams}`);
            if (completedStreams === totalStreams) {
              // All streams completed
              console.log('All streams completed - setting isAnalyzing to false');
              setLastAnalyzedLength(content.length);
              lastAnalyzedContentRef.current = content;
              
              // Store current content as original content for new suggestions
              if (!originalContentRef.current) {
                originalContentRef.current = content;
              }
              
              // Turn off analyzing indicator
              setIsAnalyzing(false);
            }
          };
          
          // Start both streams concurrently
          Promise.all([
            analyzeIntellectualStream(contextResult.contextText, purpose, 'local', handleStreamedFeedback, criteria)
              .then(() => completeStream())
              .catch(error => {
                console.error('Intellectual streaming failed:', error);
                completeStream();
              }),
            analyzeStylisticStream(contextResult.contextText, purpose, 'local', handleStreamedFeedback, criteria)
              .then(() => completeStream())
              .catch(error => {
                console.error('Stylistic streaming failed:', error);
                completeStream();
              })
          ]);

        const newFeedback = []; // Keep this for compatibility with inquiry integration below

        // Analyze with inquiry integration agent (less frequent, only for substantial content)
        if (content.length > 200 && content.length % 500 < 100) { // Throttle this agent
          const existingComplexes = inquiryComplexService.getAllComplexes();
          const inquiryInsights = await analyzeInquiryIntegration(content, purpose, existingComplexes);
          
          if (inquiryInsights && inquiryInsights.length > 0) {
            inquiryInsights.forEach((insight, index) => {
              const feedbackItem = {
                id: `inquiry-${Date.now()}-${index}`,
                type: insight.type || 'inquiry_integration',
                agent: 'Inquirys Integration',
                severity: insight.priority === 'high' ? 'high' : insight.priority === 'medium' ? 'medium' : 'low',
                title: insight.title,
                feedback: insight.message,
                suggestion: insight.action?.suggestion || '',
                positions: [{ start: 0, end: Math.min(content.length, 200) }],
                timestamp: new Date(),
                status: 'active',
                actionData: insight.action // Store action data for special handling
              };
              newFeedback.push(feedbackItem);
            });
          }
        }

          // Handle inquiry integration feedback separately (non-streaming for now)
          if (newFeedback.length > 0) {
            setFeedback(prev => {
              const combined = [...prev, ...newFeedback];
              return combined;
            });
          }
        } catch (error) {
          console.error('Local analysis failed:', error);
          setIsAnalyzing(false);
        }
        // Note: setIsAnalyzing(false) is also called in completeStream() after all streams finish
      }
    }, analysisDecision.type === 'global' ? 500 : 1000); // Faster for global analysis

    return () => clearTimeout(timer);
  }, [content, isMonitoring, purpose]); // Removed lastAnalyzedLength to prevent infinite loop

  // Document-level analysis function (called manually)
  const runDocumentAnalysis = async () => {
    if (isDocumentAnalyzing || !content || content.length < 100) {
      return;
    }

    setIsDocumentAnalyzing(true);
    setIsAnalyzing(true); // Show streaming indicator for manual document analysis too
    
    try {
      console.log('📄 RUNNING DOCUMENT ANALYSIS on', content.length, 'characters');
      console.log('This should analyze the entire document and provide comprehensive feedback');
      
      // Clear any previous document-level feedback before starting new analysis
      setFeedback(prev => prev.filter(item => item.analysisMode !== 'document'));
      
      // Stream both critics concurrently for document analysis
      let completedDocStreams = 0;
      const totalDocStreams = 2; // intellectual + stylistic
      
      const handleDocumentStreamedFeedback = (feedbackItem) => {
        const processedItem = {
          id: `doc-${feedbackItem.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: feedbackItem.type,
          agent: feedbackItem.type === 'intellectual' ? 'Dialectical Critic' : 'Style Guide',
          severity: feedbackItem.severity || 'medium',
          title: feedbackItem.title || 'Analysis',
          feedback: feedbackItem.feedback || feedbackItem.message || 'Analysis provided',
          suggestion: feedbackItem.suggestion || '',
          positions: feedbackItem.positions || [{ start: 0, end: 100 }],
          timestamp: new Date(),
          status: 'active',
          analysisMode: 'document'
        };
        
        // Update UI immediately with new document feedback
        setFeedback(prev => {
          // Just add the new feedback item - streaming means we get individual items
          return [...prev, processedItem];
        });
      };
      
      const completeDocStream = () => {
        completedDocStreams++;
        if (completedDocStreams === totalDocStreams) {
          console.log('Document analysis streaming completed');
        }
      };
      
      // Start both document streams concurrently
      await Promise.all([
        analyzeIntellectualStream(content, purpose, 'document', handleDocumentStreamedFeedback, criteria)
          .then(() => completeDocStream())
          .catch(error => {
            console.error('Document intellectual streaming failed:', error);
            completeDocStream();
          }),
        analyzeStylisticStream(content, purpose, 'document', handleDocumentStreamedFeedback, criteria)
          .then(() => completeDocStream())
          .catch(error => {
            console.error('Document stylistic streaming failed:', error);
            completeDocStream();
          })
      ]);
    } catch (error) {
      console.error('Document analysis failed:', error);
    } finally {
      setIsDocumentAnalyzing(false);
      setIsAnalyzing(false); // Turn off streaming indicator
    }
  };

  const clearFeedback = () => {
    setFeedback([]);
    setLastAnalyzedLength(0);
    textChangeDetector.previousContent = '';
    previousContentRef.current = '';
    originalContentRef.current = '';
    lastAnalyzedContentRef.current = '';
    suggestionEvaluator.clearCache();
  };

  const dismissSuggestion = (suggestionId) => {
    setFeedback(prev => prev.map(item => 
      item.id === suggestionId 
        ? { ...item, status: 'dismissed', dismissedAt: new Date() }
        : item
    ));
  };

  const markSuggestionResolved = (suggestionId) => {
    setFeedback(prev => prev.map(item => 
      item.id === suggestionId 
        ? { ...item, status: 'resolved', resolvedAt: new Date() }
        : item
    ));
  };

  // Filter feedback to only show active suggestions (not retracted, dismissed, or resolved)
  const activeFeedback = feedback.filter(item => 
    !item.status || item.status === 'active'
  );


  return {
    feedback: activeFeedback, // Return filtered active feedback
    allFeedback: feedback, // For debugging or showing history
    clearFeedback,
    dismissSuggestion,
    markSuggestionResolved,
    isAnalyzing,
    isEvaluating,
    runDocumentAnalysis,
    isDocumentAnalyzing
  };
};