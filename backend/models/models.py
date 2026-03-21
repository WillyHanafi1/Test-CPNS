import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Text, JSON, Index, UniqueConstraint, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role: Mapped[str] = mapped_column(String(20), default="participant")  # admin, participant
    auth_provider: Mapped[str] = mapped_column(String(20), default="local")  # local, google
    is_pro: Mapped[bool] = mapped_column(Boolean, default=False)
    pro_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'participant')", name="check_user_role"),
        CheckConstraint("auth_provider IN ('local', 'google')", name="check_auth_provider"),
    )

    @property
    def is_pro_active(self) -> bool:
        now = datetime.now(timezone.utc)
        return self.is_pro and (not self.pro_expires_at or self.pro_expires_at > now)

    profile: Mapped["UserProfile"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    sessions: Mapped[list["ExamSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    transactions: Mapped[list["UserTransaction"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    chat_sessions: Mapped[list["ChatSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    feedbacks: Mapped[list["Feedback"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role}>"


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    target_instansi: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    user: Mapped["User"] = relationship(back_populates="profile")


class Package(Base):
    __tablename__ = "packages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    price: Mapped[int] = mapped_column(Integer, default=0)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    category: Mapped[str] = mapped_column(String(50))  # TWK, TIU, TKP, Mix
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_weekly: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    start_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_package_published_active", "is_published", "is_active"),
        Index("ix_package_category", "category"),
    )

    questions: Mapped[list["Question"]] = relationship(back_populates="package", cascade="all, delete-orphan")
    transactions: Mapped[list["UserTransaction"]] = relationship(back_populates="package")
    sessions: Mapped[list["ExamSession"]] = relationship(back_populates="package", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Package id={self.id} title={self.title!r} category={self.category}>"


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    package_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("packages.id"))
    content: Mapped[str] = mapped_column(Text)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    discussion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    segment: Mapped[str] = mapped_column(String(50))  # TWK, TIU, TKP
    sub_category: Mapped[Optional[str]] = mapped_column(String(100))  # Analogi, Pelayanan Publik, dll
    number: Mapped[int] = mapped_column(Integer)  # Question number in package (1-110)

    __table_args__ = (
        UniqueConstraint("package_id", "number", name="uq_package_question_number"),
        CheckConstraint("segment IN ('TWK', 'TIU', 'TKP')", name="check_question_segment"),
    )

    package: Mapped["Package"] = relationship(back_populates="questions")
    options: Mapped[list["QuestionOption"]] = relationship(back_populates="question", cascade="all, delete-orphan")
    answers: Mapped[list["Answer"]] = relationship(back_populates="question")


class QuestionOption(Base):
    __tablename__ = "question_options"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("questions.id"))
    label: Mapped[str] = mapped_column(String(10))  # A, B, C, D, E
    content: Mapped[str] = mapped_column(Text)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    score: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["Question"] = relationship(back_populates="options")


class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    package_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("packages.id"), index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_score: Mapped[int] = mapped_column(Integer, default=0)
    score_twk: Mapped[int] = mapped_column(Integer, default=0)
    score_tiu: Mapped[int] = mapped_column(Integer, default=0)
    score_tkp: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="ongoing", index=True)
    is_preview: Mapped[bool] = mapped_column(Boolean, default=False)
    is_passed: Mapped[bool] = mapped_column(Boolean, default=False)

    # AI Analysis Fields
    ai_analysis: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ai_status: Mapped[str] = mapped_column(String(20), default="none")  # none, processing, completed, failed

    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=True
    )

    __table_args__ = (
        Index("ix_exam_session_user_status", "user_id", "status"),
        Index("ix_exam_session_user_package", "user_id", "package_id"),
    )

    user: Mapped["User"] = relationship(back_populates="sessions")
    package: Mapped["Package"] = relationship(back_populates="sessions")
    answers: Mapped[list["Answer"]] = relationship(back_populates="session", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<ExamSession id={self.id} status={self.status} score={self.total_score}>"


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exam_sessions.id"), index=True)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("questions.id"))
    option_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("question_options.id"), nullable=True)
    # Snapshot of option label at time of answer, kept for historical accuracy
    selected_option: Mapped[str] = mapped_column(String(10))
    points_earned: Mapped[int] = mapped_column(Integer, default=0)

    __table_args__ = (
        Index("ix_answer_session_question", "session_id", "question_id"),
    )

    session: Mapped["ExamSession"] = relationship(back_populates="answers")
    question: Mapped["Question"] = relationship(back_populates="answers")


class UserTransaction(Base):
    __tablename__ = "user_transactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    # package_id is nullable — null for pro_upgrade and donation transactions
    package_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("packages.id"), nullable=True, index=True)
    transaction_type: Mapped[str] = mapped_column(String(50), default="pro_upgrade")  # pro_upgrade, donation
    order_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    payment_status: Mapped[str] = mapped_column(String(20), default="pending", index=True)  # pending, success, failed
    amount: Mapped[int] = mapped_column(Integer)
    snap_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # For Midtrans
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # For donation message
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    access_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=True
    )

    __table_args__ = (
        CheckConstraint("payment_status IN ('pending', 'success', 'failed')", name="check_payment_status"),
        CheckConstraint("transaction_type IN ('pro_upgrade', 'donation')", name="check_transaction_type"),
    )

    user: Mapped["User"] = relationship(back_populates="transactions")
    package: Mapped["Package"] = relationship(back_populates="transactions")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    exam_session_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("exam_sessions.id"), nullable=True)
    question_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("questions.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_chat_session_user_question", "user_id", "question_id"),
        Index("ix_chat_session_user_exam", "user_id", "exam_session_id"),
    )

    user: Mapped["User"] = relationship(back_populates="chat_sessions")
    messages: Mapped[list["ChatMessage"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chat_sessions.id"))
    role: Mapped[str] = mapped_column(String(20))  # user, assistant
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    session: Mapped["ChatSession"] = relationship(back_populates="messages")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    category: Mapped[str] = mapped_column(String(50), default="suggestion")  # suggestion, bug, correction, other
    content: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)  # pending, reviewed, in_progress, resolved
    priority: Mapped[str] = mapped_column(String(10), default="medium")  # low, medium, high, urgent
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    path_context: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Page URL context
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'reviewed', 'in_progress', 'resolved')", name="check_feedback_status"),
        CheckConstraint("priority IN ('low', 'medium', 'high', 'urgent')", name="check_feedback_priority"),
        CheckConstraint("category IN ('suggestion', 'bug', 'correction', 'other')", name="check_feedback_category"),
    )

    user: Mapped["User"] = relationship(back_populates="feedbacks")
