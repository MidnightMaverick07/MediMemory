from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Patient, Document, TimelineEvent
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json

router = APIRouter(prefix="/patients/{patient_id}/graph", tags=["graph"])

class NodeResponse(BaseModel):
    id: str
    label: str
    type: str
    description: str

class EdgeResponse(BaseModel):
    source: str
    target: str
    label: str

class GraphResponse(BaseModel):
    nodes: List[NodeResponse]
    edges: List[EdgeResponse]

def normalize_label(label: str) -> str:
    """Clean and normalize entity labels."""
    return " ".join(label.strip().split())

def build_graph_data(patient_id: int, db: Session, limit_to_doc_ids: Optional[List[int]] = None) -> GraphResponse:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    nodes: Dict[str, Dict[str, Any]] = {}
    edges: List[Dict[str, str]] = []

    # 1. Root Patient Node
    patient_id_str = f"patient_{patient.id}"
    nodes[patient_id_str] = {
        "id": patient_id_str,
        "label": patient.name,
        "type": "patient",
        "description": f"{patient.age}yo {patient.gender}. Root clinical profile memory node."
    }

    # Helper to add node if not exists or merge description
    def add_node(node_id: str, label: str, node_type: str, desc: str):
        node_id_lower = node_id.lower().strip()
        if node_id_lower not in nodes:
            nodes[node_id_lower] = {
                "id": node_id_lower,
                "label": label,
                "type": node_type,
                "description": desc
            }
        else:
            # Merge descriptions if not empty
            existing = nodes[node_id_lower]
            if desc and desc not in existing["description"]:
                existing["description"] += f" {desc}"

    # Helper to add unique edge
    def add_edge(src: str, tgt: str, rel: str):
        src_lower = src.lower().strip()
        tgt_lower = tgt.lower().strip()
        
        # Avoid self-referential edges
        if src_lower == tgt_lower:
            return
            
        edge_exists = any(
            e["source"] == src_lower and e["target"] == tgt_lower and e["label"] == rel
            for e in edges
        )
        if not edge_exists:
            edges.append({
                "source": src_lower,
                "target": tgt_lower,
                "label": rel
            })

    # 2. Add Documents (Report Nodes)
    docs = db.query(Document).filter(Document.patient_id == patient_id, Document.status == "completed").all()
    if limit_to_doc_ids is not None:
        docs = [d for d in docs if d.id in limit_to_doc_ids]

    for doc in docs:
        doc_node_id = f"doc_{doc.id}"
        add_node(
            doc_node_id,
            doc.filename,
            "report",
            f"{doc.doc_type} uploaded on {doc.upload_date.strftime('%B %d, %Y')}."
        )
        add_edge(patient_id_str, doc_node_id, "HAS_REPORT")

        # Extract entities from the Document's extracted_json
        if doc.extracted_json:
            try:
                entities = json.loads(doc.extracted_json)
                
                # A. Diseases
                for disease in entities.get("diseases", []):
                    clean_d = normalize_label(disease)
                    if clean_d:
                        add_node(clean_d, clean_d, "disease", f"Diagnosed / mentioned in {doc.filename}.")
                        add_edge(patient_id_str, clean_d, "DIAGNOSED_WITH")
                        add_edge(clean_d, doc_node_id, "RECORDED_IN")

                # B. Medications
                for med in entities.get("medications", []):
                    clean_m = normalize_label(med)
                    if clean_m:
                        add_node(clean_m, clean_m, "medication", f"Prescribed / active medication mentioned in {doc.filename}.")
                        add_edge(patient_id_str, clean_m, "PRESCRIBED")
                        add_edge(clean_m, doc_node_id, "RECORDED_IN")

                # C. Allergies
                for allergy in entities.get("allergies", []):
                    clean_a = normalize_label(allergy)
                    if clean_a:
                        add_node(clean_a, clean_a, "allergy", f"Documented allergy in {doc.filename}.")
                        add_edge(patient_id_str, clean_a, "ALLERGIC_TO")
                        add_edge(clean_a, doc_node_id, "RECORDED_IN")

                # D. Surgeries
                for surgery in entities.get("surgeries", []):
                    clean_s = normalize_label(surgery)
                    if clean_s:
                        add_node(clean_s, clean_s, "surgery", f"Surgical procedure mentioned in {doc.filename}.")
                        add_edge(patient_id_str, clean_s, "UNDERGONE")
                        add_edge(clean_s, doc_node_id, "RECORDED_IN")

                # E. Doctors
                for doctor in entities.get("doctors", []):
                    clean_doc = normalize_label(doctor)
                    if clean_doc:
                        add_node(clean_doc, clean_doc, "doctor", f"Healthcare provider in {doc.filename}.")
                        add_edge(patient_id_str, clean_doc, "TREATED_BY")
                        add_edge(clean_doc, doc_node_id, "RECORDED_IN")

                # F. Hospitals
                for hospital in entities.get("hospitals", []):
                    clean_hosp = normalize_label(hospital)
                    if clean_hosp:
                        add_node(clean_hosp, clean_hosp, "hospital", f"Medical facility in {doc.filename}.")
                        add_edge(patient_id_str, clean_hosp, "VISITED")
                        add_edge(clean_hosp, doc_node_id, "RECORDED_IN")

            except Exception:
                pass

    # 3. Add Timeline Events
    events = db.query(TimelineEvent).filter(TimelineEvent.patient_id == patient_id).all()
    if limit_to_doc_ids is not None:
        events = [ev for ev in events if ev.document_id is None or ev.document_id in limit_to_doc_ids]

    for ev in events:
        ev_node_id = f"event_{ev.id}"
        add_node(
            ev_node_id,
            f"Event: {ev.date}",
            "timeline_event",
            f"[{ev.event_type.upper()}] {ev.event}"
        )
        add_edge(patient_id_str, ev_node_id, "HAS_EVENT")
        
        # Link timeline event to its document if available
        if ev.document_id:
            doc_node_id = f"doc_{ev.document_id}"
            add_edge(ev_node_id, doc_node_id, "DERIVED_FROM")

        # Parse graph links from the timeline event
        if ev.graph_links:
            try:
                links = json.loads(ev.graph_links)
                for link in links:
                    src = link.get("source")
                    tgt = link.get("target")
                    rel = link.get("relation")
                    
                    if src and tgt and rel:
                        # Normalize source/target if they refer to the patient
                        src_node = patient_id_str if src.lower() in [patient.name.lower(), "patient"] else normalize_label(src)
                        tgt_node = patient_id_str if tgt.lower() in [patient.name.lower(), "patient"] else normalize_label(tgt)
                        
                        # Add target as a generic/disease node if not present
                        if src_node != patient_id_str and src_node.lower() not in nodes:
                            add_node(src_node, src_node, "concept", f"Semantic concept extracted from event on {ev.date}.")
                        if tgt_node != patient_id_str and tgt_node.lower() not in nodes:
                            add_node(tgt_node, tgt_node, "concept", f"Semantic concept extracted from event on {ev.date}.")
                            
                        add_edge(src_node, tgt_node, rel)
            except Exception:
                pass

    # Format the nodes list
    node_list = [
        NodeResponse(
            id=n["id"],
            label=n["label"],
            type=n["type"],
            description=n["description"]
        )
        for n in nodes.values()
    ]

    edge_list = [
        EdgeResponse(
            source=e["source"],
            target=e["target"],
            label=e["label"]
        )
        for e in edges
    ]

    return GraphResponse(nodes=node_list, edges=edge_list)

@router.get("", response_model=GraphResponse)
def get_patient_graph(patient_id: int, db: Session = Depends(get_db)):
    return build_graph_data(patient_id, db)
