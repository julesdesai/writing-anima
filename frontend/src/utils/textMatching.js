/**
 * Utility for finding text snippets in content with fuzzy matching
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score (0-1) between two strings
 */
function similarityScore(str1, str2) {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return (maxLength - distance) / maxLength;
}

/**
 * Normalize text for better matching (remove extra whitespace, punctuation variations)
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')      // normalize whitespace
    .replace(/['']/g, "'")     // normalize quotes
    .replace(/[""]/g, '"')     // normalize quotes
    .trim();
}

/**
 * Find all positions of a text snippet in content with fuzzy matching
 * @param {string} content - The full text content
 * @param {string} snippet - The text snippet to find
 * @param {number} threshold - Minimum similarity score (0-1) to consider a match
 * @returns {Array} Array of position objects {start, end, text, similarity}
 */
export function findTextSnippet(content, snippet, threshold = 0.8) {
  if (!content || !snippet) return [];
  
  const normalizedSnippet = normalizeText(snippet);
  const snippetWords = normalizedSnippet.split(' ');
  const results = [];
  
  // Try exact match first
  const exactMatch = content.toLowerCase().indexOf(snippet.toLowerCase());
  if (exactMatch !== -1) {
    results.push({
      start: exactMatch,
      end: exactMatch + snippet.length,
      text: content.substring(exactMatch, exactMatch + snippet.length),
      similarity: 1.0
    });
  }
  
  // If no exact match or we want to find additional matches, use fuzzy matching
  if (results.length === 0 || snippetWords.length > 3) {
    const windowSize = Math.max(snippet.length, 50);
    const step = Math.floor(windowSize / 4);
    
    for (let i = 0; i <= content.length - windowSize; i += step) {
      const window = content.substring(i, i + windowSize);
      const normalizedWindow = normalizeText(window);
      
      const similarity = similarityScore(normalizedSnippet, normalizedWindow);
      
      if (similarity >= threshold) {
        // Find the best substring within the window
        const bestMatch = findBestSubstring(window, snippet, i);
        if (bestMatch && bestMatch.similarity >= threshold) {
          // Check if this overlaps with existing results
          const hasOverlap = results.some(existing => 
            (bestMatch.start >= existing.start && bestMatch.start < existing.end) ||
            (bestMatch.end > existing.start && bestMatch.end <= existing.end) ||
            (bestMatch.start < existing.start && bestMatch.end > existing.end)
          );
          
          if (!hasOverlap) {
            results.push(bestMatch);
          }
        }
      }
    }
  }
  
  // Sort by similarity score (highest first)
  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Find the best matching substring within a window
 */
function findBestSubstring(window, targetSnippet, windowStart) {
  const targetLength = targetSnippet.length;
  let bestMatch = null;
  let bestSimilarity = 0;
  
  // Try different substring lengths around the target length
  const lengthVariations = [
    targetLength,
    Math.floor(targetLength * 0.8),
    Math.floor(targetLength * 1.2),
    Math.floor(targetLength * 0.6),
    Math.floor(targetLength * 1.4)
  ];
  
  for (const length of lengthVariations) {
    if (length <= 0 || length > window.length) continue;
    
    for (let i = 0; i <= window.length - length; i++) {
      const substring = window.substring(i, i + length);
      const similarity = similarityScore(normalizeText(substring), normalizeText(targetSnippet));
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = {
          start: windowStart + i,
          end: windowStart + i + length,
          text: substring,
          similarity
        };
      }
    }
  }
  
  return bestMatch;
}

/**
 * Find multiple text snippets in content
 * @param {string} content - The full text content
 * @param {Array} snippets - Array of text snippets to find
 * @param {number} threshold - Minimum similarity score
 * @returns {Array} Array of position objects with snippet info
 */
export function findTextSnippets(content, snippets, threshold = 0.8) {
  const allMatches = [];
  
  snippets.forEach((snippet, snippetIndex) => {
    const matches = findTextSnippet(content, snippet, threshold);
    matches.forEach(match => {
      allMatches.push({
        ...match,
        snippetIndex,
        originalSnippet: snippet
      });
    });
  });
  
  // Remove overlapping matches, keeping the one with higher similarity
  const filteredMatches = [];
  const sortedMatches = allMatches.sort((a, b) => b.similarity - a.similarity);
  
  for (const match of sortedMatches) {
    const hasOverlap = filteredMatches.some(existing => 
      (match.start >= existing.start && match.start < existing.end) ||
      (match.end > existing.start && match.end <= existing.end) ||
      (match.start < existing.start && match.end > existing.end)
    );
    
    if (!hasOverlap) {
      filteredMatches.push(match);
    }
  }
  
  return filteredMatches.sort((a, b) => a.start - b.start);
}

export default {
  findTextSnippet,
  findTextSnippets,
  similarityScore,
  normalizeText
};