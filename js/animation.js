const objects = document.querySelectorAll(".object");

console.log("Elementos encontrados:", objects.length);

let currentIndex = 0;

function showObject(index) {

    objects.forEach((object, i) => {

        object.classList.toggle("active", i === index);

    });

    console.log("Elemento exibido:", index);

}

function nextObject() {

    currentIndex = (currentIndex + 1) % objects.length;

    showObject(currentIndex);

}

if (objects.length === 0) {

    console.error("Nenhum elemento SVG foi encontrado.");

} else {

    showObject(currentIndex);

    setInterval(nextObject, 2800);

}
