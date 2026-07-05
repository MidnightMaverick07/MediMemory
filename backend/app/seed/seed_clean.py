import os
import asyncio
import logging
import json
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, init_db
from app.db.models import Patient, Document, TimelineEvent
from app.cognee_service.client import init_cognee_service, cognee_cloud as cognee
from app.cognee_service.profile import remember_patient_profile

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_clean")

PATIENTS_DATA = [
    {
        "name": "John Doe",
        "age": 54,
        "gender": "Male",
        "demographics": {"blood_group": "A+", "occupation": "Software Engineer", "height": "5'10\"", "weight": "84 kg", "emergency_contact": "Jane Doe — +1 555-123-4567"},
        "documents": [
            {
                "filename": "2023_05_lipid_and_hba1c_report.txt",
                "doc_type": "Lab Report",
                "content": "DATE: May 12, 2023\nPATIENT: John Doe\nAGE: 51\nCLINICAL FINDINGS:\nPatient presents for routine physical. Lab results:\n- HbA1c: 8.5% (Reference range: < 5.7%) - HIGH.\n- Total Cholesterol: 245 mg/dL (Reference range: < 200 mg/dL) - HIGH.\n- LDL Cholesterol: 165 mg/dL (Reference range: < 100 mg/dL) - HIGH.\n- CBC: Within normal limits.\n\nDIAGNOSIS:\n1. New-onset Type 2 Diabetes Mellitus.\n2. Hyperlipidemia.\n\nPLAN:\n- Start Metformin 500mg once daily with breakfast.\n- Diet modifications (low carb, low fat).\n- Recheck labs in 6 months.\n- Documented severe Allergy to Penicillin (rash and swelling).\n- Family history: Father had coronary artery disease at age 58.",
                "entities": {
                    "diseases": ["Type 2 Diabetes Mellitus", "Hyperlipidemia"],
                    "medications": ["Metformin 500mg"],
                    "allergies": ["Penicillin"],
                    "doctors": [],
                    "hospitals": [],
                    "dates": ["May 12, 2023"],
                    "lab_values": ["HbA1c: 8.5%", "Total Cholesterol: 245 mg/dL", "LDL Cholesterol: 165 mg/dL"],
                    "symptoms": [],
                    "surgeries": []
                },
                "timeline": {
                    "date": "2023-05-12",
                    "event": "Diagnosed with new-onset Type 2 Diabetes Mellitus and Hyperlipidemia. Metformin 500mg daily started. Penicillin allergy noted.",
                    "event_type": "diagnosis",
                    "diseases": ["Type 2 Diabetes Mellitus", "Hyperlipidemia"],
                    "medications": ["Metformin 500mg"],
                    "entities": {"Lab values": ["HbA1c: 8.5%", "Total Cholesterol: 245 mg/dL", "LDL Cholesterol: 165 mg/dL"], "Allergies": ["Penicillin"]},
                    "graph_links": [
                        {"source": "John Doe", "relation": "DIAGNOSED_WITH", "target": "Type 2 Diabetes Mellitus"},
                        {"source": "John Doe", "relation": "DIAGNOSED_WITH", "target": "Hyperlipidemia"},
                        {"source": "Metformin 500mg", "relation": "TREATS", "target": "Type 2 Diabetes Mellitus"}
                    ]
                }
            },
            {
                "filename": "2024_02_followup_and_surgery.txt",
                "doc_type": "Clinical Note",
                "content": "DATE: February 18, 2024\nPATIENT: John Doe\nAGE: 52\nCLINICAL FINDINGS:\nFollow-up for Type 2 Diabetes. Patient reports variable compliance with Metformin and diet. Lab results:\n- HbA1c: 7.4% (HIGH, uncontrolled).\nPatient also reports episodes of biliary colic. Ultrasound reveals gallstones.\n\nPLAN:\n- Increase Metformin to 1000mg daily.\n- Add Jardiance 10mg daily.\n- Refer to General Surgery for laparoscopic cholecystectomy due to symptomatic cholelithiasis.",
                "entities": {
                    "diseases": ["Type 2 Diabetes", "Symptomatic cholelithiasis", "Gallstones"],
                    "medications": ["Metformin 1000mg", "Jardiance 10mg"],
                    "allergies": ["Penicillin"],
                    "doctors": [],
                    "hospitals": [],
                    "dates": ["February 18, 2024"],
                    "lab_values": ["HbA1c: 7.4%"],
                    "symptoms": ["biliary colic"],
                    "surgeries": []
                },
                "timeline": {
                    "date": "2024-02-18",
                    "event": "Follow-up for uncontrolled Type 2 Diabetes. Metformin increased to 1000mg and Jardiance 10mg added. Gallstones detected on ultrasound; referred for surgery.",
                    "event_type": "medication_change",
                    "diseases": ["Type 2 Diabetes", "Symptomatic cholelithiasis", "Gallstones"],
                    "medications": ["Metformin 1000mg", "Jardiance 10mg"],
                    "entities": {"Lab values": ["HbA1c: 7.4%"], "Symptoms": ["biliary colic"]},
                    "graph_links": [
                        {"source": "John Doe", "relation": "PRESCRIBED", "target": "Jardiance 10mg"},
                        {"source": "John Doe", "relation": "HAS_CONDITION", "target": "Symptomatic cholelithiasis"}
                    ]
                }
            },
            {
                "filename": "2024_03_surgical_discharge.txt",
                "doc_type": "Discharge Summary",
                "content": "DATE: March 24, 2024\nPATIENT: John Doe\nAGE: 52\nADMISSION DATE: March 22, 2024\nDISCHARGE DATE: March 24, 2024\nSURGERY PERFORMED: Laparoscopic Cholecystectomy (gallbladder removal).\nINDICATIONS: Symptomatic cholelithiasis with chronic cholecystitis.\nSURGICAL FINDINGS: Distended gallbladder with multiple cholesterol stones. Normal common bile duct.\nPOST-OPERATIVE COURSE: Uncomplicated. Tolerated diet, pain controlled on oral analgesics.\n\nDISCHARGE MEDS:\n- Resume Metformin 1000mg daily and Jardiance 10mg daily.\n- Acetaminophen 500mg as needed for surgical pain.\n- Covid Booster vaccine administered prior to discharge.",
                "entities": {
                    "diseases": ["Symptomatic cholelithiasis", "Chronic cholecystitis"],
                    "medications": ["Metformin 1000mg", "Jardiance 10mg", "Acetaminophen 500mg", "Covid Booster vaccine"],
                    "allergies": ["Penicillin"],
                    "doctors": [],
                    "hospitals": [],
                    "dates": ["March 22, 2024", "March 24, 2024"],
                    "lab_values": [],
                    "symptoms": ["surgical pain"],
                    "surgeries": ["Laparoscopic Cholecystectomy"]
                },
                "timeline": {
                    "date": "2024-03-24",
                    "event": "Underwent Laparoscopic Cholecystectomy for gallstones. Discharged in stable condition. Resumed diabetic medications.",
                    "event_type": "surgery",
                    "diseases": ["Symptomatic cholelithiasis", "Chronic cholecystitis"],
                    "medications": ["Metformin 1000mg", "Jardiance 10mg", "Acetaminophen 500mg"],
                    "entities": {"Procedures": ["Laparoscopic Cholecystectomy"], "Vaccines": ["Covid Booster"]},
                    "graph_links": [
                        {"source": "John Doe", "relation": "UNDERWENT", "target": "Laparoscopic Cholecystectomy"},
                        {"source": "Laparoscopic Cholecystectomy", "relation": "TREATED", "target": "Symptomatic cholelithiasis"}
                    ]
                }
            },
            {
                "filename": "2025_05_annual_recheck.txt",
                "doc_type": "Lab Report",
                "content": "DATE: May 15, 2025\nPATIENT: John Doe\nAGE: 53\nCLINICAL FINDINGS:\nAnnual follow-up. Patient compliant with Metformin 1000mg and Jardiance 10mg. Reports regular exercise. Lab results:\n- HbA1c: 6.3% (Well controlled).\n- LDL Cholesterol: 95 mg/dL (Normal/Controlled).\n- Kidney Function (eGFR): Normal.\n\nPLAN:\n- Continue current diabetic regimen (Metformin + Jardiance).\n- Annual eye exam and diabetic foot check scheduled.\n- Influenza vaccine administered today.",
                "entities": {
                    "diseases": ["Type 2 Diabetes"],
                    "medications": ["Metformin 1000mg", "Jardiance 10mg", "Influenza vaccine"],
                    "allergies": ["Penicillin"],
                    "doctors": [],
                    "hospitals": [],
                    "dates": ["May 15, 2025"],
                    "lab_values": ["HbA1c: 6.3%", "LDL Cholesterol: 95 mg/dL", "eGFR: Normal"],
                    "symptoms": [],
                    "surgeries": []
                },
                "timeline": {
                    "date": "2025-05-15",
                    "event": "Annual review. Diabetes well controlled with HbA1c 6.3% and LDL 95 mg/dL. eGFR normal. Influenza vaccine administered.",
                    "event_type": "checkup",
                    "diseases": ["Type 2 Diabetes"],
                    "medications": ["Metformin 1000mg", "Jardiance 10mg"],
                    "entities": {"Lab values": ["HbA1c: 6.3%", "LDL: 95 mg/dL"], "Vaccines": ["Influenza vaccine"]},
                    "graph_links": [
                        {"source": "John Doe", "relation": "HAS_VALUE", "target": "HbA1c: 6.3%"}
                    ]
                }
            }
        ]
    },
    {
        "name": "Sarah Smith",
        "age": 32,
        "gender": "Female",
        "demographics": {"blood_group": "O-", "occupation": "Teacher", "height": "5'6\"", "weight": "63 kg", "emergency_contact": "Mark Smith — +1 555-987-6543"},
        "documents": [
            {
                "filename": "2022_10_asthma_diagnosis.txt",
                "doc_type": "Clinical Note",
                "content": "DATE: October 14, 2022\nPATIENT: Sarah Smith\nAGE: 28\nCLINICAL FINDINGS:\nPatient presents with dry cough and occasional wheezing, especially during exercise and exposure to cold air. Pulmonary Function Test: Shows mild airway obstruction, responsive to bronchodilator.\n\nDIAGNOSIS:\n1. Mild Intermittent Asthma.\n2. Documented severe allergy to Peanuts (anaphylaxis - carries EpiPen).\n3. Family history: Mother has Rheumatoid Arthritis.\n\nPLAN:\n- Prescribe Albuterol HFA Inhaler: 2 puffs every 4-6 hours as needed for wheezing.\n- Follow up in 6 months or if symptoms worsen.\n- Scheduled and completed laparoscopic Appendectomy in April 2022.",
                "entities": {
                    "diseases": ["Mild Intermittent Asthma"],
                    "medications": ["Albuterol HFA Inhaler"],
                    "allergies": ["Peanuts"],
                    "doctors": [],
                    "hospitals": [],
                    "dates": ["October 14, 2022", "April 2022"],
                    "lab_values": ["Pulmonary Function Test: mild airway obstruction"],
                    "symptoms": ["dry cough", "wheezing"],
                    "surgeries": ["Laparoscopic Appendectomy"]
                },
                "timeline": {
                    "date": "2022-10-14",
                    "event": "Diagnosed with Mild Intermittent Asthma. Albuterol inhaler prescribed. Severe peanut allergy (anaphylaxis) noted. Prior appendectomy in April 2022.",
                    "event_type": "diagnosis",
                    "diseases": ["Mild Intermittent Asthma"],
                    "medications": ["Albuterol HFA Inhaler"],
                    "entities": {"Allergies": ["Peanuts"], "Surgeries": ["Laparoscopic Appendectomy"]},
                    "graph_links": [
                        {"source": "Sarah Smith", "relation": "DIAGNOSED_WITH", "target": "Mild Intermittent Asthma"},
                        {"source": "Sarah Smith", "relation": "ALLERGIC_TO", "target": "Peanuts"}
                    ]
                }
            },
            {
                "filename": "2023_04_asthma_worsening.txt",
                "doc_type": "Clinical Note",
                "content": "DATE: April 22, 2023\nPATIENT: Sarah Smith\nAGE: 29\nCLINICAL FINDINGS:\nPatient returns with worsening asthma symptoms, waking up twice a week with shortness of breath. Using Albuterol rescue inhaler daily. Allergic Rhinitis symptoms also prominent.\n\nDIAGNOSIS:\n1. Moderate Persistent Asthma (uncontrolled).\n2. Allergic Rhinitis (pollen allergy).\n\nPLAN:\n- Start Symbicort (Budesonide/Formoterol) 160/4.5 mcg: 2 puffs twice daily (maintenance controller).\n- Continue Albuterol rescue inhaler as needed.\n- Start Claritin 10mg daily for seasonal allergies.\n- Tdap vaccine administered.",
                "entities": {
                    "diseases": ["Moderate Persistent Asthma", "Allergic Rhinitis"],
                    "medications": ["Symbicort 160/4.5 mcg", "Albuterol", "Claritin 10mg", "Tdap vaccine"],
                    "allergies": ["Peanuts"],
                    "doctors": [],
                    "hospitals": [],
                    "dates": ["April 22, 2023"],
                    "lab_values": [],
                    "symptoms": ["shortness of breath", "wheezing"],
                    "surgeries": []
                },
                "timeline": {
                    "date": "2023-04-22",
                    "event": "Asthma worsened (Moderate Persistent). Symbicort and Claritin daily initiated. Tdap vaccine administered.",
                    "event_type": "medication_change",
                    "diseases": ["Moderate Persistent Asthma", "Allergic Rhinitis"],
                    "medications": ["Symbicort", "Claritin", "Albuterol"],
                    "entities": {"Vaccines": ["Tdap vaccine"]},
                    "graph_links": [
                        {"source": "Sarah Smith", "relation": "PRESCRIBED", "target": "Symbicort"}
                    ]
                }
            },
            {
                "filename": "2024_05_asthma_controlled.txt",
                "doc_type": "Clinical Note",
                "content": "DATE: May 10, 2024\nPATIENT: Sarah Smith\nAGE: 30\nCLINICAL FINDINGS:\nAsthma is now well controlled. No nocturnal awakenings. Uses Albuterol rescue inhaler less than once a week. Compliance with Symbicort is excellent.\n\nPLAN:\n- Continue Symbicort 160/4.5 mcg: 2 puffs twice daily.\n- Refill Claritin for seasonal allergies.\n- Influenza vaccine administered.",
                "entities": {
                    "diseases": ["Asthma"],
                    "medications": ["Symbicort 160/4.5 mcg", "Claritin", "Albuterol", "Influenza vaccine"],
                    "allergies": ["Peanuts"],
                    "doctors": [],
                    "hospitals": [],
                    "dates": ["May 10, 2024"],
                    "lab_values": [],
                    "symptoms": [],
                    "surgeries": []
                },
                "timeline": {
                    "date": "2024-05-10",
                    "event": "Asthma now well controlled on daily Symbicort. Influenza vaccine administered.",
                    "event_type": "checkup",
                    "diseases": ["Asthma"],
                    "medications": ["Symbicort", "Claritin"],
                    "entities": {"Vaccines": ["Influenza vaccine"]},
                    "graph_links": [
                        {"source": "Sarah Smith", "relation": "CONTROLS", "target": "Asthma"}
                    ]
                }
            }
        ]
    },
    {
        "name": "Robert Johnson",
        "age": 68,
        "gender": "Male",
        "demographics": {"blood_group": "B+", "occupation": "Retired", "height": "5'9\"", "weight": "78 kg", "emergency_contact": "Mark Johnson — +1 555-987-6543"},
        "documents": [
            {
                "filename": "2022_03_cardio_screening.txt",
                "doc_type": "Lab Report",
                "content": "DATE: March 15, 2022\nPATIENT: Robert Johnson\nAGE: 64\nCLINICAL FINDINGS:\nInitial screening. Blood pressure: 135/85 mmHg (borderline elevated). Lipid Panel results:\n- Total Cholesterol: 255 mg/dL (HIGH).\n- LDL Cholesterol: 172 mg/dL (HIGH).\n- Triglycerides: 180 mg/dL (HIGH).\n- Kidney and Liver function: Normal.\n\nPLAN:\n- Dietary and lifestyle counselling (low sodium, aerobic exercise).\n- Monitor blood pressure at home. Recheck in 1 year.",
                "entities": {
                    "diseases": ["Borderline elevated blood pressure", "Hyperlipidemia"],
                    "medications": [],
                    "allergies": [],
                    "doctors": [],
                    "hospitals": [],
                    "dates": ["March 15, 2022"],
                    "lab_values": ["Blood pressure: 135/85 mmHg", "Total Cholesterol: 255 mg/dL", "LDL Cholesterol: 172 mg/dL", "Triglycerides: 180 mg/dL"],
                    "symptoms": [],
                    "surgeries": []
                },
                "timeline": {
                    "date": "2022-03-15",
                    "event": "Initial cardiovascular screening. Borderline elevated blood pressure (135/85 mmHg) and Hyperlipidemia (LDL 172 mg/dL) identified.",
                    "event_type": "lab_report",
                    "diseases": ["Borderline elevated blood pressure", "Hyperlipidemia"],
                    "medications": [],
                    "entities": {"Lab values": ["LDL: 172 mg/dL", "Total Cholesterol: 255 mg/dL"]},
                    "graph_links": [
                        {"source": "Robert Johnson", "relation": "HAS_CONDITION", "target": "Hyperlipidemia"}
                    ]
                }
            },
            {
                "filename": "2023_03_hypertension_diagnosis.txt",
                "doc_type": "Clinical Note",
                "content": "DATE: March 22, 2023\nPATIENT: Robert Johnson\nAGE: 65\nCLINICAL FINDINGS:\nFollow-up. Average home BP readings are 148/92 mmHg. In-office BP: 150/94 mmHg. Repeat Lipid Panel shows persistent elevated LDL at 168 mg/dL. Documented Allergy: Sulfa drugs (rash/hives). Family History: Mother had stroke at age 72, history of hypertension.\n\nDIAGNOSIS:\n1. Stage 1 Hypertension.\n2. Hyperlipidemia.\n\nPLAN:\n- Start Lisinopril 10mg once daily for BP control.\n- Start Atorvastatin 20mg once daily for cholesterol control.\n- Completed surgical repair of a right inguinal hernia in June 2023.\n- Shingrix vaccine (1st dose) administered.",
                "entities": {
                    "diseases": ["Stage 1 Hypertension", "Hyperlipidemia"],
                    "medications": ["Lisinopril 10mg", "Atorvastatin 20mg", "Shingrix vaccine"],
                    "allergies": ["Sulfa drugs"],
                    "doctors": [],
                    "hospitals": [],
                    "dates": ["March 22, 2023", "June 2023"],
                    "lab_values": ["BP: 150/94 mmHg", "LDL: 168 mg/dL"],
                    "symptoms": [],
                    "surgeries": ["Surgical repair of right inguinal hernia"]
                },
                "timeline": {
                    "date": "2023-03-22",
                    "event": "Diagnosed with Stage 1 Hypertension and persistent Hyperlipidemia. Lisinopril 10mg and Atorvastatin 20mg daily started. Sulfa allergy documented. Scheduled right inguinal hernia repair for June 2023.",
                    "event_type": "diagnosis",
                    "diseases": ["Stage 1 Hypertension", "Hyperlipidemia"],
                    "medications": ["Lisinopril 10mg", "Atorvastatin 20mg"],
                    "entities": {"Allergies": ["Sulfa drugs"], "Surgeries": ["Right inguinal hernia repair"]},
                    "graph_links": [
                        {"source": "Robert Johnson", "relation": "DIAGNOSED_WITH", "target": "Stage 1 Hypertension"},
                        {"source": "Robert Johnson", "relation": "DIAGNOSED_WITH", "target": "Hyperlipidemia"}
                    ]
                }
            },
            {
                "filename": "2024_04_bp_controlled.txt",
                "doc_type": "Clinical Note",
                "content": "DATE: April 10, 2024\nPATIENT: Robert Johnson\nAGE: 66\nCLINICAL FINDINGS:\nBP is well controlled at 122/78 mmHg. Tolerating Lisinopril well with no dry cough. Repeat Lipid Panel:\n- LDL Cholesterol: 82 mg/dL (Controlled).\nPneumococcal vaccine (PPSV23) administered today.\n\nPLAN:\n- Continue Lisinopril 10mg and Atorvastatin 20mg daily.\n- Annual blood work scheduled.",
                "entities": {
                    "diseases": ["Hypertension", "Hyperlipidemia"],
                    "medications": ["Lisinopril 10mg", "Atorvastatin 20mg", "Pneumococcal vaccine (PPSV23)"],
                    "allergies": ["Sulfa drugs"],
                    "doctors": [],
                    "hospitals": [],
                    "dates": ["April 10, 2024"],
                    "lab_values": ["BP: 122/78 mmHg", "LDL Cholesterol: 82 mg/dL"],
                    "symptoms": [],
                    "surgeries": []
                },
                "timeline": {
                    "date": "2024-04-10",
                    "event": "Hypertension and Hyperlipidemia well controlled on daily Lisinopril and Atorvastatin. Pneumococcal vaccine administered.",
                    "event_type": "checkup",
                    "diseases": ["Hypertension", "Hyperlipidemia"],
                    "medications": ["Lisinopril 10mg", "Atorvastatin 20mg"],
                    "entities": {"Lab values": ["BP: 122/78 mmHg", "LDL: 82 mg/dL"], "Vaccines": ["Pneumococcal vaccine (PPSV23)"]},
                    "graph_links": [
                        {"source": "Robert Johnson", "relation": "CONTROLS", "target": "Hypertension"}
                    ]
                }
            }
        ]
    }
]

async def seed_data():
    await init_cognee_service()
    init_db()
    
    db = SessionLocal()
    
    try:
        logger.info("Starting clean seeding script...")
        from app.config import settings
        os.makedirs(settings.upload_dir, exist_ok=True)
        
        for p_data in PATIENTS_DATA:
            logger.info("Creating patient profile: %s", p_data["name"])
            patient = Patient(
                name=p_data["name"],
                age=p_data["age"],
                gender=p_data["gender"],
                demographics=json.dumps(p_data["demographics"])
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)
            
            # 1. Index profile into Cognee Cloud as root node
            logger.info("Indexing profile for patient %s in Cognee...", patient.name)
            await remember_patient_profile(db, patient.id)
            
            patient_dir = os.path.join(settings.upload_dir, f"patient_{patient.id}")
            os.makedirs(patient_dir, exist_ok=True)
            
            for doc_data in p_data["documents"]:
                filename = doc_data["filename"]
                file_path = os.path.join(patient_dir, filename)
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(doc_data["content"])
                
                doc = Document(
                    patient_id=patient.id,
                    filename=filename,
                    file_path=file_path,
                    doc_type=doc_data["doc_type"],
                    status="completed",
                    extracted_text=doc_data["content"],
                    extracted_json=json.dumps(doc_data["entities"])
                )
                db.add(doc)
                db.commit()
                db.refresh(doc)
                
                # 2. Ingest document text into Cognee Cloud
                logger.info("Ingesting document %s for patient %s into Cognee Cloud...", doc.filename, patient.name)
                dataset_name = f"patient_{patient.id}"
                await cognee.remember(
                    data=doc_data["content"],
                    dataset_name=dataset_name
                )
                
                # 3. Trigger ontological improvement on Cognee Cloud
                logger.info("Improving ontology for dataset %s...", dataset_name)
                await cognee.improve(dataset_name)
                
                # 4. Insert timeline event record directly into SQLite
                timeline = doc_data["timeline"]
                
                # Format nested fields
                diseases_str = json.dumps(timeline["diseases"])
                medications_str = json.dumps(timeline["medications"])
                entities_str = json.dumps(timeline["entities"])
                links_str = json.dumps(timeline["graph_links"])
                
                ev = TimelineEvent(
                    patient_id=patient.id,
                    document_id=doc.id,
                    date=timeline["date"],
                    event=timeline["event"],
                    event_type=timeline["event_type"],
                    diseases=diseases_str,
                    medications=medications_str,
                    entities=entities_str,
                    graph_links=links_str
                )
                db.add(ev)
                db.commit()
                logger.info("✓ Seeded document and timeline event for %s", filename)
                
        logger.info("✓✓ Seeding completed successfully with zero Gemini API quota usage!")
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
