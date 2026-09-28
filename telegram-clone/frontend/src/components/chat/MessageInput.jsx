import { useRef, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import EmojiGifStickerPicker from './EmojiGifStickerPicker';
import { wrapAnimatedEmojiToken } from '../../utils/emojiMessage';

export default function MessageInput({ chatId, replyingTo, onCancelReply, readOnly }) {
  const { sendMessage, startTyping, stopTyping, uploadFile } = useChat();
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeout = useRef(null);
  const textareaRef = useRef(null);

  const handleChange = (e) => {
    setText(e.target.value);
    startTyping(chatId);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => stopTyping(chatId), 1500);

    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 130) + 'px';
    }
  };

  const doSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(chatId, { type: 'text', content: trimmed, replyToId: replyingTo?.id || null });
    setText('');
    stopTyping(chatId);
    onCancelReply?.();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFile(file);
      sendMessage(chatId, {
        type: res.kind,
        content: null,
        fileUrl: res.url,
        fileName: res.name,
        fileSize: res.size,
        replyToId: replyingTo?.id || null
      });
      onCancelReply?.();
    } catch (err) {
      alert('Could not upload file: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  if (readOnly) {
    return (
      <div className="message-input-bar" style={{ justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, gap: 6 }}>
        🔒 Only the owner/admins can post in this channel
      </div>
    );
  }

  const handleSelectEmoji = (emoji) => {
    setText((t) => t + emoji);
    textareaRef.current?.focus();
  };

  const handleSelectGif = (gif) => {
    sendMessage(chatId, {
      type: 'gif',
      content: null,
      fileUrl: gif.url,
      fileName: gif.title || 'GIF',
      fileSize: null,
      replyToId: replyingTo?.id || null
    });
    setShowPicker(false);
    onCancelReply?.();
  };

  const handleSelectSticker = (sticker) => {
    sendMessage(chatId, {
      type: 'sticker',
      content: null,
      fileUrl: sticker.url,
      fileName: sticker.title || 'Sticker',
      fileSize: null,
      replyToId: replyingTo?.id || null
    });
    setShowPicker(false);
    onCancelReply?.();
  };

  // FairyChat Premium's "Animated Emojis" pack — inserted into the compose
  // text as a small `[id]` token (e.g. "[fire]"), same as picking a normal
  // emoji, so it can be mixed freely with typed text and other emoji in one
  // message. It shows as that plain token while composing (like a
  // WhatsApp/Discord `:shortcode:`), and renders as the real looping
  // animation, inline with the rest of the message, once sent — see
  // TextWithInlineEmoji / JumboEmojiContent in MessageBubble.jsx.
  const handleSelectAnimatedEmoji = (emoji) => {
    setText((t) => t + wrapAnimatedEmojiToken(emoji.id));
    textareaRef.current?.focus();
  };

  return (
    <div style={{ position: 'relative' }}>
      {showPicker && (
        <EmojiGifStickerPicker
          onSelectEmoji={handleSelectEmoji}
          onSelectGif={handleSelectGif}
          onSelectSticker={handleSelectSticker}
          onSelectAnimatedEmoji={handleSelectAnimatedEmoji}
          onClose={() => setShowPicker(false)}
        />
      )}
      {replyingTo && (
        <div className="reply-preview">
          <div>
            <div style={{ fontWeight: 700 }}>↩ Replying</div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
              {replyingTo.type === 'animated-emoji' ? '✨ Animated Emoji' : (replyingTo.content || 'Media message')}
            </div>
          </div>
          <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={onCancelReply}>✕</button>
        </div>
      )}
      <div className="message-input-bar">
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFile} />
        <button className="attach-btn" onClick={() => setShowPicker((v) => !v)} title="Emoji, GIFs & Stickers">😊</button>
        <button className="attach-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Send file">
          {uploading ? '⏳' : '📎'}
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Message"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <button className="send-btn" onClick={doSend} disabled={!text.trim()} title="Send">➤</button>
      </div>
    </div>
  );
}
