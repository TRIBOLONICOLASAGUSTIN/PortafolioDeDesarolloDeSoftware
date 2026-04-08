const btnn= document.getElementById('Modo-Boton');
const icono = document.getElementById('icono-modo');
const body= document.body;

if(localStorage.getItem('modo')=='oscuro'){
    body.classList.add('dark-mode');
}

btnn.addEventListener('click',()=>{
    body.classList.toggle('dark-mode');

    if(body.classList.contains('dark-mode')){
        localStorage.setItem('modo','oscuro');
            icono.src = 'Imagen/Luna.svg';
            icono.alt = 'Modo Noche';
    } else{
        localStorage.setItem('modo','claro');
            icono.src = 'Imagen/Dia.svg';
            icono.alt = 'Modo Día';
    }

    if (body.classList.contains('dark-mode')) {
    icono.src = 'Imagen/Luna.svg';
    icono.alt = 'Modo Noche';
    } 
    else {
    icono.src = 'Imagen/Dia.svg';
    icono.alt = 'Modo Día';
    }
});
