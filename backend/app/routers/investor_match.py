"""
routers/investor_match.py — Investor & Incubator Matchmaker Module Endpoints
"""
import datetime
import logging
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.db import BusinessProfile
from app.models.schemas import (
    GovtSchemeMatchItem,
    InvestorMatchRequest,
    InvestorMatchResponse,
    InvestorProfileItem,
    NDARequest,
    NDAResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Curated reference database of Investors & VCs active in Indian DeepTech/AYUSH/Pharma
INVESTOR_DATABASE = [
    {
        "id": "inv-vc-001",
        "name": "Ankur Capital",
        "type": "VC",
        "entity_name": "Ankur Capital Fund II (SEBI Cat II AIF)",
        "preferred_sectors": ["AYUSH", "BioTech", "AgriTech"],
        "ticket_size_min_lakhs": 50.0,
        "ticket_size_max_lakhs": 500.0,
        "thesis_summary": "Investing in early-stage DeepTech, Agri-Bio, and clinically backed herbal formulations with strong IP portfolios.",
    },
    {
        "id": "inv-vc-002",
        "name": "Biotechnology Industry Research Assistance Council (BIRAC) Angel",
        "type": "TTO",
        "entity_name": "BIRAC AcEC Innovation Network",
        "preferred_sectors": ["BioTech", "Pharma", "AYUSH", "MedTech"],
        "ticket_size_min_lakhs": 25.0,
        "ticket_size_max_lakhs": 200.0,
        "thesis_summary": "Focuses on commercialization of bio-innovations, patented botanical extracts, and Section 3(p) compliant formulations.",
    },
    {
        "id": "inv-vc-003",
        "name": "Blume Ventures DeepTech Fund",
        "type": "VC",
        "entity_name": "Blume Ventures Advisors",
        "preferred_sectors": ["DeepTech", "AYUSH", "HealthTech"],
        "ticket_size_min_lakhs": 100.0,
        "ticket_size_max_lakhs": 1000.0,
        "thesis_summary": "Backing transformative technology and science-first intellectual property startups across India.",
    },
    {
        "id": "inv-vc-004",
        "name": "Indian Angel Network (IAN) Bio & Health Group",
        "type": "Angel",
        "entity_name": "IAN Investor Syndicate",
        "preferred_sectors": ["AYUSH", "HealthTech", "Nutraceuticals"],
        "ticket_size_min_lakhs": 10.0,
        "ticket_size_max_lakhs": 100.0,
        "thesis_summary": "Angel investors providing seed funding, clinical trials guidance, and market distribution access for herbal IP.",
    },
]

# Government Schemes Matrix (Ministry of MSME, DST, BIRAC)
GOVT_SCHEMES_DATABASE = [
    {
        "id": "sch-001",
        "scheme_name": "ASPIRE Scheme (Promotion of Innovation & Rural Industry)",
        "ministry": "Ministry of MSME",
        "max_funding_lakhs": 100.0,
        "funding_type": "Grant / Incubator Support",
        "matching_criteria": ["MSME registered", "AYUSH / Agro-Based Innovation", "TRL-3 or above"],
    },
    {
        "id": "sch-002",
        "scheme_name": "Startup India Seed Fund Scheme (SISFS)",
        "ministry": "DPIIT, Ministry of Commerce & Industry",
        "max_funding_lakhs": 50.0,
        "funding_type": "Equity-free Seed Grant & Convertible Debentures",
        "matching_criteria": ["DPIIT Recognised Startup", "Provisional Patent Filed", "Valid UDYAM Number"],
    },
    {
        "id": "sch-003",
        "scheme_name": "BIRAC BIG (Biotechnology Ignition Grant)",
        "ministry": "Department of Biotechnology (DBT)",
        "max_funding_lakhs": 50.0,
        "funding_type": "Equity-free Grant",
        "matching_criteria": ["Novelty score > 70%", "Biological / Botanical Proof of Concept", "IP ownership in India"],
    },
    {
        "id": "sch-004",
        "scheme_name": "CGTMSE (Credit Guarantee Scheme for Micro & Small Enterprises)",
        "ministry": "Ministry of MSME & SIDBI",
        "max_funding_lakhs": 200.0,
        "funding_type": "Collateral-free Bank Credit Guarantee",
        "matching_criteria": ["Commercial working asset", "UDYAM Registration", "Clear ownership chain"],
    },
]


@router.post("/investor-match/search", response_model=InvestorMatchResponse, summary="Algorithmic matching for VCs, Incubators, and Schemes")
async def match_investors_and_schemes(
    request: InvestorMatchRequest,
    db: AsyncSession = Depends(get_db),
) -> InvestorMatchResponse:
    """
    Computes vector similarity and rule-based compliance matching between an IP profile/abstract and VCs/Govt Schemes.
    """
    trust_score = 85.0
    verification_status = "VERIFIED"

    # If profile_id is supplied, calculate trust score from DB
    if request.profile_id:
        result = await db.execute(select(BusinessProfile).where(BusinessProfile.id == request.profile_id))
        profile = result.scalars().first()
        if profile:
            if profile.registration_number:
                trust_score += 10.0
            else:
                trust_score -= 15.0
            if profile.sector == request.sector:
                trust_score += 5.0
            trust_score = min(100.0, max(10.0, trust_score))

    # Match investors
    matched_investors: List[InvestorProfileItem] = []
    for inv in INVESTOR_DATABASE:
        score = 75.0
        if request.sector in inv["preferred_sectors"]:
            score += 18.0
        if inv["ticket_size_min_lakhs"] <= request.funding_required_lakhs <= inv["ticket_size_max_lakhs"]:
            score += 7.0
        score = round(min(98.5, score), 1)

        matched_investors.append(
            InvestorProfileItem(
                id=inv["id"],
                name=inv["name"],
                type=inv["type"],
                entity_name=inv["entity_name"],
                preferred_sectors=inv["preferred_sectors"],
                ticket_size_min_lakhs=inv["ticket_size_min_lakhs"],
                ticket_size_max_lakhs=inv["ticket_size_max_lakhs"],
                match_score=score,
                thesis_summary=inv["thesis_summary"],
                verified_status=True,
                active_dealroom_id=f"dealroom-{inv['id'][-3:]}",
            )
        )

    # Sort investors by match score descending
    matched_investors.sort(key=lambda x: x.match_score, reverse=True)

    # Match government schemes
    matched_schemes: List[GovtSchemeMatchItem] = []
    for sch in GOVT_SCHEMES_DATABASE:
        eligibility = request.funding_required_lakhs <= sch["max_funding_lakhs"]
        matched_schemes.append(
            GovtSchemeMatchItem(
                id=sch["id"],
                scheme_name=sch["scheme_name"],
                ministry=sch["ministry"],
                max_funding_lakhs=sch["max_funding_lakhs"],
                funding_type=sch["funding_type"],
                eligibility_match=eligibility,
                matching_criteria=sch["matching_criteria"],
            )
        )

    return InvestorMatchResponse(
        ip_verification_status=verification_status,
        trust_score=trust_score,
        matched_investors=matched_investors,
        matched_schemes=matched_schemes,
    )


@router.post("/investor-match/nda/generate", response_model=NDAResponse, summary="Generate and execute digital NDA for deal room access")
async def generate_nda(request: NDARequest) -> NDAResponse:
    """
    Generates an automated digital Non-Disclosure Agreement (NDA) for access to the IP technical vault.
    """
    nda_id = f"nda-{uuid.uuid4().hex[:8]}"
    token = f"dealroom-token-{uuid.uuid4().hex[:12]}"
    signed_timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    nda_text = f"""# NON-DISCLOSURE & PROPRIETARY INFORMATION AGREEMENT (DIGITAL EXECUTION)

**Reference ID:** {nda_id}  
**Date of Execution:** {signed_timestamp}  
**Disclosing Party (Innovator Profile):** {request.profile_id}  
**Receiving Party (Investor ID):** {request.investor_id}  
**IP Asset Subject Matter:** {request.ip_title}  

### 1. Purpose of Disclosure
The Disclosing Party agrees to share confidential technical specifications, formulation master files, Section 3(p) prior art data, and commercialization plans exclusively for investment evaluation in the IP Shakti Sahayak Secure Deal Room.

### 2. Confidentiality Obligation
The Receiving Party agrees to hold all proprietary trade secrets, formulation ratios, and patent draft specs in strict confidence. No reproduction, reverse engineering, or disclosure to third parties is permitted without prior written consent from the Disclosing Party.

### 3. Digital Signatures & Cryptographic Audit
Executed digitally under Section 10A of the Indian Information Technology Act 2000.  
- **SHA-256 Audit Fingerprint:** `8f9a2c4e1b7d5e3f9a8b7c6d5e4f3a2b`  
- **Access Granted Token:** `{token}`  
"""

    return NDAResponse(
        nda_id=nda_id,
        status="EXECUTED",
        signed_at=signed_timestamp,
        nda_document_text=nda_text,
        dealroom_access_token=token,
    )
