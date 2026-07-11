import os
import sys
import uvicorn

# Añadir el directorio raíz al path de Python para que encuentre 'backend'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.main import app

if __name__ == "__main__":
    # Hugging Face Spaces enruta automáticamente el puerto 7860
    uvicorn.run("app:app", host="0.0.0.0", port=7860)
