"""
Structured entity extractor — parses medical document text into a
categorized JSON object using Gemini LLM.
"""
import json
import logging
from typing import List
from pydantic import BaseModel, Field
import litellm
from app.config import settings

logger = logging.getLogger("cognee_service")

class StructuredMedicalEntities(BaseModel):
    diseases: List[str] = Field(default_factory=list, description="All diagnosed diseases or conditions mentioned")
    medications: List[str] = Field(default_factory=list, description="All medications prescribed, taken, or stopped")
    allergies: List[str] = Field(default_factory=list, description="All documented allergies or adverse drug reactions")
    doctors: List[str] = Field(default_factory=list, description="Names of all physicians, surgeons, or specialists mentioned")
    hospitals: List[str] = Field(default_factory=list, description="All hospitals, clinics, or healthcare facilities mentioned")
    dates: List[str] = Field(default_factory=list, description="All clinically relevant dates mentioned (visits, procedures, results)")
    lab_values: List[str] = Field(default_factory=list, description="Lab test results with values and units (e.g., 'HbA1c: 7.2%')")
    symptoms: List[str] = Field(default_factory=list, description="All patient-reported or clinically observed symptoms")
    surgeries: List[str] = Field(default_factory=list, description="All surgical procedures or operations mentioned")

async def extract_structured_entities(text: str) -> dict:
    """
    Use Gemini to extract a structured set of medical entities from document text.
    Returns a dict with keys: diseases, medications, allergies, doctors, hospitals,
    dates, lab_values, symptoms, surgeries.
    Falls back to empty dict on error.
    """
    if not text or len(text.strip()) < 30:
        logger.warning("Text too short for entity extraction, skipping.")
        return {}

    logger.info("Extracting structured medical entities from %d-char document...", len(text))

    system_prompt = (
        "You are a clinical NLP specialist. Extract all medically relevant entities from the document. "
        "Return valid JSON only matching the exact schema provided. "
        "If a field has no entries, return an empty list []."
    )

    schema_hint = (
        "{\n"
        '  "diseases": ["string"],\n'
        '  "medications": ["string"],\n'
        '  "allergies": ["string"],\n'
        '  "doctors": ["string"],\n'
        '  "hospitals": ["string"],\n'
        '  "dates": ["string"],\n'
        '  "lab_values": ["string"],\n'
        '  "symptoms": ["string"],\n'
        '  "surgeries": ["string"]\n'
        "}"
    )

    user_prompt = (
        f"Extract structured medical entities from this document text and return JSON matching this schema:\n"
        f"{schema_hint}\n\n"
        f"Document:\n{text}"
    )

    try:
        response = await litellm.acompletion(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            api_key=settings.GEMINI_API_KEY,
            num_retries=5
        )
        content = response.choices[0].message.content.strip()

        # Strip markdown code fences if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        entities = json.loads(content)
        logger.info("Successfully extracted structured entities: %s", list(entities.keys()))
        return entities

    except Exception as e:
        logger.warning("Structured entity extraction failed: %s. Returning empty dict.", e)
        return {}
