"""Multi-Agent Pipeline Orchestrator for Kimi K2

Orchestrates two different flows:

1. EMULATION MODE (normal queries):
    ┌─────────┐     ┌───────────┐     ┌───────────┐     ┌─────────────┐
    │ PLANNER │────▶│ RETRIEVER │────▶│ EVALUATOR │────▶│ SYNTHESIZER │
    └─────────┘     └───────────┘     └─────┬─────┘     └─────────────┘
                          ▲                 │
                          └─────────────────┘

2. CRITIC MODE (writing feedback with two-pass worldview immersion):

    PASS 1: WORLDVIEW IMMERSION
    ┌───────────┐     ┌───────────┐
    │ WORLDVIEW │────▶│ RETRIEVER │──┐
    │  PLANNER  │     │  (broad)  │  │
    └───────────┘     └───────────┘  │
                                     │ Worldview context
                                     ▼
    PASS 2: CRITICAL ANALYSIS
    ┌───────────┐     ┌─────────────┐     ┌─────────────┐
    │  CRITIC   │────▶│ CONTRASTIVE │────▶│ SYNTHESIZER │
    │  READER   │     │  RETRIEVER  │     │  (critic)   │
    └───────────┘     └─────────────┘     └─────────────┘
          │
          │ Reads writing with
          │ worldview context,
          │ identifies tensions
          ▼
    Generates targeted evidence searches
"""

import logging
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional

from ...config import get_config
from ..tools import CorpusSearchTool
from .critic_reader import CriticReader
from .evaluator import EvaluatorAgent
from .planner import PlannerAgent
from .retriever import Retriever
from .style_extractor import StyleExtractor
from .synthesizer import SynthesizerAgent
from .worldview_planner import WorldviewPlanner

logger = logging.getLogger(__name__)


class KimiMultiAgentPipeline:
    """
    Multi-agent pipeline for Kimi K2 that decomposes the monolithic
    agent loop into explicit stages with self-evaluation.

    Supports two modes:
    - Emulation mode: Standard query-plan-retrieve-synthesize flow
    - Critic mode: Two-pass worldview immersion + critical analysis
    """

    def __init__(
        self,
        persona_id: str,
        config=None,
        model: str = "kimi-k2-0711-preview",
        use_json_mode: bool = False,
        prompt_file: str = "base.txt",
        max_retrieval_loops: int = 3,
    ):
        """
        Initialize the multi-agent pipeline.

        Args:
            persona_id: Persona identifier (e.g., "jules")
            config: Optional configuration object
            model: Kimi model identifier
            use_json_mode: Whether final output should be JSON (for critic mode)
            prompt_file: Which prompt template to use
            max_retrieval_loops: Maximum number of retrieval iterations
        """
        if config is None:
            config = get_config()

        self.config = config
        self.persona_id = persona_id
        self.persona = config.get_persona(persona_id)
        self.model = model
        self.use_json_mode = use_json_mode
        self.prompt_file = prompt_file
        self.max_retrieval_loops = max_retrieval_loops

        # Initialize shared components
        self.search_tool = CorpusSearchTool(self.persona.collection_name, config)

        self.retriever = Retriever(
            search_tool=self.search_tool,
        )

        # Emulation mode components
        self.planner = PlannerAgent(
            persona_name=self.persona.name,
            model=model,
            config=config,
        )

        self.evaluator = EvaluatorAgent(
            persona_name=self.persona.name,
            model=model,
            config=config,
        )

        self.synthesizer = SynthesizerAgent(
            persona_id=persona_id,
            persona_name=self.persona.name,
            model=model,
            config=config,
            use_json_mode=use_json_mode,
            prompt_file=prompt_file,
        )

        # Critic mode components (lazy initialized)
        self._worldview_planner = None
        self._critic_reader = None
        self._style_extractor = None

        logger.info(
            f"Initialized KimiMultiAgentPipeline for {self.persona.name} "
            f"with model {model}, max_loops={max_retrieval_loops}, "
            f"critic_mode={use_json_mode}"
        )

    @property
    def worldview_planner(self) -> WorldviewPlanner:
        """Lazy initialization of worldview planner for critic mode."""
        if self._worldview_planner is None:
            self._worldview_planner = WorldviewPlanner(
                persona_name=self.persona.name,
                model=self.model,
                config=self.config,
            )
        return self._worldview_planner

    @property
    def critic_reader(self) -> CriticReader:
        """Lazy initialization of critic reader for critic mode."""
        if self._critic_reader is None:
            self._critic_reader = CriticReader(
                persona_name=self.persona.name,
                model=self.model,
                config=self.config,
            )
        return self._critic_reader

    @property
    def style_extractor(self) -> StyleExtractor:
        """Lazy initialization of style extractor for critic mode."""
        if self._style_extractor is None:
            self._style_extractor = StyleExtractor(
                persona_name=self.persona.name,
                model=self.model,
                config=self.config,
            )
        return self._style_extractor

    def respond(
        self,
        query: str,
        conversation_history: Optional[List[Dict]] = None,
    ) -> Dict:
        """
        Process a query through the multi-agent pipeline.

        Args:
            query: User query (or writing sample in critic mode)
            conversation_history: Optional conversation history

        Returns:
            Dict with response, tool_calls, iterations, and model info
        """
        if self.use_json_mode:
            return self._respond_critic_mode(query, conversation_history)
        else:
            return self._respond_emulation_mode(query, conversation_history)

    def _respond_emulation_mode(
        self,
        query: str,
        conversation_history: Optional[List[Dict]] = None,
    ) -> Dict:
        """
        Standard emulation mode: plan → retrieve → evaluate → synthesize.
        """
        all_tool_calls = []
        total_iterations = 0
        all_retrieved_chunks = []

        logger.info(f"Emulation pipeline starting for query: {query[:100]}...")

        # Stage 1: Planning
        logger.info("Stage 1: Planning search strategy")
        search_plan = self.planner.create_search_plan(
            query=query,
            conversation_history=conversation_history,
            is_critic_mode=False,
        )
        total_iterations += 1

        # Retrieval loop with evaluation
        loop_num = 0
        for loop_num in range(self.max_retrieval_loops):
            logger.info(f"Retrieval loop {loop_num + 1}/{self.max_retrieval_loops}")

            # Stage 2: Retrieval
            logger.info("Stage 2: Executing search plan")
            retrieved_chunks = self.retriever.execute_search_plan(search_plan)
            all_retrieved_chunks.extend(retrieved_chunks)

            # Log retrieval stats
            for search_result in retrieved_chunks:
                all_tool_calls.append(
                    {
                        "tool": "search_corpus",
                        "input": {
                            "query": search_result["query"],
                            "k": search_result["k"],
                        },
                        "result_count": len(search_result["results"]),
                    }
                )
            total_iterations += 1

            # Stage 3: Evaluation
            logger.info("Stage 3: Evaluating retrieval sufficiency")
            evaluation = self.evaluator.evaluate(
                query=query,
                retrieved_chunks=all_retrieved_chunks,
                is_critic_mode=False,
                loop_number=loop_num + 1,
            )
            total_iterations += 1

            if evaluation["sufficient"]:
                logger.info(
                    f"Evaluation passed: {evaluation.get('reasoning', '')[:100]}"
                )
                break
            else:
                logger.info(
                    f"Evaluation failed: {evaluation.get('reasoning', '')[:100]}"
                )
                if loop_num < self.max_retrieval_loops - 1:
                    if evaluation.get("additional_searches"):
                        search_plan = evaluation["additional_searches"]
                        logger.info(f"Planning {len(search_plan)} additional searches")
                    else:
                        logger.warning(
                            "No additional searches suggested, breaking loop"
                        )
                        break

        # Stage 4: Synthesis
        logger.info("Stage 4: Synthesizing response")
        response = self.synthesizer.synthesize(
            query=query,
            retrieved_chunks=all_retrieved_chunks,
            conversation_history=conversation_history,
        )
        total_iterations += 1

        logger.info(
            f"Emulation pipeline completed in {total_iterations} iterations "
            f"with {len(all_tool_calls)} tool calls"
        )

        return {
            "response": response,
            "tool_calls": all_tool_calls,
            "iterations": total_iterations,
            "model": f"KimiMultiAgentPipeline({self.model})",
            "retrieval_loops": loop_num + 1,
            "total_chunks_retrieved": sum(tc["result_count"] for tc in all_tool_calls),
            "mode": "emulation",
        }

    def _respond_critic_mode(
        self,
        writing_sample: str,
        conversation_history: Optional[List[Dict]] = None,
    ) -> Dict:
        """
        Two-pass critic mode with worldview immersion.

        Pass 1: Immerse in persona's worldview (broad retrieval)
        Pass 2: Critical analysis with targeted evidence retrieval
        """
        all_tool_calls = []
        total_iterations = 0

        logger.info(
            f"Critic pipeline starting for writing sample: {len(writing_sample)} chars"
        )

        # ================================================================
        # PASS 1: WORLDVIEW IMMERSION
        # ================================================================
        logger.info("=== PASS 1: WORLDVIEW IMMERSION ===")

        # Extract topic hint for prioritization (optional)
        topic_hint = self.worldview_planner.extract_topic_hint(writing_sample)
        total_iterations += 1

        # Generate worldview immersion search plan
        logger.info("Stage 1.1: Planning worldview immersion")
        worldview_plan = self.worldview_planner.create_immersion_plan(
            writing_topic_hint=topic_hint,
        )
        total_iterations += 1

        # Execute worldview retrieval
        logger.info(f"Stage 1.2: Executing {len(worldview_plan)} worldview searches")
        worldview_chunks = self.retriever.execute_search_plan(worldview_plan)

        for search_result in worldview_chunks:
            all_tool_calls.append(
                {
                    "tool": "search_corpus",
                    "input": {
                        "query": search_result["query"],
                        "k": search_result["k"],
                    },
                    "result_count": len(search_result["results"]),
                    "purpose": "worldview_immersion",
                }
            )
        total_iterations += 1

        worldview_total = sum(len(sr["results"]) for sr in worldview_chunks)
        logger.info(f"Worldview immersion complete: {worldview_total} chunks retrieved")

        # ================================================================
        # STYLE EXTRACTION (analyze HOW the persona writes)
        # ================================================================
        logger.info("=== STYLE EXTRACTION ===")
        logger.info("Stage 1.3: Extracting writing style from corpus")

        style_profile = self.style_extractor.extract_style(worldview_chunks)
        total_iterations += 1

        logger.info(
            f"Style profile extracted: {style_profile.get('style_summary', '')[:100]}"
        )

        # ================================================================
        # PASS 2: CRITICAL ANALYSIS
        # ================================================================
        logger.info("=== PASS 2: CRITICAL ANALYSIS ===")

        # Critic Reader analyzes writing with worldview context
        logger.info("Stage 2.1: Critical reading with worldview context")
        critique = self.critic_reader.analyze(
            writing_sample=writing_sample,
            worldview_chunks=worldview_chunks,
        )
        total_iterations += 1

        logger.info(
            f"Critique identified {len(critique['issues'])} issues: "
            f"{critique['overall_assessment'][:100]}"
        )

        # Execute targeted evidence retrieval
        evidence_chunks = []
        if critique.get("evidence_searches"):
            logger.info(
                f"Stage 2.2: Executing {len(critique['evidence_searches'])} evidence searches"
            )
            evidence_chunks = self.retriever.execute_search_plan(
                critique["evidence_searches"]
            )

            for search_result in evidence_chunks:
                all_tool_calls.append(
                    {
                        "tool": "search_corpus",
                        "input": {
                            "query": search_result["query"],
                            "k": search_result["k"],
                        },
                        "result_count": len(search_result["results"]),
                        "purpose": "contrastive_evidence",
                    }
                )
            total_iterations += 1

            evidence_total = sum(len(sr["results"]) for sr in evidence_chunks)
            logger.info(
                f"Evidence retrieval complete: {evidence_total} chunks retrieved"
            )

        # ================================================================
        # SYNTHESIS
        # ================================================================
        logger.info("Stage 3: Synthesizing critical feedback")

        # Combine all context for synthesis
        all_context = worldview_chunks + evidence_chunks

        response = self.synthesizer.synthesize_critic(
            writing_sample=writing_sample,
            worldview_chunks=worldview_chunks,
            critique=critique,
            evidence_chunks=evidence_chunks,
            style_profile=style_profile,
            conversation_history=conversation_history,
        )
        total_iterations += 1

        logger.info(
            f"Critic pipeline completed in {total_iterations} iterations "
            f"with {len(all_tool_calls)} tool calls"
        )

        return {
            "response": response,
            "tool_calls": all_tool_calls,
            "iterations": total_iterations,
            "model": f"KimiMultiAgentPipeline({self.model})",
            "mode": "critic",
            "worldview_chunks": worldview_total,
            "evidence_chunks": sum(len(sr["results"]) for sr in evidence_chunks)
            if evidence_chunks
            else 0,
            "issues_identified": len(critique["issues"]),
            "overall_assessment": critique["overall_assessment"],
        }

    def respond_stream(
        self,
        query: str,
        conversation_history: Optional[List[Dict]] = None,
    ) -> Generator[Dict[str, Any], None, Dict]:
        """
        Stream response from the pipeline with status updates.

        Args:
            query: User query (or writing sample in critic mode)
            conversation_history: Optional conversation history

        Yields:
            Dict with either:
                - {"type": "text", "content": str} - Text chunk
                - {"type": "status", "message": str, "stage": str} - Status update

        Returns:
            Final result dict with metadata
        """
        if self.use_json_mode:
            yield from self._respond_stream_critic_mode(query, conversation_history)
        else:
            yield from self._respond_stream_emulation_mode(query, conversation_history)

    def _respond_stream_emulation_mode(
        self,
        query: str,
        conversation_history: Optional[List[Dict]] = None,
    ) -> Generator[Dict[str, Any], None, Dict]:
        """Stream emulation mode response."""
        all_tool_calls = []
        total_iterations = 0
        all_retrieved_chunks = []

        logger.info(f"Emulation pipeline streaming for query: {query[:100]}...")

        # Stage 1: Planning
        yield {
            "type": "status",
            "message": "Analyzing query and planning search strategy...",
            "stage": "planner",
        }

        search_plan = self.planner.create_search_plan(
            query=query,
            conversation_history=conversation_history,
            is_critic_mode=False,
        )
        total_iterations += 1

        yield {
            "type": "status",
            "message": f"Search plan: {len(search_plan)} queries planned",
            "stage": "planner",
        }

        # Retrieval loop with evaluation
        loop_num = 0
        for loop_num in range(self.max_retrieval_loops):
            yield {
                "type": "status",
                "message": f"Retrieval loop {loop_num + 1}/{self.max_retrieval_loops}",
                "stage": "retriever",
            }

            # Stage 2: Retrieval
            for search in search_plan:
                yield {
                    "type": "status",
                    "message": f'Searching: "{search["query"][:50]}..." (k={search["k"]})',
                    "stage": "retriever",
                }

            retrieved_chunks = self.retriever.execute_search_plan(search_plan)
            all_retrieved_chunks.extend(retrieved_chunks)

            # Log retrieval stats
            total_results = 0
            for search_result in retrieved_chunks:
                result_count = len(search_result["results"])
                total_results += result_count
                all_tool_calls.append(
                    {
                        "tool": "search_corpus",
                        "input": {
                            "query": search_result["query"],
                            "k": search_result["k"],
                        },
                        "result_count": result_count,
                    }
                )

            yield {
                "type": "status",
                "message": f"Retrieved {total_results} chunks from {len(search_plan)} searches",
                "stage": "retriever",
            }
            total_iterations += 1

            # Stage 3: Evaluation
            yield {
                "type": "status",
                "message": "Evaluating if enough context was gathered...",
                "stage": "evaluator",
            }

            evaluation = self.evaluator.evaluate(
                query=query,
                retrieved_chunks=all_retrieved_chunks,
                is_critic_mode=False,
                loop_number=loop_num + 1,
            )
            total_iterations += 1

            if evaluation["sufficient"]:
                yield {
                    "type": "status",
                    "message": f"Context sufficient: {evaluation.get('reasoning', '')[:80]}",
                    "stage": "evaluator",
                }
                break
            else:
                yield {
                    "type": "status",
                    "message": f"Need more context: {evaluation.get('reasoning', '')[:80]}",
                    "stage": "evaluator",
                }
                if loop_num < self.max_retrieval_loops - 1:
                    if evaluation.get("additional_searches"):
                        search_plan = evaluation["additional_searches"]
                        yield {
                            "type": "status",
                            "message": f"Planning {len(search_plan)} additional searches",
                            "stage": "evaluator",
                        }
                    else:
                        yield {
                            "type": "status",
                            "message": "No additional searches suggested, proceeding to synthesis",
                            "stage": "evaluator",
                        }
                        break

        # Stage 4: Synthesis (with streaming)
        yield {
            "type": "status",
            "message": "Synthesizing response in corpus style...",
            "stage": "synthesizer",
        }

        # Collect the streamed response text
        collected_response = ""
        for chunk in self.synthesizer.synthesize_stream(
            query=query,
            retrieved_chunks=all_retrieved_chunks,
            conversation_history=conversation_history,
        ):
            if chunk.get("type") == "text":
                collected_response += chunk.get("content", "")
            yield chunk

        total_iterations += 1

        logger.info(
            f"Emulation synthesis complete: {len(collected_response)} chars collected"
        )

        # Final result - include the collected response
        yield {
            "type": "result",
            "response": collected_response,  # Include the assembled response
            "tool_calls": all_tool_calls,
            "iterations": total_iterations,
            "model": f"KimiMultiAgentPipeline({self.model})",
            "retrieval_loops": loop_num + 1,
            "total_chunks_retrieved": sum(tc["result_count"] for tc in all_tool_calls),
            "mode": "emulation",
        }

    def _respond_stream_critic_mode(
        self,
        writing_sample: str,
        conversation_history: Optional[List[Dict]] = None,
    ) -> Generator[Dict[str, Any], None, Dict]:
        """Stream critic mode response with two-pass worldview immersion."""
        all_tool_calls = []
        total_iterations = 0

        logger.info(
            f"Critic pipeline streaming for writing sample: {len(writing_sample)} chars"
        )

        # ================================================================
        # PASS 1: WORLDVIEW IMMERSION
        # ================================================================
        yield {
            "type": "status",
            "message": "=== PASS 1: WORLDVIEW IMMERSION ===",
            "stage": "worldview",
        }

        yield {
            "type": "status",
            "message": "Extracting topic from writing sample...",
            "stage": "worldview",
        }
        topic_hint = self.worldview_planner.extract_topic_hint(writing_sample)
        total_iterations += 1

        if topic_hint:
            yield {
                "type": "status",
                "message": f"Topic identified: {topic_hint[:80]}",
                "stage": "worldview",
            }

        yield {
            "type": "status",
            "message": "Planning worldview immersion searches...",
            "stage": "worldview",
        }
        worldview_plan = self.worldview_planner.create_immersion_plan(
            writing_topic_hint=topic_hint,
        )
        total_iterations += 1

        yield {
            "type": "status",
            "message": f"Worldview plan: {len(worldview_plan)} queries for deep immersion",
            "stage": "worldview",
        }

        # Execute worldview retrieval
        for search in worldview_plan[:5]:  # Show first 5
            yield {
                "type": "status",
                "message": f'[{search.get("category", "general")}] "{search["query"][:40]}..."',
                "stage": "worldview",
            }

        worldview_chunks = self.retriever.execute_search_plan(worldview_plan)

        for search_result in worldview_chunks:
            all_tool_calls.append(
                {
                    "tool": "search_corpus",
                    "input": {
                        "query": search_result["query"],
                        "k": search_result["k"],
                    },
                    "result_count": len(search_result["results"]),
                    "purpose": "worldview_immersion",
                }
            )
        total_iterations += 1

        worldview_total = sum(len(sr["results"]) for sr in worldview_chunks)
        yield {
            "type": "status",
            "message": f"Worldview immersion complete: {worldview_total} chunks loaded",
            "stage": "worldview",
        }

        # ================================================================
        # STYLE EXTRACTION (analyze HOW the persona writes)
        # ================================================================
        yield {
            "type": "status",
            "message": "=== STYLE EXTRACTION ===",
            "stage": "style",
        }

        yield {
            "type": "status",
            "message": "Analyzing writing style from corpus...",
            "stage": "style",
        }

        style_profile = self.style_extractor.extract_style(worldview_chunks)
        total_iterations += 1

        style_summary = style_profile.get("style_summary", "Style extracted")
        yield {
            "type": "status",
            "message": f"Style profile: {style_summary[:80]}",
            "stage": "style",
        }

        # ================================================================
        # PASS 2: CRITICAL ANALYSIS
        # ================================================================
        yield {
            "type": "status",
            "message": "=== PASS 2: CRITICAL ANALYSIS ===",
            "stage": "critic",
        }

        yield {
            "type": "status",
            "message": "Reading writing with inhabited worldview perspective...",
            "stage": "critic",
        }

        critique = self.critic_reader.analyze(
            writing_sample=writing_sample,
            worldview_chunks=worldview_chunks,
        )
        total_iterations += 1

        yield {
            "type": "status",
            "message": f"Identified {len(critique['issues'])} issues to address",
            "stage": "critic",
        }

        # Show identified issues
        for i, issue in enumerate(critique["issues"][:5]):  # Show first 5
            issue_type = issue.get("type", "general")
            severity = issue.get("severity", "medium")
            yield {
                "type": "status",
                "message": f"  [{severity}] {issue_type}: {issue.get('claim_or_passage', '')[:50]}...",
                "stage": "critic",
            }

        # Execute targeted evidence retrieval
        evidence_chunks = []
        if critique.get("evidence_searches"):
            yield {
                "type": "status",
                "message": f"Gathering evidence for {len(critique['evidence_searches'])} critiques...",
                "stage": "evidence",
            }

            for search in critique["evidence_searches"][:3]:  # Show first 3
                yield {
                    "type": "status",
                    "message": f'Evidence search: "{search["query"][:50]}..."',
                    "stage": "evidence",
                }

            evidence_chunks = self.retriever.execute_search_plan(
                critique["evidence_searches"]
            )

            for search_result in evidence_chunks:
                all_tool_calls.append(
                    {
                        "tool": "search_corpus",
                        "input": {
                            "query": search_result["query"],
                            "k": search_result["k"],
                        },
                        "result_count": len(search_result["results"]),
                        "purpose": "contrastive_evidence",
                    }
                )
            total_iterations += 1

            evidence_total = sum(len(sr["results"]) for sr in evidence_chunks)
            yield {
                "type": "status",
                "message": f"Evidence gathered: {evidence_total} supporting chunks",
                "stage": "evidence",
            }

        # ================================================================
        # SYNTHESIS
        # ================================================================
        yield {
            "type": "status",
            "message": "Synthesizing critical feedback...",
            "stage": "synthesizer",
        }

        # Collect the streamed response text
        collected_response = ""
        for chunk in self.synthesizer.synthesize_critic_stream(
            writing_sample=writing_sample,
            worldview_chunks=worldview_chunks,
            critique=critique,
            evidence_chunks=evidence_chunks,
            style_profile=style_profile,
            conversation_history=conversation_history,
        ):
            if chunk.get("type") == "text":
                collected_response += chunk.get("content", "")
            yield chunk

        total_iterations += 1

        logger.info(
            f"Critic synthesis complete: {len(collected_response)} chars collected"
        )

        # Final result - include the collected response
        yield {
            "type": "result",
            "response": collected_response,  # Critical: include the assembled response
            "tool_calls": all_tool_calls,
            "iterations": total_iterations,
            "model": f"KimiMultiAgentPipeline({self.model})",
            "mode": "critic",
            "worldview_chunks": worldview_total,
            "evidence_chunks": sum(len(sr["results"]) for sr in evidence_chunks)
            if evidence_chunks
            else 0,
            "issues_identified": len(critique["issues"]),
        }
