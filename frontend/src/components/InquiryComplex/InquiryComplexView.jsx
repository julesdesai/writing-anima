import React, { useState, useEffect } from 'react';
import { Brain, Lightbulb, Target, BarChart3, Download, Trash2 } from 'lucide-react';
import InquiryNode from './InquiryNode';
import { NodeTypes } from '../../types/inquiryComplex';

const InquiryComplexView = ({ 
  complex, 
  onExpandNode, 
  onDeleteComplex,
  onAnalyze,
  isAnalyzing = false 
}) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set([complex.centralPointId]));
  const [selectedNode, setSelectedNode] = useState(complex.centralPointId);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'graph'

  useEffect(() => {
    // Auto-expand central point
    setExpandedNodes(new Set([complex.centralPointId]));
  }, [complex.centralPointId]);

  const toggleNodeExpansion = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleExpandNode = async (nodeId, expansionType) => {
    // Set loading state
    const node = complex.nodes.get(nodeId);
    if (node) {
      node.isExpanding = true;
    }

    try {
      const newNodeIds = await onExpandNode(complex.id, nodeId, expansionType);
      
      // Auto-expand parent to show new children
      setExpandedNodes(prev => new Set([...prev, nodeId]));
      
    } catch (error) {
      console.error('Failed to expand node:', error);
    } finally {
      // Clear loading state
      if (node) {
        node.isExpanding = false;
      }
    }
  };

  const renderNodeTree = (nodeId, depth = 0) => {
    const node = complex.nodes.get(nodeId);
    if (!node) return null;

    const isExpanded = expandedNodes.has(nodeId);
    const children = node.childIds?.map(childId => renderNodeTree(childId, depth + 1)) || [];

    return (
      <InquiryNode
        key={nodeId}
        node={node}
        depth={depth}
        isExpanded={isExpanded}
        isSelected={selectedNode === nodeId}
        onToggleExpand={toggleNodeExpansion}
        onExpandNode={handleExpandNode}
        onSelect={setSelectedNode}
        children={children}
      />
    );
  };

  const getComplexStats = () => {
    const stats = {
      totalNodes: complex.nodes.size,
      maxDepth: complex.metadata.maxDepth,
      nodesByType: {
        [NodeTypes.POINT]: 0,
        [NodeTypes.OBJECTION]: 0,
        [NodeTypes.SYNTHESIS]: 0,
        [NodeTypes.REFUTATION]: 0
      }
    };

    for (const node of complex.nodes.values()) {
      stats.nodesByType[node.type]++;
    }

    return stats;
  };

  const stats = getComplexStats();
  const selectedNodeObj = complex.nodes.get(selectedNode);

  return (
    <div className="inquiry-complex-view h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Inquiry Complex</h2>
              <p className="text-sm text-gray-600">{complex.centralQuestion}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAnalyze?.(complex.id)}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {isAnalyzing ? (
                <Brain className="w-4 h-4 animate-pulse" />
              ) : (
                <BarChart3 className="w-4 h-4" />
              )}
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
            
            <button
              onClick={() => {
                const data = JSON.stringify(complex, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `inquiry-complex-${Date.now()}.json`;
                a.click();
              }}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              title="Export Complex"
            >
              <Download className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => onDeleteComplex?.(complex.id)}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
              title="Delete Complex"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></span>
            <span>{stats.nodesByType[NodeTypes.POINT]} Points</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-100 border border-red-300 rounded"></span>
            <span>{stats.nodesByType[NodeTypes.OBJECTION]} Objections</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span>
            <span>{stats.nodesByType[NodeTypes.SYNTHESIS]} Syntheses</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></span>
            <span>{stats.nodesByType[NodeTypes.REFUTATION]} Refutations</span>
          </div>
          <div className="border-l border-gray-300 pl-6">
            <span>Max Depth: {stats.maxDepth}</span>
          </div>
          <div>
            <span>Total Nodes: {stats.totalNodes}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tree View */}
        <div className="flex-1 overflow-auto p-4">
          {complex.centralPointId && renderNodeTree(complex.centralPointId)}
        </div>

        {/* Side Panel - Selected Node Details */}
        {selectedNodeObj && (
          <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-auto">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedNodeObj.type === NodeTypes.POINT ? 'bg-blue-100 text-blue-800' :
                  selectedNodeObj.type === NodeTypes.OBJECTION ? 'bg-red-100 text-red-800' :
                  selectedNodeObj.type === NodeTypes.SYNTHESIS ? 'bg-green-100 text-green-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {selectedNodeObj.type}
                </span>
                <span className="text-xs text-gray-500">Depth {selectedNodeObj.depth}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Selected Node</h3>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Content</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedNodeObj.content}
                </p>
              </div>

              {selectedNodeObj.metadata?.strength && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                    Argument Strength
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          selectedNodeObj.metadata.strength > 0.7 ? 'bg-green-500' :
                          selectedNodeObj.metadata.strength > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${selectedNodeObj.metadata.strength * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {Math.round(selectedNodeObj.metadata.strength * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {selectedNodeObj.metadata?.tags && selectedNodeObj.metadata.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedNodeObj.metadata.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-xs rounded text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedNodeObj.metadata?.reasoning && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">AI Reasoning</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {selectedNodeObj.metadata.reasoning}
                  </p>
                </div>
              )}

              {selectedNodeObj.metadata?.strategy && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Strategy</h4>
                  <span className="text-xs text-gray-600 capitalize">
                    {selectedNodeObj.metadata.strategy}
                  </span>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Children</h4>
                <span className="text-xs text-gray-500">
                  {selectedNodeObj.childIds?.length || 0} child nodes
                </span>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Created</h4>
                <span className="text-xs text-gray-500">
                  {selectedNodeObj.metadata?.createdAt ? 
                    new Date(selectedNodeObj.metadata.createdAt).toLocaleString() : 
                    'Unknown'
                  }
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InquiryComplexView;