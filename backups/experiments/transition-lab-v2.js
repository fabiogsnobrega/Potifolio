
const computerContainer = document.querySelector("#computer-container");
const themisContainer = document.querySelector("#themis-container");

const button = document.querySelector("#transition-button");
const status = document.querySelector("#status");

const DURATION = 2200;
const SVG_NS = "http://www.w3.org/2000/svg";

let transformed = false;
let animating = false;

// Componentes do computador
let keyboardBody;
let keyboardKeys;
let monitor;
let standNeck;
let standBase;
let monitorFrame;
let monitorFrameGroup;

// Componentes de Têmis
let themisHead;
let themisBody;
let themisScale;
let pedestalTop;
let pedestalBase;

// Paths do teclado
let originalPath;
let destinationPath;

// Morphing do monitor
let monitorMorphPath;
let monitorSourcePoints;
let monitorTargetPoints;

// Contorno original da moldura do monitor
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

// Contorno de destino: vestido de Têmis
const DRESS_TARGET_PATH = `
M 185 66
L 215 66
L 237.5 165
C 215 187.5, 185 187.5, 162.5 165
Z
`;

// Destino do teclado: base do pedestal
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


// ==================================================
// 1. CARREGAMENTO DOS SVGs
// ==================================================

async function loadSVG(path, container) {
    const response = await fetch(path);

    if (!response.ok) {
        throw new Error(`Não foi possível carregar ${path}`);
    }

    const source = await response.text();

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


// ==================================================
// 2. FUNÇÕES GEOMÉTRICAS
// ==================================================

// Interpola paths com a mesma estrutura de comandos.
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


// Distribui pontos ao longo de um contorno SVG.
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


// Interpola os pontos de dois contornos.
function interpolatePoints(pointsA, pointsB, progress) {
    return pointsA.map((point, index) => {
        const x =
            point.x + (pointsB[index].x - point.x) * progress;

        const y =
            point.y + (pointsB[index].y - point.y) * progress;

        return `${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" L ");
}


// Interpola duas cores hexadecimais.
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


// ==================================================
// 3. FUNÇÕES DE ANIMAÇÃO
// ==================================================

function easeInOut(progress) {
    return progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}


function fade(element, progress, start, end, reverse = false) {
    let value = Math.max(
        0,
        Math.min(1, (progress - start) / (end - start))
    );

    if (reverse) {
        value = 1 - value;
    }

    element.style.opacity = value;
}


// ==================================================
// 4. PREPARAÇÃO DOS COMPONENTES
// ==================================================

function prepareComponents(computerSVG, themisSVG) {

    // Computador
    keyboardBody = computerSVG.querySelector("#keyboard-body path");
    keyboardKeys = computerSVG.querySelector("#keyboard-keys");

    monitor = computerSVG.querySelector("#monitor");

    monitorFrameGroup = computerSVG.querySelector("#monitor-frame");
    monitorFrame = computerSVG.querySelector("#monitor-frame rect");

    standNeck = computerSVG.querySelector("#stand-neck");
    standBase = computerSVG.querySelector("#stand-base");

    // Têmis
    themisHead = themisSVG.querySelector("#head");
    themisBody = themisSVG.querySelector("#body");
    themisScale = themisSVG.querySelector("#scale-and-arms");

    pedestalTop = themisSVG.querySelector("#pedestal path");
    pedestalBase = themisSVG.querySelector("#pedestal rect");

    // Validação dos elementos
    const components = [
        keyboardBody,
        keyboardKeys,
        monitor,
        monitorFrameGroup,
        monitorFrame,
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
            "Não foi possível localizar todos os componentes SVG."
        );
    }

    // Guarda o path original do teclado
    originalPath = keyboardBody.getAttribute("d");
    destinationPath = TARGET_PATH;

    // Valida a compatibilidade dos paths do teclado
    interpolatePath(originalPath, destinationPath, 0);

    // Prepara os contornos do monitor e do vestido
    monitorSourcePoints = samplePath(
        computerSVG,
        MONITOR_SOURCE_PATH
    );

    monitorTargetPoints = samplePath(
        computerSVG,
        DRESS_TARGET_PATH
    );

    // Cria o elemento que fará o morphing
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

    // Insere o novo contorno dentro da moldura.
    // Assim, a tela permanece por cima dele.
    monitorFrameGroup.appendChild(monitorMorphPath);

    // Oculta apenas a moldura original.
    monitorFrame.style.opacity = 0;

    // Estado inicial de Têmis
    [
        themisHead,
        themisBody,
        themisScale,
        pedestalTop,
        pedestalBase
    ].forEach(element => {
        element.style.opacity = 0;
    });

    // Estado inicial do computador
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


// ==================================================
// 5. MORPHING DO MONITOR
// ==================================================

function animateMonitorMorph(eased, reverse) {

    const dressProgress = Math.max(
        0,
        Math.min(1, (eased - 0.12) / 0.70)
    );

    const points = interpolatePoints(
        reverse ? monitorTargetPoints : monitorSourcePoints,
        reverse ? monitorSourcePoints : monitorTargetPoints,
        dressProgress
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
            dressProgress
        )
    );

    // Na ida, o contorno desaparece.
    // Na volta, ele reaparece.
    fade(
        monitorMorphPath,
        eased,
        0.82,
        1,
        !reverse
    );
}


// ==================================================
// 6. ANIMAÇÃO PRINCIPAL
// ==================================================

function animateTransformation(reverse = false) {

    if (animating) return;

    animating = true;
    button.disabled = true;

    const startTime = performance.now();

    const fromPath = reverse
        ? destinationPath
        : originalPath;

    const toPath = reverse
        ? originalPath
        : destinationPath;

    function frame(currentTime) {

        const progress = Math.min(
            (currentTime - startTime) / DURATION,
            1
        );

        const eased = easeInOut(progress);

        // ------------------------------------------
        // A. Teclado → base do pedestal
        // ------------------------------------------

        const morphProgress = Math.max(
            0,
            Math.min(1, (eased - 0.12) / 0.76)
        );

        keyboardBody.setAttribute(
            "d",
            interpolatePath(
                fromPath,
                toPath,
                morphProgress
            )
        );

        // ------------------------------------------
        // B. Monitor → vestido
        // ------------------------------------------

        animateMonitorMorph(eased, reverse);

        // ------------------------------------------
        // C. Saída do computador
        // ------------------------------------------

        fade(monitor, eased, 0, 0.38, !reverse);

        fade(standNeck, eased, 0.05, 0.32, !reverse);

        fade(standBase, eased, 0.05, 0.32, !reverse);

        fade(keyboardKeys, eased, 0, 0.22, !reverse);

        // ------------------------------------------
        // D. Formação de Têmis
        // ------------------------------------------

        fade(pedestalTop, eased, 0.28, 0.58, reverse);

        fade(themisBody, eased, 0.82, 0.96, reverse);

        fade(themisScale, eased, 0.48, 0.82, reverse);

        fade(themisHead, eased, 0.65, 0.92, reverse);

        // ------------------------------------------
        // E. Próximo quadro
        // ------------------------------------------

        if (progress < 1) {

            requestAnimationFrame(frame);

        } else {

            // Estado final da animação
            if (reverse) {

                keyboardBody.setAttribute(
                    "d",
                    originalPath
                );

                pedestalBase.style.opacity = 0;

            } else {

                keyboardBody.style.opacity = 0;
                pedestalBase.style.opacity = 1;

            }

            transformed = !reverse;
            animating = false;

            button.disabled = false;

            button.textContent = transformed
                ? "Voltar ao computador"
                : "Iniciar transformação";

            status.textContent = transformed
                ? "Computador transformado em Têmis."
                : "Computador restaurado.";
        }
    }

    requestAnimationFrame(frame);
}


// ==================================================
// 7. INICIALIZAÇÃO
// ==================================================

async function initializeLab() {

    try {

        button.disabled = true;
        button.textContent = "Carregando...";

        const [computerSVG, themisSVG] = await Promise.all([

            loadSVG(
                "assets/images/computer.svg",
                computerContainer
            ),

            loadSVG(
                "assets/images/thamis.svg",
                themisContainer
            )

        ]);

        prepareComponents(computerSVG, themisSVG);

        button.disabled = false;
        button.textContent = "Iniciar transformação";

        status.textContent = "Laboratório pronto.";

    } catch (error) {

        console.error(
            "ERRO NA INICIALIZAÇÃO:",
            error
        );

        button.disabled = true;
        button.textContent = "Erro ao carregar";

        if (status) {
            status.textContent = error.message;
        }
    }
}


// ==================================================
// 8. EVENTO DO BOTÃO
// ==================================================

button.addEventListener("click", () => {

    if (animating) return;

    animateTransformation(transformed);

});


// Inicializa o laboratório uma única vez.
initializeLab();
