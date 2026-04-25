import { memo, useMemo, useRef, useState, useCallback, useEffect } from "react";
import MessageBubble from "./MessageBubble.jsx";
import { Pin } from "lucide-react";
import ChatSkeleton from "./ChatSkeleton.jsx";

export default function MessageList({
  messages,
  currentUser,
  activeContact,
  isTyping,
  onReact,
  onEdit,
  onDelete,
  onToggleStar,
  onOpenImage,
  onReply,
  chatSide,
  appearance,
  selectedMessageId,
  onSelectMessage,
  isMessagesLoading,
  scrollToBottom,
}) {
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const lastMessagesCountRef = useRef(messages.length);

  const groupedRows = useMemo(() => buildMessageRows(messages), [messages]);

  useEffect(() => {
    const currentCount = messages.length;
    const prevCount = lastMessagesCountRef.current;
    lastMessagesCountRef.current = currentCount;

    if (currentCount > prevCount && prevCount > 0) {
        // If it's not the initial load and new messages arrived
        // We can handle the jump button logic here if needed, 
        // but for now let's keep it simple.
    }
  }, [messages.length]);

  if (isMessagesLoading) {
    return <ChatSkeleton count={6} chatSide={chatSide} />;
  }

  if (!messages.length && !isTyping) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center h-full">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-3xl">💬</div>
        <div>
          <p className="text-slate-300 font-medium">No messages yet</p>
          <p className="text-slate-500 text-sm mt-1">Say hello to {activeContact?.displayName ?? "them"}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-3 md:px-4 py-3 md:py-4 min-h-full">
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
        // In group chats, use message.sender for incoming messages to get individual names/avatars.
        const sender = isMine ? currentUser : (message.sender || activeContact);

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