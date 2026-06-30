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

export function Balance({ children }) {
  return <TaggedPatchItem type="balance" label="Balance">{children}</TaggedPatchItem>;
}

export function Bot({ children }) {
  return <TaggedPatchItem type="bot" label="Bot">{children}</TaggedPatchItem>;
}

export function PatchNotesContent() {
  return (
    <>
      <PatchNotesPatch patch="1.3.0">
        <CharacterPatch id="alucard">
          <New>Agregado Alucard</New>
        </CharacterPatch>
        <CharacterPatch id="sephiroth">
          <New>Agregado Sephiroth</New>
        </CharacterPatch>
        <CharacterPatch id="jotaro">
          <New>Agregado Jotaro</New>
        </CharacterPatch>
        <CharacterPatch id="dio">
          <New>Agregado Dio</New>
        </CharacterPatch>
        <CharacterPatch id="joseph">
          <New>Agregado Joseph</New>
        </CharacterPatch>
        <CharacterPatch id="nagi">
          <New>Agregado Nagi</New>
        </CharacterPatch>
        <CharacterPatch id="aizen">
          <Nerf>Masacre paso flash reducido a 30 de daño perforante.</Nerf>
          <Nerf>Dispersate, Kyouka Suijetsu reducido a 25 de daño.</Nerf>
          <Nerf>Hado 90: Cofre negro reducido a 20 de daño por turno y su cooldown aumentado 1 turno.</Nerf>
        </CharacterPatch>
        <CharacterPatch id="cacho">
          <Nerf>Cuidados de cigarrillo cura 5 puntos menos.</Nerf>
          <Nerf>Ira de Cacho ahora aumenta 5 de daño cada 20 de vida faltante.</Nerf>
        </CharacterPatch>
        <CharacterPatch id="daniel">
          <Nerf>Patada de sombra ahora hace 5 menos de daño.</Nerf>
          <Nerf>Nueve vidas cura 10 puntos menos.</Nerf>
        </CharacterPatch>
        <CharacterPatch id="kakashi">
          <Nerf>Raikiri ahora hace 10 puntos menos de daño.</Nerf>
          <Nerf>Sharingan de Kakashi tiene 1 turno mas de cooldown.</Nerf>
          <Nerf>Trampa Ninken ya no hace daño y su cooldown aumenta a 3 turnos.</Nerf>
        </CharacterPatch>
        <CharacterPatch id="kankuro">
          <Nerf>Emboscada de marionetas hace 5 menos de daño.</Nerf>
        </CharacterPatch>
        <CharacterPatch id="mai">
          <Nerf>Prrr reducido a 2 turnos y cooldown aumentado a 5 turnos.</Nerf>
          <Nerf>Lamidas cooldown aumentado a 4 turnos.</Nerf>
          <Nerf>Aranazo de gato tiene un daño base de 5.</Nerf>
          <Nerf>Proteccion de aliado otorga 5 de escudo y 5 de reduccion de daño por aliado vivo.</Nerf>
        </CharacterPatch>
        <CharacterPatch id="sakura">
          <Nerf>Sello de Fuerza de 100 cura 5 de vida menos.</Nerf>
          <Nerf>Sello de Fuerza de 100 da 10% menos de reduccion de daño.</Nerf>
        </CharacterPatch>
      </PatchNotesPatch>

      <PatchNotesPatch patch="1.2.3">
        <CharacterPatch id="aizen">
          <Nerf>Masacre paso flash ahora tiene cooldown de 2.</Nerf>
        </CharacterPatch>
        <CharacterPatch id="cacho">
          <Buff>Lariat de Cacho ahora no tiene cooldown.</Buff>
          <Buff>Humo peligro de Cacho ahora hace 5 mas de daño de afliccion.</Buff>
          <Buff>Cuidados de cigarrillo ahora cura 5 puntos mas de salud.</Buff>
        </CharacterPatch>
        <CharacterPatch id="daniel">
          <Buff>Bendicion de gato otorga 5 mas de reduccion de daño.</Buff>
        </CharacterPatch>
        <CharacterPatch id="sasuke">
          <Nerf>Agarre serpiente tiene cooldown de 1.</Nerf>
        </CharacterPatch>
        <CharacterPatch id="kankuro">
          <Nerf>Rafaga de marionetas de hierro ahora hace 10 de daño por 2 turnos.</Nerf>
        </CharacterPatch>
        <CharacterPatch id="mai">
          <Buff>Arañazo de gato ahora hace 10 de daño base</Buff>
        </CharacterPatch>
      </PatchNotesPatch>

      <PatchNotesPatch patch="1.2.2">
        <CharacterPatch id="hinata">
          <Nerf> Puño suave ahora tiene un cooldown de 2 turnos</Nerf>
          <Fix> Corregido tooltip de Guardia Byakugan</Fix>
        </CharacterPatch>
        <CharacterPatch id="gaara">
          <Nerf> Tormenta de arena ahora cuesta 2 recursos neutrales</Nerf>
        </CharacterPatch>
        <CharacterPatch id="naruto">
          <Buff>Poder del Kyubi no puede matar a Naruto</Buff>
          <Buff>Poder del Kyubi otorga a Naruto gana 50% de reduccion de daño</Buff>
          <Nerf>Poder del Kyubi ahora cuesta 1 recurso neutral adicional</Nerf>
          <Fix>Corregido tooltip de Poder del Kyubi</Fix>
          <Fix> Multi clones de sombra ahora ignoran correctamente efectos no dañinos ni sanacion</Fix>
        </CharacterPatch>
        <CharacterPatch id="sakura">
          <Nerf> Sello de Fuerza de 100 ahora tiene una duracion de 2 turnos y un cooldown de 3 turnos</Nerf>
        </CharacterPatch>
        <CharacterPatch id="mai">
          <Buff> Lamidas ahora cura 15 de salud en lugar de 10</Buff>
          <Nerf> El escudo obtenido queda limitado a 10 por aliado vivo</Nerf>
          <Fix> Proteccion de aliados ahora recalcula la reduccion de daño por aliado vivo correctamente.</Fix>
        </CharacterPatch>
        <CharacterPatch id="sasuke">
          <Nerf> Amaterasu ahora dura 2 turnos y hace 15 de dano por turno</Nerf>
        </CharacterPatch>
        <CharacterPatch id="aizen">
          <New> Nuevo efecto visual para la habilidad Masacre paso flash</New>
          <New> Hado 90: Cofre Negro ahora muestra un tooltip indicando que puede ser cancelando si es aturdido</New>
        </CharacterPatch>
        <ul>
          <li>El background del jugador perdiendo ahora mostrara una animacion nueva</li>
          <li>Los personajes ahora mostraran una animacion al ser atacados</li>
          <li>Ajustes de visiblidad en mobile</li>
          <li>Efectos con duracion 0 ahora diran Termina este turno</li>
          <Fix> La reduccion de daño por porcentaje reduce unicamente el daño basico correctamente</Fix>
        </ul>
      </PatchNotesPatch>

      <PatchNotesPatch patch="1.2.1">
        <CharacterPatch id="naruto">
          <New> Rework: Oodama Rasengan, Multi Clones de Sombra y Poder del Kyubi.</New>
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
