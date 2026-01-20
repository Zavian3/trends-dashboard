from supabase import create_client, Client
from config import Config

class Database:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance.client: Client = create_client(
                Config.SUPABASE_URL,
                Config.SUPABASE_KEY
            )
        return cls._instance
    
    def get_client(self) -> Client:
        return self.client

# Create a singleton instance
db = Database().get_client()
