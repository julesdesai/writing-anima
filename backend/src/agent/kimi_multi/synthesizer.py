"""Synthesizer Agent for Kimi K2 Multi-Agent Pipeline

Generates the final response using the retrieved corpus context.
All context is pre-loaded, so no tool calls are needed.
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional

from openai import OpenAI

from ...config import get_config

logger = logging.getLogger(__name__)


class SynthesizerAgent:
    """
    Generates final responses using retrieved corpus context.

    This agent receives all context upfront (from the Retriever) and
    generates a response without needing to make tool calls. This
    avoids K2's unreliable tool calling behavior.
    """

    def __init__(
        self,
        persona_id: str,
        persona_name: str,
        model: str = "kimi-k2-0711-preview",
        config=None,
        use_json_mode: bool = False,
        prompt_file: str = "base.txt",
    ):
        """
        Initialize the synthesizer agent.

        Args:
            persona_id: Persona identifier
            persona_name: Display name of the persona
            model: Kimi model identifier
            config: Optional configuration object
            use_json_mode: Whether to output JSON (for critic mode)
            prompt_file: Which prompt template to use
        """
        if config is None:
            config = get_config()

        self.config = config
        self.persona_id = persona_id
        self.persona_name = persona_name
        self.model = model
        self.use_json_mode = use_json_mode
        self.prompt_file = prompt_file

        # Get API key
        api_key = config.get_api_key("moonshot")
        if not api_key:
            raise ValueError("MOONSHOT_API_KEY not found")

        self.client = OpenAI(
            api_key=api_key,
            base_url=config.model.moonshot.base_url,
        )

        logger.info(
            f"Initialized SynthesizerAgent for {persona_name}, "
            f"json_mode={use_json_mode}, prompt={prompt_file}"
        )

    def _load_base_prompt(self) -> str:
        """Load the base system prompt template."""
        prompt_dir = Path(self.config.agent.system_prompt_dir)
        prompt_path = prompt_dir / self.prompt_file

        if not prompt_path.exists():
            logger.warning(f"Prompt file {prompt_path} not found, using default")
            return self._get_default_prompt()

        with open(prompt_path, "r") as f:
            return f.read()

    def _get_default_prompt(self) -> str:
        """Return a default prompt if file not found."""
        return """You are a writing emulator trained to produce text indistinguishable from {user_name}'s actual writing.

Your task is to respond to queries in {user_name}'s exact voice, style, and perspective.

Use the provided corpus excerpts to:
1. Ground your response in {user_name}'s actual ideas and views
2. Match their writing style, vocabulary, and tone precisely
3. Speak in FIRST PERSON as {user_name}

NEVER mention that you searched or retrieved anything.
Speak as if naturally recalling your own thoughts and writings.
"""

    def _build_system_prompt(
        self,
        retrieved_chunks: List[Dict[str, Any]],
    ) -> str:
        """
        Build the full system prompt with retrieved context.

        Args:
            retrieved_chunks: All retrieved chunks from Retriever

        Returns:
            Complete system prompt with context
        """
        # Load base prompt
        base_prompt = self._load_base_prompt()
        base_prompt = base_prompt.format(user_name=self.persona_name)

        # Add context sections
        context_sections = self._format_context_sections(retrieved_chunks)

        # Build full prompt
        full_prompt = f"""{base_prompt}

{"=" * 70}
RETRIEVED CORPUS CONTEXT
{"=" * 70}

The following excerpts are from {self.persona_name}'s actual writings.
Use these to ground your response in authentic content and style.
Reference these naturally as if recalling your own work.

{context_sections}

{"=" * 70}
END OF CORPUS CONTEXT
{"=" * 70}

Remember:
- Write in FIRST PERSON as {self.persona_name}
- Never mention "searching", "retrieval", or "corpus"
- Reference your work naturally: "In my thesis...", "I've argued that..."
- Match the style, vocabulary, and tone from the examples above
"""

        # Add JSON mode instructions if needed
        if self.use_json_mode:
            full_prompt += self._get_json_mode_instructions()

        return full_prompt

    def _format_context_sections(
        self,
        retrieved_chunks: List[Dict[str, Any]],
        max_chars_per_section: int = 25000,
    ) -> str:
        """
        Format retrieved chunks into context sections.

        Args:
            retrieved_chunks: All retrieved chunks
            max_chars_per_section: Max characters per purpose section

        Returns:
            Formatted context string
        """
        # Group by purpose
        by_purpose = {}
        for search_result in retrieved_chunks:
            purpose = search_result.get("purpose", "content")
            results = search_result.get("results", [])

            if purpose not in by_purpose:
                by_purpose[purpose] = []
            by_purpose[purpose].extend(results)

        # Format each section
        sections = []

        purpose_labels = {
            "content": "CONTENT & IDEAS",
            "style": "STYLE & VOICE EXAMPLES",
            "quality": "QUALITY & CRAFT STANDARDS",
            "direct": "DIRECT TOPIC MATCHES",
            "related": "RELATED CONCEPTS",
        }

        for purpose, chunks in by_purpose.items():
            label = purpose_labels.get(purpose, purpose.upper())
            section = f"\n### {label} ({len(chunks)} excerpts)\n\n"

            char_count = 0
            for i, chunk in enumerate(chunks):
                text = chunk.get("text", "")
                metadata = chunk.get("metadata", {})
                source = metadata.get("source", "unknown")
                file_path = metadata.get("file_path", "")
                file_name = file_path.split("/")[-1] if file_path else "document"

                excerpt = f"[{source}: {file_name}]\n{text}\n\n---\n\n"

                if char_count + len(excerpt) > max_chars_per_section:
                    section += (
                        f"\n[... {len(chunks) - i} more excerpts truncated ...]\n"
                    )
                    break

                section += excerpt
                char_count += len(excerpt)

            sections.append(section)

        return "\n".join(sections)

    def _get_json_mode_instructions(self) -> str:
        """Get additional instructions for JSON/critic mode."""
        return """

IMPORTANT - OUTPUT FORMAT:
You must output your response as a JSON object with a "feedback" key containing an array.
Each feedback object must have these exact fields:
- type: "issue" | "suggestion" | "praise" | "question"
- category: "clarity" | "style" | "logic" | "evidence" | "structure" | "voice" | "craft"
- title: Brief summary (10-15 words)
- content: Detailed, substantive feedback (6-8 sentences). Develop your point fully: identify the issue, explain why it matters, cite evidence from the corpus, and offer concrete guidance.
- severity: "low" | "medium" | "high"
- confidence: 0.0-1.0 (based on corpus support)
- corpus_sources: Array of objects with "text", "source_file", "relevance"
- text_positions: Array of objects with "start", "end", "text" (can be empty)

Example: {"feedback": [{"type": "issue", "category": "logic", ...}, {"type": "suggestion", ...}]}

Ground ALL feedback in the corpus excerpts above.
Reference specific documents by name, not generic advice.
"""

    def synthesize(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict]] = None,
    ) -> str:
        """
        Generate the final response.

        Args:
            query: Original user query
            retrieved_chunks: All retrieved chunks
            conversation_history: Optional conversation history

        Returns:
            Generated response text (or JSON string if json_mode)
        """
        system_prompt = self._build_system_prompt(retrieved_chunks)

        # Build messages
        messages = []
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": query})

        logger.info(f"Synthesizing response for: {query[:100]}...")
        logger.debug(f"System prompt length: {len(system_prompt)} chars")

        try:
            api_params = {
                "model": self.model,
                "messages": [{"role": "system", "content": system_prompt}] + messages,
                "temperature": self.config.model.moonshot.temperature,
                "max_tokens": self.config.model.moonshot.max_tokens,
            }

            if self.use_json_mode:
                api_params["response_format"] = {"type": "json_object"}

            response = self.client.chat.completions.create(**api_params)

            content = response.choices[0].message.content or ""
            logger.info(f"Synthesis complete: {len(content)} chars")

            return content

        except Exception as e:
            logger.error(f"Synthesis error: {e}")
            raise

    def synthesize_stream(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict]] = None,
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Stream the generated response.

        Args:
            query: Original user query
            retrieved_chunks: All retrieved chunks
            conversation_history: Optional conversation history

        Yields:
            {"type": "text", "content": str} for each chunk
        """
        system_prompt = self._build_system_prompt(retrieved_chunks)

        # Build messages
        messages = []
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": query})

        logger.info(f"Streaming synthesis for: {query[:100]}...")

        try:
            api_params = {
                "model": self.model,
                "messages": [{"role": "system", "content": system_prompt}] + messages,
                "temperature": self.config.model.moonshot.temperature,
                "max_tokens": self.config.model.moonshot.max_tokens,
                "stream": True,
            }

            if self.use_json_mode:
                api_params["response_format"] = {"type": "json_object"}

            stream = self.client.chat.completions.create(**api_params)

            collected_content = ""
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    collected_content += content
                    yield {"type": "text", "content": content}

            logger.info(f"Streaming synthesis complete: {len(collected_content)} chars")

        except Exception as e:
            logger.error(f"Streaming synthesis error: {e}")
            yield {"type": "error", "content": str(e)}

    # ================================================================
    # CRITIC MODE METHODS (Two-Pass with Worldview Immersion)
    # ================================================================

    def _build_critic_system_prompt(
        self,
        writing_sample: str,
        worldview_chunks: List[Dict[str, Any]],
        critique: Dict[str, Any],
        evidence_chunks: List[Dict[str, Any]],
        style_profile: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Build system prompt for critic mode with worldview context.

        Args:
            writing_sample: The user's writing to critique
            worldview_chunks: Broad worldview immersion chunks
            critique: Analysis from CriticReader with identified issues
            evidence_chunks: Targeted evidence for specific critiques
            style_profile: Extracted writing style profile

        Returns:
            Complete critic system prompt
        """
        # Format worldview context
        worldview_context = self._format_worldview_context(worldview_chunks)

        # Format evidence context
        evidence_context = self._format_evidence_context(evidence_chunks, critique)

        # Format identified issues as guidance
        issues_guidance = self._format_issues_guidance(critique)

        # Format style profile instructions
        style_instructions = self._format_style_instructions(style_profile)

        prompt = f"""You are {self.persona_name}, providing critical feedback on a piece of writing.

You have deeply immersed yourself in your own intellectual worldview and now embody this perspective fully. You will critique the writing FROM YOUR PERSPECTIVE, grounding all feedback in your actual views, standards, and intellectual commitments.

{"=" * 70}
YOUR WRITING STYLE (extracted from your corpus)
{"=" * 70}

{style_instructions}

CRITICAL: Your feedback content MUST be written in this style. Mimic the sentence patterns,
vocabulary, and rhetorical moves shown above. Do NOT use generic phrases like "In my view"
repeatedly - instead, use the varied patterns shown in your style profile.

{"=" * 70}
YOUR WORLDVIEW (from your writings)
{"=" * 70}

{worldview_context}

{"=" * 70}
WRITING SAMPLE TO CRITIQUE
{"=" * 70}

{writing_sample}

{"=" * 70}
ISSUES YOU'VE IDENTIFIED (from your critical reading)
{"=" * 70}

Overall Assessment: {critique.get("overall_assessment", "Pending analysis")}

{issues_guidance}

{"=" * 70}
SUPPORTING EVIDENCE (from your corpus)
{"=" * 70}

{evidence_context}

{"=" * 70}
YOUR TASK
{"=" * 70}

Generate critical feedback as {self.persona_name}. For each issue identified above:

1. EXPLAIN the tension between the writing and your worldview
2. CITE specific evidence from your corpus that supports your critique
3. SUGGEST how the writing could be improved or deepened
4. Ground everything in YOUR actual perspective - speak as yourself

CRITICAL STYLE INSTRUCTIONS:
- Write each feedback item's "content" field IN YOUR EXTRACTED STYLE (see above)
- Use the sentence patterns, vocabulary, and rhetorical moves from your style profile
- VARY your phrasing - don't start every piece of feedback the same way
- Reference your actual writings by document name when possible
- Be intellectually rigorous but constructive
- Balance critique with acknowledgment of what works

OUTPUT FORMAT:
Return a JSON object with a "feedback" key containing an array of feedback objects.
Each feedback object must have:
- type: "issue" | "suggestion" | "praise" | "question"
- category: "clarity" | "style" | "logic" | "evidence" | "structure" | "voice" | "craft"
- title: Brief summary (10-15 words)
- content: Detailed, substantive feedback IN YOUR WRITING STYLE (6-8 sentences). Develop your point fully: identify the issue, explain why it matters from your perspective, cite relevant evidence from your corpus, and offer concrete guidance for improvement.
- severity: "low" | "medium" | "high"
- confidence: 0.0-1.0 (how strongly your corpus supports this feedback)
- corpus_sources: Array of {{"text": "quote", "source_file": "document name", "relevance": "why relevant"}}
- text_positions: Array of {{"start": int, "end": int, "text": "quoted text"}} (positions in writing sample)

Example format:
{{"feedback": [
  {{"type": "issue", "category": "logic", "title": "...", "content": "...", "severity": "medium", "confidence": 0.8, "corpus_sources": [...], "text_positions": [...]}},
  {{"type": "suggestion", "category": "style", "title": "...", "content": "...", "severity": "low", "confidence": 0.7, "corpus_sources": [...], "text_positions": [...]}}
]}}

Generate feedback for ALL {len(critique.get("issues", []))} issues identified above. Your response must be valid JSON.
"""
        return prompt

    def _format_worldview_context(
        self,
        worldview_chunks: List[Dict[str, Any]],
        max_chars: int = 30000,
    ) -> str:
        """Format worldview chunks into context sections by category."""
        # Group by category
        by_category = {}
        for search_result in worldview_chunks:
            purpose = search_result.get("purpose", "worldview_general")
            category = search_result.get("category", "")

            # Extract category from purpose if needed
            if not category and "worldview_" in purpose:
                category = purpose.replace("worldview_", "")
            if not category:
                category = "general"

            if category not in by_category:
                by_category[category] = []

            for chunk in search_result.get("results", []):
                by_category[category].append(chunk)

        category_labels = {
            "core_positions": "YOUR CORE POSITIONS & BELIEFS",
            "key_arguments": "YOUR KEY ARGUMENTS",
            "critiques": "POSITIONS YOU CRITIQUE & REJECT",
            "values": "YOUR INTELLECTUAL VALUES",
            "methodology": "YOUR METHODOLOGY",
            "themes": "YOUR RECURRING THEMES",
            "general": "GENERAL CONTEXT",
        }

        sections = []
        char_count = 0

        for category, chunks in by_category.items():
            if char_count >= max_chars:
                break

            label = category_labels.get(category, category.upper())
            section = f"\n### {label}\n\n"

            for chunk in chunks[:12]:  # Max 12 per category
                text = chunk.get("text", "")
                metadata = chunk.get("metadata", {})
                file_path = metadata.get("file_path", "")
                file_name = file_path.split("/")[-1] if file_path else "document"

                excerpt = f"[{file_name}]: {text}\n\n"

                if char_count + len(excerpt) > max_chars:
                    break

                section += excerpt
                char_count += len(excerpt)

            sections.append(section)

        return "".join(sections)

    def _format_evidence_context(
        self,
        evidence_chunks: List[Dict[str, Any]],
        critique: Dict[str, Any],
        max_chars: int = 15000,
    ) -> str:
        """Format evidence chunks linked to specific issues."""
        if not evidence_chunks:
            return "No additional evidence retrieved."

        sections = []
        char_count = 0

        for search_result in evidence_chunks:
            query = search_result.get("query", "")
            issue_index = search_result.get("issue_index", -1)
            results = search_result.get("results", [])

            # Link to issue if possible
            issue_ref = ""
            if issue_index >= 0 and issue_index < len(critique.get("issues", [])):
                issue = critique["issues"][issue_index]
                issue_ref = f" (for: {issue.get('type', 'issue')} - {issue.get('claim_or_passage', '')[:50]}...)"

            section = f'\n### Evidence: "{query[:60]}"{issue_ref}\n\n'

            for chunk in results[:5]:  # Max 5 per evidence search
                text = chunk.get("text", "")
                metadata = chunk.get("metadata", {})
                file_path = metadata.get("file_path", "")
                file_name = file_path.split("/")[-1] if file_path else "document"

                excerpt = f"[{file_name}]: {text}\n\n"

                if char_count + len(excerpt) > max_chars:
                    break

                section += excerpt
                char_count += len(excerpt)

            sections.append(section)

            if char_count >= max_chars:
                break

        return "".join(sections) if sections else "No additional evidence retrieved."

    def _format_issues_guidance(
        self,
        critique: Dict[str, Any],
    ) -> str:
        """Format identified issues as guidance for synthesis."""
        issues = critique.get("issues", [])
        if not issues:
            return "No specific issues identified. Provide general critical feedback."

        lines = []
        for i, issue in enumerate(issues, 1):
            issue_type = issue.get("type", "general")
            severity = issue.get("severity", "medium")
            claim = issue.get("claim_or_passage", "")[:100]
            reaction = issue.get("your_reaction", "")
            tension = issue.get("tension_with_worldview", "")

            lines.append(f"""
{i}. [{severity.upper()}] {issue_type.upper()}
   Passage: "{claim}..."
   Your reaction: {reaction}
   Tension with worldview: {tension}
""")

        return "\n".join(lines)

    def _format_style_instructions(
        self,
        style_profile: Optional[Dict[str, Any]],
    ) -> str:
        """Format style profile as instructions for the synthesizer."""
        if not style_profile:
            return "No style profile available. Write in a clear, analytical academic style."

        lines = []

        # Sentence patterns
        sp = style_profile.get("sentence_patterns", {})
        lines.append("SENTENCE STRUCTURE:")
        lines.append(f"- Length: {sp.get('average_length', 'varied')}")
        lines.append(f"- Complexity: {sp.get('complexity', 'mixed')}")
        if sp.get("opening_patterns"):
            patterns = sp["opening_patterns"][:5]
            lines.append(f"- Common openings: {', '.join(patterns)}")
        lines.append(f"- Punctuation: {sp.get('punctuation_style', 'standard')}")
        lines.append("")

        # Vocabulary
        vocab = style_profile.get("vocabulary", {})
        lines.append("VOCABULARY & DICTION:")
        lines.append(f"- Register: {vocab.get('register', 'academic')}")
        lines.append(f"- Technical level: {vocab.get('technical_level', 'medium')}")
        if vocab.get("characteristic_words"):
            words = vocab["characteristic_words"][:10]
            lines.append(f"- Characteristic phrases: {', '.join(words)}")
        lines.append(f"- Hedging style: {vocab.get('hedging_style', 'moderate')}")
        lines.append("")

        # Rhetorical moves
        rhet = style_profile.get("rhetorical_moves", {})
        lines.append("RHETORICAL PATTERNS:")
        lines.append(
            f"- Introduce ideas by: {rhet.get('introduction_pattern', 'direct statement')}"
        )
        lines.append(f"- Transition style: {rhet.get('transition_style', 'logical')}")
        lines.append(
            f"- Emphasis technique: {rhet.get('emphasis_technique', 'elaboration')}"
        )
        lines.append("")

        # Tone
        tone = style_profile.get("tone", {})
        lines.append("TONE & VOICE:")
        lines.append(f"- Overall tone: {tone.get('overall', 'analytical')}")
        lines.append(f"- Formality: {tone.get('formality', 'formal')}")
        lines.append(
            f"- First person usage: {tone.get('first_person_usage', 'occasional')}"
        )
        lines.append("")

        # Distinctive features
        features = style_profile.get("distinctive_features", [])
        if features:
            lines.append("DISTINCTIVE SIGNATURES (use these patterns):")
            for feature in features[:7]:
                lines.append(f"- {feature}")
            lines.append("")

        # Exemplar sentences - these are key for style mimicry
        exemplars = style_profile.get("exemplar_sentences", [])
        if exemplars:
            lines.append("EXEMPLAR SENTENCES (mimic these patterns in your feedback):")
            for ex in exemplars[:7]:
                lines.append(f'  "{ex}"')
            lines.append("")

        # Style summary
        summary = style_profile.get("style_summary", "")
        if summary:
            lines.append(f"STYLE SUMMARY: {summary}")

        return "\n".join(lines)

    def synthesize_critic(
        self,
        writing_sample: str,
        worldview_chunks: List[Dict[str, Any]],
        critique: Dict[str, Any],
        evidence_chunks: List[Dict[str, Any]],
        style_profile: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict]] = None,
    ) -> str:
        """
        Generate critical feedback using two-pass worldview immersion.

        Args:
            writing_sample: The user's writing to critique
            worldview_chunks: Broad worldview immersion chunks
            critique: Analysis from CriticReader
            evidence_chunks: Targeted evidence for critiques
            style_profile: Extracted writing style profile
            conversation_history: Optional conversation history

        Returns:
            JSON string with feedback array
        """
        system_prompt = self._build_critic_system_prompt(
            writing_sample=writing_sample,
            worldview_chunks=worldview_chunks,
            critique=critique,
            evidence_chunks=evidence_chunks,
            style_profile=style_profile,
        )

        messages = []
        if conversation_history:
            messages.extend(conversation_history)
        messages.append(
            {
                "role": "user",
                "content": "Generate your critical feedback on this writing as a JSON array.",
            }
        )

        logger.info(
            f"Synthesizing critic feedback for {len(writing_sample)} char sample..."
        )
        logger.debug(f"System prompt length: {len(system_prompt)} chars")

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "system", "content": system_prompt}] + messages,
                temperature=0.6,  # Slightly higher for nuanced critique
                max_tokens=self.config.model.moonshot.max_tokens,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content or "[]"
            logger.info(f"Critic synthesis complete: {len(content)} chars")

            return content

        except Exception as e:
            logger.error(f"Critic synthesis error: {e}")
            raise

    def synthesize_critic_stream(
        self,
        writing_sample: str,
        worldview_chunks: List[Dict[str, Any]],
        critique: Dict[str, Any],
        evidence_chunks: List[Dict[str, Any]],
        style_profile: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict]] = None,
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Stream critical feedback generation.

        Args:
            writing_sample: The user's writing to critique
            worldview_chunks: Broad worldview immersion chunks
            critique: Analysis from CriticReader
            evidence_chunks: Targeted evidence for critiques
            style_profile: Extracted writing style profile
            conversation_history: Optional conversation history

        Yields:
            {"type": "text", "content": str} for each chunk
        """
        system_prompt = self._build_critic_system_prompt(
            writing_sample=writing_sample,
            worldview_chunks=worldview_chunks,
            critique=critique,
            evidence_chunks=evidence_chunks,
            style_profile=style_profile,
        )

        messages = []
        if conversation_history:
            messages.extend(conversation_history)
        messages.append(
            {
                "role": "user",
                "content": "Generate your critical feedback on this writing as a JSON array.",
            }
        )

        logger.info(
            f"Streaming critic synthesis for {len(writing_sample)} char sample..."
        )

        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "system", "content": system_prompt}] + messages,
                temperature=0.6,
                max_tokens=self.config.model.moonshot.max_tokens,
                stream=True,
                response_format={"type": "json_object"},
            )

            collected_content = ""
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    collected_content += content
                    yield {"type": "text", "content": content}

            logger.info(
                f"Streaming critic synthesis complete: {len(collected_content)} chars"
            )

        except Exception as e:
            logger.error(f"Streaming critic synthesis error: {e}")
            yield {"type": "error", "content": str(e)}
