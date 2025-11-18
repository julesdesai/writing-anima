import React, { useState, useEffect } from 'react';
import { Settings, Play, Pause, RotateCcw, Users } from 'lucide-react';
import UnifiedAgentCustomizationPanel from '../AgentCustomization/UnifiedAgentCustomizationPanel';
import SimpleCommunity from '../Community/SimpleCommunity';
import { useMultiAgentAnalysis } from '../../hooks/useMultiAgentAnalysis';
import { useUnifiedAgentCustomization } from '../../hooks/useUnifiedAgentCustomization';

const AgentInterface = ({ content, purpose, writingCriteria, isMonitoring, onToggleMonitoring, onClearFeedback }) => {
  const [activeTab, setActiveTab] = useState('agents');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Multi-agent analysis hook
  const multiAgentAnalysis = useMultiAgentAnalysis();
  
  // Unified agent customization hook
  const agentCustomization = useUnifiedAgentCustomization();
  
  // Initialize multiAgentSystem if not available
  useEffect(() => {
    console.log('AgentInterface mounted. system:', multiAgentAnalysis.system);
    console.log('systemReady:', multiAgentAnalysis.systemReady);
  }, [multiAgentAnalysis]);

  // Auto-analyze content when monitoring is enabled
  useEffect(() => {
    if (isMonitoring && content && content.length > 50) {
      const timeoutId = setTimeout(() => {
        multiAgentAnalysis.analyze(content, { purpose, writingCriteria });
      }, 1500); // Debounce analysis
      
      return () => clearTimeout(timeoutId);
    }
  }, [content, isMonitoring, purpose]);

  const handleRunAnalysis = async () => {
    if (!content || content.length < 10) {
      alert('Please write some content before running analysis.');
      return;
    }
    
    setIsAnalyzing(true);
    try {
      await multiAgentAnalysis.analyze(content, { 
        purpose, 
        writingCriteria,
        urgency: 'normal',
        budget: 'standard'
      });
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getAgentStats = () => {
    if (!multiAgentAnalysis.system) {
      console.log('system not available in getAgentStats');
      return { enabled: 0, total: 0 };
    }
    
    try {
      const enabled = multiAgentAnalysis.system.getEnabledAgents()?.length || 0;
      const total = multiAgentAnalysis.system.getAllAgentsStatus()?.length || 0;
      console.log('Agent stats:', { enabled, total });
      return { enabled, total };
    } catch (error) {
      console.error('Error getting agent stats:', error);
      return { enabled: 0, total: 0 };
    }
  };

  const getCustomizationStats = () => {
    return agentCustomization.getCustomizationSummary();
  };

  const agentStats = getAgentStats();
  const customizationStats = getCustomizationStats();

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-xl font-semibold text-slate-800 mb-2">AI Agents</h2>
        <p className="text-sm text-slate-600">
          Configure and control your writing analysis agents
        </p>
      </div>

      {/* Controls Bar */}
      <div className="border-b border-slate-200 p-4 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Status:</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                isMonitoring 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {isMonitoring ? 'Monitoring' : 'Paused'}
              </span>
            </div>
            <div className="text-sm text-slate-600">
              {agentStats.enabled}/{agentStats.total} agents active
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMonitoring}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isMonitoring 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isMonitoring ? 'Pause' : 'Resume'}
            </button>
            
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || multiAgentAnalysis.loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className={`w-4 h-4 ${(isAnalyzing || multiAgentAnalysis.loading) ? 'animate-spin' : ''}`} />
              {isAnalyzing || multiAgentAnalysis.loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
            
            <button
              onClick={onClearFeedback}
              className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('agents')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'agents'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            Agent Management
            <span className="ml-1 text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
              {agentStats.enabled}/{agentStats.total}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('community')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'community'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            Community
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {!multiAgentAnalysis.systemReady ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Initializing agent system...</p>
            </div>
          </div>
        ) : activeTab === 'agents' ? (
          <div className="max-w-7xl">
            <UnifiedAgentCustomizationPanel 
              isOpen={true}
              onClose={() => {}} // No close button needed since it's embedded
              initialTab="control" // Start with the control tab
              multiAgentSystem={multiAgentAnalysis.system}
              onAgentsUpdated={() => {
                console.log('Agents updated - analysis will use new configuration on next run');
              }}
              embedded={true} // Indicate this is embedded mode
            />
          </div>
        ) : (
          <div className="h-full">
            <SimpleCommunity 
              onImportAgent={(agent) => {
                console.log('Agent imported from community:', agent);
                // Refresh agent stats
                agentCustomization.refreshAgents?.();
              }}
            />
          </div>
        )}
      </div>

      {/* Footer with Analysis Status */}
      {(multiAgentAnalysis.loading || isAnalyzing) && (
        <div className="border-t border-slate-200 p-3 bg-blue-50">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span>Running analysis with {agentStats.enabled} agents...</span>
          </div>
        </div>
      )}

      {multiAgentAnalysis.results && !multiAgentAnalysis.loading && (
        <div className="border-t border-slate-200 p-3 bg-green-50">
          <div className="text-sm text-green-700">
            ✅ Analysis complete: {multiAgentAnalysis.results.insights?.length || 0} insights found
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentInterface;