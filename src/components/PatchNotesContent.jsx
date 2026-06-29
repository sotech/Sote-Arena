import React from "react";
import { getCharacterById } from "../../shared/characters.js";
import { characterImage } from "../game/assets.js";

export function PatchNotesPatch({ patch, children }) {
  return (
    <patch-notes-patch patch={patch}>
      <subheader><span className="version-tag">v{patch}</span></subheader>
      {children}
    </patch-notes-patch>
  );
}

export function CharacterPatch({ id, children }) {
  const character = getCharacterById(id);
  return (
    <character-patch character={id}>
      <img src={characterImage(id)} alt="" aria-hidden="true" />
      <strong>{character?.name || id}</strong>
      <ul>{children}</ul>
    </character-patch>
  );
}

function TaggedPatchItem({ type, label, children }) {
  return (
    <li>
      <span className={`patch-tag ${type}`}>{label}</span>
      {children}
    </li>
  );
}

export function Buff({ children }) {
  return <TaggedPatchItem type="buff" label="Buff">{children}</TaggedPatchItem>;
}

export function Nerf({ children }) {
  return <TaggedPatchItem type="nerf" label="Nerf">{children}</TaggedPatchItem>;
}

export function New({ children }) {
  return <TaggedPatchItem type="new" label="Nuevo">{children}</TaggedPatchItem>;
}

export function Fix({ children }) {
  return <TaggedPatchItem type="fix" label="Fix">{children}</TaggedPatchItem>;
}

export function Bot({ children }) {
  return <TaggedPatchItem type="bot" label="Bot">{children}</TaggedPatchItem>;
}

export function PatchNotesContent() {
  return (
    <>
      <PatchNotesPatch patch="1.2.1">
        <CharacterPatch id="naruto">
          <New> Rework: Oodama Rasengan, Multi Clones de Sombra y Chakra del Kyubi.</New>
        </CharacterPatch>
        <CharacterPatch id="sakura">
          <New> Rework: Puno de chakra, Medical kunoichi y Sello de Fuerza 100.</New>
        </CharacterPatch>
        <CharacterPatch id="sasuke">
          <New> Rework: Espada de Kusanagi, Kirin, Mangekyou Sharingan, Agarre serpiente, Invocacion de manda y Amaterasu.</New>
        </CharacterPatch>
        <ul>
          <Bot> Mejora: Ahora el bot tendra prioridad mejorada de intentar interrumpir o cancelar habilidades canalizadas</Bot>
          <New> Nuevo modo: Bot vs Bot</New>
          <New> Nuevo Popup de notificaciones</New>
        </ul>
      </PatchNotesPatch>

      <PatchNotesPatch patch="1.2.0">
        <CharacterPatch id="aizen">
          <New> Nuevo personaje: Aizen Sosuke</New>
        </CharacterPatch>
        <CharacterPatch id="mai">
          <New> Nuevo personaje: Mai</New>
        </CharacterPatch>
        <CharacterPatch id="cacho">
          <Nerf> Lariat de Cacho ahora tiene 20 puntos de dano base</Nerf>
          <Nerf> Ira de Cacho ahora aumenta 5 puntos de dano por cada 15 puntos de vida que le falte</Nerf>
        </CharacterPatch>
        <CharacterPatch id="hinata">
          <New> Rework: Hinata ahora tiene un nuevo conjunto de habilidades</New>
        </CharacterPatch>
        <ul>
          <Fix>Ahora se puede reintentar intercambiar chakra luego de cancelar un intercambio</Fix>
          <li>Actualizadas las imagenes de casi todos los personajes</li>
          <li>Ahora las imagenes se presentan orientadas al enemigo</li>          
          <li>Ajustes de estilo en mobile y desktop</li>
          <li>Agregada opcion para ver el juego en modo mobile desde escritorio</li>
          <li>Agregado nuevo fondo de pantalla</li>
          <li>Los tooltips de habilidad ahora muestran el icono de habilidad</li>
          <li>Ajustada la informacion detallada en el footer de habilidades</li>
        </ul>
      </PatchNotesPatch>

      <PatchNotesPatch patch="1.1.6">
        <ul>
          <CharacterPatch id="cacho">
          <New>Nuevo personaje: Cacho</New>
          </CharacterPatch>
          <li>Agregado forzado de descarga de recursos</li>
          <li>Mejoras al sistema de tooltip y habilidades pasivas</li>
          <li>Mejoras al sistema de reflejo y counter</li>
        </ul>
      </PatchNotesPatch>
    </>
  );
}
