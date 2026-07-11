document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // MOTOR DE SONIDO DINÁMICO (AudioContext)
    // ==========================================
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    const SoundEngine = {
        playPop: () => {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        },
        playSuccess: () => {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => { // C mayor arpegio
                setTimeout(() => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.5);
                }, i * 100);
            });
        },
        playError: () => {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        }
    };

    // Referencias al DOM
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const dropzoneContent = document.getElementById('dropzone-content');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const removeBtn = document.getElementById('removeBtn');
    const classifyBtn = document.getElementById('classifyBtn');
    
    const resultSection = document.getElementById('result-section');
    const loader = document.getElementById('loader');
    const resultsContent = document.getElementById('results-content');
    
    const winnerClass = document.getElementById('winner-class');
    const winnerCircle = document.getElementById('winner-circle');
    const winnerPercent = document.getElementById('winner-percent');
    const barsContainer = document.getElementById('bars-container');
    const demoBanner = document.getElementById('demo-banner');

    let selectedFile = null;

    // 1. Verificar el estado del backend al cargar la página
    verificarEstadoBackend();

    // 2. Drag & Drop Eventos
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // 3. Procesar Archivo Seleccionado
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecciona un archivo de imagen válido (JPG, PNG, WEBP).');
            return;
        }

        SoundEngine.playPop(); // Feedback sonoro al soltar foto

        // Validación de tamaño: máximo 5 MB
        const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
        if (file.size > MAX_BYTES) {
            alert(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)} MB). El límite máximo es 5 MB.`);
            fileInput.value = '';
            return;
        }

        selectedFile = file;
        
        // Mostrar previsualización
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            dropzoneContent.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            
            // Activar botón de clasificar
            classifyBtn.classList.remove('disabled');
            classifyBtn.removeAttribute('disabled');
        };
        reader.readAsDataURL(file);
    }

    // 4. Quitar Imagen Seleccionada
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Evitar que el clic abra el explorador de archivos
        resetState();
    });

    function resetState() {
        selectedFile = null;
        fileInput.value = '';
        imagePreview.src = '#';
        
        previewContainer.classList.add('hidden');
        dropzoneContent.classList.remove('hidden');
        
        classifyBtn.classList.add('disabled');
        classifyBtn.setAttribute('disabled', 'true');
        
        resultSection.classList.add('hidden');
        resultsContent.classList.add('hidden');
        invalidImageCard.classList.add('hidden');
        gemDescContainer.classList.add('hidden');
        exportPdfBtn.classList.add('hidden');
    }

    // Referencias para validación e UI extendida
    const invalidImageCard = document.getElementById('invalid-image-card');
    const retryBtn = document.getElementById('retryBtn');
    const gemDescContainer = document.getElementById('gem-description-container');
    const gemDescText = document.getElementById('gem-description-text');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    retryBtn.addEventListener('click', () => {
        resetState();
    });

    // 5. Enviar Imagen a Clasificar
    classifyBtn.addEventListener('click', async () => {
        if (!selectedFile) return;
        
        SoundEngine.playPop(); // Sonido al hacer clic

        // Mostrar cargador y ocultar resultados anteriores
        resultSection.classList.remove('hidden');
        loader.classList.remove('hidden');
        resultsContent.classList.add('hidden');
        invalidImageCard.classList.add('hidden');

        // Hacer scroll suave hacia los resultados
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error al procesar la imagen');
            }

            const data = await response.json();
            mostrarResultados(data);

        } catch (error) {
            console.error('Error:', error);
            SoundEngine.playError();
            alert(`Hubo un problema al procesar la clasificación: ${error.message}`);
            loader.classList.add('hidden');
            resultSection.classList.add('hidden');
        }
    });

    // 6. Mostrar Resultados en Pantalla
    function mostrarResultados(data) {
        loader.classList.add('hidden');

        // Si la imagen no es válida (confianza muy baja), mostrar error
        if (!data.imagen_valida) {
            SoundEngine.playError();
            invalidImageCard.classList.remove('hidden');
            
            // Animación shake
            invalidImageCard.classList.remove('shake');
            void invalidImageCard.offsetWidth; // Reflow
            invalidImageCard.classList.add('shake');
            
            resultsContent.classList.add('hidden');
            exportPdfBtn.classList.add('hidden');
            return;
        }

        SoundEngine.playSuccess(); // Sonido mágico

        invalidImageCard.classList.add('hidden');
        resultsContent.classList.remove('hidden');
        exportPdfBtn.classList.remove('hidden');

        // Configurar clase ganadora
        const porcentajeGanador = Math.round(data.confianza * 100);
        winnerClass.textContent = data.clase_predicha;
        winnerPercent.textContent = `${porcentajeGanador}%`;
        
        // Animación radial SVG (la circunferencia del círculo de radio 15.9155 es 100)
        winnerCircle.setAttribute('stroke-dasharray', `${porcentajeGanador}, 100`);

        // Mostrar descripción si está disponible
        if (data.descripcion) {
            gemDescText.textContent = data.descripcion;
            gemDescContainer.classList.remove('hidden');
        } else {
            gemDescContainer.classList.add('hidden');
        }

        // Renderizar las barras de probabilidad (Solo el top 5)
        barsContainer.innerHTML = '';
        data.probabilidades.slice(0, 5).forEach(item => {
            const percent = Math.round(item.probabilidad * 100);
            
            const barRow = document.createElement('div');
            barRow.className = 'bar-row';
            barRow.innerHTML = `
                <div class="bar-label-group">
                    <span class="bar-class-name">${item.clase}</span>
                    <span class="bar-percentage">${percent}%</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill" style="width: 0%"></div>
                </div>
            `;
            
            barsContainer.appendChild(barRow);
            
            // Animación suave de llenado
            setTimeout(() => {
                const fill = barRow.querySelector('.bar-fill');
                if (fill) fill.style.width = `${percent}%`;
            }, 100);
        });

        // Verificar si seguimos en modo demo
        if (data.modo_demo) {
            demoBanner.classList.remove('hidden');
        } else {
            demoBanner.classList.add('hidden');
        }
    }

    // 7. Petición para verificar estado del modelo
    async function verificarEstadoBackend() {
        try {
            const response = await fetch('/api/status');
            if (response.ok) {
                const data = await response.json();
                if (data.modo_demo) {
                    demoBanner.classList.remove('hidden');
                } else {
                    demoBanner.classList.add('hidden');
                    console.log(`[OK] Backend conectado con ${data.num_clases} clases.`);
                }
            }
        } catch (error) {
            console.warn('[AVISO] No se pudo conectar con el backend. Levantando en modo local desconectado.', error);
        }
    }

    // ==========================================
    // LÓGICA DEL CHATBOT (GEMINI API)
    // ==========================================
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    const chatWindow = document.getElementById('chatWindow');
    const chatCloseBtn = document.getElementById('chatCloseBtn');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatBadge = document.getElementById('chatBadge');

    let chatHistory = [];

    // Abrir/Cerrar Chat
    chatToggleBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        chatBadge.classList.add('hidden'); // Ocultar notificación al abrir
        if (!chatWindow.classList.contains('hidden')) {
            chatInput.focus();
            scrollChatToBottom();
        }
    });

    chatCloseBtn.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });

    // Enviar mensaje al hacer clic en el botón
    chatSendBtn.addEventListener('click', enviarMensaje);

    // Enviar mensaje al presionar Enter
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            enviarMensaje();
        }
    });

    async function enviarMensaje() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Limpiar input
        chatInput.value = '';

        // 1. Agregar y renderizar mensaje del usuario
        agregarMensaje('user', text);
        
        // 2. Mostrar indicador de escritura
        const typingIndicator = mostrarIndicadorEscritura();
        scrollChatToBottom();

        try {
            // 3. Enviar consulta a la API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: text,
                    history: chatHistory
                })
            });

            // Eliminar indicador de escritura
            typingIndicator.remove();

            if (!response.ok) {
                throw new Error('Error al conectar con la API de Chat');
            }

            const data = await response.json();
            
            // 4. Agregar y renderizar mensaje del bot
            agregarMensaje('model', data.response);

            // Guardar en el historial de la conversación local (Gemini API espera 'user' y 'model')
            chatHistory.push({ role: 'user', text: text });
            chatHistory.push({ role: 'model', text: data.response });

            // Mantener historial acotado a los últimos 10 mensajes para ahorrar tokens
            if (chatHistory.length > 20) {
                chatHistory = chatHistory.slice(-20);
            }

            // Notificación si la ventana está cerrada
            if (chatWindow.classList.contains('hidden')) {
                chatBadge.classList.remove('hidden');
            }

        } catch (error) {
            console.error('Error del Chat:', error);
            typingIndicator.remove();
            agregarMensaje('model', '⚠️ Lo siento, ocurrió un error en la conexión. Por favor verifica que el servidor esté activo y la API Key configurada.');
        }

        scrollChatToBottom();
    }

    function agregarMensaje(role, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${role === 'user' ? 'user' : 'bot'}`;
        
        // Renderizar Markdown solo para el bot si marked está disponible
        if (role === 'model' && typeof marked !== 'undefined') {
            messageDiv.innerHTML = marked.parse(text);
        } else {
            messageDiv.textContent = text;
        }
        
        chatMessages.appendChild(messageDiv);
    }

    function mostrarIndicadorEscritura() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        `;
        chatMessages.appendChild(indicator);
        return indicator;
    }

    function scrollChatToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // ==========================================
    // LÓGICA DE EXPORTACIÓN PDF
    // ==========================================
    // LÓGICA DE EXPORTACIÓN PDF (Vectorial con jsPDF y Paginación)
    // ==========================================
    exportPdfBtn.addEventListener('click', () => {
        // 1. Obtener datos (no requiere selectedFile obligatorio, solo que la imagen esté en pantalla)
        const imgSrc = imagePreview.src;
        const gemName = winnerClass.textContent;
        const confidence = winnerPercent.textContent;
        const description = gemDescText.textContent;
        
        if (!imgSrc || imgSrc === '#' || gemName === '-') {
            alert("No hay resultados listos para exportar.");
            return;
        }

        // 2. Crear contenedor temporal para renderizar (Detrás de la app principal)
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '0';
        tempContainer.style.top = '0';
        tempContainer.style.zIndex = '-1000';
        tempContainer.style.width = '700px';
        tempContainer.style.background = '#ffffff';
        tempContainer.style.color = '#111111';
        tempContainer.style.fontFamily = "'Outfit', 'Segoe UI', Tahoma, sans-serif";
        tempContainer.style.padding = '40px';
        tempContainer.style.boxSizing = 'border-box';
        
        // Estilo de Certificado Fino con marcos y tipografías impecables
        tempContainer.innerHTML = `
            <div style="border: 6px double #d4af37; padding: 30px; border-radius: 8px; background: #ffffff; text-align: center; box-sizing: border-box;">
                <div style="border-bottom: 2px solid #d4af37; padding-bottom: 15px; margin-bottom: 30px;">
                    <h2 style="color: #1a1a1a; font-size: 26px; margin: 0 0 5px 0; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Certificado de Clasificación</h2>
                    <p style="color: #888888; font-size: 11px; margin: 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">NeuralVision GemMiner • Inteligencia Artificial</p>
                </div>
                
                <div style="margin-bottom: 30px; display: flex; justify-content: center; align-items: center;">
                    <img src="${imgSrc}" style="max-width: 360px; max-height: 270px; border-radius: 12px; border: 2px solid #eeeeee; box-shadow: 0 6px 15px rgba(0,0,0,0.05); object-fit: contain; background: #fafafa;" alt="Gema" />
                </div>
                
                <div style="margin-bottom: 30px;">
                    <h3 style="font-size: 13px; color: #888888; text-transform: uppercase; margin: 0 0 5px 0; letter-spacing: 1.5px; font-weight: 600;">Identificación Principal</h3>
                    <p style="font-size: 34px; font-weight: 800; color: #0a0908; margin: 0 0 5px 0; text-transform: capitalize; letter-spacing: 0.5px;">${gemName}</p>
                    <p style="font-size: 16px; color: #444444; margin: 0; font-weight: 500;">Confianza de IA: <span style="font-weight: 800; color: #10b981;">${confidence}</span></p>
                </div>

                ${description ? `
                <div style="background: #f9f9f9; padding: 22px 26px; border-radius: 8px; border-left: 5px solid #d4af37; font-size: 13.5px; line-height: 1.6; color: #333333; text-align: left; margin-bottom: 30px; box-sizing: border-box;">
                    <h4 style="margin-top: 0; margin-bottom: 8px; color: #1a1a1a; font-size: 15px; font-weight: 700;">Análisis Detallado</h4>
                    <p style="margin: 0; white-space: pre-wrap; font-weight: 400;">${description}</p>
                </div>` : ''}
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee; display: flex; justify-content: space-between; align-items: center; text-align: left; box-sizing: border-box;">
                    <div style="max-width: 70%;">
                        <p style="margin: 0; font-size: 10px; color: #999999; line-height: 1.4; font-weight: 400;">Este documento electrónico representa una predicción automatizada realizada en tiempo real por una red neuronal convolucional (ResNet34) y enriquecida con análisis semántico. Este certificado digital tiene un propósito de estudio y no sustituye un dictamen profesional.</p>
                    </div>
                    <div style="border: 2px solid #d4af37; color: #d4af37; padding: 8px 16px; border-radius: 4px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; white-space: nowrap; background: #fffcf0; box-shadow: 0 2px 5px rgba(212,175,55,0.1);">Sello IA</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(tempContainer);

        const tempImg = tempContainer.querySelector('img');
        
        // Función principal de captura
        const ejecutarCaptura = (clazz) => {
            clazz(tempContainer, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            }).then(canvas => {
                const imgData = canvas.toDataURL("image/jpeg", 0.95);
                const link = document.createElement('a');
                link.href = imgData;
                link.download = `Certificado_${gemName.replace(/\s+/g, '_')}.jpg`;
                link.click();
                document.body.removeChild(tempContainer);
            }).catch(err => {
                console.error("Error al generar la imagen del certificado:", err);
                document.body.removeChild(tempContainer);
                alert("No se pudo generar el archivo JPG: " + err.message);
            });
        };

        // Orquestar carga de la librería html2canvas
        const iniciarProceso = () => {
            const html2canvasClazz = window.html2canvas || (typeof html2canvas !== 'undefined' ? html2canvas : null);
            
            if (!html2canvasClazz) {
                // Cargar dinámicamente si no está en el objeto global
                const script = document.createElement('script');
                script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
                script.onload = () => {
                    setTimeout(() => ejecutarCaptura(window.html2canvas), 150);
                };
                script.onerror = () => {
                    document.body.removeChild(tempContainer);
                    alert("No se pudo cargar la librería de conversión de imagen desde el servidor CDN.");
                };
                document.head.appendChild(script);
            } else {
                setTimeout(() => ejecutarCaptura(html2canvasClazz), 150);
            }
        };

        // Esperar a que la imagen esté lista en memoria
        if (tempImg.complete) {
            iniciarProceso();
        } else {
            tempImg.onload = iniciarProceso;
            tempImg.onerror = iniciarProceso;
        }
    });

    // ==========================================
    // LÓGICA DE LA CÁMARA (WEBRTC)
    // ==========================================
    const openCameraBtn = document.getElementById('openCameraBtn');
    const cameraModal = document.getElementById('cameraModal');
    const closeCameraBtn = document.getElementById('closeCameraBtn');
    const captureBtn = document.getElementById('captureBtn');
    const cameraVideo = document.getElementById('cameraVideo');
    const cameraCanvas = document.getElementById('cameraCanvas');

    let cameraStream = null;

    openCameraBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Evita abrir el selector de archivos
        
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            cameraVideo.srcObject = cameraStream;
            cameraModal.classList.remove('hidden');
        } catch (err) {
            console.error("Error accediendo a la cámara:", err);
            alert("No se pudo acceder a la cámara. Asegúrate de dar permisos en tu navegador.");
        }
    });

    function detenerCamara() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        cameraModal.classList.add('hidden');
    }

    closeCameraBtn.addEventListener('click', detenerCamara);

    captureBtn.addEventListener('click', () => {
        if (!cameraStream) return;

        // Dibujar el frame del video en el canvas
        cameraCanvas.width = cameraVideo.videoWidth;
        cameraCanvas.height = cameraVideo.videoHeight;
        const ctx = cameraCanvas.getContext('2d');
        ctx.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);

        // Convertir canvas a Blob (Archivo JPEG)
        cameraCanvas.toBlob((blob) => {
            const file = new File([blob], "captura_gema.jpg", { type: "image/jpeg" });
            detenerCamara();
            // Inyectar en el flujo normal
            handleFile(file);
        }, 'image/jpeg', 0.95);
    });

});
