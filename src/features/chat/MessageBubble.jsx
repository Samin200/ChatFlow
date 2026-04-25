import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import EmojiPicker from "emoji-picker-react";
import {
  SmilePlus,
  Play,
  Pause,
  Check,
  CheckCheck,
  Clock3,
  Plus,
  Search,
  ChevronDown,
  Reply,
  Pin,
  Copy,
  TriangleAlert,
  Trash2,
  Pencil,
  MessageCircle,
  CornerUpLeft,
  Flag,
  ChevronRight,
  Lock,
  Phone,
} from "lucide-react";
import {
  formatMessageTime,
  getInitials,
  getAvatarColor,
} from "../../utils/helpers.js";
import LinkPreview from "./LinkPreview.jsx";

function FormattedText({ text, isMine }) {
  if (!text) return null;
  const wordRegex = /(@\S+)|(\S+)|\s+/g;
  const parts = [];
  let match;
  while ((match = wordRegex.exec(text)) !== null) {
    if (match[1]) {
      parts.push(
        <span
          key={match.index}
          className="font-semibold px-1 rounded-md"
          style={{
            backgroundColor: isMine ? "color-mix(in srgb, white 20%, transparent)" : "color-mix(in srgb, var(--color-accent) 20%, transparent)",
            color: isMine ? "white" : "var(--color-accent)",
          }}
        >
          {match[1]}
        </span>
      );
    } else {
      parts.push(match[0]);
    }
  }
  return <>{parts}</>;
}

const SWIPE_REACTION_PAGES = [
  ["👍", "❤️", "😂", "😮", "😢", "🙏", "👏"],
  ["🙌", "🥰", "🥺", "😭", "🔥", "🤣", "😆"],
];

// ─── Helper: compute menu position from an anchor rect ─────────────────────
function computeMenuPosition({ rect, isRightSide, debugOffset }) {
  const MARGIN = 12;
  const MENU_WIDTH = 224;
  const ESTIMATED_HEIGHT = 320;

  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const openUpward = spaceBelow < ESTIMATED_HEIGHT && spaceAbove > spaceBelow;

  return {
    openUpward,
    position: {
      top: openUpward
        ? undefined
        : rect.bottom + 4 + (debugOffset?.y ?? 0),
      bottom: openUpward
        ? window.innerHeight - rect.top + 4 - (debugOffset?.y ?? 0)
        : undefined,
      left: isRightSide
        ? undefined
        : Math.min(rect.left, window.innerWidth - MENU_WIDTH - MARGIN) +
          (debugOffset?.x ?? 0),
      right: isRightSide
        ? Math.max(MARGIN, window.innerWidth - rect.right) -
          (debugOffset?.x ?? 0)
        : undefined,
    },
  };
}
// ───────────────────────────────────────────────────────────────────────────

const MessageBubble = memo(function MessageBubble({
  message,
  isMine,
  sender,
  currentUser,
  activeContact,
  isGroupChat,
  showAvatar,
  onReact,
  onEdit,
  onDelete,
  onToggleStar,
  onOpenImage,
  onReply,
  chatSide,
  appearance,
  allMessages,
  isSelected,
  onSelect,
  isSelectionMode,
}) {
  const rootRef = useRef(null);
  const bubbleRef = useRef(null);
  const [showReactions, setShowReactions] = useState(false);
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  const [activeReactionEmoji, setActiveReactionEmoji] = useState(null);
  const [showHoverMenu, setShowHoverMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  // menuPosition now lives in state so arrow-key updates trigger re-renders
  const [menuPosition, setMenuPosition] = useState({
    top: null,
    bottom: null,
    left: null,
    right: null,
  });
  const [opensUpward, setOpensUpward] = useState(false);

  const dropdownRef = useRef(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Swipe-to-reply state (mobile)
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const didLongPress = useRef(false);
  const SWIPE_THRESHOLD = 60;
  const SWIPE_MAX = 80;

  // Mobile action sheet
  const [showFloatingReactions, setShowFloatingReactions] = useState(false);
  const longPressTimerRef = useRef(null);

  const reactionPanelRef = useRef(null);
  const longPressRef = useRef(null);
  const voiceTimerRef = useRef(null);

  // Store the chevron button rect so arrow keys can recompute from same anchor
  const chevronRectRef = useRef(null);
  // Debug pixel offset — kept as a ref so it accumulates across key presses,
  // but we immediately apply it to state via setMenuPosition.
  const debugOffset = useRef({ x: 0, y: 0 });

  // ─── Device detection ────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      setIsMobileDevice(
        window.matchMedia("(max-width: 768px)").matches ||
          "ontouchstart" in window ||
          navigator.maxTouchPoints > 0
      );
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const sync = () => {
      const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const noHover = window.matchMedia("(hover: none)").matches;
      setIsTouchDevice(coarsePointer || noHover);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const isMobile = () => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 768;
  };

  const totalReactions = Object.entries(message.reactions ?? {}).filter(
    ([, users]) => Array.isArray(users) && users.length > 0
  );
  const activeReactionUsers = message.reactions?.[activeReactionEmoji] ?? [];

  const reactionSummaryRows = useMemo(() => {
    if (!activeReactionEmoji) return [];
    return activeReactionUsers.map((userId) => ({
      userId,
      label:
        userId === currentUser?.id
          ? "You"
          : userId === activeContact?.id
          ? activeContact?.displayName ?? "Contact"
          : `User ${String(userId).slice(0, 4)}`,
    }));
  }, [
    activeReactionEmoji,
    activeReactionUsers,
    currentUser?.id,
    activeContact?.displayName,
    activeContact?.id,
  ]);

  useEffect(() => {
    if (!showReactions) return;
    function handleGlobalClick(e) {
      if (showReactions && !e.target.closest('.reaction-swiper-container')) {
        setShowReactions(false);
      }
    }
    document.addEventListener("pointerdown", handleGlobalClick);
    return () => document.removeEventListener("pointerdown", handleGlobalClick);
  }, [showReactions]);

  useEffect(() => {
    if (!isSelected) {
      setShowReactions(false);
      setShowHoverMenu(false);
    }
  }, [isSelected]);

  function handleReact(emoji) {
    onReact?.(message.id, emoji);
    setShowReactions(false);
    setShowEmojiModal(false);
    setActiveReactionEmoji(null);
    onSelect(null);
  }



  // ─── Voice playback ──────────────────────────────────────────────────────
  const audioRef = useRef(null);

  function startVoicePlayback() {
    if (isPlayingVoice) {
      audioRef.current?.pause();
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      clearTimeout(voiceTimerRef.current);
      setIsPlayingVoice(false);
      return;
    }
    const voiceUrl = message.attachments?.[0]?.url || message.imageData;
    if (voiceUrl) {
      const audio = new Audio(voiceUrl);
      audioRef.current = audio;
      audio.play().catch(() => {});
      audio.onended = () => {
        setIsPlayingVoice(false);
        audioRef.current = null;
      };
    }
    setIsPlayingVoice(true);
    voiceTimerRef.current = setTimeout(() => {
      setIsPlayingVoice(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }, (message.duration ?? 3) * 1000 + 1000);
  }

  // ─── Outside-click / escape listeners ───────────────────────────────────
  useEffect(() => {
    function handleOutside(event) {
      if (!rootRef.current?.contains(event.target)) {
        setShowReactions(false);
        setActiveReactionEmoji(null);
        setShowHoverMenu(false);
        setShowFloatingReactions(false);
      }
    }
    if (showReactions || showHoverMenu || showFloatingReactions) {
      window.addEventListener("pointerdown", handleOutside);
    }
    return () => {
      window.removeEventListener("pointerdown", handleOutside);
      clearTimeout(longPressRef.current);
      clearTimeout(voiceTimerRef.current);
    };
  }, [showReactions, showHoverMenu, showFloatingReactions]);

  useEffect(() => {
    if (!activeReactionEmoji) return;
    function handleGlobalClose(event) {
      if (reactionPanelRef.current?.contains(event.target)) return;
      setActiveReactionEmoji(null);
    }
    function handleEscape(event) {
      if (event.key === "Escape") setActiveReactionEmoji(null);
    }
    window.addEventListener("pointerdown", handleGlobalClose);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handleGlobalClose);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [activeReactionEmoji]);

  useEffect(() => {
    function handleCloseMenus(e) {
      if (e.detail?.messageId !== message.id) setShowHoverMenu(false);
    }
    function handleResize() {
      setShowHoverMenu(false);
    }
    function handleEscape(e) {
      if (e.key === "Escape") setShowHoverMenu(false);
    }
    document.addEventListener("closeMessageMenus", handleCloseMenus);
    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("closeMessageMenus", handleCloseMenus);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [message.id]);

  // ─── Arrow-key debug repositioning — FIXED ──────────────────────────────
  // The old code called setShowHoverMenu(false) + setShowHoverMenu(true) in
  // the same synchronous frame, which React batches so nothing closed/opened.
  // It also relied on the closed-over `showHoverMenu` state value inside the
  // effect, which became stale. Fix: use a ref to track visibility, and
  // directly recompute + set the new position in state instead of toggling.
  const showHoverMenuRef = useRef(false);
  useEffect(() => {
    showHoverMenuRef.current = showHoverMenu;
  }, [showHoverMenu]);

  const isRightSideRef = useRef(false); // kept in sync below

  useEffect(() => {
    function onKey(e) {
      if (!showHoverMenuRef.current) return;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
        return;

      e.preventDefault(); // stop page scroll while menu is open

      if (e.key === "ArrowUp") debugOffset.current.y -= 5;
      else if (e.key === "ArrowDown") debugOffset.current.y += 5;
      else if (e.key === "ArrowLeft") debugOffset.current.x -= 5;
      else if (e.key === "ArrowRight") debugOffset.current.x += 5;

      // Recompute from the stored anchor rect + new offset
      if (chevronRectRef.current) {
        const { openUpward, position } = computeMenuPosition({
          rect: chevronRectRef.current,
          isRightSide: isRightSideRef.current,
          debugOffset: debugOffset.current,
        });
        setOpensUpward(openUpward);
        setMenuPosition(position); // ← state update → re-render with new coords
      }
    }

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []); // empty deps — effect runs once; refs give live values
  // ─────────────────────────────────────────────────────────────────────────

  // ─── Layout helpers ──────────────────────────────────────────────────────
  const avatarColor = getAvatarColor(sender?.id);
  const canInlineMeta = !message.deleted && message.type === "text";
  const customLayout = appearance?.useCustomSideStyle
    ? appearance?.customSideLayout
    : "default";
  const mineBubbleColor = appearance?.mineBubble ?? "var(--color-accent)";
  const theirBubbleColor = appearance?.theirBubble ?? "var(--color-surface)";
  const showMyAvatarInChat = Boolean(appearance?.showMyAvatarInChat);

  const mineSide =
    customLayout === "swap"
      ? "left"
      : customLayout === "all_left"
      ? "left"
      : customLayout === "all_right"
      ? "right"
      : "right";
  const theirSide =
    customLayout === "swap"
      ? "right"
      : customLayout === "all_left"
      ? "left"
      : customLayout === "all_right"
      ? "right"
      : "left";

  const messageSide = isMine ? mineSide : theirSide;
  const isRightSide = messageSide === "right";
  // Keep ref in sync for arrow-key handler
  isRightSideRef.current = isRightSide;

  const rowJustifyClass = isRightSide ? "justify-end" : "justify-start";
  const bubbleAlignClass = isRightSide ? "items-end" : "items-start";
  const reactionAlignClass = isRightSide ? "self-end" : "self-start";
  const reactionWrapAlignClass = isRightSide ? "justify-end" : "justify-start";
  const avatarOrderClass = isRightSide ? "order-2" : "order-1";
  const contentOrderClass = isRightSide ? "order-1" : "order-2";
  const tailStyle = isRightSide
    ? {
        backgroundColor: isMine ? mineBubbleColor : theirBubbleColor,
        right: "-0.2rem",
        top: "0.4rem",
      }
    : {
        backgroundColor: isMine ? mineBubbleColor : theirBubbleColor,
        left: "-0.2rem",
        top: "0.4rem",
      };
  const reactionBtnOrderClass = isRightSide ? "order-0" : "order-3";

  // ─── Reply handler ─────────────────────────────────────────────────────
  const handleReply = useCallback(() => {
    setShowHoverMenu(false);
    onReply?.(message);
  }, [onReply, message]);

  // ─── Reply preview lookup ──────────────────────────────────────────────
  const replyTarget = useMemo(() => {
    if (!message.replyToMessageId || !allMessages) return null;
    return allMessages.find((m) => m.id === message.replyToMessageId);
  }, [message.replyToMessageId, allMessages]);

  // ─── Chevron click — open / close menu ──────────────────────────────────
  const handleChevronClick = (e) => {
    e.stopPropagation();

    // Close every other message's menu
    document.dispatchEvent(
      new CustomEvent("closeMessageMenus", { detail: { messageId: message.id } })
    );

    const rect = e.currentTarget.getBoundingClientRect();
    // Store the anchor rect so arrow-key handler can recompute from it
    chevronRectRef.current = rect;
    // Reset debug offset whenever we (re-)open the menu
    debugOffset.current = { x: 0, y: 0 };

    const { openUpward, position } = computeMenuPosition({
      rect,
      isRightSide,
      debugOffset: debugOffset.current,
    });

    setMenuPosition(position);
    setOpensUpward(openUpward);
    setShowHoverMenu((prev) => !prev);
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ─── Unified Pointer Handlers (Mouse & Touch) ──────────────────────────
  const handlePointerDown = (e) => {
    // Only handle left click / touch
    if (e.pointerType === "mouse" && e.button !== 0) return;

    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
    setIsSwiping(false);

    // Long-press only for touch
    if (e.pointerType === "touch") {
      didLongPress.current = false;
      longPressTimerRef.current = setTimeout(() => {
        try {
          if (window.navigator?.vibrate) window.navigator.vibrate(10);
        } catch (err) {}
        
        didLongPress.current = true;
        setShowReactions(true);
        onSelect(message);
      }, 400);
    }
  };

  const handlePointerMove = (e) => {
    if (touchStartX.current === null) return;
    const deltaX = e.clientX - touchStartX.current;
    const deltaY = e.clientY - touchStartY.current;

    // Detect horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && deltaX > 0) {
      // Prevent browser scroll/behavior if we are swiping
      if (Math.abs(deltaX) > 25) {
        if (!isSwiping) e.currentTarget.setPointerCapture(e.pointerId);
        setIsSwiping(true);
        clearTimeout(longPressTimerRef.current);
        setSwipeOffset(Math.min(deltaX, SWIPE_MAX));
      }
    } else if (Math.abs(deltaY) > 35) {
      clearTimeout(longPressTimerRef.current);
      if (swipeOffset > 0) {
        setSwipeOffset(0);
        setIsSwiping(false);
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    }
  };

  const handlePointerUp = (e) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (swipeOffset >= SWIPE_THRESHOLD) {
      if (e.pointerType === "touch" && window.navigator?.vibrate) {
        window.navigator.vibrate(10);
      }
      handleReply();
    }

    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleBubbleClick = (e) => {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    if (isSelectionMode) {
      e.stopPropagation();
      onSelect(isSelected ? null : message);
      return;
    }
  };

  if (message.deleted) return null;

  return (
    <div
      ref={rootRef}
      className={`relative flex w-full gap-2 items-end group overflow-x-hidden ${rowJustifyClass} ${
        activeReactionEmoji || showHoverMenu || showFloatingReactions ? "z-[100]" : "z-0"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!showHoverMenu) setIsHovered(false);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => {
        if (isMobile()) e.preventDefault();
      }}
      style={{
        transition: "background-color 0.2s ease",
        backgroundColor: isSelected ? "color-mix(in srgb, var(--color-accent) 15%, transparent)" : "transparent",
        touchAction: isSwiping ? "none" : "pan-y",
        userSelect: isSwiping ? "none" : "auto",
      }}
      onClick={handleBubbleClick}
    >
      {/* Avatar */}
      {(!isMine || showMyAvatarInChat) && (
        <div className={`flex-shrink-0 mb-0.5 w-7 md:w-8 ${avatarOrderClass}`}>
          {showAvatar ? (
            sender?.avatar ? (
              <img
                src={sender.avatar}
                alt={sender.displayName}
                className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div
                className={`w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-[10px] md:text-xs font-bold shadow-sm`}
                style={{ color: "white" }}
              >
                {getInitials(sender?.displayName ?? "?")}
              </div>
            )
          ) : null}
        </div>
      )}

      {/* Desktop hover reply + reaction buttons */}
      {!isMobile() && (isHovered || showReactions || showHoverMenu) && !message.deleted && (
        <div className={`flex items-center gap-1 flex-shrink-0 self-center ${reactionBtnOrderClass}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReply();
            }}
            className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-text) 20%, transparent)" }}
            aria-label="Reply"
          >
            <Reply className="w-4 h-4" style={{ color: "color-mix(in srgb, var(--color-text) 80%, transparent)" }} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowReactions((prev) => !prev);
            }}
            className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-text) 20%, transparent)" }}
            aria-label="Add reaction"
          >
            <SmilePlus className="w-4 h-4" style={{ color: "color-mix(in srgb, var(--color-text) 80%, transparent)" }} />
          </button>
        </div>
      )}

      <div
        ref={bubbleRef}
        className={`flex flex-col gap-0.5 md:gap-1 max-w-[88%] md:max-w-[80%] ${bubbleAlignClass} ${contentOrderClass}`}
      >
        <div className="relative">
          {/* Quick reaction picker */}
          {showReactions && (
            <>
              {createPortal(
                <div
                  className="reaction-swiper-container fixed z-[9999] w-[20rem] max-w-[calc(100vw-3rem)] rounded-[22px] backdrop-blur-sm shadow-xl p-2 animate-in fade-in zoom-in-95 duration-200"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-surface) 90%, black 10%)",
                    border: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)",
                    left: isRightSide 
                      ? `${(bubbleRef.current?.getBoundingClientRect().right ?? 0) - Math.min(window.innerWidth - 48, 320)}px` 
                      : `${bubbleRef.current?.getBoundingClientRect().left ?? 0}px`,
                    bottom: `${window.innerHeight - (bubbleRef.current?.getBoundingClientRect().top ?? 0) + 8}px`,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="min-w-0 flex-1 overflow-x-auto snap-x snap-mandatory no-scrollbar touch-pan-x">
                  <div className="inline-flex w-full">
                    {SWIPE_REACTION_PAGES.map((page, pageIndex) => (
                      <div
                        key={`page-${pageIndex}`}
                        className="w-full shrink-0 snap-start flex items-center gap-1.5 px-1 py-0.5"
                      >
                        {page.map((emoji) => (
                          <button
                            key={`${pageIndex}-${emoji}`}
                            onClick={() => handleReact(emoji)}
                            className="h-10 w-10 rounded-full text-xl leading-none transition-colors"
                            style={{ backgroundColor: "transparent" }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--color-text) 12%, transparent)"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            aria-label={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setShowEmojiModal(true)}
                  className="h-10 w-10 shrink-0 rounded-full transition-colors flex items-center justify-center"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-text) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--color-text) 15%, transparent)",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--color-text) 20%, transparent)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--color-text) 12%, transparent)"}
                  aria-label="More reactions"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <p className="px-1 pt-1 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                Swipe for more reactions
              </p>
            </div>,
            document.body
          )}
        </>
      )}

          {/* Full emoji picker modal */}
          {showEmojiModal && (
            <div
              className={`fixed inset-0 z-50 flex ${
                isTouchDevice
                  ? "items-end justify-center p-0"
                  : "items-center justify-center p-3"
              }`}
              onClick={() => setShowEmojiModal(false)}
            >
              <div className="absolute inset-0" style={{ backgroundColor: "color-mix(in srgb, var(--color-surface) 70%, black 30%)" }} />
              <div
                className={`relative z-10 overflow-hidden shadow-2xl ${
                  isTouchDevice
                    ? "w-full h-[78vh] rounded-t-3xl rounded-b-none"
                    : "w-[min(42rem,calc(100vw-1.5rem))] max-h-[80vh] rounded-3xl"
                }`}
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-surface) 92%, black 8%)",
                  border: "1px solid color-mix(in srgb, var(--color-text) 15%, transparent)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {isTouchDevice && (
                  <div className="mx-auto mt-2 h-1.5 w-14 rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--color-text) 35%, transparent)" }} />
                )}
                {isTouchDevice && (
                  <div className="px-4 py-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--color-text) 10%, transparent)" }}>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
                      <input
                        placeholder="Search"
                        className="w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2"
                        style={{
                          borderColor: "color-mix(in srgb, var(--color-accent) 50%, transparent)",
                          backgroundColor: "color-mix(in srgb, var(--color-surface) 60%, black 40%)",
                          color: "var(--color-text)",
                        }}
                      />
                    </div>
                  </div>
                )}
                <div
                  className={`${
                    isTouchDevice
                      ? "p-2 h-[calc(100%-56px)]"
                      : "p-2 max-h-[66vh]"
                  } overflow-y-auto`}
                >
                  <EmojiPicker
                    open
                    theme="dark"
                    width="100%"
                    height={isTouchDevice ? 560 : 480}
                    lazyLoadEmojis
                    searchPlaceHolder="Search"
                    skinTonesDisabled
                    onEmojiClick={(emojiData) => handleReact(emojiData.emoji)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Swipe-to-reply icon behind bubble */}
          {swipeOffset > 0 && (
            <div
              className="absolute left-[-40px] top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-200"
              style={{
                opacity: Math.min(swipeOffset / SWIPE_THRESHOLD, 1),
                transform: `scale(${Math.min(swipeOffset / SWIPE_THRESHOLD, 1)})`,
                color: "var(--color-accent)",
              }}
            >
              <div className="p-2 rounded-full bg-white/10">
                <Reply className="w-5 h-5" />
              </div>
            </div>
          )}

          {/* Message bubble */}
          <div
            className={`relative rounded-[22px] px-4 py-2 text-[15px] leading-tight shadow-sm border ${
              isRightSide ? "rounded-tr-sm" : "rounded-tl-sm"
            }`}
            style={{
              color: "var(--color-text)",
              borderColor: "color-mix(in srgb, var(--color-text) 5%, transparent)",
              backgroundColor: isMine ? mineBubbleColor : theirBubbleColor,
              minWidth: "fit-content",
              transform: `translateX(${swipeOffset}px)`,
              transition: isSwiping ? "none" : "transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)",
            }}
          >
            <span
              className="absolute w-2 h-2 rotate-45 rounded-[0.5px]"
              style={tailStyle}
            />

            {/* Reply preview */}
            {replyTarget && !message.deleted && (
              <div
                className="mb-2 rounded-lg px-3 py-2 border-l-[3px] cursor-pointer transition-all hover:bg-black/10 active:scale-[0.98]"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  borderLeftColor: isMine ? "rgba(255, 255, 255, 0.6)" : "var(--color-accent)",
                  backdropFilter: "blur(4px)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  const el = document.getElementById(`msg-${message.replyToMessageId}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('animate-highlight-flash');
                    setTimeout(() => el.classList.remove('animate-highlight-flash'), 2000);
                  }
                }}
              >
                <p className="text-[10px] font-black tracking-widest uppercase opacity-70 mb-0.5" style={{ color: isMine ? "white" : "var(--color-accent)" }}>
                  {replyTarget.sender?.displayName || "Unknown"}
                </p>
                <p className="text-[13px] line-clamp-2 leading-snug font-medium" style={{ color: isMine ? "white" : "var(--color-text)" }}>
                  {replyTarget.text || "Media Content"}
                </p>
              </div>
            )}

            {!isMine && isGroupChat && !message.deleted && (
              <p className="font-semibold text-sm leading-tight mb-0.5" style={{ color: "var(--color-accent)" }}>
                {sender?.displayName}
              </p>
            )}

            {message.deleted ? (
              <p className="italic opacity-60" style={{ color: "var(--color-text-muted)" }}>
                This message was deleted
              </p>
            ) : message.type === "image" && message.imageData ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onOpenImage?.(message.imageData)}
                  className="block relative rounded-xl overflow-hidden shadow-inner"
                >
                  {!isImageLoaded && (
                    <div className="absolute inset-0 blur-md animate-pulse" style={{ backgroundColor: "color-mix(in srgb, var(--color-surface) 70%, black 30%)" }} />
                  )}
                  <img
                    src={message.imageData}
                    alt="Shared image"
                    className={`max-w-full rounded-xl object-contain max-h-[min(380px,65vh)] transition-all duration-500 hover:scale-[1.03] ${
                      isImageLoaded
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-95"
                    }`}
                    loading="lazy"
                    onLoad={() => setIsImageLoaded(true)}
                  />
                </button>
                {message.text && (
                  <p className="text-[15px] leading-relaxed px-0.5">
                    <FormattedText text={message.text} isMine={isMine} />
                  </p>
                )}
              </div>
            ) : message.type === "voice" ? (
              <button
                onClick={startVoicePlayback}
                className="flex items-center gap-3 min-w-[200px] py-1"
              >
                <div
                  className="flex items-center justify-center h-10 w-10 rounded-full transition-colors"
                  style={{ backgroundColor: isMine ? "color-mix(in srgb, white 20%, transparent)" : "color-mix(in srgb, var(--color-accent) 20%, transparent)" }}
                >
                  {isPlayingVoice ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </div>
                <div className="flex items-end gap-1 h-6 flex-1">
                  {Array.from({ length: 18 }, (_, index) => (
                    <span
                      key={index}
                      className={`w-0.5 rounded-full ${
                        isPlayingVoice ? "animate-[wave_1s_ease-in-out_infinite_alternate]" : ""
                      }`}
                      style={{
                        backgroundColor: isMine ? "color-mix(in srgb, white 40%, transparent)" : "color-mix(in srgb, var(--color-accent) 40%, transparent)",
                        height: `${30 + Math.sin(index * 0.8) * 40}%`,
                        animationDelay: `${index * 50}ms`,
                        transition: "height 0.2s ease",
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium opacity-80 tabular-nums">
                  {message.duration ?? 0}s
                </span>
              </button>
            ) : message.type === "call_log" ? (
              <div className="flex items-center gap-3 py-1">
                <div 
                  className="flex items-center justify-center h-8 w-8 rounded-full"
                  style={{ backgroundColor: isMine ? "rgba(255,255,255,0.15)" : "var(--color-accent-transparent)" }}
                >
                  {message.metadata?.isVideo ? (
                    <Video className="w-4 h-4" />
                  ) : (
                    <Phone className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="text-[14px] font-medium leading-tight">{message.text}</p>
                  <p className="text-[10px] opacity-60 uppercase tracking-wider mt-0.5">
                    {message.metadata?.status || 'Call'}
                  </p>
                </div>
              </div>
            ) : canInlineMeta ? (
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                <div className="flex-1 min-w-0">
                  <p className="whitespace-pre-wrap break-words leading-relaxed select-text">
                    <FormattedText text={message.text} isMine={isMine} />
                  </p>
                  {message.linkPreview && (
                    <LinkPreview preview={message.linkPreview} />
                  )}
                </div>
                <div className="flex items-center justify-end gap-1.5 h-4 mb-0.5 ml-auto">
                  {message.edited && (
                    <span
                      className="text-[9px] uppercase tracking-wider font-bold opacity-50"
                      style={{ color: isMine ? "white" : "var(--color-text-muted)" }}
                    >
                      edited
                    </span>
                  )}
                  <span
                    className="text-[11px] font-medium tracking-tight opacity-75 flex items-center"
                    style={{ color: isMine ? "white" : "color-mix(in srgb, white 60%, transparent)" }}
                  >
                    {message.starredBy?.length > 0 && (
                      <Pin className="w-2.5 h-2.5 mr-1" style={{ transform: "rotate(30deg)" }} />
                    )}
                    <Lock className="w-2.5 h-2.5 mr-1 opacity-40 shrink-0" />
                    {formatMessageTime(message.createdAt)}
                  </span>
                  <div className="flex items-center justify-center shrink-0 ml-1 w-4 h-4 relative">
                    {(isHovered || showHoverMenu) && !message.deleted ? (
                      <button
                        onClick={handleChevronClick}
                        className="flex items-center justify-center transition-all absolute inset-0"
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          borderRadius: "50%",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <ChevronDown size={10} color="white" />
                      </button>
                    ) : (
                      isMine && (
                        <StatusTicks
                          status={message.status}
                          compact
                          seenColor={
                            appearance?.theme?.accent || "var(--color-accent)"
                          }
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">
                <FormattedText text={message.text} isMine={isMine} />
              </p>
            )}

            {!canInlineMeta && (
              <div className="flex items-center gap-2 mt-2 justify-end opacity-70">
                {message.edited && !message.deleted && (
                  <span
                    className="text-[9px] uppercase tracking-wider font-bold"
                    style={{ color: isMine ? "white" : "var(--color-text-muted)" }}
                  >
                    edited
                  </span>
                )}
                <span
                  className="text-[11px] font-medium flex items-center"
                  style={{ color: isMine ? "white" : "var(--color-text-muted)" }}
                >
                  {message.starredBy?.length > 0 && (
                    <Pin className="w-2.5 h-2.5 mr-1" style={{ transform: "rotate(30deg)" }} />
                  )}
                  <Lock className="w-2.5 h-2.5 mr-1 opacity-40 shrink-0" />
                  {formatMessageTime(message.createdAt)}
                </span>
                <div className="flex items-center justify-center shrink-0 ml-1 w-4 h-4 relative">
                  {(isHovered || showHoverMenu) && !message.deleted ? (
                    <button
                      onClick={handleChevronClick}
                      className="flex items-center justify-center transition-all"
                      style={{
                        width: 14,
                        height: 14,
                        background: "rgba(255,255,255,0.15)",
                        borderRadius: "50%",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <ChevronDown size={10} color="white" />
                    </button>
                  ) : (
                    isMine && (
                      <StatusTicks
                        status={message.status}
                        compact
                        seenColor={
                          appearance?.theme?.accent || "var(--color-accent)"
                        }
                      />
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reactions row */}
        <div className={`relative ${reactionAlignClass}`}>
          {totalReactions.length > 0 && (
            <div className={`flex gap-1 flex-wrap ${reactionWrapAlignClass}`}>
              {totalReactions.map(([emoji, users]) => {
                const iReacted = users.includes(currentUser?.id);
                return (
                  <button
                    key={emoji}
                    onClick={() =>
                      setActiveReactionEmoji((prev) =>
                        prev === emoji ? null : emoji
                      )
                    }
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors"
                    style={{
                      backgroundColor: iReacted ? "color-mix(in srgb, var(--color-text) 15%, transparent)" : "color-mix(in srgb, var(--color-text) 8%, transparent)",
                      border: `1px solid ${iReacted ? "color-mix(in srgb, var(--color-text) 25%, transparent)" : "color-mix(in srgb, var(--color-text) 10%, transparent)"}`,
                      boxShadow: iReacted ? "0 0 0 1px color-mix(in srgb, var(--color-text) 10%, transparent)" : undefined,
                    }}
                  >
                    <span>{emoji}</span>
                    <span style={{ color: "var(--color-text-muted)" }}>{users.length}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Reaction detail panel */}
          {activeReactionEmoji && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-[98] cursor-default"
                aria-label="Close reactions panel"
                onClick={() => setActiveReactionEmoji(null)}
              />
              <div
                ref={reactionPanelRef}
                className={`absolute z-[120] ${
                  isRightSide ? "right-0" : "left-0"
                } mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-2xl backdrop-blur-md shadow-xl overflow-hidden`}
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-surface) 94%, black 6%)",
                  border: "1px solid color-mix(in srgb, var(--color-text) 12%, transparent)",
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="px-3 py-2 border-b flex items-center gap-3 text-sm" style={{ borderColor: "color-mix(in srgb, var(--color-text) 10%, transparent)" }}>
                  <span className="rounded-xl px-2 py-1" style={{ backgroundColor: "color-mix(in srgb, var(--color-text) 10%, transparent)", color: "var(--color-text)" }}>
                    All {activeReactionUsers.length}
                  </span>
                  <span className="text-xl leading-none">
                    {activeReactionEmoji}
                  </span>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    {activeReactionUsers.length}
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {reactionSummaryRows.map((row) => {
                    const canRemove = row.userId === currentUser?.id;
                    return (
                      <button
                        key={row.userId}
                        onClick={() => {
                          if (canRemove) {
                            onReact?.(message.id, activeReactionEmoji);
                            setActiveReactionEmoji(null);
                          }
                        }}
                        className="w-full px-3 py-2.5 flex items-center justify-between gap-3 transition-colors"
                        style={{ color: "var(--color-text)" }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--color-text) 5%, transparent)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <div className="text-left min-w-0">
                          <p className="text-sm truncate" style={{ color: "var(--color-text)" }}>
                            {row.label}
                          </p>
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                            {canRemove ? "Click to remove" : "Reaction"}
                          </p>
                        </div>
                        <span className="text-2xl leading-none">
                          {activeReactionEmoji}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ─── Hover Dropdown Menu (Desktop) ─── */}
          {showHoverMenu && createPortal(
            <>
              <div
                className="fixed inset-0 z-[9998] bg-transparent"
                onClick={() => setShowHoverMenu(false)}
              />
              <div
                ref={dropdownRef}
                className="fixed z-[9999] w-56 rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  border: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)",
                  top: menuPosition.top ?? "auto",
                  bottom: menuPosition.bottom ?? "auto",
                  left: menuPosition.left ?? "auto",
                  right: menuPosition.right ?? "auto",
                  transformOrigin: `${opensUpward ? "bottom" : "top"} ${
                    isRightSide ? "right" : "left"
                  }`,
                  backgroundColor: "color-mix(in srgb, var(--color-surface) 96%, black 4%)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <MenuItem
                  icon={SmilePlus}
                  label="React"
                  onClick={() => {
                    setShowHoverMenu(false);
                    setShowReactions(true);
                  }}
                />
                <MenuItem
                  icon={Pin}
                  label={message.starred ? "Unpin" : "Pin"}
                  onClick={() => {
                    onToggleStar?.(message.id);
                    setShowHoverMenu(false);
                  }}
                />
                <MenuItem
                  icon={Reply}
                  label="Reply"
                  onClick={handleReply}
                />
                <MenuItem
                  icon={Copy}
                  label="Copy"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        String(message.text ?? "")
                      );
                    } catch {}
                    setShowHoverMenu(false);
                  }}
                />
                {isMine && (
                  <MenuItem
                    icon={Pencil}
                    label="Edit"
                    onClick={() => {
                      onEdit?.(message);
                      setShowHoverMenu(false);
                    }}
                  />
                )}

                {!isMine && isGroupChat && (
                  <>
                    <div className="h-px my-1" style={{ backgroundColor: "color-mix(in srgb, var(--color-text) 10%, transparent)" }} />
                    <MenuItem
                      icon={Reply}
                      label="Reply privately"
                      onClick={() => setShowHoverMenu(false)}
                    />
                    <MenuItem
                      icon={MessageCircle}
                      label={`Message ${sender?.displayName ?? "user"}`}
                      onClick={() => setShowHoverMenu(false)}
                    />
                    <MenuItem
                      icon={TriangleAlert}
                      label="Report"
                      onClick={() => setShowHoverMenu(false)}
                    />
                  </>
                )}

                <div className="h-px my-1" style={{ backgroundColor: "color-mix(in srgb, var(--color-text) 10%, transparent)" }} />

                <MenuItem
                  icon={Trash2}
                  label="Delete"
                  danger
                  onClick={() => {
                    onDelete?.(message.id, isMine ? "everyone" : "me");
                    setShowHoverMenu(false);
                  }}
                />
              </div>
            </>,
            document.body
          )}
        </div>
      </div>


    </div>
  );
});

// ─── Sub-components ──────────────────────────────────────────────────────────



function StatusTicks({ status, compact = false }) {
  const clockClass = compact ? "w-2.5 h-2.5" : "w-3 h-3";
  const tickClass = compact ? "w-3 h-3" : "w-3.5 h-3.5";
  const greyStyle = { color: "rgba(255, 255, 255, 0.45)" };

  if (status === "sending") return <Clock3 className={clockClass} style={greyStyle} />;
  
  // 'seen' status -> 2 grey ticks
  if (status === "seen") return <CheckCheck className={tickClass} style={greyStyle} />;

  // Default (sent, delivered) -> 1 grey tick
  return <Check className={tickClass} style={greyStyle} />;
}

function MenuItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors cursor-pointer pointer-events-auto ${
        danger ? "text-rose-400" : ""
      }`}
      onMouseEnter={(e) => {
        if (!danger) e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--color-text) 7%, transparent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
      style={{ color: danger ? undefined : "var(--color-text)" }}
    >
      <Icon className="w-4 h-4" style={{ color: danger ? undefined : "var(--color-text-muted)" }} />
      <span className="text-[1.05rem] leading-none">{label}</span>
    </button>
  );
}

export default MessageBubble;
