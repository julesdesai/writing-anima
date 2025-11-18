/**
 * Simple Test Component for Multi-Agent System
 * Use this to verify the system is working before full integration
 */

import React, { useState } from 'react';
import { useMultiAgentAnalysis } from '../../hooks/useMultiAgentAnalysis';
import MultiAgentDebugger from '../Debug/MultiAgentDebugger';

const MultiAgentTest = () => {
  const [content, setContent] = useState("Everyone knows that 85% of statistics are made up. You're wrong because you don't have a PhD in this field. This study proves my point conclusively.");
  const [purpose, setPurpose] = useState("Test the multi-agent writing assistant system");
  
  const {
    results,
    fastResults,
    enhancedResults,
    loading,
    error,
    progress,
    systemReady,
    isEnhancing,
    analyze,
    quickAnalyze,
    thoroughAnalyze
  } = useMultiAgentAnalysis();

  const handleQuickTest = async () => {
    await quickAnalyze(content);
  };

  const handleFullTest = async () => {
    await analyze(content, { purpose });
  };

  const handleThoroughTest = async () => {
    await thoroughAnalyze(content);
  };

  const renderResults = (resultData, title) => {
    if (!resultData || !resultData.insights) return null;

    return (
      <div className="mt-4 p-4 border border-gray-200 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-3">{title}</h3>
        <div className="text-sm text-gray-600 mb-2">
          Found {resultData.insights.length} insights (Confidence: {(resultData.confidence * 100).toFixed(1)}%)
        </div>
        
        <div className="space-y-2">
          {resultData.insights.slice(0, 3).map((insight, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{insight.title}</span>
                <div className="flex items-center space-x-2 text-xs">
                  <span className={`px-2 py-1 rounded ${
                    insight.priority === 'high' ? 'bg-red-100 text-red-800' :
                    insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {insight.priority || 'low'}
                  </span>
                  <span className="text-gray-500">{insight.agent}</span>
                </div>
              </div>
              <div className="text-sm text-gray-700 mb-1">{insight.feedback}</div>
              {insight.suggestion && (
                <div className="text-sm text-blue-700 italic">💡 {insight.suggestion}</div>
              )}
              {insight.confidence && (
                <div className="text-xs text-gray-500 mt-1">
                  Confidence: {(insight.confidence * 100).toFixed(1)}%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Multi-Agent System Test</h1>
        <p className="text-gray-600">Test the new writing assistant before full integration</p>
      </div>

      {/* System Status */}
      <div className={`p-4 rounded-lg border ${
        systemReady 
          ? 'bg-green-50 border-green-200' 
          : error 
          ? 'bg-red-50 border-red-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            systemReady ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
          }`} />
          <span className="font-medium">
            {systemReady ? '✅ System Ready' : error ? `❌ Error: ${error.message}` : '⏳ Initializing...'}
          </span>
          {loading && <span className="text-blue-600 animate-pulse">🔄 Analyzing...</span>}
          {isEnhancing && <span className="text-purple-600 animate-pulse">🔬 Enhancing...</span>}
        </div>
        
        {progress && (
          <div className="mt-2 text-sm text-gray-600">
            Current: {progress.stage} ({progress.agentId})
          </div>
        )}
      </div>

      {/* Test Input */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Test Content (try editing this to see real-time analysis)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter text to analyze..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Writing Purpose
          </label>
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="What are you trying to accomplish with this writing?"
          />
        </div>
      </div>

      {/* Test Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={handleQuickTest}
          disabled={!systemReady || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Quick Test (Fast Agents Only)
        </button>
        
        <button
          onClick={handleFullTest}
          disabled={!systemReady || loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Progressive Test (Fast + Research)
        </button>
        
        <button
          onClick={handleThoroughTest}
          disabled={!systemReady || loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Thorough Test (All Agents)
        </button>
      </div>

      {/* Results Display */}
      {renderResults(fastResults, "⚡ Fast Results (1-3 seconds)")}
      {renderResults(enhancedResults, "🔬 Enhanced Results (with research)")}
      {results && !enhancedResults && renderResults(results, "📊 Current Results")}

      {/* No Results Message */}
      {systemReady && !results && !loading && (
        <div className="text-center py-8 text-gray-500">
          Click a test button above to see the multi-agent system in action
        </div>
      )}

      {/* Debug Panel */}
      <MultiAgentDebugger content={content} purpose={purpose} />

    </div>
  );
};

export default MultiAgentTest;