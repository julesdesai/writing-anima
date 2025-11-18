/**
 * Agent Sharing Panel - Complete multiagent system sharing interface
 */

import React, { useState, useEffect } from 'react';
import multiagentSharingService, { SHARING_FORMATS } from '../../services/multiagentSharingService';
import unifiedAgentCustomizationService from '../../services/unifiedAgentCustomizationService';
import './AgentSharingPanel.css';

const AgentSharingPanel = ({ system, onClose, embedded = false }) => {
  const [activeTab, setActiveTab] = useState('export');
  const [exportFormat, setExportFormat] = useState(SHARING_FORMATS.FULL_SYSTEM);
  const [exportOptions, setExportOptions] = useState({
    includeHistory: false,
    includeLearningData: false,
    name: '',
    description: ''
  });
  const [savedConfigurations, setSavedConfigurations] = useState([]);
  const [importFile, setImportFile] = useState(null);
  const [importOptions, setImportOptions] = useState({
    overwriteExisting: false,
    mergeAgents: true,
    restorePreferences: true
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadSavedConfigurations();
    loadStats();
  }, []);

  const loadSavedConfigurations = () => {
    setSavedConfigurations(multiagentSharingService.getSavedConfigurations());
  };

  const loadStats = () => {
    const agentStats = unifiedAgentCustomizationService.getAgentStats();
    const sharingStats = multiagentSharingService.getStats();
    setStats({ ...agentStats, sharing: sharingStats });
  };

  const handleExport = async () => {
    if (!system) {
      setStatus({ type: 'error', message: 'No system available for export' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const config = await multiagentSharingService.exportSystemConfiguration(system, {
        format: exportFormat,
        ...exportOptions
      });

      // Save locally
      const configId = multiagentSharingService.saveConfiguration(config, {
        name: exportOptions.name || `Export ${new Date().toLocaleDateString()}`,
        description: exportOptions.description
      });

      // Create download
      const blob = new Blob([JSON.stringify(config, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `multiagent-config-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      loadSavedConfigurations();
      setStatus({ 
        type: 'success', 
        message: `Configuration exported successfully! Saved as ${configId}` 
      });

    } catch (error) {
      setStatus({ type: 'error', message: `Export failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setStatus({ type: 'error', message: 'Please select a file to import' });
      return;
    }

    if (!system) {
      setStatus({ type: 'error', message: 'No system available for import' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const text = await importFile.text();
      const config = JSON.parse(text);

      const results = await multiagentSharingService.importSystemConfiguration(
        config, 
        system, 
        importOptions
      );

      let message = `Import completed! `;
      message += `${results.imported.agents} agents imported, `;
      message += `preferences: ${results.imported.preferences ? 'yes' : 'no'}, `;
      message += `agent states: ${results.imported.agentStates}`;

      if (results.errors.length > 0) {
        message += `\nWarnings: ${results.errors.length} items had issues`;
      }

      setStatus({ type: 'success', message });
      loadStats();

    } catch (error) {
      setStatus({ type: 'error', message: `Import failed: ${error.message}` });
    } finally {
      setLoading(false);
      setImportFile(null);
    }
  };

  const handleLoadConfiguration = async (configId) => {
    if (!system) {
      setStatus({ type: 'error', message: 'No system available' });
      return;
    }

    setLoading(true);
    try {
      const config = multiagentSharingService.loadConfiguration(configId);
      if (!config) {
        throw new Error('Configuration not found');
      }

      const results = await multiagentSharingService.importSystemConfiguration(
        config, 
        system, 
        { ...importOptions, overwriteExisting: true }
      );

      setStatus({ 
        type: 'success', 
        message: `Configuration loaded! ${results.imported.agents} agents restored` 
      });
      loadStats();

    } catch (error) {
      setStatus({ type: 'error', message: `Load failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfiguration = (configId) => {
    if (multiagentSharingService.deleteConfiguration(configId)) {
      loadSavedConfigurations();
      setStatus({ type: 'success', message: 'Configuration deleted' });
    }
  };

  const handleGenerateLink = async (configId) => {
    try {
      const config = multiagentSharingService.loadConfiguration(configId);
      const link = await multiagentSharingService.generateShareableLink(config);
      
      navigator.clipboard.writeText(link);
      setStatus({ type: 'success', message: 'Shareable link copied to clipboard!' });
    } catch (error) {
      setStatus({ type: 'error', message: `Failed to generate link: ${error.message}` });
    }
  };

  const formatConfigSize = (config) => {
    const str = JSON.stringify(config);
    const bytes = new Blob([str]).size;
    return bytes < 1024 ? `${bytes}B` : `${Math.round(bytes / 1024)}KB`;
  };

  return (
    <div className={`agent-sharing-panel ${embedded ? 'embedded' : ''}`}>
      {!embedded && (
        <div className="panel-header">
          <h2>🔄 System Sharing</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
      )}

      <div className="sharing-tabs">
        <button 
          className={activeTab === 'export' ? 'active' : ''}
          onClick={() => setActiveTab('export')}
        >
          📤 Export
        </button>
        <button 
          className={activeTab === 'import' ? 'active' : ''}
          onClick={() => setActiveTab('import')}
        >
          📥 Import
        </button>
        <button 
          className={activeTab === 'saved' ? 'active' : ''}
          onClick={() => setActiveTab('saved')}
        >
          💾 Saved ({savedConfigurations.length})
        </button>
        <button 
          className={activeTab === 'stats' ? 'active' : ''}
          onClick={() => setActiveTab('stats')}
        >
          📊 Stats
        </button>
      </div>

      {status.message && (
        <div className={`status-message ${status.type}`}>
          {status.message}
        </div>
      )}

      {activeTab === 'export' && (
        <div className="export-section">
          <h3>Export Configuration</h3>
          
          <div className="export-options">
            <div className="option-group">
              <label>Export Format:</label>
              <select 
                value={exportFormat} 
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value={SHARING_FORMATS.FULL_SYSTEM}>Full System (All settings + agents)</option>
                <option value={SHARING_FORMATS.AGENTS_ONLY}>Agents Only</option>
                <option value={SHARING_FORMATS.PREFERENCES_ONLY}>Preferences Only</option>
              </select>
            </div>

            <div className="option-group">
              <label>Configuration Name:</label>
              <input
                type="text"
                value={exportOptions.name}
                onChange={(e) => setExportOptions(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Custom Configuration"
              />
            </div>

            <div className="option-group">
              <label>Description:</label>
              <textarea
                value={exportOptions.description}
                onChange={(e) => setExportOptions(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description of this configuration..."
                rows={3}
              />
            </div>

            <div className="checkbox-options">
              <label>
                <input
                  type="checkbox"
                  checked={exportOptions.includeHistory}
                  onChange={(e) => setExportOptions(prev => ({ 
                    ...prev, 
                    includeHistory: e.target.checked 
                  }))}
                />
                Include feedback history
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={exportOptions.includeLearningData}
                  onChange={(e) => setExportOptions(prev => ({ 
                    ...prev, 
                    includeLearningData: e.target.checked 
                  }))}
                />
                Include learning data
              </label>
            </div>
          </div>

          <button 
            onClick={handleExport} 
            disabled={loading || !system}
            className="export-btn primary-btn"
          >
            {loading ? 'Exporting...' : '📤 Export & Download'}
          </button>
        </div>
      )}

      {activeTab === 'import' && (
        <div className="import-section">
          <h3>Import Configuration</h3>
          
          <div className="import-options">
            <div className="file-input-group">
              <label>Select Configuration File:</label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files[0])}
              />
            </div>

            <div className="checkbox-options">
              <label>
                <input
                  type="checkbox"
                  checked={importOptions.overwriteExisting}
                  onChange={(e) => setImportOptions(prev => ({ 
                    ...prev, 
                    overwriteExisting: e.target.checked 
                  }))}
                />
                Overwrite existing customizations
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={importOptions.mergeAgents}
                  onChange={(e) => setImportOptions(prev => ({ 
                    ...prev, 
                    mergeAgents: e.target.checked 
                  }))}
                />
                Merge with existing agents
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={importOptions.restorePreferences}
                  onChange={(e) => setImportOptions(prev => ({ 
                    ...prev, 
                    restorePreferences: e.target.checked 
                  }))}
                />
                Restore system preferences
              </label>
            </div>
          </div>

          <button 
            onClick={handleImport} 
            disabled={loading || !importFile || !system}
            className="import-btn primary-btn"
          >
            {loading ? 'Importing...' : '📥 Import Configuration'}
          </button>
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="saved-section">
          <h3>Saved Configurations</h3>
          
          {savedConfigurations.length === 0 ? (
            <p className="empty-state">No saved configurations yet. Export a configuration to get started!</p>
          ) : (
            <div className="configurations-list">
              {savedConfigurations.map(config => (
                <div key={config.id} className="configuration-item">
                  <div className="config-info">
                    <h4>{config.name}</h4>
                    <p>{config.description || 'No description'}</p>
                    <div className="config-meta">
                      <span>📅 {new Date(config.savedAt).toLocaleDateString()}</span>
                      <span>🤖 {config.agentCount} agents</span>
                      <span>📋 {config.format}</span>
                    </div>
                  </div>
                  <div className="config-actions">
                    <button 
                      onClick={() => handleLoadConfiguration(config.id)}
                      disabled={loading}
                      className="load-btn"
                    >
                      📥 Load
                    </button>
                    <button 
                      onClick={() => handleGenerateLink(config.id)}
                      className="share-btn"
                    >
                      🔗 Share
                    </button>
                    <button 
                      onClick={() => handleDeleteConfiguration(config.id)}
                      className="delete-btn"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && stats && (
        <div className="stats-section">
          <h3>System Statistics</h3>
          
          <div className="stats-grid">
            <div className="stat-card">
              <h4>🤖 Agents</h4>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-breakdown">
                <span>Built-in: {stats.builtIn}</span>
                <span>Dynamic: {stats.dynamic}</span>
                <span>Customized: {stats.customizedBuiltIn}</span>
              </div>
            </div>

            <div className="stat-card">
              <h4>📊 Performance</h4>
              <div className="stat-value">{Math.round(stats.averagePerformance * 100)}%</div>
              <div className="stat-breakdown">
                <span>Total Usage: {stats.totalUsage}</span>
                <span>Templates: {stats.templates}</span>
              </div>
            </div>

            <div className="stat-card">
              <h4>💾 Sharing</h4>
              <div className="stat-value">{stats.sharing.totalConfigurations}</div>
              <div className="stat-breakdown">
                <span>Saved Configs: {stats.sharing.totalConfigurations}</span>
                <span>Avg Agents: {Math.round(stats.sharing.averageAgentsPerConfig)}</span>
              </div>
            </div>
          </div>

          <div className="format-breakdown">
            <h4>Export Format Usage:</h4>
            {Object.entries(stats.sharing.formatBreakdown || {}).map(([format, count]) => (
              <div key={format} className="format-stat">
                <span>{format}:</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Processing...</p>
        </div>
      )}
    </div>
  );
};

export default AgentSharingPanel;