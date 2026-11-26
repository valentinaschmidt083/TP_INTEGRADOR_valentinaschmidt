/**
 * CLASE Materia
 * Representa una materia (Matemática, Programación IV, etc.) y CONTIENE sus tareas.
 * Relación: una Materia tiene muchas Tareas (composición).
 */
class Materia {
  #id;
  #nombre;
  #color;
  #tareas; // arreglo de objetos Tarea

  constructor({ id = null, nombre, color = "#1f3a93", tareas = [] }) {
    this.#id = id ?? "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    this.nombre = nombre;
    this.color = color;
    this.#tareas = [];
    tareas.forEach((t) => this.#tareas.push(t instanceof Tarea ? t : Tarea.fromJSON(t)));
  }

  // ---------- GETTERS y SETTERS ----------
  get id() { return this.#id; }

  get nombre() { return this.#nombre; }
  set nombre(valor) {
    if (typeof valor !== "string" || valor.trim().length < 2) {
      throw new Error("El nombre de la materia debe tener al menos 2 caracteres.");
    }
    this.#nombre = valor.trim();
  }

  get color() { return this.#color; }
  set color(valor) {
    if (!/^#[0-9a-fA-F]{6}$/.test(valor ?? "")) throw new Error("Color inválido.");
    this.#color = valor;
  }

  /** Devuelve una COPIA del arreglo: así nadie puede modificarlo desde afuera */
  get tareas() { return [...this.#tareas]; }

  // ---------- MÉTODOS ----------
  agregarTarea(tarea) {
    if (!(tarea instanceof Tarea)) throw new Error("Solo se pueden agregar objetos Tarea.");
    tarea.materiaId = this.#id; // la tarea queda vinculada a esta materia
    this.#tareas.push(tarea);
  }

  obtenerTarea(idTarea) { return this.#tareas.find((t) => t.id === idTarea) ?? null; }

  /** Quita la tarea y la devuelve (o null si no estaba) */
  quitarTarea(idTarea) {
    const i = this.#tareas.findIndex((t) => t.id === idTarea);
    return i === -1 ? null : this.#tareas.splice(i, 1)[0];
  }

  cantidadTotal() { return this.#tareas.length; }
  cantidadCompletadas() { return this.#tareas.filter((t) => t.completada).length; }
  cantidadPendientes() { return this.cantidadTotal() - this.cantidadCompletadas(); }
  cantidadVencidas() { return this.#tareas.filter((t) => t.estaVencida()).length; }

  /** Porcentaje de tareas completadas (0 a 100) */
  progreso() {
    const total = this.cantidadTotal();
    return total === 0 ? 0 : Math.round((this.cantidadCompletadas() / total) * 100);
  }

  toJSON() {
    return { id: this.#id, nombre: this.#nombre, color: this.#color, tareas: this.#tareas.map((t) => t.toJSON()) };
  }

  static fromJSON(obj) { return new Materia(obj); }
}
