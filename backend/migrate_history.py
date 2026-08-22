import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('C:/projects/football-chat-bot/backend/.env')

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing Supabase credentials")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

memory_dir = 'C:/projects/football-chat-bot/backend/user_memory'

if not os.path.exists(memory_dir):
    print("Memory directory not found")
    exit(1)

files = os.listdir(memory_dir)
migrated_users = 0
migrated_messages = 0

for filename in files:
    if filename.endswith('.json') and not filename.endswith('_training_plan.json'):
        user_id = filename.replace('.json', '')
        file_path = os.path.join(memory_dir, filename)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        history = data.get('history', [])
        if not history:
            continue
            
        # Check if user already has messages to avoid duplicates
        existing = supabase.table('chat_messages').select('id').eq('user_id', user_id).execute()
        if len(existing.data) > 0:
            print(f"User {user_id} already has {len(existing.data)} messages in DB. Skipping to avoid duplicates.")
            continue
            
        print(f"Migrating {len(history)} past chat pairs for user {user_id}...")
        
        # Insert all history
        rows_to_insert = []
        for pair in history:
            q = pair.get('q', '').strip()
            a = pair.get('a', '').strip()
            
            if q:
                rows_to_insert.append({
                    'user_id': user_id,
                    'role': 'user',
                    'text': q,
                    'mode': 'general'
                })
            if a:
                rows_to_insert.append({
                    'user_id': user_id,
                    'role': 'bot',
                    'text': a,
                    'mode': 'general'
                })
                
        if rows_to_insert:
            supabase.table('chat_messages').insert(rows_to_insert).execute()
            migrated_users += 1
            migrated_messages += len(rows_to_insert)

print(f"Migration complete! Migrated {migrated_messages} messages for {migrated_users} users.")
