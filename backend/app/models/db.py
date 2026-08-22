"""
models/db.py — SQLAlchemy ORM table definitions.

Tables:
  - Source          : Knowledge base documents (seeded by ingest.py)
  - Conversation    : A chat session
  - Message         : Individual messages within a conversation
  - UploadedDocument: User-uploaded PDFs
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Source(Base):
    """A curated knowledge-base document."""

    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=True)
    authority: Mapped[str] = mapped_column(String(256), nullable=True)  # e.g. "IP India"
    document_type: Mapped[str] = mapped_column(String(128), nullable=True)  # patent/trademark/faq
    topic: Mapped[str] = mapped_column(String(256), nullable=True)
    language: Mapped[str] = mapped_column(String(16), default="en")
    publication_date: Mapped[str] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Conversation(Base):
    """A chat session (may span multiple messages)."""

    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    language: Mapped[str] = mapped_column(String(16), default="en")

    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan"
    )


class Message(Base):
    """A single turn in a conversation (user or assistant)."""

    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    conversation_id: Mapped[str] = mapped_column(
        String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # "user" | "assistant"
    text: Mapped[str] = mapped_column(Text, nullable=False)
    # JSON blobs — avoid extra normalised tables for a hackathon MVP
    sources_json: Mapped[str] = mapped_column(Text, default="[]")     # list[SourceRef]
    actions_json: Mapped[str] = mapped_column(Text, default="[]")     # list[Action]
    confidence: Mapped[str] = mapped_column(String(16), nullable=True)  # HIGH/MEDIUM/LOW
    confidence_score: Mapped[float] = mapped_column(Float, nullable=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=True)        # 1 = 👍, -1 = 👎
    feedback_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Optional user feedback comment
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    conversation: Mapped["Conversation"] = relationship(
        "Conversation", back_populates="messages"
    )


class UploadedDocument(Base):
    """A PDF uploaded by the user for document intelligence."""

    __tablename__ = "uploaded_documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=True)
    extracted_text: Mapped[str] = mapped_column(Text, nullable=True)
    # JSON blob: {doc_type, summary, deadline_date, key_requirements}
    summary_json: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BusinessProfile(Base):
    """Business Profile storing company metadata and IP asset portfolio."""

    __tablename__ = "business_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    company_name: Mapped[str] = mapped_column(String(256), nullable=False)
    sector: Mapped[str] = mapped_column(String(128), default="AYUSH")  # AYUSH, Pharma, Biotech, Software, MSME, etc.
    company_type: Mapped[str] = mapped_column(String(128), default="Startup")  # Startup, MSME, Enterprise, Researcher
    registration_number: Mapped[str] = mapped_column(String(128), nullable=True)  # UDYAM, CIN, License No
    state: Mapped[str] = mapped_column(String(128), nullable=True)
    # JSON blob: list of IPAsset [{asset_type, title, status, registration_no}]
    ip_assets_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ComplianceEvent(Base):
    """Compliance deadline event tied to a business profile."""

    __tablename__ = "compliance_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    profile_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    category: Mapped[str] = mapped_column(String(128), default="PATENT")  # PATENT, TRADEMARK, AYUSH_LICENSE, BIODIVERSITY, GENERAL
    due_date: Mapped[str] = mapped_column(String(32), nullable=False)  # YYYY-MM-DD
    status: Mapped[str] = mapped_column(String(32), default="UPCOMING")  # UPCOMING, OVERDUE, DONE
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    authority: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class IOTDevice(Base):
    """ESP32 or sensor monitoring hardware device."""

    __tablename__ = "iot_devices"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    device_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(256), default="ESP32-001 Processing Monitor")
    device_type: Mapped[str] = mapped_column(String(128), default="Processing Monitor")
    status: Mapped[str] = mapped_column(String(32), default="ONLINE")  # ONLINE, OFFLINE
    wifi_status: Mapped[str] = mapped_column(String(32), default="Connected")
    sampling_interval_sec: Mapped[int] = mapped_column(Integer, default=5)
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class IOTTelemetry(Base):
    """Real-time sensor telemetry record received from ESP32."""

    __tablename__ = "iot_telemetry"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    device_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    timestamp: Mapped[str] = mapped_column(String(64), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    temperature: Mapped[float] = mapped_column(Float, nullable=False)
    humidity: Mapped[float] = mapped_column(Float, nullable=False)
    sound: Mapped[float] = mapped_column(Float, nullable=False)
    is_valid: Mapped[bool] = mapped_column(Integer, default=1)  # 1=True, 0=False


class IOTRule(Base):
    """Organization-defined monitoring process limits."""

    __tablename__ = "iot_rules"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    device_id: Mapped[str] = mapped_column(String(128), default="ESP32-001", index=True)
    temp_min: Mapped[float] = mapped_column(Float, default=20.0)
    temp_max: Mapped[float] = mapped_column(Float, default=30.0)
    humidity_min: Mapped[float] = mapped_column(Float, default=40.0)
    humidity_max: Mapped[float] = mapped_column(Float, default=70.0)
    sound_max: Mapped[float] = mapped_column(Float, default=70.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class IOTEvent(Base):
    """Compliance monitoring event or alert generated from telemetry rule evaluation."""

    __tablename__ = "iot_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    event_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    device_id: Mapped[str] = mapped_column(String(128), nullable=False)
    timestamp: Mapped[str] = mapped_column(String(64), nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), default="MONITORING_LOG")  # START, LOG, DEVIATION, RECOVERY
    parameter: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # Temperature, Humidity, Sound
    observed_value: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    configured_range: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="NORMAL")  # NORMAL, ATTENTION, DEVIATION
    acknowledged: Mapped[bool] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class IOTEvidence(Base):
    """Tamper-evident audit record generated for significant compliance events."""

    __tablename__ = "iot_evidence"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    evidence_id: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    event_id: Mapped[str] = mapped_column(String(128), nullable=False)
    device_id: Mapped[str] = mapped_column(String(128), nullable=False)
    timestamp: Mapped[str] = mapped_column(String(64), nullable=False)
    temperature: Mapped[float] = mapped_column(Float, nullable=False)
    humidity: Mapped[float] = mapped_column(Float, nullable=False)
    sound: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="NORMAL")
    rule_id: Mapped[str] = mapped_column(String(128), default="ENV-HUM-001")
    integrity_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class IOTDeviceProductLink(Base):
    """Association between an IoT device and a specific product, process, or passport."""

    __tablename__ = "iot_device_product_links"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    device_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    product_name: Mapped[str] = mapped_column(String(256), default="Herbal Extract A")
    process_name: Mapped[str] = mapped_column(String(256), default="Controlled Drying")
    monitoring_purpose: Mapped[str] = mapped_column(String(512), default="Environmental process monitoring for quality evidence")
    passport_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)



