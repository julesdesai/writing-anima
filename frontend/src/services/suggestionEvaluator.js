import aiService from './aiService';

/**
 * AI-powered suggestion evaluation service
 * Determines if suggestions have been adequately addressed by text changes
 */
class SuggestionEvaluator {
  constructor() {
    this.evaluationCache = new Map();
    this.batchQueue = [];
    this.processingBatch = false;
  }

  /**
   * Generate evaluation prompt for AI
   */
  createEvaluationPrompt(suggestion, originalText, modifiedText, changeDescription) {
    return `You are an expert writing evaluator. Analyze whether a writing suggestion has been adequately addressed based on text changes.

ORIGINAL SUGGESTION:
Type: ${suggestion.type}
Title: ${suggestion.title}
Feedback: ${suggestion.feedback}
Suggestion: ${suggestion.suggestion}
Target Text: "${originalText.slice(suggestion.position.start, suggestion.position.end)}"

TEXT CHANGES:
${changeDescription}

ORIGINAL TEXT CONTEXT (±50 chars around target):
"${this.getContextualText(originalText, suggestion.position, 50)}"

MODIFIED TEXT CONTEXT (same region):
"${this.getContextualText(modifiedText, suggestion.position, 50)}"

Evaluate whether the user has adequately addressed the suggestion. Consider:

1. **Direct fixes**: Did they implement the specific suggestion?
2. **Alternative solutions**: Did they solve the underlying issue differently?
3. **Partial improvements**: Is the text meaningfully better even if not perfect?
4. **Context changes**: Did surrounding changes make the suggestion irrelevant?

You must respond with ONLY valid JSON:

{
  "status": "resolved|active|retracted",
  "confidence": 0.85,
  "reasoning": "Brief explanation of evaluation",
  "evidence": "Specific textual evidence supporting the decision"
}

Status meanings:
- "resolved": User adequately addressed the issue (directly or alternatively)
- "active": Issue remains unaddressed, suggestion still relevant  
- "retracted": Text changes made suggestion irrelevant or impossible to evaluate

Respond with JSON only.`;
  }

  /**
   * Get contextual text around a position
   */
  getContextualText(text, position, contextChars) {
    const start = Math.max(0, position.start - contextChars);
    const end = Math.min(text.length, position.end + contextChars);
    return text.slice(start, end);
  }

  /**
   * Create a cache key for evaluation results
   */
  getCacheKey(suggestion, originalText, modifiedText) {
    const textHash = this.simpleHash(originalText + modifiedText + suggestion.id);
    return `${suggestion.id}-${textHash}`;
  }

  /**
   * Simple hash function for caching
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Describe text changes for AI context
   */
  describeChanges(changes) {
    if (!changes.length) return "No changes detected";

    return changes.map(change => {
      switch (change.type) {
        case 'insert':
          return `Inserted "${change.newText}" at position ${change.start}`;
        case 'delete':
          return `Deleted "${change.oldText}" from position ${change.start}-${change.oldEnd}`;
        case 'replace':
          return `Replaced "${change.oldText}" with "${change.newText}" at position ${change.start}-${change.end}`;
        default:
          return `Modified text at position ${change.start}`;
      }
    }).join('; ');
  }

  /**
   * Evaluate a single suggestion using AI
   */
  async evaluateSuggestion(suggestion, originalText, modifiedText, changes) {
    const cacheKey = this.getCacheKey(suggestion, originalText, modifiedText);
    
    // Check cache first
    if (this.evaluationCache.has(cacheKey)) {
      return this.evaluationCache.get(cacheKey);
    }

    try {
      const changeDescription = this.describeChanges(changes);
      const prompt = this.createEvaluationPrompt(suggestion, originalText, modifiedText, changeDescription);
      
      const response = await aiService.callAPI(prompt, undefined, {
        temperature: 0.1, // Low temperature for consistent evaluations
        maxTokens: 300
      });

      // Parse AI response
      let evaluation;
      try {
        // Clean response similar to how we handle other AI responses
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
        
        evaluation = JSON.parse(cleanResponse);
        
        // Validate response structure
        if (!evaluation.status || !['resolved', 'active', 'retracted'].includes(evaluation.status)) {
          throw new Error('Invalid status in AI response');
        }
        
        evaluation.confidence = Math.max(0, Math.min(1, evaluation.confidence || 0.5));
        
      } catch (parseError) {
        console.warn('Failed to parse AI evaluation response:', parseError);
        // Fallback to conservative evaluation
        evaluation = {
          status: 'active',
          confidence: 0.3,
          reasoning: 'Failed to parse AI evaluation, keeping suggestion active',
          evidence: 'AI response parsing error'
        };
      }

      // Cache the result
      this.evaluationCache.set(cacheKey, evaluation);
      
      // Clean cache if it gets too large (keep last 100 evaluations)
      if (this.evaluationCache.size > 100) {
        const keys = Array.from(this.evaluationCache.keys());
        keys.slice(0, 20).forEach(key => this.evaluationCache.delete(key));
      }

      return evaluation;

    } catch (error) {
      console.error('AI suggestion evaluation failed:', error);
      
      // Fallback evaluation
      return {
        status: 'active',
        confidence: 0.2,
        reasoning: 'AI evaluation unavailable, keeping suggestion active for safety',
        evidence: 'Fallback due to AI service error'
      };
    }
  }

  /**
   * Batch evaluate multiple suggestions for better performance
   */
  async evaluateSuggestionsBatch(suggestionEvaluations) {
    if (!suggestionEvaluations.length) return [];

    // For now, process individually but could be optimized for batch API calls
    const results = [];
    
    for (const item of suggestionEvaluations) {
      try {
        const evaluation = await this.evaluateSuggestion(
          item.suggestion, 
          item.originalText, 
          item.modifiedText, 
          item.changes
        );
        
        results.push({
          suggestionId: item.suggestion.id,
          evaluation
        });
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Failed to evaluate suggestion ${item.suggestion.id}:`, error);
        results.push({
          suggestionId: item.suggestion.id,
          evaluation: {
            status: 'active',
            confidence: 0.1,
            reasoning: 'Evaluation failed, keeping active',
            evidence: error.message
          }
        });
      }
    }

    return results;
  }

  /**
   * Queue suggestions for batch evaluation
   */
  queueForEvaluation(suggestion, originalText, modifiedText, changes) {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({
        suggestion,
        originalText,
        modifiedText,
        changes,
        resolve,
        reject
      });

      // Process batch if not already processing
      if (!this.processingBatch) {
        this.processBatch();
      }
    });
  }

  /**
   * Process queued evaluations in batches
   */
  async processBatch() {
    if (this.processingBatch || this.batchQueue.length === 0) return;

    this.processingBatch = true;
    
    try {
      // Take up to 5 items from queue
      const batchItems = this.batchQueue.splice(0, 5);
      
      const evaluations = await this.evaluateSuggestionsBatch(batchItems);
      
      // Resolve promises
      evaluations.forEach((result, index) => {
        const batchItem = batchItems[index];
        if (batchItem) {
          batchItem.resolve(result.evaluation);
        }
      });
      
    } catch (error) {
      console.error('Batch evaluation failed:', error);
      
      // Reject all queued promises
      this.batchQueue.forEach(item => {
        item.reject(error);
      });
    } finally {
      this.processingBatch = false;
      
      // Process next batch if queue has items
      if (this.batchQueue.length > 0) {
        setTimeout(() => this.processBatch(), 500);
      }
    }
  }

  /**
   * Clear evaluation cache
   */
  clearCache() {
    this.evaluationCache.clear();
  }
}

export default new SuggestionEvaluator();