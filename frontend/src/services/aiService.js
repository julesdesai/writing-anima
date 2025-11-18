const AI_PROVIDERS = {
  OPENAI: 'openai',
  CLAUDE: 'claude',
  LOCAL: 'local'
};

class AIService {
  constructor() {
    this.defaultProvider = process.env.REACT_APP_USE_LOCAL_INFERENCE === 'true' 
      ? AI_PROVIDERS.LOCAL 
      : AI_PROVIDERS.OPENAI;
    this.localBackendUrl = process.env.REACT_APP_LOCAL_BACKEND_URL || 'http://localhost:3001';
  }

  async callAPI(prompt, provider = this.defaultProvider, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = provider === AI_PROVIDERS.LOCAL ? 8000 : 1000,
      model = null
    } = options;

    try {
      switch (provider) {
        case AI_PROVIDERS.OPENAI:
          return await this.callOpenAI(prompt, { temperature, maxTokens, model });
        case AI_PROVIDERS.CLAUDE:
          return await this.callClaude(prompt, { temperature, maxTokens, model });
        case AI_PROVIDERS.LOCAL:
          return await this.callLocal(prompt, { temperature, maxTokens, model });
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }
    } catch (error) {
      console.error(`AI API call failed for provider ${provider}:`, error);
      
      // Auto-fallback for local inference
      if (provider === AI_PROVIDERS.LOCAL && this.defaultProvider !== AI_PROVIDERS.LOCAL) {
        console.log('Local inference failed, falling back to cloud provider...');
        return await this.callAPI(prompt, AI_PROVIDERS.OPENAI, options);
      }
      
      throw error;
    }
  }

  async callOpenAI(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 1000,
      model = 'gpt-4'
    } = options;

    // Ensure we always have a model
    const actualModel = model || 'gpt-4';

    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please set REACT_APP_OPENAI_API_KEY environment variable.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: actualModel,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  async callClaude(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 1000,
      model = 'claude-3-sonnet-20240229'
    } = options;

    // Ensure we always have a model
    const actualModel = model || 'claude-3-sonnet-20240229';

    const apiKey = process.env.REACT_APP_CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('Claude API key not found. Please set REACT_APP_CLAUDE_API_KEY environment variable.');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: actualModel,
        max_tokens: maxTokens,
        temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Claude API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }

  async callLocal(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 8000, // Much higher for local reasoning models
      model = 'gpt-oss:20b'
    } = options;

    try {
      const response = await fetch(`${this.localBackendUrl}/api/ai/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature,
          max_tokens: maxTokens,
          model
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Local inference error: ${error.error?.message || 'Backend unavailable'}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      if (error.message.includes('fetch')) {
        throw new Error('Local backend unavailable. Make sure the backend server is running.');
      }
      throw error;
    }
  }

  setDefaultProvider(provider) {
    if (!Object.values(AI_PROVIDERS).includes(provider)) {
      throw new Error(`Invalid provider: ${provider}`);
    }
    this.defaultProvider = provider;
  }

  getAvailableProviders() {
    return Object.values(AI_PROVIDERS);
  }

  /**
   * Stream AI response with callback for incremental processing
   * @param {string} prompt - The prompt to send
   * @param {function} onChunk - Callback for each chunk: (chunk, completeObjects) => void
   * @param {string} provider - AI provider to use
   * @param {object} options - API options
   */
  async callAPIStream(prompt, onChunk, provider = this.defaultProvider, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = provider === AI_PROVIDERS.LOCAL ? 8000 : 1000,
      model = null
    } = options;

    try {
      switch (provider) {
        case AI_PROVIDERS.OPENAI:
          return await this.callOpenAIStream(prompt, onChunk, { temperature, maxTokens, model });
        case AI_PROVIDERS.CLAUDE:
          return await this.callClaudeStream(prompt, onChunk, { temperature, maxTokens, model });
        case AI_PROVIDERS.LOCAL:
          return await this.callLocalStream(prompt, onChunk, { temperature, maxTokens, model });
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }
    } catch (error) {
      console.error(`AI streaming call failed for provider ${provider}:`, error);
      
      // Auto-fallback for local inference
      if (provider === AI_PROVIDERS.LOCAL && this.defaultProvider !== AI_PROVIDERS.LOCAL) {
        console.log('Local streaming failed, falling back to cloud provider...');
        return await this.callAPIStream(prompt, onChunk, AI_PROVIDERS.OPENAI, options);
      }
      
      throw error;
    }
  }

  async callOpenAIStream(prompt, onChunk, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 1000,
      model = 'gpt-4'
    } = options;

    const actualModel = model || 'gpt-4';
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please set REACT_APP_OPENAI_API_KEY environment variable.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: actualModel,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    return this.processStream(response, onChunk, 'openai');
  }

  async callClaudeStream(prompt, onChunk, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 1000,
      model = 'claude-3-sonnet-20240229'
    } = options;

    const actualModel = model || 'claude-3-sonnet-20240229';
    const apiKey = process.env.REACT_APP_CLAUDE_API_KEY;
    
    if (!apiKey) {
      throw new Error('Claude API key not found. Please set REACT_APP_CLAUDE_API_KEY environment variable.');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: actualModel,
        temperature,
        messages: [{ role: 'user', content: prompt }],
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Claude API error: ${error.error?.message || 'Unknown error'}`);
    }

    return this.processStream(response, onChunk, 'claude');
  }

  async callLocalStream(prompt, onChunk, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 8000, // Much higher for local reasoning models
      model = 'gpt-oss:20b'
    } = options;

    try {
      const response = await fetch(`${this.localBackendUrl}/api/ai/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature,
          max_tokens: maxTokens,
          model,
          stream: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Local streaming error: ${error.error?.message || 'Backend unavailable'}`);
      }

      return this.processStream(response, onChunk, 'local');
    } catch (error) {
      if (error.message.includes('fetch')) {
        throw new Error('Local backend unavailable. Make sure the backend server is running.');
      }
      throw error;
    }
  }

  async processStream(response, onChunk, provider) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completeText = '';
    const jsonParser = new IncrementalJSONParser();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim() === '') continue;

          let content = '';
          
          if (provider === 'openai' || provider === 'local') {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                content = parsed.choices[0]?.delta?.content || '';
              } catch (e) {
                continue; // Skip malformed JSON
              }
            }
          } else if (provider === 'claude') {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta') {
                  content = parsed.delta?.text || '';
                }
              } catch (e) {
                continue; // Skip malformed JSON
              }
            }
          }

          if (content) {
            completeText += content;
            
            // Try to parse complete JSON objects from the accumulated text
            const completeObjects = jsonParser.addChunk(content);
            
            // Call the callback with the new chunk and any complete objects
            if (onChunk) {
              onChunk(content, completeObjects, completeText);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return completeText;
  }
}

/**
 * Incremental JSON parser that detects complete JSON objects in streaming text
 */
class IncrementalJSONParser {
  constructor() {
    this.buffer = '';
    this.braceStack = [];
    this.inString = false;
    this.escaped = false;
    this.completeObjects = [];
  }

  addChunk(chunk) {
    this.buffer += chunk;
    const newObjects = [];

    let objectStart = -1;
    
    for (let i = this.buffer.length - chunk.length; i < this.buffer.length; i++) {
      const char = this.buffer[i];
      
      if (this.escaped) {
        this.escaped = false;
        continue;
      }
      
      if (char === '\\' && this.inString) {
        this.escaped = true;
        continue;
      }
      
      if (char === '"' && !this.escaped) {
        this.inString = !this.inString;
        continue;
      }
      
      if (this.inString) continue;
      
      if (char === '{' || char === '[') {
        if (this.braceStack.length === 0) {
          objectStart = this.findObjectStart(i);
        }
        this.braceStack.push(char);
      } else if (char === '}' || char === ']') {
        if (this.braceStack.length > 0) {
          const expected = this.braceStack.pop();
          const isMatch = (char === '}' && expected === '{') || (char === ']' && expected === '[');
          
          if (isMatch && this.braceStack.length === 0) {
            // Found a complete object
            const objectText = this.buffer.substring(objectStart, i + 1);
            try {
              const parsed = JSON.parse(objectText);
              newObjects.push(parsed);
              
              // Remove the processed object from buffer
              this.buffer = this.buffer.substring(0, objectStart) + this.buffer.substring(i + 1);
              i = objectStart - 1; // Adjust index after buffer modification
            } catch (e) {
              // JSON parsing failed, continue looking
            }
          }
        }
      }
    }
    
    return newObjects;
  }

  findObjectStart(currentPos) {
    // Look backwards to find the start of the JSON object
    let pos = currentPos;
    while (pos > 0 && /\s/.test(this.buffer[pos - 1])) {
      pos--;
    }
    
    // Look for array context or object start
    if (pos > 0 && this.buffer[pos - 1] === ',') {
      // Part of an array, find the opening bracket
      let bracketCount = 0;
      for (let i = pos - 2; i >= 0; i--) {
        if (this.buffer[i] === ']') bracketCount++;
        else if (this.buffer[i] === '[') {
          bracketCount--;
          if (bracketCount < 0) return i;
        }
      }
    }
    
    return currentPos;
  }

  reset() {
    this.buffer = '';
    this.braceStack = [];
    this.inString = false;
    this.escaped = false;
    this.completeObjects = [];
  }
}

export default new AIService();
export { AI_PROVIDERS };