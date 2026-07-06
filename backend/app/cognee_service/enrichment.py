import logging
from sqlalchemy.orm import Session
from app.db.models import ActivityLog
from app.cognee_service.client import cognee_cloud as cognee
from app.cognee_service.ingestion import MEDICAL_COGNIFY_PROMPT

logger = logging.getLogger("cognee_service")

async def enrich_patient_memory(db: Session, patient_id: int):
    dataset_name = f"patient_{patient_id}"
    logger.info("Enriching and improving Cognee graph for dataset %s", dataset_name)
    
    try:
        # Call Cognee improve to refine the ontology and merge duplicates
        await cognee.improve(
            dataset=dataset_name,
            custom_prompt=MEDICAL_COGNIFY_PROMPT
        )
        
        # Log to Database
        log = ActivityLog(
            patient_id=patient_id,
            event_type="improve",
            details="Ontology refined with medical prompt. Relationships consolidated and duplicates merged."
        )
        db.add(log)
        db.commit()
        logger.info("Enrichment complete for dataset %s", dataset_name)
    except Exception as e:
        logger.exception("Enrichment failed for patient ID %d: %s", patient_id, e)
        log = ActivityLog(
            patient_id=patient_id,
            event_type="improve",
            details=f"Failed ontology refinement pass: {str(e)}"
        )
        db.add(log)
        db.commit()

