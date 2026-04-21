/**
 * MentionDropdown — shows group member autocomplete when typing @
 *
 * Props:
 *   show          — whether to render
 *   query         — the text after @
 *   members       — array of { id, username, displayName, avatar }
 *   selectionIdx  — highlighted index
 *   onSelect(member)  — callback when a member is clicked
 */
export default function MentionDropdown({ show, query, members, selectionIdx = 0, onSelect }) {
  if (!show || !members?.length) return null;

  // Add a synthetic "@all" user
  const allUser = {
    id: "all",
    username: "all",
    displayName: "Everyone",
    avatar: "https://ui-avatars.com/api/?name=All&background=random",
  };

  const extendedMembers = [allUser, ...members];

  const filtered = extendedMembers.filter(
    (m) =>
      String(m.username || "").toLowerCase().includes(query.toLowerCase()) ||
      String(m.displayName || "").toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <div 
      className="absolute bottom-[70px] left-2 z-50 w-64 border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in"
      style={{
        backgroundColor: "color-mix(in srgb, var(--color-surface) 95%, black 5%)",
        borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
      }}
    >
      <div 
        className="px-3 py-2 text-xs font-semibold"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-background) 50%, transparent)",
          color: "var(--color-text-muted)",
        }}
      >
        Members
      </div>
      <ul className="max-h-48 overflow-y-auto">
        {filtered.map((m, idx) => {
          const isSelected = selectionIdx === idx;
          return (
            <li
              key={m.id || m._id}
              className="px-3 py-2 flex items-center gap-3 cursor-pointer transition-colors"
              style={{
                backgroundColor: isSelected 
                  ? "color-mix(in srgb, var(--color-surface) 80%, white 20%)" 
                  : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--color-surface) 90%, white 10%)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
              onClick={() => onSelect(m)}
            >
              {m.id === "all" ? (
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs"
                  style={{ backgroundColor: "var(--color-accent)", color: "white" }}
                >
                  @
                </div>
              ) : (
                <img
                  src={m.avatar}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                  style={{ backgroundColor: "color-mix(in srgb, var(--color-surface) 80%, white 20%)" }}
                />
              )}
              <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                {m.displayName || m.username}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
