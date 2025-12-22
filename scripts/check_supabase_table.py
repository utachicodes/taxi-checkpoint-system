"""
Check whether the `scan_events` table exists in Supabase using REST API.
Usage:
  set SUPABASE_URL=https://xyz.supabase.co
  set SUPABASE_SERVICE_ROLE_KEY=sk-...
  python scripts/check_supabase_table.py

This script does a simple GET on the REST endpoint and reports 404 (missing) vs 200 (exists).
"""
import os
import sys
import requests

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SERVICE_ROLE:
    print('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
    sys.exit(2)

rest_base = SUPABASE_URL.rstrip('/') + '/rest/v1'
endpoint = rest_base + '/scan_events?select=id&limit=1'
headers = {
    'apikey': SERVICE_ROLE,
    'Authorization': f'Bearer {SERVICE_ROLE}',
}

print(f'Checking {endpoint} ...')
try:
    r = requests.get(endpoint, headers=headers, timeout=10)
    if r.status_code == 200:
        print('OK: scan_events table exists (status 200).')
        print('Sample response:', r.text[:200])
        sys.exit(0)
    elif r.status_code == 404:
        print('MISSING: scan_events table not found (404).')
        print('Please run scripts/005_create_scan_events.sql in your Supabase SQL editor.')
        sys.exit(1)
    else:
        print(f'Unexpected status: {r.status_code} - {r.text[:200]}')
        sys.exit(3)
except Exception as e:
    print('Error connecting to Supabase:', e)
    sys.exit(4)
