"""
ClearCity demo seed script.
Run from the project root: python scripts/seed_demo_data.py
Requires the PostgreSQL container to be running (docker compose up db).
"""

import json
import os
import random
import sys
from datetime import datetime, timedelta, timezone

import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://clearcity:clearcity123@localhost:5432/clearcity",
)

random.seed(42)  # deterministic runs

# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────

STATIONS = [
    ("DPCB001", "Anand Vihar",       28.6469, 77.3164),
    ("DPCB002", "ITO",               28.6289, 77.2406),
    ("DPCB003", "Punjabi Bagh",      28.6726, 77.1318),
    ("DPCB004", "R K Puram",         28.5665, 77.1822),
    ("DPCB005", "Dwarka Sector 8",   28.5921, 77.0517),
    ("DPCB006", "Rohini",            28.7495, 77.0679),
    ("DPCB007", "Jahangirpuri",      28.7356, 77.1683),
    ("DPCB008", "Wazirpur",          28.7011, 77.1681),
    ("DPCB009", "Okhla Phase 2",     28.5244, 77.2730),
    ("DPCB010", "Nehru Nagar",       28.5672, 77.2500),
    ("DPCB011", "North Campus DTU",  28.7501, 77.1132),
    ("DPCB012", "Patparganj",        28.6227, 77.2981),
    ("DPCB013", "Siri Fort",         28.5503, 77.2180),
    ("DPCB014", "Lodhi Road",        28.5962, 77.2198),
    ("DPCB015", "Mandir Marg",       28.6393, 77.1985),
]

BASE_AQI = {
    "DPCB001": 280, "DPCB002": 220, "DPCB003": 195, "DPCB004": 165,
    "DPCB005": 140, "DPCB006": 155, "DPCB007": 185, "DPCB008": 175,
    "DPCB009": 150, "DPCB010": 160, "DPCB011": 130, "DPCB012": 170,
    "DPCB013": 145, "DPCB014": 135, "DPCB015": 150,
}

EMISSION_SOURCES = [
    # (source_id, name, source_type, lat, lon, intensity)
    # ── Brick kilns (10) — clustered SW of DPCB001 and NW corridor ──
    ("SRC_BK001", "Shahdara Brick Kiln Unit A",    "brick_kiln",    28.6200, 77.2850, 8.5),
    ("SRC_BK002", "Shahdara Brick Kiln Unit B",    "brick_kiln",    28.6150, 77.2780, 8.0),
    ("SRC_BK003", "Trilokpuri Brick Works",        "brick_kiln",    28.6250, 77.2900, 7.5),
    ("SRC_BK004", "Narela Kiln Cluster North",     "brick_kiln",    28.7600, 77.0800, 9.0),
    ("SRC_BK005", "Narela Kiln Cluster South",     "brick_kiln",    28.7700, 77.0600, 8.8),
    ("SRC_BK006", "Bawana Brick Works",            "brick_kiln",    28.7800, 77.0900, 7.8),
    ("SRC_BK007", "Dwarka Kiln Complex",           "brick_kiln",    28.5200, 77.0600, 7.2),
    ("SRC_BK008", "Najafgarh Road Kilns",          "brick_kiln",    28.5100, 77.0700, 7.6),
    ("SRC_BK009", "Vikaspuri Brick Unit",          "brick_kiln",    28.6800, 77.0500, 8.2),
    ("SRC_BK010", "Nangloi Kiln Site",             "brick_kiln",    28.6900, 77.0400, 7.4),
    # ── Construction sites (12) ──
    ("SRC_CN001", "Ring Road Flyover Project",     "construction",  28.6300, 77.2200, 5.5),
    ("SRC_CN002", "Dwarka Expressway Phase 3",     "construction",  28.5800, 77.1500, 4.8),
    ("SRC_CN003", "Mukherjee Nagar Metro Work",    "construction",  28.7000, 77.1800, 5.2),
    ("SRC_CN004", "Anand Vihar RRTS Site",         "construction",  28.6500, 77.3000, 4.5),
    ("SRC_CN005", "Okhla Metro Depot Work",        "construction",  28.5500, 77.2500, 5.8),
    ("SRC_CN006", "Punjabi Bagh Underpass",        "construction",  28.6100, 77.1200, 4.2),
    ("SRC_CN007", "GTK Road Widening",             "construction",  28.7200, 77.2000, 5.0),
    ("SRC_CN008", "Sarita Vihar Overpass",         "construction",  28.5900, 77.2800, 4.6),
    ("SRC_CN009", "Yamuna Bank Road Project",      "construction",  28.6700, 77.2600, 5.5),
    ("SRC_CN010", "Tughlakabad Corridor Build",    "construction",  28.5300, 77.1800, 4.3),
    ("SRC_CN011", "Janakpuri District Centre",     "construction",  28.6400, 77.0900, 5.1),
    ("SRC_CN012", "Model Town Redevelopment",      "construction",  28.7400, 77.1600, 4.9),
    # ── Industrial units (8) — Wazirpur/Rohini corridor ──
    ("SRC_IN001", "Wazirpur Steel Rolling Mill A", "industrial",    28.7050, 77.1500, 7.8),
    ("SRC_IN002", "Wazirpur Steel Rolling Mill B", "industrial",    28.7100, 77.1600, 7.2),
    ("SRC_IN003", "Wazirpur Galvanising Unit",     "industrial",    28.7000, 77.1700, 6.8),
    ("SRC_IN004", "Wazirpur Chemical Plant",       "industrial",    28.7150, 77.1450, 7.5),
    ("SRC_IN005", "Rohini Phase 1 Foundry",        "industrial",    28.7500, 77.1200, 6.5),
    ("SRC_IN006", "Rohini Industrial Estate",      "industrial",    28.7450, 77.1100, 7.0),
    ("SRC_IN007", "Okhla Phase 2 Textiles",        "industrial",    28.5800, 77.3100, 6.2),
    ("SRC_IN008", "Okhla Export Unit",             "industrial",    28.5700, 77.3200, 6.9),
    # ── Waste burning zones (6) ──
    ("SRC_WB001", "Bhalswa Landfill Burning",      "waste_burning", 28.7380, 77.1700, 4.5),
    ("SRC_WB002", "Okhla Waste Dump Site",         "waste_burning", 28.5500, 77.2900, 3.8),
    ("SRC_WB003", "Peeragarhi Waste Zone",         "waste_burning", 28.6800, 77.1200, 4.2),
    ("SRC_WB004", "Geeta Colony Burning Spot",     "waste_burning", 28.6200, 77.3300, 3.5),
    ("SRC_WB005", "Tughlakabad Dump Burning",      "waste_burning", 28.5200, 77.2200, 4.8),
    ("SRC_WB006", "Seelampur Open Burning",        "waste_burning", 28.7300, 77.2500, 3.2),
    # ── High-traffic intersections (4) ──
    ("SRC_TR001", "Anand Vihar ISBT Junction",     "traffic",       28.6469, 77.3160, 3.5),
    ("SRC_TR002", "ITO Signal Crossing",           "traffic",       28.6289, 77.2406, 4.0),
    ("SRC_TR003", "Punjabi Bagh West Junction",    "traffic",       28.6726, 77.1318, 3.2),
    ("SRC_TR004", "R K Puram Main Road",           "traffic",       28.5665, 77.1822, 3.8),
]

# ─────────────────────────────────────────────────────────────
# AQI ↔ PM2.5 conversion (India NAAQS)
# ─────────────────────────────────────────────────────────────

_BREAKPOINTS = [
    (0.0,   30.0,   0,   50),
    (30.0,  60.0,  51,  100),
    (60.0,  90.0, 101,  200),
    (90.0, 120.0, 201,  300),
    (120.0, 250.0, 301, 400),
    (250.0, 500.0, 401, 500),
]


def aqi_to_pm25(aqi: int) -> float:
    aqi = max(0, min(500, aqi))
    for c_lo, c_hi, i_lo, i_hi in _BREAKPOINTS:
        if i_lo <= aqi <= i_hi:
            ratio = (aqi - i_lo) / max(i_hi - i_lo, 1)
            return round(c_lo + ratio * (c_hi - c_lo), 2)
    return 500.0


def hour_factor(hour: int) -> float:
    if hour in (7, 8, 9, 10, 19, 20, 21):
        return 1.3
    if hour in (2, 3, 4):
        return 0.85
    return 1.0


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

def main() -> None:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    print("Truncating tables …")
    cur.execute(
        "TRUNCATE enforcement_notices, attribution_results, aqi_readings, emission_sources, stations CASCADE;"
    )

    # ── 1. Stations ──────────────────────────────────────────
    print("Seeding stations …")
    for sid, name, lat, lon in STATIONS:
        cur.execute(
            """
            INSERT INTO stations (station_id, name, city, location)
            VALUES (%s, %s, 'Delhi', ST_SetSRID(ST_MakePoint(%s, %s), 4326))
            """,
            (sid, name, lon, lat),
        )
    print(f"  {len(STATIONS)} stations inserted")

    # ── 2. AQI readings ──────────────────────────────────────
    print("Seeding AQI readings …")
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    today_14h = now.replace(hour=14)

    total_readings = 0
    for sid, name, lat, lon in STATIONS:
        base = BASE_AQI[sid]
        rows = []
        for h in range(167, -1, -1):
            ts = now - timedelta(hours=h)
            factor = hour_factor(ts.hour)
            aqi = int(max(50, min(500, base * factor + random.uniform(-20, 20))))
            pm25 = aqi_to_pm25(aqi)

            # Spike override for DPCB001 at today 14:00
            if sid == "DPCB001" and ts.date() == today_14h.date() and ts.hour == 14:
                aqi = 320
                pm25 = 185.4

            rows.append((
                sid,
                ts,
                aqi,
                pm25,
                round(pm25 * random.uniform(1.6, 2.0), 2),    # pm10
                round(random.uniform(30.0, 90.0), 2),          # no2
                round(random.uniform(5.0, 25.0), 2),           # so2
                round(random.uniform(0.5, 2.0), 2),            # co
                round(random.uniform(2.0, 5.0), 2),            # wind_speed
                random.randint(200, 260),                       # wind_direction
                round(random.uniform(25.0, 38.0), 2),          # temperature
            ))

        cur.executemany(
            """
            INSERT INTO aqi_readings
                (station_id, recorded_at, aqi, pm25, pm10, no2, so2, co,
                 wind_speed, wind_direction, temperature)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            rows,
        )
        total_readings += len(rows)

    print(f"  {total_readings} readings inserted")

    # ── 3. Emission sources ───────────────────────────────────
    print("Seeding emission sources …")
    source_names: dict[str, str] = {}
    for source_id, name, stype, lat, lon, intensity in EMISSION_SOURCES:
        days_ago = random.randint(30, 120)
        inspected = now - timedelta(days=days_ago)
        cur.execute(
            """
            INSERT INTO emission_sources
                (source_id, name, source_type, location, emission_intensity, last_inspected_at)
            VALUES (%s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s)
            """,
            (source_id, name, stype, lon, lat, intensity, inspected),
        )
        source_names[source_id] = name
    print(f"  {len(EMISSION_SOURCES)} emission sources inserted")

    # ── 4. Attribution results ────────────────────────────────
    print("Seeding attribution results …")
    trigger_time = today_14h

    attributions = [
        {
            "station_id": "DPCB001",
            "aqi_at_trigger": 320,
            "wind_speed": 3.2,
            "wind_direction": 225,
            "attributed_sources": [
                {"source_id": "SRC_BK001", "confidence": 0.87, "distance_km": 3.7,
                 "reasoning": "Directly upwind at 225° bearing; elevated PM2.5 consistent with brick kiln combustion profile."},
                {"source_id": "SRC_BK002", "confidence": 0.72, "distance_km": 4.5,
                 "reasoning": "Secondary upwind source; co-located with SRC_BK001, concentration gradient supports contribution."},
                {"source_id": "SRC_BK003", "confidence": 0.61, "distance_km": 2.8,
                 "reasoning": "Nearest brick kiln; lower confidence due to partial wind-shadow from SRC_BK001."},
            ],
            "agent_reasoning": (
                "Wind direction of 225° (southwest) places three brick kiln clusters in the direct "
                "upwind corridor of Anand Vihar station. AQI spike of 320 at 14:00 correlates with "
                "PM2.5 at 185.4 µg/m³, consistent with sustained brick kiln burning. Temporal analysis "
                "shows progressive concentration build-up from 11:00, matching the 3–4 hour atmospheric "
                "transport time at 3.2 m/s wind speed."
            ),
        },
        {
            "station_id": "DPCB007",
            "aqi_at_trigger": 265,
            "wind_speed": 2.8,
            "wind_direction": 200,
            "attributed_sources": [
                {"source_id": "SRC_IN001", "confidence": 0.81, "distance_km": 3.2,
                 "reasoning": "Wazirpur steel rolling mill directly south; wind vector aligns at 200°."},
                {"source_id": "SRC_IN002", "confidence": 0.68, "distance_km": 3.8,
                 "reasoning": "Co-located rolling mill; independent stack emission contribution confirmed."},
                {"source_id": "SRC_WB001", "confidence": 0.55, "distance_km": 1.5,
                 "reasoning": "Bhalswa landfill burning zone at 1.5 km adds secondary particulate load under southerly flow."},
            ],
            "agent_reasoning": (
                "Southerly wind at 200° channels industrial emissions from the Wazirpur industrial corridor "
                "directly toward Jahangirpuri monitoring station. Two identified industrial units operating "
                "without valid emission compliance certificates were placed upwind at 3.2 km and 3.8 km. "
                "A co-located waste burning zone at 1.5 km contributes secondary particulate load under "
                "sustained southerly flow conditions."
            ),
        },
        {
            "station_id": "DPCB008",
            "aqi_at_trigger": 240,
            "wind_speed": 2.5,
            "wind_direction": 180,
            "attributed_sources": [
                {"source_id": "SRC_IN003", "confidence": 0.79, "distance_km": 1.2,
                 "reasoning": "Wazirpur galvanising unit at 1.2 km south; proximity and wind alignment yield high confidence."},
                {"source_id": "SRC_IN004", "confidence": 0.63, "distance_km": 0.8,
                 "reasoning": "Chemical plant at 0.8 km; closest source but lower confidence due to intermittent stack activity."},
            ],
            "agent_reasoning": (
                "South wind at 180° draws emissions from two industrial units in the Wazirpur corridor, "
                "both within 1.5 km of the monitoring station. The proximity and wind alignment yield high "
                "attribution confidence. PM2.5 at approximately 145 µg/m³ is consistent with uncontrolled "
                "stack emissions from iron and steel processing units in this cluster."
            ),
        },
    ]

    attribution_ids: list[int] = []
    for attr in attributions:
        cur.execute(
            """
            INSERT INTO attribution_results
                (station_id, triggered_at, aqi_at_trigger, wind_speed, wind_direction,
                 attributed_sources, agent_reasoning)
            VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
            RETURNING id
            """,
            (
                attr["station_id"],
                trigger_time,
                attr["aqi_at_trigger"],
                attr["wind_speed"],
                attr["wind_direction"],
                json.dumps(attr["attributed_sources"]),
                attr["agent_reasoning"],
            ),
        )
        attribution_ids.append(cur.fetchone()[0])

    print(f"  {len(attributions)} attribution results inserted")

    # ── 5. Enforcement notices ────────────────────────────────
    print("Seeding enforcement notices …")
    notice_counter = 1
    total_notices = 0

    for attr_idx, attr in enumerate(attributions):
        attr_id = attribution_ids[attr_idx]
        station_id = attr["station_id"]
        aqi = attr["aqi_at_trigger"]
        wind_dir = attr["wind_direction"]
        wind_spd = attr["wind_speed"]
        pm25_val = aqi_to_pm25(aqi)

        for rank, src_item in enumerate(attr["attributed_sources"], start=1):
            src_id = src_item["source_id"]
            src_name = source_names.get(src_id, src_id)
            src_type = next(
                (s[2] for s in EMISSION_SOURCES if s[0] == src_id), "industrial"
            )
            confidence_pct = int(src_item["confidence"] * 100)
            dist_km = src_item["distance_km"]

            notice_json = {
                "notice_number": f"CC/2025/{notice_counter:03d}",
                "issued_to": src_name,
                "source_type": src_type,
                "violation_type": "Exceeding PM2.5 emission limits",
                "evidence_summary": (
                    f"Station {station_id} recorded AQI {aqi} at 14:00. "
                    f"Wind direction {wind_dir}° places this facility in the direct upwind corridor "
                    f"at {dist_km} km distance. Attribution confidence: {confidence_pct}%."
                ),
                "sensor_readings": {
                    "aqi": aqi,
                    "pm25": pm25_val,
                    "wind_speed": wind_spd,
                    "wind_direction": wind_dir,
                },
                "action_required": (
                    "Immediate shutdown pending inspection. Report to DPCC within 24 hours."
                ),
                "inspector_name": "",
                "date_issued": "2025-01-15",
            }

            cur.execute(
                """
                INSERT INTO enforcement_notices
                    (attribution_id, source_id, rank, notice_json, status)
                VALUES (%s, %s, %s, %s::jsonb, 'pending')
                """,
                (attr_id, src_id, rank, json.dumps(notice_json)),
            )
            notice_counter += 1
            total_notices += 1

    print(f"  {total_notices} enforcement notices inserted")

    conn.commit()
    cur.close()
    conn.close()

    print(
        f"\nSeeded: {len(STATIONS)} stations, {total_readings} AQI readings, "
        f"{len(EMISSION_SOURCES)} emission sources, {len(attributions)} attribution results, "
        f"{total_notices} enforcement notices"
    )


if __name__ == "__main__":
    main()
