import { memo, useEffect, useMemo, useRef, useState, useCallback } from "react";
import MessageBubble from "./MessageBubble.jsx";

export default function MessageList({
  messages,
  currentUser,
  activeContact,
  activeContactId,
  isTyping,
  onReact,
  onEdit,
  onDelete,
  onToggleStar,
  onOpenImage,
  saveScrollPosition,
  getSavedScrollPosition,
  chatSide,
  appearance,
}) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const lastMessagesCountRef = useRef(messages.length);
  const isAutoScrollingRef = useRef(false);

  const isNearBottom = useCallback((container, threshold = 50) => {
    if (!container) return true;
    return container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
  }, []);

  const groupedRows = useMemo(() => buildMessageRows(messages), [messages]);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const container = containerRef.current;
    if (!container) return;
    isAutoScrollingRef.current = true;
    container.scrollTo({ top: container.scrollHeight, behavior });
    setShowJumpButton(false);
    setNewMessagesCount(0);
    // Use a timeout to reset the flag since scroll events might lag
    setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 500);
  }, []);

  const handleContainerScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (isAutoScrollingRef.current) return;

    saveScrollPosition?.(activeContactId, container.scrollTop);
    const nearBottom = isNearBottom(container);
    setShowJumpButton(!nearBottom);
    if (nearBottom) {
      setNewMessagesCount(0);
    }
  }, [activeContactId, isNearBottom, saveScrollPosition]);

  // Handle new messages and auto-scroll logic
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const currentCount = messages.length;
    const prevCount = lastMessagesCountRef.current;
    lastMessagesCountRef.current = currentCount;

    if (currentCount > prevCount) {
      const lastMsg = messages[messages.length - 1];
      const isMyMessage = lastMsg?.senderId === currentUser?.id;
      const nearBottom = isNearBottom(container, 150);

      if (isMyMessage || nearBottom) {
        // Use a small timeout to ensure DOM has updated
        setTimeout(() => scrollToBottom("smooth"), 50);
      } else {
        setNewMessagesCount((prev) => prev + (currentCount - prevCount));
      }
    }
  }, [messages, currentUser?.id, isNearBottom, scrollToBottom]);

  // Handle chat change and initial scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !activeContactId) return;

    const previous = getSavedScrollPosition?.(activeContactId);
    
    if (previous !== undefined && previous !== null) {
      container.scrollTop = previous;
      setShowJumpButton(!isNearBottom(container));
    } else {
      // First time opening this chat or no position saved -> scroll to bottom
      // Use instant scroll for initial load
      const raf = requestAnimationFrame(() => {
        scrollToBottom("auto");
      });
      return () => cancelAnimationFrame(raf);
    }

    setNewMessagesCount(0);
    const raf = requestAnimationFrame(() => {
      setShowJumpButton(!isNearBottom(container));
    });
    return () => cancelAnimationFrame(raf);
  }, [activeContactId, getSavedScrollPosition, isNearBottom, scrollToBottom]);

  if (!messages.length && !isTyping) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-3xl">💬</div>
        <div>
          <p className="text-slate-300 font-medium">No messages yet</p>
          <p className="text-slate-500 text-sm mt-1">Say hello to {activeContact?.displayName ?? "them"}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-0 flex-1 min-h-0">
      <div
        ref={containerRef}
        onScroll={handleContainerScroll}
        className="h-full overflow-y-scroll px-3 md:px-4 py-3 md:py-4 flex flex-col gap-1 scroll-smooth touch-pan-y"
        style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
      >
        {groupedRows.map(({ key, type, label, message, showAvatar }) => {
          if (type === "divider") {
            return (
              <div key={key} className="flex items-center justify-center my-3">
                <span className="text-[10px] text-slate-500 bg-white/5 border border-white/8 px-3 py-1 rounded-full">
                  {label}
                </span>
              </div>
            );
          }

          const isMine = message.senderId === currentUser?.id;
          const sender = isMine ? currentUser : activeContact;

          return (
            <MessageRow
              key={message.id}
              message={message}
              isMine={isMine}
              sender={sender}
              currentUser={currentUser}
              activeContact={activeContact}
              isGroupChat={Boolean(activeContact?.isGroup)}
              showAvatar={showAvatar}
              onReact={onReact}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleStar={onToggleStar}
              onOpenImage={onOpenImage}
              chatSide={chatSide}
              appearance={appearance}
            />
          );
        })}

        {isTyping && (
          <div className="flex items-end gap-2 animate-in fade-in duration-200 mt-1">
            <div className="w-7" />
            <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-typing-dot" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-typing-dot" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-typing-dot" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {showJumpButton && (
        <div className="absolute z-20 right-4 bottom-4 flex flex-col items-center gap-2">
          {newMessagesCount > 0 && (
            <div className="animate-in zoom-in slide-in-from-bottom-2 duration-300 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap border border-white/20">
              {newMessagesCount} new message{newMessagesCount !== 1 ? "s" : ""}
            </div>
          )}
          <button
            onClick={() => {
              scrollToBottom("smooth");
            }}
            className="group relative w-10 h-10 rounded-full bg-slate-900/95 border border-white/20 text-slate-200 hover:text-white shadow-lg transition-all hover:scale-105 flex items-center justify-center overflow-hidden"
            aria-label="Jump to latest message"
          >
            <span className="text-lg transition-transform group-hover:translate-y-0.5">↓</span>
            {newMessagesCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

const MessageRow = memo(function MessageRow({
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
  return (
    <div className="animate-message-in">
      <MessageBubble
        message={message}
        isMine={isMine}
        sender={sender}
        currentUser={currentUser}
        activeContact={activeContact}
        isGroupChat={isGroupChat}
        showAvatar={showAvatar}
        onReact={onReact}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleStar={onToggleStar}
        onOpenImage={onOpenImage}
        chatSide={chatSide}
        appearance={appearance}
      />
    </div>
  );
});

function buildMessageRows(messages) {
  const rows = [];
  let lastDate = "";

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const currentDate = getDateLabel(message.createdAt);
    if (currentDate !== lastDate) {
      rows.push({ key: `divider-${currentDate}-${index}`, type: "divider", label: currentDate });
      lastDate = currentDate;
    }

    const prev = messages[index - 1];
    const sameSender = prev && prev.senderId === message.senderId;
    const isCloseInTime = prev
      ? new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime() < 4 * 60 * 1000
      : false;

    rows.push({
      key: message.id,
      type: "message",
      message,
      showAvatar: !(sameSender && isCloseInTime),
    });
  }
  return rows;
}

function getDateLabel(isoDate) {
  const date = new Date(isoDate);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}