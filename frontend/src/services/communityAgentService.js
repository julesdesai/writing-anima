/**
 * Community Agent Configuration Service
 * Manages public agent configurations, ratings, and community features
 * Simulates a backend database with localStorage for demonstration
 */

import multiagentSharingService from './multiagentSharingService';

export const VISIBILITY_LEVELS = {
  PRIVATE: 'private',
  UNLISTED: 'unlisted', // Can be accessed via direct link but not listed
  PUBLIC: 'public'      // Listed in community marketplace
};

export const SORT_OPTIONS = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  MOST_RATED: 'most_rated',
  HIGHEST_RATED: 'highest_rated',
  MOST_DOWNLOADED: 'most_downloaded',
  TRENDING: 'trending'
};

export const CATEGORY_FILTERS = {
  ALL: 'all',
  WRITING: 'writing',
  ANALYSIS: 'analysis',
  RESEARCH: 'research',
  CREATIVE: 'creative',
  ACADEMIC: 'academic',
  BUSINESS: 'business',
  TECHNICAL: 'technical',
  CUSTOM: 'custom'
};

class CommunityAgentService {
  constructor() {
    this.publicConfigurations = this.loadPublicConfigurations();
    this.ratings = this.loadRatings();
    this.reviews = this.loadReviews();
    this.userProfiles = this.loadUserProfiles();
    this.downloadStats = this.loadDownloadStats();
    
    // Simulate current user (in real app, this would come from auth service)
    this.currentUser = this.getCurrentUser();
    
    // Initialize with some demo data if empty
    if (Object.keys(this.publicConfigurations).length === 0) {
      this.initializeDemoData();
    }
  }

  /**
   * Publish a configuration to the community
   */
  async publishConfiguration(config, metadata = {}) {
    const {
      visibility = VISIBILITY_LEVELS.PUBLIC,
      category = CATEGORY_FILTERS.CUSTOM,
      tags = [],
      description = '',
      version = '1.0.0'
    } = metadata;

    const configId = `public_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const publicConfig = {
      id: configId,
      ...config,
      communityMetadata: {
        visibility,
        category,
        tags: tags.filter(tag => tag.trim().length > 0),
        description: description.trim(),
        version,
        authorId: this.currentUser.id,
        authorName: this.currentUser.name,
        authorAvatar: this.currentUser.avatar,
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        downloadCount: 0,
        rating: {
          average: 0,
          count: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        },
        featured: false,
        verified: false // Could be set by moderators
      }
    };

    this.publicConfigurations[configId] = publicConfig;
    this.savePublicConfigurations();

    // Track user's published configs
    if (!this.userProfiles[this.currentUser.id]) {
      this.userProfiles[this.currentUser.id] = {
        ...this.currentUser,
        publishedConfigs: [],
        totalDownloads: 0,
        averageRating: 0
      };
    }
    
    this.userProfiles[this.currentUser.id].publishedConfigs.push(configId);
    this.saveUserProfiles();

    return { success: true, configId, config: publicConfig };
  }

  /**
   * Get public configurations with filtering and sorting
   */
  getPublicConfigurations(options = {}) {
    const {
      category = CATEGORY_FILTERS.ALL,
      sortBy = SORT_OPTIONS.NEWEST,
      searchQuery = '',
      tags = [],
      authorId = null,
      limit = 20,
      offset = 0,
      minRating = 0,
      includeUnlisted = false
    } = options;

    let configs = Object.values(this.publicConfigurations)
      .filter(config => {
        // Visibility filter
        if (!includeUnlisted && config.communityMetadata.visibility !== VISIBILITY_LEVELS.PUBLIC) {
          return false;
        }
        
        // Category filter
        if (category !== CATEGORY_FILTERS.ALL && 
            config.communityMetadata.category !== category) {
          return false;
        }
        
        // Author filter
        if (authorId && config.communityMetadata.authorId !== authorId) {
          return false;
        }
        
        // Rating filter
        if (config.communityMetadata.rating.average < minRating) {
          return false;
        }
        
        // Search query filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchesName = config.exportMetadata?.name?.toLowerCase().includes(query);
          const matchesDescription = config.communityMetadata.description.toLowerCase().includes(query);
          const matchesTags = config.communityMetadata.tags.some(tag => 
            tag.toLowerCase().includes(query)
          );
          const matchesAuthor = config.communityMetadata.authorName.toLowerCase().includes(query);
          
          if (!matchesName && !matchesDescription && !matchesTags && !matchesAuthor) {
            return false;
          }
        }
        
        // Tags filter
        if (tags.length > 0) {
          const configTags = config.communityMetadata.tags.map(tag => tag.toLowerCase());
          const hasMatchingTag = tags.some(tag => 
            configTags.includes(tag.toLowerCase())
          );
          if (!hasMatchingTag) {
            return false;
          }
        }
        
        return true;
      });

    // Sort configurations
    configs.sort((a, b) => {
      switch (sortBy) {
        case SORT_OPTIONS.NEWEST:
          return new Date(b.communityMetadata.publishedAt) - new Date(a.communityMetadata.publishedAt);
        case SORT_OPTIONS.OLDEST:
          return new Date(a.communityMetadata.publishedAt) - new Date(b.communityMetadata.publishedAt);
        case SORT_OPTIONS.MOST_RATED:
          return b.communityMetadata.rating.count - a.communityMetadata.rating.count;
        case SORT_OPTIONS.HIGHEST_RATED:
          if (b.communityMetadata.rating.average !== a.communityMetadata.rating.average) {
            return b.communityMetadata.rating.average - a.communityMetadata.rating.average;
          }
          return b.communityMetadata.rating.count - a.communityMetadata.rating.count;
        case SORT_OPTIONS.MOST_DOWNLOADED:
          return b.communityMetadata.downloadCount - a.communityMetadata.downloadCount;
        case SORT_OPTIONS.TRENDING:
          // Simple trending algorithm based on recent downloads and ratings
          const now = new Date();
          const aScore = this.calculateTrendingScore(a, now);
          const bScore = this.calculateTrendingScore(b, now);
          return bScore - aScore;
        default:
          return 0;
      }
    });

    // Apply pagination
    const total = configs.length;
    const paginatedConfigs = configs.slice(offset, offset + limit);

    return {
      configurations: paginatedConfigs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      filters: {
        category,
        sortBy,
        searchQuery,
        tags,
        authorId,
        minRating
      }
    };
  }

  /**
   * Get a specific public configuration by ID
   */
  getPublicConfiguration(configId) {
    const config = this.publicConfigurations[configId];
    if (!config) {
      throw new Error('Configuration not found');
    }

    // Increment view count (in real app, this might be rate-limited)
    this.incrementViewCount(configId);

    return {
      ...config,
      ratings: this.getRatingsForConfig(configId),
      reviews: this.getReviewsForConfig(configId),
      author: this.userProfiles[config.communityMetadata.authorId],
      relatedConfigs: this.getRelatedConfigurations(configId, 5)
    };
  }

  /**
   * Download/import a public configuration
   */
  async downloadConfiguration(configId) {
    const config = this.publicConfigurations[configId];
    if (!config) {
      throw new Error('Configuration not found');
    }

    // Increment download count
    config.communityMetadata.downloadCount++;
    this.savePublicConfigurations();

    // Track download stats
    if (!this.downloadStats[configId]) {
      this.downloadStats[configId] = {
        totalDownloads: 0,
        uniqueUsers: new Set(),
        downloadHistory: []
      };
    }

    this.downloadStats[configId].totalDownloads++;
    this.downloadStats[configId].uniqueUsers.add(this.currentUser.id);
    this.downloadStats[configId].downloadHistory.push({
      userId: this.currentUser.id,
      downloadedAt: new Date().toISOString(),
      userAgent: navigator.userAgent
    });

    this.saveDownloadStats();

    // Update author's total downloads
    if (this.userProfiles[config.communityMetadata.authorId]) {
      this.userProfiles[config.communityMetadata.authorId].totalDownloads++;
      this.saveUserProfiles();
    }

    return { success: true, config };
  }

  /**
   * Rate a configuration
   */
  async rateConfiguration(configId, rating, review = '') {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const config = this.publicConfigurations[configId];
    if (!config) {
      throw new Error('Configuration not found');
    }

    // Can't rate your own configuration
    if (config.communityMetadata.authorId === this.currentUser.id) {
      throw new Error('Cannot rate your own configuration');
    }

    const ratingId = `${configId}_${this.currentUser.id}`;
    const existingRating = this.ratings[ratingId];

    const ratingData = {
      id: ratingId,
      configId,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userAvatar: this.currentUser.avatar,
      rating,
      review: review.trim(),
      createdAt: existingRating?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      helpful: existingRating?.helpful || 0,
      reported: existingRating?.reported || false
    };

    // Update ratings
    this.ratings[ratingId] = ratingData;

    // Recalculate configuration rating
    this.recalculateConfigRating(configId);

    this.saveRatings();
    this.savePublicConfigurations();

    // Update author's average rating
    this.updateAuthorRating(config.communityMetadata.authorId);

    return { success: true, rating: ratingData };
  }

  /**
   * Get ratings for a configuration
   */
  getRatingsForConfig(configId, limit = 10, offset = 0) {
    const configRatings = Object.values(this.ratings)
      .filter(rating => rating.configId === configId && !rating.reported)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(offset, offset + limit);

    return {
      ratings: configRatings,
      total: configRatings.length,
      userRating: this.ratings[`${configId}_${this.currentUser.id}`] || null
    };
  }

  /**
   * Get reviews for a configuration
   */
  getReviewsForConfig(configId, limit = 5, offset = 0) {
    const reviews = Object.values(this.ratings)
      .filter(rating => rating.configId === configId && rating.review.length > 0 && !rating.reported)
      .sort((a, b) => b.helpful - a.helpful || new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(offset, offset + limit);

    return {
      reviews,
      total: reviews.length
    };
  }

  /**
   * Mark a review as helpful
   */
  markReviewHelpful(ratingId) {
    if (this.ratings[ratingId]) {
      this.ratings[ratingId].helpful++;
      this.saveRatings();
      return { success: true };
    }
    return { success: false };
  }

  /**
   * Report a configuration or review
   */
  reportContent(type, id, reason = '') {
    // In real app, this would notify moderators
    console.log(`Reported ${type} ${id}: ${reason}`);
    return { success: true };
  }

  /**
   * Get trending configurations
   */
  getTrendingConfigurations(limit = 10) {
    return this.getPublicConfigurations({
      sortBy: SORT_OPTIONS.TRENDING,
      limit
    });
  }

  /**
   * Get featured configurations
   */
  getFeaturedConfigurations(limit = 5) {
    const featured = Object.values(this.publicConfigurations)
      .filter(config => config.communityMetadata.featured)
      .sort((a, b) => b.communityMetadata.rating.average - a.communityMetadata.rating.average)
      .slice(0, limit);

    return { configurations: featured };
  }

  /**
   * Get user's published configurations
   */
  getUserConfigurations(userId = null) {
    const targetUserId = userId || this.currentUser.id;
    return Object.values(this.publicConfigurations)
      .filter(config => config.communityMetadata.authorId === targetUserId)
      .sort((a, b) => new Date(b.communityMetadata.updatedAt) - new Date(a.communityMetadata.updatedAt));
  }

  /**
   * Update a published configuration
   */
  async updateConfiguration(configId, updates = {}) {
    const config = this.publicConfigurations[configId];
    if (!config) {
      throw new Error('Configuration not found');
    }

    if (config.communityMetadata.authorId !== this.currentUser.id) {
      throw new Error('Cannot update configuration you did not create');
    }

    // Update allowed fields
    const { description, tags, category, visibility, version } = updates;
    
    if (description !== undefined) config.communityMetadata.description = description.trim();
    if (tags !== undefined) config.communityMetadata.tags = tags.filter(tag => tag.trim().length > 0);
    if (category !== undefined) config.communityMetadata.category = category;
    if (visibility !== undefined) config.communityMetadata.visibility = visibility;
    if (version !== undefined) config.communityMetadata.version = version;

    config.communityMetadata.updatedAt = new Date().toISOString();

    this.savePublicConfigurations();
    return { success: true, config };
  }

  /**
   * Delete a published configuration
   */
  async deleteConfiguration(configId) {
    const config = this.publicConfigurations[configId];
    if (!config) {
      throw new Error('Configuration not found');
    }

    if (config.communityMetadata.authorId !== this.currentUser.id) {
      throw new Error('Cannot delete configuration you did not create');
    }

    // Remove configuration
    delete this.publicConfigurations[configId];

    // Remove ratings
    Object.keys(this.ratings).forEach(ratingId => {
      if (this.ratings[ratingId].configId === configId) {
        delete this.ratings[ratingId];
      }
    });

    // Remove from user profile
    const userProfile = this.userProfiles[this.currentUser.id];
    if (userProfile) {
      userProfile.publishedConfigs = userProfile.publishedConfigs.filter(id => id !== configId);
    }

    this.savePublicConfigurations();
    this.saveRatings();
    this.saveUserProfiles();

    return { success: true };
  }

  /**
   * Get community statistics
   */
  getCommunityStats() {
    const configs = Object.values(this.publicConfigurations);
    const ratings = Object.values(this.ratings);
    const users = Object.values(this.userProfiles);

    const totalDownloads = configs.reduce((sum, config) => 
      sum + config.communityMetadata.downloadCount, 0
    );

    const categoryStats = configs.reduce((acc, config) => {
      const category = config.communityMetadata.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const topAuthors = users
      .filter(user => user.publishedConfigs?.length > 0)
      .sort((a, b) => b.totalDownloads - a.totalDownloads)
      .slice(0, 10);

    return {
      totalConfigurations: configs.length,
      totalRatings: ratings.length,
      totalDownloads,
      totalAuthors: users.filter(user => user.publishedConfigs?.length > 0).length,
      averageRating: ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
        : 0,
      categoryStats,
      topAuthors,
      recentActivity: {
        configurationsThisWeek: this.getRecentCount(configs, 7, 'publishedAt'),
        ratingsThisWeek: this.getRecentCount(ratings, 7, 'createdAt'),
        downloadsThisWeek: this.getRecentDownloads(7)
      }
    };
  }

  /**
   * Helper methods
   */
  calculateTrendingScore(config, now) {
    const publishedDate = new Date(config.communityMetadata.publishedAt);
    const daysOld = (now - publishedDate) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.max(0, 30 - daysOld) / 30; // Favor configs from last 30 days
    
    const downloadScore = config.communityMetadata.downloadCount * 2;
    const ratingScore = config.communityMetadata.rating.average * config.communityMetadata.rating.count;
    
    return (downloadScore + ratingScore) * (0.5 + recencyFactor * 0.5);
  }

  recalculateConfigRating(configId) {
    const configRatings = Object.values(this.ratings)
      .filter(rating => rating.configId === configId);

    const config = this.publicConfigurations[configId];
    if (!config || configRatings.length === 0) {
      return;
    }

    const total = configRatings.reduce((sum, rating) => sum + rating.rating, 0);
    const average = total / configRatings.length;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    configRatings.forEach(rating => {
      distribution[rating.rating]++;
    });

    config.communityMetadata.rating = {
      average: Math.round(average * 10) / 10,
      count: configRatings.length,
      distribution
    };
  }

  updateAuthorRating(authorId) {
    const authorConfigs = Object.values(this.publicConfigurations)
      .filter(config => config.communityMetadata.authorId === authorId);

    if (authorConfigs.length === 0) return;

    const totalRating = authorConfigs.reduce((sum, config) => 
      sum + (config.communityMetadata.rating.average * config.communityMetadata.rating.count), 0
    );
    const totalRatingCount = authorConfigs.reduce((sum, config) => 
      sum + config.communityMetadata.rating.count, 0
    );

    if (this.userProfiles[authorId] && totalRatingCount > 0) {
      this.userProfiles[authorId].averageRating = totalRating / totalRatingCount;
      this.saveUserProfiles();
    }
  }

  getRelatedConfigurations(configId, limit = 5) {
    const config = this.publicConfigurations[configId];
    if (!config) return [];

    const sameCategoryConfigs = Object.values(this.publicConfigurations)
      .filter(c => 
        c.id !== configId && 
        c.communityMetadata.category === config.communityMetadata.category
      )
      .sort((a, b) => b.communityMetadata.rating.average - a.communityMetadata.rating.average)
      .slice(0, limit);

    return sameCategoryConfigs;
  }

  getRecentCount(items, days, dateField) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return items.filter(item => 
      new Date(item.communityMetadata?.[dateField] || item[dateField]) > cutoff
    ).length;
  }

  getRecentDownloads(days) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return Object.values(this.downloadStats).reduce((total, stats) => {
      const recentDownloads = stats.downloadHistory.filter(download => 
        new Date(download.downloadedAt) > cutoff
      ).length;
      return total + recentDownloads;
    }, 0);
  }

  incrementViewCount(configId) {
    // Simple view tracking (in real app, might be more sophisticated)
    const views = JSON.parse(localStorage.getItem('configViews') || '{}');
    views[configId] = (views[configId] || 0) + 1;
    localStorage.setItem('configViews', JSON.stringify(views));
  }

  getCurrentUser() {
    // Simulate current user - in real app, this would come from auth service
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      return JSON.parse(saved);
    }

    // Generate a demo user
    const demoUser = {
      id: `user_${Math.random().toString(36).substr(2, 9)}`,
      name: 'Demo User',
      avatar: '👤',
      joinedAt: new Date().toISOString()
    };

    localStorage.setItem('currentUser', JSON.stringify(demoUser));
    return demoUser;
  }

  // Storage methods
  loadPublicConfigurations() {
    try {
      const saved = localStorage.getItem('communityAgentConfigs');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.warn('Failed to load public configurations:', error);
      return {};
    }
  }

  savePublicConfigurations() {
    try {
      localStorage.setItem('communityAgentConfigs', JSON.stringify(this.publicConfigurations));
    } catch (error) {
      console.warn('Failed to save public configurations:', error);
    }
  }

  loadRatings() {
    try {
      const saved = localStorage.getItem('communityRatings');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.warn('Failed to load ratings:', error);
      return {};
    }
  }

  saveRatings() {
    try {
      localStorage.setItem('communityRatings', JSON.stringify(this.ratings));
    } catch (error) {
      console.warn('Failed to save ratings:', error);
    }
  }

  loadReviews() {
    try {
      const saved = localStorage.getItem('communityReviews');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.warn('Failed to load reviews:', error);
      return {};
    }
  }

  saveReviews() {
    try {
      localStorage.setItem('communityReviews', JSON.stringify(this.reviews));
    } catch (error) {
      console.warn('Failed to save reviews:', error);
    }
  }

  loadUserProfiles() {
    try {
      const saved = localStorage.getItem('communityUserProfiles');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.warn('Failed to load user profiles:', error);
      return {};
    }
  }

  saveUserProfiles() {
    try {
      localStorage.setItem('communityUserProfiles', JSON.stringify(this.userProfiles));
    } catch (error) {
      console.warn('Failed to save user profiles:', error);
    }
  }

  loadDownloadStats() {
    try {
      const saved = localStorage.getItem('communityDownloadStats');
      const parsed = saved ? JSON.parse(saved) : {};
      
      // Convert uniqueUsers arrays back to Sets
      Object.values(parsed).forEach(stats => {
        if (stats.uniqueUsers && Array.isArray(stats.uniqueUsers)) {
          stats.uniqueUsers = new Set(stats.uniqueUsers);
        }
      });
      
      return parsed;
    } catch (error) {
      console.warn('Failed to load download stats:', error);
      return {};
    }
  }

  saveDownloadStats() {
    try {
      // Convert Sets to arrays for JSON serialization
      const toSave = {};
      Object.entries(this.downloadStats).forEach(([key, stats]) => {
        toSave[key] = {
          ...stats,
          uniqueUsers: Array.from(stats.uniqueUsers)
        };
      });
      
      localStorage.setItem('communityDownloadStats', JSON.stringify(toSave));
    } catch (error) {
      console.warn('Failed to save download stats:', error);
    }
  }

  /**
   * Initialize with demo data for demonstration
   */
  initializeDemoData() {
    // Create some demo configurations
    const demoConfigs = [
      {
        exportMetadata: {
          name: "Academic Writing Assistant",
          description: "Specialized configuration for academic writing with enhanced citation checking and argument analysis.",
          exportedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          format: "full_system"
        },
        systemPreferences: {
          thoroughness: 0.9,
          costSensitivity: 0.3
        },
        agents: {
          dynamicAgents: [
            {
              name: "Citation Checker",
              description: "Verifies academic citations and formatting",
              specialization: "academic_citations"
            }
          ]
        }
      },
      {
        exportMetadata: {
          name: "Creative Writing Flow",
          description: "Perfect for creative writers focusing on narrative flow and character development.",
          exportedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          format: "full_system"
        },
        systemPreferences: {
          thoroughness: 0.7,
          speedPriority: 0.8
        }
      },
      {
        exportMetadata: {
          name: "Business Report Optimizer",
          description: "Streamlined configuration for professional business reports and presentations.",
          exportedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          format: "full_system"
        }
      }
    ];

    // Create demo authors
    const demoAuthors = [
      { id: 'author_1', name: 'Dr. Sarah Chen', avatar: '👩‍🎓' },
      { id: 'author_2', name: 'Marcus Rodriguez', avatar: '✍️' },
      { id: 'author_3', name: 'Emma Thompson', avatar: '💼' }
    ];

    // Publish demo configurations
    demoConfigs.forEach((config, index) => {
      const author = demoAuthors[index];
      this.currentUser = author; // Temporarily set current user
      
      this.publishConfiguration(config, {
        visibility: VISIBILITY_LEVELS.PUBLIC,
        category: index === 0 ? CATEGORY_FILTERS.ACADEMIC : 
                 index === 1 ? CATEGORY_FILTERS.CREATIVE : 
                 CATEGORY_FILTERS.BUSINESS,
        tags: index === 0 ? ['academic', 'citations', 'research'] :
              index === 1 ? ['creative', 'narrative', 'fiction'] :
              ['business', 'reports', 'professional'],
        description: config.exportMetadata.description
      });
    });

    // Reset current user
    this.currentUser = this.getCurrentUser();

    // Add some demo ratings
    const configIds = Object.keys(this.publicConfigurations);
    configIds.forEach((configId, index) => {
      // Add multiple ratings per config
      for (let i = 0; i < 3 + index; i++) {
        const tempUserId = `demo_user_${i}`;
        const tempUser = { 
          id: tempUserId, 
          name: `Demo User ${i + 1}`, 
          avatar: '👤' 
        };
        this.currentUser = tempUser;
        
        const rating = 3 + Math.floor(Math.random() * 3); // 3-5 stars
        const reviews = [
          "Great configuration! Very helpful for my workflow.",
          "Works well, could use some improvements.",
          "Exactly what I was looking for. Highly recommended!",
          "Good starting point, customized it for my needs.",
          "Solid configuration with excellent results."
        ];
        
        this.rateConfiguration(configId, rating, 
          Math.random() > 0.5 ? reviews[Math.floor(Math.random() * reviews.length)] : ''
        );
      }
    });

    // Reset to actual current user
    this.currentUser = this.getCurrentUser();
  }
}

const communityAgentService = new CommunityAgentService();
export default communityAgentService;