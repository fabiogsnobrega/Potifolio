
const computerContainer = document.querySelector("#computer-container");
const themisContainer = document.querySelector("#themis-container");
const gearContainer = document.querySelector("#gear-container");

const button = document.querySelector("#transition-button");
const status = document.querySelector("#status");
const automaticMode = document.querySelector(".transition-lab-widget")?.dataset.mode === "automatic";
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

const SVG_NS = "http://www.w3.org/2000/svg";
const DURATION = 2200;

let animating = false;
let currentState = 0;
let gearRoundTripComplete = false;

// Estados:
// 0 = Computador
// 1 = Têmis
// 2 = Engrenagem

// ================================================
// COMPONENTES DO COMPUTADOR
// ================================================

let keyboardBody;
let keyboardKeys;
let monitor;
let standNeck;
let standBase;
let monitorFrameGroup;
let monitorMorphPath;

let originalPath;
let destinationPath;

let monitorSourcePoints;
let monitorTargetPoints;

// ================================================
// COMPONENTES DE TÊMIS
// ================================================

let themisHead;
let themisBody;
let themisScale;
let pedestalTop;
let pedestalBase;

// ================================================
// COMPONENTES DA ENGRENAGEM
// ================================================

let gearSVG;
let gearGroup;
let gearBody;
let gearRing;
let gearOpenings;
let gearHub;
let gearAxle;
let gearHole;

let gearMorphPath;
let gearSourcePoints;
let gearTargetPoints;

// A engrenagem tem viewBox 400 x 400.
// Normalizamos para 400 x 300 e alinhamos seu centro
// ao centro aproximado do vestido.

const GEAR_SCALE = 0.75;
const GEAR_OFFSET_X = 53.75;
const GEAR_OFFSET_Y = -34.5;

// ================================================
// GEOMETRIAS DE REFERÊNCIA
// ================================================

const MONITOR_SOURCE_PATH = `
M 92 35
H 308
Q 320 35 320 47
V 193
Q 320 205 308 205
H 92
Q 80 205 80 193
V 47
Q 80 35 92 35
Z
`;

const DRESS_TARGET_PATH = `
M 185 66
L 215 66
L 237.5 165
C 215 187.5, 185 187.5, 162.5 165
Z
`;

const TARGET_PATH = `
M 137 202.5
H 263
Q 267.5 202.5 267.5 207
V 216
Q 267.5 220.5 263 220.5
H 137
Q 132.5 220.5 132.5 216
V 207
Q 132.5 202.5 137 202.5
Z
`;


// ================================================
// 1. CARREGAMENTO DOS SVGs
// ================================================

async function loadSVG(path, container) {
    const assetName = path.split("/").pop().replace(/\.svg$/i, "");
    const source = window.TRANSITION_LAB_SVGS?.[assetName];

    if (!source) {
        throw new Error(`SVG embutido não encontrado: ${path}`);
    }

    const parsed = new DOMParser().parseFromString(
        source,
        "image/svg+xml"
    );

    if (parsed.querySelector("parsererror")) {
        throw new Error(`SVG inválido: ${path}`);
    }

    const svg = document.importNode(
        parsed.documentElement,
        true
    );

    container.replaceChildren(svg);

    return svg;
}


// ================================================
// 2. FUNÇÕES GEOMÉTRICAS
// ================================================

function interpolatePath(pathA, pathB, progress) {
    const numbersA = pathA.match(/-?\d*\.?\d+/g).map(Number);
    const numbersB = pathB.match(/-?\d*\.?\d+/g).map(Number);

    if (numbersA.length !== numbersB.length) {
        throw new Error(
            "Os paths não possuem a mesma quantidade de coordenadas."
        );
    }

    let index = 0;

    return pathA.replace(/-?\d*\.?\d+/g, () => {
        const value =
            numbersA[index] +
            (numbersB[index] - numbersA[index]) * progress;

        index++;

        return Number(value.toFixed(3));
    });
}


function samplePath(svg, pathData, count = 80) {
    const path = document.createElementNS(SVG_NS, "path");

    path.setAttribute("d", pathData);
    svg.appendChild(path);

    const length = path.getTotalLength();
    const points = [];

    for (let i = 0; i < count; i++) {
        const point = path.getPointAtLength(
            (length * i) / count
        );

        points.push({
            x: point.x,
            y: point.y
        });
    }

    path.remove();

    return points;
}


function interpolatePoints(pointsA, pointsB, progress) {
    return pointsA.map((point, index) => {
        const x =
            point.x + (pointsB[index].x - point.x) * progress;

        const y =
            point.y + (pointsB[index].y - point.y) * progress;

        return `${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" L ");
}


function normalizeGearPoint(point) {
    return {
        x: point.x * GEAR_SCALE + GEAR_OFFSET_X,
        y: point.y * GEAR_SCALE + GEAR_OFFSET_Y
    };
}


// Ajusta o ponto inicial de dois contornos fechados.
// Evita que a interpolação comece em posições incompatíveis.

function alignClosedPoints(source, target) {
    let bestShift = 0;
    let bestScore = Infinity;

    for (let shift = 0; shift < target.length; shift++) {
        let score = 0;

        for (let i = 0; i < source.length; i++) {
            const targetPoint = target[
                (i + shift) % target.length
            ];

            const dx = source[i].x - targetPoint.x;
            const dy = source[i].y - targetPoint.y;

            score += dx * dx + dy * dy;
        }

        if (score < bestScore) {
            bestScore = score;
            bestShift = shift;
        }
    }

    return target.map((_, index) => {
        return target[(index + bestShift) % target.length];
    });
}


function interpolateColor(colorA, colorB, progress) {
    const a = colorA.match(/[0-9a-f]{2}/gi).map(
        value => parseInt(value, 16)
    );

    const b = colorB.match(/[0-9a-f]{2}/gi).map(
        value => parseInt(value, 16)
    );

    const result = a.map((value, index) => {
        return Math.round(
            value + (b[index] - value) * progress
        );
    });

    return "#" + result.map(
        value => value.toString(16).padStart(2, "0")
    ).join("");
}


// ================================================
// 3. FUNÇÕES DE ANIMAÇÃO
// ================================================

function easeInOut(progress) {
    return progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}


function ramp(progress, start, end) {
    return Math.max(
        0,
        Math.min(1, (progress - start) / (end - start))
    );
}


function fade(element, progress, start, end, reverse = false) {
    const value = ramp(progress, start, end);

    element.style.opacity = reverse
        ? 1 - value
        : value;
}


// ================================================
// 4. PREPARAÇÃO DO COMPUTADOR E DE TÊMIS
// ================================================

function prepareComponents(computerSVG, themisSVG) {

    // Computador
    keyboardBody = computerSVG.querySelector("#keyboard-body path");
    keyboardKeys = computerSVG.querySelector("#keyboard-keys");

    monitor = computerSVG.querySelector("#monitor");
    monitorFrameGroup = computerSVG.querySelector("#monitor-frame");

    standNeck = computerSVG.querySelector("#stand-neck");
    standBase = computerSVG.querySelector("#stand-base");

    // Têmis
    themisHead = themisSVG.querySelector("#head");
    themisBody = themisSVG.querySelector("#body");
    themisScale = themisSVG.querySelector("#scale-and-arms");

    pedestalTop = themisSVG.querySelector("#pedestal path");
    pedestalBase = themisSVG.querySelector("#pedestal rect");

    const components = [
        keyboardBody,
        keyboardKeys,
        monitor,
        monitorFrameGroup,
        standNeck,
        standBase,
        themisHead,
        themisBody,
        themisScale,
        pedestalTop,
        pedestalBase
    ];

    if (components.some(component => !component)) {
        throw new Error(
            "Não foi possível localizar todos os componentes do computador e de Têmis."
        );
    }

    // Teclado → pedestal
    originalPath = keyboardBody.getAttribute("d");
    destinationPath = TARGET_PATH;

    interpolatePath(originalPath, destinationPath, 0);

    // Monitor → vestido
    monitorSourcePoints = samplePath(
        computerSVG,
        MONITOR_SOURCE_PATH
    );

    monitorTargetPoints = samplePath(
        computerSVG,
        DRESS_TARGET_PATH
    );

    monitorMorphPath = document.createElementNS(
        SVG_NS,
        "path"
    );

    monitorMorphPath.setAttribute(
        "d",
        `M ${interpolatePoints(
            monitorSourcePoints,
            monitorSourcePoints,
            0
        )} Z`
    );

    monitorMorphPath.setAttribute("fill", "#F3EFE6");
    monitorMorphPath.setAttribute("stroke", "#263D50");
    monitorMorphPath.setAttribute("stroke-width", "5");
    monitorMorphPath.setAttribute("stroke-linejoin", "round");

    // O path fica dentro do grupo da moldura.
    // A tela continua acima dele na ordem de desenho.
    monitorFrameGroup.appendChild(monitorMorphPath);

    // Oculta a moldura original.
    const originalFrame = monitorFrameGroup.querySelector("rect");

    if (originalFrame) {
        originalFrame.style.opacity = 0;
    }

    // Estado inicial de Têmis.
    [
        themisHead,
        themisBody,
        themisScale,
        pedestalTop,
        pedestalBase
    ].forEach(element => {
        element.style.opacity = 0;
    });

    // Estado inicial do computador.
    [
        monitor,
        standNeck,
        standBase,
        keyboardKeys
    ].forEach(element => {
        element.style.opacity = 1;
    });

    keyboardBody.style.opacity = 1;
    monitorMorphPath.style.opacity = 1;
}


// ================================================
// 5. PREPARAÇÃO DA ENGRENAGEM
// ================================================

function prepareGear(gearSVG, themisSVG) {

    gearGroup = gearSVG.querySelector("#gear-complete-centered");

    if (!gearGroup) {
        throw new Error("Grupo principal da engrenagem não encontrado.");
    }

    gearBody = gearGroup.querySelector("#gear-body");

    // Os círculos são filhos diretos do grupo.
    // nth-of-type conta apenas elementos circle.
    gearRing = gearGroup.querySelector(":scope > circle:nth-of-type(1)");

    gearOpenings = gearGroup.querySelector(":scope > g");

    gearHub = gearGroup.querySelector(":scope > circle:nth-of-type(2)");

    gearAxle = gearGroup.querySelector(":scope > circle:nth-of-type(3)");

    gearHole = gearGroup.querySelector(":scope > circle:nth-of-type(4)");

    const components = [
        gearBody,
        gearRing,
        gearOpenings,
        gearHub,
        gearAxle,
        gearHole
    ];

    if (components.some(component => !component)) {
        throw new Error(
            "Não foi possível localizar todos os elementos da engrenagem."
        );
    }

    // Ajusta a área de desenho para o mesmo espaço dos outros SVGs.
    gearSVG.setAttribute("viewBox", "0 0 400 300");

    // Aplica a transformação ao grupo completo.
    gearGroup.setAttribute(
        "transform",
        `translate(${GEAR_OFFSET_X} ${GEAR_OFFSET_Y}) scale(${GEAR_SCALE})`
    );

    // Contorno de origem: vestido.
    gearSourcePoints = samplePath(
        themisSVG,
        DRESS_TARGET_PATH
    );

    // Contorno de destino: corpo da engrenagem.
    // O path é amostrado sem o transform do grupo.
    const rawGearPoints = samplePath(
        gearSVG,
        gearBody.getAttribute("d")
    );

    gearTargetPoints = rawGearPoints.map(
        normalizeGearPoint
    );

    // Ajusta a correspondência dos pontos.
    gearTargetPoints = alignClosedPoints(
        gearSourcePoints,
        gearTargetPoints
    );

    // Path temporário para a transformação.
    gearMorphPath = document.createElementNS(
        SVG_NS,
        "path"
    );

    gearMorphPath.setAttribute(
        "d",
        `M ${interpolatePoints(
            gearSourcePoints,
            gearSourcePoints,
            0
        )} Z`
    );

    gearMorphPath.setAttribute("fill", "#B9C9D0");
    gearMorphPath.setAttribute("stroke", "#263D50");
    gearMorphPath.setAttribute("stroke-width", "5");
    gearMorphPath.setAttribute("stroke-linejoin", "round");

    // O path usa coordenadas normalizadas para o viewBox da engrenagem.
    // Fica acima do grupo original para aparecer durante o retorno,
    // enquanto o corpo da engrenagem perde opacidade.
    gearSVG.appendChild(gearMorphPath);

    // Todos os elementos da engrenagem começam invisíveis.
    components.forEach(element => {
        element.style.opacity = 0;
    });

    gearMorphPath.style.opacity = 0;
}


// ================================================
// 6. MORPHING DO MONITOR
// ================================================

function animateMonitorMorph(eased, reverse) {

    const progress = ramp(eased, 0.12, 0.82);

    const points = interpolatePoints(
        reverse ? monitorTargetPoints : monitorSourcePoints,
        reverse ? monitorSourcePoints : monitorTargetPoints,
        progress
    );

    monitorMorphPath.setAttribute(
        "d",
        `M ${points} Z`
    );

    monitorMorphPath.setAttribute(
        "fill",
        interpolateColor(
            reverse ? "#B9C9D0" : "#F3EFE6",
            reverse ? "#F3EFE6" : "#B9C9D0",
            progress
        )
    );

    fade(
        monitorMorphPath,
        eased,
        0.82,
        1,
        !reverse
    );
}


// ================================================
// 7. COMPUTADOR → TÊMIS
// ================================================

function animateTransformation(reverse = false) {

    if (animating) return;

    animating = true;
    if (button) button.disabled = true;

    const startTime = performance.now();

    const fromPath = reverse
        ? destinationPath
        : originalPath;

    const toPath = reverse
        ? originalPath
        : destinationPath;

    // Prepara corretamente a geometria na volta.
    if (reverse) {
        keyboardBody.setAttribute("d", destinationPath);
        keyboardBody.style.opacity = 1;
        pedestalBase.style.opacity = 0;
    }

    function frame(currentTime) {

        const progress = Math.min(
            (currentTime - startTime) / DURATION,
            1
        );

        const eased = easeInOut(progress);

        // Teclado → pedestal
        const morphProgress = ramp(eased, 0.12, 0.88);

        keyboardBody.setAttribute(
            "d",
            interpolatePath(
                fromPath,
                toPath,
                morphProgress
            )
        );

        // Monitor → vestido
        animateMonitorMorph(eased, reverse);

        // Saída do computador
        fade(monitor, eased, 0, 0.38, !reverse);
        fade(standNeck, eased, 0.05, 0.32, !reverse);
        fade(standBase, eased, 0.05, 0.32, !reverse);
        fade(keyboardKeys, eased, 0, 0.22, !reverse);

        // Formação de Têmis
        fade(pedestalTop, eased, 0.28, 0.58, reverse);
        fade(themisBody, eased, 0.82, 0.96, reverse);
        fade(themisScale, eased, 0.48, 0.82, reverse);
        fade(themisHead, eased, 0.65, 0.92, reverse);

        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {

            if (reverse) {
                keyboardBody.setAttribute("d", originalPath);
                keyboardBody.style.opacity = 1;
                pedestalBase.style.opacity = 0;
            } else {
                keyboardBody.style.opacity = 0;
                pedestalBase.style.opacity = 1;
            }

            currentState = reverse ? 0 : 1;

            if (reverse) {
                gearRoundTripComplete = false;
            }

            animating = false;
            if (button) {
                button.disabled = false;
                button.textContent = currentState === 1
                    ? "Transformar em engrenagem"
                    : "Iniciar transformação";
            }

            if (status) {
                status.textContent = currentState === 1
                    ? "Computador transformado em Têmis."
                    : "Computador restaurado.";
            }

            scheduleAutomaticTransition();
        }
    }

    requestAnimationFrame(frame);
}


// ================================================
// 8. TÊMIS → ENGRENAGEM E RETORNO
// ================================================

function animateGearTransformation(reverse = false) {

    if (animating) return;

    animating = true;
    if (button) button.disabled = true;

    const startTime = performance.now();

    // Na ida, começa no vestido.
    // Na volta, começa no contorno da engrenagem.
    if (reverse) {
        gearMorphPath.setAttribute(
            "d",
            `M ${interpolatePoints(
                gearTargetPoints,
                gearTargetPoints,
                0
            )} Z`
        );

        gearMorphPath.style.opacity = 0;
    }

    function frame(currentTime) {

        const progress = Math.min(
            (currentTime - startTime) / DURATION,
            1
        );

        const eased = easeInOut(progress);

        const morphProgress = ramp(eased, 0.08, 0.80);

        const points = interpolatePoints(
            reverse ? gearTargetPoints : gearSourcePoints,
            reverse ? gearSourcePoints : gearTargetPoints,
            morphProgress
        );

        gearMorphPath.setAttribute(
            "d",
            `M ${points} Z`
        );

        gearMorphPath.setAttribute(
            "fill",
            interpolateColor(
                reverse ? "#C5CEBA" : "#B9C9D0",
                reverse ? "#B9C9D0" : "#C5CEBA",
                morphProgress
            )
        );

        // Path intermediário.
        // Na ida, permanece até a engrenagem assumir.
        // Na volta, aparece para receber a transformação.
        if (reverse) {
            gearMorphPath.style.opacity =
                ramp(eased, 0.04, 0.24) *
                (1 - ramp(eased, 0.78, 0.98));
        } else {
            gearMorphPath.style.opacity =
                1 - ramp(eased, 0.78, 0.98);
        }

        // Elementos originais de Têmis.
        fade(themisHead, eased, 0.05, 0.35, !reverse);
        fade(themisScale, eased, 0.05, 0.40, !reverse);
        fade(pedestalTop, eased, 0.05, 0.35, !reverse);
        fade(pedestalBase, eased, 0.05, 0.35, !reverse);

        // Corpo original de Têmis.
        fade(themisBody, eased, 0.08, 0.30, !reverse);

        // Elementos internos da engrenagem.
        fade(gearRing, eased, 0.55, 0.78, reverse);
        fade(gearOpenings, eased, 0.62, 0.82, reverse);
        fade(gearHub, eased, 0.70, 0.88, reverse);
        fade(gearAxle, eased, 0.78, 0.94, reverse);
        fade(gearHole, eased, 0.85, 1, reverse);

        // Corpo externo da engrenagem.
        fade(gearBody, eased, 0.78, 0.96, reverse);

        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {

            if (reverse) {

                // Estado final: Têmis
                gearMorphPath.style.opacity = 0;
                gearBody.style.opacity = 0;

                themisBody.style.opacity = 1;
                themisHead.style.opacity = 1;
                themisScale.style.opacity = 1;
                pedestalTop.style.opacity = 1;
                pedestalBase.style.opacity = 1;

                gearRing.style.opacity = 0;
                gearOpenings.style.opacity = 0;
                gearHub.style.opacity = 0;
                gearAxle.style.opacity = 0;
                gearHole.style.opacity = 0;

            } else {

                // Estado final: engrenagem
                gearMorphPath.style.opacity = 0;

                gearBody.style.opacity = 1;
                gearRing.style.opacity = 1;
                gearOpenings.style.opacity = 1;
                gearHub.style.opacity = 1;
                gearAxle.style.opacity = 1;
                gearHole.style.opacity = 1;

                themisBody.style.opacity = 0;
                themisHead.style.opacity = 0;
                themisScale.style.opacity = 0;
                pedestalTop.style.opacity = 0;
                pedestalBase.style.opacity = 0;
            }

            currentState = reverse ? 1 : 2;

            if (reverse) {
                gearRoundTripComplete = true;
            }

            animating = false;
            if (button) {
                button.disabled = false;
                button.textContent = currentState === 2
                    ? "Voltar para Têmis"
                    : gearRoundTripComplete
                        ? "Voltar ao computador"
                        : "Transformar em engrenagem";
            }

            if (status) {
                status.textContent = currentState === 2
                    ? "Têmis transformada em engrenagem."
                    : "Engrenagem transformada em Têmis.";
            }

            scheduleAutomaticTransition();
        }
    }

    requestAnimationFrame(frame);
}


// ================================================
// 9. INICIALIZAÇÃO
// ================================================

async function initializeLab() {

    try {

        if (button) {
            button.disabled = true;
            button.textContent = "Carregando...";
        }

        if (!computerContainer || !themisContainer || !gearContainer) {
            throw new Error(
                "Um ou mais containers SVG não foram encontrados no HTML."
            );
        }

        const [computerSVG, themisSVG, loadedGearSVG] =
            await Promise.all([

                loadSVG(
                    "assets/images/computer.svg",
                    computerContainer
                ),

                loadSVG(
                    "assets/images/thamis.svg",
                    themisContainer
                ),

                loadSVG(
                    "assets/images/gear.svg",
                    gearContainer
                )

            ]);

        gearSVG = loadedGearSVG;

        prepareComponents(computerSVG, themisSVG);
        prepareGear(gearSVG, themisSVG);

        currentState = 0;

        if (button) {
            button.disabled = false;
            button.textContent = "Iniciar transformação";
        }

        if (status) status.textContent = "Laboratório pronto.";

        if (automaticMode && !motionPreference.matches) {
            window.setTimeout(scheduleAutomaticTransition, 650);
        }

    } catch (error) {

        console.error("ERRO NA INICIALIZAÇÃO:", error);

        if (button) {
            button.disabled = true;
            button.textContent = "Erro ao carregar";
        }

        if (status) {
            status.textContent = error.message;
        }
    }
}


// ================================================
// 10. CONTROLE DO BOTÃO
// ================================================

function resolveNextTransition(state, returnedFromGear) {
    if (state === 0) {
        return { type: "computer", reverse: false };
    }

    if (state === 1) {
        return returnedFromGear
            ? { type: "computer", reverse: true }
            : { type: "gear", reverse: false };
    }

    if (state === 2) {
        return { type: "gear", reverse: true };
    }

    return null;
}

function runNextTransition() {
    if (animating || motionPreference.matches) return;
    const next = resolveNextTransition(
        currentState,
        gearRoundTripComplete
    );

    if (!next) return;

    if (next.type === "computer") {
        animateTransformation(next.reverse);
    } else {
        animateGearTransformation(next.reverse);
    }
}

function scheduleAutomaticTransition() {
    if (!automaticMode || motionPreference.matches) return;
    window.setTimeout(runNextTransition, 700);
}

if (button) {
    button.addEventListener("click", runNextTransition);
}


// Inicialização única.
initializeLab();
