import React, { useState } from 'react';
import { Lightbulb, XCircle, Merge, Shield, ChevronDown, ChevronRight, Plus, Brain } from 'lucide-react';
import { NodeTypes, NodeStyles } from '../../types/inquiryComplex';

const NodeIcon = ({ type, className }) => {
  const iconProps = { className };
  
  switch (type) {
    case NodeTypes.POINT:
      return <Lightbulb {...iconProps} />;
    case NodeTypes.OBJECTION:
      return <XCircle {...iconProps} />;
    case NodeTypes.SYNTHESIS:
      return <Merge {...iconProps} />;
    case NodeTypes.REFUTATION:
      return <Shield {...iconProps} />;
    default:
      return <Brain {...iconProps} />;
  }
};

const StrengthIndicator = ({ strength }) => {
  const width = Math.max(10, Math.min(100, strength * 100));
  const colorClass = strength > 0.7 ? 'bg-green-500' : strength > 0.4 ? 'bg-yellow-500' : 'bg-red-500';
  
  return (
    <div className="w-16 bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full transition-all duration-300 ${colorClass}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

const InquiryNode = ({ 
  node, 
  isExpanded, 
  onToggleExpand, 
  onExpandNode, 
  isSelected, 
  onSelect,
  children,
  depth = 0
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const style = NodeStyles[node.type] || NodeStyles[NodeTypes.POINT];
  const hasChildren = node.childIds && node.childIds.length > 0;
  
  const handleExpansion = (type) => {
    onExpandNode(node.id, type);
    setShowActions(false);
  };

  return (
    <div className="inquiry-node-container">
      {/* Main Node */}
      <div 
        className={`
          relative border-2 rounded-lg p-4 m-2 min-w-[300px] max-w-[400px] cursor-pointer transition-all duration-200
          ${style.bgColor} ${isSelected ? 'ring-2 ring-blue-400' : ''}
          ${isHovered ? 'shadow-lg transform scale-105' : 'shadow-md'}
        `}
        style={{ 
          borderColor: style.borderColor,
          marginLeft: `${depth * 20}px`
        }}
        onClick={() => onSelect(node.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-2">
          <NodeIcon type={node.type} className={`w-5 h-5 ${style.color} flex-shrink-0 mt-0.5`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-semibold ${style.color} capitalize`}>
                {node.type}
              </span>
              <span className="text-xs text-gray-500">
                Depth {node.depth}
              </span>
              {node.metadata?.strength && (
                <StrengthIndicator strength={node.metadata.strength} />
              )}
            </div>
            
            {/* Content */}
            <p className="text-sm text-gray-800 leading-relaxed">
              {node.content}
            </p>
          </div>

          {/* Expand/Collapse Toggle */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.id);
              }}
              className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
        </div>

        {/* Metadata Tags */}
        {node.metadata?.tags && node.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {node.metadata.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-white bg-opacity-60 text-xs rounded-full text-gray-700"
              >
                {tag}
              </span>
            ))}
            {node.metadata.tags.length > 3 && (
              <span className="px-2 py-1 bg-white bg-opacity-60 text-xs rounded-full text-gray-500">
                +{node.metadata.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Action Buttons (shown on hover) */}
        {isHovered && (
          <div className="absolute top-2 right-12 flex gap-1">
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActions(!showActions);
                }}
                className="p-1 bg-white bg-opacity-90 hover:bg-opacity-100 rounded shadow transition-colors"
                title="Expand node"
              >
                <Plus className="w-3 h-3 text-gray-600" />
              </button>
              
              {/* Expansion Options */}
              {showActions && (
                <div className="absolute top-full right-0 mt-1 bg-white border rounded shadow-lg py-1 z-10 min-w-[120px]">
                  {node.type === NodeTypes.POINT && (
                    <button
                      onClick={() => handleExpansion('objections')}
                      className="w-full px-3 py-1 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                    >
                      <XCircle className="w-3 h-3 text-red-500" />
                      Add Objections
                    </button>
                  )}
                  
                  {node.type === NodeTypes.OBJECTION && (
                    <button
                      onClick={() => handleExpansion('refutation')}
                      className="w-full px-3 py-1 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Shield className="w-3 h-3 text-orange-500" />
                      Add Refutation
                    </button>
                  )}
                  
                  {(node.type === NodeTypes.POINT || node.type === NodeTypes.OBJECTION) && (
                    <button
                      onClick={() => handleExpansion('synthesis')}
                      className="w-full px-3 py-1 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Merge className="w-3 h-3 text-green-500" />
                      Add Synthesis
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI-specific metadata */}
        {node.metadata?.reasoning && isHovered && (
          <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs text-gray-600">
            <strong>Reasoning:</strong> {node.metadata.reasoning}
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && children && (
        <div className="ml-6 border-l-2 border-gray-200 pl-4">
          {children}
        </div>
      )}

      {/* Loading indicator when expanding */}
      {node.isExpanding && (
        <div className="ml-6 p-2 flex items-center gap-2 text-gray-500 text-sm">
          <Brain className="w-4 h-4 animate-pulse" />
          <span>Thinking...</span>
        </div>
      )}
    </div>
  );
};

export default InquiryNode;