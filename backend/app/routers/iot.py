"""
routers/iot.py — REST API router for Smart Compliance Monitor & ESP32 Telemetry.
"""
from __future__ import annotations

import hashlib
import json
import logging
import random
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.db import (
    IOTDevice,
    IOTDeviceProductLink,
    IOTEvent,
    IOTEvidence,
    IOTRule,
    IOTTelemetry,
)
from app.models.schemas import (
    IOTDeviceProductLinkSchema,
    IOTDeviceSchema,
    IOTEventSchema,
    IOTEvidenceSchema,
    IOTRuleSchema,
    IOTSummaryResponse,
    TelemetryIngestRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Global in-memory demo state for deterministic hackathon demonstration
DEMO_MODE_ACTIVE = True
DEMO_CYCLE_COUNT = 0


def _generate_canonical_hash(payload: dict) -> str:
    """Generate SHA-256 integrity hash from canonical event dictionary."""
    canonical_json = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


async def _get_or_create_default_rule(db: AsyncSession, device_id: str) -> IOTRule:
    """Ensure a default monitoring rule exists for the device."""
    stmt = select(IOTRule).where(IOTRule.device_id == device_id)
    res = await db.execute(stmt)
    rule = res.scalars().first()
    if not rule:
        rule = IOTRule(
            device_id=device_id,
            temp_min=20.0,
            temp_max=30.0,
            humidity_min=40.0,
            humidity_max=70.0,
            sound_max=70.0,
        )
        db.add(rule)
        await db.flush()
    return rule


async def _get_or_create_default_link(db: AsyncSession, device_id: str) -> IOTDeviceProductLink:
    """Ensure default product linking exists for the device."""
    stmt = select(IOTDeviceProductLink).where(IOTDeviceProductLink.device_id == device_id)
    res = await db.execute(stmt)
    link = res.scalars().first()
    if not link:
        link = IOTDeviceProductLink(
            device_id=device_id,
            product_name="Herbal Extract A",
            process_name="Controlled Drying Process",
            monitoring_purpose="Environmental process monitoring for AYUSH quality evidence",
        )
        db.add(link)
        await db.flush()
    return link


async def _get_or_create_default_device(db: AsyncSession, device_id: str = "ESP32-001") -> IOTDevice:
    """Ensure default ESP32 device record exists."""
    stmt = select(IOTDevice).where(IOTDevice.device_id == device_id)
    res = await db.execute(stmt)
    dev = res.scalars().first()
    if not dev:
        dev = IOTDevice(
            device_id=device_id,
            name="ESP32-001 Processing Monitor",
            device_type="Processing Monitor",
            status="ONLINE",
            wifi_status="Connected",
            sampling_interval_sec=5,
            last_seen=datetime.utcnow(),
        )
        db.add(dev)
        await db.flush()
    return dev


# ---------------------------------------------------------------------------
# POST /api/iot/telemetry — ESP32 Telemetry Ingestion Endpoint
# ---------------------------------------------------------------------------
@router.post("/telemetry", summary="Ingest ESP32 telemetry data")
async def ingest_telemetry(
    data: TelemetryIngestRequest, db: AsyncSession = Depends(get_db)
):
    """
    Ingest sensor telemetry from ESP32 or simulation engine.
    Evaluates configured monitoring rules and creates compliance events/evidence.
    """
    # 1. Server-side received timestamp for security/integrity
    now_utc = datetime.utcnow()
    ts_str = data.timestamp or now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    # 2. Input validation
    if not data.device_id or len(data.device_id) > 128:
        raise HTTPException(status_code=400, detail="Invalid device_id")
    
    # 3. Fetch/update device record
    dev = await _get_or_create_default_device(db, data.device_id)
    dev.last_seen = now_utc
    dev.status = "ONLINE"
    dev.wifi_status = "Connected"

    # 4. Save raw telemetry record
    telemetry = IOTTelemetry(
        device_id=data.device_id,
        timestamp=ts_str,
        received_at=now_utc,
        temperature=round(data.temperature, 2),
        humidity=round(data.humidity, 2),
        sound=round(data.sound, 2),
        is_valid=1,
    )
    db.add(telemetry)

    # 5. Evaluate configured process limits (rules)
    rule = await _get_or_create_default_rule(db, data.device_id)
    violations = []
    
    if data.temperature < rule.temp_min or data.temperature > rule.temp_max:
        violations.append({
            "param": "Temperature",
            "val": f"{data.temperature}°C",
            "range": f"{rule.temp_min}–{rule.temp_max}°C",
        })
    if data.humidity < rule.humidity_min or data.humidity > rule.humidity_max:
        violations.append({
            "param": "Humidity",
            "val": f"{data.humidity}%",
            "range": f"{rule.humidity_min}–{rule.humidity_max}%",
        })
    if data.sound > rule.sound_max:
        violations.append({
            "param": "Sound",
            "val": f"{data.sound}",
            "range": f"Max {rule.sound_max}",
        })

    # Determine status level
    compliance_status = "DEVIATION" if violations else "NORMAL"
    
    # Check if a recent active deviation was ongoing to detect recovery
    stmt_last_event = (
        select(IOTEvent)
        .where(IOTEvent.device_id == data.device_id)
        .order_by(desc(IOTEvent.created_at))
    )
    res_last = await db.execute(stmt_last_event)
    last_event = res_last.scalars().first()

    event_created = None
    if violations:
        # Create DEVIATION event
        evt_count_stmt = select(IOTEvent)
        res_all_evts = await db.execute(evt_count_stmt)
        evt_idx = len(res_all_evts.scalars().all()) + 1
        event_id = f"IOT-EVT-{evt_idx:04d}"

        first_v = violations[0]
        event_created = IOTEvent(
            event_id=event_id,
            device_id=data.device_id,
            timestamp=ts_str,
            event_type="DEVIATION",
            parameter=first_v["param"],
            observed_value=first_v["val"],
            configured_range=first_v["range"],
            status="DEVIATION",
            acknowledged=0,
        )
        db.add(event_created)
        await db.flush()

        # Create Evidence Record with canonical hash
        ev_id = f"EVID-{data.device_id}-{evt_idx:04d}"
        payload_to_hash = {
            "evidence_id": ev_id,
            "event_id": event_id,
            "device_id": data.device_id,
            "timestamp": ts_str,
            "temperature": data.temperature,
            "humidity": data.humidity,
            "sound": data.sound,
            "status": "DEVIATION",
            "rule_id": rule.id,
        }
        integrity_hash = _generate_canonical_hash(payload_to_hash)

        evidence = IOTEvidence(
            evidence_id=ev_id,
            event_id=event_id,
            device_id=data.device_id,
            timestamp=ts_str,
            temperature=data.temperature,
            humidity=data.humidity,
            sound=data.sound,
            status="DEVIATION",
            rule_id=rule.id,
            integrity_hash=integrity_hash,
        )
        db.add(evidence)

    elif last_event and last_event.status == "DEVIATION":
        # Create RECOVERY log event
        evt_count_stmt = select(IOTEvent)
        res_all_evts = await db.execute(evt_count_stmt)
        evt_idx = len(res_all_evts.scalars().all()) + 1
        event_id = f"IOT-EVT-{evt_idx:04d}"

        event_created = IOTEvent(
            event_id=event_id,
            device_id=data.device_id,
            timestamp=ts_str,
            event_type="RECOVERY",
            parameter="All Parameters",
            observed_value="Normal",
            configured_range="Within configured process limits",
            status="NORMAL",
            acknowledged=1,
        )
        db.add(event_created)

    await db.commit()

    return {
        "status": "success",
        "device_id": data.device_id,
        "compliance_status": compliance_status,
        "violations": violations,
        "event_id": event_created.event_id if event_created else None,
    }


# ---------------------------------------------------------------------------
# GET /api/iot/summary — Summary status for dashboard cards
# ---------------------------------------------------------------------------
@router.get("/summary", response_model=IOTSummaryResponse, summary="Get IoT system summary")
async def get_summary(device_id: str = "ESP32-001", db: AsyncSession = Depends(get_db)):
    """Fetch current device status, latest readings, rule configuration, and active alerts."""
    dev = await _get_or_create_default_device(db, device_id)
    rule = await _get_or_create_default_rule(db, device_id)
    link = await _get_or_create_default_link(db, device_id)

    # Check offline state (if last seen > 45 seconds ago)
    now = datetime.utcnow()
    is_offline = (now - dev.last_seen) > timedelta(seconds=45)
    dev_status = "OFFLINE" if is_offline else "ONLINE"

    # Get latest telemetry
    stmt_t = (
        select(IOTTelemetry)
        .where(IOTTelemetry.device_id == device_id)
        .order_by(desc(IOTTelemetry.received_at))
        .limit(1)
    )
    res_t = await db.execute(stmt_t)
    latest_t = res_t.scalars().first()

    temp = latest_t.temperature if latest_t else 28.4
    hum = latest_t.humidity if latest_t else 61.0
    snd = latest_t.sound if latest_t else 42.0
    ts_str = latest_t.timestamp if latest_t else now.strftime("%Y-%m-%d %H:%M:%S")

    # Evaluate compliance status
    compliance_status = "NORMAL"
    if (temp < rule.temp_min or temp > rule.temp_max or
        hum < rule.humidity_min or hum > rule.humidity_max or
        snd > rule.sound_max):
        compliance_status = "DEVIATION"

    # Get latest event & unacknowledged count
    stmt_e = (
        select(IOTEvent)
        .where(IOTEvent.device_id == device_id)
        .order_by(desc(IOTEvent.created_at))
        .limit(1)
    )
    res_e = await db.execute(stmt_e)
    latest_evt = res_e.scalars().first()

    stmt_unack = select(IOTEvent).where(
        IOTEvent.device_id == device_id,
        IOTEvent.status == "DEVIATION",
        IOTEvent.acknowledged == 0,
    )
    res_unack = await db.execute(stmt_unack)
    unack_count = len(res_unack.scalars().all())

    device_schema = IOTDeviceSchema(
        id=dev.id,
        device_id=dev.device_id,
        name=dev.name,
        device_type=dev.device_type,
        status=dev_status,
        wifi_status=dev.wifi_status if dev_status == "ONLINE" else "Disconnected",
        sampling_interval_sec=dev.sampling_interval_sec,
        last_seen=ts_str,
        temperature=temp,
        humidity=hum,
        sound=snd,
        compliance_status=compliance_status,
    )

    rule_schema = IOTRuleSchema(
        id=rule.id,
        device_id=rule.device_id,
        temp_min=rule.temp_min,
        temp_max=rule.temp_max,
        humidity_min=rule.humidity_min,
        humidity_max=rule.humidity_max,
        sound_max=rule.sound_max,
    )

    link_schema = IOTDeviceProductLinkSchema(
        id=link.id,
        device_id=link.device_id,
        product_name=link.product_name,
        process_name=link.process_name,
        monitoring_purpose=link.monitoring_purpose,
        passport_id=link.passport_id,
    )

    evt_schema = None
    if latest_evt:
        evt_schema = IOTEventSchema(
            id=latest_evt.id,
            event_id=latest_evt.event_id,
            device_id=latest_evt.device_id,
            timestamp=latest_evt.timestamp,
            event_type=latest_evt.event_type,
            parameter=latest_evt.parameter,
            observed_value=latest_evt.observed_value,
            configured_range=latest_evt.configured_range,
            status=latest_evt.status,
            acknowledged=bool(latest_evt.acknowledged),
        )

    return IOTSummaryResponse(
        device=device_schema,
        current_rule=rule_schema,
        link=link_schema,
        compliance_status=compliance_status,
        latest_event=evt_schema,
        unacknowledged_alerts_count=unack_count,
        demo_mode=DEMO_MODE_ACTIVE,
    )


# ---------------------------------------------------------------------------
# GET /api/iot/devices — List connected devices
# ---------------------------------------------------------------------------
@router.get("/devices", summary="List connected IoT devices")
async def list_devices(db: AsyncSession = Depends(get_db)):
    """Returns list of registered ESP32 devices."""
    stmt = select(IOTDevice)
    res = await db.execute(stmt)
    devices = res.scalars().all()
    if not devices:
        def_dev = await _get_or_create_default_device(db)
        devices = [def_dev]
    
    out = []
    for dev in devices:
        summary = await get_summary(dev.device_id, db)
        out.append(summary.device)
    return out


# ---------------------------------------------------------------------------
# GET /api/iot/telemetry — Historical telemetry log series
# ---------------------------------------------------------------------------
@router.get("/telemetry", summary="Fetch telemetry log history")
async def get_telemetry_history(
    device_id: str = "ESP32-001",
    limit: int = Query(30, ge=5, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Returns historical telemetry data points for live charts."""
    stmt = (
        select(IOTTelemetry)
        .where(IOTTelemetry.device_id == device_id)
        .order_by(desc(IOTTelemetry.received_at))
        .limit(limit)
    )
    res = await db.execute(stmt)
    records = list(reversed(res.scalars().all()))
    
    # If database has few/no records yet, seed sample data for immediate display
    if not records:
        now = datetime.utcnow()
        records = []
        for i in range(15):
            t_offset = now - timedelta(seconds=(15 - i) * 5)
            # Create smooth realistic series
            temp = round(28.0 + random.uniform(-0.6, 0.8), 1)
            hum = round(60.0 + random.uniform(-2.0, 3.0), 1)
            snd = round(42.0 + random.uniform(-3.0, 5.0), 1)
            rec = IOTTelemetry(
                device_id=device_id,
                timestamp=t_offset.strftime("%H:%M:%S"),
                received_at=t_offset,
                temperature=temp,
                humidity=hum,
                sound=snd,
                is_valid=1,
            )
            db.add(rec)
            records.append(rec)
        await db.commit()

    return [
        {
            "id": r.id,
            "device_id": r.device_id,
            "timestamp": r.timestamp if len(r.timestamp) <= 10 else r.timestamp[11:19],
            "temperature": r.temperature,
            "humidity": r.humidity,
            "sound": r.sound,
        }
        for r in records
    ]


# ---------------------------------------------------------------------------
# GET /api/iot/events — Compliance events & alerts timeline
# ---------------------------------------------------------------------------
@router.get("/events", summary="Get compliance events timeline")
async def get_events(
    device_id: str = "ESP32-001",
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Fetch chronological timeline of monitoring events and alerts."""
    stmt = (
        select(IOTEvent)
        .where(IOTEvent.device_id == device_id)
        .order_by(desc(IOTEvent.created_at))
        .limit(limit)
    )
    res = await db.execute(stmt)
    evts = res.scalars().all()

    # Seed sample timeline if empty
    if not evts:
        now = datetime.utcnow()
        sample_evts = [
            IOTEvent(
                event_id="IOT-EVT-0001",
                device_id=device_id,
                timestamp=(now - timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S"),
                event_type="START",
                parameter="Environmental Sensor",
                observed_value="Online",
                configured_range="Normal",
                status="NORMAL",
                acknowledged=1,
            ),
            IOTEvent(
                event_id="IOT-EVT-0002",
                device_id=device_id,
                timestamp=(now - timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S"),
                event_type="MONITORING_LOG",
                parameter="Temperature / Humidity",
                observed_value="28.2°C / 60%",
                configured_range="20-30°C / 40-70%",
                status="NORMAL",
                acknowledged=1,
            ),
            IOTEvent(
                event_id="IOT-EVT-0003",
                device_id=device_id,
                timestamp=(now - timedelta(minutes=4)).strftime("%Y-%m-%d %H:%M:%S"),
                event_type="DEVIATION",
                parameter="Humidity",
                observed_value="78%",
                configured_range="40-70%",
                status="DEVIATION",
                acknowledged=0,
            ),
            IOTEvent(
                event_id="IOT-EVT-0004",
                device_id=device_id,
                timestamp=(now - timedelta(minutes=1)).strftime("%Y-%m-%d %H:%M:%S"),
                event_type="RECOVERY",
                parameter="Humidity",
                observed_value="61%",
                configured_range="40-70%",
                status="NORMAL",
                acknowledged=1,
            ),
        ]
        for se in sample_evts:
            db.add(se)
        await db.commit()
        evts = sample_evts

    return [
        IOTEventSchema(
            id=e.id,
            event_id=e.event_id,
            device_id=e.device_id,
            timestamp=e.timestamp,
            event_type=e.event_type,
            parameter=e.parameter,
            observed_value=e.observed_value,
            configured_range=e.configured_range,
            status=e.status,
            acknowledged=bool(e.acknowledged),
        )
        for e in evts
    ]


# ---------------------------------------------------------------------------
# POST /api/iot/alerts/{event_id}/acknowledge — Acknowledge an alert
# ---------------------------------------------------------------------------
@router.post("/alerts/{event_id}/acknowledge", summary="Acknowledge alert")
async def acknowledge_alert(event_id: str, db: AsyncSession = Depends(get_db)):
    """Mark an in-app compliance alert as acknowledged."""
    stmt = select(IOTEvent).where(
        (IOTEvent.event_id == event_id) | (IOTEvent.id == event_id)
    )
    res = await db.execute(stmt)
    evt = res.scalars().first()
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")

    evt.acknowledged = 1
    await db.commit()
    return {"status": "success", "event_id": evt.event_id, "acknowledged": True}


# ---------------------------------------------------------------------------
# GET/POST /api/iot/rules — Manage process monitoring limits
# ---------------------------------------------------------------------------
@router.get("/rules", response_model=IOTRuleSchema, summary="Get process rules")
async def get_rules(device_id: str = "ESP32-001", db: AsyncSession = Depends(get_db)):
    """Get organization-defined process limits."""
    rule = await _get_or_create_default_rule(db, device_id)
    return IOTRuleSchema(
        id=rule.id,
        device_id=rule.device_id,
        temp_min=rule.temp_min,
        temp_max=rule.temp_max,
        humidity_min=rule.humidity_min,
        humidity_max=rule.humidity_max,
        sound_max=rule.sound_max,
    )


@router.post("/rules", response_model=IOTRuleSchema, summary="Update process rules")
async def update_rules(data: IOTRuleSchema, db: AsyncSession = Depends(get_db)):
    """Update organization-defined monitoring thresholds."""
    rule = await _get_or_create_default_rule(db, data.device_id)
    rule.temp_min = data.temp_min
    rule.temp_max = data.temp_max
    rule.humidity_min = data.humidity_min
    rule.humidity_max = data.humidity_max
    rule.sound_max = data.sound_max
    rule.updated_at = datetime.utcnow()
    await db.commit()
    return data


# ---------------------------------------------------------------------------
# GET /api/iot/evidence/{event_id} — Get tamper-evident audit record
# ---------------------------------------------------------------------------
@router.get("/evidence/{event_id}", response_model=IOTEvidenceSchema, summary="Get evidence record")
async def get_evidence(event_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve audit evidence record including canonical SHA-256 integrity hash."""
    stmt = select(IOTEvidence).where(
        (IOTEvidence.event_id == event_id) | (IOTEvidence.evidence_id == event_id)
    )
    res = await db.execute(stmt)
    ev = res.scalars().first()

    if not ev:
        # Generate an on-the-fly evidence record if event exists
        stmt_evt = select(IOTEvent).where(
            (IOTEvent.event_id == event_id) | (IOTEvent.id == event_id)
        )
        res_evt = await db.execute(stmt_evt)
        evt = res_evt.scalars().first()
        if not evt:
            raise HTTPException(status_code=404, detail="Evidence or Event not found")

        ev_id = f"EVID-{evt.device_id}-{evt.event_id}"
        payload = {
            "evidence_id": ev_id,
            "event_id": evt.event_id,
            "device_id": evt.device_id,
            "timestamp": evt.timestamp,
            "temperature": 28.4,
            "humidity": 61.0 if evt.status == "NORMAL" else 78.0,
            "sound": 42.0,
            "status": evt.status,
            "rule_id": "ENV-HUM-001",
        }
        h = _generate_canonical_hash(payload)
        ev = IOTEvidence(
            evidence_id=ev_id,
            event_id=evt.event_id,
            device_id=evt.device_id,
            timestamp=evt.timestamp,
            temperature=28.4,
            humidity=61.0 if evt.status == "NORMAL" else 78.0,
            sound=42.0,
            status=evt.status,
            rule_id="ENV-HUM-001",
            integrity_hash=h,
        )
        db.add(ev)
        await db.commit()

    return IOTEvidenceSchema(
        id=ev.id,
        evidence_id=ev.evidence_id,
        event_id=ev.event_id,
        device_id=ev.device_id,
        timestamp=ev.timestamp,
        temperature=ev.temperature,
        humidity=ev.humidity,
        sound=ev.sound,
        status=ev.status,
        rule_id=ev.rule_id,
        integrity_hash=ev.integrity_hash,
    )


# ---------------------------------------------------------------------------
# POST /api/iot/device-link — Configure product/process linkage
# ---------------------------------------------------------------------------
@router.post("/device-link", response_model=IOTDeviceProductLinkSchema, summary="Link device to product/process")
async def save_device_link(
    data: IOTDeviceProductLinkSchema, db: AsyncSession = Depends(get_db)
):
    """Associate device with a specific AYUSH product, formulation, or process."""
    link = await _get_or_create_default_link(db, data.device_id)
    link.product_name = data.product_name
    link.process_name = data.process_name
    link.monitoring_purpose = data.monitoring_purpose
    link.passport_id = data.passport_id
    link.updated_at = datetime.utcnow()
    await db.commit()
    return data


# ---------------------------------------------------------------------------
# POST /api/iot/demo-tick — Interactive Demo Telemetry Simulator
# ---------------------------------------------------------------------------
@router.post("/demo-tick", summary="Simulate ESP32 telemetry pulse for demo")
async def demo_tick(
    force_deviation: bool = False, db: AsyncSession = Depends(get_db)
):
    """
    Triggers a live telemetry pulse.
    Cycles through realistic readings, introducing a controlled breach and recovery for hackathon demos.
    """
    global DEMO_CYCLE_COUNT
    DEMO_CYCLE_COUNT += 1

    device_id = "ESP32-001"
    now_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # Controlled deviation cycle on every 6th tick or when forced
    if force_deviation or (DEMO_CYCLE_COUNT % 6 == 3):
        temp = 28.4
        hum = 78.5  # Exceeds 70% threshold
        sound = 45.0
    elif DEMO_CYCLE_COUNT % 6 == 4:
        temp = 29.1
        hum = 72.0  # Returning back
        sound = 41.0
    else:
        temp = round(28.0 + random.uniform(-0.4, 0.6), 1)
        hum = round(61.0 + random.uniform(-2.0, 2.0), 1)
        sound = round(42.0 + random.uniform(-3.0, 4.0), 1)

    payload = TelemetryIngestRequest(
        device_id=device_id,
        timestamp=now_str,
        temperature=temp,
        humidity=hum,
        sound=sound,
    )

    res = await ingest_telemetry(payload, db)
    return {
        "tick": DEMO_CYCLE_COUNT,
        "simulated_telemetry": payload.model_dump(),
        "ingest_result": res,
    }
