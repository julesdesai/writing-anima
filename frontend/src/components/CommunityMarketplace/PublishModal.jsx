/**
 * Publish Modal - Publish agent configurations to the community
 */

import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import multiagentSharingService, { SHARING_FORMATS } from '../../services/multiagentSharingService';
import { VISIBILITY_LEVELS, CATEGORY_FILTERS } from '../../services/communityAgentService';

const PublishModal = ({ system, onClose, onPublish }) => {
  const [config, setConfig] = useState(null);
  const [metadata, setMetadata] = useState({
    name: '',
    description: '',
    category: CATEGORY_FILTERS.CUSTOM,
    tags: [],
    visibility: VISIBILITY_LEVELS.PUBLIC,
    version: '1.0.0'
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Generate configuration to publish
    const generateConfig = async () => {
      if (!system) return;
      
      try {
        const systemConfig = await multiagentSharingService.exportSystemConfiguration(system, {
          format: SHARING_FORMATS.FULL_SYSTEM,
          name: metadata.name || 'My Configuration',
          description: metadata.description
        });
        setConfig(systemConfig);
      } catch (error) {
        console.error('Failed to generate config:', error);
      }
    };

    generateConfig();
  }, [system, metadata.name, metadata.description]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!config) {
      alert('Configuration not ready. Please try again.');
      return;
    }

    if (!metadata.name.trim()) {
      alert('Please provide a name for your configuration');
      return;
    }

    if (!metadata.description.trim()) {
      alert('Please provide a description for your configuration');
      return;
    }

    setLoading(true);
    try {
      await onPublish(config, metadata);
    } catch (error) {
      console.error('Publish failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !metadata.tags.includes(tag) && metadata.tags.length < 5) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="publish-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📤 Publish Configuration</h2>
          <button onClick={onClose} className="close-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          <div className="publish-intro">
            <p>Share your agent configuration with the community! Other users will be able to download and use your setup.</p>
          </div>

          <form onSubmit={handleSubmit} className="publish-form">
            <div className="form-group">
              <label htmlFor="name">
                Configuration Name *
                <span className="char-count">{metadata.name.length}/60</span>
              </label>
              <input
                id="name"
                type="text"
                value={metadata.name}
                onChange={(e) => setMetadata(prev => ({ 
                  ...prev, 
                  name: e.target.value.slice(0, 60) 
                }))}
                placeholder="My Awesome Agent Configuration"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">
                Description *
                <span className="char-count">{metadata.description.length}/300</span>
              </label>
              <textarea
                id="description"
                value={metadata.description}
                onChange={(e) => setMetadata(prev => ({ 
                  ...prev, 
                  description: e.target.value.slice(0, 300) 
                }))}
                placeholder="Describe what makes your configuration special and how others can benefit from it..."
                rows={4}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={metadata.category}
                  onChange={(e) => setMetadata(prev => ({ 
                    ...prev, 
                    category: e.target.value 
                  }))}
                >
                  <option value={CATEGORY_FILTERS.CUSTOM}>Custom</option>
                  <option value={CATEGORY_FILTERS.WRITING}>Writing</option>
                  <option value={CATEGORY_FILTERS.ANALYSIS}>Analysis</option>
                  <option value={CATEGORY_FILTERS.RESEARCH}>Research</option>
                  <option value={CATEGORY_FILTERS.CREATIVE}>Creative</option>
                  <option value={CATEGORY_FILTERS.ACADEMIC}>Academic</option>
                  <option value={CATEGORY_FILTERS.BUSINESS}>Business</option>
                  <option value={CATEGORY_FILTERS.TECHNICAL}>Technical</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="visibility">Visibility</label>
                <select
                  id="visibility"
                  value={metadata.visibility}
                  onChange={(e) => setMetadata(prev => ({ 
                    ...prev, 
                    visibility: e.target.value 
                  }))}
                >
                  <option value={VISIBILITY_LEVELS.PUBLIC}>Public - Listed in marketplace</option>
                  <option value={VISIBILITY_LEVELS.UNLISTED}>Unlisted - Only via direct link</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>
                Tags (up to 5)
                <span className="tag-count">{metadata.tags.length}/5</span>
              </label>
              <div className="tag-input-container">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add tags to help others find your configuration..."
                  disabled={metadata.tags.length >= 5}
                />
                <button 
                  type="button" 
                  onClick={addTag}
                  disabled={!tagInput.trim() || metadata.tags.length >= 5}
                  className="add-tag-btn"
                >
                  Add
                </button>
              </div>
              
              {metadata.tags.length > 0 && (
                <div className="current-tags">
                  {metadata.tags.map(tag => (
                    <span key={tag} className="tag-pill">
                      {tag}
                      <button 
                        type="button" 
                        onClick={() => removeTag(tag)}
                        className="remove-tag"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="version">Version</label>
              <input
                id="version"
                type="text"
                value={metadata.version}
                onChange={(e) => setMetadata(prev => ({ 
                  ...prev, 
                  version: e.target.value 
                }))}
                placeholder="1.0.0"
              />
            </div>

            <div className="publish-preview">
              <h4>Configuration Preview:</h4>
              <div className="config-summary">
                <p><strong>Agents:</strong> {config ? 'System + Custom agents included' : 'Loading...'}</p>
                <p><strong>Preferences:</strong> User preferences and settings included</p>
                <p><strong>Format:</strong> Full system configuration</p>
              </div>
            </div>

            <div className="publish-guidelines">
              <h4>Publishing Guidelines:</h4>
              <ul>
                <li>✅ Configurations should be helpful and functional</li>
                <li>✅ Use clear, descriptive names and descriptions</li>
                <li>✅ Add relevant tags to improve discoverability</li>
                <li>❌ Don't publish broken or testing configurations</li>
                <li>❌ Don't use misleading descriptions or tags</li>
              </ul>
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="cancel-btn">
                Cancel
              </button>
              <button 
                type="submit" 
                className="publish-btn primary"
                disabled={loading || !config}
              >
                {loading ? (
                  <>
                    <div className="spinner small"></div>
                    Publishing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Publish to Community
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PublishModal;