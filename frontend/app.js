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
    exportPdfBtn.addEventListener('click', () => {
        if (!selectedFile) return;

        // 1. Construir el HTML como un string con estilos inline (sin depender del DOM visible)
        const imgSrc = imagePreview.src;
        const gemName = winnerClass.textContent;
        const confidence = winnerPercent.textContent;
        const description = gemDescText.textContent;
        
        const htmlContent = `
            <div style="width: 800px; padding: 30px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #ffffff; color: #111111; box-sizing: border-box;">
                <div style="text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="color: #1a1a1a; font-size: 24px; margin: 0;">Certificado de Clasificación Mineralógica</h2>
                </div>
                
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="${imgSrc}" style="max-width: 250px; max-height: 180px; border-radius: 8px; border: 1px solid #dddddd; object-fit: contain;" alt="Gema" />
                </div>
                
                <div style="text-align: center; margin-bottom: 20px;">
                    <h3 style="font-size: 14px; color: #888888; text-transform: uppercase; margin: 0 0 5px 0;">Identificación Principal</h3>
                    <p style="font-size: 26px; font-weight: 700; color: #0a0908; margin: 0 0 5px 0; text-transform: capitalize;">${gemName}</p>
                    <p style="font-size: 14px; color: #444444; margin: 0;">Confianza de IA: <span style="font-weight: 700; color: #10b981;">${confidence}</span></p>
                </div>

                ${description ? `
                <div style="background: #f9f9f9; padding: 15px 20px; border-radius: 8px; border-left: 4px solid #d4af37; font-size: 12px; line-height: 1.5; color: #333333; margin-bottom: 15px;">
                    <h4 style="margin-top: 0; margin-bottom: 8px; color: #1a1a1a;">Análisis Detallado</h4>
                    <div style="white-space: pre-wrap;">${description}</div>
                </div>` : ''}
                
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eeeeee; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #999999;">
                    <p style="margin: 0; max-width: 70%;">Generado automáticamente. Este documento no reemplaza el análisis de un gemólogo certificado.</p>
                    <div style="border: 2px solid #d4af37; color: #d4af37; padding: 8px 12px; border-radius: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Sello IA</div>
                </div>
            </div>
        `;

        // 2. Opciones de html2pdf
        const opt = {
            margin:       0.5,
            filename:     `Certificado_${gemName}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
            pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
        };

        // 3. Generar directamente desde el string HTML (esto evita que toque la pantalla o el DOM actual)
        html2pdf().set(opt).from(htmlContent).save();
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
