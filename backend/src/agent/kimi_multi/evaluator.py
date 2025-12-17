"""Evaluator Agent for Kimi K2 Multi-Agent Pipeline

Self-evaluation agent that assesses whether enough context has been
retrieved to generate a high-quality response in the persona's style.

If insufficient, it suggests additional searches to fill the gaps.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

from openai import OpenAI

from ...config import get_config

logger = logging.getLogger(__name__)


EVALUATOR_SYSTEM_PROMPT = """You are a quality assurance agent for a writing assistant that emulates {persona_name}'s style.

Your task is to evaluate whether the retrieved corpus content is SUFFICIENT to generate a high-quality response that:
1. Accurately represents {persona_name}'s views and knowledge
2. Authentically captures {persona_name}'s writing style, voice, and tone
3. Is properly grounded in actual corpus content (not hallucinated)

You will be given:
- The original user query
- The retrieved corpus chunks (organized by purpose: content, style, quality, etc.)
- The current retrieval loop number

EVALUATION CRITERIA:

For CONTENT sufficiency:
- Do the chunks contain information directly relevant to the query?
- Is there enough substance to give a meaningful answer?
- Are there clear examples of {persona_name}'s views on this topic?

For STYLE sufficiency:
- Are there enough examples of HOW {persona_name} writes?
- Do we have samples of their sentence structure, vocabulary, tone?
- Can we capture their voice authentically from these examples?

For GROUNDING:
- Will the response be able to cite/reference specific corpus content?
- Are there enough diverse sources to avoid over-reliance on one document?

RED FLAGS (suggest more retrieval):
- Query asks about topic X but chunks are mostly about unrelated topic Y
- Very few chunks returned (< 20 total)
- All chunks are from a single document
- Chunks are tangentially related but don't directly address the query
- Style examples are too sparse to capture authentic voice

GREEN FLAGS (sufficient for synthesis):
- Multiple chunks directly address the query topic
- Good mix of content and style examples
- Chunks from diverse sources/documents
- Clear examples of vocabulary, phrasing, and argumentation patterns

OUTPUT FORMAT:
You must respond with ONLY a JSON object (no markdown, no explanation):

{{
  "sufficient": true | false,
  "reasoning": "Explanation of your assessment",
  "content_score": 0.0-1.0,
  "style_score": 0.0-1.0,
  "grounding_score": 0.0-1.0,
  "gaps_identified": ["List of missing information or context"],
  "additional_searches": [
    {{
      "purpose": "content" | "style" | "related",
      "query": "Suggested search query to fill the gap",
      "k": 40-80,
      "rationale": "Why this search would help"
    }}
  ]
}}

If sufficient=true, additional_searches should be empty or omitted.
If sufficient=false, provide 1-3 targeted additional searches.

IMPORTANT: Be realistic but not overly cautious.
- If we have 100+ relevant chunks, that's usually sufficient.
- Don't demand perfection - some gaps are acceptable.
- After 2-3 retrieval loops, be more lenient (we should proceed).
- The goal is GOOD ENOUGH, not PERFECT.
"""


class EvaluatorAgent:
    """
    Evaluates retrieval sufficiency and suggests additional searches.

    This is the self-orchestration component that allows the pipeline
    to iterate on retrieval until enough context is gathered.
    """

    def __init__(
        self,
        persona_name: str,
        model: str = "kimi-k2-0711-preview",
        config=None,
    ):
        """
        Initialize the evaluator agent.

        Args:
            persona_name: Name of the persona
            model: Kimi model identifier
            config: Optional configuration object
        """
        if config is None:
            config = get_config()

        self.config = config
        self.persona_name = persona_name
        self.model = model

        # Get API key
        api_key = config.get_api_key("moonshot")
        if not api_key:
            raise ValueError("MOONSHOT_API_KEY not found")

        self.client = OpenAI(
            api_key=api_key,
            base_url=config.model.moonshot.base_url,
        )

        logger.info(f"Initialized EvaluatorAgent for {persona_name}")

    def evaluate(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        is_critic_mode: bool = False,
        loop_number: int = 1,
    ) -> Dict[str, Any]:
        """
        Evaluate whether retrieved context is sufficient.

        Args:
            query: Original user query
            retrieved_chunks: All retrieved chunks from Retriever
            is_critic_mode: Whether this is for writing feedback
            loop_number: Current retrieval loop (1-indexed)

        Returns:
            Evaluation result with sufficiency decision and optional
            additional search suggestions
        """
        system_prompt = EVALUATOR_SYSTEM_PROMPT.format(persona_name=self.persona_name)

        # Build summary of retrieved chunks
        chunks_summary = self._summarize_chunks(retrieved_chunks)

        # Build user message
        user_content = f"""QUERY: {query}

MODE: {"WRITING FEEDBACK (critic mode)" if is_critic_mode else "EMULATION/RESPONSE"}

RETRIEVAL LOOP: {loop_number} ({"be stricter" if loop_number == 1 else "be more lenient" if loop_number >= 2 else "moderate strictness"})

RETRIEVED CONTENT SUMMARY:
{chunks_summary}

Evaluate whether this context is sufficient to generate a high-quality response in {self.persona_name}'s authentic style.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.3,
                max_tokens=1500,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            logger.debug(f"Evaluator raw response: {content[:500]}")

            evaluation = json.loads(content)

            # Log evaluation
            sufficient = evaluation.get("sufficient", False)
            reasoning = evaluation.get("reasoning", "")
            content_score = evaluation.get("content_score", 0)
            style_score = evaluation.get("style_score", 0)
            grounding_score = evaluation.get("grounding_score", 0)

            logger.info(
                f"Evaluation: sufficient={sufficient}, "
                f"scores=[content={content_score:.2f}, style={style_score:.2f}, "
                f"grounding={grounding_score:.2f}]"
            )
            logger.info(f"Reasoning: {reasoning[:150]}...")

            if not sufficient:
                additional = evaluation.get("additional_searches", [])
                gaps = evaluation.get("gaps_identified", [])
                logger.info(f"Gaps identified: {gaps}")
                logger.info(f"Additional searches suggested: {len(additional)}")

            # Normalize the response
            return {
                "sufficient": sufficient,
                "reasoning": reasoning,
                "content_score": content_score,
                "style_score": style_score,
                "grounding_score": grounding_score,
                "gaps_identified": evaluation.get("gaps_identified", []),
                "additional_searches": self._validate_searches(
                    evaluation.get("additional_searches", [])
                ),
            }

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse evaluator JSON: {e}")
            # On parse failure, be lenient and proceed
            return self._create_fallback_evaluation(loop_number)
        except Exception as e:
            logger.error(f"Evaluator error: {e}")
            return self._create_fallback_evaluation(loop_number)

    def _summarize_chunks(
        self,
        retrieved_chunks: List[Dict[str, Any]],
        max_preview_chars: int = 200,
    ) -> str:
        """
        Create a summary of retrieved chunks for evaluation.

        Args:
            retrieved_chunks: All retrieved chunks
            max_preview_chars: Max chars per chunk preview

        Returns:
            Formatted summary string
        """
        summary_parts = []

        # Group by purpose
        by_purpose = {}
        for search_result in retrieved_chunks:
            purpose = search_result.get("purpose", "content")
            results = search_result.get("results", [])
            query = search_result.get("query", "")

            if purpose not in by_purpose:
                by_purpose[purpose] = []

            by_purpose[purpose].append(
                {
                    "query": query,
                    "count": len(results),
                    "results": results,
                }
            )

        # Format each purpose group
        for purpose, searches in by_purpose.items():
            total_chunks = sum(s["count"] for s in searches)
            summary_parts.append(f"\n## {purpose.upper()} ({total_chunks} chunks)")

            for search in searches:
                summary_parts.append(
                    f'\nSearch: "{search["query"][:80]}" → {search["count"]} results'
                )

                # Show previews of first few results
                for i, result in enumerate(search["results"][:3]):
                    text = result.get("text", "")[:max_preview_chars].replace("\n", " ")
                    source = result.get("metadata", {}).get("source", "unknown")
                    summary_parts.append(f"  - [{source}] {text}...")

        # Add statistics
        total_chunks = sum(len(sr.get("results", [])) for sr in retrieved_chunks)
        unique_sources = set()
        for sr in retrieved_chunks:
            for result in sr.get("results", []):
                source = result.get("metadata", {}).get("file_path", "")
                if source:
                    unique_sources.add(source.split("/")[-1])

        summary_parts.append(f"\n\n## STATISTICS")
        summary_parts.append(f"Total chunks: {total_chunks}")
        summary_parts.append(f"Unique source files: {len(unique_sources)}")
        if unique_sources:
            summary_parts.append(f"Sources: {', '.join(list(unique_sources)[:10])}")

        return "\n".join(summary_parts)

    def _validate_searches(
        self,
        searches: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Validate and normalize additional search suggestions.

        Args:
            searches: Raw search suggestions from LLM

        Returns:
            Validated search list
        """
        validated = []

        for search in searches:
            if not search.get("query"):
                continue

            validated.append(
                {
                    "purpose": search.get("purpose", "content"),
                    "query": search["query"],
                    "k": min(search.get("k", 60), self.config.retrieval.max_k),
                }
            )

        return validated[:3]  # Max 3 additional searches

    def _create_fallback_evaluation(
        self,
        loop_number: int,
    ) -> Dict[str, Any]:
        """
        Create a fallback evaluation when LLM fails.

        Args:
            loop_number: Current loop number

        Returns:
            Fallback evaluation (lenient after loop 1)
        """
        # Be lenient after first loop
        if loop_number >= 2:
            return {
                "sufficient": True,
                "reasoning": "Proceeding after retrieval loop (fallback evaluation)",
                "content_score": 0.6,
                "style_score": 0.6,
                "grounding_score": 0.6,
                "gaps_identified": [],
                "additional_searches": [],
            }
        else:
            return {
                "sufficient": False,
                "reasoning": "Initial retrieval, requesting one more pass (fallback evaluation)",
                "content_score": 0.5,
                "style_score": 0.5,
                "grounding_score": 0.5,
                "gaps_identified": [
                    "Unable to evaluate - requesting additional retrieval"
                ],
                "additional_searches": [
                    {"purpose": "content", "query": "key topics and themes", "k": 60},
                    {
                        "purpose": "style",
                        "query": "writing examples voice tone",
                        "k": 60,
                    },
                ],
            }
