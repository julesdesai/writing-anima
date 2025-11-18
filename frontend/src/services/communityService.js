/**
 * Community Service - Firebase Firestore integration for shared agent community
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  increment,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

class CommunityService {
  constructor() {
    this.collectionName = 'communityAgents';
  }

  /**
   * Upload a single agent to the community
   */
  async uploadAgent(agentData, currentUser) {
    if (!currentUser) {
      throw new Error('User must be authenticated to upload agents');
    }

    try {
      const communityAgent = {
        displayName: agentData.name,
        originalName: agentData.name,
        description: agentData.description || 'No description provided',
        category: agentData.category || 'custom',
        icon: agentData.icon || '🤖',
        prompt: agentData.prompt,
        defaultTier: agentData.defaultTier || 'fast',
        capabilities: agentData.capabilities || [],
        responseFormat: agentData.responseFormat || 'general_analysis',
        uploadedBy: currentUser.displayName || currentUser.email || 'Anonymous',
        uploadedById: currentUser.uid,
        uploadedAt: serverTimestamp(),
        downloadCount: 0,
        upvotes: 0,
        downvotes: 0,
        userVotes: {}, // Map of userId -> 'up'|'down'
        isBulkUpload: false,
        bulkUploadName: null,
        isActive: true // For moderation
      };

      const docRef = await addDoc(collection(db, this.collectionName), communityAgent);
      console.log('Agent uploaded with ID:', docRef.id);
      
      return {
        id: docRef.id,
        ...communityAgent,
        uploadedAt: new Date() // For immediate display
      };
    } catch (error) {
      console.error('Error uploading agent:', error);
      throw error;
    }
  }

  /**
   * Upload multiple agents from a bulk export
   */
  async uploadAgentSystem(bulkData, displayName, currentUser) {
    if (!currentUser) {
      throw new Error('User must be authenticated to upload agents');
    }

    if (!bulkData.agents || !Array.isArray(bulkData.agents)) {
      throw new Error('Invalid bulk data format');
    }

    try {
      const uploadedAgents = [];
      
      for (const agentData of bulkData.agents) {
        const communityAgent = {
          displayName: agentData.name,
          originalName: agentData.name,
          description: agentData.description || 'No description provided',
          category: agentData.category || 'custom',
          icon: agentData.icon || '🤖',
          prompt: agentData.prompt,
          defaultTier: agentData.defaultTier || 'fast',
          capabilities: agentData.capabilities || [],
          responseFormat: agentData.responseFormat || 'general_analysis',
          uploadedBy: currentUser.displayName || currentUser.email || 'Anonymous',
          uploadedById: currentUser.uid,
          uploadedAt: serverTimestamp(),
          downloadCount: 0,
          upvotes: 0,
          downvotes: 0,
          userVotes: {}, // Map of userId -> 'up'|'down'
          isBulkUpload: true,
          bulkUploadName: displayName,
          isActive: true // For moderation
        };

        const docRef = await addDoc(collection(db, this.collectionName), communityAgent);
        uploadedAgents.push({
          id: docRef.id,
          ...communityAgent,
          uploadedAt: new Date() // For immediate display
        });
      }

      console.log(`Uploaded ${uploadedAgents.length} agents from system:`, displayName);
      return uploadedAgents;
    } catch (error) {
      console.error('Error uploading agent system:', error);
      throw error;
    }
  }

  /**
   * Get all community agents
   */
  async getCommunityAgents() {
    try {
      console.log('Loading community agents from Firestore...');
      
      // Try with simpler query first to debug
      let q;
      try {
        q = query(
          collection(db, this.collectionName),
          where('isActive', '==', true),
          orderBy('uploadedAt', 'desc')
        );
      } catch (indexError) {
        console.warn('Index not available, using simpler query:', indexError);
        // Fallback to simpler query without ordering if index doesn't exist
        q = query(
          collection(db, this.collectionName),
          where('isActive', '==', true)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const agents = [];
      
      console.log(`Firestore returned ${querySnapshot.size} documents`);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Agent document:', doc.id, data);
        agents.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamp to Date
          uploadedAt: data.uploadedAt?.toDate() || new Date()
        });
      });

      console.log(`Loaded ${agents.length} community agents`);
      return agents;
    } catch (error) {
      console.error('Error loading community agents:', error);
      
      // Try loading all documents without filters as fallback
      try {
        console.log('Attempting fallback query without filters...');
        const fallbackQuery = collection(db, this.collectionName);
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackAgents = [];
        
        console.log(`Fallback query returned ${fallbackSnapshot.size} documents`);
        
        fallbackSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('Fallback agent:', doc.id, data);
          fallbackAgents.push({
            id: doc.id,
            ...data,
            uploadedAt: data.uploadedAt?.toDate() || new Date()
          });
        });
        
        console.log(`Fallback loaded ${fallbackAgents.length} community agents`);
        return fallbackAgents;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        throw error;
      }
    }
  }

  /**
   * Increment download count for an agent
   */
  async incrementDownloadCount(agentId) {
    try {
      const agentRef = doc(db, this.collectionName, agentId);
      await updateDoc(agentRef, {
        downloadCount: increment(1)
      });
      console.log('Download count incremented for agent:', agentId);
    } catch (error) {
      console.error('Error incrementing download count:', error);
      throw error;
    }
  }

  /**
   * Get agents by a specific user
   */
  async getAgentsByUser(userId) {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('uploadedById', '==', userId),
        where('isActive', '==', true),
        orderBy('uploadedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const agents = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        agents.push({
          id: doc.id,
          ...data,
          uploadedAt: data.uploadedAt?.toDate() || new Date()
        });
      });

      return agents;
    } catch (error) {
      console.error('Error loading user agents:', error);
      throw error;
    }
  }

  /**
   * Search agents by query
   */
  async searchAgents(searchQuery) {
    // Note: Firestore doesn't support full-text search natively
    // For production, consider using Algolia or similar service
    // For now, we'll load all agents and filter client-side
    try {
      const agents = await this.getCommunityAgents();
      
      if (!searchQuery) return agents;
      
      const lowerQuery = searchQuery.toLowerCase();
      return agents.filter(agent => 
        agent.displayName.toLowerCase().includes(lowerQuery) ||
        agent.description.toLowerCase().includes(lowerQuery) ||
        agent.uploadedBy.toLowerCase().includes(lowerQuery) ||
        agent.category.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error searching agents:', error);
      throw error;
    }
  }

  /**
   * Delete a community agent (only by uploader)
   */
  async deleteAgent(agentId, currentUser) {
    if (!currentUser) {
      throw new Error('User must be authenticated to delete agents');
    }

    try {
      const agentRef = doc(db, this.collectionName, agentId);
      await deleteDoc(agentRef);
      console.log('Agent deleted:', agentId);
      return true;
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw error;
    }
  }

  /**
   * Delete an entire agent system (all agents from a bulk upload)
   */
  async deleteAgentSystem(systemAgents, currentUser) {
    if (!currentUser) {
      throw new Error('User must be authenticated to delete agent systems');
    }

    try {
      const deletePromises = systemAgents.map(agent => {
        const agentRef = doc(db, this.collectionName, agent.id);
        return deleteDoc(agentRef);
      });

      await Promise.all(deletePromises);
      console.log(`Deleted ${systemAgents.length} agents from system`);
      return systemAgents.length;
    } catch (error) {
      console.error('Error deleting agent system:', error);
      throw error;
    }
  }

  /**
   * Vote on an agent or system
   */
  async voteOnAgent(agentId, voteType, currentUser) {
    if (!currentUser) {
      throw new Error('User must be authenticated to vote');
    }

    if (!['up', 'down'].includes(voteType)) {
      throw new Error('Vote type must be "up" or "down"');
    }

    try {
      const agentRef = doc(db, this.collectionName, agentId);
      const agentDoc = await getDoc(agentRef);
      
      if (!agentDoc.exists()) {
        throw new Error('Agent not found');
      }

      const agentData = agentDoc.data();
      const userVotes = agentData.userVotes || {};
      const currentVote = userVotes[currentUser.uid];

      let upvoteDelta = 0;
      let downvoteDelta = 0;

      if (currentVote === voteType) {
        // Remove existing vote
        delete userVotes[currentUser.uid];
        if (voteType === 'up') upvoteDelta = -1;
        else downvoteDelta = -1;
      } else {
        // Add or change vote
        if (currentVote === 'up') upvoteDelta = -1;
        if (currentVote === 'down') downvoteDelta = -1;
        
        userVotes[currentUser.uid] = voteType;
        if (voteType === 'up') upvoteDelta += 1;
        else downvoteDelta += 1;
      }

      await updateDoc(agentRef, {
        upvotes: increment(upvoteDelta),
        downvotes: increment(downvoteDelta),
        userVotes: userVotes
      });

      console.log(`Vote updated for agent ${agentId}: ${voteType}`);
      return {
        upvotes: (agentData.upvotes || 0) + upvoteDelta,
        downvotes: (agentData.downvotes || 0) + downvoteDelta,
        userVote: userVotes[currentUser.uid] || null
      };
    } catch (error) {
      console.error('Error voting on agent:', error);
      throw error;
    }
  }

  /**
   * Get community statistics
   */
  async getCommunityStats() {
    try {
      const agents = await this.getCommunityAgents();
      const totalDownloads = agents.reduce((sum, agent) => sum + (agent.downloadCount || 0), 0);
      const totalUpvotes = agents.reduce((sum, agent) => sum + (agent.upvotes || 0), 0);
      const uniqueUploaders = new Set(agents.map(agent => agent.uploadedById)).size;
      const systems = agents.filter(agent => agent.isBulkUpload);
      const uniqueSystems = new Set(systems.map(agent => agent.bulkUploadName)).size;

      return {
        totalAgents: agents.length,
        totalDownloads,
        totalUpvotes,
        uniqueUploaders,
        totalSystems: uniqueSystems,
        recentUploads: agents.slice(0, 5)
      };
    } catch (error) {
      console.error('Error getting community stats:', error);
      throw error;
    }
  }
}

export default new CommunityService();