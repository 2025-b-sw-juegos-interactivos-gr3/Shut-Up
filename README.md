# 🤫 Shut Up! - Immersive Web Horror

> **Silence is your only survival mechanism.**

![Project Status](https://img.shields.io/badge/Status-In%20Development-orange?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Engine-Babylon.js-yellow?style=for-the-badge)
![Language](https://img.shields.io/badge/Language-TypeScript-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

## 📖 Descripción del Proyecto

**Shut Up!** es una experiencia de terror psicológico en primera persona 3D desarrollada para la web. Inspirado en mecánicas de juegos como *Don't Scream*, este proyecto utiliza la **Web Audio API** para romper la cuarta pared: el juego escucha al jugador a través de su micrófono real.

El objetivo es atravesar un entorno claustrofóbico y procedimental sin emitir sonido. Si el jugador grita o hace ruido fuerte en la vida real, la entidad del juego lo detecta y la partida termina instantáneamente.

---

## ⚙️ Arquitectura de Software

Para garantizar la escalabilidad y permitir el desarrollo en paralelo entre los integrantes del equipo, hemos implementado una **Arquitectura Orientada a Eventos (Event-Driven)** combinada con una **Máquina de Estados Finitos (FSM)**.

### Patrones de Diseño Utilizados
* **Observer (Pub/Sub):** Implementado en el `EventBus`. Desacopla los sistemas de entrada (micrófono/teclado) de la lógica de juego.
* **State Pattern:** Gestión robusta del flujo del juego (`Menu`, `Playing`, `GameOver`).
* **Singleton:** Instancia única para el `GameEngine` y el `EventBus`.
* **Factory Method:** Generación dinámica de eventos de susto (*ScareFactory*).

### Diagrama de Comunicación

```mermaid
graph TD
    A[AudioSystem] -->|Emits: NOISE_DETECTED| B(EventBus)
    C[InputSystem] -->|Emits: PLAYER_MOVE| B
    B -->|Notifies| D[ThreatController]
    B -->|Notifies| E[PlayerController]
    
    D -->|If Threshold Exceeded| F{Game State}
    F -->|Trigger| G[GameOverState]
```

---

## 📂 Estructura del Repositorio

El proyecto sigue una estructura orientada a dominios para mantener la separación de responsabilidades:

```text
/shut-up-game
│
├── /src
│   ├── /core           # Núcleo del Engine (EventBus, StateMachine)
│   ├── /interfaces     # Contratos TypeScript (IState, IScare, IConfig)
│   ├── /systems        # Lógica pura sin estado (AudioAnalyzer, InputHandler)
│   ├── /states         # Estados del juego (MenuState, PlayState, GameOverState)
│   ├── /entities       # Entidades del mundo (Player, Hallway, Monster)
│   ├── /logic          # Reglas de negocio (ScareFactory, Rules)
│   └── main.ts         # Punto de entrada
│
├── /public             # Assets (Modelos .glb, Sonidos, Texturas)
├── package.json        # Dependencias
└── tsconfig.json       # Configuración estricta de TypeScript
```

---

## 🚀 Instalación y Despliegue

### Prerrequisitos
* **Node.js** (v16 o superior)
* **Navegador Web** con soporte para WebGL 2.0 y permisos de micrófono.

### Pasos
1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/2025-b-sw-juegos-interactivos-gr3/Shut-Up.git
    cd Shut-Up
    ```

2.  **Instalar dependencias:**
    ```bash
    cd shut-up-game
    npm install
    ```

3.  **Ejecutar entorno de desarrollo:**
    ```bash
    npm run dev
    ```
    El prototipo estará disponible en `http://localhost:8080`.

---

## 🎯 Vertical Slice (Prototipo Jugable)

Este repo incluye un **Vertical Slice** enfocado en mecánicas + estética:

- Movimiento en primera persona con colisiones
- Micrófono (calibración + detección de ruido) → Game Over inmediato
- Temporizador condicional: solo avanza si el jugador se mueve
- HUD diegético estilo VHS/Bodycam

### Cómo jugar

1. Abre `http://localhost:8080`
2. Click en **Conectar Micrófono** y acepta permisos
3. Click en **Calibrar (3s)** y mantén silencio
4. Click en **Iniciar** y avanza hasta el final del pasillo

Controles: `WASD` mover, Mouse mirar, Click para capturar puntero, `F` linterna, `R` rebobinar/reintentar, `P` pausa.

Extra (screamers reales):
- Imágenes: `shut-up-game/public/screamers/<id>.svg` (ej: `screamer_1.svg`)
- Audio: `shut-up-game/public/sfx/<id>.ogg` (o `.mp3`/`.wav`)

Si no existe el audio del screamer, el juego usa un stinger sintético como fallback.

Entregable escrito: [VERTICAL_SLICE.md](VERTICAL_SLICE.md)

---

## 📋 Gestión del Proyecto

Utilizamos **GitHub Projects** con metodología Kanban para la gestión de tareas.

* **Tablero de Proyecto:** https://github.com/orgs/2025-b-sw-juegos-interactivos-gr3/projects/2

### Nomenclatura de Tickets
Para mantener la trazabilidad, utilizamos los siguientes prefijos en los Issues:
* `TAR-###`: **Tareas Administrativas** (Gestión, Documentación, Diseño).
* `IM-###`: **Implementación** (Código, Bugs, Features).

---

## 🎮 Controles

| Acción | Entrada |
| :--- | :--- |
| **Moverse** | `W`, `A`, `S`, `D` |
| **Mirar** | Mouse |
| **Interactuar** | `E` o `Click Izquierdo` |
| **Sobrevivir** | **MANTENER SILENCIO ABSOLUTO** 🎤 |

---

## 🛠 Tecnologías

* [Babylon.js](https://www.babylonjs.com/) - Motor de renderizado 3D.
* [TypeScript](https://www.typescriptlang.org/) - Lenguaje principal.
* [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - Procesamiento de señales de audio (FFT).
* [Vite](https://vitejs.dev/) - Entorno de desarrollo y bundler.

---

## 👥 Equipo de Desarrollo

Estudiantes de Ingeniería de Software - EPN:

* **Alexander Morales** - *PM y backend*
* **Alex Escobar** - *Frontend*

---
