/**
 * Debug Panel for Multi-Agent System
 * Shows what's happening under the hood
 */

import React, { useState, useEffect } from 'react';
import { useMultiAgentAnalysis } from '../../hooks/useMultiAgentAnalysis';

export const MultiAgentDebugger = ({ content, purpose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [testResults, setTestResults] = useState(null);
  
  const {
    results,
    fastResults,
    enhancedResults,
    loading,
    error,
    progress,
    systemReady,
    isEnhancing,
    system,
    analyze,
    quickAnalyze
  } = useMultiAgentAnalysis();

  const runQuickTest = async () => {
    setTestResults(null);
    const testContent = content || "This is a test sentence with potential issues. Everyone knows that 100% of statistics are made up. You're wrong because you don't understand.";
    
    try {
      console.log('🔍 Starting quick test with content:', testContent);
      const result = await quickAnalyze(testContent);
      console.log('✅ Test completed:', result);
      setTestResults(result);
    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestResults({ error: error.message });
    }
  };

  const runFullTest = async () => {
    setTestResults(null);
    const testContent = content || "According to studies, climate change affects 97% of scientists. However, some people argue this is false. The data shows clear evidence from multiple peer-reviewed sources.";
    
    try {
      console.log('🔍 Starting full test with content:', testContent);
      const result = await analyze(testContent, { 
        purpose: purpose || "Test analysis",
        urgency: 'normal',
        budget: 'standard'
      });
      console.log('✅ Full test completed:', result);
      setTestResults(result);
    } catch (error) {
      console.error('❌ Full test failed:', error);
      setTestResults({ error: error.message });
    }
  };

  // Auto-open if there are errors
  useEffect(() => {
    if (error) {
      setIsOpen(true);
    }
  }, [error]);

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            systemReady 
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : error
              ? 'bg-red-100 text-red-800 hover:bg-red-200 animate-pulse'
              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
          }`}
        >
          🤖 Multi-Agent Debug
          {loading && <span className="ml-1 animate-spin">⚡</span>}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[80vh] overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h3 className="font-medium text-gray-900">Multi-Agent System Debug</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="p-3 space-y-4 text-sm">
        
        {/* System Status */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2">System Status</h4>
          <div className="space-y-1 text-xs">
            <div className={`flex justify-between ${systemReady ? 'text-green-600' : 'text-yellow-600'}`}>
              <span>System Ready:</span>
              <span>{systemReady ? '✅ Yes' : '⏳ Loading...'}</span>
            </div>
            <div className={`flex justify-between ${loading ? 'text-blue-600' : 'text-gray-500'}`}>
              <span>Analysis Running:</span>
              <span>{loading ? '🔄 Yes' : '⏹️ No'}</span>
            </div>
            <div className={`flex justify-between ${isEnhancing ? 'text-purple-600' : 'text-gray-500'}`}>
              <span>Enhancing:</span>
              <span>{isEnhancing ? '🔬 Yes' : '⏹️ No'}</span>
            </div>
            <div className={`flex justify-between ${error ? 'text-red-600' : 'text-green-600'}`}>
              <span>Errors:</span>
              <span>{error ? `❌ ${error.message}` : '✅ None'}</span>
            </div>
          </div>
        </div>

        {/* Progress Info */}
        {progress && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Current Progress</h4>
            <div className="bg-blue-50 p-2 rounded text-xs">
              <div>Stage: <span className="font-mono">{progress.stage}</span></div>
              <div>Agent: <span className="font-mono">{progress.agentId}</span></div>
              <div>Type: <span className="font-mono">{progress.type}</span></div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Results Summary</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Fast Results:</span>
              <span>{fastResults ? `✅ ${fastResults.insights?.length || 0} insights` : '❌ None'}</span>
            </div>
            <div className="flex justify-between">
              <span>Enhanced Results:</span>
              <span>{enhancedResults ? `✅ ${enhancedResults.insights?.length || 0} insights` : '❌ None'}</span>
            </div>
            <div className="flex justify-between">
              <span>Current Results:</span>
              <span>{results ? `✅ ${results.insights?.length || 0} insights` : '❌ None'}</span>
            </div>
          </div>
        </div>

        {/* Quick Tests */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Quick Tests</h4>
          <div className="flex gap-2">
            <button
              onClick={runQuickTest}
              disabled={!systemReady}
              className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200 disabled:opacity-50"
            >
              Test Fast Agents
            </button>
            <button
              onClick={runFullTest}
              disabled={!systemReady}
              className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs hover:bg-green-200 disabled:opacity-50"
            >
              Test Full System
            </button>
          </div>
          
          {testResults && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs max-h-32 overflow-y-auto">
              {testResults.error ? (
                <div className="text-red-600">❌ {testResults.error}</div>
              ) : (
                <div>
                  <div className="text-green-600">✅ Test completed</div>
                  <div>Stage: {testResults.stage}</div>
                  <div>Insights: {testResults.results?.insights?.length || 0}</div>
                  <div className="mt-1 font-mono text-xs">
                    {JSON.stringify(testResults.results?.insights?.[0], null, 2).substring(0, 200)}...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Raw Data */}
        {results && (
          <details>
            <summary className="font-medium text-gray-700 cursor-pointer">Raw Results Data</summary>
            <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-auto max-h-32">
              {JSON.stringify({
                insights: results.insights?.map(i => ({
                  type: i.type,
                  title: i.title,
                  agent: i.agent,
                  confidence: i.confidence
                })),
                confidence: results.confidence,
                analysisPhase: results.analysisPhase
              }, null, 2)}
            </pre>
          </details>
        )}

        {/* Console Logs */}
        <div className="text-xs text-gray-500">
          💡 Check browser console for detailed logs
        </div>

      </div>
    </div>
  );
};

export default MultiAgentDebugger;