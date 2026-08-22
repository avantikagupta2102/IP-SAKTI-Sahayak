"""
routers/regulations.py — GET /api/regulations & GET /api/regulations/impact

Provides a curated, authoritative library of Indian Intellectual Property & AYUSH statutory regulations,
along with a profile impact engine that ranks regulations by relevance to a given business profile.
"""
import json
import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.db import BusinessProfile
from app.models.schemas import (
    IPAssetSchema,
    RegulationImpactResponse,
    RegulationItem,
    RegulationsResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Curated Library of Indian Statutory IP & AYUSH Regulations
# ---------------------------------------------------------------------------
CURATED_REGULATIONS: List[Dict] = [
    {
        "id": "patents-act-1970",
        "title": "The Patents Act, 1970 & Patents Rules 2003 (with 2024 Amendments)",
        "authority": "Office of Controller General of Patents, Designs & Trade Marks (CGPDTM)",
        "sectors": ["ALL", "AYUSH", "Pharma", "Biotech", "Software", "MSME"],
        "asset_types": ["Patent"],
        "summary": "Governs statutory patent eligibility, 20-year term of protection, novelty standards, Section 3 exclusions, and fee concessions under SIPP scheme.",
        "impact_level": "CRITICAL",
        "key_provisions": [
            "Section 3(p): Excludes traditional knowledge and aggregation of known properties from patentability.",
            "Form 1, 2, 3: Complete specification filing, provisional specifications, and Form 3 foreign filing disclosures.",
            "SIPP Scheme: 80% rebate on official patent filing fees for Startups and MSMEs.",
            "Form 27: Annual statement of commercial working of patented inventions in India."
        ],
        "official_reference": "Act No. 39 of 1970 (Ministry of Commerce & Industry)",
    },
    {
        "id": "ayush-guidelines-2018",
        "title": "Guidelines for Examination of AYUSH Related Inventions (2018)",
        "authority": "CGPDTM & Ministry of AYUSH",
        "sectors": ["AYUSH", "Pharma & Healthcare", "Biotech", "Agriculture"],
        "asset_types": ["Patent"],
        "summary": "Official Patent Office guidelines evaluating Section 3(p) non-patentability, herbal formulation novelty, and TKDL prior art search procedures.",
        "impact_level": "CRITICAL",
        "key_provisions": [
            "Synergistic Efficacy Mandate: Combination of known traditional herbs must prove non-obvious synergistic enhancement (CI < 1.0).",
            "Mandatory TKDL Search: Examiners cross-reference all herbal patent claims against 250,000+ TKDL accession entries.",
            "Section 3(e) Objection: Mere admixtures resulting only in aggregation of properties are barred.",
            "Botanical Specification: Requires scientific Latin binomial names and plant part identification."
        ],
        "official_reference": "CGPDTM Public Notice Guidelines 2018",
    },
    {
        "id": "trademarks-act-1999",
        "title": "The Trade Marks Act, 1999 & Trade Marks Rules 2017",
        "authority": "Trade Marks Registry (CGPDTM)",
        "sectors": ["ALL", "AYUSH", "Pharma", "Biotech", "Software & DeepTech", "Manufacturing / MSME"],
        "asset_types": ["Trademark"],
        "summary": "Regulates brand name protection, logo registration, Nice Classification (Class 5 for herbal pharmaceuticals, Class 35 for retail), and infringement protection.",
        "impact_level": "CRITICAL",
        "key_provisions": [
            "Section 9(1): Absolute grounds for refusal (descriptive or generic names like 'Ayush Herbal' are non-registrable).",
            "Section 11: Relative grounds for refusal based on earlier deceptive similarity.",
            "Nice Classification Class 5: Covers Ayurvedic OTC, botanical supplements, and medicinal preparations.",
            "Section 29: Statutory remedies against trademark infringement and passing off."
        ],
        "official_reference": "Act No. 47 of 1999 (Ministry of Commerce & Industry)",
    },
    {
        "id": "biodiversity-act-2002",
        "title": "The Biological Diversity Act, 2002 & ABS Regulations 2014",
        "authority": "National Biodiversity Authority (NBA) & State Biodiversity Boards",
        "sectors": ["AYUSH", "Biotech", "Pharma & Healthcare", "Agriculture"],
        "asset_types": ["Patent"],
        "summary": "Mandates prior approval from the National Biodiversity Authority (NBA) before applying for IP rights based on biological resources accessed in India.",
        "impact_level": "HIGH",
        "key_provisions": [
            "Section 6: Mandatory NBA approval required prior to grant of patent for inventions based on Indian biological resources.",
            "Access & Benefit Sharing (ABS): Payment of 0.1% to 0.5% of trader turnover into State Biodiversity Fund.",
            "Section 3 & 4: Restrictions on foreign entities or Indian entities with foreign equity transferring research results.",
            "Penalty Provisions: Non-compliance attracts imprisonment up to 5 years under Section 55."
        ],
        "official_reference": "Act No. 18 of 2003 (Ministry of Environment, Forest & Climate Change)",
    },
    {
        "id": "drugs-cosmetics-1940",
        "title": "Drugs & Cosmetics Act, 1940 (AYUSH Rule 161 & Form 25-D)",
        "authority": "Central Drugs Standard Control Organization (CDSCO) & State AYUSH Licensing Authorities",
        "sectors": ["AYUSH", "Pharma & Healthcare", "Cosmetics"],
        "asset_types": ["Patent", "Trademark"],
        "summary": "Regulates manufacturing licences (Form 25-D), mandatory botanical labelling requirements under Rule 161, and OTC health claim permissions.",
        "impact_level": "HIGH",
        "key_provisions": [
            "Rule 161: Mandatory display of true botanical names, plant parts, and manufacturing licence number on outer package.",
            "Form 25-D: Manufacturing licence for Ayurvedic, Siddha, and Unani drugs.",
            "Proof of Textual Citation: Classical formulations require reference to authoritative books listed in First Schedule.",
            "Misbranded & Spurious Drugs: Strict penalties for false disease cure claims."
        ],
        "official_reference": "Act No. 23 of 1940 (Ministry of Health & Family Welfare)",
    },
    {
        "id": "gi-act-1999",
        "title": "The Geographical Indications of Goods (Registration and Protection) Act, 1999",
        "authority": "Geographical Indications Registry, Chennai (CGPDTM)",
        "sectors": ["AYUSH", "Agriculture", "Manufacturing / MSME"],
        "asset_types": ["GI", "Geographical Indication"],
        "summary": "Protects traditional products originating from specific geographical regions (e.g., Coorg Green Cardamom, Malabar Pepper, Darjeeling Tea, Kashmir Saffron).",
        "impact_level": "MODERATE",
        "key_provisions": [
            "Authorized User Registration: Allows producers in designated region to register as authorized users.",
            "Prohibition of Assignment: GI rights cannot be licensed or assigned to non-regional entities.",
            "Section 20: Precludes registration of GI as a trademark to prevent consumer deception.",
            "Protection against Deceptive Indications: Prevents unfair competition under Paris Convention."
        ],
        "official_reference": "Act No. 48 of 1999 (Ministry of Commerce & Industry)",
    },
    {
        "id": "copyright-act-1957",
        "title": "The Copyright Act, 1957 & Copyright Rules 2013",
        "authority": "Copyright Office (Department for Promotion of Industry and Internal Trade)",
        "sectors": ["Software & DeepTech", "Biotech", "AYUSH", "ALL"],
        "asset_types": ["Copyright"],
        "summary": "Protects software source code, proprietary algorithms, AYUSH clinical trial dossiers, research publications, and marketing artwork.",
        "impact_level": "MODERATE",
        "key_provisions": [
            "Section 2(o): Software programs protected as literary works.",
            "Term of Protection: Lifetime of author plus 60 years (or 60 years for corporate works).",
            "Fair Dealing Provisions: Exceptions for private study and non-commercial research under Section 52.",
            "Digital Rights Management (DRM): Statutory protection against circumvention of technological measures."
        ],
        "official_reference": "Act No. 14 of 1957 (Ministry of Commerce & Industry)",
    },
    {
        "id": "sicldr-act-2000",
        "title": "The Semiconductor Integrated Circuits Layout-Design Act, 2000",
        "authority": "Semiconductor Integrated Circuits Layout-Design Registry (MeitY)",
        "sectors": ["Software & DeepTech", "Manufacturing / MSME"],
        "asset_types": ["Copyright", "Patent"],
        "summary": "Protects original semiconductor IC layout designs, microchip architectures, and hardware logic topologies for 10 years.",
        "impact_level": "MODERATE",
        "key_provisions": [
            "Originality Requirement: Layout design must be original and not previously commercially exploited.",
            "10-Year Protection Period: Starts from date of application or first commercial exploitation.",
            "Reverse Engineering Exception: Allows reproduction for scientific research and analysis.",
            "Infringement Protection: Civil and criminal remedies for unauthorized copying."
        ],
        "official_reference": "Act No. 37 of 2000 (Ministry of Electronics and Information Technology)",
    },
]


@router.get("/regulations", response_model=RegulationsResponse, summary="Get Curated IP & AYUSH Regulations Library")
async def get_regulations() -> RegulationsResponse:
    """Return the complete curated library of core Indian statutory IP regulations."""
    items = [RegulationItem(**item) for item in CURATED_REGULATIONS]
    return RegulationsResponse(total=len(items), regulations=items)


@router.get("/regulations/impact", response_model=RegulationImpactResponse, summary="Get Regulations Ranked by Profile Relevance")
async def get_regulations_impact(
    profile_id: str = Query(..., description="ID of BusinessProfile to evaluate"),
    db: AsyncSession = Depends(get_db),
) -> RegulationImpactResponse:
    """
    Filter and rank statutory regulations based on their direct impact and relevance
    to a given business profile's sector and IP asset portfolio.
    """
    profile = await db.get(BusinessProfile, profile_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business Profile with ID '{profile_id}' not found.",
        )

    # Parse profile sector and logged IP assets
    profile_sector = (profile.sector or "AYUSH").upper()
    try:
        assets_raw = json.loads(profile.ip_assets_json or "[]")
        ip_assets = [IPAssetSchema(**a) for a in assets_raw]
    except Exception:
        ip_assets = []

    profile_asset_types = {a.asset_type.upper() for a in ip_assets}

    ranked_items: List[RegulationItem] = []

    for reg in CURATED_REGULATIONS:
        score = 30  # Base relevance score
        reasons = []

        # 1. Sector overlap scoring
        reg_sectors = [s.upper() for s in reg["sectors"]]
        if "ALL" in reg_sectors or profile_sector in reg_sectors or any(profile_sector in s for s in reg_sectors):
            score += 40
            reasons.append(f"Applies to your '{profile.sector}' sector")
        elif "AYUSH" in profile_sector and any(s in reg_sectors for s in ["AYUSH", "PHARMA", "BIOTECH"]):
            score += 35
            reasons.append("Applies to AYUSH & Healthcare verticals")

        # 2. Asset Type overlap scoring
        reg_asset_types = {a.upper() for a in reg["asset_types"]}
        asset_matches = profile_asset_types.intersection(reg_asset_types)
        if asset_matches:
            score += 25
            matched_str = ", ".join(asset_matches)
            reasons.append(f"Directly governs your logged {matched_str} portfolio")
        elif not profile_asset_types and reg["impact_level"] == "CRITICAL":
            score += 15
            reasons.append("Critical mandatory baseline regulation")

        # 3. Impact level bonus
        if reg["impact_level"] == "CRITICAL":
            score += 10

        score = max(20, min(100, score))
        reason_text = " • ".join(reasons) if reasons else "General statutory reference"

        item = RegulationItem(
            id=reg["id"],
            title=reg["title"],
            authority=reg["authority"],
            sectors=reg["sectors"],
            asset_types=reg["asset_types"],
            summary=reg["summary"],
            impact_level=reg["impact_level"],
            key_provisions=reg["key_provisions"],
            official_reference=reg["official_reference"],
            relevance_score=score,
            relevance_reason=reason_text,
        )
        ranked_items.append(item)

    # Sort descending by relevance score
    ranked_items.sort(key=lambda x: (x.relevance_score or 0), reverse=True)

    return RegulationImpactResponse(
        profile_id=profile.id,
        company_name=profile.company_name,
        sector=profile.sector,
        company_type=profile.company_type,
        total_matched=len(ranked_items),
        regulations=ranked_items,
    )
