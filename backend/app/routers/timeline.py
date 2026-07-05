from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import ActivityLog, TimelineEvent, Document
from app.cognee_service.query import query_patient_memory
from app.routers.graph import GraphResponse, NodeResponse, EdgeResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import datetime
import json

router = APIRouter(prefix="/patients/{patient_id}", tags=["timeline"])

class TimelineEventResponse(BaseModel):
    id: int
    patient_id: int
    document_id: Optional[int] = None
    document_filename: Optional[str] = None
    document_content: Optional[str] = None
    date: str
    event: str
    event_type: str
    diseases: List[str]
    medications: List[str]
    entities: Dict[str, List[str]]
    graph_links: List[dict]
    timestamp: datetime.datetime

class SummaryResponse(BaseModel):
    patient_id: int
    summary_content: str

class ActivityLogResponse(BaseModel):
    id: int
    patient_id: int
    event_type: str
    details: str
    timestamp: datetime.datetime

class TimelineAdditionResponse(BaseModel):
    date: str
    event: str
    event_type: str

class EvolutionResponse(BaseModel):
    patient_id: int
    latest_doc_name: Optional[str] = None
    before_graph: GraphResponse
    after_graph: GraphResponse
    new_nodes: List[NodeResponse]
    new_edges: List[EdgeResponse]
    merged_nodes: List[NodeResponse]
    timeline_additions: List[TimelineAdditionResponse]

@router.get("/timeline", response_model=List[TimelineEventResponse])
async def get_patient_timeline(patient_id: int, db: Session = Depends(get_db)):
    events = db.query(TimelineEvent).filter(TimelineEvent.patient_id == patient_id).order_by(TimelineEvent.date.desc()).all()
    
    results = []
    for ev in events:
        filename = None
        content = None
        if ev.document:
            filename = ev.document.filename
            content = ev.document.extracted_text

        try:
            diseases_list = json.loads(ev.diseases) if ev.diseases else []
        except:
            diseases_list = []

        try:
            medications_list = json.loads(ev.medications) if ev.medications else []
        except:
            medications_list = []

        try:
            entities_dict = json.loads(ev.entities) if ev.entities else {}
        except:
            entities_dict = {}

        try:
            graph_links_list = json.loads(ev.graph_links) if ev.graph_links else []
        except:
            graph_links_list = []

        results.append(TimelineEventResponse(
            id=ev.id,
            patient_id=ev.patient_id,
            document_id=ev.document_id,
            document_filename=filename,
            document_content=content,
            date=ev.date,
            event=ev.event,
            event_type=ev.event_type,
            diseases=diseases_list,
            medications=medications_list,
            entities=entities_dict,
            graph_links=graph_links_list,
            timestamp=ev.timestamp
        ))
    return results

@router.get("/summary", response_model=SummaryResponse)
async def get_patient_summary(patient_id: int, db: Session = Depends(get_db)):
    from app.cognee_service.summary import generate_clinical_summary
    summary_content = await generate_clinical_summary(db, patient_id)
    return SummaryResponse(
        patient_id=patient_id,
        summary_content=summary_content
    )

@router.get("/activity", response_model=List[ActivityLogResponse])
def get_patient_activity(patient_id: int, db: Session = Depends(get_db)):
    logs = db.query(ActivityLog).filter(ActivityLog.patient_id == patient_id).order_by(ActivityLog.timestamp.desc()).all()
    results = []
    for log in logs:
        results.append(ActivityLogResponse(
            id=log.id,
            patient_id=log.patient_id,
            event_type=log.event_type,
            details=log.details,
            timestamp=log.timestamp
        ))
    return results

@router.get("/evolution", response_model=EvolutionResponse)
def get_patient_evolution(patient_id: int, db: Session = Depends(get_db)):
    from app.routers.graph import build_graph_data
    
    # 1. Fetch completed documents for this patient
    docs = db.query(Document).filter(
        Document.patient_id == patient_id,
        Document.status == "completed"
    ).order_by(Document.upload_date.asc()).all()
    
    if not docs:
        empty_graph = build_graph_data(patient_id, db, limit_to_doc_ids=[])
        return EvolutionResponse(
            patient_id=patient_id,
            latest_doc_name=None,
            before_graph=empty_graph,
            after_graph=empty_graph,
            new_nodes=[],
            new_edges=[],
            merged_nodes=[],
            timeline_additions=[]
        )
        
    latest_doc = docs[-1]
    all_doc_ids = [d.id for d in docs]
    before_doc_ids = all_doc_ids[:-1]
    
    # 2. Build Before and After graphs
    before_graph = build_graph_data(patient_id, db, limit_to_doc_ids=before_doc_ids)
    after_graph = build_graph_data(patient_id, db, limit_to_doc_ids=all_doc_ids)
    
    # 3. Calculate differences
    before_node_ids = {n.id for n in before_graph.nodes}
    after_node_ids = {n.id for n in after_graph.nodes}
    
    new_node_ids = after_node_ids - before_node_ids
    new_nodes = [n for n in after_graph.nodes if n.id in new_node_ids]
    
    before_edges_set = {(e.source, e.target, e.label) for e in before_graph.edges}
    after_edges_set = {(e.source, e.target, e.label) for e in after_graph.edges}
    
    new_edges_triples = after_edges_set - before_edges_set
    new_edges = [
        e for e in after_graph.edges
        if (e.source, e.target, e.label) in new_edges_triples
    ]
    
    # Calculate merged/enriched nodes
    def get_node_connections(node_id, edges_set):
        return {t for t in edges_set if t[0] == node_id or t[1] == node_id}
        
    merged_nodes_list = []
    for node in before_graph.nodes:
        if node.id == f"patient_{patient_id}":
            continue
        before_conn = get_node_connections(node.id, before_edges_set)
        after_conn = get_node_connections(node.id, after_edges_set)
        if len(after_conn - before_conn) > 0:
            merged_nodes_list.append(node)
            
    # 4. Fetch timeline additions
    additions = db.query(TimelineEvent).filter(
        TimelineEvent.patient_id == patient_id,
        TimelineEvent.document_id == latest_doc.id
    ).all()
    
    timeline_additions = [
        TimelineAdditionResponse(
            date=ev.date,
            event=ev.event,
            event_type=ev.event_type
        )
        for ev in additions
    ]
    
    return EvolutionResponse(
        patient_id=patient_id,
        latest_doc_name=latest_doc.filename,
        before_graph=before_graph,
        after_graph=after_graph,
        new_nodes=new_nodes,
        new_edges=new_edges,
        merged_nodes=merged_nodes_list,
        timeline_additions=timeline_additions
    )
