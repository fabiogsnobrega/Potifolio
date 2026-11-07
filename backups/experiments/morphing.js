
const shape = document.querySelector("#shape");
const button = document.querySelector("#transform");

// Caminho inicial: círculo
const circlePath = `
    M 200 80
    C 266 80 320 134 320 200
    C 320 266 266 320 200 320
    C 134 320 80 266 80 200
    C 80 134 134 80 200 80
    Z
`;

// Caminho final: quadrado arredondado
const squarePath = `
    M 125 80
    C 230 80 320 80 320 125
    C 320 230 320 320 275 320
    C 170 320 80 320 80 275
    C 80 170 80 80 125 80
    Z
`;

let isSquare = false;

function getNumbers(path) {
    return path.match(/-?\d+\.?\d*/g).map(Number);
}

function createPath(template, values) {

    let index = 0;

    return template.replace(
        /-?\d+\.?\d*/g,
        () => values[index++]
    );

}

function morph(startPath, endPath) {

    const start = getNumbers(startPath);
    const end = getNumbers(endPath);

    const duration = 1000;
    const startTime = performance.now();

    function animate(currentTime) {

        const elapsed = currentTime - startTime;

        let progress = Math.min(elapsed / duration, 1);

        // Suavização da transformação
        progress = progress * progress * (3 - 2 * progress);

        const currentValues = start.map((value, index) => {

            return value + (end[index] - value) * progress;

        });

        shape.setAttribute(
            "d",
            createPath(endPath, currentValues)
        );

        if (progress < 1) {

            requestAnimationFrame(animate);

        }

    }

    requestAnimationFrame(animate);

}

button.addEventListener("click", () => {

    if (isSquare) {

        morph(squarePath, circlePath);

        button.textContent = "Transformar em quadrado";

    } else {

        morph(circlePath, squarePath);

        button.textContent = "Transformar em círculo";

    }

    isSquare = !isSquare;

});
