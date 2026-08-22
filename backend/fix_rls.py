"""
Run this script once to fix the RLS policy on coach_profiles.
It calls your local Flask backend which uses the service_role client.
Make sure your backend (python app.py) is running first!
"""
import requests

BACKEND = 'http://127.0.0.1:5000'

resp = requests.post(f'{BACKEND}/api/admin/fix-coach-rls', timeout=15)
print('Status:', resp.status_code)
print('Response:', resp.json())
