/**
 * Deep Fact Verification Agent - Research Agent
 * Uses gpt-4o with multi-source cross-referencing for comprehensive fact checking
 * Focuses on statistical validation, historical accuracy, and current data retrieval
 */

import { BaseAgent, MODEL_TIERS, CAPABILITIES } from './BaseAgent';

export class DeepFactVerificationAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Deep Fact Verification Agent',
      description: 'Performs comprehensive fact-checking with multi-source cross-referencing',
      defaultTier: MODEL_TIERS.STANDARD,
      requiredCapabilities: [CAPABILITIES.WEB_SEARCH, CAPABILITIES.FACT_CHECK, CAPABILITIES.EVIDENCE_RESEARCH],
      escalationThreshold: 0.8, // Very high threshold for fact accuracy
      maxRetries: 3,
      contextLimits: { maxTokens: 4000 }
    });
    
    this.verificationCategories = {
      statistical: {
        priority: 'high',
        sources: ['government', 'academic', 'international_orgs'],
        confidence_threshold: 0.9
      },
      historical: {
        priority: 'high', 
        sources: ['academic', 'museums', 'archives'],
        confidence_threshold: 0.85
      },
      scientific: {
        priority: 'high',
        sources: ['peer_reviewed', 'institutions', 'research_orgs'],
        confidence_threshold: 0.9
      },
      current_events: {
        priority: 'medium',
        sources: ['news', 'official_statements', 'verified_accounts'],
        confidence_threshold: 0.75
      }
    };
  }
  
  generatePrompt(context, modelConfig) {
    const { content, purpose } = context;
    
    return `You are a deep fact verification specialist. Perform comprehensive fact-checking by cross-referencing multiple authoritative sources.

TEXT TO ANALYZE:
${content}

PURPOSE: ${purpose || 'Deep fact verification'}

Verify claims across these categories:

1. STATISTICAL CLAIMS: Numbers, percentages, quantities, trends
   - Cross-reference official government data
   - Check academic research and peer-reviewed studies
   - Verify against international organization reports

2. HISTORICAL FACTS: Dates, events, timelines, historical figures
   - Cross-reference multiple historical sources
   - Check academic consensus
   - Verify against authoritative archives

3. SCIENTIFIC STATEMENTS: Research findings, natural phenomena, technical facts
   - Check peer-reviewed literature
   - Verify against scientific institutions
   - Cross-reference with expert consensus

4. CURRENT DATA: Recent events, current statistics, ongoing situations
   - Verify with multiple news sources
   - Check official statements/announcements
   - Cross-reference real-time data sources

For EACH claim requiring verification:

Respond with ONLY valid JSON:
[
  {
    "type": "deep_fact_verification",
    "claimCategory": "statistical|historical|scientific|current_events",
    "originalClaim": "Exact claim being verified",
    "verificationStatus": "verified|partially_verified|disputed|false|needs_more_sources",
    "confidence": 0.90,
    "title": "Verification of [claim topic]",
    "textSnippets": ["exact text containing the claim"],
    "verification_details": {
      "sources_checked": ["List of source types consulted"],
      "consensus_level": "strong|moderate|weak|conflicted",
      "accuracy_assessment": "accurate|mostly_accurate|misleading|false",
      "context_needed": "Additional context that affects accuracy"
    },
    "cross_reference_results": [
      {
        "source_type": "government|academic|news|expert",
        "finding": "What this source says about the claim",
        "agreement_level": "full|partial|none|contradicts",
        "credibility": "high|medium|low"
      }
    ],
    "fact_check_conclusion": "Detailed conclusion about the claim's accuracy",
    "correction": "Corrected information if claim is inaccurate",
    "suggestion": "How to improve accuracy of the claim",
    "requires_update": true/false
  }
]

Priority: Focus on claims that could significantly impact understanding or decision-making.
Standards: Apply rigorous verification standards - prefer authoritative sources over popular sources.`;
  }
  
  parseResult(result, context) {
    try {
      let cleanResponse = result.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      
      const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      const verifications = JSON.parse(cleanResponse);
      
      const processedVerifications = verifications.map(verification => ({
        ...verification,
        type: 'deep_fact_verification',
        agent: this.name,
        agentType: 'research',
        priority: this.calculateVerificationPriority(verification),
        accuracy_score: this.calculateAccuracyScore(verification),
        timestamp: new Date().toISOString(),
        processingTime: 'thorough'
      }));
      
      const overallAccuracy = this.calculateOverallAccuracy(processedVerifications);
      
      return {
        insights: processedVerifications,
        confidence: processedVerifications.length > 0 
          ? processedVerifications.reduce((sum, v) => sum + (v.confidence || 0.5), 0) / processedVerifications.length
          : 0.9,
        accuracy_score: overallAccuracy,
        summary: this.generateSummary(processedVerifications, overallAccuracy),
        researchDepth: 'comprehensive',
        verification_complete: true
      };
    } catch (error) {
      return {
        insights: [],
        confidence: 0.3,
        accuracy_score: 0.5,
        summary: 'Deep fact verification incomplete due to parsing issues',
        researchDepth: 'limited',
        verification_complete: false
      };
    }
  }
  
  calculateVerificationPriority(verification) {
    const category = this.verificationCategories[verification.claimCategory];
    const status = verification.verificationStatus;
    
    if (status === 'false' || status === 'disputed') {
      return 'critical';
    } else if (category?.priority === 'high' && verification.confidence < 0.8) {
      return 'high';
    } else if (status === 'needs_more_sources') {
      return 'medium';
    }
    
    return 'low';
  }
  
  calculateAccuracyScore(verification) {
    const statusScores = {
      'verified': 1.0,
      'partially_verified': 0.7,
      'disputed': 0.3,
      'false': 0.0,
      'needs_more_sources': 0.5
    };
    
    return statusScores[verification.verificationStatus] || 0.5;
  }
  
  calculateOverallAccuracy(verifications) {
    if (verifications.length === 0) return 0.8; // Neutral when no claims to verify
    
    const totalScore = verifications.reduce((sum, v) => sum + (v.accuracy_score || 0.5), 0);
    return totalScore / verifications.length;
  }
  
  generateSummary(verifications, overallAccuracy) {
    if (verifications.length === 0) {
      return 'No specific claims identified for deep fact verification.';
    }
    
    const verified = verifications.filter(v => v.verificationStatus === 'verified').length;
    const false_claims = verifications.filter(v => v.verificationStatus === 'false').length;
    const disputed = verifications.filter(v => v.verificationStatus === 'disputed').length;
    
    let summary = `Deep-verified ${verifications.length} claim${verifications.length > 1 ? 's' : ''}: `;
    summary += `${verified} verified, `;
    
    if (false_claims > 0) {
      summary += `${false_claims} false, `;
    }
    if (disputed > 0) {
      summary += `${disputed} disputed, `;
    }
    
    summary += `Overall accuracy: ${this.getAccuracyGrade(overallAccuracy)}.`;
    
    return summary;
  }
  
  getAccuracyGrade(score) {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.8) return 'Good';
    if (score >= 0.7) return 'Fair';
    if (score >= 0.6) return 'Poor';
    return 'Very Poor';
  }
}

export default DeepFactVerificationAgent;