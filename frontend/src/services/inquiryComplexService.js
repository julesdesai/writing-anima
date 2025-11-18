import aiService from './aiService';
import InquiryComplexFactory, { NodeTypes } from '../types/inquiryComplex';
import inquiryPrompts from '../prompts/inquiryComplex';

/**
 * Service for generating and managing Inquiry Complexes using AI
 */
class InquiryComplexService {
  constructor() {
    this.activeComplexes = new Map();
    this.generationQueue = [];
    this.isProcessing = false;
  }

  /**
   * Generate multiple perspective options for a question
   */
  async generatePerspectiveOptions(question) {
    try {
      // Generate multiple central points using AI
      const centralPointPrompt = inquiryPrompts.generateCentralPointPrompt(question);
      const response = await aiService.callAPI(centralPointPrompt, undefined, {
        temperature: 0.7,
        maxTokens: 600
      });

      const perspectiveData = this.parseAIResponse(response);
      
      if (!perspectiveData.positions || !Array.isArray(perspectiveData.positions)) {
        throw new Error('Invalid perspective response format');
      }

      return {
        question,
        perspectives: perspectiveData.positions.map((position, index) => ({
          id: `perspective-${Date.now()}-${index}`,
          content: position.content,
          strength: position.strength || 0.75,
          tags: position.tags || [],
          keyTerms: position.keyTerms || [],
          reasoning: position.reasoning || '',
          perspective: position.perspective || `Position ${index + 1}`
        }))
      };
    } catch (error) {
      console.error('Failed to generate perspective options:', error);
      throw error;
    }
  }

  /**
   * Create a new inquiry complex from a question and selected perspective
   */
  async createComplex(question, selectedPerspective = null) {
    try {
      let centralPointData;
      
      if (selectedPerspective) {
        // Use the selected perspective
        centralPointData = selectedPerspective;
      } else {
        // Legacy mode: generate single perspective (for backward compatibility)
        const centralPointPrompt = inquiryPrompts.generateCentralPointPrompt(question);
        const response = await aiService.callAPI(centralPointPrompt, undefined, {
          temperature: 0.7,
          maxTokens: 400
        });

        const responseData = this.parseAIResponse(response);
        
        // Handle both old and new response formats
        if (responseData.positions && Array.isArray(responseData.positions)) {
          centralPointData = responseData.positions[0]; // Use first position
        } else {
          centralPointData = responseData; // Old format
        }
      }
      
      // Create the complex structure
      const complex = InquiryComplexFactory.createComplex(
        question,
        centralPointData.content
      );

      // Enhance central node with AI-generated metadata
      const centralNode = complex.nodes.get(complex.centralPointId);
      centralNode.metadata = {
        ...centralNode.metadata,
        strength: centralPointData.strength || 0.8,
        tags: centralPointData.tags || [],
        keyTerms: centralPointData.keyTerms || [],
        reasoning: centralPointData.reasoning || '',
        perspective: centralPointData.perspective || 'Primary Position'
      };

      // Store the complex
      this.activeComplexes.set(complex.id, complex);

      return complex;
    } catch (error) {
      console.error('Failed to create inquiry complex:', error);
      throw error;
    }
  }

  /**
   * Expand a node by generating its children (objections, refutations, syntheses)
   */
  async expandNode(complexId, nodeId, expansionType = 'objections') {
    const complex = this.activeComplexes.get(complexId);
    if (!complex) {
      throw new Error('Complex not found');
    }

    const node = complex.nodes.get(nodeId);
    if (!node) {
      throw new Error('Node not found');
    }

    try {
      switch (expansionType) {
        case 'objections':
          return await this.generateObjections(complex, nodeId);
        case 'refutation':
          return await this.generateRefutation(complex, nodeId);
        case 'synthesis':
          return await this.generateSynthesis(complex, nodeId);
        default:
          throw new Error(`Unknown expansion type: ${expansionType}`);
      }
    } catch (error) {
      console.error(`Failed to expand node ${nodeId}:`, error);
      throw error;
    }
  }

  /**
   * Generate objections to a point
   */
  async generateObjections(complex, pointId) {
    const point = complex.nodes.get(pointId);
    const path = InquiryComplexFactory.getPathToNode(complex, pointId);
    
    const prompt = inquiryPrompts.generateObjectionsPrompt(
      point.content,
      complex.centralQuestion,
      path
    );

    const response = await aiService.callAPI(prompt, undefined, {
      temperature: 0.8,
      maxTokens: 600
    });

    const objectionsData = this.parseAIResponse(response);
    const newNodeIds = [];

    for (const objectionData of objectionsData.objections) {
      const nodeId = InquiryComplexFactory.addNode(
        complex,
        pointId,
        NodeTypes.OBJECTION,
        objectionData.content
      );

      // Enhance with AI metadata
      const node = complex.nodes.get(nodeId);
      node.metadata = {
        ...node.metadata,
        strength: objectionData.strength || 0.6,
        tags: objectionData.tags || [],
        objectionType: objectionData.type,
        focusArea: objectionData.focusArea
      };

      newNodeIds.push(nodeId);
    }

    return newNodeIds;
  }

  /**
   * Generate a refutation to an objection
   */
  async generateRefutation(complex, objectionId) {
    const objection = complex.nodes.get(objectionId);
    const originalPoint = complex.nodes.get(objection.parentId);
    const path = InquiryComplexFactory.getPathToNode(complex, objectionId);

    const prompt = inquiryPrompts.generateRefutationPrompt(
      objection.content,
      originalPoint.content,
      complex.centralQuestion,
      path
    );

    const response = await aiService.callAPI(prompt, undefined, {
      temperature: 0.7,
      maxTokens: 500
    });

    const refutationData = this.parseAIResponse(response);

    const nodeId = InquiryComplexFactory.addNode(
      complex,
      objectionId,
      NodeTypes.REFUTATION,
      refutationData.content
    );

    // Enhance with AI metadata
    const node = complex.nodes.get(nodeId);
    node.metadata = {
      ...node.metadata,
      strength: refutationData.strength || 0.7,
      tags: refutationData.tags || [],
      strategy: refutationData.strategy,
      concessions: refutationData.concessions,
      newClarifications: refutationData.newClarifications
    };

    return nodeId;
  }

  /**
   * Generate synthesis between two opposing points
   */
  async generateSynthesis(complex, nodeId1, nodeId2 = null) {
    let point1, point2, parentId;

    if (nodeId2) {
      // Synthesis between two specific nodes
      point1 = complex.nodes.get(nodeId1);
      point2 = complex.nodes.get(nodeId2);
      // Find common parent for placement
      parentId = this.findCommonParent(complex, nodeId1, nodeId2);
    } else {
      // Synthesis between a point and its strongest objection
      point1 = complex.nodes.get(nodeId1);
      const objections = point1.childIds
        .map(id => complex.nodes.get(id))
        .filter(node => node.type === NodeTypes.OBJECTION)
        .sort((a, b) => b.metadata.strength - a.metadata.strength);
      
      if (objections.length === 0) {
        throw new Error('No objections found to synthesize with');
      }
      
      point2 = objections[0];
      parentId = nodeId1;
    }

    const path = InquiryComplexFactory.getPathToNode(complex, parentId);

    const prompt = inquiryPrompts.generateSynthesisPrompt(
      point1.content,
      point2.content,
      complex.centralQuestion,
      path
    );

    const response = await aiService.callAPI(prompt, undefined, {
      temperature: 0.8,
      maxTokens: 700
    });

    const synthesisData = this.parseAIResponse(response);

    const nodeId = InquiryComplexFactory.addNode(
      complex,
      parentId,
      NodeTypes.SYNTHESIS,
      synthesisData.content
    );

    // Enhance with AI metadata
    const node = complex.nodes.get(nodeId);
    node.metadata = {
      ...node.metadata,
      strength: synthesisData.strength || 0.8,
      tags: synthesisData.tags || [],
      approach: synthesisData.approach,
      preservedElements: synthesisData.preservedElements || [],
      newInsight: synthesisData.newInsight,
      implications: synthesisData.implications
    };

    return nodeId;
  }

  /**
   * Auto-expand a complex to a certain depth with balanced exploration
   */
  async autoExpand(complexId, targetDepth = 3, maxNodes = 20) {
    const complex = this.activeComplexes.get(complexId);
    if (!complex) {
      throw new Error('Complex not found');
    }

    const expansionPlan = this.planAutoExpansion(complex, targetDepth, maxNodes);
    
    for (const step of expansionPlan) {
      try {
        await this.expandNode(complexId, step.nodeId, step.type);
        
        // Small delay to avoid overwhelming the AI service
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Auto-expansion step failed:`, error);
        // Continue with remaining steps
      }
    }

    return complex;
  }

  /**
   * Plan the sequence of expansions for auto-expand
   */
  planAutoExpansion(complex, targetDepth, maxNodes) {
    const plan = [];
    const currentNodes = Array.from(complex.nodes.values())
      .filter(node => node.depth < targetDepth)
      .sort((a, b) => a.depth - b.depth || b.metadata.strength - a.metadata.strength);

    for (const node of currentNodes) {
      if (plan.length >= maxNodes) break;

      if (node.type === NodeTypes.POINT && node.childIds.length === 0) {
        // Generate objections for unexplored points
        plan.push({ nodeId: node.id, type: 'objections' });
      } else if (node.type === NodeTypes.OBJECTION && node.childIds.length === 0) {
        // Generate refutations for unrefuted objections
        plan.push({ nodeId: node.id, type: 'refutation' });
      }

      // Occasionally generate syntheses
      if (node.type === NodeTypes.POINT && 
          node.childIds.length > 1 && 
          Math.random() < 0.3) {
        plan.push({ nodeId: node.id, type: 'synthesis' });
      }
    }

    return plan;
  }

  /**
   * Analyze the overall complex for insights and suggestions
   */
  async analyzeComplex(complexId) {
    const complex = this.activeComplexes.get(complexId);
    if (!complex) {
      throw new Error('Complex not found');
    }

    const complexSummary = inquiryPrompts.createComplexSummary(complex);
    const prompt = inquiryPrompts.analyzeComplexPrompt(complexSummary, complex.centralQuestion);

    const response = await aiService.callAPI(prompt, undefined, {
      temperature: 0.6,
      maxTokens: 800
    });

    return this.parseAIResponse(response);
  }

  /**
   * Find common parent of two nodes
   */
  findCommonParent(complex, nodeId1, nodeId2) {
    const path1 = InquiryComplexFactory.getPathToNode(complex, nodeId1);
    const path2 = InquiryComplexFactory.getPathToNode(complex, nodeId2);

    // Find last common node in paths
    for (let i = 0; i < Math.min(path1.length, path2.length); i++) {
      if (path1[i].id !== path2[i].id) {
        return i > 0 ? path1[i - 1].id : complex.centralPointId;
      }
    }

    return path1.length < path2.length ? path1[path1.length - 1].id : path2[path2.length - 1].id;
  }

  /**
   * Parse AI response with error handling
   */
  parseAIResponse(response) {
    let cleanResponse = response.trim();
    
    try {
      // Clean common AI response formatting
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Remove any text before the first { or [
      const jsonStartMatch = cleanResponse.match(/[\{\[]/);
      if (jsonStartMatch) {
        const startIndex = cleanResponse.indexOf(jsonStartMatch[0]);
        cleanResponse = cleanResponse.substring(startIndex);
      }

      // Extract JSON from response (handle both objects and arrays)
      let jsonMatch;
      if (cleanResponse.startsWith('{')) {
        jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      } else if (cleanResponse.startsWith('[')) {
        jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      }
      
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      
      // Try to parse JSON, with repair attempts if it fails
      let parsed;
      try {
        parsed = JSON.parse(cleanResponse);
      } catch (jsonError) {
        console.log('Initial JSON parse failed, attempting repair...', jsonError.message);
        
        // Aggressive JSON repair attempts
        let repairedResponse = cleanResponse;
        
        // Fix trailing commas in arrays and objects
        repairedResponse = repairedResponse.replace(/,(\s*[}\]])/g, '$1');
        
        // Fix missing commas between array elements (more aggressive patterns)
        repairedResponse = repairedResponse.replace(/}(\s*){/g, '},$1{');
        repairedResponse = repairedResponse.replace(/}(\s+)"/g, '},$1"');
        repairedResponse = repairedResponse.replace(/}(\s*)\n(\s*){/g, '},$1\n$2{');
        repairedResponse = repairedResponse.replace(/](\s*){/g, '],$1{');
        
        // Fix missing commas between object properties
        repairedResponse = repairedResponse.replace(/"(\s*)\n(\s*)"/g, '",$1\n$2"');
        repairedResponse = repairedResponse.replace(/([0-9.])(\s+)"/g, '$1,$2"');
        repairedResponse = repairedResponse.replace(/](\s+)"/g, '],$1"');
        
        // Fix unescaped quotes in strings (more comprehensive)
        repairedResponse = repairedResponse.replace(/: "([^"]*)"([^",}\]]*)"([^",}\]]*)/g, ': "$1\\"$2\\"$3');
        
        // Fix incomplete arrays - add closing bracket if missing
        const openBrackets = (repairedResponse.match(/\[/g) || []).length;
        const closeBrackets = (repairedResponse.match(/\]/g) || []).length;
        if (openBrackets > closeBrackets) {
          for (let i = 0; i < openBrackets - closeBrackets; i++) {
            repairedResponse += ']';
          }
        }
        
        // Fix incomplete objects - add closing brace if missing
        const openBraces = (repairedResponse.match(/\{/g) || []).length;
        const closeBraces = (repairedResponse.match(/\}/g) || []).length;
        if (openBraces > closeBraces) {
          for (let i = 0; i < openBraces - closeBraces; i++) {
            repairedResponse += '}';
          }
        }
        
        // Try parsing again
        try {
          parsed = JSON.parse(repairedResponse);
        } catch (repairError) {
          console.log('JSON repair failed, trying to extract partial data...');
          
          // Last resort: try to extract themes array specifically
          const themesArrayMatch = repairedResponse.match(/"themes":\s*\[([\s\S]*?)\]/);
          if (themesArrayMatch) {
            try {
              const themesArrayStr = '[' + themesArrayMatch[1] + ']';
              const themesArray = JSON.parse(themesArrayStr);
              parsed = { themes: themesArray };
              console.log('Extracted themes array successfully as fallback');
            } catch (fallbackError) {
              console.error('All JSON parsing attempts failed');
              throw new Error(`Unable to parse AI response. JSON errors: ${jsonError.message}, Repair error: ${repairError.message}`);
            }
          } else {
            throw new Error(`Unable to parse AI response: ${jsonError.message}`);
          }
        }
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.log('Raw response:', response);
      console.log('Cleaned response:', cleanResponse?.substring(0, 500));
      throw new Error(`Invalid AI response format: ${error.message}`);
    }
  }

  /**
   * Export complex for persistence
   */
  exportComplex(complexId) {
    const complex = this.activeComplexes.get(complexId);
    if (!complex) {
      throw new Error('Complex not found');
    }

    return InquiryComplexFactory.serialize(complex);
  }

  /**
   * Import complex from saved data
   */
  importComplex(data) {
    const complex = InquiryComplexFactory.deserialize(data);
    this.activeComplexes.set(complex.id, complex);
    return complex;
  }

  /**
   * Get all active complexes
   */
  getAllComplexes() {
    return Array.from(this.activeComplexes.values());
  }

  /**
   * Load a complex from external data (e.g., from Firestore)
   */
  loadComplex(complexData) {
    try {
      console.log('Loading complex data:', complexData);
      
      // Validate required fields
      if (!complexData || !complexData.id || !complexData.centralQuestion) {
        console.warn('Invalid complex data - missing required fields:', {
          hasData: !!complexData,
          hasId: !!complexData?.id,
          hasCentralQuestion: !!complexData?.centralQuestion
        });
        return null;
      }
      
      // Create complex structure from saved data
      const complex = {
        id: complexData.id,
        centralQuestion: complexData.centralQuestion,
        centralPointId: complexData.centralPointId || `node-${Date.now()}-1`,
        nodes: new Map(),
        edges: new Map(),
        createdAt: complexData.createdAt ? new Date(complexData.createdAt) : new Date(),
        lastModified: complexData.lastModified ? new Date(complexData.lastModified) : new Date(),
        metadata: complexData.metadata || {
          createdAt: new Date(),
          maxDepth: 1,
          explorationStats: {
            nodesByType: { point: 1, objection: 0, synthesis: 0, refutation: 0 }
          }
        }
      };

      // Load nodes with better error handling
      if (complexData.nodes) {
        Object.entries(complexData.nodes).forEach(([nodeId, nodeData]) => {
          try {
            if (!nodeData) {
              console.warn(`Skipping invalid node data for ${nodeId}`);
              return;
            }
            
            complex.nodes.set(nodeId, {
              id: nodeId,
              type: nodeData.type || 'point',
              content: nodeData.content || '',
              summary: nodeData.summary || nodeData.content || '',
              metadata: nodeData.metadata || { strength: 0.7 },
              createdAt: nodeData.createdAt ? new Date(nodeData.createdAt) : new Date(),
              parentId: nodeData.parentId || null,
              childIds: nodeData.childIds || [],
              depth: nodeData.depth || 1
            });
          } catch (nodeError) {
            console.error(`Failed to load node ${nodeId}:`, nodeError);
          }
        });
      }

      // Load edges with better error handling
      if (complexData.edges) {
        Object.entries(complexData.edges).forEach(([edgeId, edgeData]) => {
          try {
            if (!edgeData) {
              console.warn(`Skipping invalid edge data for ${edgeId}`);
              return;
            }
            
            complex.edges.set(edgeId, {
              id: edgeId,
              from: edgeData.from,
              to: edgeData.to,
              type: edgeData.type || 'supports',
              metadata: edgeData.metadata || {}
            });
          } catch (edgeError) {
            console.error(`Failed to load edge ${edgeId}:`, edgeError);
          }
        });
      }

      // Ensure at least one node exists (the central point)
      if (complex.nodes.size === 0) {
        console.warn('Complex has no nodes, creating minimal central point');
        complex.nodes.set(complex.centralPointId, {
          id: complex.centralPointId,
          type: 'point',
          content: 'Central point (restored from incomplete data)',
          summary: 'Central point (restored from incomplete data)',
          metadata: { strength: 0.5, restored: true },
          createdAt: new Date(),
          parentId: null,
          childIds: [],
          depth: 1
        });
      }

      // Store in active complexes
      this.activeComplexes.set(complex.id, complex);
      console.log(`Successfully loaded complex ${complex.id} with ${complex.nodes.size} nodes and ${complex.edges.size} edges`);
      
      return complex;
    } catch (error) {
      console.error('Failed to load complex:', error, complexData);
      return null; // Return null instead of throwing to prevent cascading failures
    }
  }

  /**
   * Serialize a complex for storage (e.g., in Firestore)
   */
  serializeComplex(complex) {
    try {
      console.log(`Serializing complex ${complex.id} with ${complex.nodes.size} nodes`);
      
      // Convert Maps to plain objects for JSON serialization
      const nodes = {};
      complex.nodes.forEach((node, nodeId) => {
        nodes[nodeId] = {
          ...node,
          createdAt: node.createdAt ? node.createdAt.toISOString() : new Date().toISOString()
        };
      });

      const edges = {};
      complex.edges.forEach((edge, edgeId) => {
        edges[edgeId] = edge;
      });

      const serialized = {
        id: complex.id,
        centralQuestion: complex.centralQuestion,
        centralPointId: complex.centralPointId,
        nodes,
        edges,
        createdAt: complex.createdAt ? complex.createdAt.toISOString() : new Date().toISOString(),
        lastModified: complex.lastModified ? complex.lastModified.toISOString() : new Date().toISOString(),
        metadata: complex.metadata || {}
      };
      
      console.log(`Serialized complex structure:`, {
        id: serialized.id,
        nodeCount: Object.keys(serialized.nodes).length,
        edgeCount: Object.keys(serialized.edges).length,
        hasMetadata: !!serialized.metadata
      });
      
      return serialized;
    } catch (error) {
      console.error('Failed to serialize complex:', error, complex);
      throw error;
    }
  }

  /**
   * Clear all active complexes (for switching projects)
   */
  clearAll() {
    this.activeComplexes.clear();
  }

  /**
   * Calculate string similarity using simple word overlap
   */
  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const words1 = new Set(str1.split(/\s+/).filter(word => word.length > 2));
    const words2 = new Set(str2.split(/\s+/).filter(word => word.length > 2));
    
    if (words1.size === 0 && words2.size === 0) return 1;
    if (words1.size === 0 || words2.size === 0) return 0;
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Delete a complex
   */
  deleteComplex(complexId) {
    return this.activeComplexes.delete(complexId);
  }

  /**
   * Extract key themes from written text and create complexes
   */
  async extractThemesFromText(content, purpose, maxThemes = 5) {
    if (!content || content.length < 200) {
      throw new Error('Insufficient content for theme extraction (minimum 200 characters)');
    }

    // Get existing theme-extracted complexes to avoid duplication
    const existingComplexes = this.getAllComplexes();
    const existingThemes = existingComplexes
      .filter(complex => complex.metadata?.extractedTheme)
      .map(complex => ({
        title: complex.metadata.extractedTheme.title,
        description: complex.metadata.extractedTheme.description,
        question: complex.centralQuestion
      }));

    console.log(`Found ${existingThemes.length} existing theme-based complexes to avoid duplicating`);

    try {
      let response;
      let attempt = 1;
      
      // First attempt: Standard prompt with moderate tokens
      try {
        console.log('Theme extraction attempt 1: Standard prompt');
        const themeExtractionPrompt = inquiryPrompts.extractThemesPrompt(content, purpose, maxThemes, existingThemes);
        response = await aiService.callAPI(themeExtractionPrompt, undefined, {
          temperature: 0.4,
          maxTokens: 500
        });
      } catch (apiError) {
        console.log('Attempt 1 failed, trying simplified prompt:', apiError);
        attempt = 2;
        
        // Second attempt: Simplified prompt with fewer tokens
        try {
          const simplePrompt = inquiryPrompts.extractThemesPromptSimple(content, purpose, Math.min(maxThemes, 3), existingThemes);
          response = await aiService.callAPI(simplePrompt, undefined, {
            temperature: 0.3,
            maxTokens: 300
          });
        } catch (simpleError) {
          console.log('Attempt 2 failed, final attempt with minimal prompt:', simpleError);
          attempt = 3;
          
          // Final attempt: Ultra-simple with very few tokens (no existing themes to keep it short)
          const minimalPrompt = `Extract 2 NEW themes from: ${content.substring(0, 500)}...\n\nJSON: {"themes":[{"title":"Theme","description":"Desc","question":"Q?","significance":0.8}]}`;
          response = await aiService.callAPI(minimalPrompt, undefined, {
            temperature: 0.2,
            maxTokens: 200
          });
        }
      }
      
      console.log(`Theme extraction successful on attempt ${attempt}`);

      console.log('Raw theme extraction response:', response);
      let themesData;
      
      try {
        themesData = this.parseAIResponse(response);
        console.log('Parsed themes data:', themesData);
      } catch (parseError) {
        console.error('Failed to parse theme extraction response:', parseError);
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
      }
      
      // Handle different response formats
      if (Array.isArray(themesData)) {
        // AI returned array directly
        themesData = { themes: themesData };
      } else if (!themesData.themes) {
        // AI returned object but no themes property
        console.error('Invalid themes response structure:', themesData);
        throw new Error(`Invalid themes response format - expected themes array, got: ${JSON.stringify(themesData, null, 2)}`);
      }
      
      if (!Array.isArray(themesData.themes)) {
        console.error('Themes is not an array:', themesData.themes);
        throw new Error(`Invalid themes format - themes should be an array, got: ${typeof themesData.themes}`);
      }
      
      if (themesData.themes.length === 0) {
        if (existingThemes.length > 0) {
          throw new Error(`No new themes found. You already have ${existingThemes.length} theme-based complexes that cover the main intellectual themes in your text.`);
        } else {
          throw new Error('No themes extracted from the text. Try with longer or more complex content.');
        }
      }

      const extractedThemes = [];
      
      for (const themeData of themesData.themes.slice(0, maxThemes)) {
        try {
          // Validate theme data
          if (!themeData.question || !themeData.title) {
            console.warn('Skipping invalid theme data:', themeData);
            continue;
          }
          
          // Check for similarity to existing themes (additional safeguard)
          const isTooSimilar = existingThemes.some(existing => {
            const titleSimilarity = this.calculateStringSimilarity(
              themeData.title.toLowerCase(), 
              existing.title.toLowerCase()
            );
            const descriptionSimilarity = this.calculateStringSimilarity(
              themeData.description.toLowerCase(), 
              existing.description.toLowerCase()
            );
            return titleSimilarity > 0.7 || descriptionSimilarity > 0.6;
          });
          
          if (isTooSimilar) {
            console.log(`Skipping theme "${themeData.title}" - too similar to existing theme`);
            continue;
          }
          
          // Create a complex from each theme
          const complex = await this.createComplex(themeData.question);
          
          // Enhance the complex with theme-specific metadata
          complex.metadata = {
            ...complex.metadata,
            extractedTheme: {
              title: themeData.title,
              description: themeData.description,
              significance: themeData.significance,
              textReferences: themeData.textReferences || [],
              extractedAt: new Date(),
              sourceContentLength: content.length,
              sourcePurpose: purpose
            }
          };

          extractedThemes.push({
            theme: themeData,
            complex: complex
          });

          // Small delay to avoid overwhelming AI service
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.warn(`Failed to create complex for theme "${themeData.title}":`, error);
        }
      }

      return {
        themes: extractedThemes,
        sourceAnalysis: {
          contentLength: content.length,
          extractedCount: extractedThemes.length,
          purpose: purpose,
          extractedAt: new Date()
        }
      };

    } catch (error) {
      console.error('Failed to extract themes from text:', error);
      throw error;
    }
  }
}

export default new InquiryComplexService();