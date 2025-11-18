/**
 * Community Marketplace - Browse and discover public agent configurations
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, Eye, Calendar, User, 
  Tag, TrendingUp, Award, MessageCircle, ThumbsUp, ThumbsDown, Flag,
  Grid, List, ChevronDown, ExternalLink
} from 'lucide-react';
import communityAgentService, { SORT_OPTIONS, CATEGORY_FILTERS, VISIBILITY_LEVELS } from '../../services/communityAgentService';
import ConfigurationCard from './ConfigurationCard';
import ConfigurationModal from './ConfigurationModal';
import RatingModal from './RatingModal';
import PublishModal from './PublishModal';
import './CommunityMarketplace.css';

const CommunityMarketplace = ({ system, onImportConfiguration, embedded = false }) => {
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [pagination, setPagination] = useState({});
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_FILTERS.ALL);
  const [selectedSort, setSelectedSort] = useState(SORT_OPTIONS.NEWEST);
  const [minRating, setMinRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  
  // Community stats
  const [communityStats, setCommunityStats] = useState(null);
  const [featuredConfigs, setFeaturedConfigs] = useState([]);
  const [trendingConfigs, setTrendingConfigs] = useState([]);
  
  useEffect(() => {
    loadConfigurations();
    loadCommunityStats();
    loadFeaturedConfigs();
    loadTrendingConfigs();
  }, [searchQuery, selectedCategory, selectedSort, minRating, selectedTags]);

  const loadConfigurations = async () => {
    setLoading(true);
    try {
      const result = communityAgentService.getPublicConfigurations({
        searchQuery,
        category: selectedCategory,
        sortBy: selectedSort,
        minRating,
        tags: selectedTags,
        limit: 20,
        offset: 0
      });
      
      setConfigurations(result.configurations);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Failed to load configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCommunityStats = async () => {
    try {
      const stats = communityAgentService.getCommunityStats();
      setCommunityStats(stats);
    } catch (error) {
      console.error('Failed to load community stats:', error);
    }
  };

  const loadFeaturedConfigs = async () => {
    try {
      const result = communityAgentService.getFeaturedConfigurations(3);
      setFeaturedConfigs(result.configurations);
    } catch (error) {
      console.error('Failed to load featured configs:', error);
    }
  };

  const loadTrendingConfigs = async () => {
    try {
      const result = communityAgentService.getTrendingConfigurations(5);
      setTrendingConfigs(result.configurations.slice(0, 5));
    } catch (error) {
      console.error('Failed to load trending configs:', error);
    }
  };

  const handleConfigClick = (config) => {
    setSelectedConfig(config);
    setShowConfigModal(true);
  };

  const handleDownload = async (configId) => {
    try {
      const result = await communityAgentService.downloadConfiguration(configId);
      if (result.success && onImportConfiguration) {
        await onImportConfiguration(result.config);
      }
      loadConfigurations(); // Refresh to update download counts
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Download failed: ${error.message}`);
    }
  };

  const handleRate = (config) => {
    setSelectedConfig(config);
    setShowRatingModal(true);
  };

  const handleRatingSubmit = async (rating, review) => {
    try {
      await communityAgentService.rateConfiguration(selectedConfig.id, rating, review);
      setShowRatingModal(false);
      loadConfigurations(); // Refresh to update ratings
      alert('Rating submitted successfully!');
    } catch (error) {
      console.error('Rating failed:', error);
      alert(`Rating failed: ${error.message}`);
    }
  };

  const handlePublish = async (config, metadata) => {
    try {
      const result = await communityAgentService.publishConfiguration(config, metadata);
      if (result.success) {
        setShowPublishModal(false);
        loadConfigurations();
        alert('Configuration published successfully!');
      }
    } catch (error) {
      console.error('Publish failed:', error);
      alert(`Publish failed: ${error.message}`);
    }
  };

  const handleTagFilter = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(CATEGORY_FILTERS.ALL);
    setSelectedSort(SORT_OPTIONS.NEWEST);
    setMinRating(0);
    setSelectedTags([]);
  };

  const renderVoteStats = (rating, count = null) => {
    // Convert star-based rating system to upvote percentage
    // Ratings 4-5 are considered upvotes, 1-3 are downvotes
    const upvotePercentage = count > 0 && rating.distribution 
      ? Math.round(((rating.distribution[5] || 0) / count) * 100)
      : rating.average >= 3 ? Math.round((rating.average / 5) * 100) : 0;
    
    return (
      <div className="flex items-center gap-1">
        <ThumbsUp className="w-4 h-4 text-green-600" />
        <span className="text-sm font-medium">{upvotePercentage}%</span>
        {count !== null && (
          <span className="text-sm text-gray-600">({count})</span>
        )}
      </div>
    );
  };

  return (
    <div className={`community-marketplace ${embedded ? 'embedded' : ''}`}>
      {/* Header */}
      <div className="marketplace-header">
        <div className="header-content">
          <h1>🌟 Community Marketplace</h1>
          <p>Discover and share agent configurations with the community</p>
          
          {communityStats && (
            <div className="community-stats">
              <div className="stat">
                <span className="stat-value">{communityStats.totalConfigurations}</span>
                <span className="stat-label">Configurations</span>
              </div>
              <div className="stat">
                <span className="stat-value">{communityStats.totalDownloads}</span>
                <span className="stat-label">Downloads</span>
              </div>
              <div className="stat">
                <span className="stat-value">{communityStats.totalRatings}</span>
                <span className="stat-label">Reviews</span>
              </div>
              <div className="stat">
                <span className="stat-value">{Math.round(communityStats.averageRating * 10) / 10}</span>
                <span className="stat-label">Avg Rating</span>
              </div>
            </div>
          )}
        </div>
        
        <button 
          onClick={() => setShowPublishModal(true)}
          className="publish-btn"
        >
          📤 Publish Your Config
        </button>
      </div>

      {/* Featured Configurations */}
      {featuredConfigs.length > 0 && (
        <div className="featured-section">
          <h2>⭐ Featured Configurations</h2>
          <div className="featured-grid">
            {featuredConfigs.map(config => (
              <div key={config.id} className="featured-card" onClick={() => handleConfigClick(config)}>
                <div className="featured-badge">Featured</div>
                <h3>{config.exportMetadata?.name || 'Unnamed Configuration'}</h3>
                <p>{config.communityMetadata.description}</p>
                <div className="featured-meta">
                  {renderVoteStats(config.communityMetadata.rating, config.communityMetadata.rating.count)}
                  <span className="downloads">
                    <Download className="w-4 h-4" />
                    {config.communityMetadata.downloadCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="search-filters">
        <div className="search-bar">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search configurations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filters-row">
          <div className="filter-group">
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value={CATEGORY_FILTERS.ALL}>All Categories</option>
              <option value={CATEGORY_FILTERS.WRITING}>Writing</option>
              <option value={CATEGORY_FILTERS.ANALYSIS}>Analysis</option>
              <option value={CATEGORY_FILTERS.RESEARCH}>Research</option>
              <option value={CATEGORY_FILTERS.CREATIVE}>Creative</option>
              <option value={CATEGORY_FILTERS.ACADEMIC}>Academic</option>
              <option value={CATEGORY_FILTERS.BUSINESS}>Business</option>
              <option value={CATEGORY_FILTERS.TECHNICAL}>Technical</option>
            </select>
          </div>

          <div className="filter-group">
            <select 
              value={selectedSort} 
              onChange={(e) => setSelectedSort(e.target.value)}
            >
              <option value={SORT_OPTIONS.NEWEST}>Newest First</option>
              <option value={SORT_OPTIONS.OLDEST}>Oldest First</option>
              <option value={SORT_OPTIONS.HIGHEST_RATED}>Highest Rated</option>
              <option value={SORT_OPTIONS.MOST_RATED}>Most Reviews</option>
              <option value={SORT_OPTIONS.MOST_DOWNLOADED}>Most Downloaded</option>
              <option value={SORT_OPTIONS.TRENDING}>Trending</option>
            </select>
          </div>

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="filter-toggle"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <div className="view-toggle">
            <button 
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'active' : ''}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'active' : ''}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="advanced-filters">
            <div className="filter-section">
              <label>Minimum Rating:</label>
              <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
                <option value={0}>Any Rating</option>
                <option value={1}>1+ Stars</option>
                <option value={2}>2+ Stars</option>
                <option value={3}>3+ Stars</option>
                <option value={4}>4+ Stars</option>
                <option value={5}>5 Stars Only</option>
              </select>
            </div>

            <div className="filter-section">
              <label>Tags:</label>
              <div className="tag-filters">
                {['academic', 'creative', 'business', 'research', 'citations', 'narrative', 'professional'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagFilter(tag)}
                    className={`tag-filter ${selectedTags.includes(tag) ? 'active' : ''}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={clearFilters} className="clear-filters">
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      <div className="marketplace-body">
        {/* Trending Sidebar */}
        {trendingConfigs.length > 0 && (
          <div className="trending-sidebar">
            <h3>🔥 Trending This Week</h3>
            <div className="trending-list">
              {trendingConfigs.map(config => (
                <div key={config.id} className="trending-item" onClick={() => handleConfigClick(config)}>
                  <div className="trending-content">
                    <h4>{config.exportMetadata?.name || 'Unnamed'}</h4>
                    <div className="trending-meta">
                      {renderVoteStats(config.communityMetadata.rating)}
                      <span className="downloads">
                        <Download className="w-3 h-3" />
                        {config.communityMetadata.downloadCount}
                      </span>
                    </div>
                  </div>
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
      <div className="marketplace-content">
        <div className="content-header">
          <h2>
            All Configurations 
            <span className="count">({pagination.total || 0})</span>
          </h2>
          {selectedTags.length > 0 && (
            <div className="active-tags">
              {selectedTags.map(tag => (
                <span key={tag} className="active-tag">
                  {tag}
                  <button onClick={() => handleTagFilter(tag)}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading configurations...</p>
          </div>
        ) : configurations.length === 0 ? (
          <div className="empty-state">
            <p>No configurations found matching your criteria.</p>
            <button onClick={clearFilters}>Clear Filters</button>
          </div>
        ) : (
          <div className={`configurations-${viewMode}`}>
            {configurations.map(config => (
              <ConfigurationCard
                key={config.id}
                config={config}
                viewMode={viewMode}
                onView={() => handleConfigClick(config)}
                onDownload={() => handleDownload(config.id)}
                onRate={() => handleRate(config)}
                renderVoteStats={renderVoteStats}
              />
            ))}
          </div>
        )}

        {/* Load More */}
        {pagination.hasMore && (
          <div className="load-more">
            <button onClick={() => {
              // In a real app, this would load the next page
              console.log('Load more...');
            }}>
              Load More Configurations
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Modals */}
      {showConfigModal && selectedConfig && (
        <ConfigurationModal
          config={selectedConfig}
          onClose={() => setShowConfigModal(false)}
          onDownload={() => handleDownload(selectedConfig.id)}
          onRate={() => handleRate(selectedConfig)}
          renderVoteStats={renderVoteStats}
        />
      )}

      {showRatingModal && selectedConfig && (
        <RatingModal
          config={selectedConfig}
          onClose={() => setShowRatingModal(false)}
          onSubmit={handleRatingSubmit}
        />
      )}

      {showPublishModal && (
        <PublishModal
          system={system}
          onClose={() => setShowPublishModal(false)}
          onPublish={handlePublish}
        />
      )}
    </div>
  );
};

export default CommunityMarketplace;