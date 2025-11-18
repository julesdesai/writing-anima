/**
 * Simplified Agent Management Panel
 * Create and edit agents with simple prompt editing
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Save, Trash2, Copy, Power, Settings, 
  Zap, Brain, Search, Target, FileText, Users,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle,
  Template, Edit3
} from 'lucide-react';
import userAgentService, { AGENT_TEMPLATES } from '../../services/userAgentService';

const SimplifiedAgentPanel = ({ isOpen, onClose, embedded = false }) => {
  const [activeTab, setActiveTab] = useState('my-agents');
  const [agents, setAgents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load data
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const userAgents = userAgentService.getAllAgents();
      const availableTemplates = userAgentService.getTemplates();
      
      setAgents(userAgents);
      setTemplates(availableTemplates);
      
      // Auto-select first agent if none selected
      if (!selectedAgent && userAgents.length > 0) {
        setSelectedAgent(userAgents[0]);
      }
      
    } catch (err) {
      console.error('Failed to load agents:', err);
      setError('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = (templateId = null) => {
    if (templateId) {
      // Create from template
      const template = templates.find(t => t.id === templateId);
      setEditForm({
        name: template.name,
        description: template.description,
        category: template.category,
        icon: template.icon,
        defaultTier: template.defaultTier,
        capabilities: template.capabilities,
        responseFormat: template.responseFormat,
        prompt: template.basePrompt,
        enabled: true,
        templateId: templateId
      });
    } else {
      // Create from scratch
      setEditForm({
        name: 'New Agent',
        description: 'Custom analysis agent',
        category: 'custom',
        icon: '🤖',
        defaultTier: 'fast',
        capabilities: [],
        responseFormat: 'general_analysis',
        prompt: `You are an AI analysis assistant. Analyze the following text and provide insights.

TEXT TO ANALYZE:
{CONTENT}

PURPOSE: {PURPOSE}

Please analyze the text and provide your insights in JSON format:
[
  {
    "type": "your_analysis_type",
    "title": "Brief title of your insight",
    "feedback": "Detailed explanation of your finding",
    "suggestion": "Actionable recommendation",
    "confidence": 0.85,
    "severity": "high|medium|low",
    "textSnippets": ["relevant text from the original"]
  }
]

If no significant issues or insights found, return empty array [].`,
        enabled: true
      });
    }
    
    setIsEditing(true);
    setSelectedAgent(null);
  };

  const handleSaveAgent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (selectedAgent) {
        // Update existing agent
        await userAgentService.updateAgent(selectedAgent.id, editForm);
        setSuccess('Agent updated successfully');
      } else {
        // Create new agent
        const newAgent = await userAgentService.createAgent(editForm);
        setSelectedAgent(newAgent);
        setSuccess('Agent created successfully');
      }
      
      setIsEditing(false);
      await loadData();
      
    } catch (err) {
      console.error('Failed to save agent:', err);
      setError('Failed to save agent: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    
    try {
      setLoading(true);
      await userAgentService.deleteAgent(agentId);
      
      if (selectedAgent && selectedAgent.id === agentId) {
        setSelectedAgent(null);
      }
      
      await loadData();
      setSuccess('Agent deleted successfully');
      
    } catch (err) {
      console.error('Failed to delete agent:', err);
      setError('Failed to delete agent: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAgent = async (agentId, enabled) => {
    try {
      await userAgentService.toggleAgent(agentId, enabled);
      await loadData();
      
      // Update selected agent if it's the one being toggled
      if (selectedAgent && selectedAgent.id === agentId) {
        setSelectedAgent({ ...selectedAgent, enabled });
      }
      
    } catch (err) {
      console.error('Failed to toggle agent:', err);
      setError('Failed to toggle agent');
    }
  };

  const handleCloneAgent = async (agentId) => {
    try {
      const clonedAgent = await userAgentService.cloneAgent(agentId);
      setSelectedAgent(clonedAgent);
      await loadData();
      setSuccess('Agent cloned successfully');
    } catch (err) {
      console.error('Failed to clone agent:', err);
      setError('Failed to clone agent');
    }
  };

  const handleEditAgent = (agent) => {
    setSelectedAgent(agent);
    setEditForm({
      name: agent.name,
      description: agent.description,
      category: agent.category,
      icon: agent.icon,
      defaultTier: agent.defaultTier,
      capabilities: agent.capabilities || [],
      responseFormat: agent.responseFormat,
      prompt: agent.prompt,
      enabled: agent.enabled
    });
    setIsEditing(true);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      writing: FileText,
      logic: Brain,
      research: Search,
      strategy: Target,
      custom: Settings
    };
    return icons[category] || Settings;
  };

  const getTierBadgeColor = (tier) => {
    const colors = {
      fast: 'bg-green-100 text-green-700',
      standard: 'bg-blue-100 text-blue-700',
      premium: 'bg-purple-100 text-purple-700'
    };
    return colors[tier] || 'bg-gray-100 text-gray-700';
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Agent Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              Create and manage your analysis agents
            </p>
          </div>
          {!embedded && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {(error || success) && (
        <div className="mx-6 mt-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex px-6">
          <button
            onClick={() => setActiveTab('my-agents')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'my-agents'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            My Agents ({agents.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Template className="w-4 h-4" />
            Templates ({templates.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          {/* Create Button */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => handleCreateAgent()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Agent
            </button>
          </div>

          {/* Agent/Template List */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'my-agents' ? (
              <div className="divide-y divide-gray-200">
                {agents.map(agent => {
                  const CategoryIcon = getCategoryIcon(agent.category);
                  return (
                    <div
                      key={agent.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 ${
                        selectedAgent?.id === agent.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{agent.icon}</span>
                            <h4 className="font-medium text-gray-900">{agent.name}</h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAgent(agent.id, !agent.enabled);
                              }}
                              className={`flex items-center justify-center w-5 h-5 rounded-full transition-colors ${
                                agent.enabled
                                  ? 'bg-green-500 hover:bg-green-600 text-white'
                                  : 'bg-gray-300 hover:bg-gray-400 text-gray-600'
                              }`}
                              title={agent.enabled ? 'Disable agent' : 'Enable agent'}
                            >
                              <Power className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{agent.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTierBadgeColor(agent.defaultTier)}`}>
                              {agent.defaultTier}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              agent.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {agent.enabled ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAgent(agent);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 text-sm"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloneAgent(agent.id);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 text-sm"
                            title="Clone"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAgent(agent.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 text-sm"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {agents.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <Template className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No agents created yet</p>
                    <p className="text-xs">Create your first agent or use a template</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {templates.map(template => {
                  const CategoryIcon = getCategoryIcon(template.category);
                  return (
                    <div
                      key={template.id}
                      className="p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleCreateAgent(template.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{template.icon}</span>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{template.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTierBadgeColor(template.defaultTier)}`}>
                              {template.defaultTier}
                            </span>
                            <span className="text-xs text-gray-500 capitalize">{template.category}</span>
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Agent Editor */}
        <div className="flex-1 flex flex-col">
          {isEditing ? (
            <>
              {/* Edit Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedAgent ? 'Edit Agent' : 'Create Agent'}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({});
                      }}
                      className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAgent}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                      {loading ? 'Saving...' : 'Save Agent'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                      <input
                        type="text"
                        value={editForm.icon || ''}
                        onChange={(e) => setEditForm({...editForm, icon: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="🤖"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={editForm.category || ''}
                        onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="custom">Custom</option>
                        <option value="writing">Writing</option>
                        <option value="logic">Logic</option>
                        <option value="research">Research</option>
                        <option value="strategy">Strategy</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Tier</label>
                      <select
                        value={editForm.defaultTier || ''}
                        onChange={(e) => setEditForm({...editForm, defaultTier: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="fast">Fast (GPT-4o-mini)</option>
                        <option value="standard">Standard (GPT-4o)</option>
                        <option value="premium">Premium (GPT-4)</option>
                      </select>
                    </div>
                  </div>

                  {/* Prompt Editor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Agent Prompt
                      <span className="text-xs text-gray-500 ml-2">
                        Use {'{CONTENT}'} for text to analyze and {'{PURPOSE}'} for the analysis purpose
                      </span>
                    </label>
                    <textarea
                      value={editForm.prompt || ''}
                      onChange={(e) => setEditForm({...editForm, prompt: e.target.value})}
                      rows={20}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder="Enter your agent prompt here..."
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Make sure your prompt requests JSON output format for proper parsing.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : selectedAgent ? (
            <>
              {/* Agent Details Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <span className="text-xl">{selectedAgent.icon}</span>
                      {selectedAgent.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedAgent.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierBadgeColor(selectedAgent.defaultTier)}`}>
                        {selectedAgent.defaultTier}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedAgent.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedAgent.enabled ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {selectedAgent.usageCount || 0} uses
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditAgent(selectedAgent)}
                    className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                </div>
              </div>

              {/* Agent Details */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Current Prompt</h4>
                    <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
                      {selectedAgent.prompt}
                    </pre>
                  </div>
                  
                  {selectedAgent.templateOrigin && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Template Origin</h4>
                      <p className="text-sm text-gray-600">
                        Created from template: {selectedAgent.templateOrigin}
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Category:</span>
                      <span className="ml-2 capitalize">{selectedAgent.category}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Response Format:</span>
                      <span className="ml-2">{selectedAgent.responseFormat}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Created:</span>
                      <span className="ml-2">{new Date(selectedAgent.created).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Last Modified:</span>
                      <span className="ml-2">{new Date(selectedAgent.lastModified).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Agent Management</h3>
                <p className="text-gray-600 mb-6">
                  {activeTab === 'my-agents' 
                    ? 'Select an agent to view details or create a new one'
                    : 'Choose a template to create a new agent'
                  }
                </p>
                <button
                  onClick={() => handleCreateAgent()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Create New Agent
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return isOpen ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-full max-h-[90vh] flex flex-col">
        {content}
      </div>
    </div>
  ) : null;
};

export default SimplifiedAgentPanel;