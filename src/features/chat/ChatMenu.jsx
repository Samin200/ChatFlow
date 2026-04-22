import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export default function ChatMenu({ items = [], menuClassName = "", buttonClassName = "" }) {
  const [open, setOpen] = useState(false);
  const [isTop, setIsTop] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const threshold = window.innerHeight * 0.5;

    if (rect.top < threshold) {
      setIsTop(true);
    } else {
      setIsTop(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const dropdownClass = isTop 
    ? "dropdown dropdown-top dropdown-end" 
    : "dropdown dropdown-end";

  return (
    <div className={dropdownClass} ref={containerRef}>
      <button
        tabIndex={0}
        onClick={() => setOpen(!open)}
        className={`btn btn-ghost btn-sm btn-square ${buttonClassName}`}
        style={{
          color: "var(--color-text-muted)",
          backgroundColor: open ? "rgba(var(--color-surface), 0.86)" : "transparent",
        }}
        aria-label="Open menu"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {open && (
        <ul
          tabIndex={-1}
          className="dropdown-content menu menu-sm rounded-box z-[9999] w-52 p-2 shadow-lg border"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-surface) 94%, black 6%)",
            borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
          }}
        >
          {items.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
                className={item.danger ? "text-error" : ""}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}