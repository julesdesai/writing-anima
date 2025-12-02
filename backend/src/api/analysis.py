"""
Writing analysis API endpoints using Anima
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import Dict, List
import logging
import time
import json
import uuid
import re

from .models import (
    AnalysisRequest,
    AnalysisResponse,
    FeedbackItem,
    FeedbackType,
    FeedbackSeverity,
    StreamStatus,
    StreamFeedback,
    StreamComplete
)
from .personas import personas_store, db as firestore_db
from ..agent.factory import AgentFactory
from ..config import get_config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["analysis"])


def get_persona(persona_id: str, user_id: str) -> Dict:
    """Get persona from Firestore or fallback to memory"""
    persona = None

    if firestore_db is not None:
        # Try Firestore first
        doc = firestore_db.collection('personas').document(persona_id).get()
        if doc.exists:
            persona = doc.to_dict()
    else:
        # Fallback to memory
        if persona_id in personas_store:
            persona = personas_store[persona_id]

    if not persona:
        return None

    # Verify ownership
    if persona.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to use this persona")

    return persona


def parse_json_feedback(response_text: str, persona_name: str, model: str = None) -> List[FeedbackItem]:
    """
    Parse JSON feedback from Anima's structured output.

    Args:
        response_text: JSON string from Anima
        persona_name: Name of the persona for logging
        model: Model identifier that generated the feedback (e.g., "gpt-5", "kimi-k2")

    Returns:
        List of FeedbackItem objects
    """
    try:
        # Log raw response for debugging
        logger.info(f"Raw JSON response (first 2000 chars): {response_text[:2000]}")

        # Preprocess: Extract JSON from response in case model added preamble text
        # Look for JSON array [ ... ] or object { ... }
        json_text = response_text.strip()

        # Remove markdown code fences if present
        if json_text.startswith("```json"):
            json_text = json_text[7:]
        elif json_text.startswith("```"):
            json_text = json_text[3:]
        if json_text.endswith("```"):
            json_text = json_text[:-3]
        json_text = json_text.strip()

        # If response doesn't start with [ or {, try to find JSON array
        if not json_text.startswith('[') and not json_text.startswith('{'):
            # Find first [ and last ] to extract JSON array
            start_idx = json_text.find('[')
            end_idx = json_text.rfind(']')
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                json_text = json_text[start_idx:end_idx + 1]
                logger.info(f"Extracted JSON array from response (removed preamble)")
            else:
                # Try to find JSON object
                start_idx = json_text.find('{')
                end_idx = json_text.rfind('}')
                if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                    json_text = json_text[start_idx:end_idx + 1]
                    logger.info(f"Extracted JSON object from response (removed preamble)")

        # Parse JSON response
        feedback_data = json.loads(json_text)

        # Handle both array and object responses
        # With strict schema, it should be wrapped in {"feedback": [...]}
        if isinstance(feedback_data, dict):
            # If it's wrapped in a key, try to extract the array
            # Prioritize 'feedback' since that's what our strict schema uses
            for key in ['feedback', 'items', 'analysis', 'response']:
                if key in feedback_data and isinstance(feedback_data[key], list):
                    feedback_data = feedback_data[key]
                    logger.info(f"Extracted feedback array from '{key}' wrapper")
                    break

        if not isinstance(feedback_data, list):
            logger.error(f"Expected JSON array, got: {type(feedback_data)}")
            return []

        feedback_items = []
        for i, item in enumerate(feedback_data):
            try:
                logger.info(f"Parsing item {i}: keys={list(item.keys())}")
                logger.info(f"Item {i} sample: type={item.get('type')}, title={item.get('title', '')[:50]}")
                # Log content field specifically
                content_value = item.get('content', '')
                logger.info(f"Item {i} content length: {len(content_value)}, preview: {content_value[:100] if content_value else '[EMPTY]'}")

                # Handle both expected schema and actual model output
                # Model uses many different field names - check all variants
                # For content field, try: content, description, feedback, recommendation, action, suggestion, issue, rationale
                content = (item.get('content') or
                          item.get('description') or  # Kimi uses this
                          item.get('feedback') or
                          item.get('recommendation') or
                          item.get('action') or
                          item.get('suggestion') or
                          item.get('rationale') or '')

                # For title field, try: title, item, issue, area, location
                title = (item.get('title') or
                        item.get('item') or
                        item.get('issue') or
                        item.get('area') or
                        item.get('location') or
                        'Feedback')

                # For sources field, try: corpus_references, grounding, reference
                sources = (item.get('corpus_references') or
                          item.get('grounding') or
                          item.get('reference') or [])

                # For positions field, try: text_positions, positions
                raw_positions = item.get('text_positions') or item.get('positions') or []
                positions = []
                if isinstance(raw_positions, list):
                    for pos in raw_positions:
                        if isinstance(pos, dict) and 'start' in pos and 'end' in pos and 'text' in pos:
                            from .models import TextPosition
                            positions.append(TextPosition(
                                start=pos['start'],
                                end=pos['end'],
                                text=pos['text']
                            ))

                # For corpus_sources field - actual quoted passages from corpus
                raw_corpus_sources = item.get('corpus_sources') or []
                corpus_sources = []
                if isinstance(raw_corpus_sources, list):
                    for src in raw_corpus_sources:
                        if isinstance(src, dict) and 'text' in src:
                            from .models import CorpusSource
                            corpus_sources.append(CorpusSource(
                                text=src.get('text', ''),
                                source_file=src.get('source_file'),
                                relevance=src.get('relevance')
                            ))

                # Validate and create FeedbackItem
                # Handle unknown feedback types by falling back to 'suggestion'
                raw_type = item.get('type', 'suggestion')
                try:
                    feedback_type = FeedbackType(raw_type)
                except ValueError:
                    logger.warning(f"Unknown feedback type '{raw_type}', falling back to 'suggestion'")
                    feedback_type = FeedbackType.SUGGESTION

                # Handle severity mapping (Kimi uses minor/moderate/major)
                raw_severity = item.get('severity', 'medium')
                severity_map = {
                    'minor': 'low',
                    'moderate': 'medium',
                    'major': 'high',
                    'critical': 'high',
                }
                mapped_severity = severity_map.get(raw_severity, raw_severity)
                try:
                    severity = FeedbackSeverity(mapped_severity)
                except ValueError:
                    logger.warning(f"Unknown severity '{raw_severity}', falling back to 'medium'")
                    severity = FeedbackSeverity.MEDIUM

                feedback_items.append(
                    FeedbackItem(
                        id=str(uuid.uuid4()),
                        type=feedback_type,
                        category=item.get('category', 'general'),
                        title=title[:100],  # Limit title length
                        content=content,
                        severity=severity,
                        confidence=float(item.get('confidence', 0.7)),
                        sources=sources if isinstance(sources, list) else [],
                        corpus_sources=corpus_sources,
                        position=item.get('position'),
                        positions=positions,
                        model=model
                    )
                )
            except Exception as e:
                logger.error(f"Error parsing feedback item: {e}, item: {item}")
                continue

        logger.info(f"Parsed {len(feedback_items)} feedback items from JSON")
        return feedback_items

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON feedback: {e}")
        logger.error(f"Response text: {response_text[:500]}")

        # Fallback: try to extract any JSON array from the text
        import re
        json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
        if json_match:
            try:
                feedback_data = json.loads(json_match.group(0))
                return parse_json_feedback(json.dumps(feedback_data), persona_name, model)
            except:
                pass

        return []
    except Exception as e:
        logger.error(f"Unexpected error parsing feedback: {e}")
        return []


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_writing(request: AnalysisRequest):
    """
    Analyze writing with Anima and return structured feedback
    """
    # Get and verify persona
    persona = get_persona(request.persona_id, request.user_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")

    try:
        start_time = time.time()

        # Get configuration
        config = get_config()

        # Add persona to config dynamically if not present
        # This allows the BaseAgent to find it when it calls config.get_persona()
        if request.persona_id not in config.personas:
            from ..config import PersonaConfig
            persona_config = PersonaConfig(
                name=persona["name"],
                corpus_path="",  # Not needed for dynamic personas
                collection_name=persona["collection_name"],
                description=persona.get("description", "")
            )
            config.personas[request.persona_id] = persona_config

        # Get the model from persona settings, fallback to config primary
        selected_model = persona.get("model", config.model.primary)
        logger.info(f"Using model: {selected_model} for persona: {persona['name']}")

        # Create agent using factory with persona's selected model
        agent = AgentFactory.create(
            model_name=selected_model,
            persona_id=request.persona_id,
            config=config,
        )
        # Set JSON mode and prompt file for structured feedback
        agent.use_json_mode = True
        agent.prompt_file = "writing_critic.txt"

        # Build analysis query with context
        query = f"Please analyze the following writing"

        if request.context and request.context.purpose:
            query += f" (Purpose: {request.context.purpose})"

        if request.context and request.context.criteria:
            criteria_text = ", ".join(request.context.criteria)
            query += f"\nEvaluation criteria: {criteria_text}"

        query += f"\n\nText to analyze:\n{request.content}"

        query += "\n\nProvide specific, actionable feedback grounded in your corpus. Return your response as a JSON array of feedback items as specified in your instructions."

        # Get response from Anima
        conversation_history = []
        if request.context and request.context.feedback_history:
            # Convert feedback history to conversation format
            for item in request.context.feedback_history[-3:]:  # Last 3 exchanges
                if item.get("role") == "user":
                    conversation_history.append({"role": "user", "content": item["content"]})
                elif item.get("role") == "assistant":
                    conversation_history.append({"role": "assistant", "content": item["content"]})

        result = agent.respond(query, conversation_history=conversation_history)

        # Parse JSON feedback
        response_text = result.get("response", "")
        feedback_items = parse_json_feedback(response_text, persona["name"], selected_model)

        # Limit to max items
        feedback_items = feedback_items[:request.max_feedback_items]

        processing_time = time.time() - start_time

        return AnalysisResponse(
            persona_id=request.persona_id,
            persona_name=persona["name"],
            feedback=feedback_items,
            metadata={
                "iterations": result.get("iteration_count", 0),
                "tool_calls": result.get("total_tool_calls", 0),
                "model": config.model.primary
            },
            processing_time=processing_time
        )

    except Exception as e:
        logger.error(f"Error analyzing writing: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.websocket("/analyze/stream")
async def analyze_writing_stream(websocket: WebSocket):
    """
    Analyze writing with streaming updates via WebSocket
    """
    await websocket.accept()

    try:
        # Receive request data
        request_data = await websocket.receive_text()
        request_dict = json.loads(request_data)

        # Validate request
        try:
            request = AnalysisRequest(**request_dict)
        except Exception as e:
            await websocket.send_json({
                "type": "error",
                "message": f"Invalid request: {str(e)}"
            })
            await websocket.close()
            return

        # Get and verify persona
        try:
            persona = get_persona(request.persona_id, request.user_id)
            if not persona:
                await websocket.send_json({
                    "type": "error",
                    "message": "Persona not found"
                })
                await websocket.close()
                return
        except HTTPException as e:
            await websocket.send_json({
                "type": "error",
                "message": e.detail
            })
            await websocket.close()
            return

        start_time = time.time()

        # Send initial status
        await websocket.send_json(
            StreamStatus(
                message="Initializing Anima...",
                progress=0.1
            ).dict()
        )

        # Get configuration and create agent with JSON mode
        config = get_config()

        # Add persona to config dynamically if not present
        # This allows the BaseAgent to find it when it calls config.get_persona()
        if request.persona_id not in config.personas:
            from ..config import PersonaConfig
            persona_config = PersonaConfig(
                name=persona["name"],
                corpus_path="",  # Not needed for dynamic personas
                collection_name=persona["collection_name"],
                description=persona.get("description", "")
            )
            config.personas[request.persona_id] = persona_config

        # Get the model from persona settings, fallback to config primary
        selected_model = persona.get("model", config.model.primary)
        logger.info(f"Using model: {selected_model} for persona: {persona['name']}")

        # Create agent using factory with persona's selected model
        agent = AgentFactory.create(
            model_name=selected_model,
            persona_id=request.persona_id,
            config=config,
        )
        # Set JSON mode and prompt file for structured feedback
        agent.use_json_mode = True
        agent.prompt_file = "writing_critic.txt"

        # Send status
        await websocket.send_json(
            StreamStatus(
                message=f"Anima ready ({selected_model}), starting analysis...",
                progress=0.2
            ).dict()
        )

        # Build query (same as non-streaming)
        query = f"Please analyze the following writing"

        if request.context and request.context.purpose:
            query += f" (Purpose: {request.context.purpose})"

        if request.context and request.context.criteria:
            criteria_text = ", ".join(request.context.criteria)
            query += f"\nEvaluation criteria: {criteria_text}"

        query += f"\n\nText to analyze:\n{request.content}"
        query += "\n\nProvide specific, actionable feedback grounded in your corpus. Return your response as a JSON array of feedback items as specified in your instructions."

        # Prepare conversation history
        conversation_history = []
        if request.context and request.context.feedback_history:
            for item in request.context.feedback_history[-3:]:
                if item.get("role") == "user":
                    conversation_history.append({"role": "user", "content": item["content"]})
                elif item.get("role") == "assistant":
                    conversation_history.append({"role": "assistant", "content": item["content"]})

        # Use streaming if available
        result = None
        if hasattr(agent, 'respond_stream'):
            # Stream from agent
            for chunk in agent.respond_stream(query, conversation_history=conversation_history):
                if chunk.get("type") == "status":
                    # Send status updates
                    await websocket.send_json(
                        StreamStatus(
                            message=chunk.get("message", "Processing..."),
                            tool=chunk.get("tool"),
                            progress=0.5  # Mid-progress
                        ).dict()
                    )
                elif chunk.get("type") == "text":
                    # Text chunk received - could stream this too
                    pass  # For now, wait for complete response
                elif chunk.get("type") == "result":
                    # This is the final result
                    result = chunk
        else:
            # Fallback to non-streaming
            await websocket.send_json(
                StreamStatus(
                    message="Analyzing with corpus retrieval...",
                    progress=0.5
                ).dict()
            )
            result = agent.respond(query, conversation_history=conversation_history)

        # Parse JSON feedback
        await websocket.send_json(
            StreamStatus(
                message="Parsing structured feedback...",
                progress=0.8
            ).dict()
        )

        # Safety check - if result is None, agent didn't complete properly
        if result is None:
            logger.error("Agent did not return a result - may have stopped early")
            await websocket.send_json({
                "type": "error",
                "message": "Agent did not return feedback. Try again."
            })
            await websocket.close()
            return

        response_text = result.get("response", "")
        logger.info(f"Response text length: {len(response_text)}")
        logger.info(f"Response preview (first 1000 chars): {response_text[:1000]}")

        try:
            feedback_items = parse_json_feedback(response_text, persona["name"], selected_model)
            logger.info(f"Parsed {len(feedback_items)} feedback items")
        except Exception as parse_error:
            logger.error(f"Failed to parse feedback: {parse_error}")
            await websocket.send_json({
                "type": "error",
                "message": f"Failed to parse feedback: {str(parse_error)}"
            })
            await websocket.close()
            return

        feedback_items = feedback_items[:request.max_feedback_items]
        logger.info(f"After max limit: {len(feedback_items)} feedback items")

        # Stream each feedback item
        for i, item in enumerate(feedback_items):
            try:
                logger.info(f"Sending feedback item {i+1}/{len(feedback_items)}: {item.title}")
                await websocket.send_json(
                    StreamFeedback(item=item).dict()
                )
                logger.debug(f"Successfully sent item {i+1}")
            except Exception as e:
                logger.error(f"Error sending feedback item {i+1}: {e}, stopping stream")
                return

        # Send completion
        try:
            processing_time = time.time() - start_time
            logger.info(f"Sending completion message")
            await websocket.send_json(
                StreamComplete(
                    total_items=len(feedback_items),
                    processing_time=processing_time
                ).dict()
            )
            await websocket.close()
            logger.info("Stream completed successfully")
        except Exception as e:
            logger.error(f"Error sending completion: {e}")

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected by client")
    except Exception as e:
        logger.error(f"Error in streaming analysis: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Analysis failed: {str(e)}"
            })
            await websocket.close()
        except:
            pass
