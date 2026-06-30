# Guia de notas de parche

Las notas visibles en la app se escriben en `src/components/PatchNotesContent.jsx`.

Ese archivo exporta componentes especiales para evitar repetir HTML de presentacion. No edites estilos inline: los estilos viven en `src/styles.css`.

## Estructura base

Cada version debe estar agrupada con `PatchNotesPatch`. El prop `patch` es el numero de version. La cabecera se genera automaticamente como:

```html
<subheader><span class="version-tag">vxxx</span></subheader>
```

Ejemplo:

```jsx
<PatchNotesPatch patch="1.3.0">
  <ul>
    <New> Nueva funcionalidad.</New>
    <Buff> Mejora de personaje.</Buff>
    <Nerf> Reduccion de poder.</Nerf>
    <li>Fix o ajuste general sin etiqueta.</li>
  </ul>
</PatchNotesPatch>
```

## Componentes especiales

- `PatchNotesPatch`: agrupa todos los cambios de una version y crea la cabecera `v{patch}`.
- `CharacterPatch`: agrupa cambios de un personaje. Recibe `id` y crea automaticamente imagen y nombre.
- `New`: crea un item con estructura `<li><span class="patch-tag new">Nuevo</span> xxx</li>`.
- `Buff`: crea un item con estructura `<li><span class="patch-tag buff">Buff</span> xxx</li>`.
- `Nerf`: crea un item con estructura `<li><span class="patch-tag nerf">Nerf</span> xxx</li>`.

## Cambios por personaje

Usa `CharacterPatch` cuando varios cambios pertenecen al mismo personaje. El `id` debe coincidir con el id del personaje en `shared/characters/*/index.js`.

```jsx
<CharacterPatch id="naruto">
  <Buff> Oodama Rasengan ahora hace 40 de dano.</Buff>
  <New> Poder del Kyubi agrega una nueva mecanica.</New>
</CharacterPatch>
```

`CharacterPatch` genera internamente:

```html
<character-patch character="naruto">
  <img ...>
  <strong>Naruto Uzumaki</strong>
  <ul>...</ul>
</character-patch>
```

## Reglas de escritura

- Agrega las versiones nuevas arriba de las anteriores.
- Usa `New`, `Buff` o `Nerf` solo cuando el cambio corresponda claramente a esa categoria.
- Para fixes, ajustes visuales o cambios tecnicos, usa `<li>Texto del cambio.</li>`.
- Mantene el texto corto y orientado al cambio jugable o visible.
- Si agregas un personaje nuevo, primero debe existir en `shared/characters` y tener imagen en `src/assets/characters`.
