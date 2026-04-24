import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import MessageBubble from "./MessageBubble.jsx";
import { Pin } from "lucide-react";
import ChatSkeleton from "./ChatSkeleton.jsx";

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
  onReply,
  saveScrollPosition,
  getSavedScrollPosition,
  chatSide,
  appearance,
  selectedMessageId,
  onSelectMessage,
  isMessagesLoading,
}) {
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const lastMessagesCountRef = useRef(messages.length);
  const isAutoScrollingRef = useRef(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const isNearBottom = useCallback((container, threshold = 50) => {
    if (!container) return true;
    return container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
  }, []);

  const groupedRows = useMemo(() => buildMessageRows(messages), [messages]);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    isAutoScrollingRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    setShowJumpButton(false);
    setNewMessagesCount(0);
    setIsAtBottom(true);
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
    const nearBottom = isNearBottom(container, 180); // WhatsApp-style 180px tolerance
    setIsAtBottom(nearBottom);
    setShowJumpButton(!nearBottom);
    if (nearBottom) {
      setNewMessagesCount(0);
    }
  }, [activeContactId, isNearBottom, saveScrollPosition]);

  const isInitialLoadRef = useRef(true);

  // Reset initial load state when switching chats
  useEffect(() => {
    isInitialLoadRef.current = true;
    setNewMessagesCount(0);
  }, [activeContactId]);

  // Use useLayoutEffect for the "instant" feeling on initial load
  // and handle auto-scroll for new messages
  useLayoutEffect(() => {
    // If loading, don't do anything yet
    if (isMessagesLoading) return;
    
    const container = containerRef.current;
    if (!container || messages.length === 0) return;

    if (isInitialLoadRef.current) {
      // Instant jump to bottom or saved position on first load after loading finishes
      const previous = getSavedScrollPosition?.(activeContactId);
      if (previous !== undefined && previous !== null) {
        container.scrollTop = previous;
      } else {
        scrollToBottom("auto"); // Instant scroll
      }
      isInitialLoadRef.current = false;
      setShowJumpButton(!isNearBottom(container));
    } else {
      // Handle new messages
      const currentCount = messages.length;
      const prevCount = lastMessagesCountRef.current;
      lastMessagesCountRef.current = currentCount;

      if (currentCount > prevCount) {
        const lastMsg = messages[messages.length - 1];
        const isMyMessage = lastMsg?.senderId === currentUser?.id;

        if (isMyMessage || isAtBottom) {
          scrollToBottom("smooth"); // Smooth scroll for new messages
        } else {
          setNewMessagesCount((prev) => prev + (currentCount - prevCount));
        }
      }
    }
  }, [messages, activeContactId, currentUser?.id, getSavedScrollPosition, isNearBottom, scrollToBottom, isMessagesLoading, isAtBottom]);

  if (isMessagesLoading) {
    return <ChatSkeleton count={6} chatSide={chatSide} />;
  }

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
          if (type === "divider" || message?.type === "system") {
            const displayLabel = type === "divider" ? label : message.text;
            return (
              <div key={key} className="flex items-center justify-center my-3 group">
                <div className="flex-1 h-[1px] bg-white/5 group-hover:bg-white/10 transition-colors mr-3" />
                <span className="text-[10px] text-slate-500 bg-white/5 border border-white/8 px-3 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                  {message?.type === "system" && <Pin className="w-2.5 h-2.5" style={{ transform: "rotate(30deg)" }} />}
                  {displayLabel}
                </span>
                <div className="flex-1 h-[1px] bg-white/5 group-hover:bg-white/10 transition-colors ml-3" />
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
              onReply={onReply}
              chatSide={chatSide}
              appearance={appearance}
              allMessages={messages}
              isSelected={selectedMessageId === message.id}
              onSelect={() => onSelectMessage(message)}
              isSelectionMode={Boolean(selectedMessageId)}
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
        <div ref={messagesEndRef} className="h-px" />
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
  onReply,
  chatSide,
  appearance,
  allMessages,
  isSelected,
  onSelect,
  isSelectionMode,
}) {
  return (
    <div id={`msg-${message.id}`} className="animate-message-in">
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
        onReply={onReply}
        chatSide={chatSide}
        appearance={appearance}
        allMessages={allMessages}
        isSelected={isSelected}
        onSelect={onSelect}
        isSelectionMode={isSelectionMode}
      />
    </div>
  );
});

function buildMessageRows(messages) {
  const rows = [];
  let lastDate = "";

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    
    if (message.type === "system") {
        rows.push({
            key: message.id,
            type: "system",
            message
        });
        continue;
    }

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