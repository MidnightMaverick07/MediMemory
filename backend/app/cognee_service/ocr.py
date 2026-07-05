"""
OCR service — extracts clinical text from scanned images (PNG/JPG)
using Gemini Vision via LiteLLM multimodal message.
"""
import base64
import logging
from pathlib import Path
import litellm
from app.config import settings

logger = logging.getLogger("cognee_service")

def _encode_image_base64(image_path: str) -> str:
    """Read an image file and return a base64-encoded string."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def _get_mime_type(image_path: str) -> str:
    ext = Path(image_path).suffix.lower()
    return {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }.get(ext, "image/png")

async def extract_text_from_image(image_path: str) -> str:
    """
    Use Gemini Vision to OCR a scanned medical document image.
    Returns the full clinical text extracted from the image.
    """
    logger.info("Running OCR on image: %s", image_path)

    image_b64 = _encode_image_base64(image_path)
    mime_type = _get_mime_type(image_path)

    system_prompt = (
        "You are a medical document OCR specialist. "
        "Extract ALL text from the medical document image provided, preserving the original structure, "
        "including headers, dates, measurements, test values, doctor names, hospital names, "
        "diagnoses, medications, and any handwritten annotations. "
        "Output the raw extracted text only — no commentary or formatting changes."
    )

    response = await litellm.acompletion(
        model=settings.LLM_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": system_prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{image_b64}"
                        }
                    }
                ]
            }
        ],
        api_key=settings.GEMINI_API_KEY
    )

    extracted = response.choices[0].message.content.strip()
    logger.info("OCR extracted %d characters from image.", len(extracted))
    return extracted

async def extract_text_from_pdf_ocr(pdf_path: str) -> str:
    """
    Use Gemini multimodal capabilities to OCR an image-only / scanned PDF.
    Returns the full clinical text extracted from the PDF.
    """
    logger.info("Running OCR on scanned PDF: %s", pdf_path)
    
    with open(pdf_path, "rb") as f:
        pdf_b64 = base64.b64encode(f.read()).decode("utf-8")
        
    system_prompt = (
        "You are a medical document OCR specialist. "
        "Extract ALL text from all pages of the medical PDF document provided, preserving the original structure, "
        "including headers, dates, measurements, test values, doctor names, hospital names, "
        "diagnoses, medications, and any handwritten annotations. "
        "Output the raw extracted text only — no commentary or formatting changes."
    )

    response = await litellm.acompletion(
        model=settings.LLM_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": system_prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:application/pdf;base64,{pdf_b64}"
                        }
                    }
                ]
            }
        ],
        api_key=settings.GEMINI_API_KEY
    )

    extracted = response.choices[0].message.content.strip()
    logger.info("OCR extracted %d characters from scanned PDF.", len(extracted))
    return extracted

