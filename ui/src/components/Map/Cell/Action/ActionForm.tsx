import type React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getEmojiForUnit } from "@TBS/renderer-2d";
import type { ActionFormProps, GameMenuActionId } from "../../../../types";
import "./ActionForm.css";

const MENU_GAP = 12;
const MENU_MARGIN = 8;

type FocusableElement = Element & Readonly<{ focus: () => void }>;

const canFocus = (element: Element | null): element is FocusableElement =>
  Boolean(element && "focus" in element && typeof element.focus === "function");

const ActionForm = ({
  left,
  onAction,
  options,
  placement = "anchored",
  top,
}: ActionFormProps) => {
  const menuRef = useRef<HTMLFormElement>(null);
  const returnFocusRef = useRef<FocusableElement | null>(
    canFocus(document.activeElement) ? document.activeElement : null,
  );
  const [position, setPosition] = useState({ left, top });

  useLayoutEffect(() => {
    if (placement === "docked") return;
    const menu = menuRef.current;
    const container = menu?.offsetParent;
    if (!(menu && container instanceof HTMLElement)) return;
    const menuBounds = menu.getBoundingClientRect();
    const maximumLeft = container.clientWidth - menuBounds.width - MENU_MARGIN;
    const maximumTop = container.clientHeight - menuBounds.height - MENU_MARGIN;
    const flippedLeft = left - menuBounds.width - (MENU_GAP * 2);
    const flippedTop = top - menuBounds.height - (MENU_GAP * 2);
    setPosition({
      left: Math.max(MENU_MARGIN, Math.min(
        left > maximumLeft ? flippedLeft : left,
        maximumLeft,
      )),
      top: Math.max(MENU_MARGIN, Math.min(
        top > maximumTop ? flippedTop : top,
        maximumTop,
      )),
    });
  }, [left, options, placement, top]);

  useEffect(() => {
    const returnFocus = returnFocusRef.current;
    return () => returnFocus?.focus();
  }, []);

  useEffect(() => {
    menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [options]);

  const handleClick = (action: GameMenuActionId) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onAction(action);
  };

  return (
    <form
      aria-label="Available actions"
      className={`game-action-menu game-action-menu--${placement}`}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onAction("cancel");
      }}
      ref={menuRef}
      role="dialog"
      style={placement === "anchored" ? position : undefined}
    >
      <p className="game-action-menu__title">Options</p>
      {options.map(({ disabled, id, label, unitType }) => (
        <button
          key={id}
          disabled={Boolean(disabled)}
          style={{ width: "100%" }}
          type="button"
          onClick={handleClick(id)}
        >
          {unitType ? `${getEmojiForUnit(unitType)} ${label}` : label}
        </button>
      ))}
    </form>
  );
};

export default ActionForm;
