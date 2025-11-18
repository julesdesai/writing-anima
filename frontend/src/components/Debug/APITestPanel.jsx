import React, { useState } from 'react';
import aiService from '../../services/aiService';

const APITestPanel = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testAPI = async () => {
    setTesting(true);
    setResult(null);
    setError(null);

    try {
      console.log('Testing API with simple prompt...');
      const response = await aiService.callAPI(
        'Respond with exactly: {"test": "success", "message": "API is working"}',
        undefined,
        {
          temperature: 0.1,
          maxTokens: 100,
          model: 'gpt-4o-mini'
        }
      );

      console.log('API test response:', response);
      setResult(response);
    } catch (err) {
      console.error('API test failed:', err);
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  const checkEnvironment = () => {
    return {
      hasApiKey: !!process.env.REACT_APP_OPENAI_API_KEY,
      apiKeyPrefix: process.env.REACT_APP_OPENAI_API_KEY?.substring(0, 7) + '...',
      useLocalInference: process.env.REACT_APP_USE_LOCAL_INFERENCE === 'true',
      localBackendUrl: process.env.REACT_APP_LOCAL_BACKEND_URL
    };
  };

  const env = checkEnvironment();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 m-4">
      <h3 className="text-lg font-semibold mb-4">🔧 API Configuration Test</h3>
      
      {/* Environment Status */}
      <div className="bg-gray-50 p-3 rounded mb-4">
        <h4 className="font-medium text-sm mb-2">Environment Configuration:</h4>
        <div className="text-xs space-y-1">
          <div className={`${env.hasApiKey ? 'text-green-600' : 'text-red-600'}`}>
            OpenAI API Key: {env.hasApiKey ? `✅ Set (${env.apiKeyPrefix})` : '❌ Not Set'}
          </div>
          <div className={`${env.useLocalInference ? 'text-blue-600' : 'text-gray-600'}`}>
            Local Inference: {env.useLocalInference ? '✅ Enabled' : '⚪ Disabled'}
          </div>
          {env.useLocalInference && (
            <div className="text-blue-600">
              Local Backend: {env.localBackendUrl || 'http://localhost:3001'}
            </div>
          )}
        </div>
      </div>

      {/* Test Button */}
      <button
        onClick={testAPI}
        disabled={testing}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {testing ? 'Testing API...' : 'Test API Connection'}
      </button>

      {/* Results */}
      {result && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <h4 className="font-medium text-green-800 text-sm mb-2">✅ Success!</h4>
          <pre className="text-xs text-green-700 overflow-auto">{result}</pre>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <h4 className="font-medium text-red-800 text-sm mb-2">❌ Error:</h4>
          <pre className="text-xs text-red-700 overflow-auto">{error}</pre>
          
          {error.includes('API key') && (
            <div className="mt-2 text-sm text-red-600">
              💡 <strong>Fix:</strong> Set your OpenAI API key in environment variables:
              <code className="block mt-1 p-2 bg-red-100 rounded text-xs">
                REACT_APP_OPENAI_API_KEY=your_api_key_here
              </code>
            </div>
          )}
        </div>
      )}

      {/* Quick Setup Guide */}
      {!env.hasApiKey && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <h4 className="font-medium text-yellow-800 text-sm mb-2">⚙️ Setup Required:</h4>
          <div className="text-xs text-yellow-700">
            <p>To use the multi-agent system, you need to configure an OpenAI API key:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Get an API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">OpenAI Platform</a></li>
              <li>Create a <code>.env.local</code> file in your project root</li>
              <li>Add: <code>REACT_APP_OPENAI_API_KEY=your_key_here</code></li>
              <li>Restart your development server</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default APITestPanel;