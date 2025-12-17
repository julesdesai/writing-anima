"""Critic Reader Agent for Kimi K2 Multi-Agent Pipeline

Reads user writing AFTER being immersed in the persona's worldview.
Extracts claims, identifies tensions, and generates targeted search
queries for contrastive evidence.

This is the bridge between Pass 1 (worldview immersion) and
targeted contrastive retrieval (Pass 2).
"""

import json
import logging
from typing import Any, Dict, List, Optional

from openai import OpenAI

from ...config import get_config

logger = logging.getLogger(__name__)


CRITIC_READER_PROMPT = """You are {persona_name}, reading a piece of writing with critical attention.

You have just immersed yourself in your own intellectual worldview through extensive review of your writings. You now embody this perspective fully.

YOUR WORLDVIEW (from your writings):
{worldview_summary}

---

Now read the following writing sample and analyze it FROM YOUR PERSPECTIVE.

WRITING SAMPLE TO CRITIQUE:
{writing_sample}

---

YOUR TASK:

As {persona_name}, identify:

1. CLAIMS TO CONTEST
   Where does this writing make claims that conflict with your views?
   Where would you push back, disagree, or offer a different perspective?
   Be specific about WHAT the claim is and WHY you would contest it.

2. GAPS & OMISSIONS
   What important considerations does this writing ignore?
   What would you expect to see addressed that's missing?
   What questions does it fail to ask?

3. OPPORTUNITIES FOR ENRICHMENT
   Where could your perspective add depth or nuance?
   Where is the writing on the right track but could go further?
   What connections to your work could strengthen it?

4. STYLISTIC/CRAFT OBSERVATIONS
   Does the writing meet your standards for clarity, rigor, precision?
   Are there craft issues you'd point out?

For each identified issue, you will also generate a SEARCH QUERY to retrieve
specific evidence from your corpus to support your critique.

OUTPUT FORMAT:
Return ONLY a JSON object:

{{
  "overall_assessment": "Brief 2-3 sentence assessment of the writing from your perspective",
  "issues": [
    {{
      "type": "contest" | "gap" | "enrichment" | "craft",
      "claim_or_passage": "The specific text or claim you're responding to",
      "position_start": 0,
      "position_end": 100,
      "your_reaction": "What you think/feel about this from your perspective",
      "tension_with_worldview": "How this conflicts with or relates to your established views",
      "evidence_search": {{
        "query": "Search query to find supporting evidence from your corpus",
        "k": 15,
        "what_to_find": "Description of what this search should retrieve"
      }},
      "severity": "low" | "medium" | "high"
    }}
  ]
}}

Be thorough but focused. Identify 5-12 substantive issues worth addressing.
Prioritize genuine intellectual tensions over surface-level observations.
"""


class CriticReader:
    """
    Reads user writing from the persona's inhabited perspective.

    This agent runs AFTER worldview immersion, enabling it to
    recognize tensions it wouldn't have known to look for otherwise.
    """

    def __init__(
        self,
        persona_name: str,
        model: str = "kimi-k2-0711-preview",
        config=None,
    ):
        """
        Initialize the critic reader.

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

        logger.info(f"Initialized CriticReader for {persona_name}")

    def analyze(
        self,
        writing_sample: str,
        worldview_chunks: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Analyze writing from the persona's perspective after worldview immersion.

        Args:
            writing_sample: The user's writing to critique
            worldview_chunks: Retrieved chunks from worldview immersion

        Returns:
            Analysis with identified issues and evidence search queries
        """
        # Build worldview summary from chunks
        worldview_summary = self._build_worldview_summary(worldview_chunks)

        system_prompt = CRITIC_READER_PROMPT.format(
            persona_name=self.persona_name,
            worldview_summary=worldview_summary,
            writing_sample=writing_sample,
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": "Analyze this writing from your perspective and identify issues to address.",
                    },
                ],
                temperature=0.5,  # Some creativity for finding tensions
                max_tokens=4000,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            logger.debug(f"CriticReader raw response: {content[:500]}")

            analysis = json.loads(content)

            overall = analysis.get("overall_assessment", "")
            issues = analysis.get("issues", [])

            logger.info(f"CriticReader found {len(issues)} issues: {overall[:100]}")

            # Validate and extract search plan
            validated_issues = []
            evidence_searches = []

            for issue in issues:
                if not issue.get("claim_or_passage"):
                    continue

                validated_issue = {
                    "type": issue.get("type", "enrichment"),
                    "claim_or_passage": issue["claim_or_passage"],
                    "position_start": issue.get("position_start", 0),
                    "position_end": issue.get("position_end", 0),
                    "your_reaction": issue.get("your_reaction", ""),
                    "tension_with_worldview": issue.get("tension_with_worldview", ""),
                    "severity": issue.get("severity", "medium"),
                }
                validated_issues.append(validated_issue)

                # Extract evidence search
                if issue.get("evidence_search", {}).get("query"):
                    search = issue["evidence_search"]
                    evidence_searches.append(
                        {
                            "purpose": f"evidence_{issue.get('type', 'general')}",
                            "query": search["query"],
                            "k": min(search.get("k", 15), 25),
                            "issue_index": len(validated_issues) - 1,
                            "what_to_find": search.get("what_to_find", ""),
                        }
                    )

            logger.info(f"Generated {len(evidence_searches)} evidence searches")

            return {
                "overall_assessment": overall,
                "issues": validated_issues,
                "evidence_searches": evidence_searches,
            }

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse critic reader JSON: {e}")
            return self._create_fallback_analysis(writing_sample)
        except Exception as e:
            logger.error(f"CriticReader error: {e}")
            return self._create_fallback_analysis(writing_sample)

    def _build_worldview_summary(
        self,
        worldview_chunks: List[Dict[str, Any]],
        max_chars: int = 40000,
    ) -> str:
        """
        Build a summary of the worldview from retrieved chunks.

        Organizes chunks by category for clearer context.

        Args:
            worldview_chunks: Retrieved worldview chunks
            max_chars: Maximum characters for summary

        Returns:
            Formatted worldview summary
        """
        # Group by category
        by_category = {}
        for search_result in worldview_chunks:
            category = search_result.get("category", "general")
            purpose = search_result.get("purpose", "worldview_general")

            # Extract category from purpose if needed
            if category == "general" and "worldview_" in purpose:
                category = purpose.replace("worldview_", "")

            if category not in by_category:
                by_category[category] = []

            for chunk in search_result.get("results", []):
                by_category[category].append(chunk)

        # Format each category
        category_labels = {
            "core_positions": "YOUR CORE POSITIONS & BELIEFS",
            "key_arguments": "YOUR KEY ARGUMENTS & REASONING",
            "critiques": "POSITIONS YOU CRITIQUE & REJECT",
            "values": "YOUR INTELLECTUAL VALUES & STANDARDS",
            "methodology": "YOUR METHODOLOGY & APPROACH",
            "themes": "YOUR RECURRING THEMES & CONCERNS",
            "general": "GENERAL CONTEXT",
        }

        sections = []
        char_count = 0

        for category, chunks in by_category.items():
            if char_count >= max_chars:
                break

            label = category_labels.get(category, category.upper())
            section = f"\n### {label}\n\n"

            for chunk in chunks[:15]:  # Max 15 per category
                text = chunk.get("text", "")
                metadata = chunk.get("metadata", {})
                source = metadata.get("file_path", "").split("/")[-1] or "document"

                excerpt = f"[{source}]: {text}\n\n"

                if char_count + len(excerpt) > max_chars:
                    break

                section += excerpt
                char_count += len(excerpt)

            sections.append(section)

        return "".join(sections)

    def _create_fallback_analysis(
        self,
        writing_sample: str,
    ) -> Dict[str, Any]:
        """
        Create a fallback analysis if LLM fails.
        """
        return {
            "overall_assessment": "Unable to fully analyze - proceeding with general critique approach.",
            "issues": [
                {
                    "type": "enrichment",
                    "claim_or_passage": writing_sample[:200],
                    "position_start": 0,
                    "position_end": min(200, len(writing_sample)),
                    "your_reaction": "Consider how this relates to established positions",
                    "tension_with_worldview": "Further analysis needed",
                    "severity": "medium",
                }
            ],
            "evidence_searches": [
                {
                    "purpose": "evidence_general",
                    "query": "key arguments main thesis",
                    "k": 20,
                    "issue_index": 0,
                },
                {
                    "purpose": "evidence_general",
                    "query": "critique problem disagree",
                    "k": 20,
                    "issue_index": 0,
                },
            ],
        }
