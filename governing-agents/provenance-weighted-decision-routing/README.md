# Provenance-Weighted Decision Routing

> This pattern prevents hallucinated confidence in high-stakes agent decisions by attaching cryptographic-style provenance metadata and dynamic trust weights to every claim or action, ensuring that downstream consumers can route based on verifiable source quality rather than raw output scores. It is essential for any multi-agent system handling sensitive data, financial transactions, medical advice, or legal documentation where accountability and auditability are non-negotiable.

## The Problem

An agent system was deployed to assist users in drafting investment memos by pulling data from multiple internal databases and external news sources. One day, a sub-agent retrieved a misleading headline from an unverified aggregator that contradicted the primary financial database but had higher lexical similarity to the user's query. Because the system lacked provenance tracking, it treated all inputs as equally trustworthy based on relevance scores alone. The resulting memo contained a critical error that led to a bad investment decision. The team could not trace which source introduced the inaccuracy because no metadata accompanied the final output. This failure highlights the core issue: without explicit provenance and weighted trust routing, agents cannot distinguish between high-confidence hallucinations and low-confidence but accurate sources.

## The Pattern

The mechanism operates by enforcing a three-layer protocol around every piece of information an agent processes or produces:

1. **Source Annotation**: Every input token, document chunk, or external call result must carry immutable metadata including source identifier, retrieval timestamp, confidence score from the retriever, and a trust tier (e.g., verified_database, peer_reviewed_source, user_input, unverified_web).
2. **Provenance Chain Construction**: As agents transform information through reasoning steps, each intermediate claim inherits and extends the provenance chain from its sources. If a claim synthesizes data from two sources, the chain includes both with their respective trust weights. No claim can exist without an attached lineage.
3. **Trust-Weighted Routing**: Downstream decision nodes evaluate claims not just by semantic relevance but by aggregating the trust scores along their provenance chains. Claims derived from low-trust sources are flagged for human review, downweighted in final outputs, or explicitly labeled as uncertain depending on the application's risk tolerance.

## Reference Implementation Sketch

```typescript
interface ProvenanceMetadata {
  sourceId: string;
  trustTier: 'verified' | 'reviewed' | 'user' | 'unverified';
  confidence: number; // 0-1 from retriever or generator
  timestamp: Date;
}

interface ClaimWithProvenance {
  content: string;
  provenanceChain: ProvenanceMetadata[];
  aggregatedTrustScore: number;
}

class TrustWeightedRouter {
  constructor(private trustThresholds: Record<string, number>) {}

  evaluateClaim(claim: ClaimWithProvenance): DecisionOutcome {
    const avgTrust = this.calculateAverageTrust(claim.provenanceChain);
    
    if (avgTrust > this.trustThresholds.high) {
      return { action: 'approve', confidence: avgTrust };
    } else if (avgTrust > this.trustThresholds.medium) {
      return { action: 'flag_for_review', confidence: avgTrust, 
              reason: 'Mixed provenance sources' };
    } else {
      return { action: 'reject_or_label_uncertain', 
              confidence: avgTrust, 
              reason: 'Insufficient trust from unverified sources' };
    }
  }

  private calculateAverageTrust(chain: ProvenanceMetadata[]): number {
    const tierWeights = { verified: 1.0, reviewed: 0.8, user: 0.6, unverified: 0.3 };
    return chain.reduce((sum, p) => sum + tierWeights[p.trustTier], 0) / chain.length;
  }
}

// Usage in agent workflow
async function processInvestmentQuery(query: string) {
  const sources = await retrieveSources(query); // Returns annotated chunks
  const synthesizedClaim = await reasoningAgent.synthesize(sources);
  
  const claimWithProvenance: ClaimWithProvenance = {
    content: synthesizedClaim,
    provenanceChain: sources.map(s => ({
      sourceId: s.id,
      trustTier: s.trustTier,
      confidence: s.confidence,
      timestamp: new Date()
    })),
    aggregatedTrustScore: 0 // Calculated by router
  };

  const decision = await router.evaluateClaim(claimWithProvenance);
  
  if (decision.action === 'flag_for_review') {
    return `⚠️ Draft contains mixed-trust sources. 
            Primary source: ${sources[0].id}. 
            Please verify before sending.`;
  }
  
  return decision.action === 'approve' ? synthesizedClaim : null;
}
```

## What this does not catch

This pattern does not address the inherent unreliability of a high-trust source that is itself biased or outdated. If a verified database contains incorrect entries, the provenance chain will still show high trust, masking the error. It also does not prevent sophisticated adversarial attacks where an attacker poisons a trusted source with plausible-looking false information. Furthermore, the aggregation logic for mixed provenance chains can be arbitrary; combining one highly confident low-trust source with one moderately confident high-trust source requires careful calibration of the weighting formula to avoid unintended behaviors. Finally, this pattern adds significant overhead to latency and storage due to metadata propagation across all agent steps.

## Apply it in your system

1. Define trust tiers for all your data sources (databases, APIs, user inputs, web scrapers) and assign initial weight values based on historical reliability and verification status.
2. Modify your retrieval layer to automatically attach provenance metadata (source ID, timestamp, confidence score, trust tier) to every chunk or result it returns.
3. Implement a provenance inheritance mechanism in your reasoning agents so that every intermediate claim explicitly logs which sources contributed to its generation.
4. Build the trust-weighted router as a separate service that evaluates final claims against configurable thresholds and outputs approval, flag, or reject decisions.
5. Add observability by logging provenance chains for all flagged or rejected claims to continuously refine your trust tier weights and threshold values based on ground truth outcomes.

---

*Written by **Kim Like**. I build and run autonomous AI systems and advise teams on doing it safely at [aienterprise.dk](https://aienterprise.dk). More patterns: [github.com/Kim-Like](https://github.com/Kim-Like).*
