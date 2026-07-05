import logging
import json
import litellm
from sqlalchemy.orm import Session
from app.db.models import Patient, Document, TimelineEvent
from app.config import settings

logger = logging.getLogger("cognee_service")

async def generate_clinical_summary(db: Session, patient_id: int) -> str:
    # 1. Fetch patient profile details
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return "Patient not found."

    demographics_dict = json.loads(patient.demographics) if patient.demographics else {}
    profile_text = (
        f"Name: {patient.name}\n"
        f"Age: {patient.age}\n"
        f"Gender: {patient.gender}\n"
        f"Blood Group: {demographics_dict.get('blood_group', 'Not specified')}\n"
        f"Height: {demographics_dict.get('height', 'Not specified')} cm\n"
        f"Weight: {demographics_dict.get('weight', 'Not specified')} kg\n"
        f"Emergency Contact: {demographics_dict.get('emergency_contact', 'Not specified')}"
    )

    # 2. Fetch completed documents (Latest reports)
    docs = db.query(Document).filter(
        Document.patient_id == patient_id,
        Document.status == "completed"
    ).all()
    reports_text = ""
    if docs:
        reports_text = "\n".join([f"- {d.filename} ({d.doc_type}) uploaded on {d.upload_date.strftime('%Y-%m-%d')}" for d in docs])
    else:
        reports_text = "No completed reports uploaded."

    # 3. Fetch Timeline Events
    events = db.query(TimelineEvent).filter(TimelineEvent.patient_id == patient_id).order_by(TimelineEvent.date.desc()).all()
    
    timeline_items = []
    diseases = set()
    medications = set()
    surgeries = set()
    allergies = set()
    family_history = set()

    for ev in events:
        timeline_items.append(f"- Date: {ev.date} | [{ev.event_type.upper()}] {ev.event}")
        
        # Extract diseases
        try:
            ev_diseases = json.loads(ev.diseases) if ev.diseases else []
            for d in ev_diseases:
                if d.strip():
                    diseases.add(d.strip())
        except Exception:
            pass

        # Extract medications
        try:
            ev_meds = json.loads(ev.medications) if ev.medications else []
            for m in ev_meds:
                if m.strip():
                    medications.add(m.strip())
        except Exception:
            pass

        # Extract entities (Allergies, surgeries, family history)
        try:
            ev_entities = json.loads(ev.entities) if ev.entities else {}
            for cat, vals in ev_entities.items():
                cat_lower = cat.lower()
                if "allergy" in cat_lower or "allergies" in cat_lower:
                    for v in vals:
                        allergies.add(v.strip())
                elif "surgery" in cat_lower or "surgeries" in cat_lower or "procedure" in cat_lower:
                    for v in vals:
                        surgeries.add(v.strip())
                elif "family" in cat_lower or "history" in cat_lower:
                    for v in vals:
                        family_history.add(v.strip())
        except Exception:
            pass

    # Fallback to document extracted_json for entities if timeline lists are sparse
    for doc in docs:
        if doc.extracted_json:
            try:
                entities = json.loads(doc.extracted_json)
                for d in entities.get("diseases", []):
                    diseases.add(d.strip())
                for m in entities.get("medications", []):
                    medications.add(m.strip())
                for a in entities.get("allergies", []):
                    allergies.add(a.strip())
                for s in entities.get("surgeries", []):
                    surgeries.add(s.strip())
            except Exception:
                pass

    timeline_text = "\n".join(timeline_items) if timeline_items else "No timeline events recorded."
    diseases_text = ", ".join(diseases) if diseases else "None recorded"
    meds_text = ", ".join(medications) if medications else "None recorded"
    surgeries_text = ", ".join(surgeries) if surgeries else "None recorded"
    allergies_text = ", ".join(allergies) if allergies else "None recorded"
    family_text = ", ".join(family_history) if family_history else "None recorded"

    # 4. Fetch Graph Context (Triples/Links)
    graph_triples = []
    patient_node = patient.name
    for doc in docs:
        graph_triples.append(f"({patient_node}) -[HAS_REPORT]-> ({doc.filename})")
        if doc.extracted_json:
            try:
                entities = json.loads(doc.extracted_json)
                for d in entities.get("diseases", []):
                    graph_triples.append(f"({patient_node}) -[DIAGNOSED_WITH]-> ({d})")
                    graph_triples.append(f"({d}) -[RECORDED_IN]-> ({doc.filename})")
                for m in entities.get("medications", []):
                    graph_triples.append(f"({patient_node}) -[PRESCRIBED]-> ({m})")
                    graph_triples.append(f"({m}) -[RECORDED_IN]-> ({doc.filename})")
                for a in entities.get("allergies", []):
                    graph_triples.append(f"({patient_node}) -[ALLERGIC_TO]-> ({a})")
                    graph_triples.append(f"({a}) -[RECORDED_IN]-> ({doc.filename})")
                for s in entities.get("surgeries", []):
                    graph_triples.append(f"({patient_node}) -[UNDERGONE]-> ({s})")
                    graph_triples.append(f"({s}) -[RECORDED_IN]-> ({doc.filename})")
            except Exception:
                pass

    # Timeline event links
    for ev in events:
        ev_label = f"Event: {ev.date}"
        graph_triples.append(f"({patient_node}) -[HAS_EVENT]-> ({ev_label})")
        if ev.document_id:
            doc_row = db.query(Document).filter(Document.id == ev.document_id).first()
            if doc_row:
                graph_triples.append(f"({ev_label}) -[DERIVED_FROM]-> ({doc_row.filename})")
        
        if ev.graph_links:
            try:
                links = json.loads(ev.graph_links)
                for link in links:
                    src = link.get("source")
                    tgt = link.get("target")
                    rel = link.get("relation")
                    if src and tgt and rel:
                        graph_triples.append(f"({src}) -[{rel}]-> ({tgt})")
            except Exception:
                pass

    # Deduplicate graph triples
    unique_triples = sorted(list(set(graph_triples)))
    graph_context_text = "\n".join([f"- {t}" for t in unique_triples]) if unique_triples else "No semantic graph connections built."

    # 5. Build prompt
    system_prompt = (
        "You are an expert clinical oncology and general practitioner assistant.\n"
        "Your task is to generate a comprehensive, highly structured narrative clinical summary for the patient.\n"
        "Ground your narrative strictly in the Patient Profile, Available Reports, Timeline, and Knowledge Graph context provided below.\n\n"
        "GUIDELINES:\n"
        "1. DO NOT HALLUCINATE OR CREATE FACTS outside the provided context.\n"
        "2. Formulate a professional narrative medical summary grouped under distinct markdown headings, such as:\n"
        "   - **Clinical Overview**\n"
        "   - **Diagnosed Conditions & Chronic Diseases**\n"
        "   - **Medication & Treatment History**\n"
        "   - **Surgical & Procedure History**\n"
        "   - **Allergies & Sensitivities**\n"
        "   - **Relevant Family & Social History**\n"
        "3. CRITICAL: CITATIONS TO GRAPH NODES. Every time you mention a disease, medication, surgery, allergy, doctor, hospital, or report, "
        "you MUST cite the exact node name in brackets like `[NodeName]`. For example:\n"
        "   - 'The patient was diagnosed with [Type 2 Diabetes] which is managed with [Metformin].'\n"
        "   - 'She had a [Lap Appendectomy] performed at [General Hospital] by [Dr. Smith].'\n"
        "   - 'Based on the [blood_report_2023.pdf], her HbA1c remains stable.'\n"
        "   - Ensure that the text inside the brackets matches exactly the names of nodes/concepts in the graph context. "
        "Do not cite generic pronouns or terms that are not concepts.\n"
        "4. Return the response as a simple markdown string. Do not wrap the response in markdown code blocks (like ```markdown ... ```)."
    )

    user_prompt = (
        f"--- PATIENT PROFILE ---\n{profile_text}\n\n"
        f"--- LATEST REPORTS ---\n{reports_text}\n\n"
        f"--- TIMELINE EVENTS ---\n{timeline_text}\n\n"
        f"--- CATEGORIZED CONCEPTS ---\n"
        f"- Conditions: {diseases_text}\n"
        f"- Medications: {meds_text}\n"
        f"- Surgeries: {surgeries_text}\n"
        f"- Allergies: {allergies_text}\n"
        f"- Family History: {family_text}\n\n"
        f"--- KNOWLEDGE GRAPH CONNECTIONS ---\n{graph_context_text}"
    )

    # Helper to generate fallback summary on rate limit or lack of API key
    def get_fallback_summary() -> str:
        lines = []
        lines.append(f"# Clinical Overview")
        lines.append(f"Patient **{patient.name}** is a {patient.age}-year-old {patient.gender.lower()}.")
        
        physical = []
        if demographics_dict.get("blood_group"):
            physical.append(f"Blood Group: **{demographics_dict.get('blood_group')}**")
        if demographics_dict.get("height"):
            physical.append(f"Height: {demographics_dict.get('height')} cm")
        if demographics_dict.get("weight"):
            physical.append(f"Weight: {demographics_dict.get('weight')} kg")
        if physical:
            lines.append("- " + " | ".join(physical))
            
        if demographics_dict.get("emergency_contact"):
            lines.append(f"- Emergency Contact: {demographics_dict.get('emergency_contact')}")
            
        lines.append("\n# Diagnosed Conditions & Chronic Diseases")
        if diseases:
            lines.append("The patient has documented diagnoses of: " + ", ".join([f"[{d}]" for d in diseases]) + ".")
        else:
            lines.append("No active chronic conditions recorded in memory.")
            
        lines.append("\n# Medication & Treatment History")
        if medications:
            lines.append("Active or historical prescriptions include: " + ", ".join([f"[{m}]" for m in medications]) + ".")
        else:
            lines.append("No active medications or prescriptions recorded.")
            
        lines.append("\n# Surgical & Procedure History")
        if surgeries:
            lines.append("The patient has undergone the following procedures: " + ", ".join([f"[{s}]" for s in surgeries]) + ".")
        else:
            lines.append("No surgical procedures or operations documented.")
            
        lines.append("\n# Allergies & Sensitivities")
        if allergies:
            lines.append("Documented medical reactions or allergies: " + ", ".join([f"[{a}]" for a in allergies]) + ".")
        else:
            lines.append("No known allergies or drug sensitivities recorded.")
            
        if family_history:
            lines.append("\n# Relevant Family & Social History")
            lines.append("Family medical history includes: " + ", ".join([f"[{fh}]" for fh in family_history]) + ".")
            
        lines.append("\n# Chronological Health Events")
        if timeline_items:
            lines.append("\n".join(timeline_items))
        else:
            lines.append("No timeline events recorded.")
            
        lines.append("\n\n---\n*Note: This clinical summary was generated dynamically from structured database records (fallback mode active).*")
        return "\n".join(lines)

    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is missing. Using local fallback summary generator.")
        return get_fallback_summary()

    try:
        response = await litellm.acompletion(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            api_key=settings.GEMINI_API_KEY
        )
        content = response.choices[0].message.content.strip()
        
        # Clean any markdown code blocks
        if content.startswith("```markdown"):
            content = content.replace("```markdown", "", 1)
            if content.endswith("```"):
                content = content[:-3]
        elif content.startswith("```"):
            content = content.replace("```", "", 1)
            if content.endswith("```"):
                content = content[:-3]
                
        return content.strip()
        
    except Exception as e:
        logger.warning("Clinical summary LLM generation failed: %s. Using local fallback summary generator.", e)
        return get_fallback_summary()

