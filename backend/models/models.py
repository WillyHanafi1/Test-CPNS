import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.db.session import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role: Mapped[str] = mapped_column(String(20), default="participant") # admin, participant
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    profile: Mapped["UserProfile"] = relationship(back_populates="user", uselist=False)
    sessions: Mapped[list["ExamSession"]] = relationship(back_populates="user")
    transactions: Mapped[list["UserTransaction"]] = relationship(back_populates="user")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    full_name: Mapped[str] = mapped_column(String(255))
    phone_number: Mapped[str] = mapped_column(String(20), nullable=True)
    target_agency: Mapped[str] = mapped_column(String(255), nullable=True)

    user: Mapped["User"] = relationship(back_populates="profile")

class Package(Base):
    __tablename__ = "packages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    price: Mapped[int] = mapped_column(Integer, default=0)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    category: Mapped[str] = mapped_column(String(50)) # TWK, TIU, TKP, Mix

    questions: Mapped[list["Question"]] = relationship(back_populates="package")
    transactions: Mapped[list["UserTransaction"]] = relationship(back_populates="package")

class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    package_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("packages.id"))
    content: Mapped[str] = mapped_column(Text)
    image_url: Mapped[str] = mapped_column(String(500), nullable=True)
    discussion: Mapped[str] = mapped_column(Text, nullable=True)
    segment: Mapped[str] = mapped_column(String(50)) # TWK, TIU, TKP
    number: Mapped[int] = mapped_column(Integer) # Question number in package (1-110)

    package: Mapped["Package"] = relationship(back_populates="questions")
    options: Mapped[list["QuestionOption"]] = relationship(back_populates="question", cascade="all, delete-orphan")

class QuestionOption(Base):
    __tablename__ = "question_options"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("questions.id"))
    label: Mapped[str] = mapped_column(String(10)) # A, B, C, D, E
    content: Mapped[str] = mapped_column(Text)
    score: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped["Question"] = relationship(back_populates="options")

class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    package_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("packages.id"))
    start_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    total_score: Mapped[int] = mapped_column(Integer, default=0)
    score_twk: Mapped[int] = mapped_column(Integer, default=0)
    score_tiu: Mapped[int] = mapped_column(Integer, default=0)
    score_tkp: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="ongoing")

    user: Mapped["User"] = relationship(back_populates="sessions")
    answers: Mapped[list["Answer"]] = relationship(back_populates="session")

class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exam_sessions.id"))
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("questions.id"))
    selected_option: Mapped[str] = mapped_column(String(10))
    points_earned: Mapped[int] = mapped_column(Integer, default=0)

    session: Mapped["ExamSession"] = relationship(back_populates="answers")

class UserTransaction(Base):
    __tablename__ = "user_transactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    package_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("packages.id"))
    payment_status: Mapped[str] = mapped_column(String(20), default="pending") # pending, success, failed
    amount: Mapped[int] = mapped_column(Integer)
    snap_token: Mapped[str] = mapped_column(String(255), nullable=True) # For Midtrans
    access_expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="transactions")
    package: Mapped["Package"] = relationship(back_populates="transactions")
