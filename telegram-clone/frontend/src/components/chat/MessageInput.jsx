import { useRef, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import GifPicker from './GifPicker';

export default function MessageInput({ chatId, replyingTo, onCancelReply, readOnly }) {
  const { sendMessage, startTyping, stopTyping, uploadFile } = useChat();
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
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
      alert('File upload nahi ho payi: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  if (readOnly) {
    return (
      <div className="message-input-bar" style={{ justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, gap: 6 }}>
        🔒 Is channel me sirf owner/admin hi post kar sakte hain
      </div>
    );
  }

  const handleGifSelect = (gif) => {
    sendMessage(chatId, {
      type: 'gif',
      content: null,
      fileUrl: gif.url,
      fileName: gif.title || 'GIF',
      fileSize: null,
      replyToId: replyingTo?.id || null
    });
    setShowGifPicker(false);
    onCancelReply?.();
  };

  return (
    <div style={{ position: 'relative' }}>
      {showGifPicker && (
        <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifPicker(false)} />
      )}
      {replyingTo && (
        <div className="reply-preview">
          <div>
            <div style={{ fontWeight: 700 }}>↩ Reply kar rahe hain</div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
              {replyingTo.content || 'Media message'}
            </div>
          </div>
          <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={onCancelReply}>✕</button>
        </div>
      )}
      <div className="message-input-bar">
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFile} />
        <button className="attach-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading} title="File bhejein">
          {uploading ? '⏳' : '📎'}
        </button>
        <button className="attach-btn" onClick={() => setShowGifPicker((v) => !v)} title="GIF bhejein">🎞️</button>
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Message likhein..."
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <button className="send-btn" onClick={doSend} disabled={!text.trim()} title="Bhejein">➤</button>
      </div>
    </div>
  );
}
