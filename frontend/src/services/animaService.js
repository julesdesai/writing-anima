/**
 * Anima Service
 * Handles all communication with the Writing-Anima backend
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

class AnimaService {
  /**
   * Analyze writing with Anima (synchronous)
   * @param {string} content - The writing content to analyze
   * @param {string} personaId - ID of the persona to use
   * @param {string} userId - Firebase UID
   * @param {object} context - Optional context (purpose, criteria, history)
   * @param {number} maxFeedbackItems - Maximum number of feedback items
   * @returns {Promise<object>} Analysis response with feedback items
   */
  async analyzeWriting(content, personaId, userId, context = {}, maxFeedbackItems = 10) {
    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          persona_id: personaId,
          user_id: userId,
          context: {
            purpose: context.purpose || null,
            criteria: context.criteria || [],
            feedback_history: context.feedbackHistory || []
          },
          max_feedback_items: maxFeedbackItems
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Analysis failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error analyzing writing:', error);
      throw error;
    }
  }

  /**
   * Analyze writing with streaming updates via WebSocket
   * @param {string} content - The writing content to analyze
   * @param {string} personaId - ID of the persona to use
   * @param {string} userId - Firebase UID
   * @param {object} context - Optional context (purpose, criteria, history)
   * @param {function} onStatus - Callback for status updates
   * @param {function} onFeedback - Callback for feedback items
   * @param {function} onComplete - Callback when analysis completes
   * @param {function} onError - Callback for errors
   * @returns {Promise<WebSocket>} WebSocket connection
   */
  async streamAnalysis(
    content,
    personaId,
    userId,
    context = {},
    callbacks = {}
  ) {
    const {
      onStatus = () => {},
      onFeedback = () => {},
      onComplete = () => {},
      onError = () => {}
    } = callbacks;

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_URL}/api/analyze/stream`);
      let feedbackReceived = 0;
      let completionReceived = false;

      ws.onopen = () => {
        console.log('WebSocket connected');

        // Send analysis request
        ws.send(JSON.stringify({
          content,
          persona_id: personaId,
          user_id: userId,
          context: {
            purpose: context.purpose || null,
            criteria: context.criteria || [],
            feedback_history: context.feedbackHistory || []
          },
          max_feedback_items: context.maxFeedbackItems || 10
        }));

        resolve(ws);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'status':
              onStatus(message);
              break;

            case 'feedback':
              feedbackReceived++;
              onFeedback(message.item);
              break;

            case 'complete':
              completionReceived = true;
              onComplete(message);
              ws.close();
              break;

            case 'error':
              onError(new Error(message.message || 'Analysis failed'));
              ws.close();
              break;

            default:
              console.warn('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          onError(error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error (may be transient during AI processing):', error);
        // Don't immediately report errors - wait for onclose to determine if it's a real failure
        // This prevents premature error alerts during long AI inference
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed', { code: event.code, reason: event.reason });

        // If we got feedback but no completion message, treat as partial success
        if (feedbackReceived > 0 && !completionReceived) {
          console.log(`Stream closed after ${feedbackReceived} items without completion message`);
          onComplete({
            total_items: feedbackReceived,
            processing_time: 0,
            partial: true
          });
        }
        // Only report error if connection closed abnormally with NO feedback received
        else if (feedbackReceived === 0 && event.code !== 1000) {
          console.error('WebSocket closed without receiving any feedback');
          onError(new Error('Connection closed without receiving feedback. Backend may be down.'));
          reject(new Error('Connection failed'));
        }
      };
    });
  }

  /**
   * Get all personas for a user
   * @param {string} userId - Firebase UID
   * @returns {Promise<Array>} List of personas
   */
  async getPersonas(userId) {
    try {
      const response = await fetch(`${API_URL}/api/personas?user_id=${userId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch personas');
      }

      const data = await response.json();
      return data.personas || [];
    } catch (error) {
      console.error('Error fetching personas:', error);
      throw error;
    }
  }

  /**
   * Get a specific persona
   * @param {string} personaId - Persona ID
   * @param {string} userId - Firebase UID
   * @returns {Promise<object>} Persona details
   */
  async getPersona(personaId, userId) {
    try {
      const response = await fetch(
        `${API_URL}/api/personas/${personaId}?user_id=${userId}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch persona');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching persona:', error);
      throw error;
    }
  }

  /**
   * Create a new persona
   * @param {string} name - Persona name
   * @param {string} description - Persona description
   * @param {string} userId - Firebase UID
   * @returns {Promise<object>} Created persona
   */
  async createPersona(name, description, userId) {
    try {
      const response = await fetch(`${API_URL}/api/personas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          user_id: userId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create persona');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating persona:', error);
      throw error;
    }
  }

  /**
   * Delete a persona
   * @param {string} personaId - Persona ID
   * @param {string} userId - Firebase UID
   * @returns {Promise<void>}
   */
  async deletePersona(personaId, userId) {
    try {
      const response = await fetch(
        `${API_URL}/api/personas/${personaId}?user_id=${userId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete persona');
      }
    } catch (error) {
      console.error('Error deleting persona:', error);
      throw error;
    }
  }

  /**
   * Upload corpus files for a persona
   * @param {string} personaId - Persona ID
   * @param {string} userId - Firebase UID
   * @param {FileList} files - Files to upload
   * @returns {Promise<object>} Upload response
   */
  async uploadCorpus(personaId, userId, files) {
    try {
      const formData = new FormData();
      formData.append('user_id', userId);

      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(
        `${API_URL}/api/personas/${personaId}/corpus`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading corpus:', error);
      throw error;
    }
  }

  /**
   * Get corpus ingestion status
   * @param {string} personaId - Persona ID
   * @param {string} userId - Firebase UID
   * @returns {Promise<object>} Ingestion status
   */
  async getIngestionStatus(personaId, userId) {
    try {
      const response = await fetch(
        `${API_URL}/api/personas/${personaId}/corpus/status?user_id=${userId}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch ingestion status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching ingestion status:', error);
      throw error;
    }
  }

  /**
   * Check if backend is healthy
   * @returns {Promise<object>} Health status
   */
  async healthCheck() {
    try {
      const response = await fetch(`${API_URL}/api/health`);

      if (!response.ok) {
        throw new Error('Backend is unhealthy');
      }

      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
const animaService = new AnimaService();
export default animaService;
