import aiService from './aiService';

/**
 * Service for generating and managing dynamic writing criteria based on purpose
 */
class DynamicCriteriaService {
  constructor() {
    this.cachedCriteria = new Map(); // Cache criteria by purpose
  }

  /**
   * Generate writing criteria based on purpose
   * @param {string|Object} purpose - The writing purpose/goal (string or {topic, context})
   * @returns {Promise<Object>} Generated criteria with categories
   */
  async generateCriteria(purpose) {
    // Handle both old format (string) and new format (object)
    let purposeText;
    if (typeof purpose === 'object' && purpose !== null) {
      if (!purpose.topic || purpose.topic.length < 5) {
        throw new Error('Topic must be at least 5 characters long');
      }
      purposeText = `Topic: ${purpose.topic}${purpose.context ? `\nContext: ${purpose.context}` : ''}`;
    } else {
      if (!purpose || purpose.length < 10) {
        throw new Error('Purpose must be at least 10 characters long');
      }
      purposeText = purpose;
    }

    // Check cache first
    const cacheKey = this.normalizePurpose(purpose);
    if (this.cachedCriteria.has(cacheKey)) {
      return this.cachedCriteria.get(cacheKey);
    }

    try {
      const prompt = this.createCriteriaPrompt(purposeText);
      const response = await aiService.callAPI(prompt, undefined, {
        temperature: 0.4,
        maxTokens: 800
      });

      const criteria = this.parseAIResponse(response);
      
      // Cache the results
      this.cachedCriteria.set(cacheKey, criteria);
      
      return criteria;
    } catch (error) {
      console.error('Failed to generate criteria:', error);
      throw error;
    }
  }

  /**
   * Create the prompt for generating writing criteria
   * @param {string} purpose - The writing purpose
   * @returns {string} The formatted prompt
   */
  createCriteriaPrompt(purpose) {
    return `You are an expert writing coach. Based on the following writing purpose, generate specific, actionable quality criteria that would make this writing excellent.

WRITING INFORMATION:
${purpose}

Generate criteria organized into these categories:
1. **Content & Ideas** - What should the content achieve?
2. **Structure & Organization** - How should it be organized?
3. **Style & Voice** - What tone and style are appropriate?
4. **Technical Quality** - What technical aspects matter?
5. **Audience Engagement** - How should it connect with readers?

For each category, provide 2-4 specific, measurable criteria. Make them:
- Specific to this writing purpose
- Actionable (writers can check if they're meeting them)
- Quality-focused (what makes writing in this context excellent)

Return as JSON in this format:
{
  "contentIdeas": [
    {"criterion": "Clear thesis statement that takes a definitive position", "priority": "high"},
    {"criterion": "Evidence-based arguments with credible sources", "priority": "high"}
  ],
  "structureOrganization": [
    {"criterion": "Logical paragraph progression with clear transitions", "priority": "medium"},
    {"criterion": "Introduction that establishes context and stakes", "priority": "high"}
  ],
  "styleVoice": [
    {"criterion": "Formal academic tone appropriate for university level", "priority": "medium"},
    {"criterion": "Consistent voice throughout the piece", "priority": "low"}
  ],
  "technicalQuality": [
    {"criterion": "Proper grammar and sentence structure", "priority": "high"},
    {"criterion": "Correct citation format (APA/MLA)", "priority": "medium"}
  ],
  "audienceEngagement": [
    {"criterion": "Compelling introduction that hooks the reader", "priority": "high"},
    {"criterion": "Clear call to action in conclusion", "priority": "medium"}
  ]
}

Priority levels: "high" (essential), "medium" (important), "low" (nice to have)`;
  }

  /**
   * Parse AI response into criteria object
   * @param {string} response - Raw AI response
   * @returns {Object} Parsed criteria
   */
  parseAIResponse(response) {
    let cleanResponse = response.trim();
    
    // Clean common AI response formatting
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Extract JSON from response
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanResponse = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(cleanResponse);
      
      // Validate structure
      const requiredCategories = ['contentIdeas', 'structureOrganization', 'styleVoice', 'technicalQuality', 'audienceEngagement'];
      const missingCategories = requiredCategories.filter(cat => !parsed[cat]);
      
      if (missingCategories.length > 0) {
        console.warn('Missing criteria categories:', missingCategories);
        // Fill in missing categories with empty arrays
        missingCategories.forEach(cat => {
          parsed[cat] = [];
        });
      }

      // Ensure each criterion has required fields
      Object.keys(parsed).forEach(category => {
        if (Array.isArray(parsed[category])) {
          parsed[category] = parsed[category].map(item => ({
            criterion: item.criterion || 'Quality criterion',
            priority: item.priority || 'medium',
            enabled: true, // Default to enabled
            id: `${category}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
          }));
        }
      });

      return {
        ...parsed,
        generatedAt: new Date(),
        purpose: this.normalizePurpose(cleanResponse)
      };
      
    } catch (error) {
      console.error('Failed to parse criteria response:', error);
      throw new Error(`Invalid AI response format: ${error.message}`);
    }
  }

  /**
   * Normalize purpose string for caching
   * @param {string} purpose - Raw purpose string
   * @returns {string} Normalized purpose
   */
  normalizePurpose(purpose) {
    if (typeof purpose === 'object' && purpose !== null) {
      const text = `${purpose.topic || ''} ${purpose.context || ''}`.trim();
      return text.toLowerCase().replace(/\s+/g, ' ');
    }
    return purpose.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Update criteria based on user edits
   * @param {Object} criteria - Current criteria object
   * @param {string} category - Category to update
   * @param {Array} updatedItems - Updated criteria items
   * @returns {Object} Updated criteria object
   */
  updateCriteria(criteria, category, updatedItems) {
    return {
      ...criteria,
      [category]: updatedItems,
      lastModified: new Date()
    };
  }

  /**
   * Add new criterion to category
   * @param {Object} criteria - Current criteria object
   * @param {string} category - Category to add to
   * @param {string} criterionText - New criterion text
   * @param {string} priority - Priority level
   * @returns {Object} Updated criteria object
   */
  addCriterion(criteria, category, criterionText, priority = 'medium') {
    const newCriterion = {
      criterion: criterionText,
      priority,
      enabled: true,
      id: `${category}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      userAdded: true
    };

    return {
      ...criteria,
      [category]: [...(criteria[category] || []), newCriterion],
      lastModified: new Date()
    };
  }

  /**
   * Remove criterion from category
   * @param {Object} criteria - Current criteria object
   * @param {string} category - Category to remove from
   * @param {string} criterionId - ID of criterion to remove
   * @returns {Object} Updated criteria object
   */
  removeCriterion(criteria, category, criterionId) {
    return {
      ...criteria,
      [category]: criteria[category].filter(item => item.id !== criterionId),
      lastModified: new Date()
    };
  }

  /**
   * Toggle criterion enabled/disabled
   * @param {Object} criteria - Current criteria object
   * @param {string} category - Category containing criterion
   * @param {string} criterionId - ID of criterion to toggle
   * @returns {Object} Updated criteria object
   */
  toggleCriterion(criteria, category, criterionId) {
    return {
      ...criteria,
      [category]: criteria[category].map(item => 
        item.id === criterionId ? { ...item, enabled: !item.enabled } : item
      ),
      lastModified: new Date()
    };
  }

  /**
   * Format criteria for use in critic prompts
   * @param {Object} criteria - Criteria object
   * @returns {string} Formatted criteria text for prompts
   */
  formatForPrompt(criteria) {
    if (!criteria) return '';

    const categoryNames = {
      contentIdeas: 'Content & Ideas',
      structureOrganization: 'Structure & Organization', 
      styleVoice: 'Style & Voice',
      technicalQuality: 'Technical Quality',
      audienceEngagement: 'Audience Engagement'
    };

    let formattedCriteria = '\n**QUALITY CRITERIA FOR THIS WRITING:**\n';

    Object.entries(criteria).forEach(([category, items]) => {
      if (Array.isArray(items) && items.length > 0) {
        const enabledItems = items.filter(item => item.enabled);
        if (enabledItems.length > 0) {
          formattedCriteria += `\n**${categoryNames[category] || category}:**\n`;
          enabledItems.forEach(item => {
            const priorityIndicator = item.priority === 'high' ? '🔥' : item.priority === 'medium' ? '⚡' : '💡';
            formattedCriteria += `${priorityIndicator} ${item.criterion}\n`;
          });
        }
      }
    });

    formattedCriteria += '\nEvaluate the writing against these specific criteria and provide targeted feedback.\n';

    return formattedCriteria;
  }

  /**
   * Get criteria summary for display
   * @param {Object} criteria - Criteria object
   * @returns {Object} Summary statistics
   */
  getCriteriaSummary(criteria) {
    if (!criteria) return { total: 0, enabled: 0, byPriority: {} };

    let total = 0;
    let enabled = 0;
    const byPriority = { high: 0, medium: 0, low: 0 };

    Object.values(criteria).forEach(category => {
      if (Array.isArray(category)) {
        category.forEach(item => {
          total++;
          if (item.enabled) {
            enabled++;
            byPriority[item.priority] = (byPriority[item.priority] || 0) + 1;
          }
        });
      }
    });

    return { total, enabled, byPriority };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cachedCriteria.clear();
  }
}

export default new DynamicCriteriaService();