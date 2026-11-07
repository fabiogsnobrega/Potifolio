
const computerContainer = document.querySelector("#computer-container");
const themisContainer = document.querySelector("#themis-container");

const stage = document.querySelector("#transition-stage");
const button = document.querySelector("#transition-button");
const status = document.querySelector("#status");

const DURATION = 2200;

let transformed = false;
let animating = false;

let keyboardBody;
let keyboardKeys;
let monitor;
let standNeck;
let standBase;

let themisHead;
let themisBody;
let themisScale;
let pedestalTop;
let pedestalBase;

let originalPath;
let destinationPath;

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


// Carrega SVG externo.
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

// Interpola os números de dois paths compatíveis.
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

// Suavização do movimento.
function easeInOut(progress) {
    return progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

// Controle gradual de opacidade.
function fade(element, progress, start, end, reverse = false) {
    let value = Math.max(
        0,
        Math.min(1, (progress - start) / (end - start))
    );

    if (reverse) value = 1 - value;

    element.style.opacity = value;
}

// Configuração inicial.
function prepareComponents(computerSVG, themisSVG) {
    keyboardBody = computerSVG.querySelector("#keyboard-body path");
    keyboardKeys = computerSVG.querySelector("#keyboard-keys");
    monitor = computerSVG.querySelector("#monitor");
    standNeck = computerSVG.querySelector("#stand-neck");
    standBase = computerSVG.querySelector("#stand-base");

    themisHead = themisSVG.querySelector("#head");
    themisBody = themisSVG.querySelector("#body");
    themisScale = themisSVG.querySelector("#scale-and-arms");

    pedestalTop = themisSVG.querySelector("#pedestal path");
    pedestalBase = themisSVG.querySelector("#pedestal rect");

    const components = [
        keyboardBody,
        keyboardKeys,
        monitor,
        standNeck,
        standBase,
        themisHead,
        themisBody,
        themisScale,
        pedestalTop,
        pedestalBase
    ];

    if (components.some(component => !component)) {
        throw new Error("Não foi possível localizar todos os componentes SVG.");
    }

    originalPath = keyboardBody.getAttribute("d");
    destinationPath = TARGET_PATH;

    // Validação das estruturas geométricas.
    interpolatePath(originalPath, destinationPath, 0);

    // Estado inicial.
    [themisHead, themisBody, themisScale, pedestalTop, pedestalBase]
        .forEach(element => element.style.opacity = 0);

    [monitor, standNeck, standBase, keyboardKeys]
        .forEach(element => element.style.opacity = 1);

    keyboardBody.style.opacity = 1;
}

// Executa a animação.
function animateTransformation(reverse = false) {
    if (animating) return;

    animating = true;
    button.disabled = true;

    const startTime = performance.now();

    const fromPath = reverse ? destinationPath : originalPath;
    const toPath = reverse ? originalPath : destinationPath;

    if (reverse) {
        pedestalBase.style.opacity = 0;
        keyboardBody.style.opacity = 1;
        keyboardBody.setAttribute("d", destinationPath);
    }

    function frame(currentTime) {
        let progress = Math.min(
            (currentTime - startTime) / DURATION,
            1
        );

        const eased = easeInOut(progress);

        // Morphing real do teclado para a base.
        const morphProgress = Math.max(
            0,
            Math.min(1, (eased - 0.12) / 0.76)
        );

        keyboardBody.setAttribute(
            "d",
            interpolatePath(fromPath, toPath, morphProgress)
        );

        // Saída do computador.

        // Saída do computador.
        fade(monitor, eased, 0, 0.38, !reverse);
        fade(standNeck, eased, 0.05, 0.32, !reverse);
        fade(standBase, eased, 0.05, 0.32, !reverse);
        fade(keyboardKeys, eased, 0, 0.22, !reverse);


        // Formação de Têmis.
        fade(pedestalTop, eased, 0.28, 0.58, reverse);
        fade(themisBody, eased, 0.38, 0.72, reverse);
        fade(themisScale, eased, 0.48, 0.82, reverse);
        fade(themisHead, eased, 0.65, 0.92, reverse);

        // A base original de Têmis só aparece no final.
        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {
            if (reverse) {
                keyboardBody.setAttribute("d", originalPath);
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
                ? "Teclado transformado em base do pedestal."
                : "Computador restaurado.";
        }
    }

    requestAnimationFrame(frame);
}

// Inicialização.

// Inicialização.
async function initializeLab() {
    try {
        const [computerSVG, themisSVG] = await Promise.all([
            loadSVG("assets/images/computer.svg", computerContainer),
            loadSVG("assets/images/thamis.svg", themisContainer)
        ]);

        prepareComponents(computerSVG, themisSVG);

        button.disabled = false;
        button.textContent = "Iniciar transformação";
        status.textContent = "Laboratório pronto.";

    } catch (error) {
        console.error("ERRO NA INICIALIZAÇÃO:", error);

        button.disabled = true;
        button.textContent = "Erro ao carregar";

        if (status) {
            status.textContent = error.message;
        }
    }
}

// Botão: fica FORA da função initializeLab.
button.addEventListener("click", () => {
    if (animating) return;

    animateTransformation(transformed);
});

// Inicializa uma única vez.
initializeLab();
