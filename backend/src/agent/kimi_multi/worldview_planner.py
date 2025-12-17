"""Worldview Planner Agent for Kimi K2 Multi-Agent Pipeline

Generates broad search queries to immerse the system in the persona's
intellectual worldview BEFORE analyzing user writing. This enables
authentic critique from the persona's perspective.

This is Pass 1 of the two-pass critic approach.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from openai import OpenAI

from ...config import get_config

logger = logging.getLogger(__name__)


WORLDVIEW_PLANNER_PROMPT = """You are preparing to critique a piece of writing from {persona_name}'s perspective.

Before seeing the writing, you need to immerse yourself in {persona_name}'s intellectual worldview. This immersion will enable you to recognize tensions, gaps, and opportunities that only someone inhabiting this perspective would notice.

Your task: Generate search queries that will retrieve passages covering {persona_name}'s complete intellectual landscape.

COVERAGE AREAS:

1. CORE POSITIONS (2-3 queries, k=30 each)
   What does {persona_name} fundamentally believe or argue?
   Their central theses, key claims, foundational commitments.

2. KEY ARGUMENTS (2-3 queries, k=25 each)
   Their most important intellectual contributions.
   How they build arguments, what evidence they use, their reasoning patterns.

3. CRITIQUES & REJECTIONS (2 queries, k=25 each)
   What positions does {persona_name} argue AGAINST?
   What do they find problematic, wrong-headed, or intellectually lazy?
   This is crucial for knowing what they would contest in others' writing.

4. INTELLECTUAL VALUES (1-2 queries, k=20 each)
   What do they value in thinking and writing?
   Clarity? Rigor? Originality? Empirical grounding? Philosophical depth?
   What standards do they hold themselves and others to?

5. METHODOLOGY & STYLE (1-2 queries, k=20 each)
   How do they approach problems?
   What's their intellectual style? (systematic, exploratory, dialectical, etc.)

6. RECURRING THEMES (2-3 queries, k=25 each)
   What topics, concepts, or concerns appear repeatedly?
   These are the lenses through which they view new ideas.

QUERY FORMULATION GUIDELINES:
- Use terminology {persona_name} would actually use
- Be specific enough to get relevant content, broad enough for coverage
- For critiques, search for phrases like "problem with", "against", "critique of", "reject"
- For values, search for normative language: "should", "must", "important", "essential"
- Include domain-specific vocabulary

OUTPUT FORMAT:
Return ONLY a JSON object:

{{
  "reasoning": "Brief explanation of your search strategy for this persona",
  "search_plan": [
    {{
      "category": "core_positions" | "key_arguments" | "critiques" | "values" | "methodology" | "themes",
      "query": "The search query text",
      "k": 20-30,
      "rationale": "Why this query captures important worldview content"
    }}
  ]
}}

Generate 12-16 queries for comprehensive worldview coverage.
Total retrieval should be ~300-400 chunks for deep immersion.
"""


class WorldviewPlanner:
    """
    Plans broad retrieval to immerse the system in a persona's worldview.

    This runs BEFORE the system sees the user's writing, enabling
    authentic critique from an inhabited perspective.
    """

    def __init__(
        self,
        persona_name: str,
        model: str = "kimi-k2-0711-preview",
        config=None,
    ):
        """
        Initialize the worldview planner.

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

        logger.info(f"Initialized WorldviewPlanner for {persona_name}")

    def create_immersion_plan(
        self,
        writing_topic_hint: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Generate a comprehensive search plan for worldview immersion.

        Args:
            writing_topic_hint: Optional hint about what the writing covers
                (can help prioritize relevant worldview areas)

        Returns:
            List of search specifications for broad worldview retrieval
        """
        system_prompt = WORLDVIEW_PLANNER_PROMPT.format(persona_name=self.persona_name)

        user_content = (
            f"Generate a worldview immersion search plan for {self.persona_name}."
        )

        if writing_topic_hint:
            user_content += f"\n\nNote: The writing to be critiqued appears to be about: {writing_topic_hint}"
            user_content += "\nWhile maintaining broad coverage, you may slightly prioritize worldview areas relevant to this topic."

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.4,
                max_tokens=2000,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            logger.debug(f"WorldviewPlanner raw response: {content[:500]}")

            plan_data = json.loads(content)

            search_plan = plan_data.get("search_plan", [])
            reasoning = plan_data.get("reasoning", "")

            logger.info(
                f"WorldviewPlanner created {len(search_plan)} queries: {reasoning[:100]}"
            )

            # Validate and normalize
            validated_plan = []
            total_k = 0
            for search in search_plan:
                if "query" in search:
                    k = min(search.get("k", 25), 40)  # Cap individual searches
                    validated_plan.append(
                        {
                            "purpose": f"worldview_{search.get('category', 'general')}",
                            "category": search.get("category", "general"),
                            "query": search["query"],
                            "k": k,
                            "rationale": search.get("rationale", ""),
                        }
                    )
                    total_k += k

            logger.info(
                f"Worldview immersion plan: {len(validated_plan)} queries, {total_k} total chunks"
            )

            # Fallback if too few queries
            if len(validated_plan) < 8:
                logger.warning("Too few worldview queries, augmenting with defaults")
                validated_plan.extend(self._get_default_queries())

            return validated_plan

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse worldview planner JSON: {e}")
            return self._get_default_queries()
        except Exception as e:
            logger.error(f"WorldviewPlanner error: {e}")
            return self._get_default_queries()

    def _get_default_queries(self) -> List[Dict[str, Any]]:
        """
        Return default worldview queries if LLM fails.
        """
        return [
            # Core positions
            {
                "purpose": "worldview_core_positions",
                "category": "core_positions",
                "query": "main argument thesis central claim",
                "k": 30,
                "rationale": "Core positions",
            },
            {
                "purpose": "worldview_core_positions",
                "category": "core_positions",
                "query": "I argue believe fundamental",
                "k": 30,
                "rationale": "First-person positions",
            },
            # Key arguments
            {
                "purpose": "worldview_key_arguments",
                "category": "key_arguments",
                "query": "because therefore thus evidence shows",
                "k": 25,
                "rationale": "Argumentative passages",
            },
            {
                "purpose": "worldview_key_arguments",
                "category": "key_arguments",
                "query": "important point key insight",
                "k": 25,
                "rationale": "Key insights",
            },
            # Critiques
            {
                "purpose": "worldview_critiques",
                "category": "critiques",
                "query": "problem wrong mistaken critique against",
                "k": 25,
                "rationale": "Critical passages",
            },
            {
                "purpose": "worldview_critiques",
                "category": "critiques",
                "query": "reject disagree object",
                "k": 25,
                "rationale": "Disagreements",
            },
            # Values
            {
                "purpose": "worldview_values",
                "category": "values",
                "query": "should must essential important value",
                "k": 20,
                "rationale": "Normative values",
            },
            # Methodology
            {
                "purpose": "worldview_methodology",
                "category": "methodology",
                "query": "approach method way of thinking",
                "k": 20,
                "rationale": "Methodology",
            },
            # Themes
            {
                "purpose": "worldview_themes",
                "category": "themes",
                "query": "always often repeatedly concern",
                "k": 25,
                "rationale": "Recurring themes",
            },
            {
                "purpose": "worldview_themes",
                "category": "themes",
                "query": "question problem issue",
                "k": 25,
                "rationale": "Core concerns",
            },
        ]

    def extract_topic_hint(self, writing_sample: str) -> str:
        """
        Extract a brief topic hint from the writing sample.

        This helps the worldview planner prioritize relevant areas
        without revealing the full content before immersion.

        Args:
            writing_sample: The user's writing

        Returns:
            Brief topic description (1-2 sentences)
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "Extract the main topic of this writing in 1-2 sentences. Be brief and neutral.",
                    },
                    {
                        "role": "user",
                        "content": writing_sample[:2000],
                    },  # First 2000 chars
                ],
                temperature=0.3,
                max_tokens=100,
            )

            topic = response.choices[0].message.content.strip()
            logger.info(f"Extracted topic hint: {topic[:100]}")
            return topic

        except Exception as e:
            logger.error(f"Failed to extract topic hint: {e}")
            return ""
