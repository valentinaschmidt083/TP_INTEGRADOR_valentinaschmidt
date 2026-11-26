/**
 * CLASE Interfaz
 * Conecta el HTML con las clases de lógica (Planificador, Materia, Tarea).
 * No guarda datos propios: pide todo al Planificador y dibuja el resultado.
 */
class Interfaz {
  #plan;

  constructor(planificador) {
    this.#plan = planificador;
    this.#cacheElementos();
    this.#eventos();
    this.refrescar();
  }

  // ---------- utilidades ----------
  /** Escapa texto para que lo escrito por el usuario no se interprete como HTML */
  static esc(texto) {
    return String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  static formatearFecha(iso) {
    const [a, m, d] = iso.split("-");
    return `${d}/${m}/${a}`;
  }

  #cacheElementos() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      resumen: $("resumen"), mensaje: $("mensaje"),
      formMateria: $("form-materia"), materiaNombre: $("materia-nombre"), materiaColor: $("materia-color"),
      listaMaterias: $("lista-materias"),
      formTarea: $("form-tarea"), tareaId: $("tarea-id"), titulo: $("tarea-titulo"), desc: $("tarea-desc"),
      tareaMateria: $("tarea-materia"), fecha: $("tarea-fecha"), prioridad: $("tarea-prioridad"),
      btnGuardar: $("btn-guardar"), btnCancelar: $("btn-cancelar"), tituloForm: $("t-form-tarea"),
      fTexto: $("f-texto"), fEstado: $("f-estado"), fMateria: $("f-materia"), fOrden: $("f-orden"),
      listaTareas: $("lista-tareas"),
    };
  }

  #eventos() {
    this.el.formMateria.addEventListener("submit", (e) => { e.preventDefault(); this.#agregarMateria(); });
    this.el.formTarea.addEventListener("submit", (e) => { e.preventDefault(); this.#guardarTarea(); });
    this.el.btnCancelar.addEventListener("click", () => this.#salirDeEdicion());
    [this.el.fTexto, this.el.fEstado, this.el.fMateria, this.el.fOrden].forEach((f) =>
      f.addEventListener("input", () => this.#dibujarTareas()));

    // Delegación de eventos: un solo listener para todos los botones de cada lista
    this.el.listaTareas.addEventListener("click", (e) => this.#clickTarea(e));
    this.el.listaMaterias.addEventListener("click", (e) => this.#clickMateria(e));
  }

  mostrarMensaje(texto, esError = false) {
    this.el.mensaje.textContent = texto;
    this.el.mensaje.className = "mensaje " + (esError ? "error" : "ok");
    clearTimeout(this._t);
    this._t = setTimeout(() => { this.el.mensaje.textContent = ""; this.el.mensaje.className = "mensaje"; }, 4000);
  }

  // ---------- acciones ----------
  #agregarMateria() {
    try {
      this.#plan.crearMateria(this.el.materiaNombre.value, this.el.materiaColor.value);
      this.el.formMateria.reset();
      this.mostrarMensaje("Materia agregada.");
      this.refrescar();
    } catch (err) { this.mostrarMensaje(err.message, true); }
  }

  #guardarTarea() {
    const datos = {
      titulo: this.el.titulo.value, descripcion: this.el.desc.value, materiaId: this.el.tareaMateria.value,
      fechaEntrega: this.el.fecha.value, prioridad: this.el.prioridad.value,
    };
    try {
      const id = this.el.tareaId.value;
      if (id) { this.#plan.editarTarea(id, datos); this.mostrarMensaje("Tarea actualizada."); }
      else { this.#plan.agregarTarea(datos); this.mostrarMensaje("Tarea agregada."); }
      this.#salirDeEdicion();
      this.refrescar();
    } catch (err) { this.mostrarMensaje(err.message, true); }
  }

  #clickTarea(e) {
    const boton = e.target.closest("button[data-accion]");
    if (!boton) return;
    const id = boton.dataset.id;
    if (boton.dataset.accion === "alternar") this.#plan.alternarTarea(id);
    if (boton.dataset.accion === "eliminar") {
      if (!confirm("¿Eliminar esta tarea?")) return;
      this.#plan.eliminarTarea(id);
      this.mostrarMensaje("Tarea eliminada.");
    }
    if (boton.dataset.accion === "editar") { this.#entrarEnEdicion(id); return; }
    this.refrescar();
  }

  #clickMateria(e) {
    const boton = e.target.closest("button[data-accion='eliminar-materia']");
    if (!boton) return;
    const materia = this.#plan.obtenerMateria(boton.dataset.id);
    if (!materia) return;
    if (!confirm(`¿Eliminar "${materia.nombre}" y sus ${materia.cantidadTotal()} tareas?`)) return;
    this.#plan.eliminarMateria(materia.id);
    this.mostrarMensaje("Materia eliminada.");
    this.refrescar();
  }

  #entrarEnEdicion(id) {
    const r = this.#plan.buscarTarea(id);
    if (!r) return;
    this.el.tareaId.value = id;
    this.el.titulo.value = r.tarea.titulo;
    this.el.desc.value = r.tarea.descripcion;
    this.el.tareaMateria.value = r.materia.id;
    this.el.fecha.value = r.tarea.fechaEntrega;
    this.el.prioridad.value = r.tarea.prioridad;
    this.el.tituloForm.textContent = "Editar tarea";
    this.el.btnGuardar.textContent = "Guardar cambios";
    this.el.btnCancelar.hidden = false;
    this.el.titulo.focus();
    this.el.formTarea.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  #salirDeEdicion() {
    this.el.formTarea.reset();
    this.el.tareaId.value = "";
    this.el.tituloForm.textContent = "Nueva tarea";
    this.el.btnGuardar.textContent = "Agregar tarea";
    this.el.btnCancelar.hidden = true;
    this.#precargarFecha();
  }

  #precargarFecha() { this.el.fecha.value = Tarea.hoy(); }

  // ---------- dibujo ----------
  refrescar() {
    this.#dibujarResumen();
    this.#dibujarMaterias();
    this.#dibujarSelects();
    this.#dibujarTareas();
    if (!this.el.fecha.value) this.#precargarFecha();
  }

  #dibujarResumen() {
    const e = this.#plan.estadisticas();
    const tarjeta = (n, txt, clase = "") => `<div class="dato ${clase}"><strong>${n}</strong><span>${txt}</span></div>`;
    this.el.resumen.innerHTML =
      tarjeta(e.pendientes, "pendientes") +
      tarjeta(e.vencidas, "vencidas", e.vencidas ? "alerta" : "") +
      tarjeta(e.completadas, "completadas") +
      `<div class="dato dato-progreso"><strong>${e.progreso}%</strong><span>de avance general</span>
         <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${e.progreso}" aria-label="Avance general"><i style="width:${e.progreso}%"></i></div></div>`;
  }

  #dibujarMaterias() {
    const materias = this.#plan.materias;
    if (!materias.length) {
      this.el.listaMaterias.innerHTML = `<li class="vacio">Todavía no hay materias. Agregá la primera arriba.</li>`;
      return;
    }
    this.el.listaMaterias.innerHTML = materias.map((m) => `
      <li class="materia" style="--c:${m.color}">
        <div class="materia-cab">
          <strong>${Interfaz.esc(m.nombre)}</strong>
          <button class="btn btn-chico" data-accion="eliminar-materia" data-id="${m.id}" aria-label="Eliminar materia ${Interfaz.esc(m.nombre)}">Eliminar</button>
        </div>
        <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${m.progreso()}" aria-label="Avance de ${Interfaz.esc(m.nombre)}"><i style="width:${m.progreso()}%"></i></div>
        <small>${m.cantidadCompletadas()} de ${m.cantidadTotal()} hechas${m.cantidadVencidas() ? ` · <b class="txt-alerta">${m.cantidadVencidas()} vencida(s)</b>` : ""}</small>
      </li>`).join("");
  }

  #dibujarSelects() {
    const materias = this.#plan.materias;
    const opciones = materias.map((m) => `<option value="${m.id}">${Interfaz.esc(m.nombre)}</option>`).join("");
    const previoForm = this.el.tareaMateria.value;
    const previoFiltro = this.el.fMateria.value;
    this.el.tareaMateria.innerHTML = opciones || `<option value="">Creá una materia primero</option>`;
    this.el.fMateria.innerHTML = `<option value="">Todas</option>` + opciones;
    if (materias.some((m) => m.id === previoForm)) this.el.tareaMateria.value = previoForm;
    if (materias.some((m) => m.id === previoFiltro)) this.el.fMateria.value = previoFiltro;
  }

  #dibujarTareas() {
    const lista = this.#plan.listarTareas({
      estado: this.el.fEstado.value, materiaId: this.el.fMateria.value,
      texto: this.el.fTexto.value, orden: this.el.fOrden.value,
    });
    if (!lista.length) {
      this.el.listaTareas.innerHTML = `<li class="vacio">No hay tareas para mostrar. Probá otro filtro o agregá una tarea nueva.</li>`;
      return;
    }
    this.el.listaTareas.innerHTML = lista.map(({ materia, tarea }) => {
      const dias = tarea.diasRestantes();
      let aviso = "";
      if (tarea.completada) aviso = "Completada";
      else if (dias < 0) aviso = `Venció hace ${-dias} día(s)`;
      else if (dias === 0) aviso = "Vence hoy";
      else if (dias === 1) aviso = "Vence mañana";
      else aviso = `Faltan ${dias} días`;
      const clases = ["tarea", tarea.completada ? "hecha" : "", tarea.estaVencida() ? "vencida" : ""].join(" ");
      const t = Interfaz.esc(tarea.titulo);
      return `
      <li class="${clases}" style="--c:${materia.color}">
        <div class="tarea-cuerpo">
          <h3>${t}</h3>
          ${tarea.descripcion ? `<p>${Interfaz.esc(tarea.descripcion)}</p>` : ""}
          <p class="meta"><span class="etiqueta">${Interfaz.esc(materia.nombre)}</span>
            <span class="prio prio-${tarea.prioridad}">Prioridad ${tarea.prioridad}</span>
            <span>${Interfaz.formatearFecha(tarea.fechaEntrega)} · ${aviso}</span></p>
        </div>
        <div class="tarea-acciones">
          <button class="btn btn-chico" data-accion="alternar" data-id="${tarea.id}" aria-label="${tarea.completada ? "Marcar como pendiente" : "Marcar como hecha"}: ${t}">${tarea.completada ? "Reabrir" : "Hecha"}</button>
          <button class="btn btn-chico" data-accion="editar" data-id="${tarea.id}" aria-label="Editar ${t}">Editar</button>
          <button class="btn btn-chico btn-peligro" data-accion="eliminar" data-id="${tarea.id}" aria-label="Eliminar ${t}">Eliminar</button>
        </div>
      </li>`;
    }).join("");
  }
}

// Punto de entrada: se crea el Planificador (carga localStorage) y la Interfaz
document.addEventListener("DOMContentLoaded", () => {
  const planificador = new Planificador();
  new Interfaz(planificador);
});
