import { memo, useEffect, useMemo, useRef, useState } from "react";
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
  Star,
  Pin,
  Forward,
  Copy,
  TriangleAlert,
  Trash2,
  CheckCircle2,
  Pencil,
  MessageCircle,
  CornerUpLeft,
  Flag,
  ChevronRight,
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
        <span key={match.index} className={`font-semibold px-1 rounded-md ${isMine ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-300"}`}>
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
  chatSide,
  appearance,
}) {
  const [showReactions, setShowReactions] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  const [activeReactionEmoji, setActiveReactionEmoji] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showHoverMenu, setShowHoverMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: null, left: null, right: null });
  const [opensUpward, setOpensUpward] = useState(false);
  const dropdownRef = useRef(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Swipe to reply state (mobile)
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const SWIPE_THRESHOLD = 60;
  const SWIPE_MAX = 80;

  // Mobile action sheet state
  const [showMobileSheet, setShowMobileSheet] = useState(false);

  // Dropdown positioning refs
  const chevronRef = useRef(null);
  const dropdownMeasuredRef = useRef(false);

  const rootRef = useRef(null);
  const reactionPanelRef = useRef(null);
  const messageMenuRef = useRef(null);
  const longPressRef = useRef(null);
  const voiceTimerRef = useRef(null);

  // Device detection - cached value
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileDevice(
        window.matchMedia('(max-width: 768px)').matches
        || 'ontouchstart' in window
        || navigator.maxTouchPoints > 0
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const totalReactions = Object.entries(message.reactions ?? {}).filter(([, users]) => users.length > 0);
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
  }, [activeReactionEmoji, activeReactionUsers, currentUser?.id, activeContact?.displayName, activeContact?.id]);

  function handleReact(emoji) {
    onReact?.(message.id, emoji);
    setShowReactions(false);
    setShowEmojiModal(false);
    setActiveReactionEmoji(null);
  }

  function handleLongPressStart(e) {
    // Don't trigger long press if swiping
    if (isSwiping || swipeOffset > 10) return;

    clearTimeout(longPressRef.current);
    longPressRef.current = setTimeout(() => {
      // On mobile, show bottom action sheet
      if (isMobile() && !message.deleted) {
        navigator.vibrate?.(50);
        setShowMobileSheet(true);
      }
    }, 500);
  }

  function handleLongPressEnd() {
    clearTimeout(longPressRef.current);
  }

  // Swipe to reply handlers (mobile only)
  function handleTouchStart(e) {
    if (!isMobile()) return;
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    setIsSwiping(false);
    handleLongPressStart(e);
  }

  function handleTouchMove(e) {
    if (!isMobile() || touchStartX.current === null) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    // Check if horizontal swipe (more horizontal than vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && deltaX > 0) {
      // It's a right swipe - prevent scroll
      e.preventDefault();
      setIsSwiping(true);
      clearTimeout(longPressRef.current); // Cancel long press

      const offset = Math.min(deltaX, SWIPE_MAX);
      setSwipeOffset(offset);
    } else if (Math.abs(deltaY) > 10) {
      // It's a scroll - cancel long press and swipe
      clearTimeout(longPressRef.current);
      if (swipeOffset > 0) {
        setSwipeOffset(0);
      }
    }
  }

  function handleTouchEnd() {
    if (!isMobile()) return;

    if (swipeOffset >= SWIPE_THRESHOLD) {
      // Trigger reply
      navigator.vibrate?.(50);
      // TODO: Trigger reply action - need to pass onReply prop
      // For now, just animate back
    }

    // Animate back to 0
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
    handleLongPressEnd();
  }

  const audioRef = useRef(null);

  function startVoicePlayback() {
    if (isPlayingVoice) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      clearTimeout(voiceTimerRef.current);
      setIsPlayingVoice(false);
      return;
    }

    // Get voice URL from attachments or imageData (fallback)
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
    // Fallback timeout in case audio events don't fire
    voiceTimerRef.current = setTimeout(() => {
      setIsPlayingVoice(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }, (message.duration ?? 3) * 1000 + 1000);
  }

  useEffect(() => {
    const syncTouchState = () => {
      const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const noHover = window.matchMedia("(hover: none)").matches;
      setIsTouchDevice(coarsePointer || noHover);
    };
    syncTouchState();
    window.addEventListener("resize", syncTouchState);
    return () => window.removeEventListener("resize", syncTouchState);
  }, []);

  useEffect(() => {
    function handleOutside(event) {
      if (!rootRef.current?.contains(event.target)) {
        setShowReactions(false);
        setActiveReactionEmoji(null);
        setShowMessageMenu(false);
        setShowHoverMenu(false);
        setShowMobileSheet(false);
      }
    }
    if (showReactions || showMessageMenu || showHoverMenu || showMobileSheet) {
      window.addEventListener("pointerdown", handleOutside);
    }
    return () => {
      window.removeEventListener("pointerdown", handleOutside);
      clearTimeout(longPressRef.current);
      clearTimeout(voiceTimerRef.current);
    };
  }, [showMessageMenu, showReactions, showHoverMenu, showMobileSheet]);

  useEffect(() => {
    if (!activeReactionEmoji) return undefined;

    function handleGlobalClose(event) {
      if (reactionPanelRef.current?.contains(event.target)) return;
      setActiveReactionEmoji(null);
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setActiveReactionEmoji(null);
      }
    }

    window.addEventListener("pointerdown", handleGlobalClose);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handleGlobalClose);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [activeReactionEmoji]);

  // Close menu when another message's menu opens or on resize
  useEffect(() => {
    function handleCloseMenus(e) {
      if (e.detail?.messageId !== message.id) {
        setShowHoverMenu(false);
      }
    }
    function handleResize() {
      setShowHoverMenu(false);
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setShowHoverMenu(false);
    }
    document.addEventListener('closeMessageMenus', handleCloseMenus);
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('closeMessageMenus', handleCloseMenus);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [message.id]);

  // Measure actual dropdown height after render and adjust if needed
  useEffect(() => {
    if (showHoverMenu && dropdownRef.current && !dropdownMeasuredRef.current) {
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const MARGIN = 8;

      // Check if dropdown extends below viewport
      const bottomOverflow = dropdownRect.bottom - viewportHeight;
      if (bottomOverflow > 0) {
        // Reposition upward
        const newTop = Math.max(MARGIN, menuPosition.top - dropdownRect.height - 16);
        setMenuPosition(prev => ({ ...prev, top: newTop }));
        setOpensUpward(true);
      }

      // Check if dropdown extends above viewport
      if (dropdownRect.top < 0) {
        const newTop = MARGIN;
        setMenuPosition(prev => ({ ...prev, top: newTop }));
      }

      dropdownMeasuredRef.current = true;
    }
  }, [showHoverMenu, menuPosition.top]);

  const isMobile = () => isMobileDevice;

  const avatarColor = getAvatarColor(sender?.id);
  const canInlineMeta = !message.deleted && message.type === "text";
  const customLayout = appearance?.useCustomSideStyle ? appearance?.customSideLayout : "default";
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
  const showCompactMenuButton = isTouchDevice || isHovered || showMessageMenu;
  const actionSlotClass = "h-[17px] w-[17px]";

  const rowJustifyClass = isRightSide ? "justify-end" : "justify-start";
  const bubbleAlignClass = isRightSide ? "items-end" : "items-start";
  const reactionAlignClass = isRightSide ? "self-end" : "self-start";
  const reactionWrapAlignClass = isRightSide ? "justify-end" : "justify-start";
  const avatarOrderClass = isRightSide ? "order-2" : "order-1";
  const contentOrderClass = isRightSide ? "order-1" : "order-2";
  const tailStyle = isRightSide
    ? { backgroundColor: isMine ? mineBubbleColor : theirBubbleColor, right: "-0.2rem", top: "0.4rem" }
    : { backgroundColor: isMine ? mineBubbleColor : theirBubbleColor, left: "-0.2rem", top: "0.4rem" };

  const reactionBtnOrderClass = isRightSide ? "order-0" : "order-3";

  return (
    <div
      ref={rootRef}
      className={`relative flex w-full gap-2 items-end group ${rowJustifyClass} ${
        activeReactionEmoji || showMessageMenu ? "z-[70]" : "z-0"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { if (!showHoverMenu) setIsHovered(false) }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      style={{
        transform: isMobile() ? `translateX(${swipeOffset}px)` : undefined,
        transition: isMobile() && !isSwiping ? 'transform 0.2s ease-out' : undefined,
      }}
    >
      {/* Swipe reply icon - outside the moving row */}
      {isMobile() && swipeOffset > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-7 h-7 rounded-full"
          style={{
            left: "-44px",
            backgroundColor: "rgba(255,255,255,0.15)",
            opacity: Math.min(swipeOffset / SWIPE_THRESHOLD, 1),
          }}
        >
          <CornerUpLeft className="w-4 h-4 text-white" />
        </div>
      )}

      {(!isMine || showMyAvatarInChat) && (
        <div className={`flex-shrink-0 mb-0.5 w-7 md:w-8 ${avatarOrderClass}`}>
          {showAvatar ? (
            sender?.avatar ? (
              <img src={sender.avatar} alt={sender.displayName} className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover shadow-sm" />
            ) : (
              <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-[10px] md:text-xs font-bold shadow-sm`}>
                {getInitials(sender?.displayName ?? "?")}
              </div>
            )
          ) : null}
        </div>
      )}

      {/* Desktop hover reaction button — beside the bubble */}
      {!isMobile() && (isHovered || showReactions) && !message.deleted && (
        <div className={`flex-shrink-0 self-center ${reactionBtnOrderClass}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowReactions((prev) => !prev);
            }}
            className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white/15"
            style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
            aria-label="Add reaction"
          >
            <SmilePlus className="w-4 h-4 text-white/80" />
          </button>
        </div>
      )}

        <div className={`flex flex-col gap-0.5 md:gap-1 max-w-[88%] md:max-w-[80%] ${bubbleAlignClass} ${contentOrderClass}`}>
        <div className="relative">
          {/* Desktop hover chevron - positioned ON the bubble */}
          {!isMobile() && (isHovered || showHoverMenu) && !message.deleted && (
            <button
              ref={chevronRef}
              onClick={(e) => {
                e.stopPropagation();
                // Close other open menus first
                document.dispatchEvent(new CustomEvent('closeMessageMenus', { detail: { messageId: message.id } }));
                const rect = e.currentTarget.getBoundingClientRect();
                if (!rect) return;

                const DROPDOWN_HEIGHT = 280; // approximate dropdown height in px
                const VIEWPORT_HEIGHT = window.innerHeight;
                const MARGIN = 8; // gap between chevron and dropdown

                const spaceBelow = VIEWPORT_HEIGHT - rect.bottom;
                const spaceAbove = rect.top;

                // Only open upward if there's not enough space below AND more space above
                const openUpward = spaceBelow < DROPDOWN_HEIGHT && spaceAbove > spaceBelow;

                const top = openUpward
                  ? Math.max(MARGIN, rect.top - DROPDOWN_HEIGHT - MARGIN)  // open above, clamp to viewport
                  : rect.bottom + MARGIN;  // open below

                if (isRightSide) {
                  setMenuPosition({
                    top,
                    right: window.innerWidth - rect.right,
                    left: 'auto',
                  });
                } else {
                  setMenuPosition({
                    top,
                    left: rect.left,
                    right: 'auto',
                  });
                }

                setOpensUpward(openUpward);
                dropdownMeasuredRef.current = false;
                setShowHoverMenu(true);
              }}
              className={`absolute top-1 z-30 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                isRightSide ? "right-1" : "left-1"
              }`}
              style={{
                backgroundColor: "rgba(0,0,0,0.3)",
              }}
              aria-label="Message options"
            >
              <ChevronDown className="w-4 h-4 text-white/80" />
            </button>
          )}

          {showReactions && (
            <div
              className={`absolute bottom-full mb-2 z-20 w-[20rem] max-w-[calc(100vw-3rem)] rounded-[22px] border border-white/10 backdrop-blur-sm shadow-xl animate-reaction-pop p-2 ${isRightSide ? "right-0" : "left-0"}`}
              style={{ backgroundColor: "color-mix(in srgb, var(--color-surface) 90%, black 10%)" }}
            >
              <div className="flex items-center gap-1.5">
                <div className="min-w-0 flex-1 overflow-x-auto snap-x snap-mandatory no-scrollbar touch-pan-x">
                  <div className="inline-flex w-full">
                  {SWIPE_REACTION_PAGES.map((page, pageIndex) => (
                    <div key={`page-${pageIndex}`} className="w-full shrink-0 snap-start flex items-center gap-1.5 px-1 py-0.5">
                      {page.map((emoji) => (
                        <button
                          key={`${pageIndex}-${emoji}`}
                          onClick={() => handleReact(emoji)}
                          className="h-10 w-10 rounded-full text-xl leading-none bg-transparent hover:bg-white/12 transition-colors"
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
                  className="h-10 w-10 shrink-0 rounded-full bg-white/12 border border-white/15 text-slate-200 hover:bg-white/20 transition-colors flex items-center justify-center"
                  aria-label="More reactions"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <p className="px-1 pt-1 text-[10px] text-slate-400">Swipe for more reactions</p>
            </div>
          )}

          {showEmojiModal && (
            <div
              className={`fixed inset-0 z-50 flex ${isTouchDevice ? "items-end justify-center p-0" : "items-center justify-center p-3"}`}
              onClick={() => setShowEmojiModal(false)}
            >
              <div className="absolute inset-0 bg-slate-950/70" />
              <div
                className={`relative z-10 overflow-hidden border border-white/15 shadow-2xl animate-reaction-pop ${
                  isTouchDevice
                    ? "w-full h-[78vh] rounded-t-3xl rounded-b-none"
                    : "w-[min(42rem,calc(100vw-1.5rem))] max-h-[80vh] rounded-3xl"
                }`}
                style={{ backgroundColor: "color-mix(in srgb, var(--color-surface) 92%, black 8%)" }}
                onClick={(e) => e.stopPropagation()}
              >
                {isTouchDevice && <div className="mx-auto mt-2 h-1.5 w-14 rounded-full bg-white/35" />}
                {isTouchDevice && (
                  <div className="px-4 py-2 border-b border-white/10">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        placeholder="Search"
                        className="w-full rounded-xl border border-emerald-500/50 bg-slate-800/60 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                  </div>
                )}
                <div className={`${isTouchDevice ? "p-2 h-[calc(100%-56px)]" : "p-2 max-h-[66vh]"} overflow-y-auto`}>
                  <EmojiPicker
                    className="reaction-emoji-picker"
                    open
                    theme="dark"
                    width="100%"
                    height={isTouchDevice ? 560 : 480}
                    lazyLoadEmojis
                    searchPlaceHolder="Search"
                    searchDisabled={false}
                    skinTonesDisabled
                    onEmojiClick={(emojiData) => handleReact(emojiData.emoji)}
                  />
                </div>
              </div>
            </div>
          )}

          <div
            className={`relative rounded-[22px] px-4 py-2 text-[15px] leading-tight transition-all text-slate-100 shadow-sm border border-white/5 ${
              isRightSide ? "rounded-tr-sm" : "rounded-tl-sm"
            }`}
            style={{
              backgroundColor: isMine ? mineBubbleColor : theirBubbleColor,
              minWidth: 'fit-content',
            }}
          >
            <span className="absolute w-2 h-2 rotate-45 rounded-[0.5px]" style={tailStyle} />
            {!isMine && isGroupChat && !message.deleted && (
              <p className="text-teal-300 font-semibold text-sm leading-tight mb-0.5">{sender?.displayName}</p>
            )}
            {message.deleted ? (
              <p className="italic text-slate-300 opacity-60">This message was deleted</p>
            ) : message.type === "image" && message.imageData ? (
              <div className="flex flex-col gap-2">
                <button onClick={() => onOpenImage?.(message.imageData)} className="block relative rounded-xl overflow-hidden shadow-inner">
                  {!isImageLoaded && <div className="absolute inset-0 bg-slate-700/50 blur-md animate-pulse" />}
                  <img
                    src={message.imageData}
                    alt="Shared image"
                    className={`max-w-full rounded-xl object-contain max-h-72 transition-all duration-500 hover:scale-[1.03] ${
                      isImageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
                    }`}
                    loading="lazy"
                    onLoad={() => setIsImageLoaded(true)}
                  />
                </button>
                {message.text && <p className="text-[15px] leading-relaxed px-0.5"><FormattedText text={message.text} isMine={isMine} /></p>}
              </div>
            ) : message.type === "voice" ? (
              <button onClick={startVoicePlayback} className="flex items-center gap-3 min-w-[200px] py-1">
                <div className={`flex items-center justify-center h-10 w-10 rounded-full ${isMine ? "bg-white/20" : "bg-emerald-500/20"} transition-colors`}>
                  {isPlayingVoice ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </div>
                <div className="flex items-end gap-1 h-6 flex-1">
                  {Array.from({ length: 18 }, (_, index) => (
                    <span
                      key={index}
                      className={`w-0.5 rounded-full ${isMine ? "bg-white/40" : "bg-emerald-400/40"} ${
                        isPlayingVoice ? "animate-wave" : ""
                      }`}
                      style={{ 
                        height: `${30 + Math.sin(index * 0.8) * 40}%`, 
                        animationDelay: `${index * 50}ms`,
                        transition: 'height 0.2s ease'
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium opacity-80 tabular-nums">{message.duration ?? 0}s</span>
              </button>
            ) : canInlineMeta ? (
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                <div className="flex-1 min-w-0">
                  <p className="whitespace-pre-wrap break-words leading-relaxed select-text">
                    <FormattedText text={message.text} isMine={isMine} />
                  </p>
                  {message.linkPreview && <LinkPreview preview={message.linkPreview} />}
                </div>
                <div className="flex items-center justify-end gap-1.5 h-4 mb-0.5 ml-auto">
                  {message.edited && (
                    <span className={`text-[9px] uppercase tracking-wider font-bold opacity-50 ${isMine ? "text-white" : "text-slate-400"}`}>
                      edited
                    </span>
                  )}
                  <span className={`text-[11px] font-medium tracking-tight opacity-75 ${isMine ? "text-white" : "text-white/60"}`}>
                    {formatMessageTime(message.createdAt)}
                  </span>
                  {isMine && (
                    <div className="flex items-center justify-center shrink-0 ml-0.5">
                      {isHovered || showHoverMenu ? (
                        <button
                          tabIndex={0}
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const VIEWPORT_HEIGHT = window.innerHeight;
                            const MARGIN = 8;
                            const spaceBelow = VIEWPORT_HEIGHT - rect.bottom;
                            const spaceAbove = rect.top;
                            const openUpward = spaceBelow < 280 && spaceAbove > spaceBelow;
                            const top = openUpward ? rect.top - 280 - MARGIN : rect.bottom + MARGIN;
                            setMenuPosition({ above: openUpward, top: top, left: rect.left });
                            setShowHoverMenu(true);
                          }}
                          className="flex items-center justify-center"
                          style={{ width: 14, height: 14, background: 'rgba(255,255,255,0.12)', borderRadius: '50%' }}
                        >
                          <ChevronDown size={8} color="white" />
                        </button>
                      ) : (
                        <StatusTicks
                          status={message.status}
                          compact
                          seenColor={appearance?.theme?.accent || "var(--color-accent)"}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed"><FormattedText text={message.text} isMine={isMine} /></p>
            )}

            {!canInlineMeta && (
              <div className="flex items-center gap-2 mt-2 justify-end opacity-70">
                {message.edited && !message.deleted && (
                  <span className={`text-[9px] uppercase tracking-wider font-bold ${isMine ? "text-white" : "text-slate-400"}`}>
                    edited
                  </span>
                )}
                <span className={`text-[11px] font-medium ${isMine ? "text-white" : "text-slate-400"}`}>
                  {formatMessageTime(message.createdAt)}
                </span>
                {isMine && (
                  <div className="flex items-center justify-center shrink-0 ml-0.5">
                    {isHovered || showHoverMenu ? (
                      <button
                        tabIndex={0}
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const VIEWPORT_HEIGHT = window.innerHeight;
                          const MARGIN = 8;
                          const spaceBelow = VIEWPORT_HEIGHT - rect.bottom;
                          const spaceAbove = rect.top;
                          const openUpward = spaceBelow < 280 && spaceAbove > spaceBelow;
                          const top = openUpward ? rect.top - 280 - MARGIN : rect.bottom + MARGIN;
                          setMenuPosition({ above: openUpward, top: top, left: rect.left });
                          setShowHoverMenu(true);
                        }}
                        className="flex items-center justify-center"
                        style={{ width: 14, height: 14, background: 'rgba(255,255,255,0.12)', borderRadius: '50%' }}
                      >
                        <ChevronDown size={8} color="white" />
                      </button>
                    ) : (
                      <StatusTicks
                        status={message.status}
                        compact
                        seenColor={appearance?.theme?.accent || "var(--color-accent)"}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={`relative ${reactionAlignClass}`}>
          {totalReactions.length > 0 && (
            <div className={`flex gap-1 flex-wrap ${reactionWrapAlignClass}`}>
              {totalReactions.map(([emoji, users]) => {
                const iReacted = users.includes(currentUser?.id);
                return (
                  <button
                    key={emoji}
                    onClick={() => setActiveReactionEmoji((prev) => (prev === emoji ? null : emoji))}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                      iReacted
                        ? "bg-white/15 border border-white/25 ring-1 ring-white/10"
                        : "bg-white/8 border border-white/10 hover:bg-white/15"
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="text-slate-400">{users.length}</span>
                  </button>
                );
              })}
            </div>
          )}

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
                className={`absolute z-[120] ${isRightSide ? "right-0" : "left-0"} mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/12 backdrop-blur-md shadow-xl overflow-hidden`}
                style={{ backgroundColor: "color-mix(in srgb, var(--color-surface) 94%, black 6%)" }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-white/10 flex items-center gap-3 text-sm">
                  <span className="rounded-xl bg-white/10 px-2 py-1 text-slate-100">All {activeReactionUsers.length}</span>
                  <span className="text-xl leading-none">{activeReactionEmoji}</span>
                  <span className="text-slate-300">{activeReactionUsers.length}</span>
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
                          }
                        }}
                        className="w-full px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
                      >
                        <div className="text-left min-w-0">
                          <p className="text-slate-100 text-sm truncate">{row.label}</p>
                          <p className="text-slate-400 text-xs">{canRemove ? "Click to remove" : "Reaction"}</p>
                        </div>
                        <span className="text-2xl leading-none">{activeReactionEmoji}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Hover Dropdown Menu (Desktop) - fixed positioning, no portal */}
          {showHoverMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-[9998] bg-black/30"
                onClick={() => setShowHoverMenu(false)}
              />
              {/* Dropdown */}
              <div
                ref={dropdownRef}
                className="fixed z-[9999] w-72 rounded-2xl border border-white/10 bg-slate-800 shadow-2xl overflow-hidden max-h-[80vh] animate-reaction-pop"
                style={{
                  top: menuPosition.top ?? 100,
                  left: menuPosition.left ?? undefined,
                  right: menuPosition.right ?? undefined,
                  transformOrigin: opensUpward ? 'bottom center' : 'top center',
                }}
              >
                {/* Group 1: Common Actions */}
                <MenuItem
                  icon={SmilePlus}
                  label="React"
                  onClick={() => {
                    setShowHoverMenu(false);
                    setShowReactions(true);
                  }}
                />
                <MenuItem
                  icon={Star}
                  label="Star"
                  onClick={() => {
                    onToggleStar?.(message.id);
                    setShowHoverMenu(false);
                  }}
                />
                <MenuItem
                  icon={Pin}
                  label="Pin"
                  onClick={() => {
                    // TODO: Implement pin
                    setShowHoverMenu(false);
                  }}
                />
                <MenuItem
                  icon={Forward}
                  label="Forward"
                  onClick={() => {
                    // TODO: Implement forward
                    setShowHoverMenu(false);
                  }}
                />
                <MenuItem
                  icon={Copy}
                  label="Copy"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(String(message.text ?? ""));
                    } catch {
                      // ignore clipboard failures
                    }
                    setShowHoverMenu(false);
                  }}
                />

                <div className="h-px bg-white/10 my-1" />

                {/* Group 2: Reply/Contact Actions (only for received messages in groups) */}
                {!isMine && isGroupChat && (
                  <>
                    <MenuItem
                      icon={Reply}
                      label="Reply privately"
                      onClick={() => {
                        // TODO: Navigate to DM with sender
                        setShowHoverMenu(false);
                      }}
                    />
                    <MenuItem
                      icon={MessageCircle}
                      label={`Message ${sender?.displayName ?? "user"}`}
                      onClick={() => {
                        // TODO: Navigate to DM
                        setShowHoverMenu(false);
                      }}
                    />
                    <MenuItem
                      icon={TriangleAlert}
                      label="Report"
                      onClick={() => {
                        // TODO: Report message
                        setShowHoverMenu(false);
                      }}
                    />
                    <div className="h-px bg-white/10 my-1" />
                  </>
                )}

                {/* Group 3: Edit/Delete for mine, Delete for others */}
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
                <MenuItem
                  icon={Trash2}
                  label="Delete"
                  danger
                  onClick={() => {
                    onDelete?.(message.id, isMine ? "everyone" : "me");
                    setShowHoverMenu(false);
                  }}
                />
                <MenuItem
                  icon={CheckCircle2}
                  label="Select messages"
                  onClick={() => {
                    // TODO: Enter multi-select mode
                    setShowHoverMenu(false);
                  }}
                />
              </div>
            </>
          )}
        </div>

      </div>

      {/* Mobile Action Sheet (Image 3 Style) */}
      {showMobileSheet && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[200] bg-black/50"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
            onClick={() => setShowMobileSheet(false)}
          />

          {/* Sheet */}
          <div
            className="fixed inset-x-0 bottom-0 z-[210] overflow-hidden"
            style={{
              backgroundColor: 'rgba(18, 20, 28, 0.98)',
              borderRadius: '20px 20px 0 0',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
              animation: 'slideUp 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="w-full flex justify-center pt-2 pb-1" style={{ height: '20px' }}>
              <div
                className="rounded-full"
                style={{ width: '36px', height: '4px', backgroundColor: 'rgba(255,255,255,0.3)' }}
              />
            </div>

            {/* Message Preview - styled like received message */}
            <div className="px-5 py-3">
              <div
                className="rounded-2xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  maxHeight: '80px',
                  overflow: 'hidden',
                }}
              >
                {message.deleted ? (
                  <span style={{ fontStyle: 'italic', opacity: 0.5 }}>This message was deleted</span>
                ) : message.type === "image" ? (
                  <span>📷 Image</span>
                ) : message.text ? (
                  <span style={{ color: 'var(--color-text)' }}>{message.text.slice(0, 150)}{message.text.length > 150 ? "..." : ""}</span>
                ) : (
                  <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Voice message</span>
                )}
              </div>
            </div>

            {/* Quick Emoji Reactions - Desktop Style (Swipeable) */}
            {!message.deleted && (
              <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="flex items-center gap-2 rounded-2xl p-2"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  {/* Scrollable emoji row - same as desktop */}
                  <div className="min-w-0 flex-1 overflow-x-auto no-scrollbar">
                    <div className="inline-flex items-center gap-1">
                      {SWIPE_REACTION_PAGES.map((page, pageIndex) => (
                        <div key={`mobile-page-${pageIndex}`} className="flex items-center gap-1">
                          {page.map((emoji) => (
                            <button
                              key={`mobile-${pageIndex}-${emoji}`}
                              onClick={() => {
                                handleReact(emoji);
                                setShowMobileSheet(false);
                              }}
                              className="h-10 w-10 rounded-full text-xl leading-none flex items-center justify-center transition-colors"
                              style={{ backgroundColor: 'transparent' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              aria-label={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Plus button for more reactions */}
                  <button
                    onClick={() => {
                      setShowMobileSheet(false);
                      setShowEmojiModal(true);
                    }}
                    className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                    aria-label="More reactions"
                  >
                    <Plus className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
                  </button>
                </div>
              </div>
            )}

            {/* Action List */}
            <div>
              {/* Reply */}
              <MobileSheetActionItem
                icon={CornerUpLeft}
                label="Reply"
                onClick={() => {
                  // TODO: Trigger reply
                  setShowMobileSheet(false);
                }}
              />

              {/* Copy - only for text/image with text */}
              {!message.deleted && message.text && (
                <MobileSheetActionItem
                  icon={Copy}
                  label="Copy"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(String(message.text ?? ""));
                    } catch {
                      // ignore
                    }
                    setShowMobileSheet(false);
                  }}
                />
              )}

              {/* Forward */}
              <MobileSheetActionItem
                icon={Forward}
                label="Forward"
                onClick={() => {
                  // TODO: Show "Coming soon" toast
                  setShowMobileSheet(false);
                }}
              />

              {/* Star */}
              <MobileSheetActionItem
                icon={Star}
                label="Star"
                onClick={() => {
                  onToggleStar?.(message.id);
                  setShowMobileSheet(false);
                }}
              />

              {/* Pin */}
              <MobileSheetActionItem
                icon={Pin}
                label="Pin"
                onClick={() => {
                  // TODO: Show "Coming soon" toast
                  setShowMobileSheet(false);
                }}
              />

              {/* Divider */}
              <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />

              {/* Edit - only for sent messages */}
              {isMine && !message.deleted && (
                <MobileSheetActionItem
                  icon={Pencil}
                  label="Edit"
                  onClick={() => {
                    onEdit?.(message);
                    setShowMobileSheet(false);
                  }}
                />
              )}

              {/* Delete - for all messages */}
              <MobileSheetActionItem
                icon={Trash2}
                label="Delete"
                danger
                onClick={() => {
                  onDelete?.(message.id, isMine ? "everyone" : "me");
                  setShowMobileSheet(false);
                }}
              />

              {/* Report - only for received messages */}
              {!isMine && (
                <>
                  <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
                  <MobileSheetActionItem
                    icon={Flag}
                    label="Report"
                    onClick={() => {
                      // TODO: Show "Message reported" toast
                      setShowMobileSheet(false);
                    }}
                  />
                </>
              )}
            </div>

            {/* Safe area padding for iOS */}
            <div style={{ height: 'env(safe-area-inset-bottom)' }} />
          </div>

          {/* Animation styles */}
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>
        </>
      )}
    </div>
  );
});

function MobileSheetActionItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between transition-colors active:bg-white/5"
      style={{
        height: '56px',
        padding: '0 20px',
        color: danger ? '#FF3B30' : 'var(--color-text)',
      }}
    >
      <div className="flex items-center gap-3">
        <Icon
          className="w-[22px] h-[22px]"
          style={{ color: danger ? '#FF3B30' : 'var(--color-text-secondary)' }}
        />
        <span style={{ fontSize: '16px', fontWeight: 400 }}>{label}</span>
      </div>
      <ChevronRight
        className="w-5 h-5"
        style={{ color: danger ? 'rgba(255,59,48,0.5)' : 'var(--color-text-muted)' }}
      />
    </button>
  );
}

function SheetActionItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3.5 flex items-center justify-between transition-colors ${
        danger ? "text-rose-400" : "text-slate-200"
      } active:bg-white/5`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${danger ? "text-rose-400" : "text-slate-400"}`} />
        <span className="text-base">{label}</span>
      </div>
      <ChevronRight className={`w-5 h-5 ${danger ? "text-rose-400/50" : "text-slate-500"}`} />
    </button>
  );
}

function StatusTicks({ status, compact = false, seenColor = "#38bdf8" }) {
  const clockClass = compact ? "w-2.5 h-2.5 text-white/70" : "w-3 h-3 text-white/70";
  const tickClass = compact ? "w-3 h-3 text-white/70" : "w-3.5 h-3.5 text-white/70";
  const seenClass = compact ? "w-3 h-3 flex-shrink-0" : "w-3.5 h-3.5 flex-shrink-0";

  if (status === "sending") {
    return <Clock3 className={clockClass} />;
  }
  if (status === "sent") {
    return <Check className={tickClass} />;
  }
  if (status === "delivered") {
    return <CheckCheck className={tickClass} />;
  }
  return <CheckCheck className={seenClass} style={{ color: seenColor }} />;
}

function ActionButton({ label, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left px-3 py-2 rounded-xl text-sm text-slate-200 hover:bg-white/10 transition-colors">
      {label}
    </button>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
        danger ? "text-rose-300 hover:bg-rose-500/10" : "text-slate-200 hover:bg-white/7"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[1.05rem] leading-none">{label}</span>
    </button>
  );
}

export default MessageBubble;
