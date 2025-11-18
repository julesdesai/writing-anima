import React, { useState, useEffect } from 'react';
import promptCustomizationService from '../../services/promptCustomizationService';
import { useAuth } from '../../contexts/AuthContext';

const PromptCustomizationPanel = ({ isOpen, onClose }) => {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [customElements, setCustomElements] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(null);
  const auth = useAuth();
  const currentUser = auth?.currentUser;

  useEffect(() => {
    if (isOpen) {
      loadPrompts();
    }
  }, [isOpen]);

  const loadPrompts = () => {
    const allPrompts = promptCustomizationService.getAllPrompts();
    setPrompts(allPrompts);
    if (allPrompts.length > 0 && !selectedPrompt) {
      selectPrompt(allPrompts[0]);
    }
  };

  const selectPrompt = (prompt) => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to switch prompts?');
      if (!confirmLeave) return;
    }

    setSelectedPrompt(prompt);
    const promptConfig = promptCustomizationService.getPrompt(prompt.id);
    setCustomElements(promptConfig?.customElements || {});
    setHasUnsavedChanges(false);
  };

  const handleElementChange = (elementKey, value) => {
    setCustomElements(prev => ({
      ...prev,
      [elementKey]: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!selectedPrompt) return;

    setSaving(true);
    try {
      await promptCustomizationService.updatePromptElements(selectedPrompt.id, customElements);
      setHasUnsavedChanges(false);
      loadPrompts();
      setSyncStatus({ type: 'success', message: 'Prompt customizations saved successfully!' });
      
      if (currentUser && auth.updateUserData) {
        try {
          const syncResult = await promptCustomizationService.syncWithUserProfile(auth);
          if (syncResult.success) {
            setSyncStatus({ type: 'success', message: 'Saved and synced to your profile!' });
          }
        } catch (syncError) {
          console.warn('Profile sync failed:', syncError);
        }
      }
    } catch (error) {
      setSyncStatus({ type: 'error', message: `Failed to save: ${error.message}` });
    } finally {
      setSaving(false);
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const handleReset = async (promptId) => {
    try {
      await promptCustomizationService.resetToDefaults(promptId);
      loadPrompts();
      if (selectedPrompt?.id === promptId) {
        const resetPrompt = promptCustomizationService.getPrompt(promptId);
        setCustomElements(resetPrompt?.customElements || {});
        setHasUnsavedChanges(false);
      }
      setShowResetConfirm(null);
      setSyncStatus({ type: 'success', message: 'Prompt reset to defaults!' });
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (error) {
      setSyncStatus({ type: 'error', message: `Failed to reset: ${error.message}` });
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const handleResetAll = async () => {
    if (!window.confirm('Are you sure you want to reset ALL prompts to their defaults? This cannot be undone.')) {
      return;
    }

    try {
      await promptCustomizationService.resetAllToDefaults();
      loadPrompts();
      if (selectedPrompt) {
        const resetPrompt = promptCustomizationService.getPrompt(selectedPrompt.id);
        setCustomElements(resetPrompt?.customElements || {});
        setHasUnsavedChanges(false);
      }
      setSyncStatus({ type: 'success', message: 'All prompts reset to defaults!' });
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (error) {
      setSyncStatus({ type: 'error', message: `Failed to reset all: ${error.message}` });
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const exportConfiguration = () => {
    const config = promptCustomizationService.exportConfiguration();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-customizations-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const config = JSON.parse(e.target.result);
        const result = await promptCustomizationService.importConfiguration(config);
        
        if (result.success) {
          loadPrompts();
          setSyncStatus({ 
            type: 'success', 
            message: `Successfully imported ${result.importedCount} prompt customizations!` 
          });
        } else {
          setSyncStatus({ type: 'error', message: result.error });
        }
        setTimeout(() => setSyncStatus(null), 5000);
      } catch (error) {
        setSyncStatus({ type: 'error', message: 'Invalid configuration file' });
        setTimeout(() => setSyncStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  if (!isOpen) return null;

  const stats = promptCustomizationService.getCustomizationStats();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl">
        <div className="flex h-full flex-col">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Customize AI Prompts</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Personalize how AI critics analyze your writing. Response structure is preserved.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                ×
              </button>
            </div>
            
            <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
              <span>📊 {stats.customizedPrompts}/{stats.totalPrompts} agents customized</span>
              <span>🎯 Complete 8-agent suite</span>
              {currentUser && <span>👤 Synced to profile</span>}
              {stats.lastModified && (
                <span>🕒 Last modified: {new Date(stats.lastModified).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          {syncStatus && (
            <div className={`px-6 py-3 border-b ${
              syncStatus.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {syncStatus.type === 'success' ? '✅' : '❌'}
                <span>{syncStatus.message}</span>
              </div>
            </div>
          )}

          <div className="flex-1 flex overflow-hidden">
            <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">Available Prompts</h3>
                <div className="space-y-2">
                  {prompts.map((prompt) => {
                    // Agent type badges
                    const getAgentTypeBadge = (promptId) => {
                      if (promptId === 'clarityStyle' || promptId === 'quickFactChecker') {
                        return <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md">⚡ Fast</span>;
                      } else if (promptId === 'deepFactVerification') {
                        return <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-md">💎 Premium</span>;
                      } else {
                        return <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md">🎯 Standard</span>;
                      }
                    };

                    return (
                      <div
                        key={prompt.id}
                        onClick={() => selectPrompt(prompt)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedPrompt?.id === prompt.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900">{prompt.name}</h4>
                              {getAgentTypeBadge(prompt.id)}
                            </div>
                            <p className="text-sm text-gray-600">{prompt.description}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            {prompt.isCustomized && (
                              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" title="Customized" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowResetConfirm(prompt.id);
                              }}
                              className="text-gray-400 hover:text-red-600"
                              title="Reset to defaults"
                            >
                              ↻
                            </button>
                          </div>
                        </div>
                        
                        {/* Customization summary */}
                        {prompt.isCustomized && (
                          <div className="mt-2 text-xs text-blue-600">
                            Customized elements: {Object.keys(prompt.customElements || {}).length}
                          </div>
                        )}
                        
                        {prompt.lastModified && (
                          <p className="text-xs text-gray-500 mt-2">
                            Modified: {new Date(prompt.lastModified).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {selectedPrompt ? (
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">{selectedPrompt.name}</h3>
                    <p className="text-gray-600 mt-1">{selectedPrompt.description}</p>
                  </div>

                  <div className="space-y-6">
                    {Object.entries(selectedPrompt.customizableElements || {}).map(([elementKey, config]) => (
                      <div key={elementKey}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {elementKey.charAt(0).toUpperCase() + elementKey.slice(1)}
                        </label>
                        <p className="text-sm text-gray-500 mb-3">{config.description}</p>
                        
                        <div className="space-y-2">
                          <div className="text-xs text-gray-500 font-medium">Default:</div>
                          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border">
                            {config.default}
                          </div>
                          
                          <div className="text-xs text-gray-500 font-medium">Your customization:</div>
                          <textarea
                            value={customElements[elementKey] || ''}
                            onChange={(e) => handleElementChange(elementKey, e.target.value)}
                            placeholder={`Enter custom ${elementKey} or leave empty to use default`}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={3}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      {hasUnsavedChanges && '• Unsaved changes'}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowResetConfirm(selectedPrompt.id)}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Reset to Default
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges || saving}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Select a prompt to customize
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={exportConfiguration}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Export Configuration
                </button>
                <label className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                  Import Configuration
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
              <button
                onClick={handleResetAll}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Reset All to Defaults
              </button>
            </div>
          </div>
        </div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowResetConfirm(null)} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Reset Prompt</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to reset this prompt to its default configuration? 
              This will remove all your customizations.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReset(showResetConfirm)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptCustomizationPanel;