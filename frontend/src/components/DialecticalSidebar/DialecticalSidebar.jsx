import React, { useState, useEffect } from 'react';
import { Brain, Target, Lightbulb, ChevronLeft, ChevronRight, Plus, ArrowRight, Eye } from 'lucide-react';

const DialecticalSidebar = ({ 
  isOpen, 
  onToggle, 
  activeComplexes = [], 
  dialecticalOpportunities = [], 
  onCreateComplex, 
  onExploreComplex, 
  onApplyInsight,
  onAddressCounterArg 
}) => {
  const [selectedComplex, setSelectedComplex] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    opportunities: true,
    complexes: true,
    insights: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Reset selected complex when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedComplex(null);
    }
  }, [isOpen]);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed top-1/2 -translate-y-1/2 z-40 bg-purple-600 text-white p-2 rounded-l-lg shadow-lg transition-all duration-200 ${
          isOpen ? 'right-80' : 'right-0'
        } hover:bg-purple-700`}
        title="Toggle Dialectical Thinking"
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        <Brain className="w-4 h-4 mt-1" />
      </button>

      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-xl transition-transform duration-300 z-30 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`} style={{ width: '320px' }}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-purple-50">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-purple-800">Dialectical Thinking</h3>
          </div>
          <p className="text-sm text-purple-600 mt-1">
            Strengthen your arguments through thesis-antithesis-synthesis
          </p>
        </div>

        <div className="h-full overflow-y-auto pb-20">
          
          {/* Dialectical Opportunities Section */}
          <div className="border-b border-gray-100">
            <button
              onClick={() => toggleSection('opportunities')}
              className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-gray-800">Opportunities</span>
                  {dialecticalOpportunities.length > 0 && (
                    <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">
                      {dialecticalOpportunities.length}
                    </span>
                  )}
                </div>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                  expandedSections.opportunities ? 'rotate-90' : ''
                }`} />
              </div>
            </button>
            
            {expandedSections.opportunities && (
              <div className="px-4 pb-4 space-y-3">
                {dialecticalOpportunities.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No dialectical opportunities detected. Keep writing!
                  </div>
                ) : (
                  dialecticalOpportunities.map((opportunity, index) => (
                    <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <h4 className="font-medium text-yellow-800 text-sm mb-2">
                        {opportunity.title}
                      </h4>
                      <p className="text-sm text-yellow-700 mb-3">
                        {opportunity.feedback}
                      </p>
                      <div className="flex gap-2">
                        {opportunity.actionData?.type === 'create_dialectical_complex' && (
                          <button
                            onClick={() => onCreateComplex(opportunity.actionData)}
                            className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200 transition-colors"
                          >
                            <Plus className="w-3 h-3 inline mr-1" />
                            Create Complex
                          </button>
                        )}
                        {opportunity.actionData?.type === 'address_counter_argument' && (
                          <button
                            onClick={() => onAddressCounterArg(opportunity.actionData)}
                            className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200 transition-colors"
                          >
                            <ArrowRight className="w-3 h-3 inline mr-1" />
                            Address
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Active Complexes Section */}
          <div className="border-b border-gray-100">
            <button
              onClick={() => toggleSection('complexes')}
              className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-gray-800">Active Complexes</span>
                  {activeComplexes.length > 0 && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                      {activeComplexes.length}
                    </span>
                  )}
                </div>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                  expandedSections.complexes ? 'rotate-90' : ''
                }`} />
              </div>
            </button>
            
            {expandedSections.complexes && (
              <div className="px-4 pb-4 space-y-3">
                {activeComplexes.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No active inquiry complexes. Create one from an opportunity above!
                  </div>
                ) : (
                  activeComplexes.map((complex, index) => (
                    <div key={complex.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h4 className="font-medium text-green-800 text-sm mb-2">
                        {complex.centralQuestion}
                      </h4>
                      <div className="text-xs text-green-600 mb-3">
                        {complex.nodes?.size || 0} nodes • {complex.edges?.size || 0} connections
                      </div>
                      
                      {/* Quick Complex Navigation */}
                      <div className="space-y-2 mb-3">
                        {/* Show thesis */}
                        {complex.centralPointId && complex.nodes?.get(complex.centralPointId) && (
                          <div className="text-xs">
                            <span className="font-medium text-green-700">Thesis:</span>
                            <span className="text-green-600 ml-1">
                              {complex.nodes.get(complex.centralPointId).summary || 
                               complex.nodes.get(complex.centralPointId).content?.substring(0, 50) + '...'}
                            </span>
                          </div>
                        )}
                        
                        {/* Show synthesis count */}
                        {complex.nodes && Array.from(complex.nodes.values()).filter(n => n.type === 'synthesis').length > 0 && (
                          <div className="text-xs">
                            <span className="font-medium text-green-700">Insights:</span>
                            <span className="text-green-600 ml-1">
                              {Array.from(complex.nodes.values()).filter(n => n.type === 'synthesis').length} available
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedComplex(complex.id === selectedComplex ? null : complex.id)}
                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                        >
                          <Eye className="w-3 h-3 inline mr-1" />
                          {selectedComplex === complex.id ? 'Hide' : 'View'}
                        </button>
                        <button
                          onClick={() => onExploreComplex(complex.id)}
                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                        >
                          <ArrowRight className="w-3 h-3 inline mr-1" />
                          Explore
                        </button>
                      </div>
                      
                      {/* Expanded Complex View */}
                      {selectedComplex === complex.id && (
                        <div className="mt-3 pt-3 border-t border-green-300 space-y-2">
                          {complex.nodes && Array.from(complex.nodes.values()).map(node => (
                            <div key={node.id} className="text-xs">
                              <div className={`inline-block px-2 py-1 rounded text-white text-xs ${
                                node.type === 'point' ? 'bg-blue-500' :
                                node.type === 'refutation' ? 'bg-red-500' :
                                node.type === 'synthesis' ? 'bg-purple-500' : 'bg-gray-500'
                              }`}>
                                {node.type}
                              </div>
                              <p className="text-green-700 mt-1">
                                {node.summary || node.content?.substring(0, 80) + '...'}
                              </p>
                              {node.type === 'synthesis' && node.metadata?.newInsight && (
                                <button
                                  onClick={() => onApplyInsight({
                                    complexId: complex.id,
                                    nodeId: node.id,
                                    insight: node.metadata.newInsight,
                                    content: node.content
                                  })}
                                  className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded mt-1 hover:bg-purple-200 transition-colors"
                                >
                                  Apply to Writing
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Available Insights Section */}
          <div>
            <button
              onClick={() => toggleSection('insights')}
              className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-gray-800">Available Insights</span>
                </div>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                  expandedSections.insights ? 'rotate-90' : ''
                }`} />
              </div>
            </button>
            
            {expandedSections.insights && (
              <div className="px-4 pb-4 space-y-3">
                {/* Show synthesis insights from all complexes */}
                {activeComplexes.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    Create inquiry complexes to generate insights
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeComplexes.flatMap(complex => 
                      complex.nodes ? Array.from(complex.nodes.values())
                        .filter(node => node.type === 'synthesis' && node.metadata?.newInsight)
                        .map(node => (
                          <div key={`${complex.id}-${node.id}`} className="bg-purple-50 border border-purple-200 rounded p-2">
                            <p className="text-sm text-purple-700 mb-2">
                              "{node.metadata.newInsight}"
                            </p>
                            <div className="text-xs text-purple-600 mb-2">
                              From: {complex.centralQuestion}
                            </div>
                            <button
                              onClick={() => onApplyInsight({
                                complexId: complex.id,
                                nodeId: node.id,
                                insight: node.metadata.newInsight,
                                content: node.content
                              })}
                              className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition-colors"
                            >
                              Apply to Writing
                            </button>
                          </div>
                        )) : []
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay when sidebar is open on mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default DialecticalSidebar;