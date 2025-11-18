/**
 * Custom Agent Manager - UI for managing user's dynamic agents
 * Allows users to view, edit, delete, clone, and configure their custom agents
 */

import React, { useState, useEffect } from 'react';
import CustomAgentCreator from './CustomAgentCreator';

export const CustomAgentManager = ({ 
  isOpen, 
  onClose, 
  userAgents = [],
  onCreateAgent,
  onUpdateAgent,
  onDeleteAgent,
  onCloneAgent,
  onProcessFeedback,
  onExportAgent,
  onImportAgent,
  system
}) => {
  const [view, setView] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'name', 'performance', 'usage'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'active', 'inactive'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showCreator, setShowCreator] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [showStats, setShowStats] = useState(false);

  // Filter and sort agents
  const getFilteredAndSortedAgents = () => {
    let filtered = [...userAgents];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(agent => 
        agent.name.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query) ||
        agent.specialization.toLowerCase().includes(query) ||
        agent.focusAreas.some(area => area.toLowerCase().includes(query))
      );
    }

    // Filter by status
    if (filterBy === 'active') {
      filtered = filtered.filter(agent => agent.usageCount > 0);
    } else if (filterBy === 'inactive') {
      filtered = filtered.filter(agent => agent.usageCount === 0);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'performance':
          const aPerf = a.learningMetrics?.recentRating || 0;
          const bPerf = b.learningMetrics?.recentRating || 0;
          return bPerf - aPerf;
        case 'usage':
          return b.usageCount - a.usageCount;
        case 'recent':
        default:
          return new Date(b.lastModified) - new Date(a.lastModified);
      }
    });

    return filtered;
  };

  // Handle agent actions
  const handleEditAgent = (agent) => {
    setEditingAgent(agent);
    setShowCreator(true);
  };

  const handleCloneAgent = (agent) => {
    onCloneAgent(agent.agentId, {
      name: `${agent.name} (Copy)`
    });
  };

  const handleDeleteAgent = (agentId) => {
    onDeleteAgent(agentId);
    setShowConfirmDelete(null);
  };

  const handleExportAgent = (agent) => {
    const exported = onExportAgent(agent.agentId);
    
    // Download as JSON file
    const blob = new Blob([JSON.stringify(exported, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agent.name.replace(/[^a-zA-Z0-9]/g, '_')}_agent.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportAgent = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        onImportAgent(config);
      } catch (error) {
        alert('Invalid agent file format');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  if (!isOpen) return null;

  const filteredAgents = getFilteredAndSortedAgents();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              My Custom Agents
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your {userAgents.length} custom agents
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-3 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm font-medium"
            >
              📊 Stats
            </button>
            <button
              onClick={() => setShowCreator(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + Create Agent
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-semibold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stats Panel */}
        {showStats && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded-lg border">
                <div className="text-sm text-gray-600">Total Agents</div>
                <div className="text-lg font-semibold">{userAgents.length}/10</div>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <div className="text-sm text-gray-600">Active Agents</div>
                <div className="text-lg font-semibold">
                  {userAgents.filter(a => a.usageCount > 0).length}
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <div className="text-sm text-gray-600">Total Usage</div>
                <div className="text-lg font-semibold">
                  {userAgents.reduce((sum, a) => sum + a.usageCount, 0)}
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <div className="text-sm text-gray-600">Avg Performance</div>
                <div className="text-lg font-semibold">
                  {userAgents.length > 0 
                    ? (userAgents.reduce((sum, a) => sum + (a.learningMetrics?.recentRating || 3), 0) / userAgents.length).toFixed(1)
                    : 'N/A'
                  }/5.0
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
                <div className="absolute left-2.5 top-2.5 text-gray-400">🔍</div>
              </div>

              {/* Filters */}
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Agents</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="recent">Recently Modified</option>
                <option value="name">Name</option>
                <option value="performance">Performance</option>
                <option value="usage">Usage</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              {/* Import */}
              <label className="px-3 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 cursor-pointer text-sm font-medium">
                📥 Import
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportAgent}
                  className="hidden"
                />
              </label>

              {/* View Toggle */}
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setView('grid')}
                  className={`px-3 py-2 text-sm font-medium ${
                    view === 'grid' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  } rounded-l-lg`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`px-3 py-2 text-sm font-medium ${
                    view === 'list' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  } rounded-r-lg border-l border-gray-300`}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Agents List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredAgents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🤖</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {userAgents.length === 0 ? 'No Custom Agents Yet' : 'No Agents Found'}
              </h3>
              <p className="text-gray-600 mb-4">
                {userAgents.length === 0 
                  ? 'Create your first custom agent to get started'
                  : 'Try adjusting your search or filters'
                }
              </p>
              {userAgents.length === 0 && (
                <button
                  onClick={() => setShowCreator(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Create Your First Agent
                </button>
              )}
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgents.map(agent => (
                <AgentCard
                  key={agent.agentId}
                  agent={agent}
                  onEdit={handleEditAgent}
                  onClone={handleCloneAgent}
                  onDelete={(agentId) => setShowConfirmDelete(agentId)}
                  onExport={handleExportAgent}
                  onViewDetails={setSelectedAgent}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAgents.map(agent => (
                <AgentListItem
                  key={agent.agentId}
                  agent={agent}
                  onEdit={handleEditAgent}
                  onClone={handleCloneAgent}
                  onDelete={(agentId) => setShowConfirmDelete(agentId)}
                  onExport={handleExportAgent}
                  onViewDetails={setSelectedAgent}
                />
              ))}
            </div>
          )}
        </div>

        {/* Agent Creator Modal */}
        {showCreator && (
          <CustomAgentCreator
            isOpen={showCreator}
            onClose={() => {
              setShowCreator(false);
              setEditingAgent(null);
            }}
            onCreateAgent={(config) => {
              onCreateAgent(config);
              setShowCreator(false);
            }}
            onUpdateAgent={(agentId, updates) => {
              onUpdateAgent(agentId, updates);
              setShowCreator(false);
              setEditingAgent(null);
            }}
            editingAgent={editingAgent}
            existingAgents={userAgents}
          />
        )}

        {/* Agent Details Modal */}
        {selectedAgent && (
          <AgentDetailsModal
            agent={selectedAgent}
            onClose={() => setSelectedAgent(null)}
            onEdit={handleEditAgent}
            onProcessFeedback={onProcessFeedback}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showConfirmDelete && (
          <DeleteConfirmationModal
            agent={userAgents.find(a => a.agentId === showConfirmDelete)}
            onConfirm={() => handleDeleteAgent(showConfirmDelete)}
            onCancel={() => setShowConfirmDelete(null)}
          />
        )}
      </div>
    </div>
  );
};

// Agent Card Component
const AgentCard = ({ agent, onEdit, onClone, onDelete, onExport, onViewDetails }) => {
  const performance = agent.learningMetrics?.recentRating || 0;
  const isActive = agent.usageCount > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">{agent.name}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{agent.specialization}</p>
        </div>
        <div className="flex items-center space-x-1 ml-2">
          <span className={`w-2 h-2 rounded-full ${
            isActive ? 'bg-green-500' : 'bg-gray-300'
          }`} />
          <span className="text-xs text-gray-500">
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Usage:</span>
          <span className="font-medium">{agent.usageCount}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Performance:</span>
          <div className="flex items-center space-x-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} className={`text-xs ${
                  star <= performance ? 'text-yellow-400' : 'text-gray-300'
                }`}>
                  ★
                </span>
              ))}
            </div>
            <span className="text-xs text-gray-500">({performance.toFixed(1)})</span>
          </div>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Modified:</span>
          <span className="font-medium">
            {new Date(agent.lastModified).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => onViewDetails(agent)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          View Details
        </button>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onEdit(agent)}
            className="p-1 text-gray-400 hover:text-gray-600 text-sm"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={() => onClone(agent)}
            className="p-1 text-gray-400 hover:text-gray-600 text-sm"
            title="Clone"
          >
            📋
          </button>
          <button
            onClick={() => onExport(agent)}
            className="p-1 text-gray-400 hover:text-gray-600 text-sm"
            title="Export"
          >
            📥
          </button>
          <button
            onClick={() => onDelete(agent.agentId)}
            className="p-1 text-gray-400 hover:text-red-600 text-sm"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

// Agent List Item Component
const AgentListItem = ({ agent, onEdit, onClone, onDelete, onExport, onViewDetails }) => {
  const performance = agent.learningMetrics?.recentRating || 0;
  const isActive = agent.usageCount > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <h3 className="font-medium text-gray-900">{agent.name}</h3>
            <p className="text-sm text-gray-600">{agent.specialization}</p>
          </div>
          <div className="text-sm">
            <div className="text-gray-600">Usage: <span className="font-medium">{agent.usageCount}</span></div>
            <div className="flex items-center space-x-1">
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-gray-500">{isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
          <div className="text-sm">
            <div className="flex items-center space-x-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(star => (
                  <span key={star} className={`text-xs ${
                    star <= performance ? 'text-yellow-400' : 'text-gray-300'
                  }`}>
                    ★
                  </span>
                ))}
              </div>
              <span className="text-gray-500">({performance.toFixed(1)})</span>
            </div>
            <div className="text-gray-500">
              Modified {new Date(agent.lastModified).toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={() => onViewDetails(agent)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Details
            </button>
            <button
              onClick={() => onEdit(agent)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Edit"
            >
              ✏️
            </button>
            <button
              onClick={() => onClone(agent)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Clone"
            >
              📋
            </button>
            <button
              onClick={() => onExport(agent)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Export"
            >
              📥
            </button>
            <button
              onClick={() => onDelete(agent.agentId)}
              className="p-1 text-gray-400 hover:text-red-600"
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Agent Details Modal
const AgentDetailsModal = ({ agent, onClose, onEdit, onProcessFeedback }) => {
  const [feedback, setFeedback] = useState({
    rating: 5,
    helpful: true,
    comments: ''
  });

  const handleSubmitFeedback = () => {
    onProcessFeedback(agent.agentId, feedback);
    setFeedback({ rating: 5, helpful: true, comments: '' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Agent Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-semibold"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">{agent.name}</h4>
            <p className="text-gray-600">{agent.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialization
              </label>
              <p className="text-gray-900">{agent.specialization}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model Tier
              </label>
              <p className="text-gray-900 capitalize">{agent.modelTier}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Output Format
              </label>
              <p className="text-gray-900 capitalize">{agent.outputFormat.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Persona
              </label>
              <p className="text-gray-900 capitalize">{agent.persona}</p>
            </div>
          </div>

          {agent.focusAreas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Focus Areas
              </label>
              <div className="flex flex-wrap gap-2">
                {agent.focusAreas.map((area, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Prompt
            </label>
            <div className="bg-gray-100 p-3 rounded-lg text-sm font-mono max-h-40 overflow-y-auto">
              {agent.customPrompt}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h5 className="font-medium text-gray-900 mb-3">Performance Metrics</h5>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Usage Count</div>
                <div className="font-medium">{agent.usageCount}</div>
              </div>
              <div>
                <div className="text-gray-600">Average Rating</div>
                <div className="font-medium">{agent.learningMetrics?.recentRating?.toFixed(1) || 'N/A'}</div>
              </div>
              <div>
                <div className="text-gray-600">Helpfulness Rate</div>
                <div className="font-medium">
                  {agent.learningMetrics?.helpfulnessRate ? 
                    `${(agent.learningMetrics.helpfulnessRate * 100).toFixed(0)}%` : 
                    'N/A'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Section */}
          <div className="border-t border-gray-200 pt-4">
            <h5 className="font-medium text-gray-900 mb-3">Provide Feedback</h5>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setFeedback(prev => ({ ...prev, rating: star }))}
                      className={`text-lg ${
                        star <= feedback.rating ? 'text-yellow-400' : 'text-gray-300'
                      } hover:text-yellow-400`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={feedback.helpful}
                    onChange={(e) => setFeedback(prev => ({ ...prev, helpful: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">This agent was helpful</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments
                </label>
                <textarea
                  value={feedback.comments}
                  onChange={(e) => setFeedback(prev => ({ ...prev, comments: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional feedback..."
                />
              </div>

              <button
                onClick={handleSubmitFeedback}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end p-6 border-t border-gray-200 space-x-3">
          <button
            onClick={() => onEdit(agent)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Edit Agent
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal
const DeleteConfirmationModal = ({ agent, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Delete Agent
          </h3>
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete "{agent?.name}"? This action cannot be undone.
          </p>
          
          {agent?.usageCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 text-sm">
                ⚠️ This agent has been used {agent.usageCount} times. All performance data will be lost.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Delete Agent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomAgentManager;