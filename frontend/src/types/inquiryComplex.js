/**
 * Data structures for representing Inquiry Complexes
 * 
 * An Inquiry Complex is a recursive network of intellectual exploration
 * starting from a central point of interest and expanding through:
 * - Points: Core intellectual positions or claims
 * - Objections: Challenges or counter-arguments to points
 * - Syntheses: Resolutions that integrate opposing viewpoints
 * - Refutations: Responses to objections that defend original points
 */

/**
 * @typedef {Object} InquiryNode
 * @property {string} id - Unique identifier
 * @property {string} type - 'point' | 'objection' | 'synthesis' | 'refutation'
 * @property {string} content - The intellectual content/argument
 * @property {string} summary - Brief summary of the content
 * @property {number} depth - Distance from central point (0 = central)
 * @property {string} parentId - ID of parent node (null for central point)
 * @property {string[]} childIds - IDs of child nodes
 * @property {Object} metadata - Additional information
 * @property {number} metadata.strength - Argument strength (0-1)
 * @property {string[]} metadata.tags - Categorical tags
 * @property {string[]} metadata.sources - Relevant sources/evidence
 * @property {Date} metadata.createdAt - When this node was generated
 * @property {Object} position - Visual layout position
 * @property {number} position.x - X coordinate for visualization
 * @property {number} position.y - Y coordinate for visualization
 */

/**
 * @typedef {Object} InquiryComplex
 * @property {string} id - Unique identifier for the complex
 * @property {string} centralQuestion - The core question or topic
 * @property {string} centralPointId - ID of the central node
 * @property {Map<string, InquiryNode>} nodes - All nodes in the complex
 * @property {Object} metadata - Complex-level metadata
 * @property {number} metadata.maxDepth - Maximum depth explored
 * @property {Date} metadata.createdAt - When complex was initiated
 * @property {Date} metadata.lastUpdated - Last modification time
 * @property {Object} metadata.explorationStats - Statistics about the complex
 */

/**
 * Node type definitions and their relationships
 */
export const NodeTypes = {
  POINT: 'point',           // Core intellectual position
  OBJECTION: 'objection',   // Challenge to a point
  SYNTHESIS: 'synthesis',   // Integration of opposing views
  REFUTATION: 'refutation'  // Defense against an objection
};

/**
 * Defines what node types can be children of other types
 */
export const NodeRelationships = {
  [NodeTypes.POINT]: [NodeTypes.OBJECTION, NodeTypes.SYNTHESIS],
  [NodeTypes.OBJECTION]: [NodeTypes.REFUTATION, NodeTypes.SYNTHESIS],
  [NodeTypes.SYNTHESIS]: [NodeTypes.OBJECTION], // Syntheses can face objections
  [NodeTypes.REFUTATION]: [NodeTypes.OBJECTION] // Refutations can face counter-objections
};

/**
 * Visual styling for different node types
 */
export const NodeStyles = {
  [NodeTypes.POINT]: {
    color: '#3b82f6',      // Blue
    bgColor: '#eff6ff',
    borderColor: '#3b82f6',
    icon: 'lightbulb'
  },
  [NodeTypes.OBJECTION]: {
    color: '#ef4444',      // Red
    bgColor: '#fef2f2',
    borderColor: '#ef4444',
    icon: 'x-circle'
  },
  [NodeTypes.SYNTHESIS]: {
    color: '#10b981',      // Green
    bgColor: '#f0fdf4',
    borderColor: '#10b981',
    icon: 'merge'
  },
  [NodeTypes.REFUTATION]: {
    color: '#f59e0b',      // Orange
    bgColor: '#fffbeb',
    borderColor: '#f59e0b',
    icon: 'shield'
  }
};

/**
 * Factory class for creating inquiry complex structures
 */
export class InquiryComplexFactory {
  /**
   * Create a new inquiry complex with a central point
   */
  static createComplex(centralQuestion, centralPoint) {
    const complexId = this.generateId('complex');
    const centralNodeId = this.generateId('node');
    
    const centralNode = {
      id: centralNodeId,
      type: NodeTypes.POINT,
      content: centralPoint,
      summary: this.generateSummary(centralPoint),
      depth: 0,
      parentId: null,
      childIds: [],
      metadata: {
        strength: 0.8, // Central points start with high strength
        tags: [],
        sources: [],
        createdAt: new Date()
      },
      position: { x: 0, y: 0 } // Central position
    };

    const nodes = new Map();
    nodes.set(centralNodeId, centralNode);

    return {
      id: complexId,
      centralQuestion,
      centralPointId: centralNodeId,
      nodes,
      metadata: {
        maxDepth: 0,
        createdAt: new Date(),
        lastUpdated: new Date(),
        explorationStats: {
          totalNodes: 1,
          nodesByType: {
            [NodeTypes.POINT]: 1,
            [NodeTypes.OBJECTION]: 0,
            [NodeTypes.SYNTHESIS]: 0,
            [NodeTypes.REFUTATION]: 0
          }
        }
      }
    };
  }

  /**
   * Add a new node to an existing complex
   */
  static addNode(complex, parentId, nodeType, content) {
    const nodeId = this.generateId('node');
    const parentNode = complex.nodes.get(parentId);
    
    if (!parentNode) {
      throw new Error(`Parent node ${parentId} not found`);
    }

    // Validate relationship
    if (!NodeRelationships[parentNode.type].includes(nodeType)) {
      throw new Error(`Cannot add ${nodeType} as child of ${parentNode.type}`);
    }

    const newNode = {
      id: nodeId,
      type: nodeType,
      content,
      summary: this.generateSummary(content),
      depth: parentNode.depth + 1,
      parentId,
      childIds: [],
      metadata: {
        strength: this.calculateInitialStrength(nodeType),
        tags: [],
        sources: [],
        createdAt: new Date()
      },
      position: this.calculatePosition(complex, parentId, nodeType)
    };

    // Update parent's children
    parentNode.childIds.push(nodeId);
    
    // Add to complex
    complex.nodes.set(nodeId, newNode);
    
    // Update complex metadata
    complex.metadata.maxDepth = Math.max(complex.metadata.maxDepth, newNode.depth);
    complex.metadata.lastUpdated = new Date();
    complex.metadata.explorationStats.totalNodes++;
    complex.metadata.explorationStats.nodesByType[nodeType]++;

    return nodeId;
  }

  /**
   * Generate unique ID
   */
  static generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate summary from content
   */
  static generateSummary(content) {
    // Simple summary - first 100 characters
    return content.length > 100 ? content.substring(0, 97) + '...' : content;
  }

  /**
   * Calculate initial strength based on node type
   */
  static calculateInitialStrength(nodeType) {
    const strengthMap = {
      [NodeTypes.POINT]: 0.7,
      [NodeTypes.OBJECTION]: 0.6,
      [NodeTypes.SYNTHESIS]: 0.8,
      [NodeTypes.REFUTATION]: 0.6
    };
    return strengthMap[nodeType] || 0.5;
  }

  /**
   * Calculate position for new node (basic circular layout)
   */
  static calculatePosition(complex, parentId, nodeType) {
    const parent = complex.nodes.get(parentId);
    const childCount = parent.childIds.length;
    
    // Simple radial layout around parent
    const radius = 150 + (parent.depth * 50);
    const angle = (childCount * 2 * Math.PI) / Math.max(3, childCount + 1);
    
    return {
      x: parent.position.x + radius * Math.cos(angle),
      y: parent.position.y + radius * Math.sin(angle)
    };
  }

  /**
   * Get all nodes of a specific type
   */
  static getNodesByType(complex, nodeType) {
    return Array.from(complex.nodes.values()).filter(node => node.type === nodeType);
  }

  /**
   * Get path from central point to a specific node
   */
  static getPathToNode(complex, nodeId) {
    const path = [];
    let currentId = nodeId;
    
    while (currentId) {
      const node = complex.nodes.get(currentId);
      if (!node) break;
      
      path.unshift(node);
      currentId = node.parentId;
    }
    
    return path;
  }

  /**
   * Export complex to JSON
   */
  static serialize(complex) {
    return {
      ...complex,
      nodes: Array.from(complex.nodes.entries())
    };
  }

  /**
   * Import complex from JSON
   */
  static deserialize(data) {
    return {
      ...data,
      nodes: new Map(data.nodes)
    };
  }
}

export default InquiryComplexFactory;