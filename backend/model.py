import os
import json
import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torchvision.models as models
from PIL import Image

# Forzar el uso de CPU para el backend (estándar para servidores gratuitos como Hugging Face)
device = torch.device('cpu')

# Rutas de archivos
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PATH_MODELO = os.path.join(BASE_DIR, 'model.pth')
PATH_CLASES = os.path.join(BASE_DIR, 'classes.json')

# Variables globales del modelo y las clases
model = None
classes = []
dummy_mode = False

# Transformaciones de imagen estándar de ImageNet
transformaciones = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

DICCIONARIO_TRADUCCION = {
    # Gemas simples
    "ruby": "rubí", "rubies": "rubíes",
    "emerald": "esmeralda", "emeralds": "esmeraldas",
    "sapphire": "zafiro", "sapphires": "zafiros",
    "diamond": "diamante", "diamonds": "diamantes",
    "amethyst": "amatista", "amethysts": "amatistas",
    "opal": "ópalo", "opals": "ópalos",
    "topaz": "topacio", "topazes": "topacios",
    "jade": "jade", "quartz": "cuarzo", "garnet": "granate",
    "pearl": "perla", "pearls": "perlas",
    "aquamarine": "aguamarina", "turquoise": "turquesa",
    "amber": "ámbar", "citrine": "citrino", "peridot": "peridoto",
    "tanzanite": "tanzanita", "zircon": "circón", "alexandrite": "alejandrita",
    "onyx": "ónix", "lapislazuli": "lapislázuli", "lapis lazuli": "lapislázuli",
    "tourmaline": "turmalina", "malachite": "malaquita", "hematite": "hematita",
    "moonstone": "piedra de luna", "sunstone": "piedra de sol", "fluorite": "fluorita",
    "kunzite": "kunzita", "spinel": "espinela", "morganite": "morganita",
    "agate": "ágata", "jasper": "jaspe", "obsidian": "obsidiana",
    "carnelian": "cornalina", "sodalite": "sodalita", "aventurine": "aventurina",
    "rhodonite": "rodonita", "chrysocolla": "crisocola", "beryl": "berilo",
    "chalcedony": "calcedonia", "tiger_eye": "ojo de tigre", "tigers_eye": "ojo de tigre",
    "tiger eye": "ojo de tigre",
    
    # Combinaciones específicas comunes
    "onyx black": "ónix negro",
    "black onyx": "ónix negro",
    "sapphire blue": "zafiro azul",
    "blue sapphire": "zafiro azul",
    "sapphire pink": "zafiro rosa",
    "pink sapphire": "zafiro rosa",
    "beryl golden": "berilo dorado",
    "golden beryl": "berilo dorado",
    "sapphire yellow": "zafiro amarillo",
    "yellow sapphire": "zafiro amarillo",
    "quartz rose": "cuarzo rosa",
    "rose quartz": "cuarzo rosa",
    "quartz smoky": "cuarzo ahumado",
    "smoky quartz": "cuarzo ahumado",
    "topaz blue": "topacio azul",
    "blue topaz": "topacio azul",
    "diamond blue": "diamante azul",
    "blue diamond": "diamante azul",
    "pearl white": "perla blanca",
    "white pearl": "perla blanca",
    "pearl black": "perla negra",
    "black pearl": "perla negra",
    "agate moss": "ágata musgo",
    "moss agate": "ágata musgo",
    "jasper red": "jaspe rojo",
    "red jasper": "jaspe rojo",
    "fluorite green": "fluorita verde",
    "green fluorite": "fluorita verde"
}

# Palabras individuales (sustantivos y adjetivos) para traducción por componentes
DICCIONARIO_PALABRAS = {
    # Sustantivos (Gemas)
    "ruby": "rubí", "rubies": "rubíes",
    "emerald": "esmeralda", "emeralds": "esmeraldas",
    "sapphire": "zafiro", "sapphires": "zafiros",
    "diamond": "diamante", "diamonds": "diamantes",
    "amethyst": "amatista", "amethysts": "amatistas",
    "opal": "ópalo", "opals": "ópalos",
    "topaz": "topacio", "topazes": "topacios",
    "jade": "jade", "quartz": "cuarzo", "garnet": "granate",
    "pearl": "perla", "pearls": "perlas",
    "aquamarine": "aguamarina", "turquoise": "turquesa",
    "amber": "ámbar", "citrine": "citrino", "peridot": "peridoto",
    "tanzanite": "tanzanita", "zircon": "circón", "alexandrite": "alejandrita",
    "onyx": "ónix", "lapislazuli": "lapislázuli",
    "tourmaline": "turmalina", "malachite": "malaquita", "hematite": "hematita",
    "moonstone": "piedra de luna", "sunstone": "piedra de sol", "fluorite": "fluorita",
    "kunzite": "kunzita", "spinel": "espinela", "morganite": "morganita",
    "agate": "ágata", "jasper": "jaspe", "obsidian": "obsidiana",
    "carnelian": "cornalina", "sodalite": "sodalita", "aventurine": "aventurina",
    "rhodonite": "rodonita", "chrysocolla": "crisocola", "beryl": "berilo",
    "chalcedony": "calcedonia",
    
    # Adjetivos (Colores/Modificadores)
    "blue": "azul",
    "pink": "rosa",
    "rose": "rosa",
    "yellow": "amarillo",
    "golden": "dorado",
    "red": "rojo",
    "green": "verde",
    "black": "negro",
    "white": "blanco",
    "smoky": "ahumado",
    "moss": "musgo"
}

# Sustantivos femeninos para concordancia de género
SUSTANTIVOS_FEMENINOS = {
    "esmeralda", "esmeraldas", "amatista", "amatistas", "perla", "perlas", 
    "aguamarina", "turquesa", "tanzanita", "alejandrita", "turmalina", 
    "malaquita", "hematita", "fluorita", "kunzita", "espinela", 
    "morganita", "ágata", "obsidiana", "cornalina", "sodalita", 
    "aventurina", "rodonita", "crisocola", "calcedonia", "piedra de luna", 
    "piedra de sol"
}

def traducir_clase(nombre):
    # Limpiar y normalizar el nombre
    nombre_limpio = str(nombre).strip().lower().replace("_", " ").replace("-", " ")
    
    # 1. Intentar coincidencia exacta en el diccionario principal
    if nombre_limpio in DICCIONARIO_TRADUCCION:
        return DICCIONARIO_TRADUCCION[nombre_limpio].capitalize()
    
    # 2. Dividir por palabras y hacer traducción inteligente por componentes
    palabras = nombre_limpio.split()
    if len(palabras) >= 2:
        gema_tr = None
        mod_tr = None
        es_femenino = False
        
        # Traducir primer término (generalmente el sustantivo)
        if palabras[0] in DICCIONARIO_PALABRAS:
            gema_tr = DICCIONARIO_PALABRAS[palabras[0]]
            es_femenino = gema_tr.lower() in SUSTANTIVOS_FEMENINOS
            
        # Traducir segundo término (generalmente el adjetivo/color)
        if palabras[1] in DICCIONARIO_PALABRAS:
            mod_tr = DICCIONARIO_PALABRAS[palabras[1]]
            
        # Si se identificaron ambas partes, ensamblar con concordancia de género
        if gema_tr and mod_tr:
            if es_femenino:
                if mod_tr.endswith("o"):
                    mod_tr = mod_tr[:-1] + "a"
                elif mod_tr == "ahumado":
                    mod_tr = "ahumada"
            return f"{gema_tr} {mod_tr}".capitalize()
            
    # 3. Fallback: Reemplazar guiones y capitalizar
    return nombre_limpio.capitalize()

def inicializar_modelo():
    global model, classes, dummy_mode
    
    # 1. Cargar las clases
    if os.path.exists(PATH_CLASES):
        try:
            with open(PATH_CLASES, 'r', encoding='utf-8') as f:
                raw_classes = json.load(f)
            # Traducir nombres al español
            classes = [traducir_clase(c) for c in raw_classes]
            print(f"[OK] Clases cargadas (traducidas al español): {classes}")
        except Exception as e:
            print(f"[ERROR] No se pudo leer classes.json: {e}")
            classes = ["Gema A", "Gema B"]
            dummy_mode = True
    else:
        print("[AVISO] classes.json no encontrado. Usando clases de prueba.")
        classes = ["Gema A", "Gema B"]
        dummy_mode = True

    # 2. Inicializar la arquitectura de ResNet18
    num_clases = len(classes)
    # Usamos weights=None porque cargaremos nuestros propios pesos entrenados
    model = models.resnet18(weights=None)
    num_caracteristicas = model.fc.in_features
    model.fc = nn.Linear(num_caracteristicas, num_clases)

    # 3. Cargar los pesos entrenados
    if os.path.exists(PATH_MODELO) and not dummy_mode:
        try:
            # Cargar pesos mapeándolos a CPU
            model.load_state_dict(torch.load(PATH_MODELO, map_location=device))
            model.eval()
            print("[OK] Pesos del modelo cargados correctamente (.pth)")
        except Exception as e:
            print(f"[ERROR] Error al cargar los pesos en model.pth: {e}")
            print("El servidor correrá en modo demostración (pesos aleatorios).")
            model.eval()
            dummy_mode = True
    else:
        print("[AVISO] model.pth no encontrado. La red correrá con pesos iniciales (modo demostración).")
        model.eval()
        dummy_mode = True

def predecir(imagen_pil):
    """
    Recibe una imagen PIL, aplica transformaciones, corre la CNN
    y devuelve las probabilidades por clase y la predicción final.
    Si la confianza máxima es menor al umbral, marca la imagen como inválida.
    """
    global model, classes

    # Umbral mínimo de confianza para considerar una imagen como válida
    # Si el modelo no supera este % en ninguna clase, asume que no es una gema
    UMBRAL_CONFIANZA = 0.40

    if model is None:
        inicializar_modelo()

    # Preprocesar la imagen
    imagen_transformada = transformaciones(imagen_pil)
    # Añadir dimensión de batch (1, C, H, W)
    imagen_batch = imagen_transformada.unsqueeze(0).to(device)

    # Inferencia
    with torch.no_grad():
        outputs = model(imagen_batch)
        # Aplicar Softmax para obtener probabilidades (0 a 1)
        probabilidades = torch.softmax(outputs, dim=1)[0]

        # Obtener clase ganadora
        prob_max, clase_idx = torch.max(probabilidades, 0)
        clase_predicha = classes[clase_idx.item()]
        confianza_ganadora = prob_max.item()

    # Crear lista de resultados con probabilidades
    resultados_clases = []
    for i, clase in enumerate(classes):
        resultados_clases.append({
            "clase": clase,
            "probabilidad": float(probabilidades[i].item())
        })

    # Ordenar por probabilidad descendente
    resultados_clases = sorted(resultados_clases, key=lambda x: x["probabilidad"], reverse=True)

    # Determinar si la imagen parece ser una gema válida
    imagen_valida = confianza_ganadora >= UMBRAL_CONFIANZA

    return {
        "clase_predicha": clase_predicha,
        "confianza": confianza_ganadora,
        "probabilidades": resultados_clases,
        "imagen_valida": imagen_valida,
        "modo_demo": dummy_mode
    }

