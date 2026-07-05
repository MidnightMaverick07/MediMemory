import logging
import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.models import Document, TimelineEvent
from app.config import settings
import litellm

logger = logging.getLogger("cognee_service")

# Pydantic schemas for LiteLLM structured output
class ExtractedEntity(BaseModel):
    category: str = Field(description="Entity category such as 'Lab values', 'Symptoms', 'Allergies', 'Family history', etc.")
    values: List[str] = Field(description="List of extracted values for this category")

class GraphLink(BaseModel):
    source: str = Field(description="Source node name, e.g. Patient name, a Disease name, etc.")
    target: str = Field(description="Target node name, e.g. a Medication name, a Hospital name, etc.")
    relation: str = Field(description="Relationship label, e.g. 'DIAGNOSED_WITH', 'TREATED_WITH', 'UNDERGONE'")

class TimelineEventSchema(BaseModel):
    date: str = Field(description="Estimated or exact date of the event, e.g. '2024-02-18' or 'May 2023'")
    event: str = Field(description="Short description of the medical event, diagnosis, checkup, or surgery")
    event_type: str = Field(description="Event classification. Must be one of: 'diagnosis', 'surgery', 'medication_change', 'lab_report', 'checkup'")
    diseases: List[str] = Field(description="Related diseases or chronic conditions")
    medications: List[str] = Field(description="Related medications prescribed or stopped")
    entities: List[ExtractedEntity] = Field(description="List of other clinically relevant entities extracted")
    graph_links: List[GraphLink] = Field(description="Local semantic graph connections describing this event")

class TimelineEventsListSchema(BaseModel):
    events: List[TimelineEventSchema]

async def extract_timeline_events(db: Session, doc_id: int):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        logger.error("Document ID %d not found for timeline extraction", doc_id)
        return

    if not doc.extracted_text:
        logger.warning("Document ID %d has empty extracted text. Skipping timeline extraction.", doc_id)
        return

    logger.info("Extracting structured timeline events for document ID %d (%s)...", doc_id, doc.filename)

    system_prompt = (
        "You are an expert clinical ontology extractor. Analyze the medical record text "
        "and extract a chronological list of timeline events, matching the requested JSON schema. "
        "Each event must contain the date, event description, category, related diseases, medications, "
        "other extracted clinical entities, and local graph relationship triples. "
        "Ensure dates are formatted cleanly."
    )

    user_prompt = (
        f"Document Filename: {doc.filename}\n"
        f"Document Category: {doc.doc_type}\n"
        f"Patient ID: {doc.patient_id}\n\n"
        f"Document Text Content:\n{doc.extracted_text}"
    )

    events_data = []

    # Attempt structured parsing via Pydantic response_format
    try:
        response = await litellm.acompletion(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format=TimelineEventsListSchema,
            api_key=settings.GEMINI_API_KEY,
            num_retries=5
        )
        # Parse output
        result_text = response.choices[0].message.content
        parsed = json.loads(result_text)
        events_data = parsed.get("events", [])
        logger.info("Successfully extracted %d timeline events via Pydantic schema", len(events_data))

    except Exception as e:
        logger.warning("Structured output format failed: %s. Falling back to text JSON parsing...", e)
        # Fallback to standard text response and JSON load
        try:
            fallback_system_prompt = (
                system_prompt + "\nOutput raw JSON matches this structure: "
                "{ \"events\": [ { \"date\": \"string\", \"event\": \"string\", \"event_type\": \"string\", "
                "\"diseases\": [], \"medications\": [], \"entities\": [ { \"category\": \"string\", \"values\": [] } ], "
                "\"graph_links\": [ { \"source\": \"string\", \"target\": \"string\", \"relation\": \"string\" } ] } ] }"
            )
            response = await litellm.acompletion(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": fallback_system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                api_key=settings.GEMINI_API_KEY,
                num_retries=5
            )
            content = response.choices[0].message.content
            # Clean markdown JSON formatting if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            parsed = json.loads(content.strip())
            events_data = parsed.get("events", [])
            logger.info("Successfully extracted %d timeline events via fallback parser", len(events_data))
        except Exception as fe:
            logger.error("Seeding timeline events failed entirely for document ID %d: %s", doc_id, fe)
            return

    # Persist extracted events to SQL database
    try:
        # Delete any existing events for this document to prevent duplicate entries on retry
        db.query(TimelineEvent).filter(TimelineEvent.document_id == doc_id).delete()
        
        for ev in events_data:
            # Re-serialize nested items for DB text storage
            diseases_str = json.dumps(ev.get("diseases", []))
            medications_str = json.dumps(ev.get("medications", []))
            
            # Map entities to dictionary
            entity_map = {}
            for ent in ev.get("entities", []):
                category = ent.get("category", "General")
                values = ent.get("values", [])
                entity_map[category] = values
            entities_str = json.dumps(entity_map)

            # Map links list
            links_list = []
            for link in ev.get("graph_links", []):
                links_list.append({
                    "source": link.get("source", ""),
                    "target": link.get("target", ""),
                    "relation": link.get("relation", "")
                })
            links_str = json.dumps(links_list)

            event_row = TimelineEvent(
                patient_id=doc.patient_id,
                document_id=doc.id,
                date=ev.get("date", "Unknown"),
                event=ev.get("event", "No details"),
                event_type=ev.get("event_type", "checkup"),
                diseases=diseases_str,
                medications=medications_str,
                entities=entities_str,
                graph_links=links_str
            )
            db.add(event_row)

        db.commit()
        logger.info("Successfully saved %d timeline events to SQL database for doc ID %d", len(events_data), doc_id)
    except Exception as dbe:
        logger.exception("Failed to write timeline events to database: %s", dbe)
        db.rollback()
