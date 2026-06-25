# Shinobi Arena

Shinobi Arena es un juego web por turnos inspirado en duelos de equipos ninja. Es un proyecto personal hecho por hobby, pensado para experimentar con mecanicas de combate, seleccion de objetivos, gestion de recursos y partidas en tiempo real entre dos jugadores.

## Descripcion

Cada jugador crea o se une a una sala, elige un equipo de 3 personajes y confirma cuando esta listo. Al comenzar la partida, los jugadores alternan turnos para usar habilidades, administrar chakra, preparar una cola de acciones y reaccionar a los efectos activos en el campo.

El objetivo es derrotar al equipo rival usando combinaciones de dano, curacion, escudos, aturdimientos, invulnerabilidad, manipulacion de chakra y cooldowns.

## Caracteristicas

- Partidas 1 vs 1 en salas con codigo.
- Seleccion de equipo con personajes y habilidades inspeccionables.
- Combate 3 vs 3 por turnos.
- Sistema de chakra por tipos: taijutsu, ninjutsu, bloodline y genjutsu.
- Intercambio de chakra durante el turno.
- Cola de habilidades con reordenamiento y cancelacion.
- Seleccion visual de objetivos elegibles.
- Cooldowns por habilidad.
- Limite de una habilidad por personaje por turno.
- Efectos de combate: dano, curacion, escudo, reduccion de dano, stun, invulnerabilidad, ganar chakra y eliminar chakra.
- Chat en sala de espera y durante la partida.
- Registro de batalla con historial scrolleable.
- Sonidos de notificacion de turno y mensajes, con control de volumen.

## Stack

- React
- Vite
- Socket.IO
- Express
- Node.js

## Como correrlo localmente

Instalar dependencias:

```bash
npm install
```

Levantar cliente y servidor en modo desarrollo:

```bash
npm run dev
```

Por defecto:

- Cliente: `http://127.0.0.1:5173`
- Servidor: `http://127.0.0.1:3002`

## Scripts utiles

```bash
npm run dev
npm run build
npm run preview
npm start
npm test
```

## Estado del proyecto

Este proyecto esta en desarrollo activo como hobby. Varias mecanicas, balance de personajes, UI y reglas pueden cambiar con frecuencia mientras se prueban nuevas ideas.

