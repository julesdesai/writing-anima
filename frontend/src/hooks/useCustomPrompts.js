/**
 * Hook for integrating custom prompts with agents
 */

import { useEffect, useState } from 'react';
import promptCustomizationService from '../services/promptCustomizationService';
import { useAuth } from '../contexts/AuthContext';

export const useCustomPrompts = () => {
  const [initialized, setInitialized] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    const initializePrompts = async () => {
      try {
        // Initialize default prompts
        await promptCustomizationService.initializeDefaultPrompts();
        
        // Sync with user profile if logged in
        if (auth?.currentUser && auth.getUserData && auth.updateUserData) {
          await promptCustomizationService.syncWithUserProfile(auth);
        }
        
        setInitialized(true);
      } catch (error) {
        console.warn('Failed to initialize custom prompts:', error);
        setInitialized(true); // Still set as initialized to avoid blocking
      }
    };

    initializePrompts();
  }, [auth?.currentUser]);

  /**
   * Get a customized prompt for an agent
   */
  const getCustomPrompt = (promptId, content, purpose, mode, additionalCriteria) => {
    if (!initialized) {
      return null; // Not ready yet
    }

    try {
      return promptCustomizationService.generatePrompt(
        promptId,
        content,
        purpose,
        mode,
        additionalCriteria
      );
    } catch (error) {
      console.warn(`Failed to get custom prompt for ${promptId}:`, error);
      return null;
    }
  };

  /**
   * Check if prompts are customized
   */
  const getCustomizationStatus = () => {
    if (!initialized) {
      return null;
    }

    try {
      return promptCustomizationService.getCustomizationStats();
    } catch (error) {
      console.warn('Failed to get customization status:', error);
      return null;
    }
  };

  return {
    initialized,
    getCustomPrompt,
    getCustomizationStatus,
    promptService: promptCustomizationService
  };
};

export default useCustomPrompts;