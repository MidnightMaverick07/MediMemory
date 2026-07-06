import logging
import json
import os
from pypdf import PdfReader
from sqlalchemy.orm import Session
from app.db.models import Document, ActivityLog
from app.cognee_service.client import cognee_cloud as cognee

logger = logging.getLogger("cognee_service")

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

# Medical-specific ontology extraction prompt for Cognee cognify
MEDICAL_COGNIFY_PROMPT = (
    "You are a medical records parser. Extract these entity types: "
    "Patient, Diagnosis, Medication (with dosage and frequency), "
    "Lab Result (with value and reference range), Procedure/Surgery, "
    "Allergy, Vital Signs, Symptom, Doctor, Hospital/Facility, Date. "
    "Create relationships: Patient DIAGNOSED_WITH Diagnosis, "
    "Patient TAKES Medication, Medication TREATS Diagnosis, "
    "Patient HAD Procedure, Patient HAS Lab Result, "
    "Doctor PERFORMED Procedure, Patient ALLERGIC_TO substance."
)

# Map doc_type to semantic node_set tags for Cognee graph categorisation
NODE_SET_MAP = {
    "Lab Report": ["lab_results", "blood_work"],
    "Prescription": ["prescriptions", "medications"],
    "Discharge Summary": ["clinical_notes", "discharge"],
    "MRI / Scan Report": ["imaging", "radiology"],
    "Surgical Report": ["surgeries", "procedures"],
    "Pathology Report": ["pathology", "lab_results"],
    "Doctor's Notes": ["clinical_notes", "consultations"],
    "Vaccination Record": ["immunizations", "preventive_care"],
    "Insurance / Billing": ["administrative", "billing"],
}

def extract_text_from_pdf(pdf_path: str) -> str:
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        logger.exception("Error extracting PDF text: %s", e)
        raise ValueError("Could not parse PDF file structure.")

async def ingest_document(db_not_used: Session, doc_id: int):
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            logger.error("Document ID %d not found in database", doc_id)
            return

        doc.status = "processing"
        db.commit()

        from app.config import settings
        if not settings.GEMINI_API_KEY:
            raise ValueError(
                "LLM API key is not configured. Please set the GEMINI_API_KEY in the backend .env file."
            )

        file_ext = os.path.splitext(doc.filename)[1].lower()
        ocr_used = False

        # --- Step 1: Extract text locally (for DB, entity extraction, timeline) ---
        if file_ext == ".pdf":
            text = extract_text_from_pdf(doc.file_path)
            # Lower OCR threshold from 30 → 100 chars to catch poorly-embedded PDFs
            if not text or len(text.strip()) < 100:
                logger.info("PDF has insufficient embedded text (%d chars). Falling back to scanned PDF OCR...",
                            len(text.strip()) if text else 0)
                from .ocr import extract_text_from_pdf_ocr
                text = await extract_text_from_pdf_ocr(doc.file_path)
                ocr_used = True
        elif file_ext in IMAGE_EXTENSIONS:
            # Use Gemini Vision OCR for image-based documents
            from .ocr import extract_text_from_image
            text = await extract_text_from_image(doc.file_path)
            ocr_used = True
        else:
            with open(doc.file_path, "r", encoding="utf-8") as f:
                text = f.read().strip()

        if not text:
            raise ValueError(
                "Text not extractable from the uploaded report (empty or scanned image-only PDF)."
            )

        # --- Step 2: Save extracted text to DB ---
        doc.extracted_text = text
        db.commit()

        # --- Step 3: Extract structured entities (Gemini LLM) ---
        from .extractor import extract_structured_entities
        entities = await extract_structured_entities(text)
        if entities:
            doc.extracted_json = json.dumps(entities)
            db.commit()
            logger.info("Saved structured entities for document ID %d.", doc_id)

        dataset_name = f"patient_{doc.patient_id}"
        node_set = NODE_SET_MAP.get(doc.doc_type, ["clinical_notes"])
        logger.info("Ingesting document ID %d into Cognee dataset %s (node_set: %s)", doc_id, dataset_name, node_set)

        # --- Step 4: Upload raw file to Cognee for server-side parsing ---
        if file_ext in (".pdf", ".txt"):
            # Upload the raw file directly — Cognee has its own parser
            await cognee.remember_file(
                file_path=doc.file_path,
                dataset_name=dataset_name,
                filename=doc.filename,
                node_set=node_set
            )
            logger.info("Uploaded raw file '%s' to Cognee dataset %s", doc.filename, dataset_name)
        else:
            # For images and other formats, send the locally-extracted text
            await cognee.remember(
                data=text,
                dataset_name=dataset_name,
                node_set=node_set
            )
            logger.info("Ingested extracted text for '%s' into Cognee dataset %s", doc.filename, dataset_name)

        # --- Step 5: Run cognify with medical prompt to build knowledge graph ---
        try:
            logger.info("Running cognify with medical prompt for dataset %s...", dataset_name)
            await cognee.improve(
                dataset=dataset_name,
                custom_prompt=MEDICAL_COGNIFY_PROMPT
            )
            logger.info("Cognify completed successfully for dataset %s", dataset_name)

            # Log cognify success
            cognify_log = ActivityLog(
                patient_id=doc.patient_id,
                event_type="improve",
                details=f"Knowledge graph built for '{doc.filename}' ({doc.doc_type}). Medical ontology applied."
            )
            db.add(cognify_log)
            db.commit()
        except Exception as cognify_err:
            logger.exception("Cognify failed for document ID %d: %s", doc_id, cognify_err)
            # Log cognify failure but don't fail the whole ingestion
            cognify_fail_log = ActivityLog(
                patient_id=doc.patient_id,
                event_type="improve",
                details=f"Knowledge graph build failed for '{doc.filename}': {str(cognify_err)}"
            )
            db.add(cognify_fail_log)
            db.commit()

        # --- Step 6: Mark document as completed ---
        doc.status = "completed"
        doc.error_message = None
        db.commit()

        # Log activity
        method = "OCR + Memory Indexing" if ocr_used else "Memory Indexing"
        log = ActivityLog(
            patient_id=doc.patient_id,
            event_type="remember",
            details=f"Ingested report '{doc.filename}' ({doc.doc_type}) via {method}."
        )
        db.add(log)
        db.commit()

        # --- Step 7: Extract timeline events (Gemini LLM) ---
        try:
            from .timeline_extractor import extract_timeline_events
            await extract_timeline_events(db, doc.id)
        except Exception as timeline_err:
            logger.exception("Timeline extraction failed for document ID %d: %s", doc_id, timeline_err)

        # NOTE: enrich_patient_memory() call removed — cognify now runs as step 5 above,
        # so the separate enrichment pass is redundant and was causing timeout errors.

    except Exception as e:
        logger.exception("Ingestion failed for document ID %d: %s", doc_id, e)
        try:
            # Re-fetch document with local active session to update status
            doc_retry = db.query(Document).filter(Document.id == doc_id).first()
            if doc_retry:
                doc_retry.status = "failed"
                doc_retry.error_message = str(e)
                db.commit()
        except Exception as retry_err:
            logger.error("Failed to set document status to failed: %s", retry_err)

        # Log activity
        try:
            log = ActivityLog(
                patient_id=doc.patient_id if doc else 0,
                event_type="remember",
                details=f"Failed to ingest report: {str(e)}"
            )
            db.add(log)
            db.commit()
        except:
            pass
    finally:
        db.close()
