from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Document, Patient
from app.config import settings
from app.cognee_service.ingestion import ingest_document
from app.cognee_service.deletion import delete_patient_document
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
import datetime

router = APIRouter(prefix="/patients/{patient_id}/documents", tags=["documents"])

# Accepted file types for upload
ALLOWED_EXTENSIONS = {".txt", ".pdf", ".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_CONTENT_TYPES = {
    "text/plain",
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
}

class DocumentResponse(BaseModel):
    id: int
    patient_id: int
    filename: str
    doc_type: str
    upload_date: datetime.datetime
    status: str
    error_message: Optional[str] = None
    extracted_text: Optional[str] = None
    extracted_json: Optional[Dict[str, Any]] = None

    class Config:
        orm_mode = True

def _parse_extracted_json(raw: Optional[str]) -> Optional[Dict[str, Any]]:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None

def _doc_to_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        patient_id=doc.patient_id,
        filename=doc.filename,
        doc_type=doc.doc_type,
        upload_date=doc.upload_date,
        status=doc.status,
        error_message=doc.error_message,
        extracted_text=doc.extracted_text,
        extracted_json=_parse_extracted_json(doc.extracted_json)
    )

@router.post("", response_model=DocumentResponse)
async def upload_document(
    patient_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # Validate file type
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file_ext}'. Accepted: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Create patient-specific upload folder
    patient_upload_dir = os.path.join(settings.upload_dir, f"patient_{patient_id}")
    os.makedirs(patient_upload_dir, exist_ok=True)

    # Save raw file to disk
    file_path = os.path.join(patient_upload_dir, file.filename)
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Save metadata row
    doc = Document(
        patient_id=patient_id,
        filename=file.filename,
        file_path=file_path,
        doc_type=doc_type,
        status="uploaded"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Trigger background ingestion (OCR + Cognee + Timeline + Extraction)
    background_tasks.add_task(ingest_document, db, doc.id)

    return _doc_to_response(doc)

@router.get("", response_model=List[DocumentResponse])
def list_documents(patient_id: int, db: Session = Depends(get_db)):
    docs = db.query(Document).filter(Document.patient_id == patient_id).all()
    return [_doc_to_response(doc) for doc in docs]

@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(patient_id: int, doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.patient_id == patient_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return _doc_to_response(doc)

@router.delete("/{doc_id}")
async def delete_document(patient_id: int, doc_id: int, db: Session = Depends(get_db)):
    try:
        await delete_patient_document(db, patient_id, doc_id)
        return {"status": "success", "message": f"Document {doc_id} deleted and memory graph updated."}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")
