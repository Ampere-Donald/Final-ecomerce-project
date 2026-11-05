"""Measure first-page catalogue matches for 100 distinct workshop-style inputs."""
import argparse
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

parser = argparse.ArgumentParser()
parser.add_argument('--api', default='https://api.newoteg.com/api')
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
parts = json.loads((Path(__file__).parent / 'fixtures/atelier-references.json').read_text())
cases = {}
for part in parts:
    ref = part['reference']
    split = re.search(r'(?<=[A-Z])(?=\d)', ref).start()
    for separator in ['', ' ', '-', '.']:
        query = ref[:split] + separator + ref[split:]
        cases[query] = part
        if len(cases) == 100:
            break
    if len(cases) == 100:
        break
assert len(cases) == 100


def audit(query):
    part = cases[query]
    params = urlencode(dict(search=query, sort='relevance', page=1, limit=24))
    with urlopen(f"{args.api}/produits?{params}", timeout=25) as response:
        result = json.load(response)
    ids = [p['id'] for p in result['data']]
    return dict(query=query, expected=part['id'], name=part['name'],
                rank=ids.index(part['id']) + 1 if part['id'] in ids else None,
                total=result['meta']['total'])


with ThreadPoolExecutor(max_workers=2) as pool:
    rows = list(pool.map(audit, cases))
args.output.write_text(json.dumps(rows, indent=2) + '\n')
print('First:', sum(r['rank'] == 1 for r in rows), 'Absent:', sum(r['rank'] is None for r in rows))
