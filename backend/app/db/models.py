from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
import datetime

Base = declarative_base()

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    demographics = Column(Text, nullable=True) # JSON string containing custom fields
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    documents = relationship("Document", back_populates="patient", cascade="all, delete-orphan")
    query_logs = relationship("QueryLog", back_populates="patient", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="patient", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEvent", back_populates="patient", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    doc_type = Column(String, nullable=False) # "blood report", "prescription", "mri summary", etc.
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="uploaded") # uploaded, processing, completed, failed
    error_message = Column(Text, nullable=True)
    extracted_text = Column(Text, nullable=True)
    extracted_json = Column(Text, nullable=True)  # JSON string of structured entities
    
    patient = relationship("Patient", back_populates="documents")
    timeline_events = relationship("TimelineEvent", back_populates="document", cascade="all, delete-orphan")

class QueryLog(Base):
    __tablename__ = "query_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    role = Column(String, nullable=False) # "doctor" or "patient"
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    patient = relationship("Patient", back_populates="query_logs")

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    event_type = Column(String, nullable=False) # "remember", "improve", "forget"
    details = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    patient = relationship("Patient", back_populates="activity_logs")

class TimelineEvent(Base):
    __tablename__ = "timeline_events"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    date = Column(String, nullable=False)
    event = Column(Text, nullable=False)
    event_type = Column(String, nullable=False) # "diagnosis", "surgery", "medication_change", "lab_report", "checkup"
    diseases = Column(Text, nullable=True) # JSON list
    medications = Column(Text, nullable=True) # JSON list
    entities = Column(Text, nullable=True) # JSON object
    graph_links = Column(Text, nullable=True) # JSON list
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    patient = relationship("Patient", back_populates="timeline_events")
    document = relationship("Document", back_populates="timeline_events")
