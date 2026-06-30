import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getSkillNameById } from "../../shared/characters.js";
import { skillImage } from "../game/assets.js";
import { groupStatusEffects, statusEffectGroupMeta, statusEffectGroupValue } from "../game/labels.js";

const MOBILE_QUERY = "(max-width: 768px)";

export function StatusEffects({ member, effects }) {
  const [openEffectId, setOpenEffectId] = useState("");
  const [hoverEffectId, setHoverEffectId] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const rowRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!openEffectId) return undefined;
    function closeOnOutsideClick(event) {
      if (rowRef.current?.contains(event.target)) return;
      if (tooltipRef.current?.contains(event.target)) return;
      setOpenEffectId("");
    }
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, [openEffectId]);

  const groups = groupStatusEffects(effects);
  const activeEffectId = openEffectId || hoverEffectId;
  const activeGroup = groups.find((group) => group.id === activeEffectId);

  useLayoutEffect(() => {
    if (!activeGroup || !tooltipPosition || !tooltipRef.current || !isDesktopTooltip()) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const topOverflow = 16 - rect.top;
    const bottomOverflow = rect.bottom - (viewportHeight - 16);

    if (topOverflow > 0) {
      setTooltipPosition((current) => current ? { ...current, top: current.top + topOverflow } : current);
    } else if (bottomOverflow > 0) {
      setTooltipPosition((current) => current ? { ...current, top: current.top - bottomOverflow } : current);
    }
  }, [activeGroup, tooltipPosition]);

  function isDesktopTooltip() {
    return typeof window !== "undefined" && !window.matchMedia(MOBILE_QUERY).matches;
  }

  function positionDesktopTooltip(element) {
    if (!isDesktopTooltip()) return;
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(460, viewportWidth - 32);
    const centeredLeft = rect.left + (rect.width / 2) - (width / 2);
    const left = Math.min(Math.max(centeredLeft, 16), viewportWidth - width - 16);
    const spaceAbove = rect.top - 16;
    const spaceBelow = viewportHeight - rect.bottom - 16;
    const placement = spaceAbove >= 180 || spaceAbove >= spaceBelow ? "above" : "below";

    setTooltipPosition({
      left,
      top: placement === "above" ? rect.top - 10 : rect.bottom + 10,
      width,
      placement
    });
  }

  function dynamicStatusDescriptions(effect) {
    if (effect.type !== "modifyDamageByMissingHp" || !member) return [];
    const maxHp = Math.max(0, Number(member.character?.maxHp || 0));
    const missingHp = Math.max(0, maxHp - Math.max(0, Number(member.hp || 0)));
    const hpStep = Math.max(1, Number(effect.hpStep || 1));
    const amountPerStep = Number(effect.amountPerStep ?? effect.value ?? 0);
    const bonus = Math.floor(missingHp / hpStep) * amountPerStep;
    const skillName = getSkillNameById(effect.skillIds?.[0] || "habilidad");
    return [`${skillName} aumenta su dano en ${bonus}`];
  }

  function tooltipHtml(effect) {
    return effect?.tooltipDescription
      ?? effect?.tooltipDescripcion
      ?? effect?.tooltipHtml
      ?? effect?.["tooltip descripcion"]
      ?? "";
  }

  function tooltipItems(group) {
    const seen = new Set();
    return group.effects.flatMap((effect) => {
      const descriptions = [
        ...(effect.descriptions || [`${effect.sourceActorName || "Un personaje"} ha aplicado ${effect.type} a este personaje.`]),
        ...dynamicStatusDescriptions(effect)
      ]
        .filter((description) => {
          const key = `text:${description}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((description) => ({ type: "text", value: description }));
      const html = tooltipHtml(effect);
      if (!html) return descriptions;
      const htmlKey = `html:${html}`;
      if (seen.has(htmlKey)) return descriptions;
      seen.add(htmlKey);
      return [...descriptions, { type: "html", value: html }];
    });
  }

  function tooltipContent(group) {
    const items = tooltipItems(group);
    return (
      <>
        <span className="status-tooltip-title">
          <img src={skillImage(group.sourceSkillId)} alt="" aria-hidden="true" />
          <strong>{group.sourceSkillName}</strong>
        </span>
        <ul>
          {items.map((item, index) => (
            item.type === "html"
              ? <li key={`html-${index}`} dangerouslySetInnerHTML={{ __html: item.value }} />
              : <li key={`${item.value}-${index}`}>{item.value}</li>
          ))}
        </ul>
        <small>{statusEffectGroupMeta(group)}</small>
      </>
    );
  }

  function badgeValue(group) {
    if (group.effects.some((effect) => effect.type === "shield" || Number(effect.stackCount || 0) > 0)) {
      return statusEffectGroupValue(group);
    }
    return null;
  }

  if (!effects.length) return <span className="status-row" aria-label="Sin efectos" />;

  return (
    <span className="status-row" ref={rowRef}>
      {groups.map((group) => {
        const value = badgeValue(group);
        return (
          <span
            className={`status-icon ${group.className} ${openEffectId === group.id ? "open" : ""}`}
            key={group.id}
            tabIndex={0}
            onMouseEnter={(event) => {
              if (!isDesktopTooltip()) return;
              setHoverEffectId(group.id);
              positionDesktopTooltip(event.currentTarget);
            }}
            onMouseLeave={() => {
              setHoverEffectId("");
            }}
            onFocus={(event) => {
              if (!isDesktopTooltip()) return;
              setHoverEffectId(group.id);
              positionDesktopTooltip(event.currentTarget);
            }}
            onBlur={() => {
              setHoverEffectId("");
            }}
            onClick={(event) => {
              event.stopPropagation();
              positionDesktopTooltip(event.currentTarget);
              setOpenEffectId((current) => (current === group.id ? "" : group.id));
            }}
          >
            <img src={skillImage(group.sourceSkillId)} alt={group.sourceSkillName} />
            {value !== null && <b>{value}</b>}
            <span className="status-tooltip inline-status-tooltip" role="tooltip">
              {tooltipContent(group)}
            </span>
          </span>
        );
      })}
      {activeGroup && tooltipPosition && createPortal(
        <span
          className={`status-tooltip status-tooltip-portal ${tooltipPosition.placement}`}
          ref={tooltipRef}
          role="tooltip"
          style={{
            "--tooltip-left": `${tooltipPosition.left}px`,
            "--tooltip-top": `${tooltipPosition.top}px`,
            "--tooltip-width": `${tooltipPosition.width}px`
          }}
          onClick={(event) => event.stopPropagation()}
        >
          {tooltipContent(activeGroup)}
        </span>,
        document.body
      )}
    </span>
  );
}
