/**
 * Multi-Agent System Tests
 * Comprehensive test suite for the new multi-agent architecture
 */

import { 
  createMultiAgentSystem,
  quickAnalyze,
  thoroughAnalyze,
  checkSystemHealth,
  AGENT_IDS
} from '../index';

// Mock the AI service to avoid real API calls during testing
jest.mock('../aiService', () => ({
  callAPI: jest.fn(() => Promise.resolve('{"insights": [], "confidence": 0.8}')),
  callAPIStream: jest.fn((prompt, callback) => {
    // Simulate streaming response
    setTimeout(() => {
      callback('chunk', [{"type": "test", "confidence": 0.8}], 'full response');
    }, 100);
    return Promise.resolve('full response');
  })
}));

describe('Multi-Agent System', () => {
  let system;

  beforeEach(async () => {
    system = await createMultiAgentSystem();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('System Initialization', () => {
    test('should initialize successfully', async () => {
      expect(system.initialized).toBe(true);
      expect(system.orchestrator.agents.size).toBeGreaterThan(0);
    });

    test('should register all expected agents', async () => {
      const expectedAgents = [
        AGENT_IDS.LOGICAL_FALLACY,
        AGENT_IDS.CLARITY_STYLE,
        AGENT_IDS.QUICK_FACT_CHECK,
        AGENT_IDS.EVIDENCE_QUALITY,
        AGENT_IDS.CONTEXTUAL_RESEARCH,
        AGENT_IDS.DEEP_FACT_VERIFICATION
      ];

      for (const agentId of expectedAgents) {
        expect(system.orchestrator.agents.has(agentId)).toBe(true);
      }
    });

    test('should load user preferences', async () => {
      expect(system.userPreferences).toBeDefined();
      expect(typeof system.userPreferences.thoroughness).toBe('number');
      expect(typeof system.userPreferences.speedPriority).toBe('number');
    });
  });

  describe('Content Analysis', () => {
    const testContent = `
      Climate change is a serious global issue. Studies show that 97% of scientists agree 
      that human activities are the primary cause. However, some people argue that natural 
      climate variations are responsible. This is a complex topic that requires careful 
      consideration of all evidence.
    `;

    test('should perform basic content analysis', async () => {
      const result = await system.analyzeContent(testContent, {
        urgency: 'normal',
        budget: 'standard'
      });

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.stage).toBe('fast_complete');
    });

    test('should handle real-time urgency', async () => {
      const result = await system.analyzeContent(testContent, {
        urgency: 'realtime',
        budget: 'minimal'
      });

      expect(result).toBeDefined();
      expect(result.enhancementsInProgress).toBe(true);
    });

    test('should provide progressive enhancement', async () => {
      let fastCompleted = false;
      let enhancementReceived = false;

      await system.analyzeContent(testContent, {
        onFastComplete: (data) => {
          fastCompleted = true;
          expect(data.stage).toBe('fast_complete');
        },
        onEnhancementAvailable: (data) => {
          enhancementReceived = true;
          expect(data.stage).toBe('enhanced');
        }
      });

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(fastCompleted).toBe(true);
    });
  });

  describe('Dynamic Confidence Thresholds', () => {
    test('should calculate appropriate thresholds for different contexts', () => {
      const realtimeThresholds = system.calculateDynamicThresholds({
        urgency: 'realtime',
        thoroughness: 0.5,
        taskComplexity: 'low',
        costSensitivity: 0.5
      });

      const thoroughThresholds = system.calculateDynamicThresholds({
        urgency: 'low',
        thoroughness: 0.9,
        taskComplexity: 'high',
        costSensitivity: 0.2
      });

      // Realtime should have lower thresholds for speed
      expect(realtimeThresholds.escalationThreshold)
        .toBeLessThan(thoroughThresholds.escalationThreshold);
    });

    test('should update agent thresholds correctly', () => {
      const thresholds = system.calculateDynamicThresholds({
        urgency: 'high',
        thoroughness: 0.8,
        taskComplexity: 'medium',
        costSensitivity: 0.3
      });

      system.updateAgentThresholds(thresholds);

      // Check that agents have updated thresholds
      for (const [agentId, agent] of system.orchestrator.agents) {
        expect(agent.escalationThreshold).toBe(thresholds.escalationThreshold);
      }
    });
  });

  describe('User Preference Learning', () => {
    test('should learn from analysis results', () => {
      const initialThoroughness = system.userPreferences.thoroughness;

      const mockResults = {
        insights: [
          { agent: 'test_agent', confidence: 0.9, type: 'test' },
          { agent: 'test_agent_2', confidence: 0.8, type: 'test2' }
        ],
        confidence: 0.85
      };

      system.learnFromResults(mockResults, 'fast_phase');

      expect(system.userPreferences.feedbackHistory.length).toBeGreaterThan(0);
      expect(system.userPreferences.preferredAgentTypes.size).toBeGreaterThan(0);
    });

    test('should process explicit user feedback', () => {
      const feedback = {
        rating: 4,
        speed_satisfaction: 3,
        thoroughness_satisfaction: 5,
        preferred_agents: ['logical_fallacy_detector'],
        helpful_insights: ['test_insight']
      };

      const initialThoroughness = system.userPreferences.thoroughness;
      system.processUserFeedback(feedback);

      // Should increase thoroughness based on higher satisfaction
      expect(system.userPreferences.thoroughness).toBeGreaterThanOrEqual(initialThoroughness);
    });

    test('should save and load preferences', async () => {
      // Modify preferences
      system.userPreferences.thoroughness = 0.9;
      system.userPreferences.speedPriority = 0.3;

      await system.saveUserPreferences();

      // Create new system and check if preferences loaded
      const newSystem = await createMultiAgentSystem();
      expect(newSystem.userPreferences.thoroughness).toBe(0.9);
      expect(newSystem.userPreferences.speedPriority).toBe(0.3);
    });
  });

  describe('Performance Monitoring', () => {
    test('should provide comprehensive system metrics', () => {
      const metrics = system.getSystemMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.orchestrator).toBeDefined();
      expect(metrics.multiAgentSystem).toBeDefined();
      expect(metrics.multiAgentSystem.totalAgents).toBeGreaterThan(0);
      expect(metrics.multiAgentSystem.userPreferences).toBeDefined();
    });

    test('should track agent performance', async () => {
      // Simulate some analysis to generate metrics
      await system.analyzeContent('Test content for metrics');

      const metrics = system.getSystemMetrics();
      expect(metrics.orchestrator.totalTasks).toBeGreaterThan(0);
    });
  });

  describe('Task Complexity Estimation', () => {
    test('should correctly estimate simple content complexity', () => {
      const simpleContent = 'This is a simple sentence.';
      const complexity = system.estimateTaskComplexity(simpleContent);
      expect(complexity).toBe('low');
    });

    test('should correctly estimate complex content complexity', () => {
      const complexContent = `
        According to recent peer-reviewed research published in Nature, 
        the multifaceted implications of climate change extend beyond 
        simple temperature variations. Furthermore, the interdisciplinary 
        consensus suggests that anthropogenic factors significantly 
        outweigh natural variability in contemporary climate patterns. 
        Nevertheless, the complexity of earth systems necessitates 
        comprehensive modeling approaches that integrate atmospheric, 
        oceanic, and terrestrial components.
      `;
      const complexity = system.estimateTaskComplexity(complexContent);
      expect(complexity).toBe('high');
    });
  });

  describe('Error Handling', () => {
    test('should handle agent failures gracefully', async () => {
      // Mock an agent to fail
      const mockAgent = system.orchestrator.agents.get(AGENT_IDS.LOGICAL_FALLACY);
      const originalAnalyze = mockAgent.analyze;
      mockAgent.analyze = jest.fn().mockRejectedValue(new Error('Test error'));

      const result = await system.analyzeContent('Test content');
      
      // Should still return results from other agents
      expect(result).toBeDefined();

      // Restore original method
      mockAgent.analyze = originalAnalyze;
    });

    test('should handle invalid content gracefully', async () => {
      const result = await system.analyzeContent('');
      expect(result).toBeDefined();
      // Should handle empty content without crashing
    });
  });

  describe('Integration Tests', () => {
    test('should work with quick analysis function', async () => {
      const result = await quickAnalyze('Test content for quick analysis');
      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });

    test('should work with thorough analysis function', async () => {
      const result = await thoroughAnalyze('Test content for thorough analysis');
      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });

    test('should pass system health check', async () => {
      const health = await checkSystemHealth();
      expect(health.status).toBe('healthy');
      expect(health.agentCount).toBeGreaterThan(0);
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain compatibility with legacy agent interfaces', () => {
      // Test that legacy imports still work
      const { intellectualCriticAnalyze, stylisticCriticAnalyze } = require('../index');
      
      expect(typeof intellectualCriticAnalyze).toBe('function');
      expect(typeof stylisticCriticAnalyze).toBe('function');
    });
  });

  describe('Progressive Enhancement', () => {
    test('should provide streaming updates', async () => {
      let progressUpdates = 0;
      
      await system.analyzeContent('Test streaming content', {
        onProgress: (progress) => {
          progressUpdates++;
          expect(progress.analysisId).toBeDefined();
          expect(progress.systemContext).toBeDefined();
        }
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(progressUpdates).toBeGreaterThan(0);
    });

    test('should handle concurrent analyses', async () => {
      const promises = [
        system.analyzeContent('Content 1'),
        system.analyzeContent('Content 2'),
        system.analyzeContent('Content 3')
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.results).toBeDefined();
      });
    });
  });
});

describe('Individual Agent Tests', () => {
  describe('Logical Fallacy Detector', () => {
    test('should detect ad hominem fallacies', async () => {
      const { LogicalFallacyDetector } = require('../index');
      const detector = new LogicalFallacyDetector();
      
      const content = 'You are wrong because you are not an expert in this field.';
      const result = await detector.analyze(content);
      
      expect(result.insights).toBeDefined();
      // Should detect potential ad hominem
    });
  });

  describe('Clarity Style Agent', () => {
    test('should detect passive voice', async () => {
      const { ClarityStyleAgent } = require('../index');
      const agent = new ClarityStyleAgent();
      
      const content = 'The report was written by the committee and mistakes were made.';
      const result = await agent.analyze(content);
      
      expect(result.insights).toBeDefined();
      expect(result.readabilityScore).toBeDefined();
    });
  });

  describe('Quick Fact Checker', () => {
    test('should flag unsourced statistics', async () => {
      const { QuickFactChecker } = require('../index');
      const checker = new QuickFactChecker();
      
      const content = '85% of people agree that this statement needs a source.';
      const result = await checker.analyze(content);
      
      expect(result.insights).toBeDefined();
      expect(result.reliabilityScore).toBeDefined();
    });
  });
});

// Performance benchmark tests
describe('Performance Tests', () => {
  test('fast agents should complete within time limits', async () => {
    const startTime = Date.now();
    
    await quickAnalyze('Performance test content');
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });

  test('should handle large content efficiently', async () => {
    const largeContent = 'This is a test sentence. '.repeat(1000);
    
    const startTime = Date.now();
    const result = await quickAnalyze(largeContent);
    const duration = Date.now() - startTime;
    
    expect(result).toBeDefined();
    expect(duration).toBeLessThan(10000); // Should handle large content within 10 seconds
  });
});

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;