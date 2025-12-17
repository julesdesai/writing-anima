"""Deterministic Retriever for Kimi K2 Multi-Agent Pipeline

Executes search plans created by the Planner agent.
This is NOT an LLM agent - it's deterministic code that executes
the search tool based on the plan.
"""

import logging
from typing import Any, Dict, List

from ..tools import CorpusSearchTool

logger = logging.getLogger(__name__)


class Retriever:
    """
    Deterministic search executor.

    Takes a search plan from the Planner and executes each search
    against the corpus using the CorpusSearchTool.

    This is intentionally NOT an LLM - we don't want K2 making
    tool call decisions here. The plan is executed exactly as specified.
    """

    def __init__(self, search_tool: CorpusSearchTool):
        """
        Initialize the retriever.

        Args:
            search_tool: Configured corpus search tool
        """
        self.search_tool = search_tool
        logger.info("Initialized Retriever")

    def execute_search_plan(
        self,
        search_plan: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Execute all searches in the plan.

        Args:
            search_plan: List of search specifications from Planner
                [{"purpose": str, "query": str, "k": int}, ...]

        Returns:
            List of search results with metadata:
            [{
                "purpose": str,
                "query": str,
                "k": int,
                "results": [{"text": str, "metadata": dict, "similarity": float}, ...]
            }, ...]
        """
        all_results = []

        for i, search in enumerate(search_plan):
            query = search.get("query", "")
            k = search.get("k", 60)
            purpose = search.get("purpose", "content")

            if not query:
                logger.warning(f"Search {i} has empty query, skipping")
                continue

            logger.info(
                f"Executing search {i + 1}/{len(search_plan)}: "
                f'purpose={purpose}, query="{query[:60]}...", k={k}'
            )

            try:
                results = self.search_tool.search(
                    query=query,
                    k=k,
                )

                logger.info(f"Search returned {len(results)} results")

                # Log preview of top results
                if results:
                    for j, result in enumerate(results[:3]):
                        preview = result["text"][:80].replace("\n", " ")
                        score = result.get("similarity", 0)
                        logger.debug(f"  Result {j + 1}: [{score:.3f}] {preview}...")

                all_results.append(
                    {
                        "purpose": purpose,
                        "query": query,
                        "k": k,
                        "results": results,
                    }
                )

            except Exception as e:
                logger.error(f"Search {i + 1} failed: {e}")
                all_results.append(
                    {
                        "purpose": purpose,
                        "query": query,
                        "k": k,
                        "results": [],
                        "error": str(e),
                    }
                )

        # Log summary
        total_chunks = sum(len(r["results"]) for r in all_results)
        logger.info(
            f"Retrieval complete: {len(search_plan)} searches, "
            f"{total_chunks} total chunks retrieved"
        )

        return all_results

    def format_chunks_for_context(
        self,
        retrieved_chunks: List[Dict[str, Any]],
        max_chars: int = 50000,
    ) -> Dict[str, str]:
        """
        Format retrieved chunks into context strings organized by purpose.

        Args:
            retrieved_chunks: Results from execute_search_plan
            max_chars: Maximum characters per purpose category

        Returns:
            Dict mapping purpose to formatted context string
        """
        contexts = {}

        for search_result in retrieved_chunks:
            purpose = search_result.get("purpose", "content")
            results = search_result.get("results", [])

            if purpose not in contexts:
                contexts[purpose] = []

            for result in results:
                text = result.get("text", "")
                metadata = result.get("metadata", {})
                source = metadata.get("source", "unknown")
                file_path = metadata.get("file_path", "")

                # Extract filename from path
                file_name = file_path.split("/")[-1] if file_path else "unknown"

                formatted = f"[{source}: {file_name}]\n{text}\n"
                contexts[purpose].append(formatted)

        # Join and truncate
        formatted_contexts = {}
        for purpose, chunks in contexts.items():
            combined = "\n---\n".join(chunks)
            if len(combined) > max_chars:
                combined = combined[:max_chars] + "\n... [truncated]"
            formatted_contexts[purpose] = combined

        return formatted_contexts

    def get_unique_chunks(
        self,
        retrieved_chunks: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Deduplicate chunks across all search results.

        Args:
            retrieved_chunks: Results from execute_search_plan

        Returns:
            List of unique chunks with purpose tags
        """
        seen_texts = set()
        unique_chunks = []

        for search_result in retrieved_chunks:
            purpose = search_result.get("purpose", "content")

            for result in search_result.get("results", []):
                text = result.get("text", "")

                # Use first 200 chars as dedup key
                dedup_key = text[:200].strip()

                if dedup_key not in seen_texts:
                    seen_texts.add(dedup_key)
                    unique_chunks.append(
                        {
                            **result,
                            "purpose": purpose,
                            "search_query": search_result.get("query", ""),
                        }
                    )

        logger.info(
            f"Deduplication: {sum(len(r['results']) for r in retrieved_chunks)} -> "
            f"{len(unique_chunks)} unique chunks"
        )

        return unique_chunks
