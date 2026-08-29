import os

from dotenv import load_dotenv
from fastapi import FastAPI
from supabase import create_client, Client

# Load variables from .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY")

# Connect to Supabase
supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)

app = FastAPI()


@app.get("/")
def root():
    return {"message": "SprintIQ Backend is running"}


@app.get("/supabase-test")
def supabase_test():
    return {"message": "Supabase connection created successfully"}