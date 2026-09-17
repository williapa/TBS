import type React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getEmojiForUnit } from "@TBS/renderer-2d";
import type {
  ActionFormProps,
  GameMenuActionId,
  GameMenuOptionUnavailableReason,
} from "../../../../types";
import "./ActionForm.css";

const MENU_GAP = 12;
const MENU_MARGIN = 8;

type FocusableElement = Element & Readonly<{ focus: () => void }>;

const canFocus = (element: Element | null): element is FocusableElement =>
  Boolean(element && "focus" in element && typeof element.focus === "function");

const unavailableReasonDetails: readonly Readonly<{
  id: GameMenuOptionUnavailableReason;
  label: string;
}>[] = [
  { id: "insufficient-funds", label: "Insufficient funds." },
  { id: "unavailable-terrain", label: "No suitable terrain is available." },
];

const ActionForm = ({
  left,
  onAction,
  options,
  placement = "anchored",
  title,
  top,
}: ActionFormProps) => {
  const menuRef = useRef<HTMLFormElement>(null);
  const returnFocusRef = useRef<FocusableElement | null>(
    canFocus(document.activeElement) ? document.activeElement : null,
  );
  const [position, setPosition] = useState({ left, top });
  const applicableReasons = unavailableReasonDetails.filter(({ id }) =>
    options.some(({ disabled, unavailableReasons }) =>
      disabled && unavailableReasons?.includes(id)),
  );
  const markerByReason = new Map(
    applicableReasons.map(({ id }, index) => [id, "*".repeat(index + 1)]),
  );

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
      <p className="game-action-menu__title">{title}</p>
      {options.map(({ disabled, id, label, unitTypeId, unavailableReasons }) => {
        const markers = unavailableReasons?.flatMap((reason) => {
          const marker = markerByReason.get(reason);
          return marker ? [marker] : [];
        }) ?? [];
        const optionLabel = `${unitTypeId ? `${getEmojiForUnit(unitTypeId)} ` : ""}${label}`;
        return (
          <button
            key={id}
            disabled={Boolean(disabled)}
            style={{ width: "100%" }}
            type="button"
            onClick={handleClick(id)}
          >
            {optionLabel}{markers.length > 0 ? ` ${markers.join(" ")}` : ""}
          </button>
        );
      })}
      {applicableReasons.length > 0 && (
        <div aria-label="Unavailable option reasons" className="game-action-menu__footnotes">
          {applicableReasons.map(({ id, label }) => (
            <p key={id}>{markerByReason.get(id)} {label}</p>
          ))}
        </div>
      )}
    </form>
  );
};

export default ActionForm;
