from fastapi import FastAPI

app = FastAPI(
    title="SprintIQ API",
    version="1.0.0"
)

@app.get("/")
def root():
    return {
        "message": "SprintIQ Backend is running!"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }