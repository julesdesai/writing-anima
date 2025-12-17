"""Style Extractor Agent for Kimi K2 Multi-Agent Pipeline

Analyzes corpus chunks to extract explicit stylistic patterns.
Outputs a structured "style profile" that the synthesizer uses
to generate feedback in the persona's authentic voice.

This is NOT about what the persona thinks, but HOW they write.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from openai import OpenAI

from ...config import get_config

logger = logging.getLogger(__name__)


STYLE_EXTRACTOR_PROMPT = """You are a literary analyst specializing in writing style extraction.

Your task: Analyze the following corpus excerpts and extract a detailed STYLE PROFILE.

Focus ONLY on HOW the author writes, NOT what they write about:
- Ignore the ideas, arguments, and content
- Focus on sentence structure, vocabulary, rhetorical patterns, tone

CORPUS EXCERPTS TO ANALYZE:
{corpus_samples}

---

Analyze these excerpts and extract:

1. SENTENCE STRUCTURE
   - Average sentence length (short/medium/long/varied)
   - Sentence variety (simple, compound, complex, mixed)
   - Opening patterns (how do sentences typically begin?)
   - Use of parentheticals, dashes, semicolons
   - Paragraph length and structure

2. VOCABULARY & DICTION
   - Register (formal/informal/academic/conversational)
   - Technical terminology usage
   - Characteristic words or phrases they repeat
   - Preference for Latinate vs Anglo-Saxon words
   - Use of hedging language ("perhaps", "might", "seems")

3. RHETORICAL MOVES
   - How do they introduce ideas?
   - How do they transition between points?
   - How do they qualify or hedge claims?
   - How do they emphasize key points?
   - Do they use rhetorical questions?

4. TONE & VOICE
   - Overall tone (authoritative/tentative/playful/serious)
   - Relationship with reader (formal/collegial/pedagogical)
   - Use of first person (I/we) and how
   - Emotional register (detached/engaged/passionate)

5. DISTINCTIVE PATTERNS
   - Any signature phrases or formulations
   - Characteristic ways of making points
   - Unique stylistic tics or habits
   - What makes this voice recognizable?

6. EXAMPLE SENTENCES
   - Provide 5-7 sentences from the corpus that best exemplify the style
   - These will serve as templates for style mimicry

OUTPUT FORMAT:
Return a JSON object with this structure:

{{
  "sentence_patterns": {{
    "average_length": "short|medium|long|varied",
    "complexity": "simple|compound|complex|mixed",
    "opening_patterns": ["list of common sentence opening patterns"],
    "punctuation_style": "description of punctuation preferences"
  }},
  "vocabulary": {{
    "register": "formal|informal|academic|conversational|mixed",
    "technical_level": "high|medium|low",
    "characteristic_words": ["list of distinctive words/phrases"],
    "hedging_style": "description of how they qualify claims"
  }},
  "rhetorical_moves": {{
    "introduction_pattern": "how they introduce ideas",
    "transition_style": "how they move between points",
    "emphasis_technique": "how they emphasize key points",
    "uses_rhetorical_questions": true|false
  }},
  "tone": {{
    "overall": "description of overall tone",
    "formality": "formal|informal|mixed",
    "relationship_with_reader": "description",
    "first_person_usage": "description of I/we usage patterns"
  }},
  "distinctive_features": [
    "list of unique stylistic signatures"
  ],
  "exemplar_sentences": [
    "sentence 1 that exemplifies the style",
    "sentence 2 that exemplifies the style",
    "..."
  ],
  "style_summary": "A 2-3 sentence summary of this author's distinctive voice"
}}

Be specific and concrete. Quote actual phrases from the corpus where possible.
"""


class StyleExtractor:
    """
    Extracts explicit stylistic patterns from corpus chunks.

    This agent analyzes HOW the persona writes (style, structure, voice)
    rather than WHAT they write about (content, ideas, arguments).

    The output is a structured style profile that the synthesizer
    uses to generate feedback in the persona's authentic voice.
    """

    def __init__(
        self,
        persona_name: str,
        model: str = "kimi-k2-0711-preview",
        config=None,
    ):
        """
        Initialize the style extractor.

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

        logger.info(f"Initialized StyleExtractor for {persona_name}")

    def extract_style(
        self,
        corpus_chunks: List[Dict[str, Any]],
        max_samples: int = 25,
        max_chars: int = 30000,
    ) -> Dict[str, Any]:
        """
        Extract style profile from corpus chunks.

        Args:
            corpus_chunks: Retrieved corpus chunks (from worldview retrieval)
            max_samples: Maximum number of chunks to analyze
            max_chars: Maximum total characters to include

        Returns:
            Style profile dictionary
        """
        # Select diverse samples from the corpus
        samples = self._select_diverse_samples(corpus_chunks, max_samples, max_chars)

        if not samples:
            logger.warning("No corpus samples available for style extraction")
            return self._create_fallback_profile()

        # Format samples for analysis
        formatted_samples = self._format_samples(samples)

        system_prompt = STYLE_EXTRACTOR_PROMPT.format(corpus_samples=formatted_samples)

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": f"Extract the writing style profile for {self.persona_name} from these corpus excerpts.",
                    },
                ],
                temperature=0.3,  # Low temperature for consistent analysis
                max_tokens=3000,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            logger.debug(f"StyleExtractor raw response: {content[:500]}")

            style_profile = json.loads(content)

            # Validate required fields
            style_profile = self._validate_profile(style_profile)

            logger.info(
                f"Extracted style profile: {style_profile.get('style_summary', '')[:100]}"
            )

            return style_profile

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse style profile JSON: {e}")
            return self._create_fallback_profile()
        except Exception as e:
            logger.error(f"StyleExtractor error: {e}")
            return self._create_fallback_profile()

    def _select_diverse_samples(
        self,
        corpus_chunks: List[Dict[str, Any]],
        max_samples: int,
        max_chars: int,
    ) -> List[Dict[str, Any]]:
        """
        Select diverse samples from corpus chunks.

        Prioritizes variety across different sources/documents
        to capture the full range of the author's style.
        """
        # Flatten all chunks from search results
        all_chunks = []
        for search_result in corpus_chunks:
            for chunk in search_result.get("results", []):
                all_chunks.append(chunk)

        if not all_chunks:
            return []

        # Group by source document
        by_source = {}
        for chunk in all_chunks:
            metadata = chunk.get("metadata", {})
            source = metadata.get("file_path", "") or metadata.get("source", "unknown")
            source_name = source.split("/")[-1] if "/" in source else source

            if source_name not in by_source:
                by_source[source_name] = []
            by_source[source_name].append(chunk)

        # Select samples round-robin from each source for diversity
        selected = []
        char_count = 0
        source_indices = {src: 0 for src in by_source}

        while len(selected) < max_samples and char_count < max_chars:
            added_any = False
            for source, chunks in by_source.items():
                idx = source_indices[source]
                if idx < len(chunks):
                    chunk = chunks[idx]
                    text = chunk.get("text", "")

                    # Skip very short chunks (not useful for style analysis)
                    if len(text) < 100:
                        source_indices[source] += 1
                        continue

                    if char_count + len(text) <= max_chars:
                        selected.append(chunk)
                        char_count += len(text)
                        source_indices[source] += 1
                        added_any = True

                        if len(selected) >= max_samples:
                            break

            if not added_any:
                break

        logger.info(
            f"Selected {len(selected)} diverse samples from {len(by_source)} sources"
        )
        return selected

    def _format_samples(self, samples: List[Dict[str, Any]]) -> str:
        """Format samples for the prompt."""
        formatted = []
        for i, sample in enumerate(samples, 1):
            text = sample.get("text", "")
            metadata = sample.get("metadata", {})
            source = metadata.get("file_path", "").split("/")[-1] or "document"

            formatted.append(f"--- EXCERPT {i} (from {source}) ---\n{text}\n")

        return "\n".join(formatted)

    def _validate_profile(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and fill in missing fields with defaults."""
        defaults = {
            "sentence_patterns": {
                "average_length": "varied",
                "complexity": "mixed",
                "opening_patterns": [],
                "punctuation_style": "standard",
            },
            "vocabulary": {
                "register": "academic",
                "technical_level": "medium",
                "characteristic_words": [],
                "hedging_style": "moderate hedging",
            },
            "rhetorical_moves": {
                "introduction_pattern": "direct statement",
                "transition_style": "logical connectives",
                "emphasis_technique": "repetition and elaboration",
                "uses_rhetorical_questions": False,
            },
            "tone": {
                "overall": "thoughtful and analytical",
                "formality": "formal",
                "relationship_with_reader": "collegial",
                "first_person_usage": "occasional use of 'I' for personal positions",
            },
            "distinctive_features": [],
            "exemplar_sentences": [],
            "style_summary": "Academic writing with analytical depth.",
        }

        # Merge with defaults
        for key, default_value in defaults.items():
            if key not in profile:
                profile[key] = default_value
            elif isinstance(default_value, dict):
                for subkey, subvalue in default_value.items():
                    if subkey not in profile[key]:
                        profile[key][subkey] = subvalue

        return profile

    def _create_fallback_profile(self) -> Dict[str, Any]:
        """Create a minimal fallback profile if extraction fails."""
        return {
            "sentence_patterns": {
                "average_length": "varied",
                "complexity": "mixed",
                "opening_patterns": [
                    "Direct statement",
                    "Qualification followed by claim",
                ],
                "punctuation_style": "standard academic",
            },
            "vocabulary": {
                "register": "academic",
                "technical_level": "medium",
                "characteristic_words": [],
                "hedging_style": "appropriate academic hedging",
            },
            "rhetorical_moves": {
                "introduction_pattern": "context then claim",
                "transition_style": "logical progression",
                "emphasis_technique": "elaboration",
                "uses_rhetorical_questions": False,
            },
            "tone": {
                "overall": "analytical",
                "formality": "formal",
                "relationship_with_reader": "professional",
                "first_person_usage": "limited first person",
            },
            "distinctive_features": [],
            "exemplar_sentences": [],
            "style_summary": "Unable to extract detailed style profile. Using neutral academic defaults.",
        }

    def format_for_synthesis(self, style_profile: Dict[str, Any]) -> str:
        """
        Format the style profile as instructions for the synthesizer.

        Converts the structured profile into clear guidance
        for how to write in this style.
        """
        lines = []
        lines.append("WRITING STYLE PROFILE - Follow these patterns precisely:\n")

        # Sentence patterns
        sp = style_profile.get("sentence_patterns", {})
        lines.append("SENTENCE STRUCTURE:")
        lines.append(f"- Length: {sp.get('average_length', 'varied')}")
        lines.append(f"- Complexity: {sp.get('complexity', 'mixed')}")
        if sp.get("opening_patterns"):
            lines.append(f"- Common openings: {', '.join(sp['opening_patterns'][:5])}")
        lines.append(f"- Punctuation: {sp.get('punctuation_style', 'standard')}")
        lines.append("")

        # Vocabulary
        vocab = style_profile.get("vocabulary", {})
        lines.append("VOCABULARY & DICTION:")
        lines.append(f"- Register: {vocab.get('register', 'academic')}")
        lines.append(f"- Technical level: {vocab.get('technical_level', 'medium')}")
        if vocab.get("characteristic_words"):
            lines.append(
                f"- Characteristic phrases: {', '.join(vocab['characteristic_words'][:10])}"
            )
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
        lines.append(
            f"- Rhetorical questions: {'Yes' if rhet.get('uses_rhetorical_questions') else 'Rarely/No'}"
        )
        lines.append("")

        # Tone
        tone = style_profile.get("tone", {})
        lines.append("TONE & VOICE:")
        lines.append(f"- Overall tone: {tone.get('overall', 'analytical')}")
        lines.append(f"- Formality: {tone.get('formality', 'formal')}")
        lines.append(
            f"- Reader relationship: {tone.get('relationship_with_reader', 'collegial')}"
        )
        lines.append(
            f"- First person usage: {tone.get('first_person_usage', 'occasional')}"
        )
        lines.append("")

        # Distinctive features
        features = style_profile.get("distinctive_features", [])
        if features:
            lines.append("DISTINCTIVE SIGNATURES:")
            for feature in features[:7]:
                lines.append(f"- {feature}")
            lines.append("")

        # Exemplar sentences
        exemplars = style_profile.get("exemplar_sentences", [])
        if exemplars:
            lines.append("EXEMPLAR SENTENCES (mimic these patterns):")
            for ex in exemplars[:7]:
                lines.append(f'  "{ex}"')
            lines.append("")

        # Summary
        summary = style_profile.get("style_summary", "")
        if summary:
            lines.append(f"STYLE SUMMARY: {summary}")

        return "\n".join(lines)
