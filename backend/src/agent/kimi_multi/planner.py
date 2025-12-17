"""Planner Agent for Kimi K2 Multi-Agent Pipeline

Analyzes the user query and creates a structured search plan.
This agent does NOT use tool calls - it outputs structured JSON
describing what searches should be performed.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

from openai import OpenAI

from ...config import get_config

logger = logging.getLogger(__name__)


PLANNER_SYSTEM_PROMPT = """You are a search planning agent for a writing assistant that emulates {persona_name}'s style.

Your task is to analyze the user's query and create an optimal search plan for retrieving relevant content from {persona_name}'s writing corpus.

The corpus contains {persona_name}'s actual writings: essays, emails, notes, documents, etc.
Your search plan will be executed by a retrieval system that does semantic + keyword hybrid search.

CRITICAL: Your search plan determines what context the response generator will have.
- Too few results = response won't capture the authentic voice
- Wrong queries = irrelevant context, poor style emulation
- Good queries = rich context for accurate emulation

SEARCH STRATEGY GUIDELINES:

For WRITING FEEDBACK (critic mode):
1. Content search (k=60): Find passages on the same TOPIC as the writing being reviewed
2. Style search (k=60): Find examples of {persona_name}'s writing in similar GENRES/CONTEXTS
3. Quality search (k=40): Find passages demonstrating {persona_name}'s standards of excellence

For EMULATION/RESPONSE (normal mode):
1. Content search (k=80-100): Find passages directly about the topic being discussed
2. Style search (k=80-100): Find examples showing HOW {persona_name} writes about similar things

For QUESTIONS about {persona_name}'s views:
1. Direct search (k=80): Search for the exact topic/concept being asked about
2. Related search (k=60): Search for related concepts that might provide context
3. Style search (k=40): Get voice/tone examples

QUERY FORMULATION TIPS:
- Use specific terminology {persona_name} would use
- Try multiple phrasings for important concepts
- Include both abstract concepts and concrete examples
- For philosophical topics, include key thinkers' names if relevant

OUTPUT FORMAT:
You must respond with ONLY a JSON object (no markdown, no explanation):

{{
  "query_type": "feedback" | "emulation" | "question",
  "reasoning": "Brief explanation of your search strategy",
  "search_plan": [
    {{
      "purpose": "content" | "style" | "quality" | "direct" | "related",
      "query": "The search query text",
      "k": 60
    }}
  ]
}}
"""


class PlannerAgent:
    """
    Analyzes queries and creates search plans.

    This agent uses Kimi K2 to analyze the query but does NOT use tool calls.
    It outputs a structured JSON search plan that the Retriever will execute.
    """

    def __init__(
        self,
        persona_name: str,
        model: str = "kimi-k2-0711-preview",
        config=None,
    ):
        """
        Initialize the planner agent.

        Args:
            persona_name: Name of the persona (for prompts)
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

        logger.info(f"Initialized PlannerAgent for {persona_name}")

    def create_search_plan(
        self,
        query: str,
        conversation_history: Optional[List[Dict]] = None,
        is_critic_mode: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Analyze query and create a search plan.

        Args:
            query: User query
            conversation_history: Optional conversation history
            is_critic_mode: Whether this is for writing feedback

        Returns:
            List of search specifications:
            [{"purpose": str, "query": str, "k": int}, ...]
        """
        system_prompt = PLANNER_SYSTEM_PROMPT.format(persona_name=self.persona_name)

        # Build user message with context
        user_content = f"Query: {query}\n\n"
        if is_critic_mode:
            user_content += "Mode: WRITING FEEDBACK (critic mode)\n"
            user_content += "The user is submitting writing for review. Plan searches to understand both the topic and the persona's quality standards.\n"
        else:
            user_content += "Mode: EMULATION/RESPONSE (normal mode)\n"
            user_content += "The user wants a response in the persona's voice. Plan searches for content and style.\n"

        if conversation_history:
            user_content += "\nRecent conversation context:\n"
            for msg in conversation_history[-3:]:  # Last 3 messages
                role = msg.get("role", "unknown")
                content = msg.get("content", "")[:200]
                user_content += f"  {role}: {content}...\n"

        messages = [{"role": "user", "content": user_content}]

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "system", "content": system_prompt}] + messages,
                temperature=0.3,  # Lower temperature for more consistent planning
                max_tokens=1000,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            logger.debug(f"Planner raw response: {content[:500]}")

            # Parse JSON response
            plan_data = json.loads(content)

            search_plan = plan_data.get("search_plan", [])
            reasoning = plan_data.get("reasoning", "")
            query_type = plan_data.get("query_type", "unknown")

            logger.info(
                f"Planner created {len(search_plan)} searches "
                f"(type={query_type}): {reasoning[:100]}"
            )

            # Validate and normalize search plan
            validated_plan = []
            for search in search_plan:
                if "query" in search:
                    validated_plan.append(
                        {
                            "purpose": search.get("purpose", "content"),
                            "query": search["query"],
                            "k": min(search.get("k", 60), self.config.retrieval.max_k),
                        }
                    )

            # Fallback if no valid searches
            if not validated_plan:
                logger.warning("No valid searches in plan, using fallback")
                validated_plan = self._create_fallback_plan(query, is_critic_mode)

            return validated_plan

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse planner JSON: {e}")
            return self._create_fallback_plan(query, is_critic_mode)
        except Exception as e:
            logger.error(f"Planner error: {e}")
            return self._create_fallback_plan(query, is_critic_mode)

    def _create_fallback_plan(
        self,
        query: str,
        is_critic_mode: bool,
    ) -> List[Dict[str, Any]]:
        """
        Create a basic fallback search plan if the LLM fails.

        Args:
            query: Original user query
            is_critic_mode: Whether this is critic mode

        Returns:
            Basic search plan
        """
        logger.info("Using fallback search plan")

        if is_critic_mode:
            return [
                {"purpose": "content", "query": query[:200], "k": 60},
                {"purpose": "style", "query": "writing style examples", "k": 60},
                {"purpose": "quality", "query": "excellent writing craft", "k": 40},
            ]
        else:
            return [
                {"purpose": "content", "query": query[:200], "k": 80},
                {"purpose": "style", "query": "writing style voice tone", "k": 80},
            ]
