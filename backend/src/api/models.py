"""
Pydantic models for API request/response validation
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class FeedbackType(str, Enum):
    """Types of feedback"""
    SUGGESTION = "suggestion"
    ISSUE = "issue"
    PRAISE = "praise"
    QUESTION = "question"


class FeedbackSeverity(str, Enum):
    """Severity levels for feedback"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# Persona Models
class PersonaCreate(BaseModel):
    """Request model for creating a persona"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    user_id: str = Field(..., description="Firebase UID")


class PersonaResponse(BaseModel):
    """Response model for persona"""
    id: str
    name: str
    description: Optional[str]
    user_id: str
    collection_name: str
    corpus_file_count: int = 0
    chunk_count: int = 0
    created_at: datetime
    updated_at: datetime


class PersonaList(BaseModel):
    """List of personas"""
    personas: List[PersonaResponse]
    total: int


# Corpus Models
class CorpusFile(BaseModel):
    """Corpus file metadata"""
    filename: str
    size: int
    uploaded_at: datetime
    chunk_count: int


class CorpusUploadResponse(BaseModel):
    """Response for corpus upload"""
    persona_id: str
    files_uploaded: int
    total_size: int
    message: str


class IngestionStatus(BaseModel):
    """Status of corpus ingestion"""
    persona_id: str
    status: str  # "pending", "processing", "completed", "failed"
    progress: float  # 0.0 to 1.0
    chunks_processed: int
    total_chunks: int
    message: Optional[str]


# Analysis Models
class AnalysisContext(BaseModel):
    """Context for writing analysis"""
    purpose: Optional[str] = None
    criteria: List[str] = Field(default_factory=list)
    feedback_history: List[Dict[str, Any]] = Field(default_factory=list)


class AnalysisRequest(BaseModel):
    """Request for writing analysis"""
    content: str = Field(..., min_length=1)
    persona_id: str
    user_id: str
    context: Optional[AnalysisContext] = None
    max_feedback_items: int = Field(default=10, ge=1, le=50)


class TextPosition(BaseModel):
    """Position information for text highlighting"""
    start: int  # Start character index
    end: int  # End character index
    text: str  # The actual text being referenced


class FeedbackItem(BaseModel):
    """Single feedback item"""
    id: str
    type: FeedbackType
    category: str
    title: str
    content: str
    severity: FeedbackSeverity
    confidence: float = Field(..., ge=0.0, le=1.0)
    sources: List[str] = Field(default_factory=list)  # Corpus chunks used
    position: Optional[int] = None  # Deprecated: use positions instead
    positions: List[TextPosition] = Field(default_factory=list)  # Text positions for highlighting


class AnalysisResponse(BaseModel):
    """Response from writing analysis"""
    persona_id: str
    persona_name: str
    feedback: List[FeedbackItem]
    metadata: Dict[str, Any] = Field(default_factory=dict)
    processing_time: float


# Streaming Models
class StreamStatus(BaseModel):
    """Status update during streaming"""
    type: str = "status"
    message: str
    tool: Optional[str] = None
    progress: Optional[float] = None


class StreamFeedback(BaseModel):
    """Feedback chunk during streaming"""
    type: str = "feedback"
    item: FeedbackItem


class StreamComplete(BaseModel):
    """Completion message for streaming"""
    type: str = "complete"
    total_items: int
    processing_time: float


# Health Check
class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    services: Dict[str, str]
    version: str = "1.0.0"
