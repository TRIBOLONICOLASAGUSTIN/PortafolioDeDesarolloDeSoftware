const btnn= document.getElementById('Modo-Boton');
const body= document.body;

if(localStorage.getItem('modo')=='oscuro'){
    body.classList.add('dark-mode');
}

btnn.addEventListener('click',()=>{
    body.classList.toggle('dark-mode');

    if(body.classList.contains('dark-mode')){
        localStorage.setItem('modo','oscuro');
    } else{
        localStorage.setItem('modo','claro');
    }
});