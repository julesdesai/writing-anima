/**
 * Cross-Reference Agent - Validates claims against evidence elsewhere in document
 * This agent would be called when local agents detect potential cross-reference issues
 */

import aiService from '../services/aiService';

/**
 * Check if claims in a section are supported by evidence elsewhere in the document
 * @param {string} localSection - The section making claims
 * @param {string} fullDocument - The entire document to search for evidence
 * @param {string} purpose - Writing purpose for context
 * @param {Array} potentialClaims - Claims flagged by local analysis
 * @returns {Array} Cross-reference validation results
 */
export const validateClaims = async (localSection, fullDocument, purpose, potentialClaims) => {
  if (!potentialClaims || potentialClaims.length === 0) {
    return [];
  }

  try {
    const prompt = `
You are a cross-reference validation agent. Your job is to check if claims made in one section of a document are supported by evidence elsewhere in the document.

WRITING PURPOSE: ${purpose}

SECTION WITH CLAIMS:
${localSection}

FULL DOCUMENT TO SEARCH:
${fullDocument}

POTENTIAL CLAIMS TO VALIDATE:
${potentialClaims.map((claim, i) => `${i + 1}. "${claim}"`).join('\n')}

For each claim, determine:
1. Is the claim actually making a factual assertion that needs evidence?
2. Is supporting evidence present elsewhere in the document?
3. If evidence exists, where is it located?
4. If no evidence exists, is this a legitimate concern?

Respond with a JSON array of validation results:

[
  {
    "claim": "exact claim text",
    "needsEvidence": true/false,
    "evidenceFound": true/false,
    "evidenceLocation": "text snippet where evidence was found",
    "severity": "high/medium/low",
    "feedback": "explanation of the validation result"
  }
]

Only flag claims that genuinely lack support after checking the entire document.
`;

    const response = await aiService.callAPI(prompt, undefined, {
      temperature: 0.2,
      maxTokens: 800
    });

    // Parse response similar to other agents
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }

    const jsonMatch = cleanResponse.match(/[\{\[][\s\S]*[\}\]]/);
    if (jsonMatch) {
      cleanResponse = jsonMatch[0];
    }

    const validationResults = JSON.parse(cleanResponse);
    return Array.isArray(validationResults) ? validationResults : [validationResults];

  } catch (error) {
    console.error('Cross-reference validation failed:', error);
    return [];
  }
};

/**
 * Extract potential claims from local intellectual feedback
 * @param {Array} localFeedback - Feedback from local intellectual critic
 * @returns {Array} List of potential claims that might need validation
 */
export const extractPotentialClaims = (localFeedback) => {
  const claims = [];
  
  localFeedback.forEach(item => {
    if (item.type === 'intellectual' && item.positions) {
      item.positions.forEach(position => {
        // Look for text that might be making claims
        if (position.text && position.text.length > 10) {
          claims.push(position.text);
        }
      });
    }
  });
  
  return claims;
};

export default {
  validateClaims,
  extractPotentialClaims
};