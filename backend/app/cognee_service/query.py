import logging
import json
import litellm
from sqlalchemy.orm import Session
from app.db.models import Patient, Document, QueryLog, TimelineEvent
from app.config import settings
from app.cognee_service.client import cognee_cloud as cognee
from app.cognee_service.ingestion import MEDICAL_COGNIFY_PROMPT

logger = logging.getLogger("cognee_service")

async def auto_index_patient(db: Session, patient_id: int, dataset_name: str):
    """Fallback indexer to populate Cognee if dataset is missing or cleared."""
    logger.info("Dataset not found in Cognee. Triggering auto-indexing fallback for patient %d...", patient_id)
    
    # 1. Index Patient Profile
    from app.cognee_service.profile import remember_patient_profile
    try:
        await remember_patient_profile(db, patient_id)
    except Exception as e:
        logger.error("Auto-indexing: Failed to index patient profile: %s", e)
        
    # 2. Index Patient Documents
    docs = db.query(Document).filter(
        Document.patient_id == patient_id,
        Document.status == "completed"
    ).all()
    
    indexed_count = 0
    for doc in docs:
        if doc.extracted_text:
            try:
                logger.info("Auto-indexing: Ingesting document '%s'...", doc.filename)
                await cognee.remember(
                    data=doc.extracted_text,
                    dataset_name=dataset_name
                )
                indexed_count += 1
            except Exception as e:
                logger.error("Auto-indexing: Failed to ingest document %d: %s", doc.id, e)
                
    # 3. Ontological consolidator
    if indexed_count > 0:
        try:
            logger.info("Auto-indexing: Improving ontology for dataset %s...", dataset_name)
            await cognee.improve(dataset=dataset_name, custom_prompt=MEDICAL_COGNIFY_PROMPT)
        except Exception as e:
            logger.error("Auto-indexing: Failed to run improve ontology: %s", e)

async def query_patient_memory(db: Session, patient_id: int, question: str, role: str = "doctor") -> dict:
    dataset_name = f"patient_{patient_id}"
    logger.info("Recalling memory from Cognee dataset %s for question: %s", dataset_name, question)
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    docs = db.query(Document).filter(
        Document.patient_id == patient_id,
        Document.status == "completed"
    ).all()
    
    def get_fallback_query_response() -> dict:
        q_lower = question.lower()
        
        # 1. Fetch timeline events
        events = db.query(TimelineEvent).filter(TimelineEvent.patient_id == patient_id).all()
        
        matched_events = []
        matched_reports = set()
        matched_links = []
        
        # Helper to normalize concept label
        def norm(l: str) -> str:
            return " ".join(l.strip().split())
            
        for ev in events:
            ev_text = ev.event.lower()
            ev_type = ev.event_type.lower()
            
            try:
                ev_diseases = json.loads(ev.diseases) if ev.diseases else []
            except:
                ev_diseases = []
            try:
                ev_meds = json.loads(ev.medications) if ev.medications else []
            except:
                ev_meds = []
            try:
                ev_links = json.loads(ev.graph_links) if ev.graph_links else []
            except:
                ev_links = []
                
            is_match = False
            for keyword in q_lower.split():
                if len(keyword) < 4:
                    continue
                if (keyword in ev_text or 
                    keyword in ev_type or 
                    any(keyword in d.lower() for d in ev_diseases) or 
                    any(keyword in m.lower() for m in ev_meds)):
                    is_match = True
                    break
                    
            if is_match:
                matched_events.append(f"{ev.date}: {ev.event}")
                if ev.document:
                    matched_reports.add(ev.document.filename)
                for l in ev_links:
                    matched_links.append({
                        "source": l.get("source", ""),
                        "relation": l.get("relation", ""),
                        "target": l.get("target", "")
                    })
                    
        # 2. Check documents extracted json for direct keyword matches
        for doc in docs:
            if not doc.extracted_json:
                continue
            try:
                entities = json.loads(doc.extracted_json)
            except:
                continue
                
            doc_matched = False
            for cat in ["diseases", "medications", "surgeries", "allergies"]:
                items = entities.get(cat, [])
                for item in items:
                    for keyword in q_lower.split():
                        if len(keyword) < 4:
                            continue
                        if keyword in item.lower():
                            doc_matched = True
                            rel = "DIAGNOSED_WITH" if cat == "diseases" else "PRESCRIBED" if cat == "medications" else "UNDERGONE" if cat == "surgeries" else "ALLERGIC_TO"
                            matched_links.append({
                                "source": patient.name if patient else "Patient",
                                "relation": rel,
                                "target": item
                            })
                            break
            if doc_matched:
                matched_reports.add(doc.filename)
                
        # If no specific matches, default to recent records
        if not matched_events and events:
            sorted_events = sorted(events, key=lambda e: e.date, reverse=True)[:2]
            for ev in sorted_events:
                matched_events.append(f"{ev.date}: {ev.event}")
                if ev.document:
                    matched_reports.add(ev.document.filename)
                    
        # Construct answers based on matching keywords
        answer_parts = []
        answer_parts.append(f"### Local Clinical Memory Search for '{question}'\n")
        
        if matched_events:
            answer_parts.append("Based on the patient's clinical history, the following records were found:")
            for ev_str in matched_events:
                answer_parts.append(f"- {ev_str}")
        else:
            answer_parts.append("No direct matching events or conditions were found in the clinical records database.")
            
        if matched_reports:
            answer_parts.append(f"\nThese details are referenced in the following reports: " + ", ".join([f"`{r}`" for r in matched_reports]))
            
        # Deduplicate graph links
        unique_links = []
        seen_links = set()
        for link in matched_links:
            src = norm(link["source"])
            rel = norm(link["relation"])
            tgt = norm(link["target"])
            if src and tgt and rel:
                key = (src.lower(), rel.lower(), tgt.lower())
                if key not in seen_links:
                    seen_links.add(key)
                    unique_links.append({"source": src, "relation": rel, "target": tgt})
                    
        answer_parts.append("\n\n---\n*Note: This query synthesis was generated dynamically from database records (local fallback engine active due to Gemini API limits).*")
        
        return {
            "question": question,
            "answer": "\n".join(answer_parts),
            "role": role,
            "supporting_timeline": matched_events,
            "related_reports": list(matched_reports),
            "graph_links": unique_links[:5]
        }

    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is missing. Using local fallback query engine.")
        result_dict = get_fallback_query_response()
        # Save QueryLog
        try:
            log = QueryLog(
                patient_id=patient_id,
                question=question,
                answer=json.dumps(result_dict),
                role=role
            )
            db.add(log)
            db.commit()
        except Exception as db_err:
            logger.error("Failed to save QueryLog: %s", db_err)
        return result_dict
        
    # Use multi-search: GRAPH_COMPLETION (knowledge graph reasoning) + CHUNKS (raw text)
    results = None
    try:
        results = await cognee.recall_multi(
            query_text=question,
            datasets=[dataset_name]
        )
    except Exception as e:
        err_msg = str(e)
        if "DatasetNotFoundError" in err_msg or "No datasets found" in err_msg or "404" in err_msg:
            await auto_index_patient(db, patient_id, dataset_name)
            try:
                results = await cognee.recall_multi(
                    query_text=question,
                    datasets=[dataset_name]
                )
            except Exception as retry_err:
                logger.exception("Recall failed on retry for patient ID %d: %s", patient_id, retry_err)
        else:
            logger.exception("Recall failed on first attempt for patient ID %d: %s", patient_id, e)
            
    # Extract and deduplicate context facts from search results
    context_facts = []
    seen_texts = set()
    if results:
        if isinstance(results, list):
            for r in results:
                fact_text = None
                if isinstance(r, str):
                    fact_text = r
                elif isinstance(r, dict):
                    # Try multiple keys that Cognee may return
                    fact_text = (r.get("text") or r.get("content") or 
                                 r.get("chunk_text") or r.get("description") or str(r))
                else:
                    for attr in ("text", "content", "chunk_text", "description"):
                        if hasattr(r, attr):
                            fact_text = getattr(r, attr)
                            break
                    if not fact_text:
                        fact_text = str(r)
                
                if fact_text:
                    normalised = fact_text.strip().lower()
                    if normalised and normalised not in seen_texts:
                        seen_texts.add(normalised)
                        context_facts.append(fact_text.strip())
        else:
            context_facts.append(str(results))

    # Fetch recent timeline events as additional context for the LLM
    recent_events = db.query(TimelineEvent).filter(
        TimelineEvent.patient_id == patient_id
    ).order_by(TimelineEvent.date.desc()).limit(5).all()
    timeline_context_lines = []
    for ev in recent_events:
        timeline_context_lines.append(f"{ev.date}: [{ev.event_type}] {ev.event}")
    timeline_context = "\n".join(timeline_context_lines) if timeline_context_lines else ""
            
    context_text = "\n".join(context_facts) if context_facts else "No direct matches in semantic graph."
    
    profile_summary = ""
    if patient:
        profile_summary = f"Name: {patient.name}, Age: {patient.age}, Gender: {patient.gender}"
        if patient.demographics:
            profile_summary += f", Demographics: {patient.demographics}"
            
    reports_summary = "\n".join([f"- {d.filename} ({d.doc_type})" for d in docs])
    
    system_prompt = (
        "You are an expert clinical assistant. Answer the medical query about the patient based "
        "on the Patient Profile, Available Reports, and Recalled Graph Context provided.\n\n"
        "You MUST return a valid JSON object matching the schema below. Do not include markdown code fences in your raw response. "
        "The response schema is:\n"
        "{\n"
        '  "answer": "A detailed clinical response formatted in markdown. Use formatting, bolding, bullet points, or lists for readability.",\n'
        '  "supporting_timeline": ["A list of event descriptions with dates referenced in the answer (e.g. \'May 12, 2023: Diagnosed with Type 2 Diabetes\')"],\n'
        '  "related_reports": ["A list of document filenames containing the evidence (must match exactly from Available Reports list)"],\n'
        '  "graph_links": [\n'
        '    {"source": "Subject (e.g. Metformin)", "relation": "Predicate (e.g. treats)", "target": "Object (e.g. Type 2 Diabetes)"}\n'
        '  ]\n'
        "}\n\n"
        "Ensure all JSON strings are properly escaped. Do not make up facts outside the provided contexts."
    )
    
    user_prompt = (
        f"Patient Profile:\n{profile_summary}\n\n"
        f"Available Reports:\n{reports_summary if reports_summary else 'No reports uploaded.'}\n\n"
        f"Recalled Graph Context:\n{context_text}\n\n"
    )
    if timeline_context:
        user_prompt += f"Recent Timeline Events:\n{timeline_context}\n\n"
    user_prompt += f"Question:\n{question}"
    
    try:
        response = await litellm.acompletion(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            api_key=settings.GEMINI_API_KEY,
            num_retries=3
        )
        content = response.choices[0].message.content.strip()
        
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        parsed = json.loads(content)
        
        answer_text = parsed.get("answer", "No answer formulated.")
        supporting_timeline = parsed.get("supporting_timeline", [])
        related_reports = parsed.get("related_reports", [])
        graph_links = parsed.get("graph_links", [])
        
        result_dict = {
            "question": question,
            "answer": answer_text,
            "role": role,
            "supporting_timeline": supporting_timeline,
            "related_reports": related_reports,
            "graph_links": graph_links
        }
    except Exception as e:
        logger.warning("Failed to generate/parse Gemini response: %s. Using local fallback query engine.", e)
        result_dict = get_fallback_query_response()
        
    try:
        log = QueryLog(
            patient_id=patient_id,
            question=question,
            answer=json.dumps(result_dict),
            role=role
        )
        db.add(log)
        db.commit()
    except Exception as db_err:
        logger.error("Failed to save QueryLog to SQLite db: %s", db_err)
        
    return result_dict


