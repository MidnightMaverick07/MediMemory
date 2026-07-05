import os
import asyncio
import logging
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, init_db
from app.db.models import Patient, Document
from app.cognee_service.ingestion import ingest_document
from app.cognee_service.profile import remember_patient_profile
from app.cognee_service.client import init_cognee_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_script")

# Define synthetic data
PATIENTS_DATA = [
    {
        "name": "John Doe",
        "age": 54,
        "gender": "Male",
        "demographics": {"blood_group": "A+", "occupation": "Software Engineer"},
        "documents": [
            {
                "filename": "2023_05_lipid_and_hba1c_report.txt",
                "doc_type": "Lab Report",
                "content": """
DATE: May 12, 2023
PATIENT: John Doe
AGE: 51
CLINICAL FINDINGS:
Patient presents for routine physical.
Lab results:
- HbA1c: 8.5% (Reference range: < 5.7%) - HIGH.
- Total Cholesterol: 245 mg/dL (Reference range: < 200 mg/dL) - HIGH.
- LDL Cholesterol: 165 mg/dL (Reference range: < 100 mg/dL) - HIGH.
- CBC: Within normal limits.

DIAGNOSIS:
1. New-onset Type 2 Diabetes Mellitus.
2. Hyperlipidemia.

PLAN:
- Start Metformin 500mg once daily with breakfast.
- Diet modifications (low carb, low fat).
- Recheck labs in 6 months.
- Documented severe Allergy to Penicillin (rash and swelling).
- Family history: Father had coronary artery disease at age 58.
"""
            },
            {
                "filename": "2024_02_followup_and_surgery.txt",
                "doc_type": "Clinical Note",
                "content": """
DATE: February 18, 2024
PATIENT: John Doe
AGE: 52
CLINICAL FINDINGS:
Follow-up for Type 2 Diabetes. Patient reports variable compliance with Metformin and diet.
Lab results:
- HbA1c: 7.4% (HIGH, uncontrolled).
Patient also reports episodes of biliary colic. Ultrasound reveals gallstones.

PLAN:
- Increase Metformin to 1000mg daily.
- Add Jardiance 10mg daily.
- Refer to General Surgery for laparoscopic cholecystectomy due to symptomatic cholelithiasis.
"""
            },
            {
                "filename": "2024_03_surgical_discharge.txt",
                "doc_type": "Discharge Summary",
                "content": """
DATE: March 24, 2024
PATIENT: John Doe
AGE: 52
ADMISSION DATE: March 22, 2024
DISCHARGE DATE: March 24, 2024
SURGERY PERFORMED: Laparoscopic Cholecystectomy (gallbladder removal).
INDICATIONS: Symptomatic cholelithiasis with chronic cholecystitis.
SURGICAL FINDINGS: Distended gallbladder with multiple cholesterol stones. Normal common bile duct.
POST-OPERATIVE COURSE: Uncomplicated. Tolerated diet, pain controlled on oral analgesics.

DISCHARGE MEDS:
- Resume Metformin 1000mg daily and Jardiance 10mg daily.
- Acetaminophen 500mg as needed for surgical pain.
- Covid Booster vaccine administered prior to discharge.
"""
            },
            {
                "filename": "2025_05_annual_recheck.txt",
                "doc_type": "Lab Report",
                "content": """
DATE: May 15, 2025
PATIENT: John Doe
AGE: 53
CLINICAL FINDINGS:
Annual follow-up. Patient compliant with Metformin 1000mg and Jardiance 10mg. Reports regular exercise.
Lab results:
- HbA1c: 6.3% (Well controlled).
- LDL Cholesterol: 95 mg/dL (Normal/Controlled).
- Kidney Function (eGFR): Normal.

PLAN:
- Continue current diabetic regimen (Metformin + Jardiance).
- Annual eye exam and diabetic foot check scheduled.
- Influenza vaccine administered today.
"""
            }
        ]
    },
    {
        "name": "Sarah Smith",
        "age": 32,
        "gender": "Female",
        "demographics": {"blood_group": "O-", "occupation": "Teacher"},
        "documents": [
            {
                "filename": "2022_10_asthma_diagnosis.txt",
                "doc_type": "Clinical Note",
                "content": """
DATE: October 14, 2022
PATIENT: Sarah Smith
AGE: 28
CLINICAL FINDINGS:
Patient presents with dry cough and occasional wheezing, especially during exercise and exposure to cold air.
Pulmonary Function Test: Shows mild airway obstruction, responsive to bronchodilator.

DIAGNOSIS:
1. Mild Intermittent Asthma.
2. Documented severe allergy to Peanuts (anaphylaxis - carries EpiPen).
3. Family history: Mother has Rheumatoid Arthritis.

PLAN:
- Prescribe Albuterol HFA Inhaler: 2 puffs every 4-6 hours as needed for wheezing.
- Follow up in 6 months or if symptoms worsen.
- Scheduled and completed laparoscopic Appendectomy in April 2022.
"""
            },
            {
                "filename": "2023_04_asthma_worsening.txt",
                "doc_type": "Clinical Note",
                "content": """
DATE: April 22, 2023
PATIENT: Sarah Smith
AGE: 29
CLINICAL FINDINGS:
Patient returns with worsening asthma symptoms, waking up twice a week with shortness of breath. Using Albuterol rescue inhaler daily.
Allergic Rhinitis symptoms also prominent.

DIAGNOSIS:
1. Moderate Persistent Asthma (uncontrolled).
2. Allergic Rhinitis (pollen allergy).

PLAN:
- Start Symbicort (Budesonide/Formoterol) 160/4.5 mcg: 2 puffs twice daily (maintenance controller).
- Continue Albuterol rescue inhaler as needed.
- Start Claritin 10mg daily for seasonal allergies.
- Tdap vaccine administered.
"""
            },
            {
                "filename": "2024_05_asthma_controlled.txt",
                "doc_type": "Clinical Note",
                "content": """
DATE: May 10, 2024
PATIENT: Sarah Smith
AGE: 30
CLINICAL FINDINGS:
Asthma is now well controlled. No nocturnal awakenings. Uses Albuterol rescue inhaler less than once a week. Compliance with Symbicort is excellent.

PLAN:
- Continue Symbicort 160/4.5 mcg: 2 puffs twice daily.
- Refill Claritin for seasonal allergies.
- Influenza vaccine administered.
"""
            }
        ]
    },
    {
        "name": "Robert Johnson",
        "age": 68,
        "gender": "Male",
        "demographics": {"blood_group": "B+", "occupation": "Retired"},
        "documents": [
            {
                "filename": "2022_03_cardio_screening.txt",
                "doc_type": "Lab Report",
                "content": """
DATE: March 15, 2022
PATIENT: Robert Johnson
AGE: 64
CLINICAL FINDINGS:
Initial screening. Blood pressure: 135/85 mmHg (borderline elevated).
Lipid Panel results:
- Total Cholesterol: 255 mg/dL (HIGH).
- LDL Cholesterol: 172 mg/dL (HIGH).
- Triglycerides: 180 mg/dL (HIGH).
- Kidney and Liver function: Normal.

PLAN:
- Dietary and lifestyle counselling (low sodium, aerobic exercise).
- Monitor blood pressure at home. Recheck in 1 year.
"""
            },
            {
                "filename": "2023_03_hypertension_diagnosis.txt",
                "doc_type": "Clinical Note",
                "content": """
DATE: March 22, 2023
PATIENT: Robert Johnson
AGE: 65
CLINICAL FINDINGS:
Follow-up. Average home BP readings are 148/92 mmHg. In-office BP: 150/94 mmHg.
Repeat Lipid Panel shows persistent elevated LDL at 168 mg/dL.
Documented Allergy: Sulfa drugs (rash/hives).
Family History: Mother had stroke at age 72, history of hypertension.

DIAGNOSIS:
1. Stage 1 Hypertension.
2. Hyperlipidemia.

PLAN:
- Start Lisinopril 10mg once daily for BP control.
- Start Atorvastatin 20mg once daily for cholesterol control.
- Completed surgical repair of a right inguinal hernia in June 2023.
- Shingrix vaccine (1st dose) administered.
"""
            },
            {
                "filename": "2024_04_bp_controlled.txt",
                "doc_type": "Clinical Note",
                "content": """
DATE: April 10, 2024
PATIENT: Robert Johnson
AGE: 66
CLINICAL FINDINGS:
BP is well controlled at 122/78 mmHg. Tolerating Lisinopril well with no dry cough.
Repeat Lipid Panel:
- LDL Cholesterol: 82 mg/dL (Controlled).
Pneumococcal vaccine (PPSV23) administered today.

PLAN:
- Continue Lisinopril 10mg and Atorvastatin 20mg daily.
- Annual blood work scheduled.
"""
            }
        ]
    }
]

async def seed_data():
    # Initialize Cognee wrapper configurations
    await init_cognee_service()
    
    # Make sure tables are created
    init_db()
    
    db = SessionLocal()
    
    try:
        # Check if already seeded to prevent duplicate seeding
        existing = db.query(Patient).first()
        if existing:
            logger.info("Database already seeded with patients. Skipping.")
            return
            
        logger.info("Starting database seeding...")
        
        # Ensure uploads folder exists
        from app.config import settings
        os.makedirs(settings.upload_dir, exist_ok=True)
        
        for p_data in PATIENTS_DATA:
            logger.info("Creating patient profile: %s", p_data["name"])
            import json
            patient = Patient(
                name=p_data["name"],
                age=p_data["age"],
                gender=p_data["gender"],
                demographics=json.dumps(p_data["demographics"])
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)
            
            # Index profile into Cognee as root node
            logger.info("Indexing profile for patient %s in Cognee...", patient.name)
            await remember_patient_profile(db, patient.id)
            
            # Save files and create document records
            patient_dir = os.path.join(settings.upload_dir, f"patient_{patient.id}")
            os.makedirs(patient_dir, exist_ok=True)
            
            for doc_data in p_data["documents"]:
                file_path = os.path.join(patient_dir, doc_data["filename"])
                # Write file content to disk
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(doc_data["content"])
                    
                doc = Document(
                    patient_id=patient.id,
                    filename=doc_data["filename"],
                    file_path=file_path,
                    doc_type=doc_data["doc_type"],
                    status="uploaded"
                )
                db.add(doc)
                db.commit()
                db.refresh(doc)
                
                # Ingest document immediately through the real pipeline
                logger.info("Ingesting document %s for patient %s...", doc.filename, patient.name)
                await ingest_document(db, doc.id)
                
        logger.info("Seeding completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
