// URL base de la API REST del directorio.
// Si Spring sirve la página, usa ese mismo servidor (http://localhost:8080 por defecto);
// si se abre el archivo directamente, apunta a http://localhost:8080.
const SERVIDOR = location.protocol.startsWith('http') ? location.origin : 'http://localhost:8080';
const API_URL = `${SERVIDOR}/api/v1/funcionarios`;

// Referencias a elementos de la página
const formulario = document.getElementById('formulario');
const campoId = document.getElementById('id');
const campoNombre = document.getElementById('nombre');
const campoCargo = document.getElementById('cargo');
const campoDepartamento = document.getElementById('departamento');
const campoTelefono = document.getElementById('telefono');
const tituloFormulario = document.getElementById('titulo-formulario');
const indicadorId = document.getElementById('indicador-id');
const valorId = document.getElementById('valor-id');
const btnGuardar = document.getElementById('btn-guardar');
const btnLimpiar = document.getElementById('btn-limpiar');
const btnTodos = document.getElementById('btn-todos');
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const contextoTabla = document.getElementById('contexto-tabla');
const cajaMensaje = document.getElementById('mensaje');
const vistaLogin = document.getElementById('vista-login');
const vistaApp = document.getElementById('vista-app');
const formLogin = document.getElementById('form-login');
const campoUsuarioLogin = document.getElementById('login-usuario');
const campoPasswordLogin = document.getElementById('login-password');
const mensajeLogin = document.getElementById('mensaje-login');
const btnEntrar = document.getElementById('btn-entrar');
const cajaSesion = document.getElementById('sesion');
const usuarioActual = document.getElementById('usuario-actual');

// ---------- Credenciales (HTTP Basic) ----------

const CLAVE_SESION = 'funcionarios.auth';

/** Arma el valor "Basic base64(usuario:contraseña)" admitiendo tildes y ñ (UTF-8). */
function crearCabeceraBasic(usuario, password) {
    const bytes = new TextEncoder().encode(`${usuario}:${password}`);
    let binario = '';
    bytes.forEach((b) => { binario += String.fromCharCode(b); });
    return `Basic ${btoa(binario)}`;
}

function leerSesion() {
    try {
        return JSON.parse(sessionStorage.getItem(CLAVE_SESION));
    } catch (e) {
        return null;
    }
}

function guardarSesion(sesion) {
    try {
        sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    } catch (e) {
        // Sin sessionStorage la sesión dura solo mientras la página esté abierta
    }
}

function borrarSesion() {
    try {
        sessionStorage.removeItem(CLAVE_SESION);
    } catch (e) {
        // nada que borrar
    }
}

// La sesión vive en memoria y en sessionStorage (se borra al cerrar la pestaña).
let sesionActual = leerSesion();

// ---------- Comunicación con la API ----------

/**
 * Hace una petición a la API y devuelve { status, datos }.
 * Envía las credenciales en la cabecera Authorization (HTTP Basic).
 * Si la respuesta es un error (4xx/5xx) lanza un Error con el mensaje del servidor.
 */
async function peticion(url, opciones = {}, cabeceraAuth = sesionActual?.auth) {
    const cabeceras = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Evita que el navegador abra su propia ventana de usuario y contraseña
        'X-Requested-With': 'XMLHttpRequest'
    };
    if (cabeceraAuth) cabeceras.Authorization = cabeceraAuth;

    let respuesta;
    try {
        respuesta = await fetch(url, { ...opciones, headers: cabeceras });
    } catch (e) {
        throw new Error('No se pudo conectar con el servidor. Verifica que la aplicación esté en ejecución.');
    }

    if (respuesta.status === 401) {
        const error = new Error('Usuario o contraseña incorrectos.');
        error.status = 401;
        throw error;
    }

    // 204 no lleva cuerpo
    const texto = respuesta.status === 204 ? '' : await respuesta.text();
    let datos = null;
    try {
        datos = texto ? JSON.parse(texto) : null;
    } catch (e) {
        datos = null;
    }

    if (!respuesta.ok) {
        const error = new Error(datos?.mensaje || `Error ${respuesta.status} en la solicitud`);
        error.status = respuesta.status;
        error.detalles = datos?.detalles || [];
        throw error;
    }
    return { status: respuesta.status, datos };
}

// ---------- Mensajes ----------

function mostrarMensaje(texto, tipo = 'info', detalles = []) {
    cajaMensaje.className = `mensaje ${tipo}`;
    cajaMensaje.textContent = texto;
    if (detalles.length > 0) {
        const lista = document.createElement('ul');
        detalles.forEach((d) => {
            const item = document.createElement('li');
            item.textContent = d;
            lista.appendChild(item);
        });
        cajaMensaje.appendChild(lista);
    }
    cajaMensaje.hidden = false;
}

function ocultarMensaje() {
    cajaMensaje.hidden = true;
    cajaMensaje.textContent = '';
}

function mostrarError(error) {
    // Si las credenciales dejaron de ser válidas, se vuelve al inicio de sesión
    if (error.status === 401) {
        cerrarSesion('Tu sesión no es válida. Vuelve a iniciar sesión.');
        return;
    }
    mostrarMensaje(error.message, 'error', error.detalles || []);
}

// ---------- Inicio y cierre de sesión ----------

function mostrarLogin(mensaje) {
    vistaApp.hidden = true;
    cajaSesion.hidden = true;
    vistaLogin.hidden = false;
    mensajeLogin.hidden = !mensaje;
    mensajeLogin.textContent = mensaje || '';
    campoPasswordLogin.value = '';
    campoUsuarioLogin.focus();
}

function mostrarApp() {
    vistaLogin.hidden = true;
    vistaApp.hidden = false;
    cajaSesion.hidden = false;
    usuarioActual.textContent = sesionActual.usuario;
}

function cerrarSesion(mensaje) {
    sesionActual = null;
    borrarSesion();
    limpiarFormulario();
    ocultarMensaje();
    cuerpoTabla.replaceChildren();
    mostrarLogin(mensaje);
}

async function iniciarSesion(evento) {
    evento.preventDefault();
    const usuario = campoUsuarioLogin.value.trim();
    const password = campoPasswordLogin.value;
    if (!usuario || !password) {
        mostrarLogin('Escribe tu usuario y tu contraseña.');
        campoUsuarioLogin.value = usuario;
        return;
    }

    const auth = crearCabeceraBasic(usuario, password);
    btnEntrar.disabled = true;
    try {
        // Se comprueban las credenciales con una petición real a la API
        await peticion(API_URL, {}, auth);
        sesionActual = { usuario, auth };
        guardarSesion(sesionActual);
        formLogin.reset();
        mostrarApp();
        await cargarTodos();
    } catch (error) {
        mostrarLogin(error.message);
        campoUsuarioLogin.value = usuario;
        campoPasswordLogin.focus();
    } finally {
        btnEntrar.disabled = false;
    }
}

// ---------- Tabla ----------

function pintarTabla(funcionarios, contexto) {
    contextoTabla.textContent = contexto;
    cuerpoTabla.replaceChildren();

    funcionarios.forEach((f) => {
        const fila = document.createElement('tr');

        fila.appendChild(celda(f.id, 'col-id'));
        fila.appendChild(celda(f.nombre));
        fila.appendChild(celda(f.cargo));
        fila.appendChild(celda(f.departamento));

        const celdaTelefono = celda(f.telefono || '—');
        if (!f.telefono) celdaTelefono.classList.add('sin-dato');
        fila.appendChild(celdaTelefono);

        const celdaAcciones = document.createElement('td');
        celdaAcciones.className = 'col-acciones';

        const btnEditar = document.createElement('button');
        btnEditar.type = 'button';
        btnEditar.className = 'boton boton-secundario boton-pequeno';
        btnEditar.textContent = 'Editar';
        btnEditar.setAttribute('aria-label', `Editar a ${f.nombre}`);
        btnEditar.addEventListener('click', () => editarFuncionario(f.id));

        const btnEliminar = document.createElement('button');
        btnEliminar.type = 'button';
        btnEliminar.className = 'boton boton-peligro boton-pequeno';
        btnEliminar.textContent = 'Eliminar';
        btnEliminar.setAttribute('aria-label', `Eliminar a ${f.nombre}`);
        btnEliminar.addEventListener('click', () => eliminarFuncionario(f));

        celdaAcciones.append(btnEditar, btnEliminar);
        fila.appendChild(celdaAcciones);
        cuerpoTabla.appendChild(fila);
    });
}

function celda(valor, clase) {
    const td = document.createElement('td');
    td.textContent = valor;
    if (clase) td.className = clase;
    return td;
}

// ---------- Consultas ----------

/** Carga el listado completo. Si "conservarMensaje" es true no reemplaza el mensaje actual. */
async function cargarTodos(conservarMensaje = false) {
    try {
        const { status, datos } = await peticion(API_URL);
        if (status === 204) {
            pintarTabla([], 'Listado completo');
            mostrarMensaje(conservarMensaje && !cajaMensaje.hidden
                ? `${cajaMensaje.textContent} El directorio quedó vacío.`
                : 'El directorio está vacío. Registra el primer funcionario.', 'info');
            return;
        }
        pintarTabla(datos, `Listado completo · ${datos.length} ${datos.length === 1 ? 'registro' : 'registros'}`);
        if (!conservarMensaje) ocultarMensaje();
    } catch (error) {
        pintarTabla([], 'Listado completo');
        mostrarError(error);
    }
}

async function buscarPorId(id) {
    try {
        const { datos } = await peticion(`${API_URL}/${encodeURIComponent(id)}`);
        pintarTabla([datos], `Resultado para el ID ${id}`);
        mostrarMensaje(`Se encontró el funcionario con ID ${id}.`, 'exito');
    } catch (error) {
        pintarTabla([], `Resultado para el ID ${id}`);
        if (error.status === 404) {
            mostrarMensaje(`No hay ningún funcionario con el ID ${id}.`, 'info');
        } else {
            mostrarError(error);
        }
    }
}

/** Busca por nombre o departamento usando los parámetros de la API. */
async function buscarPorFiltro(parametro, valor, descripcion) {
    const url = `${API_URL}?${parametro}=${encodeURIComponent(valor)}`;
    try {
        const { status, datos } = await peticion(url);
        if (status === 204) {
            pintarTabla([], descripcion);
            mostrarMensaje(`No se encontraron funcionarios: ${descripcion.toLowerCase()}.`, 'info');
            return;
        }
        pintarTabla(datos, `${descripcion} · ${datos.length} ${datos.length === 1 ? 'resultado' : 'resultados'}`);
        mostrarMensaje(`Se encontraron ${datos.length} ${datos.length === 1 ? 'funcionario' : 'funcionarios'}.`, 'exito');
    } catch (error) {
        pintarTabla([], descripcion);
        mostrarError(error);
    }
}

// ---------- Formulario ----------

function limpiarFormulario() {
    formulario.reset();
    campoId.value = '';
    tituloFormulario.textContent = 'Nuevo funcionario';
    btnGuardar.textContent = 'Registrar';
    indicadorId.hidden = true;
    valorId.textContent = '';
    [campoNombre, campoCargo, campoDepartamento].forEach((c) => c.classList.remove('invalido'));
}

function llenarFormulario(f) {
    campoId.value = f.id;
    campoNombre.value = f.nombre;
    campoCargo.value = f.cargo;
    campoDepartamento.value = f.departamento;
    campoTelefono.value = f.telefono || '';
    tituloFormulario.textContent = 'Editar funcionario';
    btnGuardar.textContent = 'Guardar cambios';
    valorId.textContent = f.id;
    indicadorId.hidden = false;
}

/** Valida en el navegador los campos obligatorios (la API vuelve a validarlos). */
function validarFormulario() {
    const faltantes = [];
    [
        [campoNombre, 'El nombre es obligatorio'],
        [campoCargo, 'El cargo es obligatorio'],
        [campoDepartamento, 'El departamento es obligatorio']
    ].forEach(([campo, texto]) => {
        const vacio = campo.value.trim() === '';
        campo.classList.toggle('invalido', vacio);
        if (vacio) faltantes.push(texto);
    });
    return faltantes;
}

async function guardarFuncionario(evento) {
    evento.preventDefault();

    const faltantes = validarFormulario();
    if (faltantes.length > 0) {
        mostrarMensaje('Revisa el formulario.', 'error', faltantes);
        return;
    }

    const id = campoId.value;
    const cuerpo = {
        nombre: campoNombre.value.trim(),
        cargo: campoCargo.value.trim(),
        departamento: campoDepartamento.value.trim(),
        telefono: campoTelefono.value.trim()
    };

    btnGuardar.disabled = true;
    try {
        if (id) {
            const { datos } = await peticion(`${API_URL}/${id}`, { method: 'PUT', body: JSON.stringify(cuerpo) });
            mostrarMensaje(`Se actualizaron los datos de ${datos.nombre}.`, 'exito');
        } else {
            const { datos } = await peticion(API_URL, { method: 'POST', body: JSON.stringify(cuerpo) });
            mostrarMensaje(`Se registró a ${datos.nombre} con el ID ${datos.id}.`, 'exito');
        }
        limpiarFormulario();
        await cargarTodos(true);
    } catch (error) {
        mostrarError(error);
        if (error.status === 404) {
            limpiarFormulario();
            await cargarTodos(true);
        }
    } finally {
        btnGuardar.disabled = false;
    }
}

/** Consulta el funcionario en la API y carga sus datos en el formulario. */
async function editarFuncionario(id) {
    try {
        const { datos } = await peticion(`${API_URL}/${id}`);
        llenarFormulario(datos);
        ocultarMensaje();
        campoNombre.focus();
        formulario.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        mostrarError(error);
        if (error.status === 404) await cargarTodos(true);
    }
}

async function eliminarFuncionario(f) {
    const confirmado = window.confirm(`¿Seguro que deseas eliminar a ${f.nombre} (ID ${f.id})?\nEsta acción no se puede deshacer.`);
    if (!confirmado) {
        mostrarMensaje('Eliminación cancelada. El registro se conservó.', 'info');
        return;
    }

    try {
        await peticion(`${API_URL}/${f.id}`, { method: 'DELETE' });
        if (campoId.value === String(f.id)) limpiarFormulario();
        mostrarMensaje(`Se eliminó a ${f.nombre} del directorio.`, 'exito');
    } catch (error) {
        mostrarError(error);
    }
    await cargarTodos(true);
}

// ---------- Eventos ----------

formulario.addEventListener('submit', guardarFuncionario);

btnLimpiar.addEventListener('click', () => {
    limpiarFormulario();
    ocultarMensaje();
    campoNombre.focus();
});

btnTodos.addEventListener('click', () => {
    document.getElementById('buscar-id').value = '';
    document.getElementById('buscar-nombre').value = '';
    document.getElementById('buscar-departamento').value = '';
    cargarTodos();
});

document.getElementById('form-id').addEventListener('submit', (e) => {
    e.preventDefault();
    const valor = document.getElementById('buscar-id').value.trim();
    if (!/^\d+$/.test(valor) || Number(valor) < 1) {
        mostrarMensaje('Escribe un ID numérico válido (entero mayor que 0).', 'error');
        return;
    }
    buscarPorId(valor);
});

document.getElementById('form-nombre').addEventListener('submit', (e) => {
    e.preventDefault();
    const valor = document.getElementById('buscar-nombre').value.trim();
    if (!valor) {
        mostrarMensaje('Escribe una parte del nombre para buscar.', 'error');
        return;
    }
    buscarPorFiltro('nombre', valor, `Nombre que contiene "${valor}"`);
});

document.getElementById('form-departamento').addEventListener('submit', (e) => {
    e.preventDefault();
    const valor = document.getElementById('buscar-departamento').value.trim();
    if (!valor) {
        mostrarMensaje('Escribe el nombre del departamento para filtrar.', 'error');
        return;
    }
    buscarPorFiltro('departamento', valor, `Departamento "${valor}"`);
});

formLogin.addEventListener('submit', iniciarSesion);
document.getElementById('btn-salir').addEventListener('click', () => cerrarSesion('Cerraste sesión.'));

// Al abrir la página: si ya hay sesión se muestra el listado completo; si no, el inicio de sesión
if (sesionActual?.auth) {
    mostrarApp();
    cargarTodos();
} else {
    mostrarLogin();
}
