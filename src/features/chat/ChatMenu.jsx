import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export default function ChatMenu({ items = [], menuClassName = "", buttonClassName = "" }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: "100%", left: "auto" });
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const menuHeight = items.length * 40 + 20;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.right;

    if (spaceBelow < menuHeight && rect.top > spaceBelow) {
      setPosition({ top: "auto", bottom: "100%" });
    } else {
      setPosition({ top: "100%", bottom: "auto" });
    }
  }, [open, items.length]);

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

  return (
    <div className="inline-block relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`btn btn-sm btn-square hover:bg-white/5 ${buttonClassName}`}
        style={{
          color: "var(--color-text-muted)",
          backgroundColor: "transparent",
          border: "none",
          boxShadow: "none",
        }}
        aria-label="Open menu"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {open && (
        <ul
          tabIndex={-1}
          className={`menu menu-sm rounded-box absolute w-52 p-2 shadow-lg pointer-events-auto right-0 ${menuClassName}`}
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-surface) 94%, black 6%)",
            zIndex: 9999,
            ...position,
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