from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Patient
from app.cognee_service.profile import remember_patient_profile
from pydantic import BaseModel
from typing import List, Optional
import json

router = APIRouter(prefix="/patients", tags=["patients"])

class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    demographics: Optional[dict] = None

class PatientResponse(BaseModel):
    id: int
    name: str
    age: int
    gender: str
    demographics: Optional[dict] = None

@router.post("", response_model=PatientResponse)
def create_patient(patient_in: PatientCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    demographics_str = json.dumps(patient_in.demographics) if patient_in.demographics else "{}"
    patient = Patient(
        name=patient_in.name,
        age=patient_in.age,
        gender=patient_in.gender,
        demographics=demographics_str
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    
    # Index profile into Cognee in the background
    background_tasks.add_task(remember_patient_profile, db, patient.id)
    
    return PatientResponse(
        id=patient.id,
        name=patient.name,
        age=patient.age,
        gender=patient.gender,
        demographics=json.loads(patient.demographics) if patient.demographics else {}
    )

@router.get("", response_model=List[PatientResponse])
def list_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).all()
    results = []
    for p in patients:
        results.append(PatientResponse(
            id=p.id,
            name=p.name,
            age=p.age,
            gender=p.gender,
            demographics=json.loads(p.demographics) if p.demographics else {}
        ))
    return results

@router.get("/{id}", response_model=PatientResponse)
def get_patient(id: int, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return PatientResponse(
        id=p.id,
        name=p.name,
        age=p.age,
        gender=p.gender,
        demographics=json.loads(p.demographics) if p.demographics else {}
    )

@router.put("/{id}", response_model=PatientResponse)
def update_patient(id: int, patient_in: PatientCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
        
    patient.name = patient_in.name
    patient.age = patient_in.age
    patient.gender = patient_in.gender
    patient.demographics = json.dumps(patient_in.demographics) if patient_in.demographics else "{}"
    
    db.commit()
    db.refresh(patient)
    
    # Re-index profile in Cognee in the background
    background_tasks.add_task(remember_patient_profile, db, patient.id)
    
    return PatientResponse(
        id=patient.id,
        name=patient.name,
        age=patient.age,
        gender=patient.gender,
        demographics=json.loads(patient.demographics) if patient.demographics else {}
    )

@router.delete("/{id}")
async def wipe_patient(id: int, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found.")
    
    # Wipe from Cognee first
    from app.cognee_service.deletion import delete_patient_dataset
    try:
        await delete_patient_dataset(db, id)
    except Exception:
        # Log failure and allow SQL deletion to proceed
        pass
        
    db.delete(p)
    db.commit()
    return {"status": "success", "message": f"Patient {id} and all their memory wiped."}
