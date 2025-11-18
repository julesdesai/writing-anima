/**
 * Utility for detecting and tracking text changes to manage suggestion lifecycle
 */

export class TextChangeDetector {
  constructor() {
    this.previousContent = '';
    this.changeHistory = [];
  }

  /**
   * Analyze changes between previous and current content
   * @param {string} currentContent - Current text content
   * @returns {Object} Change analysis result
   */
  analyzeChanges(currentContent) {
    if (!this.previousContent) {
      this.previousContent = currentContent;
      return { type: 'initial', changes: [] };
    }

    const changes = this.detectChanges(this.previousContent, currentContent);
    this.changeHistory.push({
      timestamp: Date.now(),
      previousContent: this.previousContent,
      currentContent,
      changes
    });

    // Keep only recent history (last 10 changes)
    if (this.changeHistory.length > 10) {
      this.changeHistory.shift();
    }

    this.previousContent = currentContent;
    return { type: 'update', changes };
  }

  /**
   * Detect specific changes between two text versions
   * @param {string} oldText - Previous text
   * @param {string} newText - Current text
   * @returns {Array} Array of change objects
   */
  detectChanges(oldText, newText) {
    const changes = [];
    
    // Simple diff algorithm - can be enhanced with more sophisticated approaches
    const oldLength = oldText.length;
    const newLength = newText.length;
    
    let i = 0;
    // Find common prefix
    while (i < Math.min(oldLength, newLength) && oldText[i] === newText[i]) {
      i++;
    }
    
    let j = 0;
    // Find common suffix
    while (j < Math.min(oldLength - i, newLength - i) && 
           oldText[oldLength - 1 - j] === newText[newLength - 1 - j]) {
      j++;
    }
    
    const changeStart = i;
    const changeEndOld = oldLength - j;
    const changeEndNew = newLength - j;
    
    if (changeStart < changeEndOld || changeStart < changeEndNew) {
      changes.push({
        type: this.determineChangeType(oldText, newText, changeStart, changeEndOld, changeEndNew),
        start: changeStart,
        end: changeEndNew,
        oldEnd: changeEndOld,
        oldText: oldText.slice(changeStart, changeEndOld),
        newText: newText.slice(changeStart, changeEndNew),
        lengthDelta: (changeEndNew - changeStart) - (changeEndOld - changeStart)
      });
    }
    
    return changes;
  }

  /**
   * Determine the type of change
   */
  determineChangeType(oldText, newText, start, oldEnd, newEnd) {
    const oldLength = oldEnd - start;
    const newLength = newEnd - start;
    
    if (oldLength === 0) return 'insert';
    if (newLength === 0) return 'delete';
    return 'replace';
  }

  /**
   * Update suggestion positions based on text changes
   * @param {Array} suggestions - Current suggestions
   * @param {Array} changes - Detected changes
   * @returns {Array} Updated suggestions with new positions and statuses
   */
  updateSuggestionPositions(suggestions, changes) {
    if (!changes.length) return suggestions;
    
    return suggestions.map(suggestion => {
      const updatedSuggestion = { ...suggestion };
      let isRetracted = false;
      
      for (const change of changes) {
        if (isRetracted) break;
        
        // Handle both old position format and new positions array format
        if (suggestion.positions && Array.isArray(suggestion.positions)) {
          // New format with positions array
          const updatedPositions = [];
          let retractedCount = 0;
          
          for (const position of suggestion.positions) {
            const tempSuggestion = { position };
            const result = this.adjustSuggestionForChange(tempSuggestion, change);
            
            if (result.status === 'retracted') {
              retractedCount++;
            } else {
              updatedPositions.push(result.newPosition || position);
            }
          }
          
          // If more than half of positions are retracted, retract the whole suggestion
          if (retractedCount > suggestion.positions.length / 2) {
            updatedSuggestion.status = 'retracted';
            updatedSuggestion.retractedReason = `Text was significantly modified in ${retractedCount} location(s)`;
            isRetracted = true;
          } else if (updatedPositions.length > 0) {
            updatedSuggestion.positions = updatedPositions;
          }
        } else {
          // Old format with single position
          const result = this.adjustSuggestionForChange(updatedSuggestion, change);
          if (result.status === 'retracted') {
            updatedSuggestion.status = 'retracted';
            updatedSuggestion.retractedReason = result.reason;
            isRetracted = true;
          } else if (result.newPosition) {
            updatedSuggestion.position = result.newPosition;
          }
        }
      }
      
      return updatedSuggestion;
    });
  }

  /**
   * Adjust a single suggestion based on a change
   */
  adjustSuggestionForChange(suggestion, change) {
    // Handle both old position format and new positions format
    const position = suggestion.position || (suggestion.positions && suggestion.positions[0]);
    if (!position || typeof position.start === 'undefined' || typeof position.end === 'undefined') {
      return {}; // Skip suggestions without valid position data
    }
    
    const { start: changeStart, end: changeEnd, oldEnd: changeOldEnd, lengthDelta, type } = change;
    
    // Check if the suggestion is affected by the change
    const suggestionStart = position.start;
    const suggestionEnd = position.end;
    
    // Case 1: Change is completely before the suggestion
    if (changeEnd <= suggestionStart) {
      return {
        newPosition: {
          start: suggestionStart + lengthDelta,
          end: suggestionEnd + lengthDelta
        }
      };
    }
    
    // Case 2: Change is completely after the suggestion
    if (changeStart >= suggestionEnd) {
      return {}; // No change needed
    }
    
    // Case 3: Change overlaps with or is within the suggestion
    const overlapStart = Math.max(suggestionStart, changeStart);
    const overlapEnd = Math.min(suggestionEnd, changeOldEnd);
    const overlapSize = Math.max(0, overlapEnd - overlapStart);
    const suggestionSize = suggestionEnd - suggestionStart;
    const overlapPercentage = overlapSize / suggestionSize;
    
    // If significant overlap (>30%), retract the suggestion
    if (overlapPercentage > 0.3) {
      return {
        status: 'retracted',
        reason: `Text was significantly modified (${Math.round(overlapPercentage * 100)}% overlap)`
      };
    }
    
    // If minor overlap, try to adjust position
    if (overlapPercentage > 0) {
      // If change is within the first half, adjust start position
      if (changeStart < suggestionStart + (suggestionSize / 2)) {
        return {
          newPosition: {
            start: Math.max(suggestionStart, changeEnd),
            end: suggestionEnd + lengthDelta
          }
        };
      } else {
        // If change is in the second half, adjust end position
        return {
          newPosition: {
            start: suggestionStart,
            end: Math.min(suggestionEnd, changeStart) + lengthDelta
          }
        };
      }
    }
    
    return {};
  }

  /**
   * Prepare suggestion evaluation data for AI analysis
   * @param {Object} suggestion - The suggestion to evaluate
   * @param {string} originalText - Text when suggestion was created
   * @param {string} currentText - Current text content  
   * @param {Array} changes - Recent changes that might affect this suggestion
   * @returns {Object} Evaluation data ready for AI processing
   */
  prepareSuggestionEvaluation(suggestion, originalText, currentText, changes) {
    // Filter changes that might affect this suggestion
    const relevantChanges = changes.filter(change => {
      // Handle both position formats
      const positions = suggestion.positions || (suggestion.position ? [suggestion.position] : []);
      
      return positions.some(position => {
        if (!position || typeof position.start === 'undefined' || typeof position.end === 'undefined') {
          return false;
        }
        
        const suggestionStart = position.start;
        const suggestionEnd = position.end;
        
        // Include changes that:
        // 1. Overlap with the suggestion
        // 2. Are within 100 characters of the suggestion (context changes)
        const hasOverlap = !(change.end <= suggestionStart || change.start >= suggestionEnd);
        const isNearby = Math.abs(change.start - suggestionStart) <= 100 || 
                        Math.abs(change.end - suggestionEnd) <= 100;
        
        return hasOverlap || isNearby;
      });
    });

    return {
      suggestion,
      originalText,
      modifiedText: currentText,
      changes: relevantChanges,
      needsEvaluation: relevantChanges.length > 0
    };
  }

  /**
   * Check if a suggestion needs AI re-evaluation based on changes
   * @param {Object} suggestion - The suggestion to check
   * @param {Array} changes - Recent text changes
   * @returns {boolean} Whether AI evaluation is needed
   */
  needsAIEvaluation(suggestion, changes) {
    if (!changes.length) return false;
    
    // Handle both position formats
    const positions = suggestion.positions || (suggestion.position ? [suggestion.position] : []);
    
    return positions.some(position => {
      if (!position || typeof position.start === 'undefined' || typeof position.end === 'undefined') {
        return false;
      }
      
      const suggestionStart = position.start;
      const suggestionEnd = position.end;
      
      // Check if any changes significantly affect the suggestion area
      return changes.some(change => {
        // Direct overlap
        if (!(change.end <= suggestionStart || change.start >= suggestionEnd)) {
          return true;
        }
        
        // Nearby changes that might affect context
        const distance = Math.min(
          Math.abs(change.start - suggestionStart),
          Math.abs(change.end - suggestionEnd)
        );
        
        // Major changes within 50 characters warrant re-evaluation
        return distance <= 50 && change.lengthDelta !== 0;
      });
    });
  }
}

export default new TextChangeDetector();