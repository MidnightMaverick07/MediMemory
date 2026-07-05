"""
Direct SQL seed script — bypasses Cognee/LLM entirely.
Creates patients, documents, and pre-fabricated timeline events so
the Feature 2 UI can be verified without consuming API quota.
"""
import os
import json
import asyncio
import logging
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, init_db
from app.db.models import Patient, Document, TimelineEvent
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_direct")

# ─── Document text content ────────────────────────────────────────────────────
JOHN_DOC1_TEXT = """DATE: May 12, 2023
PATIENT: John Doe | AGE: 51

CLINICAL FINDINGS:
Patient presents for routine physical. Lab results:
  - HbA1c: 7.2% (above normal, consistent with pre-diabetes / early Type 2 Diabetes)
  - LDL Cholesterol: 148 mg/dL (borderline high)
  - HDL: 42 mg/dL
  - Blood Pressure: 138/88 mmHg (Stage 1 hypertension)
  - Fasting Glucose: 122 mg/dL

ASSESSMENT: Newly diagnosed Type 2 Diabetes. Borderline hypertension and dyslipidemia.
PLAN: Initiate Metformin 500mg twice daily. Low-carb diet counseling. Lifestyle modification.
Statin therapy discussed. Follow-up in 3 months with repeat HbA1c.
"""

JOHN_DOC2_TEXT = """DATE: February 18, 2024
PATIENT: John Doe | AGE: 52

PRE-OPERATIVE ASSESSMENT:
Patient admitted for elective laparoscopic cholecystectomy (gallbladder removal).
History of symptomatic cholelithiasis (gallstones) with recurring biliary colic since late 2023.
Background: Type 2 Diabetes (on Metformin 1000mg/day), hypertension.

SURGERY: Laparoscopic cholecystectomy performed under general anaesthesia.
Duration: 1 hour 20 minutes. No intraoperative complications.

POST-OP: Pain controlled with paracetamol + tramadol PRN. Patient ambulated day 1.
Discharge day 3. Wound healing well. Resume Metformin 48 hours post-discharge.
"""

JOHN_DOC3_TEXT = """DATE: March 10, 2024
PATIENT: John Doe | AGE: 52

FOLLOW-UP: Post-cholecystectomy, 3 weeks.
Wound healed. No infection signs. Patient tolerating low-fat diet well.

MEDICATION REVIEW:
  - Metformin 1000mg twice daily – continued
  - Atorvastatin 20mg added for dyslipidemia (LDL 161 mg/dL on repeat labs)
  - Lisinopril 5mg added for hypertension (BP: 142/90 mmHg)

HbA1c: 7.0% — slight improvement.
PLAN: Continue current regimen. Review in 6 months.
"""

JOHN_DOC4_TEXT = """DATE: May 28, 2025
PATIENT: John Doe | AGE: 53

ANNUAL REVIEW:
Good overall control. HbA1c: 6.8% (improved). LDL: 98 mg/dL (at target on statin).
BP: 128/82 mmHg. Weight: 84 kg (BMI 27.2, down from 88 kg at baseline).

ACTIVE MEDICATIONS:
  - Metformin 1000mg BD
  - Atorvastatin 20mg ON
  - Lisinopril 5mg OD

ASSESSMENT: Well-controlled Type 2 Diabetes. Hypertension stable. Dyslipidaemia at target.
Flagged: mild peripheral neuropathy symptoms — referral to neurology for evaluation.
"""

# ─── Pre-fabricated timeline events ──────────────────────────────────────────
def make_john_timeline_events(doc_ids: dict) -> list:
    return [
        {
            "document_id": doc_ids[1],
            "date": "2023-05-12",
            "event": "Newly diagnosed with Type 2 Diabetes based on HbA1c 7.2% and fasting glucose 122 mg/dL. Borderline hypertension (138/88 mmHg) and dyslipidemia (LDL 148 mg/dL) also identified. Metformin 500mg BD initiated.",
            "event_type": "diagnosis",
            "diseases": json.dumps(["Type 2 Diabetes", "Borderline Hypertension", "Dyslipidemia"]),
            "medications": json.dumps(["Metformin 500mg"]),
            "entities": json.dumps({
                "Lab Values": ["HbA1c 7.2%", "LDL 148 mg/dL", "HDL 42 mg/dL", "Fasting Glucose 122 mg/dL"],
                "Vitals": ["BP 138/88 mmHg"],
                "Lifestyle": ["Low-carb diet counseling", "Lifestyle modification advised"]
            }),
            "graph_links": json.dumps([
                {"source": "John Doe", "relation": "DIAGNOSED_WITH", "target": "Type 2 Diabetes"},
                {"source": "Type 2 Diabetes", "relation": "TREATED_WITH", "target": "Metformin 500mg"},
                {"source": "HbA1c", "relation": "INDICATES", "target": "Type 2 Diabetes"},
            ])
        },
        {
            "document_id": doc_ids[2],
            "date": "2024-02-18",
            "event": "Elective laparoscopic cholecystectomy performed for symptomatic cholelithiasis (gallstones). Surgery uneventful, duration 1 hour 20 minutes. Discharged day 3 post-operative. Metformin held peri-operatively and resumed 48 hrs post-discharge.",
            "event_type": "surgery",
            "diseases": json.dumps(["Cholelithiasis", "Type 2 Diabetes", "Hypertension"]),
            "medications": json.dumps(["Paracetamol", "Tramadol PRN", "Metformin 1000mg"]),
            "entities": json.dumps({
                "Procedure": ["Laparoscopic Cholecystectomy", "General Anaesthesia"],
                "Symptoms": ["Biliary colic", "Gallstones"],
                "Post-Op": ["Ambulated day 1", "Discharged day 3", "Wound healing well"]
            }),
            "graph_links": json.dumps([
                {"source": "John Doe", "relation": "UNDERWENT", "target": "Laparoscopic Cholecystectomy"},
                {"source": "Cholelithiasis", "relation": "CAUSED", "target": "Biliary Colic"},
                {"source": "Laparoscopic Cholecystectomy", "relation": "TREATED", "target": "Cholelithiasis"},
            ])
        },
        {
            "document_id": doc_ids[3],
            "date": "2024-03-10",
            "event": "Post-operative follow-up 3 weeks after cholecystectomy — wound healed. Medication regimen expanded: Atorvastatin 20mg added for dyslipidemia (LDL 161 mg/dL), Lisinopril 5mg added for hypertension. Metformin dose increased to 1000mg BD.",
            "event_type": "medication_change",
            "diseases": json.dumps(["Dyslipidemia", "Hypertension", "Type 2 Diabetes"]),
            "medications": json.dumps(["Metformin 1000mg", "Atorvastatin 20mg", "Lisinopril 5mg"]),
            "entities": json.dumps({
                "Lab Values": ["LDL 161 mg/dL", "HbA1c 7.0%"],
                "Vitals": ["BP 142/90 mmHg"],
                "Added Medications": ["Atorvastatin 20mg", "Lisinopril 5mg"],
                "Post-Op": ["Wound healed", "No infection"]
            }),
            "graph_links": json.dumps([
                {"source": "John Doe", "relation": "PRESCRIBED", "target": "Atorvastatin 20mg"},
                {"source": "John Doe", "relation": "PRESCRIBED", "target": "Lisinopril 5mg"},
                {"source": "Atorvastatin 20mg", "relation": "TREATS", "target": "Dyslipidemia"},
                {"source": "Lisinopril 5mg", "relation": "TREATS", "target": "Hypertension"},
            ])
        },
        {
            "document_id": doc_ids[4],
            "date": "2025-05-28",
            "event": "Annual review shows excellent metabolic control: HbA1c improved to 6.8%, LDL at target (98 mg/dL), BP stable (128/82 mmHg). Weight reduced by 4 kg. New finding: mild peripheral neuropathy symptoms. Referral to neurology initiated.",
            "event_type": "checkup",
            "diseases": json.dumps(["Type 2 Diabetes", "Hypertension", "Dyslipidemia", "Peripheral Neuropathy"]),
            "medications": json.dumps(["Metformin 1000mg", "Atorvastatin 20mg", "Lisinopril 5mg"]),
            "entities": json.dumps({
                "Lab Values": ["HbA1c 6.8%", "LDL 98 mg/dL"],
                "Vitals": ["BP 128/82 mmHg", "Weight 84kg", "BMI 27.2"],
                "New Findings": ["Mild peripheral neuropathy"],
                "Referrals": ["Neurology referral"]
            }),
            "graph_links": json.dumps([
                {"source": "John Doe", "relation": "HAS_FINDING", "target": "Peripheral Neuropathy"},
                {"source": "Type 2 Diabetes", "relation": "COMPLICATION", "target": "Peripheral Neuropathy"},
                {"source": "Peripheral Neuropathy", "relation": "REFERRED_TO", "target": "Neurology"},
                {"source": "HbA1c 6.8%", "relation": "INDICATES", "target": "Controlled Diabetes"},
            ])
        },
    ]


async def seed_data():
    logger.info("Initializing database schema...")
    init_db()

    db: Session = SessionLocal()
    try:
        # Check if already seeded
        existing = db.query(Patient).count()
        if existing > 0:
            logger.info("Database already seeded. Skipping.")
            return

        logger.info("Seeding patient: John Doe")
        patient = Patient(
            name="John Doe",
            age=54,
            gender="Male",
            demographics=json.dumps({
                "blood_group": "A+",
                "height": "5'10\"",
                "weight": "84 kg",
                "occupation": "Software Engineer",
                "emergency_contact": "Jane Doe — +1 555-123-4567"
            })
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

        # Create upload directory
        patient_dir = os.path.join(settings.upload_dir, f"patient_{patient.id}")
        os.makedirs(patient_dir, exist_ok=True)

        docs_content = [
            ("2023_05_lipid_and_hba1c_report.txt", "Lab Report", JOHN_DOC1_TEXT),
            ("2024_02_followup_and_surgery.txt", "Surgical Discharge", JOHN_DOC2_TEXT),
            ("2024_03_surgical_discharge.txt", "Follow-Up", JOHN_DOC3_TEXT),
            ("2025_05_annual_recheck.txt", "Annual Review", JOHN_DOC4_TEXT),
        ]

        doc_ids = {}
        for i, (filename, doc_type, content) in enumerate(docs_content, start=1):
            file_path = os.path.join(patient_dir, filename)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)

            doc = Document(
                patient_id=patient.id,
                filename=filename,
                file_path=file_path,
                doc_type=doc_type,
                status="completed",
                extracted_text=content,
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            doc_ids[i] = doc.id
            logger.info("Created document: %s (ID: %d)", filename, doc.id)

        # Insert pre-fabricated timeline events
        logger.info("Inserting pre-fabricated timeline events for John Doe...")
        for ev_data in make_john_timeline_events(doc_ids):
            ev = TimelineEvent(
                patient_id=patient.id,
                document_id=ev_data["document_id"],
                date=ev_data["date"],
                event=ev_data["event"],
                event_type=ev_data["event_type"],
                diseases=ev_data["diseases"],
                medications=ev_data["medications"],
                entities=ev_data["entities"],
                graph_links=ev_data["graph_links"],
            )
            db.add(ev)
        db.commit()
        logger.info("✓ Inserted %d timeline events for John Doe.", len(make_john_timeline_events(doc_ids)))

        # Seed second patient
        logger.info("Seeding patient: Sarah Smith")
        patient2 = Patient(
            name="Sarah Smith",
            age=38,
            gender="Female",
            demographics=json.dumps({
                "blood_group": "O+",
                "height": "5'6\"",
                "weight": "63 kg",
                "occupation": "Teacher",
                "emergency_contact": "Mark Smith — +1 555-987-6543"
            })
        )
        db.add(patient2)
        db.commit()
        db.refresh(patient2)
        logger.info("Created patient Sarah Smith (ID: %d)", patient2.id)

        logger.info("✓ Direct seeding completed successfully!")

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(seed_data())
