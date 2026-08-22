import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv("C:/projects/football-chat-bot/backend/.env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(url, key)

res = supabase.table("training_plans").select("id").limit(1).execute()
if res.data:
    plan_id = res.data[0]['id']
    days = [{"day": "1", "tracking_status": "done", "tracking_reason": "none"}]
    
    try:
        update_res = supabase.table("training_plans").update({"days": days}).eq("id", plan_id).execute()
        print("Success!", update_res.data)
    except Exception as e:
        print("Error:", str(e))
else:
    print("No plans found")
