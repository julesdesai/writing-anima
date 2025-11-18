/**
 * Configuration Card - Display component for community agent configurations
 */

import React from 'react';
import { Download, ThumbsUp, Eye, Calendar, User, Tag, MessageCircle } from 'lucide-react';

const ConfigurationCard = ({ 
  config, 
  viewMode = 'grid', 
  onView, 
  onDownload, 
  onRate, 
  renderVoteStats 
}) => {
  const { exportMetadata, communityMetadata } = config;
  const name = exportMetadata?.name || 'Unnamed Configuration';
  const description = communityMetadata.description || 'No description available';
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const getCategoryColor = (category) => {
    const colors = {
      academic: 'bg-blue-100 text-blue-700',
      creative: 'bg-purple-100 text-purple-700',
      business: 'bg-green-100 text-green-700',
      research: 'bg-orange-100 text-orange-700',
      writing: 'bg-pink-100 text-pink-700',
      analysis: 'bg-indigo-100 text-indigo-700',
      technical: 'bg-gray-100 text-gray-700',
      custom: 'bg-yellow-100 text-yellow-700'
    };
    return colors[category] || colors.custom;
  };

  if (viewMode === 'list') {
    return (
      <div className="config-card list-view" onClick={onView}>
        <div className="card-main">
          <div className="card-header">
            <h3 className="config-name">{name}</h3>
            <div className="config-meta">
              <span className={`category-badge ${getCategoryColor(communityMetadata.category)}`}>
                {communityMetadata.category}
              </span>
              {communityMetadata.featured && (
                <span className="featured-badge">Featured</span>
              )}
              {communityMetadata.verified && (
                <span className="verified-badge">✓ Verified</span>
              )}
            </div>
          </div>
          
          <p className="config-description">{description}</p>
          
          <div className="config-tags">
            {communityMetadata.tags.slice(0, 3).map(tag => (
              <span key={tag} className="tag">
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
            {communityMetadata.tags.length > 3 && (
              <span className="tag more">+{communityMetadata.tags.length - 3}</span>
            )}
          </div>
        </div>
        
        <div className="card-stats">
          <div className="stat-group">
            {renderVoteStats(communityMetadata.rating, communityMetadata.rating.count)}
          </div>
          
          <div className="stat-group">
            <Download className="w-4 h-4" />
            <span>{formatNumber(communityMetadata.downloadCount)}</span>
          </div>
          
          <div className="stat-group">
            <User className="w-4 h-4" />
            <span>{communityMetadata.authorName}</span>
          </div>
          
          <div className="stat-group">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(communityMetadata.publishedAt)}</span>
          </div>
        </div>
        
        <div className="card-actions">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="action-btn download-btn"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRate();
            }}
            className="action-btn rate-btn"
          >
            <ThumbsUp className="w-4 h-4" />
            Rate
          </button>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="config-card grid-view" onClick={onView}>
      <div className="card-header">
        <div className="card-badges">
          <span className={`category-badge ${getCategoryColor(communityMetadata.category)}`}>
            {communityMetadata.category}
          </span>
          {communityMetadata.featured && (
            <span className="featured-badge">⭐</span>
          )}
          {communityMetadata.verified && (
            <span className="verified-badge">✓</span>
          )}
        </div>
      </div>
      
      <div className="card-body">
        <h3 className="config-name">{name}</h3>
        <p className="config-description">{description}</p>
        
        <div className="config-tags">
          {communityMetadata.tags.slice(0, 2).map(tag => (
            <span key={tag} className="tag">
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
          {communityMetadata.tags.length > 2 && (
            <span className="tag more">+{communityMetadata.tags.length - 2}</span>
          )}
        </div>
      </div>
      
      <div className="card-footer">
        <div className="footer-stats">
          <div className="rating-section">
            {renderVoteStats(communityMetadata.rating, communityMetadata.rating.count)}
          </div>
          
          <div className="download-section">
            <Download className="w-4 h-4" />
            <span>{formatNumber(communityMetadata.downloadCount)}</span>
          </div>
        </div>
        
        <div className="author-section">
          <span className="author-avatar">{communityMetadata.authorAvatar}</span>
          <span className="author-name">{communityMetadata.authorName}</span>
        </div>
        
        <div className="date-section">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(communityMetadata.publishedAt)}</span>
        </div>
        
        <div className="card-actions">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="action-btn primary"
            title="Download and import this configuration"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRate();
            }}
            className="action-btn secondary"
            title="Vote on this configuration"
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="action-btn secondary"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationCard;