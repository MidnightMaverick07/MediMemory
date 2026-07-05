from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.cognee_service.query import query_patient_memory
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter(prefix="/patients/{patient_id}/query", tags=["query"])

class QueryRequest(BaseModel):
    question: str
    role: str = "doctor" # "doctor" or "patient"

class QueryResponse(BaseModel):
    question: str
    answer: str
    role: str
    supporting_timeline: List[str] = []
    related_reports: List[str] = []
    graph_links: List[Dict[str, str]] = []

@router.post("", response_model=QueryResponse)
async def query_patient(patient_id: int, request: QueryRequest, db: Session = Depends(get_db)):
    result = await query_patient_memory(db, patient_id, request.question, request.role)
    return QueryResponse(
        question=result["question"],
        answer=result["answer"],
        role=result["role"],
        supporting_timeline=result["supporting_timeline"],
        related_reports=result["related_reports"],
        graph_links=result["graph_links"]
    )

