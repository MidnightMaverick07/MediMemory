import logging
import os
from sqlalchemy.orm import Session
from app.db.models import Document, ActivityLog
from app.cognee_service.client import cognee_cloud as cognee

logger = logging.getLogger("cognee_service")

async def delete_patient_document(db: Session, patient_id: int, doc_id: int):
    # Fetch document
    doc = db.query(Document).filter(Document.id == doc_id, Document.patient_id == patient_id).first()
    if not doc:
        raise ValueError("Document not found.")
        
    filename = doc.filename
    # Delete raw file from disk
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            logger.error("Could not delete file from disk: %s", e)
            
    # Delete from DB
    db.delete(doc)
    db.commit()
    
    # Rebuild patient memory graph to completely forget the document
    await rebuild_patient_graph(db, patient_id, f"Deleted document '{filename}' from memory.")

async def delete_patient_dataset(db: Session, patient_id: int):
    dataset_name = f"patient_{patient_id}"
    logger.info("Wiping entire Cognee dataset %s", dataset_name)
    
    try:
        # Wipe Cognee dataset
        await cognee.forget(dataset=dataset_name)
        
        # Log to Database
        log = ActivityLog(
            patient_id=patient_id,
            event_type="forget",
            details="Cleared all patient health memory graph data."
        )
        db.add(log)
        db.commit()
    except Exception as e:
        logger.exception("Forget failed for dataset %s: %s", dataset_name, e)
        raise e

async def rebuild_patient_graph(db: Session, patient_id: int, reason: str = ""):
    dataset_name = f"patient_{patient_id}"
    logger.info("Rebuilding graph for dataset %s due to: %s", dataset_name, reason)
    from app.config import settings
    if not settings.GEMINI_API_KEY:
        logger.warning("Rebuild skipped: GEMINI_API_KEY is not set.")
        return
        
    try:
        # Wipe first
        await cognee.forget(dataset=dataset_name)
        
        # Log wipe
        log = ActivityLog(
            patient_id=patient_id,
            event_type="forget",
            details=f"Wiped graph memory to rebuild ({reason})."
        )
        db.add(log)
        db.commit()
        
        # Fetch remaining completed documents
        docs = db.query(Document).filter(Document.patient_id == patient_id, Document.status == "completed").all()
        
        # Re-ingest each document's extracted text
        for d in docs:
            if d.extracted_text:
                logger.info("Re-ingesting doc ID %d for patient ID %d", d.id, patient_id)
                await cognee.remember(
                    data=d.extracted_text,
                    dataset_name=dataset_name
                )
                
        # Log completion
        log = ActivityLog(
            patient_id=patient_id,
            event_type="improve",
            details=f"Memory graph rebuilt successfully with {len(docs)} reports."
        )
        db.add(log)
        db.commit()
        
    except Exception as e:
        logger.exception("Rebuild failed for patient ID %d: %s", patient_id, e)
