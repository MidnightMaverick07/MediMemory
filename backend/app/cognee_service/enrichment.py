import logging
from sqlalchemy.orm import Session
from app.db.models import ActivityLog
from app.cognee_service.client import cognee_cloud as cognee

logger = logging.getLogger("cognee_service")

async def enrich_patient_memory(db: Session, patient_id: int):
    dataset_name = f"patient_{patient_id}"
    logger.info("Enriching and improving Cognee graph for dataset %s", dataset_name)
    
    try:
        # Call Cognee improve to refine the ontology and merge duplicates
        await cognee.improve(
            dataset=dataset_name
        )
        
        # Log to Database
        log = ActivityLog(
            patient_id=patient_id,
            event_type="improve",
            details="Ontology refined. Relationships consolidated and duplicates merged."
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
