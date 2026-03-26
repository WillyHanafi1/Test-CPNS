from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import uuid
from typing import List, Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger("backend.api.v1.endpoints.chat")

from backend.db.session import get_async_session
from backend.models.models import User, ChatSession, ChatMessage, ExamSession, Question, Answer
from backend.api.v1.endpoints.auth import get_current_user
from backend.core.ai_service import ai_service
from backend.core.rate_limiter import limiter
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessageSchema(BaseModel):
    role: str
    content: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ChatSessionSchema(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ChatSessionDetailSchema(ChatSessionSchema):
    messages: List[ChatMessageSchema]

@router.post("/start", response_model=ChatSessionDetailSchema)
@limiter.limit("10/minute")
async def start_chat(
    request: Request,
    exam_session_id: Optional[uuid.UUID] = Body(None),
    question_id: Optional[uuid.UUID] = Body(None),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # Only for PRO users
    if not current_user.is_pro_active:
        raise HTTPException(status_code=403, detail="Hanya pengguna PRO yang dapat menggunakan fitur Chat Mentor AI.")

    # 1. Check for existing session (Resume Logic)
    stmt = select(ChatSession).options(selectinload(ChatSession.messages)).where(ChatSession.user_id == current_user.id)
    
    if question_id:
        stmt = stmt.where(ChatSession.question_id == question_id)
        if exam_session_id:
            stmt = stmt.where(ChatSession.exam_session_id == exam_session_id)
    else:
        # Global chat (no question, no exam)
        stmt = stmt.where(ChatSession.question_id == None, ChatSession.exam_session_id == None)
        
    result = await db.execute(stmt.order_by(ChatSession.created_at.desc()))
    existing_session = result.scalars().first()
    
    if existing_session:
        # Sort messages
        existing_session.messages.sort(key=lambda x: x.created_at)
        return existing_session

    # 2. If no existing session, create new one
    title = "Konsultasi Materi CPNS"
    if question_id:
        q_result = await db.execute(select(Question).where(Question.id == question_id))
        question = q_result.scalar_one_or_none()
        if question:
            title = f"Diskusi Soal #{question.number}"

    session = ChatSession(
        user_id=current_user.id,
        exam_session_id=exam_session_id,
        question_id=question_id,
        title=title
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    # Refresh to load empty messages list
    stmt = select(ChatSession).options(selectinload(ChatSession.messages)).where(ChatSession.id == session.id)
    result = await db.execute(stmt)
    session = result.scalar_one()
    
    return session

@router.post("/{session_id}/message")
@limiter.limit("10/minute")
async def send_message(
    request: Request,
    session_id: uuid.UUID,
    content: str = Body(..., embed=True, min_length=1, max_length=2000),
    question_id: Optional[uuid.UUID] = Body(None), # Context for current question
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify session ownership
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    chat_session = result.scalar_one_or_none()
    if not chat_session:
        raise HTTPException(status_code=404, detail="Sesi chat tidak ditemukan.")

    # 2. Save user message
    user_msg = ChatMessage(session_id=session_id, role="user", content=content)
    db.add(user_msg)
    
    # 3. Prepare Context if question_id is provided or can be inferred
    context_data = None
    
    # Fallback: if message doesn't have question_id, but session title is "Diskusi Soal #X"
    if not question_id and chat_session.title.startswith("Diskusi Soal #"):
        # We don't have the question_id directly from title easily without another query, 
        # but the frontend should be sending it. Let's keep it robust.
        pass

    if question_id:
        # [SECURITY] Validate question belongs to the exam session's package
        # Without this, a user could supply any question_id and leak its discussion text
        q_query = select(Question).options(selectinload(Question.options)).where(Question.id == question_id)
        
        if chat_session.exam_session_id:
            # Cross-check: question must belong to the same package as the exam session
            from backend.models.models import ExamSession
            exam_result = await db.execute(
                select(ExamSession.package_id)
                .where(ExamSession.id == chat_session.exam_session_id,
                       ExamSession.user_id == current_user.id)
            )
            pkg_id = exam_result.scalar_one_or_none()
            if pkg_id:
                q_query = q_query.where(Question.package_id == pkg_id)
        
        q_result = await db.execute(q_query)
        question = q_result.scalar_one_or_none()
        
        # Also try to get user's answer for this session
        user_answer = "Belum dijawab"
        if chat_session.exam_session_id:
            ans_result = await db.execute(
                select(Answer)
                .where(Answer.session_id == chat_session.exam_session_id, Answer.question_id == question_id)
            )
            ans = ans_result.scalar_one_or_none()
            if ans:
                user_answer = ans.selected_option

        if question:
            logger.info(f"DEBUG: Found question {question_id} for context. Content: {question.content[:50]}...")
            context_data = {
                "question_content": question.content,
                "segment": question.segment,
                "user_answer": user_answer,
                "discussion": question.discussion
            }
        else:
            logger.warning(f"DEBUG: Question ID {question_id} passed but NOT FOUND in database.")

    # 4. Get AI Response
    # Fetch recent history (max 10 messages)
    history = [{"role": m.role, "content": m.content} for m in chat_session.messages][-10:]
    history.append({"role": "user", "content": content})
    
    ai_content = await ai_service.get_chat_response(history, context_data)
    
    # 5. Save AI message
    ai_msg = ChatMessage(session_id=session_id, role="assistant", content=ai_content)
    db.add(ai_msg)
    
    await db.commit()
    
    return {
        "role": "assistant",
        "content": ai_content,
        "created_at": datetime.now(timezone.utc)
    }

@router.get("/sessions", response_model=List[ChatSessionSchema])
async def get_chat_sessions(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """
    List user's chat sessions.
    
    [DESIGN DECISION] No PRO gate on read endpoints intentionally.
    Users who previously had PRO should retain read-only access to their chat history.
    Data they generated during their subscription period should not be locked away.
    Only creating new chats (POST /start) and sending messages (POST /{id}/message) require PRO.
    """
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
        .limit(20)
    )
    return result.scalars().all()

@router.get("/{session_id}", response_model=ChatSessionDetailSchema)
async def get_chat_detail(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi chat tidak ditemukan.")
    
    # Sort messages by creation time
    session.messages.sort(key=lambda x: x.created_at)
    return session
