import React from "react";
import { chakraTypes, neutralChakraCost } from "../game/chakra.js";

export function SquareImage({ alt, src, className = "" }) {
  return <img className={`square-img ${className}`.trim()} src={src} alt={alt} width="48" height="48" />;
}

export function ChakraPool({ chakra }) {
  return (
    <div className="chakra-pool">
      {chakraTypes.map((type) => (
        <span className={`chakra-chip ${type.className}`} key={type.id}>
          <ChakraIcon type={type.id} />
          <b>{chakra?.[type.id] || 0}</b>
          {type.label}
        </span>
      ))}
    </div>
  );
}

export function ChakraIcon({ type }) {
  const chakraType = chakraTypes.find((item) => item.id === type);
  const className = type === "neutralChakra" ? "neutral" : chakraType?.className || "";
  return (
    <svg className={`chakra-svg ${className}`} viewBox="0 0 16 16" aria-hidden="true">
      <rect className="chakra-border" x="1" y="1" width="14" height="14" rx="4" />
      <rect className="chakra-inner-border" x="2.5" y="2.5" width="11" height="11" rx="3" />
      <rect className="chakra-fill" x="4" y="4" width="8" height="8" rx="2" />
    </svg>
  );
}

export function ChakraCost({ chakra = {} }) {
  const entries = chakraTypes
    .map((type) => ({ ...type, amount: chakra[type.id] || 0 }))
    .filter((type) => type.amount > 0);
  const neutralAmount = neutralChakraCost(chakra);
  if (neutralAmount > 0) {
    entries.push({ id: "neutralChakra", label: "Neutral", amount: neutralAmount });
  }

  if (!entries.length) return <span className="chakra-cost empty">Sin chakra</span>;

  return (
    <span className="chakra-cost">
      {entries.map((type) => (
        <span className="chakra-cost-item" key={type.id}>
          <ChakraIcon type={type.id} />
          <b>{type.amount}</b>
          <span>{type.label}</span>
        </span>
      ))}
    </span>
  );
}

export function Health({ current, max }) {
  const width = Math.max(0, Math.round((current / max) * 100));
  const level = width <= 30 ? "low" : width <= 70 ? "mid" : "high";
  return (
    <span className={`health ${level}`} aria-label={`${width}% vida`}>
      <span style={{ width: `${width}%` }} />
    </span>
  );
}
