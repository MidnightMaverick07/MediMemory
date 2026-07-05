import logging
import json
from sqlalchemy.orm import Session
from app.db.models import Patient, ActivityLog
from app.cognee_service.client import cognee_cloud as cognee

logger = logging.getLogger("cognee_service")

async def remember_patient_profile(db_not_used: Session, patient_id: int):
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            logger.error("Patient ID %d not found for profile remembering", patient_id)
            return
            
        dataset_name = f"patient_{patient_id}"
        logger.info("Remembering patient profile for dataset %s", dataset_name)
        
        # Load demographics JSON
        demographics = {}
        if patient.demographics:
            try:
                demographics = json.loads(patient.demographics)
            except Exception:
                logger.error("Failed to parse demographics JSON for patient ID %d", patient_id)
                
        # Build structured profile text
        profile_lines = [
            f"Patient Profile for {patient.name}",
            f"ID: {patient.id}",
            f"Name: {patient.name}",
            f"Age: {patient.age}",
            f"Gender: {patient.gender}"
        ]
        
        # Add demographic fields dynamically
        for key, value in demographics.items():
            formatted_key = key.replace("_", " ").title()
            profile_lines.append(f"{formatted_key}: {value}")
            
        profile_text = "\n".join(profile_lines)
        
        # Index the profile text in Cognee
        await cognee.remember(
            data=profile_text,
            dataset_name=dataset_name
        )
        
        # Run ontological consolidation
        await cognee.improve(
            dataset=dataset_name
        )
        
        # Log to Database
        log = ActivityLog(
            patient_id=patient_id,
            event_type="improve",
            details=f"Indexed patient profile as root node in memory graph. Age: {patient.age}, Gender: {patient.gender}."
        )
        db.add(log)
        db.commit()
        logger.info("Patient profile remembered and improved successfully for dataset %s", dataset_name)
    except Exception as e:
        logger.exception("Failed to remember patient profile for patient ID %d: %s", patient_id, e)
        try:
            log = ActivityLog(
                patient_id=patient_id,
                event_type="improve",
                details=f"Failed to index patient profile in memory graph: {str(e)}"
            )
            db.add(log)
            db.commit()
        except:
            pass
    finally:
        db.close()
