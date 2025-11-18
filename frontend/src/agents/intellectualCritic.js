import aiService from '../services/aiService';
import { intellectualCriticPrompt } from '../prompts';
import { findTextSnippets } from '../utils/textMatching';
import dynamicCriteriaService from '../services/dynamicCriteriaService';

/**
 * Stream intellectual analysis with progressive feedback
 * @param {string} content - Text to analyze
 * @param {string} purpose - Writing purpose
 * @param {string} mode - Analysis mode ('local' or 'document')
 * @param {function} onFeedback - Callback for each complete feedback item
 */
export const analyzeTextStream = async (content, purpose, mode = 'local', onFeedback, criteria = null) => {
  if (!content || content.length < 50) {
    return null;
  }

  try {
    // Format criteria for prompt if provided
    const formattedCriteria = criteria ? dynamicCriteriaService.formatForPrompt(criteria) : null;
    const prompt = intellectualCriticPrompt(content, purpose, mode, formattedCriteria);
    const processedFeedback = new Set(); // Track processed feedback to avoid duplicates
    
    await aiService.callAPIStream(
      prompt,
      (chunk, completeObjects, fullText) => {
        // Process each complete JSON object
        completeObjects.forEach(obj => {
          try {
            const feedbackArray = Array.isArray(obj) ? obj : [obj];
            
            feedbackArray.forEach(item => {
              // Create unique ID for this feedback item
              const feedbackId = `${item.title}-${item.feedback?.substring(0, 50)}`;
              
              if (!processedFeedback.has(feedbackId)) {
                processedFeedback.add(feedbackId);
                
                // Process text snippets like in the original function
                const result = [];
                
                if (item.textSnippets && Array.isArray(item.textSnippets)) {
                  const matches = findTextSnippets(content, item.textSnippets, 0.75);
                  
                  if (matches.length > 0) {
                    matches.forEach((match, index) => {
                      result.push({
                        ...item,
                        positions: [{
                          start: match.start,
                          end: match.end,
                          text: match.text,
                          similarity: match.similarity,
                          originalSnippet: match.originalSnippet
                        }],
                        title: matches.length > 1 ? `${item.title} (Instance ${index + 1})` : item.title
                      });
                    });
                  } else {
                    result.push({
                      ...item,
                      positions: [{ start: 0, end: 50, text: content.substring(0, 50) }]
                    });
                  }
                } else if (item.position && !item.positions) {
                  result.push({
                    ...item,
                    positions: [{
                      start: item.position.start,
                      end: item.position.end,
                      text: content.substring(item.position.start, item.position.end)
                    }]
                  });
                } else {
                  result.push(item);
                }
                
                // Call the callback for each processed feedback item
                result.forEach(feedbackItem => {
                  if (onFeedback) {
                    onFeedback({
                      ...feedbackItem,
                      type: 'intellectual',
                      agent: 'Dialectical Critic'
                    });
                  }
                });

                // Check for dialectical opportunities in this feedback
                if (item.dialecticalOpportunity && onFeedback) {
                  onFeedback({
                    type: 'dialectical_opportunity',
                    agent: 'Dialectical Critic',
                    title: 'Dialectical Thinking Opportunity',
                    feedback: item.dialecticalOpportunity.reasoning,
                    suggestion: 'Consider addressing potential counter-arguments to strengthen your claim.',
                    positions: result.length > 0 ? result[0].positions : [{ start: 0, end: 50, text: content.substring(0, 50) }],
                    actionData: {
                      type: 'create_dialectical_complex',
                      claim: item.dialecticalOpportunity.claim,
                      suggestedCounterArgs: item.dialecticalOpportunity.suggestedCounterArgs || []
                    },
                    timestamp: new Date(),
                    status: 'active'
                  });
                }
              }
            });
          } catch (error) {
            console.warn('Failed to process streaming feedback object:', error, obj);
          }
        });
      },
      undefined,
      {
        temperature: 0.3,
        maxTokens: mode === 'document' ? undefined : 600
      }
    );
    
    return 'streaming'; // Indicate streaming mode was used
    
  } catch (error) {
    console.error('Intellectual critic streaming failed:', error);
    
    // Fallback to non-streaming version
    return analyzeText(content, purpose, mode);
  }
};

export const analyzeText = async (content, purpose, mode = 'local', criteria = null) => {
  if (!content || content.length < 50) {
    return null;
  }

  try {
    // Format criteria for prompt if provided
    const formattedCriteria = criteria ? dynamicCriteriaService.formatForPrompt(criteria) : null;
    const prompt = intellectualCriticPrompt(content, purpose, mode, formattedCriteria);
    const response = await aiService.callAPI(prompt, undefined, {
      temperature: 0.3,
      maxTokens: mode === 'document' ? undefined : 600
    });

    // Clean and parse JSON response
    try {
      // Remove any markdown code blocks or extra text
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Find JSON object or array in response
      const jsonMatch = cleanResponse.match(/[\{\[][\s\S]*[\}\]]/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      const feedback = JSON.parse(cleanResponse);
      const feedbackArray = Array.isArray(feedback) ? feedback : [feedback];
      
      // Convert textSnippets to separate feedback items (one per text instance)
      const result = [];
      
      feedbackArray.forEach(item => {
        if (item.textSnippets && Array.isArray(item.textSnippets)) {
          // Use fuzzy matching to find positions for text snippets
          const matches = findTextSnippets(content, item.textSnippets, 0.75);
          
          if (matches.length > 0) {
            // Create separate feedback item for each text match
            matches.forEach((match, index) => {
              result.push({
                ...item,
                positions: [{
                  start: match.start,
                  end: match.end,
                  text: match.text,
                  similarity: match.similarity,
                  originalSnippet: match.originalSnippet
                }],
                // Add instance info to title if there are multiple matches
                title: matches.length > 1 ? `${item.title} (Instance ${index + 1})` : item.title
              });
            });
          } else {
            // Fallback if no matches found
            result.push({
              ...item,
              positions: [{ start: 0, end: 50, text: content.substring(0, 50) }]
            });
          }
        } else if (item.position && !item.positions) {
          // Handle old format for backward compatibility
          result.push({
            ...item,
            positions: [{
              start: item.position.start,
              end: item.position.end,
              text: content.substring(item.position.start, item.position.end)
            }]
          });
        } else {
          result.push(item);
        }
      });
      return result;
    } catch (parseError) {
      // If JSON parsing fails, create a fallback response
      console.warn('Failed to parse AI response as JSON:', parseError);
      console.log('Raw response:', response);
      return [{
        type: 'intellectual',
        severity: 'medium',
        title: 'AI Analysis',
        feedback: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
        suggestion: 'Review the feedback and consider the suggested improvements.',
        position: { start: 0, end: Math.min(content.length, 100) }
      }];
    }
  } catch (error) {
    console.error('Intellectual critic analysis failed:', error);
    
    // Fallback to mock analysis if API fails
    return [{
      type: 'intellectual',
      severity: 'low',
      title: 'Analysis Unavailable', 
      feedback: 'Unable to connect to AI service. Please check your API configuration.',
      suggestion: 'Verify your API keys are set correctly in environment variables.',
      position: { start: 0, end: 50 }
    }];
  }
};