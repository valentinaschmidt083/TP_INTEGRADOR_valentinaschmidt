/**
 * CLASE Tarea
 * Representa un pendiente escolar (trabajo práctico, estudiar para una prueba, etc.).
 * ENCAPSULAMIENTO: todas las propiedades son privadas (#) y solo se acceden con
 * getters y setters. Los setters validan los datos para que nunca queden valores inválidos.
 */
class Tarea {
  // Propiedades privadas
  #id;
  #titulo;
  #descripcion;
  #fechaEntrega; // formato "AAAA-MM-DD"
  #prioridad;    // "baja" | "media" | "alta"
  #completada;
  #materiaId;

  static PRIORIDADES = ["baja", "media", "alta"];

  constructor({ id = null, titulo, descripcion = "", fechaEntrega, prioridad = "media", completada = false, materiaId }) {
    this.#id = id ?? Tarea.generarId();
    // Usamos los setters para que la validación también se aplique al crear
    this.titulo = titulo;
    this.descripcion = descripcion;
    this.fechaEntrega = fechaEntrega;
    this.prioridad = prioridad;
    this.completada = completada;
    this.materiaId = materiaId;
  }

  /** Genera un id único simple */
  static generarId() {
    return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /** Devuelve la fecha de hoy como "AAAA-MM-DD" (hora local) */
  static hoy() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  // ---------- GETTERS y SETTERS ----------
  get id() { return this.#id; } // el id no tiene setter: no se puede cambiar

  get titulo() { return this.#titulo; }
  set titulo(valor) {
    if (typeof valor !== "string" || valor.trim().length < 3) {
      throw new Error("El título debe tener al menos 3 caracteres.");
    }
    this.#titulo = valor.trim();
  }

  get descripcion() { return this.#descripcion; }
  set descripcion(valor) { this.#descripcion = String(valor ?? "").trim(); }

  get fechaEntrega() { return this.#fechaEntrega; }
  set fechaEntrega(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor ?? "")) {
      throw new Error("Elegí una fecha de entrega válida.");
    }
    this.#fechaEntrega = valor;
  }

  get prioridad() { return this.#prioridad; }
  set prioridad(valor) {
    if (!Tarea.PRIORIDADES.includes(valor)) {
      throw new Error("La prioridad debe ser baja, media o alta.");
    }
    this.#prioridad = valor;
  }

  get completada() { return this.#completada; }
  set completada(valor) { this.#completada = Boolean(valor); }

  get materiaId() { return this.#materiaId; }
  set materiaId(valor) {
    if (!valor) throw new Error("La tarea debe pertenecer a una materia.");
    this.#materiaId = valor;
  }

  // ---------- MÉTODOS ----------
  /** Marca como hecha / pendiente */
  alternarCompletada() { this.#completada = !this.#completada; }

  /** ¿Pasó la fecha de entrega y sigue pendiente? */
  estaVencida() { return !this.#completada && this.#fechaEntrega < Tarea.hoy(); }

  /** Días que faltan para la entrega (negativo si ya pasó) */
  diasRestantes() {
    const [a, m, d] = this.#fechaEntrega.split("-").map(Number);
    const entrega = new Date(a, m - 1, d);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.round((entrega - hoy) / 86400000);
  }

  /** Convierte la tarea en un objeto simple para guardarlo en localStorage */
  toJSON() {
    return {
      id: this.#id, titulo: this.#titulo, descripcion: this.#descripcion,
      fechaEntrega: this.#fechaEntrega, prioridad: this.#prioridad,
      completada: this.#completada, materiaId: this.#materiaId,
    };
  }

  /** Reconstruye una Tarea desde un objeto guardado */
  static fromJSON(obj) { return new Tarea(obj); }
}
