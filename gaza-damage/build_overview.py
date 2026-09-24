#!/usr/bin/env python3
"""Generate lightweight neighborhood geometry and dated UNOSAT summaries."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def hull(points):
    points = sorted(set(points))
    if len(points) < 3:
        return points

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower = []
    for p in points:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(points):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def vertices(geometry):
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    for polygon in polygons:
        for ring in polygon:
            for point in ring:
                yield tuple(point[:2])


def latest_class(sites, date):
    worst = None
    for site in sites:
        current = None
        for observation in site.get('h', []):
            if observation[0][:10] <= date:
                current = observation[1]
            else:
                break
        if current is not None:
            worst = current if worst is None else min(worst, current)
    return worst


def main():
    neighborhoods = []
    dates = set()
    for path in sorted((ROOT / 'data').glob('*_buildings.geojson')):
        features = json.loads(path.read_text())['features']
        for feature in features:
            for site in feature['properties'].get('damage_sites', []):
                dates.update(item[0][:10] for item in site.get('h', []))
        coords = [p for feature in features for p in vertices(feature['geometry'])]
        neighborhoods.append((path.stem.removesuffix('_buildings'), features, hull(coords)))
    dates = sorted(dates)
    result = {'type': 'FeatureCollection', 'dates': dates, 'features': []}
    for slug, features, outline in neighborhoods:
        timeline = []
        for date in dates:
            counts = [0, 0, 0, 0, 0, 0]  # no record, classes 1-4, other source codes
            for feature in features:
                cls = latest_class(feature['properties'].get('damage_sites', []), date)
                counts[cls if cls in (1, 2, 3, 4) else (5 if cls is not None else 0)] += 1
            timeline.append(counts)
        result['features'].append({
            'type': 'Feature',
            'properties': {'slug': slug, 'name': slug.replace('-', ' ').title(),
                           'building_count': len(features), 'counts': timeline},
            'geometry': {'type': 'Polygon', 'coordinates': [[list(p) for p in outline + outline[:1]]]},
        })
    dest = ROOT / 'data' / 'neighborhood-overview.json'
    dest.write_text(json.dumps(result, separators=(',', ':')) + '\n')
    print(f'{len(result["features"])} neighborhoods, {len(dates)} dates, {dest.stat().st_size} bytes')


if __name__ == '__main__':
    main()
