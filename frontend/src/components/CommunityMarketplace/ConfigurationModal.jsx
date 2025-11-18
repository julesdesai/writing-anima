/**
 * Configuration Modal - Detailed view of a community configuration
 */

import React from 'react';
import { X, Download, ThumbsUp, Calendar, User, Tag, ExternalLink } from 'lucide-react';

const ConfigurationModal = ({ config, onClose, onDownload, onRate, renderVoteStats }) => {
  const { exportMetadata, communityMetadata } = config;
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const countAgents = (config) => {
    let count = 0;
    if (config.agents?.builtInCustomizations) {
      count += Object.keys(config.agents.builtInCustomizations).length;
    }
    if (config.agents?.dynamicAgents) {
      count += config.agents.dynamicAgents.length;
    }
    return count;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="configuration-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <h2>{exportMetadata?.name || 'Unnamed Configuration'}</h2>
            <div className="header-badges">
              <span className={`category-badge bg-${communityMetadata.category}-100 text-${communityMetadata.category}-700`}>
                {communityMetadata.category}
              </span>
              {communityMetadata.featured && (
                <span className="featured-badge">⭐ Featured</span>
              )}
              {communityMetadata.verified && (
                <span className="verified-badge">✓ Verified</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="close-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          <div className="config-overview">
            <div className="author-info">
              <span className="author-avatar">{communityMetadata.authorAvatar}</span>
              <div>
                <p className="author-name">{communityMetadata.authorName}</p>
                <p className="publish-date">
                  <Calendar className="w-4 h-4" />
                  Published {formatDate(communityMetadata.publishedAt)}
                </p>
              </div>
            </div>

            <div className="config-stats">
              <div className="stat">
                <Download className="w-5 h-5" />
                <span>{communityMetadata.downloadCount} downloads</span>
              </div>
              <div className="stat">
                {renderVoteStats(communityMetadata.rating, communityMetadata.rating.count)}
              </div>
            </div>
          </div>

          <div className="config-description">
            <h3>Description</h3>
            <p>{communityMetadata.description || 'No description available'}</p>
          </div>

          {communityMetadata.tags.length > 0 && (
            <div className="config-tags-section">
              <h3>Tags</h3>
              <div className="tags-list">
                {communityMetadata.tags.map(tag => (
                  <span key={tag} className="tag">
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="config-details">
            <h3>Configuration Details</h3>
            <div className="details-grid">
              <div className="detail-item">
                <label>Agents Included:</label>
                <span>{countAgents(config)} agents</span>
              </div>
              <div className="detail-item">
                <label>Format:</label>
                <span>{exportMetadata?.format || 'Full System'}</span>
              </div>
              <div className="detail-item">
                <label>Version:</label>
                <span>{communityMetadata.version}</span>
              </div>
              <div className="detail-item">
                <label>Export Date:</label>
                <span>{formatDate(exportMetadata?.exportedAt || communityMetadata.publishedAt)}</span>
              </div>
            </div>
          </div>

          {config.agents?.dynamicAgents && config.agents.dynamicAgents.length > 0 && (
            <div className="dynamic-agents-preview">
              <h3>Custom Agents ({config.agents.dynamicAgents.length})</h3>
              <div className="agents-list">
                {config.agents.dynamicAgents.slice(0, 3).map((agent, index) => (
                  <div key={index} className="agent-preview">
                    <h4>{agent.name}</h4>
                    <p>{agent.description || 'No description'}</p>
                    {agent.specialization && (
                      <span className="specialization">
                        Specialization: {agent.specialization}
                      </span>
                    )}
                  </div>
                ))}
                {config.agents.dynamicAgents.length > 3 && (
                  <div className="more-agents">
                    +{config.agents.dynamicAgents.length - 3} more agents
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="usage-instructions">
            <h3>How to Use</h3>
            <ol>
              <li>Click "Download & Import" to add this configuration to your system</li>
              <li>Choose your import preferences (merge with existing or replace)</li>
              <li>The configuration will be applied to your agent system</li>
              <li>You can customize further or use as-is</li>
            </ol>
          </div>

          <div className="modal-actions">
            <button onClick={onRate} className="rate-btn">
              <ThumbsUp className="w-4 h-4" />
              Vote on this Configuration
            </button>
            <button onClick={onDownload} className="download-btn primary">
              <Download className="w-4 h-4" />
              Download & Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationModal;