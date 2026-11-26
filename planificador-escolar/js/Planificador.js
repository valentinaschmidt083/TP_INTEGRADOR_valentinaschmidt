/**
 * CLASE Planificador
 * Es el "cerebro" de la app: coordina Materias y Tareas y se encarga de la
 * PERSISTENCIA con localStorage. La interfaz solo habla con esta clase.
 * Relación: el Planificador tiene muchas Materias; cada Materia tiene muchas Tareas.
 */
class Planificador {
  #materias = [];
  #claveStorage;

  constructor(claveStorage = "planificadorEscolar_v1") {
    this.#claveStorage = claveStorage;
    this.cargar();
  }

  get materias() { return [...this.#materias]; }

  // ---------- MATERIAS ----------
  crearMateria(nombre, color) {
    const existe = this.#materias.some((m) => m.nombre.toLowerCase() === String(nombre).trim().toLowerCase());
    if (existe) throw new Error("Ya existe una materia con ese nombre.");
    const materia = new Materia({ nombre, color });
    this.#materias.push(materia);
    this.guardar();
    return materia;
  }

  obtenerMateria(id) { return this.#materias.find((m) => m.id === id) ?? null; }

  eliminarMateria(id) {
    this.#materias = this.#materias.filter((m) => m.id !== id); // se van también sus tareas
    this.guardar();
  }

  // ---------- TAREAS ----------
  agregarTarea(datos) {
    const materia = this.obtenerMateria(datos.materiaId);
    if (!materia) throw new Error("Elegí una materia para la tarea.");
    const tarea = new Tarea(datos); // si hay datos inválidos, los setters lanzan error
    materia.agregarTarea(tarea);
    this.guardar();
    return tarea;
  }

  /** Busca una tarea en todas las materias. Devuelve { materia, tarea } o null */
  buscarTarea(idTarea) {
    for (const materia of this.#materias) {
      const tarea = materia.obtenerTarea(idTarea);
      if (tarea) return { materia, tarea };
    }
    return null;
  }

  editarTarea(idTarea, datos) {
    const encontrada = this.buscarTarea(idTarea);
    if (!encontrada) throw new Error("La tarea no existe.");
    const { materia, tarea } = encontrada;
    // Se modifican mediante setters (con validación)
    tarea.titulo = datos.titulo;
    tarea.descripcion = datos.descripcion;
    tarea.fechaEntrega = datos.fechaEntrega;
    tarea.prioridad = datos.prioridad;
    // Si cambió de materia, la movemos
    if (datos.materiaId && datos.materiaId !== materia.id) {
      const destino = this.obtenerMateria(datos.materiaId);
      if (!destino) throw new Error("La materia elegida no existe.");
      materia.quitarTarea(idTarea);
      destino.agregarTarea(tarea);
    }
    this.guardar();
  }

  eliminarTarea(idTarea) {
    const encontrada = this.buscarTarea(idTarea);
    if (encontrada) { encontrada.materia.quitarTarea(idTarea); this.guardar(); }
  }

  alternarTarea(idTarea) {
    const encontrada = this.buscarTarea(idTarea);
    if (encontrada) { encontrada.tarea.alternarCompletada(); this.guardar(); }
  }

  /**
   * Devuelve las tareas filtradas y ordenadas, junto con su materia.
   * filtros: { estado: todas|pendientes|completadas|vencidas, materiaId, texto, orden: fecha|prioridad }
   */
  listarTareas({ estado = "todas", materiaId = "", texto = "", orden = "fecha" } = {}) {
    let lista = [];
    this.#materias.forEach((m) => m.tareas.forEach((t) => lista.push({ materia: m, tarea: t })));

    if (materiaId) lista = lista.filter((x) => x.materia.id === materiaId);
    if (estado === "pendientes") lista = lista.filter((x) => !x.tarea.completada);
    if (estado === "completadas") lista = lista.filter((x) => x.tarea.completada);
    if (estado === "vencidas") lista = lista.filter((x) => x.tarea.estaVencida());
    const q = texto.trim().toLowerCase();
    if (q) lista = lista.filter((x) => (x.tarea.titulo + " " + x.tarea.descripcion).toLowerCase().includes(q));

    const peso = { alta: 0, media: 1, baja: 2 };
    lista.sort((a, b) => {
      if (a.tarea.completada !== b.tarea.completada) return a.tarea.completada ? 1 : -1; // pendientes primero
      if (orden === "prioridad") {
        return peso[a.tarea.prioridad] - peso[b.tarea.prioridad] || a.tarea.fechaEntrega.localeCompare(b.tarea.fechaEntrega);
      }
      return a.tarea.fechaEntrega.localeCompare(b.tarea.fechaEntrega);
    });
    return lista;
  }

  /** Números generales para el resumen */
  estadisticas() {
    const e = { total: 0, completadas: 0, pendientes: 0, vencidas: 0, progreso: 0 };
    this.#materias.forEach((m) => {
      e.total += m.cantidadTotal();
      e.completadas += m.cantidadCompletadas();
      e.vencidas += m.cantidadVencidas();
    });
    e.pendientes = e.total - e.completadas;
    e.progreso = e.total === 0 ? 0 : Math.round((e.completadas / e.total) * 100);
    return e;
  }

  // ---------- PERSISTENCIA (localStorage) ----------
  guardar() {
    try {
      localStorage.setItem(this.#claveStorage, JSON.stringify(this.#materias.map((m) => m.toJSON())));
    } catch (e) {
      console.error("No se pudo guardar en localStorage:", e);
    }
  }

  cargar() {
    try {
      const guardado = localStorage.getItem(this.#claveStorage);
      if (guardado) {
        this.#materias = JSON.parse(guardado).map((m) => Materia.fromJSON(m));
        return;
      }
    } catch (e) {
      console.error("Datos guardados inválidos, se empieza de cero:", e);
      this.#materias = [];
    }
    this.#cargarEjemplo(); // primera vez que se abre la app
  }

  /** Datos de ejemplo para que la app no arranque vacía */
  #cargarEjemplo() {
    const prog = this.crearMateria("Programación IV", "#1f3a93");
    const mate = this.crearMateria("Matemática", "#c2410c");
    const enDias = (n) => {
      const d = new Date(); d.setDate(d.getDate() + n);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    this.agregarTarea({ titulo: "Entregar trabajo integrador", descripcion: "App web con POO y localStorage", fechaEntrega: enDias(1), prioridad: "alta", materiaId: prog.id });
    this.agregarTarea({ titulo: "Grabar el video de presentación", fechaEntrega: enDias(1), prioridad: "media", materiaId: prog.id });
    this.agregarTarea({ titulo: "Practicar funciones", descripcion: "Guía 4, ejercicios 1 al 10", fechaEntrega: enDias(-2), prioridad: "media", materiaId: mate.id });
  }
}
