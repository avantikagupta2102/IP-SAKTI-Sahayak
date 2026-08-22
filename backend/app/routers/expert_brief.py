"""
routers/expert_brief.py — POST /api/expert-brief

Generates a plain-language executive IP Compliance & Strategic Brief document
by synthesizing a company's Business Profile, IP Assets, and Compliance Passport via the local Ollama LLM.
"""
import json
import logging
from datetime import datetime
from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.db import BusinessProfile
from app.models.schemas import ExpertBriefRequest, ExpertBriefResponse, IPAssetSchema
from app.routers.profile import calculate_passport_for_profile

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


@router.post("/expert-brief", response_model=ExpertBriefResponse, status_code=status.HTTP_200_OK, summary="Generate Executive IP Compliance Brief")
async def generate_expert_brief(
    payload: ExpertBriefRequest,
    db: AsyncSession = Depends(get_db),
) -> ExpertBriefResponse:
    """
    Pulls a business profile's IP asset portfolio and compliance passport,
    formats them into an executive prompt, and calls the local LLM to generate an Expert Brief document.
    """
    profile = await db.get(BusinessProfile, payload.profile_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business Profile with ID '{payload.profile_id}' not found.",
        )

    # Compute Compliance Passport
    passport = calculate_passport_for_profile(profile)

    # Format structured prompt for Ollama LLM
    prompt_content = f"""
System Role: You are IP-SAKTI Senior Legal & Patent Strategy Advisor for Indian Enterprise Compliance.

Generate an executive, plain-language "IP Compliance & Strategic Brief" for the following enterprise:

Company Profile:
- Company Name: {profile.company_name}
- Sector: {profile.sector}
- Entity Type: {profile.company_type}
- Registration No: {profile.registration_number or 'N/A'}
- State / Region: {profile.state or 'India'}

IP Assets Portfolio:
- Total Logged Assets: {passport.asset_breakdown.total_assets}
- Patents: {passport.asset_breakdown.patents_count}
- Trademarks: {passport.asset_breakdown.trademarks_count}
- Geographical Indications: {passport.asset_breakdown.gis_count}
- Copyrights: {passport.asset_breakdown.copyrights_count}

Compliance Passport Audit Summary:
- Overall Compliance Score: {passport.overall_score} / 100 ({passport.status_level})
- Key Audit Items:
"""
    for item in passport.compliance_checklist:
        prompt_content += f"  * [{item.status}] {item.item}: {item.guidance}\n"

    prompt_content += f"""
Required Brief Structure:
1. Executive Summary & Statutory IP Standing
2. Sector Specific Regulatory Analysis ({profile.sector} Sector under Indian Law)
3. Identified IP Compliance Risks & Gaps
4. Strategic Action Roadmap (Next 30-90 Days)

Write in crisp, authoritative, GitHub-style Markdown. Keep paragraphs concise and action-oriented.
"""

    # Call local Ollama LLM with fallback handling
    brief_md = ""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are IP-SAKTI Senior Legal & Patent Strategy Advisor."},
                        {"role": "user", "content": prompt_content},
                    ],
                    "stream": False,
                },
            )
            if res.status_code == 200:
                body = res.json()
                brief_md = body.get("message", {}).get("content", "")
    except Exception as err:
        logger.warning(f"Ollama call failed for expert brief generation: {err}")

    # Fallback template if LLM offline or slow
    if not brief_md.strip():
        brief_md = f"""# Executive IP Compliance & Strategic Brief

**Prepared for:** {profile.company_name}  
**Sector:** {profile.sector} ({profile.company_type})  
**Compliance Passport Score:** {passport.overall_score}/100 (**{passport.status_level}**)  
**Generated Date:** {datetime.utcnow().strftime("%B %d, %Y")}

---

## 1. Executive Summary
{profile.company_name} currently holds a **{passport.status_level}** IP compliance rating ({passport.overall_score}/100) within the **{profile.sector}** sector in India. The enterprise has logged **{passport.asset_breakdown.patents_count} patent(s)** and **{passport.asset_breakdown.trademarks_count} trademark(s)** in its active portfolio.

## 2. Sector Specific Regulatory Standing
- **Traditional Knowledge & Section 3(p):** Formulations incorporating traditional AYUSH herbs must maintain rigorous empirical records proving non-obvious synergistic efficacy (Combination Index < 1.0) under the Patents Act 1970.
- **Biodiversity Compliance:** Biological resource utilization mandates prior approval from the National Biodiversity Authority (NBA) under Section 6 of the Biological Diversity Act 2002.
- **Brand Protection:** Trademarks registered under Nice Classification Class 5 (AYUSH / Pharma) require continuous commercial working verification.

## 3. Identified Compliance Gaps
"""
        for item in passport.compliance_checklist:
            if item.status in ["WARNING", "CRITICAL"]:
                brief_md += f"- **[{item.status}] {item.item}:** {item.guidance}\n"

        brief_md += f"""
## 4. Strategic Action Roadmap (Next 30-90 Days)
"""
        for action in passport.recommended_actions:
            brief_md += f"1. {action}\n"

    # Key Takeaways & Milestones
    takeaways = [
        f"{profile.company_name} holds an overall compliance score of {passport.overall_score}/100 ({passport.status_level}).",
        f"Active IP portfolio contains {passport.asset_breakdown.patents_count} Patent(s), {passport.asset_breakdown.trademarks_count} Trademark(s), and {passport.asset_breakdown.gis_count} GI(s).",
        "Mandatory Section 3(p) prior art and National Biodiversity Authority disclosures require continuous verification.",
    ]

    milestones = passport.recommended_actions[:4] if passport.recommended_actions else [
        "File Form 27 Annual Working Statement with CGPDTM",
        "Obtain NBA Section 6 Access Approval for biological resources",
        "Audit trademark Class 5 OTC brand registrations",
    ]

    return ExpertBriefResponse(
        profile_id=profile.id,
        company_name=profile.company_name,
        sector=profile.sector,
        company_type=profile.company_type,
        generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        compliance_score=passport.overall_score,
        status_level=passport.status_level,
        brief_markdown=brief_md,
        key_takeaways=takeaways,
        next_milestones=milestones,
    )
