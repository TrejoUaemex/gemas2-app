import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Intentar importar desde la carpeta backend
try:
    from backend.main import app
except Exception as e:
    print("Error importando desde backend:", e)
    # Si las carpetas se perdieron y los archivos están sueltos en la raíz:
    from main import app
