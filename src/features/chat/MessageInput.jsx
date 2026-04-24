import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import EmojiPicker from "emoji-picker-react";
import {
  Smile,
  Search,
  Image as ImageIcon,
  SendHorizontal,
  Paperclip,
  Crop,
  Type,
  PenLine, RotateCcw,
  X,
  CornerUpLeft,
  Check,
} from "lucide-react";
import {
  validateImageFile,
  readFileAsDataURL,
} from "../../utils/helpers.js";
import ImageCropModal from "./ImageCropModal.jsx";
import VoiceRecorder from "./input/VoiceRecorder.jsx";
import MentionDropdown from "./input/MentionDropdown.jsx";

const GIF_LIBRARY = [
  { id: "gif-1", title: "Happy", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" },
  { id: "gif-2", title: "Clap", url: "https://media.giphy.com/media/3ohhweiVB36rAlqVCE/giphy.gif" },
  { id: "gif-3", title: "Laugh", url: "https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif" },
  { id: "gif-4", title: "Thumbs up", url: "https://media.giphy.com/media/xUPGcguWZHRC2HyBRS/giphy.gif" },
  { id: "gif-5", title: "Wow", url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif" },
  { id: "gif-6", title: "Party", url: "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif" },
];

export default function MessageInput({
  onSend,
  disabled,
  activeContact,
  storageError,
  inputFocusToken,
  onTypingStart,
  onTypingStop,
  theme,
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
}) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [pickerTab, setPickerTab] = useState("emoji");
  const [pickerSearch, setPickerSearch] = useState("");
  const [imageError, setImageError] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);

  const previewCanvasRef = useRef(null);
  const [originalPreviewDataUrl, setOriginalPreviewDataUrl] = useState(null);
  const [editedDataUrl, setEditedDataUrl] = useState(null);
  const [openCrop, setOpenCrop] = useState(false);
  const [sourceFileForCrop, setSourceFileForCrop] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawStateRef = useRef({ active: false, x: 0, y: 0 });

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const pickerSearchRef = useRef(null);
  const pickerPanelRef = useRef(null);
  const pickerToggleRef = useRef(null);
  const typingTimerRef = useRef(null);

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionSelectionIdx, setMentionSelectionIdx] = useState(0);

  const canSend = (text.trim().length > 0 || pendingImage) && !disabled;

  const getThemeCssColor = useCallback((token, fallback) => {
    if (typeof window === "undefined") return fallback;
    const value = window.getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    return value || fallback;
  }, []);

  const previewSource = editedDataUrl || pendingImage?.dataUrl || null;

  useEffect(() => {
    if (!inputFocusToken || disabled) return;
    textareaRef.current?.focus();
  }, [inputFocusToken, disabled]);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || "");
      textareaRef.current?.focus();
    } else {
      // Clear or restore draft
      setText("");
    }
  }, [editingMessage]);

  useEffect(() => {
    if (!showEmoji) return;

    function handleOutsidePointerDown(event) {
      const target = event.target;
      if (pickerPanelRef.current?.contains(target)) return;
      if (pickerToggleRef.current?.contains(target)) return;
      setShowEmoji(false);
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    document.addEventListener("mousedown", handleOutsidePointerDown, true);
    document.addEventListener("touchstart", handleOutsidePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
      document.removeEventListener("mousedown", handleOutsidePointerDown, true);
      document.removeEventListener("touchstart", handleOutsidePointerDown, true);
    };
  }, [showEmoji]);

  useEffect(() => {
    if (!showEmoji && !pendingImage) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showEmoji, pendingImage]);

  const pickerTheme = useMemo(() => "dark", []);
  const hasText = text.trim().length > 0;
  const charCount = text.length;

  function extractMentions(messageText) {
    if (!activeContact?.isGroup || !activeContact?.members) return [];
    
    const mentionRegex = /@(\S+)/g;
    const matches = [...messageText.matchAll(mentionRegex)];
    const usernameMatches = matches.map(m => m[1].toLowerCase());
    
    const userIds = usernameMatches.map(uname => {
      const member = activeContact.members.find(
        (m) => String(m.username).toLowerCase() === uname || String(m.displayName).toLowerCase() === uname
      );
      return member ? member.id || member._id : null;
    }).filter(Boolean);

    return [...new Set(userIds)];
  }

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    onTypingStop?.();

    if (pendingImage) {
      await onSend({
        text: text.trim(),
        type: "image",
        imageData: previewSource || pendingImage.dataUrl,
        imageFile: pendingImage.file,
        mentions: extractMentions(text),
      });
      setPendingImage(null);
      setOriginalPreviewDataUrl(null);
      setEditedDataUrl(null);
    } else {
      await onSend({ text: text.trim(), type: "text", imageData: null, mentions: extractMentions(text) });
    }

    setText("");
    setShowEmoji(false);
    textareaRef.current?.focus();
  }, [canSend, text, pendingImage, onSend, previewSource, onTypingStop]);

  // Voice recording complete handler — passes actual blob up
  const handleVoiceComplete = useCallback(
    async ({ blob, duration }) => {
      await onSend({ type: "voice", text: "", duration, imageData: null, voiceBlob: blob });
    },
    [onSend]
  );

  function handleTextChange(e) {
    const val = e.target.value.slice(0, 400);
    setText(val);
    
    if (onTypingStart && onTypingStop) {
      onTypingStart();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onTypingStop();
      }, 2000);
    }

    if (activeContact?.isGroup) {
      const cursor = e.target.selectionEnd || 0;
      const textToCursor = val.slice(0, cursor);
      const match = textToCursor.match(/@(\S*)$/);
      if (match) {
        setMentionQuery(match[1]);
        setShowMentions(true);
        setMentionSelectionIdx(0);
      } else {
        setShowMentions(false);
      }
    }
  }

  const filteredGifs = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return GIF_LIBRARY;
    return GIF_LIBRARY.filter((gif) => gif.title.toLowerCase().includes(q));
  }, [pickerSearch]);

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function insertEmoji(emoji) {
    setText((prev) => prev + emoji);
    textareaRef.current?.focus();
  }

  function handleSelectGif(gifUrl) {
    if (disabled) return;
    onSend({ text: "", type: "image", imageData: gifUrl });
    setShowEmoji(false);
    setPickerSearch("");
    textareaRef.current?.focus();
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateImageFile(file);
    if (err) {
      setImageError(err);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImageError(null);
    try {
      const dataUrl = await readFileAsDataURL(file);
      setPendingImage({ dataUrl, file });
      setOriginalPreviewDataUrl(dataUrl);
      setEditedDataUrl(dataUrl);
      setShowEmoji(false);
    } catch {
      setImageError("Failed to read image.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePendingImage() {
    setPendingImage(null);
    setOriginalPreviewDataUrl(null);
    setEditedDataUrl(null);
    setImageError(null);
  }

  async function dataUrlToFile(dataUrl, name = "image.jpg") {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], name, { type: blob.type || "image/jpeg" });
  }

  function getCanvasPoint(event) {
    const canvas = previewCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in event ? event.touches[0]?.clientX : event.clientX;
    const clientY = "touches" in event ? event.touches[0]?.clientY : event.clientY;
    if (typeof clientX !== "number" || typeof clientY !== "number") return null;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  useEffect(() => {
    if (!pendingImage || !previewSource || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, img.width, img.height);
      ctx.drawImage(img, 0, 0, img.width, img.height);
    };
    img.src = previewSource;
  }, [pendingImage, previewSource]);

  function commitCanvasEdit() {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    setEditedDataUrl(canvas.toDataURL("image/jpeg", 0.92));
  }

  async function handleCropImage() {
    const sourceUrl = previewSource;
    if (!sourceUrl) return;
    const file = await dataUrlToFile(sourceUrl, "croppable.jpg");
    setSourceFileForCrop(file);
    setOpenCrop(true);
  }

  function handleAddText() {
    const input = window.prompt("Add text");
    if (!input?.trim()) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.save();
    ctx.font = `bold ${Math.max(28, Math.round(canvas.width * 0.05))}px sans-serif`;
    ctx.textBaseline = "bottom";
    ctx.fillStyle = getThemeCssColor("--color-text", "white");
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 6;
    const x = Math.max(24, Math.round(canvas.width * 0.06));
    const y = Math.max(80, Math.round(canvas.height * 0.9));
    ctx.strokeText(input.trim(), x, y);
    ctx.fillText(input.trim(), x, y);
    ctx.restore();

    commitCanvasEdit();
  }

  function startDrawing(event) {
    if (!isDrawing) return;
    const point = getCanvasPoint(event);
    const canvas = previewCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!point || !canvas || !ctx) return;
    drawStateRef.current = { active: true, x: point.x, y: point.y };
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function moveDrawing(event) {
    if (!isDrawing || !drawStateRef.current.active) return;
    const point = getCanvasPoint(event);
    const canvas = previewCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!point || !canvas || !ctx) return;
    if ("touches" in event) event.preventDefault();

    ctx.lineWidth = Math.max(4, Math.round(canvas.width * 0.006));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = getThemeCssColor("--color-accent", "teal");
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    drawStateRef.current.x = point.x;
    drawStateRef.current.y = point.y;
  }

  function endDrawing() {
    if (!drawStateRef.current.active) return;
    drawStateRef.current.active = false;
    commitCanvasEdit();
  }

  function handleUndo() {
    if (!originalPreviewDataUrl) return;
    setEditedDataUrl(originalPreviewDataUrl);
  }

  function handleMentionSelect(member) {
    const newText = text.replace(new RegExp(`@${mentionQuery}$`), `@${member.username} `);
    setText(newText);
    setShowMentions(false);
    textareaRef.current?.focus();
  }

  return (
    <div
      className="flex flex-col gap-2 px-2.5 md:px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+8px)] md:pb-[calc(env(safe-area-inset-bottom)+12px)] border-t border-white/8 backdrop-blur-md sticky bottom-0 z-20"
      style={{ background: "color-mix(in srgb, var(--color-surface) 88%, transparent)" }}
    >
      {replyTo && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-1 h-8 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: "var(--color-accent)" }}>Replying to {replyTo.sender?.displayName || "Unknown"}</p>
            <p className="text-sm text-slate-300 truncate">{replyTo.text || "Media"}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Cancel reply"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}

      {editingMessage && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-1 h-8 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: "var(--color-accent)" }}>Editing message</p>
            <p className="text-sm text-slate-300 truncate">{editingMessage.text || "Media"}</p>
          </div>
          <button
            onClick={onCancelEdit}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Cancel edit"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}

      {storageError && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-red-300 text-xs">
          {storageError}
        </div>
      )}

      {pendingImage && (
        <div className="relative w-fit animate-message-in">
          <img src={pendingImage.dataUrl} alt="Preview" className="h-24 rounded-xl object-cover border border-white/10" />
          <button onClick={removePendingImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            x
          </button>
        </div>
      )}

      {imageError && <p className="text-xs text-red-400 px-1">{imageError}</p>}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          {showEmoji && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-[70] bg-transparent"
                onClick={() => setShowEmoji(false)}
                aria-label="Close emoji picker"
              />
              <div
                ref={pickerPanelRef}
                className="absolute bottom-full mb-2 left-0 z-[75] w-[min(40rem,calc(100vw-1.5rem))] max-h-[65vh] rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl animate-reaction-pop overflow-hidden"
                style={{ backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, black 12%)" }}
              >
                <div className="p-3 border-b border-white/10">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={pickerSearchRef}
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder={pickerTab === "emoji" ? "Search with text or emoji" : "Search GIFs"}
                     className="w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2"
                     style={{
                       color: "var(--color-text)",
                       backgroundColor: "color-mix(in srgb, var(--color-surface) 92%, white 8%)",
                       borderColor: "color-mix(in srgb, var(--color-accent) 44%, transparent)",
                       boxShadow: "none",
                     }}
                    />
                  </div>
                   <div
                     className="mt-3 grid grid-cols-2 rounded-xl border p-1 text-sm"
                     style={{
                       borderColor: "color-mix(in srgb, var(--color-text) 14%, transparent)",
                       backgroundColor: "color-mix(in srgb, var(--color-surface) 88%, transparent)",
                     }}
                   >
                    <button
                      onClick={() => setPickerTab("emoji")}
                      className={`rounded-lg py-1.5 transition-colors ${pickerTab === "emoji" ? "bg-white/20 text-white" : "text-slate-300 hover:text-white"}`}
                    >
                      Emojis
                    </button>
                    <button
                      onClick={() => setPickerTab("gif")}
                      className={`rounded-lg py-1.5 transition-colors ${pickerTab === "gif" ? "bg-white/20 text-white" : "text-slate-300 hover:text-white"}`}
                    >
                      GIFs
                    </button>
                  </div>
                </div>

                 <div className="p-2 max-h-[48vh] overflow-y-auto bg-transparent">
                  {pickerTab === "emoji" ? (
                    <EmojiPicker
                       className="chat-emoji-picker"
                      open
                      theme={pickerTheme}
                      width="100%"
                      height={360}
                      searchDisabled
                      skinTonesDisabled
                      lazyLoadEmojis
                      previewConfig={{ showPreview: false }}
                      onEmojiClick={(emojiData) => insertEmoji(emojiData.emoji)}
                    />
                  ) : (
                    <div className="space-y-3">

                      <div className="grid grid-cols-2 gap-2">
                        {filteredGifs.map((gif) => (
                          <button
                            key={gif.id}
                            onClick={() => handleSelectGif(gif.url)}
                            className="rounded-xl overflow-hidden border border-white/10 bg-slate-800/40 hover:border-emerald-400/40 transition-colors"
                          >
                            <img src={gif.url} alt={gif.title} className="h-24 w-full object-cover" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

          <MentionDropdown
            show={showMentions}
            query={mentionQuery}
            members={activeContact?.members}
            selectionIdx={mentionSelectionIdx}
            onSelect={handleMentionSelect}
          />

          <div
            className="flex items-center gap-2 min-h-[58px] rounded-[30px] border border-white/12 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all"
            style={{
              backgroundColor: "color-mix(in srgb, var(--color-surface) 86%, white 8%)",
              borderColor: "color-mix(in srgb, var(--color-accent) 45%, transparent)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 2px color-mix(in srgb, var(--color-accent) 22%, transparent)",
            }}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
               className="h-9 w-9 md:h-10 md:w-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors disabled:opacity-40"
               style={{ color: "var(--color-text-muted)" }}
              aria-label="Attach media"
            >
              <Paperclip className="w-5 h-5 md:w-5.5 md:h-5.5" />
            </button>

            <button
              ref={pickerToggleRef}
              type="button"
              onClick={() => {
                setShowEmoji((s) => !s);
                setTimeout(() => pickerSearchRef.current?.focus(), 0);
              }}
              disabled={disabled}
               className="h-9 w-9 md:h-10 md:w-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors disabled:opacity-40"
               style={{ color: "var(--color-text-muted)" }}
              aria-label="Emoji and GIF picker"
            >
              <Smile className="w-5 h-5 md:w-5.5 md:h-5.5" />
            </button>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? "Select a chat to start messaging" : editingMessage ? "Edit your message..." : "Type a message..."}
              disabled={disabled}
              rows={1}
               className="flex-1 bg-transparent py-2 text-base outline-none resize-none leading-relaxed max-h-32 overflow-y-auto placeholder-[color:var(--color-text-muted)]"
               style={{ minHeight: "36px", color: "var(--color-text)" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
              }}
            />

            <span
              className="hidden sm:block text-xs pr-1 self-center min-w-[52px] text-right tabular-nums"
              style={{ color: "var(--color-text-muted)" }}
            >
              {charCount}/400
            </span>
          </div>
        </div>

        {!hasText && !pendingImage ? (
          <VoiceRecorder disabled={disabled} onRecordingComplete={handleVoiceComplete} />
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="w-12 h-12 flex items-center justify-center flex-shrink-0 rounded-full text-white shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-accent) 88%, white 12%))",
              boxShadow: "0 12px 26px color-mix(in srgb, var(--color-accent) 28%, transparent)",
            }}
            aria-label={editingMessage ? "Update message" : "Send message"}
          >
            {editingMessage ? (
              <Check className="w-6 h-6" />
            ) : (
              <SendHorizontal className="w-6 h-6" />
            )}
          </button>
        )}
      </div>

      {pendingImage && createPortal(
        <div className="fixed inset-0 z-[9999] w-screen h-[100dvh] bg-black/95 flex flex-col animate-in fade-in duration-200">
          {/* Modern Toolbar: White Pill Shape with Labels - Now at the Bottom */}
          <div className="absolute bottom-[240px] left-1/2 -translate-x-1/2 z-[10000] px-6 py-2.5 rounded-[32px] bg-white/95 shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex items-center gap-7 border border-white/20 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300">
            <button
              type="button"
              onClick={removePendingImage}
              className="group flex flex-col items-center gap-1 transition-all hover:scale-105"
            >
              <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                <X className="w-4.5 h-4.5" />
              </div>
              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 group-hover:text-red-500">Close</span>
            </button>

            <div className="w-[1px] h-8 bg-slate-200/60" />

            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={handleCropImage}
                className="group flex flex-col items-center gap-1 transition-all hover:scale-105"
              >
                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                  <Crop className="w-4 h-4" />
                </div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 group-hover:text-emerald-600">Crop</span>
              </button>

              <button
                type="button"
                onClick={handleAddText}
                className="group flex flex-col items-center gap-1 transition-all hover:scale-105"
              >
                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <Type className="w-4 h-4" />
                </div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 group-hover:text-blue-600">Text</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDrawing((prev) => !prev)}
                className="group flex flex-col items-center gap-1 transition-all hover:scale-105"
              >
                <div className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
                  isDrawing ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-800 group-hover:bg-rose-50 group-hover:text-rose-600"
                }`}>
                  <PenLine className="w-4 h-4" />
                </div>
                <span className={`text-[9px] uppercase tracking-wider font-bold ${isDrawing ? "text-rose-600" : "text-slate-500 group-hover:text-rose-600"}`}>Draw</span>
              </button>

              <button
                type="button"
                onClick={handleUndo}
                className="group flex flex-col items-center gap-1 transition-all hover:scale-105"
              >
                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 group-hover:text-amber-600">Reset</span>
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full flex items-center justify-center px-2 md:px-4 pb-2 md:pb-3 overflow-hidden">
            <canvas
              ref={previewCanvasRef}
              onMouseDown={startDrawing}
              onMouseMove={moveDrawing}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              onTouchStart={startDrawing}
              onTouchMove={moveDrawing}
              onTouchEnd={endDrawing}
              className={`h-full w-full max-h-full max-w-full object-contain ${
                isDrawing ? "cursor-crosshair" : "cursor-default"
              }`}
            />
          </div>

          <div className="p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] border-t border-white/10 bg-black/65 backdrop-blur-sm flex items-end gap-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 400))}
              placeholder="Add a caption"
              className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:border-emerald-400/40"
            />
            <button
              type="button"
              onClick={handleSend}
              className="h-12 w-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-colors"
              aria-label="Send selected image"
            >
              <SendHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>,
        document.body,
      )}

      <ImageCropModal
        open={openCrop}
        sourceFile={sourceFileForCrop}
        title="Crop image"
        mode="background"
        applyLabel="Apply"
        onApply={(dataUrl) => {
          setEditedDataUrl(dataUrl);
          setPendingImage((prev) => (prev ? { ...prev, dataUrl } : prev));
          setOpenCrop(false);
          setSourceFileForCrop(null);
        }}
        onCancel={() => {
          setOpenCrop(false);
          setSourceFileForCrop(null);
        }}
      />
    </div>
  );
}
