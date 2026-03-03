# Apollo 11 Web

Simulación web interactiva de la misión Apolo 11. Experimenta el viaje histórico desde el lanzamiento hasta el alunizaje y regreso a la Tierra.

## Requisitos

- Node.js 18+
- Navegador moderno (Chrome, Firefox, Safari, Edge)

## Instalación

```bash
npm install
```

## Ejecutar el juego

```bash
npm run dev
```

Luego abre `http://localhost:5173` en tu navegador.

## Cómo Jugar

El juego reproduce las fases principales de la misión Apolo 11:

1. **Lanzamiento** - Despegue desde Cabo Cañaveral
2. **Órbita Terrestre** - Inserción en órbita alrededor de la Tierra
3. **Trayectoria Translunar** - Viaje hacia la Luna
4. **Órbita Lunar** - Inserción en órbita lunar
5. **Descenso Lunar** - Aterrizaje en la superficie lunar
6. **Superficie Lunar** - Exploración lunar
7. **Ascenso Lunar** - Retorno del módulo lunar
8. **Reentrada** - Regreso a la Tierra
9. **Aterrizaje** - Splashedown en el océano

## Controles

### Controles Generales

| Tecla | Acción |
|-------|--------|
| `H` | Mostrar/ocultar ayuda de controles |
| `C` / `V` | Cambiar cámara |
| `M` | Silenciar alarmas |
| `W` | Time warp (acelerar tiempo) |

### Lanzamiento

| Tecla | Acción |
|-------|--------|
| `↑` | Aumentar propulsión |
| `↓` | Disminuir propulsión |
| `Espacio` | Iniciar lanzamiento |
| `S` | Separación de etapas / Inserción orbital |

### Descenso Lunar

| Tecla | Acción |
|-------|--------|
| `↑` | Aumentar propulsión (aguantar para más potencia) |
| `↓` | Disminuir propulsión |
| `B` | Freno máximo |

### Superficie Lunar

| Tecla | Acción |
|-------|--------|
| `Espacio` / `L` | Iniciar ascenso |
| `E` | Iniciar exploración |

### Órbita Lunar / Translunar

| Tecla | Acción |
|-------|--------|
| `T` | Iniciar inyección translunar (TLI) / Iniciar TEI |
| `L` | Iniciar órbita lunar |
| `F` | Iniciar retorno libre |
| `R` | Iniciar inyección trans terrestre (TEI) |

### Reentrada

| Tecla | Acción |
|-------|--------|
| `P` | Desplegar paracaídas |

### Exploración (KSC y Lunar)

Usa las teclas WASD o flechas para moverte.

## Construcción

```bash
npm run build
```
