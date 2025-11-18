/**
 * Simple Community - Upload and browse shared agent configurations
 */

import React, { useState, useEffect } from 'react';
import { 
  Upload, Download, User, Calendar, Search, FileText, Trash2, ChevronUp, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import userAgentService from '../../services/userAgentService';
import communityService from '../../services/communityService';

const SimpleCommunity = ({ onImportAgent }) => {
  const { currentUser } = useAuth();
  const [communityAgents, setCommunityAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadCommunityAgents();
  }, []);

  useEffect(() => {
    // Handle search with debouncing
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim()) {
        try {
          setLoading(true);
          const results = await communityService.searchAgents(searchQuery);
          setCommunityAgents(results);
        } catch (error) {
          console.error('Search failed:', error);
        } finally {
          setLoading(false);
        }
      } else {
        loadCommunityAgents();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadCommunityAgents = async () => {
    console.log('SimpleCommunity: Starting to load community agents...');
    setLoading(true);
    try {
      const agents = await communityService.getCommunityAgents();
      console.log('SimpleCommunity: Received agents from service:', agents);
      setCommunityAgents(agents);
    } catch (error) {
      console.error('SimpleCommunity: Failed to load community agents:', error);
      // Fallback to empty array on error
      setCommunityAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAgent = async (agentData, displayName) => {
    if (!currentUser) {
      alert('Please sign in to upload agents');
      return;
    }

    try {
      setLoading(true);

      // Check if this is a bulk upload or single agent
      if (agentData.agents && Array.isArray(agentData.agents)) {
        // Bulk upload - upload entire system
        console.log('Processing bulk upload of', agentData.agents.length, 'agents');
        
        const uploadedAgents = await communityService.uploadAgentSystem(agentData, displayName, currentUser);
        
        // Add to local state for immediate display
        setCommunityAgents(prev => [...uploadedAgents, ...prev]);
        setShowUploadModal(false);
        alert(`Successfully uploaded ${uploadedAgents.length} agents!`);
        
      } else {
        // Single agent upload
        const uploadedAgent = await communityService.uploadAgent(agentData, currentUser);
        
        // Add to local state for immediate display
        setCommunityAgents(prev => [uploadedAgent, ...prev]);
        setShowUploadModal(false);
        alert('Agent uploaded successfully!');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Failed to upload agent(s): ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAgent = async (agent) => {
    try {
      // Create agent configuration for export
      const agentConfig = {
        name: agent.originalName,
        description: agent.description,
        category: agent.category,
        icon: agent.icon,
        prompt: agent.prompt,
        defaultTier: agent.defaultTier,
        capabilities: agent.capabilities,
        responseFormat: agent.responseFormat,
        exportedAt: new Date().toISOString(),
        exportVersion: '2.0'
      };

      // Create and download JSON file
      const dataStr = JSON.stringify(agentConfig, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `${agent.originalName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-agent.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      // Update download count in Firebase
      try {
        await communityService.incrementDownloadCount(agent.id);
        // Update local state for immediate UI feedback
        setCommunityAgents(prev => prev.map(a => 
          a.id === agent.id ? { ...a, downloadCount: (a.downloadCount || 0) + 1 } : a
        ));
      } catch (error) {
        console.error('Failed to update download count:', error);
        // Download still works, just count tracking failed
      }

    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download agent');
    }
  };

  const handleVote = async (agentId, voteType) => {
    if (!currentUser) {
      alert('Please sign in to vote on agents');
      return;
    }

    try {
      const result = await communityService.voteOnAgent(agentId, voteType, currentUser);
      
      // Update local state for immediate UI feedback
      setCommunityAgents(prev => prev.map(agent => 
        agent.id === agentId 
          ? { 
              ...agent, 
              upvotes: result.upvotes, 
              downvotes: result.downvotes,
              userVotes: {
                ...agent.userVotes,
                [currentUser.uid]: result.userVote
              }
            } 
          : agent
      ));
    } catch (error) {
      console.error('Voting failed:', error);
      alert(`Failed to vote: ${error.message}`);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!currentUser) {
      alert('You must be signed in to delete agents');
      return;
    }

    // Create custom confirmation dialog
    const confirmed = await new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      dialog.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-sm mx-4">
          <h3 class="text-lg font-semibold mb-4">Delete Agent</h3>
          <p class="text-gray-600 mb-6">Are you sure you want to delete this agent from the community? This action cannot be undone.</p>
          <div class="flex justify-end gap-3">
            <button id="cancel-delete" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
            <button id="confirm-delete" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      dialog.querySelector('#cancel-delete').onclick = () => {
        document.body.removeChild(dialog);
        resolve(false);
      };
      
      dialog.querySelector('#confirm-delete').onclick = () => {
        document.body.removeChild(dialog);
        resolve(true);
      };
      
      // Close on background click
      dialog.onclick = (e) => {
        if (e.target === dialog) {
          document.body.removeChild(dialog);
          resolve(false);
        }
      };
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      await communityService.deleteAgent(agentId, currentUser);
      
      // Remove from local state for immediate UI update
      setCommunityAgents(prev => prev.filter(agent => agent.id !== agentId));
      
      alert('Agent deleted successfully!');
    } catch (error) {
      console.error('Delete failed:', error);
      alert(`Failed to delete agent: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSystem = async (systemAgents, systemName) => {
    if (!currentUser) {
      alert('You must be signed in to delete systems');
      return;
    }

    // Create custom confirmation dialog
    const confirmed = await new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      dialog.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md mx-4">
          <h3 class="text-lg font-semibold mb-4">Delete Agent System</h3>
          <p class="text-gray-600 mb-4">Are you sure you want to delete the entire "${systemName}" system?</p>
          <p class="text-sm text-gray-500 mb-6">This will permanently delete all ${systemAgents.length} agents in this system. This action cannot be undone.</p>
          <div class="flex justify-end gap-3">
            <button id="cancel-delete-system" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
            <button id="confirm-delete-system" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete System</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      dialog.querySelector('#cancel-delete-system').onclick = () => {
        document.body.removeChild(dialog);
        resolve(false);
      };
      
      dialog.querySelector('#confirm-delete-system').onclick = () => {
        document.body.removeChild(dialog);
        resolve(true);
      };
      
      // Close on background click
      dialog.onclick = (e) => {
        if (e.target === dialog) {
          document.body.removeChild(dialog);
          resolve(false);
        }
      };
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      const deletedCount = await communityService.deleteAgentSystem(systemAgents, currentUser);
      
      // Remove all system agents from local state for immediate UI update
      const systemAgentIds = systemAgents.map(agent => agent.id);
      setCommunityAgents(prev => prev.filter(agent => !systemAgentIds.includes(agent.id)));
      
      alert(`System deleted successfully! ${deletedCount} agents removed.`);
    } catch (error) {
      console.error('Delete system failed:', error);
      alert(`Failed to delete system: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Agents are already filtered by the search effect, so just use them directly
  const filteredAgents = communityAgents;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Community</h1>
            <p className="text-gray-600 mt-1">
              Share and discover agent configurations from the community
            </p>
          </div>
          
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Agent
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Agents by User */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading community agents...</p>
          </div>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No agents found' : 'No community agents yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery 
              ? 'Try adjusting your search terms' 
              : 'Be the first to share an agent configuration!'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upload Agent
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Group agents by user and batch uploads */}
          {Object.entries(
            filteredAgents.reduce((groups, agent) => {
              const user = agent.uploadedBy;
              if (!groups[user]) groups[user] = { individual: [], batches: {} };
              
              if (agent.isBulkUpload && agent.bulkUploadName) {
                // Group by batch upload name
                const batchKey = agent.bulkUploadName;
                if (!groups[user].batches[batchKey]) {
                  groups[user].batches[batchKey] = [];
                }
                groups[user].batches[batchKey].push(agent);
              } else {
                // Individual agents
                groups[user].individual.push(agent);
              }
              return groups;
            }, {})
          ).map(([username, userContent]) => (
            <div key={username} className="bg-white border border-gray-200 rounded-lg">
              {/* User Header */}
              <div className="border-b border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{username}</h3>
                      <p className="text-sm text-gray-500">
                        {Object.keys(userContent.batches).length > 0 && (
                          <span>{Object.keys(userContent.batches).length} system{Object.keys(userContent.batches).length !== 1 ? 's' : ''} • </span>
                        )}
                        {userContent.individual.length > 0 && (
                          <span>{userContent.individual.length} individual agent{userContent.individual.length !== 1 ? 's' : ''} • </span>
                        )}
                        {[...userContent.individual, ...Object.values(userContent.batches).flat()].reduce((sum, a) => sum + a.downloadCount, 0)} total downloads
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(Math.max(...[...userContent.individual, ...Object.values(userContent.batches).flat()].map(a => new Date(a.uploadedAt))))}
                  </div>
                </div>
              </div>

              {/* User's Content - Systems and Individual Agents */}
              <div>
                {/* Agent Systems (Batch Uploads) */}
                {Object.entries(userContent.batches).map(([systemName, systemAgents]) => (
                  <div key={systemName} className="border-b border-gray-100 last:border-b-0">
                    {/* System Header */}
                    <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{systemName}</h4>
                            <p className="text-sm text-blue-600">
                              Agent System • {systemAgents.length} agents
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{systemAgents.reduce((sum, a) => sum + a.downloadCount, 0)} downloads</span>
                            <div className="flex items-center gap-1">
                              <ChevronUp className="w-3 h-3 text-green-600" />
                              <span>{systemAgents.reduce((sum, a) => sum + (a.upvotes || 0), 0)}</span>
                              <ChevronDown className="w-3 h-3 text-red-500" />
                              <span>{systemAgents.reduce((sum, a) => sum + (a.downvotes || 0), 0)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                            onClick={async () => {
                              try {
                                // Create bulk export for all agents in this system
                                const systemExport = {
                                  agents: systemAgents.map(agent => ({
                                    name: agent.originalName,
                                    description: agent.description,
                                    category: agent.category,
                                    icon: agent.icon,
                                    prompt: agent.prompt,
                                    defaultTier: agent.defaultTier,
                                    capabilities: agent.capabilities,
                                    responseFormat: agent.responseFormat
                                  })),
                                  exportedAt: new Date().toISOString(),
                                  exportVersion: '2.0',
                                  totalAgents: systemAgents.length
                                };

                                // Create and download JSON file
                                const dataStr = JSON.stringify(systemExport, null, 2);
                                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                                
                                const exportFileDefaultName = `${systemName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-system.json`;
                                
                                const linkElement = document.createElement('a');
                                linkElement.setAttribute('href', dataUri);
                                linkElement.setAttribute('download', exportFileDefaultName);
                                linkElement.click();

                                // Update download counts for all agents in Firebase
                                try {
                                  // Increment all agents in this system
                                  for (const systemAgent of systemAgents) {
                                    await communityService.incrementDownloadCount(systemAgent.id);
                                  }
                                  
                                  // Update local state for immediate UI feedback
                                  setCommunityAgents(prev => prev.map(a => {
                                    const systemAgent = systemAgents.find(sa => sa.id === a.id);
                                    return systemAgent ? { ...a, downloadCount: (a.downloadCount || 0) + 1 } : a;
                                  }));
                                } catch (error) {
                                  console.error('Failed to update download counts:', error);
                                  // Download still works, just count tracking failed
                                }
                              } catch (error) {
                                console.error('Failed to download system:', error);
                                alert('Failed to download system');
                              }
                            }}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-300 hover:border-blue-400 bg-white transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            Download System
                          </button>
                          {/* Show delete button only for user's own systems */}
                          {currentUser && systemAgents.length > 0 && systemAgents[0].uploadedById === currentUser.uid && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSystem(systemAgents, systemName);
                              }}
                              className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded border border-red-300 hover:border-red-400 bg-white transition-colors"
                              title="Delete entire system"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete System
                            </button>
                          )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* System Agents */}
                    <div className="divide-y divide-gray-50">
                      {systemAgents.map((agent) => (
                        <div key={agent.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-base">{agent.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-medium text-gray-800 text-sm truncate">{agent.displayName}</h5>
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                    {agent.category}
                                  </span>
                                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                                    {agent.defaultTier}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 truncate">{agent.description}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 ml-4">
                              <div className="flex items-center gap-2">
                                {/* Voting buttons */}
                                <button
                                  onClick={() => handleVote(agent.id, 'up')}
                                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                    agent.userVotes && agent.userVotes[currentUser?.uid] === 'up'
                                      ? 'bg-green-100 text-green-700 border border-green-300'
                                      : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                                  }`}
                                >
                                  <ChevronUp className="w-3 h-3" />
                                  <span>{agent.upvotes || 0}</span>
                                </button>
                                <button
                                  onClick={() => handleVote(agent.id, 'down')}
                                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                    agent.userVotes && agent.userVotes[currentUser?.uid] === 'down'
                                      ? 'bg-red-100 text-red-700 border border-red-300'
                                      : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                  }`}
                                >
                                  <ChevronDown className="w-3 h-3" />
                                  <span>{agent.downvotes || 0}</span>
                                </button>
                              </div>
                              <div className="text-xs text-gray-500 text-right">
                                <div>{agent.downloadCount} downloads</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDownloadAgent(agent)}
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                                >
                                  <Download className="w-3 h-3" />
                                  Download
                                </button>
                                {/* Show delete button only for user's own agents */}
                                {currentUser && agent.uploadedById === currentUser.uid && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteAgent(agent.id);
                                    }}
                                    className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded border border-red-200 hover:border-red-300 transition-colors"
                                    title="Delete agent"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Individual Agents */}
                {userContent.individual.length > 0 && (
                  <div className="divide-y divide-gray-50">
                    {userContent.individual.map((agent) => (
                      <div key={agent.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-lg">{agent.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900 truncate">{agent.displayName}</h4>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                  {agent.category}
                                </span>
                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                                  {agent.defaultTier}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 truncate">{agent.description}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 ml-4">
                            <div className="flex items-center gap-2">
                              {/* Voting buttons */}
                              <button
                                onClick={() => handleVote(agent.id, 'up')}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                  agent.userVotes && agent.userVotes[currentUser?.uid] === 'up'
                                    ? 'bg-green-100 text-green-700 border border-green-300'
                                    : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                                }`}
                              >
                                <ChevronUp className="w-3 h-3" />
                                <span>{agent.upvotes || 0}</span>
                              </button>
                              <button
                                onClick={() => handleVote(agent.id, 'down')}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                  agent.userVotes && agent.userVotes[currentUser?.uid] === 'down'
                                    ? 'bg-red-100 text-red-700 border border-red-300'
                                    : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                }`}
                              >
                                <ChevronDown className="w-3 h-3" />
                                <span>{agent.downvotes || 0}</span>
                              </button>
                            </div>
                            <div className="text-xs text-gray-500 text-right">
                              <div>{agent.downloadCount} downloads</div>
                              <div>{formatDate(agent.uploadedAt)}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDownloadAgent(agent)}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                              >
                                <Download className="w-3 h-3" />
                                Download
                              </button>
                              {/* Show delete button only for user's own agents */}
                              {currentUser && agent.uploadedById === currentUser.uid && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAgent(agent.id);
                                  }}
                                  className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded border border-red-200 hover:border-red-300 transition-colors"
                                  title="Delete agent"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUploadAgent}
        />
      )}
    </div>
  );
};

// Upload Modal Component
const UploadModal = ({ onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [agentData, setAgentData] = useState(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      console.log('File content:', text); // Debug log
      
      const data = JSON.parse(text);
      console.log('Parsed data:', data); // Debug log
      
      // Check if this is a bulk export (has 'agents' array) or single agent
      if (data.agents && Array.isArray(data.agents)) {
        // This is a bulk export
        console.log('Detected bulk export with', data.agents.length, 'agents');
        
        if (data.agents.length === 0) {
          alert('The bulk export file contains no agents.');
          return;
        }
        
        // Validate the first agent as a sample
        const sampleAgent = data.agents[0];
        if (!sampleAgent.name || !sampleAgent.prompt) {
          alert('Invalid bulk export: Agents are missing required fields.');
          return;
        }
        
        setSelectedFile(file);
        setAgentData(data); // Store the bulk export data
        setDisplayName(`${data.agents.length} agents from bulk export`);
        console.log('Bulk export validated:', data.totalAgents || data.agents.length, 'agents');
        
      } else if (data.name && data.prompt) {
        // This is a single agent export
        console.log('Detected single agent export');
        
        setSelectedFile(file);
        setAgentData(data);
        setDisplayName(data.name);
        console.log('Single agent validated:', { name: data.name, hasPrompt: !!data.prompt });
        
      } else {
        alert('Invalid file format. Please upload either a single agent export or a bulk export file.');
        return;
      }
      
    } catch (error) {
      console.error('File parsing error:', error);
      alert(`Failed to read file: ${error.message}. Please ensure it's a valid JSON file.`);
    }
  };

  const handleUpload = () => {
    if (!agentData || !displayName.trim()) {
      alert('Please select a file and provide a display name');
      return;
    }

    onUpload(agentData, displayName);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Share with Community</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Agent Export File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            <p className="text-sm text-gray-500 mt-1">
              Upload a single agent export or bulk export file (JSON format)
            </p>
          </div>

          {agentData && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {agentData.agents ? 'System Name' : 'Agent Name'}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder={agentData.agents 
                  ? "Name for this agent system (e.g., 'My Writing Tools', 'Academic Analysis Suite')"
                  : "Name for this agent in the community"
                }
              />
              {agentData.agents && (
                <p className="text-sm text-gray-500 mt-1">
                  This name will group all {agentData.agents.length} agents together as one system
                </p>
              )}
            </div>
          )}

          {agentData && (
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium text-sm mb-2">
                {agentData.agents ? 'Bulk Upload Preview:' : 'Agent Preview:'}
              </h4>
              
              {agentData.agents ? (
                // Bulk upload preview
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Total Agents:</strong> {agentData.agents.length}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Export Date:</strong> {agentData.exportedAt ? new Date(agentData.exportedAt).toLocaleDateString() : 'Unknown'}
                  </p>
                  <div className="max-h-32 overflow-y-auto">
                    <p className="text-xs text-gray-500 mb-1">Agents to be uploaded:</p>
                    {agentData.agents.slice(0, 5).map((agent, index) => (
                      <p key={index} className="text-xs text-gray-600">
                        • {agent.name} ({agent.category || 'custom'})
                      </p>
                    ))}
                    {agentData.agents.length > 5 && (
                      <p className="text-xs text-gray-500">
                        ... and {agentData.agents.length - 5} more agents
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                // Single agent preview
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Name:</strong> {agentData.name}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Description:</strong> {agentData.description}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Category:</strong> {agentData.category}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!agentData || !displayName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {agentData?.agents ? 'Share System' : 'Share Agent'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleCommunity;