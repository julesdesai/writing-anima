/**
 * Utility for extracting local context around changes for efficient API calls
 */

/**
 * Find paragraph boundaries in text
 * @param {string} text - The full text content
 * @returns {Array} Array of paragraph objects with start/end positions
 */
function findParagraphs(text) {
  const paragraphs = [];
  const lines = text.split('\n');
  let currentPosition = 0;
  let currentParagraph = '';
  let paragraphStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '') {
      // Empty line - end current paragraph if it has content
      if (currentParagraph.trim()) {
        paragraphs.push({
          start: paragraphStart,
          end: currentPosition,
          text: currentParagraph.trim(),
          lineStart: paragraphStart,
          lineEnd: i
        });
        currentParagraph = '';
      }
      // Start new paragraph after empty line
      paragraphStart = currentPosition + lines[i].length + 1; // +1 for newline
    } else {
      // Add line to current paragraph
      if (currentParagraph === '') {
        paragraphStart = currentPosition;
      }
      currentParagraph += (currentParagraph ? '\n' : '') + lines[i];
    }
    
    currentPosition += lines[i].length + 1; // +1 for newline
  }

  // Add final paragraph if it has content
  if (currentParagraph.trim()) {
    paragraphs.push({
      start: paragraphStart,
      end: currentPosition - 1, // -1 to remove final newline
      text: currentParagraph.trim(),
      lineStart: paragraphStart,
      lineEnd: lines.length - 1
    });
  }

  return paragraphs;
}

/**
 * Find which paragraph contains a given position
 * @param {Array} paragraphs - Array of paragraph objects
 * @param {number} position - Character position to find
 * @returns {number} Index of paragraph containing position, or -1 if not found
 */
function findParagraphAtPosition(paragraphs, position) {
  for (let i = 0; i < paragraphs.length; i++) {
    if (position >= paragraphs[i].start && position <= paragraphs[i].end) {
      return i;
    }
  }
  return -1;
}

/**
 * Extract local context around recent changes with paragraph-aware selection
 * @param {string} content - Full document content
 * @param {string} previousContent - Previous version of content
 * @param {number} maxContextSize - Maximum characters to include (default: 1200, increased for better context)
 * @returns {Object} Context extraction result
 */
export function extractLocalContext(content, previousContent, maxContextSize = 1200) {
  if (!previousContent || previousContent === content) {
    // No previous content or no changes - return beginning of document
    return {
      contextText: content.substring(0, maxContextSize),
      isFullDocument: content.length <= maxContextSize,
      changeInfo: {
        hasChanges: false,
        changeType: 'none'
      },
      paragraphInfo: {
        totalParagraphs: findParagraphs(content).length,
        includedParagraphs: findParagraphs(content.substring(0, maxContextSize)).length
      }
    };
  }

  // Find the change location using simple diff
  const changeLocation = findChangeLocation(previousContent, content);
  
  if (!changeLocation) {
    // No clear change found - return beginning
    return {
      contextText: content.substring(0, maxContextSize),
      isFullDocument: content.length <= maxContextSize,
      changeInfo: {
        hasChanges: false,
        changeType: 'unclear'
      }
    };
  }

  // Get paragraphs from current content
  const paragraphs = findParagraphs(content);
  
  if (paragraphs.length === 0) {
    return {
      contextText: content,
      isFullDocument: true,
      changeInfo: changeLocation
    };
  }

  // Find paragraph containing the change
  const changeParagraphIndex = findParagraphAtPosition(paragraphs, changeLocation.position);
  
  if (changeParagraphIndex === -1) {
    // Change not in any paragraph - return around change position
    const start = Math.max(0, changeLocation.position - maxContextSize / 2);
    const end = Math.min(content.length, start + maxContextSize);
    return {
      contextText: content.substring(start, end),
      isFullDocument: false,
      changeInfo: changeLocation,
      paragraphInfo: {
        changeNotInParagraph: true
      }
    };
  }

  // Build context by including paragraphs around the change
  let contextParagraphs = [];
  let totalLength = 0;
  
  // Start with the paragraph containing the change
  contextParagraphs.push(changeParagraphIndex);
  totalLength += paragraphs[changeParagraphIndex].text.length;
  
  // Add previous and next paragraphs - prioritize complete paragraphs over strict character limits
  let prevIndex = changeParagraphIndex - 1;
  let nextIndex = changeParagraphIndex + 1;
  
  // First pass: Add paragraphs that fit within the limit
  while (totalLength < maxContextSize && (prevIndex >= 0 || nextIndex < paragraphs.length)) {
    // Prefer adding previous paragraph for context
    if (prevIndex >= 0 && totalLength + paragraphs[prevIndex].text.length <= maxContextSize) {
      contextParagraphs.unshift(prevIndex);
      totalLength += paragraphs[prevIndex].text.length;
      prevIndex--;
    } else if (nextIndex < paragraphs.length && totalLength + paragraphs[nextIndex].text.length <= maxContextSize) {
      contextParagraphs.push(nextIndex);
      totalLength += paragraphs[nextIndex].text.length;
      nextIndex++;
    } else {
      break;
    }
  }
  
  // Second pass: If we have very little context, add one more paragraph even if it exceeds the limit
  // This prevents cutting off important context mid-sentence
  const minParagraphs = 2; // Ensure at least 2 paragraphs for meaningful context
  if (contextParagraphs.length < minParagraphs) {
    if (prevIndex >= 0 && contextParagraphs.length === 1) {
      contextParagraphs.unshift(prevIndex);
      totalLength += paragraphs[prevIndex].text.length;
    } else if (nextIndex < paragraphs.length && contextParagraphs.length === 1) {
      contextParagraphs.push(nextIndex);
      totalLength += paragraphs[nextIndex].text.length;
    }
  }
  
  // Third pass: If we're still under a reasonable size (1800 chars), add one more paragraph for better context
  const reasonableLimit = maxContextSize * 1.5; // Allow 50% overflow for paragraph completeness
  if (totalLength < reasonableLimit) {
    if (prevIndex >= 0 && totalLength + paragraphs[prevIndex].text.length <= reasonableLimit) {
      contextParagraphs.unshift(prevIndex);
      totalLength += paragraphs[prevIndex].text.length;
    } else if (nextIndex < paragraphs.length && totalLength + paragraphs[nextIndex].text.length <= reasonableLimit) {
      contextParagraphs.push(nextIndex);
      totalLength += paragraphs[nextIndex].text.length;
    }
  }
  
  // Build context text from selected paragraphs
  const contextText = contextParagraphs
    .sort((a, b) => a - b)
    .map(index => paragraphs[index].text)
    .join('\n\n');

  return {
    contextText,
    isFullDocument: contextParagraphs.length === paragraphs.length,
    changeInfo: changeLocation,
    paragraphInfo: {
      totalParagraphs: paragraphs.length,
      includedParagraphs: contextParagraphs.length,
      changeParagraph: changeParagraphIndex,
      contextParagraphs: contextParagraphs
    }
  };
}

/**
 * Simple change detection between two text versions
 * @param {string} oldText - Previous text
 * @param {string} newText - Current text
 * @returns {Object|null} Change information or null if no change detected
 */
function findChangeLocation(oldText, newText) {
  const oldLength = oldText.length;
  const newLength = newText.length;
  
  // Find first difference from start
  let startDiff = 0;
  while (startDiff < Math.min(oldLength, newLength) && oldText[startDiff] === newText[startDiff]) {
    startDiff++;
  }
  
  // Find first difference from end
  let endDiff = 0;
  while (endDiff < Math.min(oldLength - startDiff, newLength - startDiff) && 
         oldText[oldLength - 1 - endDiff] === newText[newLength - 1 - endDiff]) {
    endDiff++;
  }
  
  if (startDiff === oldLength && startDiff === newLength) {
    return null; // No change
  }
  
  const changeType = oldLength < newLength ? 'addition' : 
                    oldLength > newLength ? 'deletion' : 'replacement';
  
  return {
    hasChanges: true,
    changeType,
    position: startDiff,
    oldLength: oldLength - startDiff - endDiff,
    newLength: newLength - startDiff - endDiff,
    addedChars: newLength - oldLength
  };
}

/**
 * Check if user has completed a paragraph by detecting paragraph breaks
 * @param {string} oldContent - Previous content
 * @param {string} newContent - Current content  
 * @returns {boolean} True if a paragraph break was detected
 */
function hasParagraphBreak(oldContent, newContent) {
  if (!oldContent || !newContent) return false;
  
  // Look for double newlines (paragraph breaks) in the new content that weren't in old content
  const oldParagraphCount = (oldContent.match(/\n\s*\n/g) || []).length;
  const newParagraphCount = (newContent.match(/\n\s*\n/g) || []).length;
  
  // Trigger if user added a new paragraph break
  if (newParagraphCount > oldParagraphCount) {
    return true;
  }
  
  // Also trigger if user added significant content ending with single newline (like pressing Enter to end a paragraph)
  const contentDiff = newContent.length - oldContent.length;
  if (contentDiff >= 50 && newContent.endsWith('\n') && !oldContent.endsWith('\n')) {
    return true;
  }
  
  // Trigger if content ends with punctuation + space/newline (sentence completion)
  const lastAddedText = newContent.slice(oldContent.length);
  if (contentDiff >= 20 && /[.!?]\s*$/.test(newContent.trim())) {
    // Check if this punctuation wasn't there before
    if (!oldContent.trim().endsWith('.') && !oldContent.trim().endsWith('!') && !oldContent.trim().endsWith('?')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if content changes warrant a new analysis
 * @param {string} content - Current content
 * @param {string} lastAnalyzedContent - Content from last analysis
 * @param {number} minChangeThreshold - Minimum characters changed to trigger analysis (legacy parameter, now unused)
 * @returns {Object} Analysis trigger decision with type and reasoning
 */
export function shouldTriggerLocalAnalysis(content, lastAnalyzedContent, minChangeThreshold = 30) {
  if (!lastAnalyzedContent) {
    // Check if initial content is large enough to warrant global analysis
    if (content.length >= 400) {
      return {
        shouldTrigger: true,
        type: 'global',
        reason: 'large_initial_content',
        addedChars: content.length
      };
    }
    
    return {
      shouldTrigger: content.length >= 50,
      type: 'local',
      reason: 'initial_content'
    };
  }
  
  const changeInfo = findChangeLocation(lastAnalyzedContent, content);
  if (!changeInfo || !changeInfo.hasChanges) {
    return {
      shouldTrigger: false,
      type: 'none',
      reason: 'no_changes'
    };
  }
  
  // Check for large paste operations (400+ characters added at once)
  if (changeInfo.changeType === 'addition' && changeInfo.addedChars >= 400) {
    return {
      shouldTrigger: true,
      type: 'global',
      reason: 'large_paste',
      addedChars: changeInfo.addedChars
    };
  }
  
  // Check if user completed a paragraph (double newline or significant pause in writing)
  if (hasParagraphBreak(lastAnalyzedContent, content)) {
    return {
      shouldTrigger: true,
      type: 'local',
      reason: 'paragraph_completed',
      addedChars: changeInfo.addedChars
    };
  }
  
  return {
    shouldTrigger: false,
    type: 'none',
    reason: 'no_paragraph_break'
  };
}

export default {
  extractLocalContext,
  shouldTriggerLocalAnalysis,
  findParagraphs
};