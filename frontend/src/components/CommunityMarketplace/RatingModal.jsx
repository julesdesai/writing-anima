/**
 * Rating Modal - Simple upvote/downvote system for agent configurations
 */

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, X } from 'lucide-react';

const RatingModal = ({ config, onClose, onSubmit }) => {
  const [vote, setVote] = useState(null); // 'up' or 'down'
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!vote) {
      alert('Please select thumbs up or thumbs down');
      return;
    }

    setSubmitting(true);
    try {
      // Convert vote to numeric rating (1 for downvote, 5 for upvote)
      const rating = vote === 'up' ? 5 : 1;
      await onSubmit(rating, review);
    } catch (error) {
      console.error('Rating submission failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const currentRating = config.communityMetadata.rating;
  const upvotePercentage = currentRating.count > 0 
    ? Math.round(((currentRating.distribution[5] || 0) / currentRating.count) * 100)
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rating-modal simple-rating" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Rate Configuration</h2>
          <button onClick={onClose} className="close-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          <div className="config-info">
            <h3>{config.exportMetadata?.name || 'Unnamed Configuration'}</h3>
            <p>by {config.communityMetadata.authorName}</p>
            
            <div className="current-rating">
              <div className="vote-stats">
                <div className="vote-stat upvotes">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{upvotePercentage}% positive</span>
                </div>
                <div className="vote-count">
                  ({currentRating.count} votes)
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rating-form">
            <div className="vote-section">
              <label>How would you rate this configuration?</label>
              <div className="vote-buttons">
                <button
                  type="button"
                  className={`vote-btn upvote ${vote === 'up' ? 'selected' : ''}`}
                  onClick={() => setVote('up')}
                >
                  <ThumbsUp className="w-6 h-6" />
                  <span>Thumbs Up</span>
                  <small>This configuration is helpful</small>
                </button>
                
                <button
                  type="button"
                  className={`vote-btn downvote ${vote === 'down' ? 'selected' : ''}`}
                  onClick={() => setVote('down')}
                >
                  <ThumbsDown className="w-6 h-6" />
                  <span>Thumbs Down</span>
                  <small>This configuration needs work</small>
                </button>
              </div>
            </div>

            <div className="review-section">
              <label htmlFor="review">
                Comment (optional):
                <span className="char-count">{review.length}/300</span>
              </label>
              <textarea
                id="review"
                value={review}
                onChange={(e) => setReview(e.target.value.slice(0, 300))}
                placeholder="Share what you liked or what could be improved..."
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="cancel-btn">
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-btn"
                disabled={!vote || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Vote'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;