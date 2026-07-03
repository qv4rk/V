#!/usr/bin/env python3
"""
Manifold Atlas — Custom Alignment Finder

Menu-driven Skyfield/JPL scanner for two-body vantage alignments,
built on the same pattern as eclipsefinder.py / eclipse_menu.py.

Differences from those:
  - Date ranges are validated against DE422's real coverage and you
    get a time estimate + confirmation before a big scan runs, so a
    5000-year request doesn't just churn until it crashes.
  - Bodies and locations aren't fixed to a hardcoded registry — pick
    from the built-in list or enter a custom body (planet/JPL id, or
    a fixed star via RA/Dec) and a custom lat/lon on the fly.
  - The output filename is generated FROM the search parameters
    (location_bodyA-bodyB_startyear-endyear.json), so you can tell
    what's in a file without opening it.
  - Output JSON matches the exact schema your existing archive events
    use (id / title / date / location / type / tags / excerpt /
    content / connections) so it drops straight into data/events.json
    or a standalone file the Atlas can load.

Requires: pip install skyfield
Requires the de422.bsp ephemeris (Skyfield downloads it once, then
caches it locally — it's ~600MB, covers 3000 BCE to 3000 CE).
"""

import json
import os
import re
import sys
import uuid

try:
    from skyfield.api import load, wgs84, Star
except ImportError:
    print("This needs Skyfield: pip install skyfield")
    sys.exit(1)

# ==================== REGISTRY (extend freely, or add at runtime) ====================
OBJECT_REGISTRY = {
    "sun":     {"name": "Sun",       "jpl_id": "sun"},
    "mercury": {"name": "Mercury",   "jpl_id": "mercury barycenter"},
    "venus":   {"name": "Venus",     "jpl_id": "venus barycenter"},
    "earth":   {"name": "Earth",     "jpl_id": "earth"},
    "moon":    {"name": "Moon",      "jpl_id": "moon"},
    "mars":    {"name": "Mars",      "jpl_id": "mars barycenter"},
    "jupiter": {"name": "Jupiter",   "jpl_id": "jupiter barycenter"},
    "saturn":  {"name": "Saturn",    "jpl_id": "saturn barycenter"},
    "uranus":  {"name": "Uranus",    "jpl_id": "uranus barycenter"},
    "neptune": {"name": "Neptune",   "jpl_id": "neptune barycenter"},
    "pluto":   {"name": "Pluto",     "jpl_id": "pluto barycenter"},
    "sirius":  {"name": "Sirius A",  "type": "star", "ra_hours": 6.752, "dec_degrees": -16.716},
}

EARTH_LOCATIONS = {
    "nyc":         {"name": "New York City",         "lat": 40.7128, "lon": -74.0060},
    "london":      {"name": "London",                "lat": 51.5074, "lon":  -0.1278},
    "jerusalem":   {"name": "Jerusalem",              "lat": 31.7683, "lon":  35.2137},
    "dogon":       {"name": "Bandiagara (Dogon)",     "lat": 14.3500, "lon":  -3.6100},
    "cairo":       {"name": "Cairo",                  "lat": 30.0444, "lon":  31.2357},
    "antikythera": {"name": "Antikythera",            "lat": 35.8675, "lon":  23.3056},
}

DE422_MIN_YEAR = -3000
DE422_MAX_YEAR = 3000


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


class Config:
    def __init__(self):
        self.location_key = "nyc"
        self.custom_location = None   # overrides location_key if set
        self.body_a_key = "mars"
        self.body_b_key = "pluto"
        self.start_year = 1700
        self.end_year = 1800
        self.step_days = 5
        self.alignment_threshold = 1.5
        self.output_dir = "."

    def location(self):
        return self.custom_location or EARTH_LOCATIONS[self.location_key]

    def body_a(self):
        return OBJECT_REGISTRY[self.body_a_key]

    def body_b(self):
        return OBJECT_REGISTRY[self.body_b_key]

    def estimated_steps(self):
        days = (self.end_year - self.start_year) * 365.25
        return max(1, int(days / self.step_days))

    def output_filename(self):
        loc = self.location()["name"]
        a, b = self.body_a()["name"], self.body_b()["name"]
        return f"{slugify(loc)}_{slugify(a)}-{slugify(b)}_{self.start_year}-{self.end_year}.json"


class AlignmentEngine:
    def __init__(self):
        print("Loading JPL Ephemeris DE422 (covers 3000 BCE–3000 CE, cached after first run)...")
        self.eph = load("de422.bsp")
        self.ts = load.timescale()
        self.earth = self.eph["earth"]

    def _target(self, obj):
        if obj.get("type") == "star":
            return Star(ra_hours=obj["ra_hours"], dec_degrees=obj["dec_degrees"])
        return self.eph[obj["jpl_id"]]

    def scan(self, cfg, progress_cb=None):
        loc = cfg.location()
        obj_a, obj_b = cfg.body_a(), cfg.body_b()

        observer = self.earth + wgs84.latlon(loc["lat"], loc["lon"])
        target_a = self._target(obj_a)
        target_b = self._target(obj_b)

        t = self.ts.utc(cfg.start_year, 1, 1)
        t_end = self.ts.utc(cfg.end_year, 12, 31)
        total = cfg.estimated_steps()
        done = 0
        results = []

        while t.tt < t_end.tt:
            sep = observer.at(t).observe(target_a).separation_from(
                observer.at(t).observe(target_b)
            ).degrees
            if sep <= cfg.alignment_threshold:
                dt = t.utc_datetime()
                results.append(self._format_node(dt, loc, obj_a, obj_b, sep))
                print(f"\n  hit: {dt.strftime('%Y-%m-%d')}  (separation {sep:.4f}°)")
                t = self.ts.tt_jd(t.tt + 30)   # jump past this conjunction, don't re-log it
            else:
                t = self.ts.tt_jd(t.tt + cfg.step_days)
            done += 1
            if progress_cb and done % 200 == 0:
                progress_cb(done, total)

        return results

    def _format_node(self, dt, loc, obj_a, obj_b, angle):
        title = f"{obj_a['name']} & {obj_b['name']} Syzygy"
        tags = [
            "vantage", "syzygy",
            slugify(obj_a["name"]), slugify(obj_b["name"]),
        ]
        return {
            "id": f"evt_{uuid.uuid4().hex[:8]}",
            "title": title,
            "date": {"year": dt.year, "month": dt.month, "day": dt.day},
            "location": {"name": loc["name"], "lat": loc["lat"], "lon": loc["lon"]},
            "type": "archive",
            "tags": tags,
            "excerpt": f"A true physical alignment observed from {loc['name']}.",
            "content": (
                "## Physics Engine Data\n"
                f"* **Observation Vertex:** {loc['name']}\n"
                f"* **Actual Angular Separation:** `{angle:.4f}°`"
            ),
            "connections": [],
        }


# ==================== MENU ====================

def pick_from_registry(prompt, registry):
    keys = list(registry.keys())
    print(prompt)
    for i, k in enumerate(keys, 1):
        print(f"  [{i}] {registry[k]['name']}")
    print("  [c] custom (enter your own)")
    choice = input("Select: ").strip().lower()
    if choice == "c":
        return None
    try:
        return keys[int(choice) - 1]
    except (ValueError, IndexError):
        print("Invalid choice — defaulting to the first option.")
        return keys[0]


def add_custom_body():
    name = input("  Body name: ").strip()
    is_star = input("  Is this a fixed star (vs. a solar-system body)? [y/N]: ").strip().lower() == "y"
    key = slugify(name)
    if is_star:
        ra = float(input("  RA (hours): ").strip())
        dec = float(input("  Dec (degrees): ").strip())
        OBJECT_REGISTRY[key] = {"name": name, "type": "star", "ra_hours": ra, "dec_degrees": dec}
    else:
        jpl_id = input("  Skyfield/JPL id (e.g. 'mars barycenter', 'sun', 'moon'): ").strip()
        OBJECT_REGISTRY[key] = {"name": name, "jpl_id": jpl_id}
    return key


def add_custom_location():
    name = input("  Location name: ").strip()
    lat = float(input("  Latitude: ").strip())
    lon = float(input("  Longitude: ").strip())
    return {"name": name, "lat": lat, "lon": lon}


def configure():
    cfg = Config()

    print("\n=== Vantage point ===")
    key = pick_from_registry("Choose an observation location:", EARTH_LOCATIONS)
    if key is None:
        cfg.custom_location = add_custom_location()
    else:
        cfg.location_key = key

    print("\n=== Body A ===")
    key = pick_from_registry("Choose the first body:", OBJECT_REGISTRY)
    cfg.body_a_key = key if key else add_custom_body()

    print("\n=== Body B ===")
    key = pick_from_registry("Choose the second body:", OBJECT_REGISTRY)
    cfg.body_b_key = key if key else add_custom_body()

    print(f"\n=== Date range (DE422 covers {DE422_MIN_YEAR} to {DE422_MAX_YEAR}) ===")
    sy = input(f"  Start year (negative = BCE) [{cfg.start_year}]: ").strip()
    ey = input(f"  End year [{cfg.end_year}]: ").strip()
    if sy: cfg.start_year = int(sy)
    if ey: cfg.end_year = int(ey)
    cfg.start_year = max(DE422_MIN_YEAR, min(cfg.start_year, DE422_MAX_YEAR))
    cfg.end_year = max(cfg.start_year + 1, min(cfg.end_year, DE422_MAX_YEAR))

    tol = input(f"  Angular tolerance in degrees [{cfg.alignment_threshold}]: ").strip()
    if tol: cfg.alignment_threshold = float(tol)

    return cfg


def confirm_and_run(engine, cfg):
    steps = cfg.estimated_steps()
    years = cfg.end_year - cfg.start_year
    est_seconds = steps / 1500  # rough, phone-safe guess

    print(f"\nScanning ~{years} years in {cfg.step_days}-day steps (~{steps:,} evaluations).")
    print(f"Rough estimate: {est_seconds:.0f}s — could run longer on a phone.")
    if years > 1000:
        print("⚠️  That's a big range for one pass. Consider splitting it into a few")
        print("    smaller runs instead — each one's filename records exactly which")
        print("    slice of time it covers, so nothing gets confused later.")

    if input("Proceed? [y/N]: ").strip().lower() != "y":
        print("Cancelled.")
        return

    def progress(done, total):
        pct = min(100, done * 100 // total)
        sys.stdout.write(f"\r  scanning… {pct}%")
        sys.stdout.flush()

    results = engine.scan(cfg, progress_cb=progress)
    print()

    path = os.path.join(cfg.output_dir, cfg.output_filename())
    with open(path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n✅ {len(results)} alignment(s) found → {path}")


def main():
    print("=" * 60)
    print("   MANIFOLD ATLAS — CUSTOM ALIGNMENT FINDER")
    print("=" * 60)

    engine = None
    while True:
        print("\n[n] New search   [q] Quit")
        choice = input("Select: ").strip().lower()
        if choice == "q":
            break
        if choice == "n":
            cfg = configure()
            if engine is None:
                engine = AlignmentEngine()
            confirm_and_run(engine, cfg)


if __name__ == "__main__":
    main()
