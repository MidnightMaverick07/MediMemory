import logging
import json
import os
from pypdf import PdfReader
from sqlalchemy.orm import Session
from app.db.models import Document, ActivityLog
from app.cognee_service.client import cognee_cloud as cognee

logger = logging.getLogger("cognee_service")

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

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

        if file_ext == ".pdf":
            text = extract_text_from_pdf(doc.file_path)
            # If the PDF is scanned (has little or no extracted text), fall back to Gemini OCR
            if not text or len(text.strip()) < 30:
                logger.info("PDF has no embedded text layer. Falling back to scanned PDF OCR...")
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

        doc.extracted_text = text
        db.commit()

        # --- Structured entity extraction ---
        from .extractor import extract_structured_entities
        entities = await extract_structured_entities(text)
        if entities:
            doc.extracted_json = json.dumps(entities)
            db.commit()
            logger.info("Saved structured entities for document ID %d.", doc_id)

        dataset_name = f"patient_{doc.patient_id}"
        logger.info("Ingesting document ID %d into Cognee dataset %s", doc_id, dataset_name)

        # Ingest text into Cognee
        await cognee.remember(
            data=text,
            dataset_name=dataset_name
        )

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

        # Trigger ontological improvement automatically after ingestion
        from .enrichment import enrich_patient_memory
        await enrich_patient_memory(db, doc.patient_id)

        # Extract timeline events using Gemini LLM
        from .timeline_extractor import extract_timeline_events
        await extract_timeline_events(db, doc.id)

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
