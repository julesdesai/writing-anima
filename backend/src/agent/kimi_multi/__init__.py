"""Kimi K2 Multi-Agent Pipeline

A decomposed agent architecture for Kimi K2 that breaks the monolithic
agentic loop into explicit stages.

EMULATION MODE (standard queries):
1. Planner: Analyzes query and creates search plan
2. Retriever: Executes searches deterministically
3. Evaluator: Assesses if enough context was gathered
4. Synthesizer: Generates final response

CRITIC MODE (writing feedback with two-pass worldview immersion):
1. WorldviewPlanner: Plans broad retrieval for persona immersion
2. Retriever: Executes worldview immersion searches
3. CriticReader: Reads writing with inhabited perspective, identifies tensions
4. Retriever: Executes targeted evidence searches
5. Synthesizer: Generates grounded critical feedback

This avoids K2's unreliable tool calling by making retrieval explicit
and adding self-evaluation loops for quality assurance.
"""

from .critic_reader import CriticReader
from .evaluator import EvaluatorAgent
from .pipeline import KimiMultiAgentPipeline
from .planner import PlannerAgent
from .retriever import Retriever
from .style_extractor import StyleExtractor
from .synthesizer import SynthesizerAgent
from .worldview_planner import WorldviewPlanner

__all__ = [
    "KimiMultiAgentPipeline",
    "PlannerAgent",
    "Retriever",
    "EvaluatorAgent",
    "SynthesizerAgent",
    "WorldviewPlanner",
    "CriticReader",
    "StyleExtractor",
]
