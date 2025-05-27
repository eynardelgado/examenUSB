```javascript
// app.js

// --- 1. Simulación de Datos JSON (reemplazar con la carga de tu archivo JSON real) ---
// Este JSON simula el contenido de DB_derecho.xlsx - Hoja1.csv
// En una PWA real, este archivo JSON estaría en tu proyecto y lo cargarías con fetch().
const sampleQuestionsJSON = [
    {
        "ID_Pregunta": "1",
        "Tema": "Derecho Constitucional",
        "Texto_Pregunta": "¿Cuál es el principio fundamental que establece que nadie puede ser condenado sin un juicio previo?",
        "Opcion_A": "Principio de legalidad",
        "Opcion_B": "Debido proceso",
        "Opcion_C": "Igualdad ante la ley",
        "Opcion_D": "Irretroactividad de la ley",
        "Respuesta_Correcta_Letra": "B",
        "Justificacion_Respuesta": "El debido proceso garantiza que toda persona tenga derecho a ser oída y juzgada con las formalidades propias de un juicio antes de ser condenada."
    },
    {
        "ID_Pregunta": "2",
        "Tema": "Derecho Civil",
        "Texto_Pregunta": "¿Qué es un contrato de compraventa?",
        "Opcion_A": "Un acuerdo para prestar un servicio",
        "Opcion_B": "Un acuerdo donde una parte se obliga a dar una cosa y la otra a pagarla en dinero",
        "Opcion_C": "Un préstamo de dinero con intereses",
        "Opcion_D": "La cesión de derechos sobre un bien intangible",
        "Respuesta_Correcta_Letra": "B",
        "Justificacion_Respuesta": "El contrato de compraventa implica la transferencia de la propiedad de una cosa a cambio de un precio en dinero."
    },
    {
        "ID_Pregunta": "3",
        "Tema": "Derecho Penal",
        "Texto_Pregunta": "La tentativa ocurre cuando:",
        "Opcion_A": "Se consuma el delito completamente.",
        "Opcion_B": "El autor desiste voluntariamente de cometer el delito.",
        "Opcion_C": "Se inicia la ejecución del delito pero no se consuma por causas ajenas a la voluntad del autor.",
        "Opcion_D": "Se planea un delito pero no se ejecuta.",
        "Respuesta_Correcta_Letra": "C",
        "Justificacion_Respuesta": "La tentativa requiere el inicio de la ejecución del tipo penal, y que la consumación no se produzca por circunstancias externas al agente."
    },
    {
        "ID_Pregunta": "4",
        "Tema": "Derecho Laboral",
        "Texto_Pregunta": "¿Qué es el salario mínimo?",
        "Opcion_A": "El salario promedio de una industria.",
        "Opcion_B": "La remuneración más baja que legalmente puede recibir un trabajador por su jornada laboral.",
        "Opcion_C": "Un bono adicional por desempeño.",
        "Opcion_D": "El salario que se paga por horas extras.",
        "Respuesta_Correcta_Letra": "B",
        "Justificacion_Respuesta": "El salario mínimo es una garantía legal para asegurar un ingreso básico a los trabajadores."
    }
];

// --- 2. Configuración de Dexie.js (IndexedDB) ---
const db = new Dexie("EstudioDerechoDB");
db.version(1).stores({
    preguntasMultiples: `
        ++id, 
        id_original, 
        tema, 
        texto_pregunta, 
        opciones, 
        letra_respuesta_correcta, 
        justificacion, 
        hash_contenido, 
        veces_vista, 
        aciertos, 
        errores, 
        ultima_revision, 
        racha_actual_correctas
    `
});

// --- 3. Elementos del DOM ---
const loadingMessageEl = document.getElementById('loading-questions');
const questionAreaEl = document.getElementById('question-area');
const questionTopicEl = document.getElementById('question-topic');
const questionTextEl = document.getElementById('question-text');
const optionsContainerEl = document.getElementById('options-container');
const feedbackAreaEl = document.getElementById('feedback-area');
const feedbackTextEl = document.getElementById('feedback-text');
const justificationAreaEl = document.getElementById('justification-area');
const justificationTextEl = document.getElementById('justification-text');
const nextQuestionBtn = document.getElementById('next-question-btn');
const noMoreQuestionsEl = document.getElementById('no-more-questions');

// Navegación y Secciones
const studySection = document.getElementById('study-section');
const statsSection = document.getElementById('stats-section');
const settingsSection = document.getElementById('settings-section');
const btnStudy = document.getElementById('btn-study');
const btnStats = document.getElementById('btn-stats');
const btnSettings = document.getElementById('btn-settings');

// Estadísticas
const statsTotalEl = document.getElementById('stats-total');
const statsViewedEl = document.getElementById('stats-viewed');
const statsCorrectEl = document.getElementById('stats-correct');
const statsCorrectPercentageEl = document.getElementById('stats-correct-percentage');
const statsIncorrectEl = document.getElementById('stats-incorrect');
const statsIncorrectPercentageEl = document.getElementById('stats-incorrect-percentage');
const resetStatsBtn = document.getElementById('reset-stats-btn');
const forceReloadDataBtn = document.getElementById('force-reload-data-btn');


let currentQuestion = null;
let questionsAvailable = [];

// --- 4. Lógica de la Aplicación ---

// Función para simular un hash simple (para detectar cambios)
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
}

// Cargar y Poblar la Base de Datos
async function initializeDatabase() {
    loadingMessageEl.style.display = 'block';
    questionAreaEl.style.display = 'none';
    noMoreQuestionsEl.style.display = 'none';

    const count = await db.preguntasMultiples.count();
    if (count === 0) {
        console.log("Base de datos vacía, poblando con datos de ejemplo...");
        const preguntasParaGuardar = sampleQuestionsJSON.map(q => ({
            id_original: q.ID_Pregunta,
            tema: q.Tema,
            texto_pregunta: q.Texto_Pregunta,
            opciones: [
                { letra: "A", texto: q.Opcion_A },
                { letra: "B", texto: q.Opcion_B },
                { letra: "C", texto: q.Opcion_C },
                { letra: "D", texto: q.Opcion_D }
                // Añadir más opciones si es necesario (ej. Opcion_E)
            ].filter(opt => opt.texto && opt.texto.trim() !== ""), // Filtrar opciones vacías
            letra_respuesta_correcta: q.Respuesta_Correcta_Letra,
            justificacion: q.Justificacion_Respuesta,
            hash_contenido: simpleHash(q.Texto_Pregunta + q.Opcion_A + q.Opcion_B + q.Opcion_C + q.Opcion_D + q.Respuesta_Correcta_Letra),
            veces_vista: 0,
            aciertos: 0,
            errores: 0,
            ultima_revision: null,
            racha_actual_correctas: 0
        }));
        await db.preguntasMultiples.bulkAdd(preguntasParaGuardar);
        console.log(`${preguntasParaGuardar.length} preguntas guardadas.`);
    } else {
        console.log(`Base de datos ya contiene ${count} preguntas.`);
        // Lógica de actualización opcional (comparar hashes, etc.) podría ir aquí
    }
    await loadNextQuestion();
    await updateStatsDisplay();
}

async function forceReloadAndPopulate() {
    const confirmed = confirm("¿Estás seguro de que quieres borrar todo el progreso y recargar las preguntas? Esta acción no se puede deshacer.");
    if (confirmed) {
        console.log("Forzando recarga de datos...");
        await db.preguntasMultiples.clear(); // Borra todas las preguntas
        console.log("Base de datos borrada.");
        // Repoblar
        const preguntasParaGuardar = sampleQuestionsJSON.map(q => ({
            id_original: q.ID_Pregunta,
            tema: q.Tema,
            texto_pregunta: q.Texto_Pregunta,
            opciones: [
                { letra: "A", texto: q.Opcion_A },
                { letra: "B", texto: q.Opcion_B },
                { letra: "C", texto: q.Opcion_C },
                { letra: "D", texto: q.Opcion_D }
            ].filter(opt => opt.texto && opt.texto.trim() !== ""),
            letra_respuesta_correcta: q.Respuesta_Correcta_Letra,
            justificacion: q.Justificacion_Respuesta,
            hash_contenido: simpleHash(q.Texto_Pregunta + q.Opcion_A + q.Opcion_B + q.Opcion_C + q.Opcion_D + q.Respuesta_Correcta_Letra),
            veces_vista: 0,
            aciertos: 0,
            errores: 0,
            ultima_revision: null,
            racha_actual_correctas: 0
        }));
        await db.preguntasMultiples.bulkAdd(preguntasParaGuardar);
        console.log(`${preguntasParaGuardar.length} preguntas guardadas después de forzar recarga.`);
        
        currentQuestion = null; // Resetear pregunta actual
        await loadNextQuestion();
        await updateStatsDisplay();
        navigateTo('study'); // Volver a la pantalla de estudio
    }
}


// Algoritmo de Priorización (Simple para MVP)
async function getPrioritizedQuestion() {
    // 1. Preguntas nunca vistas
    let question = await db.preguntasMultiples.where('veces_vista').equals(0).first();
    if (question) return question;

    // 2. Preguntas con mayor tasa de error (errores / (aciertos + errores))
    //    o simplemente más errores si no hay aciertos.
    //    Para simplificar, tomaremos las que tienen más errores y han sido vistas.
    //    Un algoritmo más complejo consideraría la tasa y la recencia.
    const allViewedQuestions = await db.preguntasMultiples.where('veces_vista').above(0).toArray();
    if (allViewedQuestions.length === 0) return null; // No hay preguntas vistas para priorizar

    allViewedQuestions.sort((a, b) => {
        const rateA = a.aciertos + a.errores === 0 ? 0 : a.errores / (a.aciertos + a.errores);
        const rateB = b.aciertos + b.errores === 0 ? 0 : b.errores / (b.aciertos + b.errores);
        
        if (rateB !== rateA) {
            return rateB - rateA; // Mayor tasa de error primero
        }
        // Si la tasa de error es igual, priorizar la que se vio hace más tiempo
        return (a.ultima_revision || 0) - (b.ultima_revision || 0);
    });
    
    return allViewedQuestions[0];
}


async function loadNextQuestion() {
    currentQuestion = await getPrioritizedQuestion();

    if (currentQuestion) {
        displayQuestion(currentQuestion);
        loadingMessageEl.style.display = 'none';
        questionAreaEl.style.display = 'block';
        noMoreQuestionsEl.style.display = 'none';
    } else {
        loadingMessageEl.style.display = 'none';
        questionAreaEl.style.display = 'none';
        noMoreQuestionsEl.style.display = 'block';
        console.log("No hay más preguntas disponibles según el criterio actual.");
    }
    await updateStatsDisplay();
}

// Mostrar Pregunta
function displayQuestion(q) {
    questionTopicEl.textContent = q.tema || "General";
    questionTextEl.textContent = q.texto_pregunta;
    optionsContainerEl.innerHTML = ''; // Limpiar opciones anteriores

    q.opciones.forEach(opt => {
        const button = document.createElement('button');
        button.textContent = `${opt.letra}) ${opt.texto}`;
        button.dataset.letra = opt.letra;
        button.addEventListener('click', handleOptionSelect);
        optionsContainerEl.appendChild(button);
    });

    feedbackAreaEl.style.display = 'none';
    justificationAreaEl.style.display = 'none';
    nextQuestionBtn.style.display = 'none';
}

// Manejar Selección de Opción
async function handleOptionSelect(event) {
    if (!currentQuestion) return;

    const selectedLetra = event.target.dataset.letra;
    const isCorrect = selectedLetra === currentQuestion.letra_respuesta_correcta;

    // Deshabilitar todos los botones de opción
    Array.from(optionsContainerEl.children).forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.letra === currentQuestion.letra_respuesta_correcta) {
            btn.classList.add('correct');
        } else if (btn.dataset.letra === selectedLetra) {
            btn.classList.add('incorrect');
        }
    });
    
    // Mostrar feedback
    feedbackTextEl.textContent = isCorrect ? "¡Correcto!" : "Incorrecto.";
    feedbackAreaEl.className = isCorrect ? 'correct-feedback' : 'incorrect-feedback';
    feedbackAreaEl.style.display = 'block';

    justificationTextEl.textContent = currentQuestion.justificacion;
    justificationAreaEl.style.display = 'block';
    
    nextQuestionBtn.style.display = 'block';

    // Actualizar estadísticas en DB
    await db.preguntasMultiples.update(currentQuestion.id, {
        veces_vista: Dexie. spéciale.increment(1), // Usar Dexie.special.increment si es versión antigua, o simplemente +1 si Dexie lo maneja.
                                                // Para Dexie 3+, simplemente `currentQuestion.veces_vista + 1` en el objeto de actualización.
        aciertos: currentQuestion.aciertos + (isCorrect ? 1 : 0),
        errores: currentQuestion.errores + (isCorrect ? 0 : 1),
        ultima_revision: new Date(),
        racha_actual_correctas: isCorrect ? currentQuestion.racha_actual_correctas + 1 : 0
    });
    await updateStatsDisplay();
}

// Actualizar Estadísticas en Pantalla
async function updateStatsDisplay() {
    const total = await db.preguntasMultiples.count();
    const viewed = await db.preguntasMultiples.where('veces_vista').above(0).count();
    
    const allQuestions = await db.preguntasMultiples.toArray();
    const correctAnswers = allQuestions.reduce((sum, q) => sum + q.aciertos, 0);
    const incorrectAnswers = allQuestions.reduce((sum, q) => sum + q.errores, 0);
    const totalAnsweredInteractions = correctAnswers + incorrectAnswers;

    statsTotalEl.textContent = total;
    statsViewedEl.textContent = viewed;
    statsCorrectEl.textContent = correctAnswers;
    statsIncorrectEl.textContent = incorrectAnswers;

    const correctPercentage = totalAnsweredInteractions > 0 ? ((correctAnswers / totalAnsweredInteractions) * 100).toFixed(1) : 0;
    const incorrectPercentage = totalAnsweredInteractions > 0 ? ((incorrectAnswers / totalAnsweredInteractions) * 100).toFixed(1) : 0;
    
    statsCorrectPercentageEl.textContent = correctPercentage;
    statsIncorrectPercentageEl.textContent = incorrectPercentage;
}


// Navegación entre secciones
function navigateTo(sectionId) {
    studySection.classList.toggle('active-section', sectionId === 'study');
    studySection.classList.toggle('hidden-section', sectionId !== 'study');
    
    statsSection.classList.toggle('active-section', sectionId === 'stats');
    statsSection.classList.toggle('hidden-section', sectionId !== 'stats');

    settingsSection.classList.toggle('active-section', sectionId === 'settings');
    settingsSection.classList.toggle('hidden-section', sectionId !== 'settings');

    btnStudy.classList.toggle('active', sectionId === 'study');
    btnStats.classList.toggle('active', sectionId === 'stats');
    btnSettings.classList.toggle('active', sectionId === 'settings');

    if (sectionId === 'study' && !currentQuestion && questionAreaEl.style.display === 'none' && loadingMessageEl.style.display === 'none') {
        loadNextQuestion(); // Intentar cargar una pregunta si se navega a estudiar y no hay nada.
    }
    if (sectionId === 'stats') {
        updateStatsDisplay();
    }
}

// --- 5. Service Worker ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registrado con éxito:', registration.scope);
            })
            .catch(error => {
                console.log('Error al registrar ServiceWorker:', error);
            });
    });
}

// --- Event Listeners ---
nextQuestionBtn.addEventListener('click', loadNextQuestion);

btnStudy.addEventListener('click', () => navigateTo('study'));
btnStats.addEventListener('click', () => navigateTo('stats'));
btnSettings.addEventListener('click', () => navigateTo('settings'));

resetStatsBtn.addEventListener('click', async () => {
    const confirmed = confirm("¿Estás seguro de que quieres reiniciar TODAS las estadísticas y el progreso de las preguntas? Esta acción no se puede deshacer.");
    if (confirmed) {
        await db.preguntasMultiples.toCollection().modify({
            veces_vista: 0,
            aciertos: 0,
            errores: 0,
            ultima_revision: null,
            racha_actual_correctas: 0
        });
        currentQuestion = null; // Para forzar la recarga de una nueva pregunta
        await loadNextQuestion();
        await updateStatsDisplay();
        navigateTo('study');
        alert("Progreso y estadísticas reiniciados.");
    }
});

forceReloadDataBtn.addEventListener('click', forceReloadAndPopulate);


// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    initializeDatabase();
    navigateTo('study'); // Mostrar sección de estudio por defecto
});
```json
// manifest.json
{
    "name": "Estudio Examen de Grado Derecho",
    "short_name": "EstudioDerecho",
    "description": "PWA para estudiar para el examen de grado en Derecho con preguntas de opción múltiple.",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#4A90E2",
    "orientation": "portrait-primary",
    "icons": [
        {
            "src": "icons/icon-72x72.png",
            "sizes": "72x72",
            "type": "image/png"
        },
        {
            "src": "icons/icon-96x96.png",
            "sizes": "96x96",
            "type": "image/png"
        },
        {
            "src": "icons/icon-128x128.png",
            "sizes": "128x128",
            "type": "image/png"
        },
        {
            "src": "icons/icon-144x144.png",
            "sizes": "144x144",
            "type": "image/png"
        },
        {
            "src": "icons/icon-152x152.png",
            "sizes": "152x152",
            "type": "image/png"
        },
        {
            "src": "icons/icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
        },
        {
            "src": "icons/icon-384x384.png",
            "sizes": "384x384",
            "type": "image/png"
        },
        {
            "src": "icons/icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ]
}
