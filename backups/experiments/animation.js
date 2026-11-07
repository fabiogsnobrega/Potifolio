
/* =========================================
   PORTFOLIO — FÁBIO GERMANO NÓBREGA
   ANIMATION.JS — VERSION 2
========================================= */


/* 1. ELEMENTOS DA ANIMAÇÃO
========================================= */

const scene = document.querySelector("#scene");

const objects = scene
    ? Array.from(scene.querySelectorAll(".object"))
    : [];


/* 2. CONFIGURAÇÕES
========================================= */

const CONFIG = {

    interval: 2800,

    initialIndex: 0,

    states: [
        "computer",
        "themis",
        "gear"
    ]

};


/* 3. PREFERÊNCIAS DO USUÁRIO
========================================= */

const motionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);


/* 4. ESTADO DA ANIMAÇÃO
========================================= */

const animationState = {

    currentIndex: CONFIG.initialIndex,

    timer: null,

    isRunning: false

};


/* 5. EXIBIR ELEMENTO
========================================= */

function showObject(index) {

    if (objects.length === 0) {
        return;
    }

    objects.forEach((object, i) => {

        const isActive = i === index;

        object.classList.toggle("active", isActive);

    });

    animationState.currentIndex = index;

    console.log(
        "Elemento ativo:",
        CONFIG.states[index] ?? index
    );

}


/* 6. AVANÇAR SEQUÊNCIA
========================================= */

function nextObject() {

    const nextIndex =
        (animationState.currentIndex + 1) % objects.length;

    showObject(nextIndex);

}


/* 7. INICIAR ANIMAÇÃO
========================================= */

function startAnimation() {

    if (animationState.isRunning) {
        return;
    }

    if (document.hidden) {
        return;
    }

    if (objects.length <= 1) {
        return;
    }

    animationState.timer = setInterval(
        nextObject,
        CONFIG.interval
    );

    animationState.isRunning = true;

    console.log("Animação iniciada.");

}
 


/* 8. PAUSAR ANIMAÇÃO
========================================= */

function stopAnimation() {

    if (animationState.timer !== null) {

        clearInterval(animationState.timer);

        animationState.timer = null;

    }

    animationState.isRunning = false;

    console.log("Animação pausada.");

}


/* 9. CONTROLAR PREFERÊNCIA DE MOVIMENTO
========================================= */

function handleMotionPreference() {
    console.log("Preferência de movimento:", motionPreference.matches);
}

motionPreference.addEventListener(
    "change",
    handleMotionPreference
);


/* 10. CONTROLAR VISIBILIDADE DA ABA
========================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (document.hidden) {

            stopAnimation();

        } else {

            startAnimation();

        }

    }
);


/* 11. INICIALIZAÇÃO
========================================= */

function initializeAnimation() {

    if (objects.length === 0) {

        console.error(
            "Erro: nenhum objeto SVG encontrado na cena."
        );

        return;

    }

    if (objects.length !== CONFIG.states.length) {

        console.warn(
            "A quantidade de desenhos é diferente da quantidade de estados."
        );

    }

    showObject(CONFIG.initialIndex);

    startAnimation();

}

initializeAnimation();
