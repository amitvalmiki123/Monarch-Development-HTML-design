import { useMemo, useState } from 'react';
import ChatListItem from './ChatListItem';
import NewChatModal from './NewChatModal';
import TopMenu from '../nav/TopMenu';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

export default function Sidebar({ activeChatId, onSelectChat }) {
  const { user } = useAuth();
  const { chats, chatsLoaded, togglePinChat, toggleMuteChat, deleteChat } = useChat();
  const [query, setQuery] = useState('');
  const [newChatMode, setNewChatMode] = useState(null); // null | 'direct' | 'group' | 'channel'
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const selectionMode = selectedIds.size > 0;

  const filtered = useMemo(() => {
    if (!query.trim()) return chats;
    const q = query.trim().toLowerCase();
    return chats.filter((c) => c.name?.toLowerCase().includes(q));
  }, [chats, query]);

  const selectedChats = useMemo(
    () => chats.filter((c) => selectedIds.has(c.id)),
    [chats, selectedIds]
  );

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelect = (chatId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId); else next.add(chatId);
      return next;
    });
  };

  const handleItemClick = (chatId) => {
    if (selectionMode) toggleSelect(chatId);
    else onSelectChat(chatId);
  };

  const handleLongPress = (chatId) => {
    // "Saved Messages" always has exactly one instance and can't be deleted
    // — still pinnable/mutable, so it's fine to select.
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(chatId);
      return next;
    });
  };

  const allPinned = selectedChats.length > 0 && selectedChats.every((c) => c.pinned);
  const allMuted = selectedChats.length > 0 && selectedChats.every((c) => c.muted);
  const canDelete = selectedChats.every((c) => c.type !== 'saved');

  const handlePinAction = async () => {
    const desired = !allPinned;
    await Promise.all(selectedChats.filter((c) => !!c.pinned !== desired).map((c) => togglePinChat(c.id)));
    clearSelection();
  };

  const handleMuteAction = async () => {
    const desired = !allMuted;
    await Promise.all(selectedChats.filter((c) => !!c.muted !== desired).map((c) => toggleMuteChat(c.id)));
    clearSelection();
  };

  const handleDeleteAction = async () => {
    const count = selectedChats.length;
    const label = count === 1 ? `"${selectedChats[0].name}"` : `${count} chats`;
    if (!window.confirm(`Delete ${label}? This can't be undone.`)) return;
    await Promise.all(selectedChats.filter((c) => c.type !== 'saved').map((c) => deleteChat(c.id)));
    clearSelection();
  };

  return (
    <div className="sidebar">
      {selectionMode ? (
        <div className="sidebar__topbar sidebar__topbar--selection">
          <button className="selection-bar__close" onClick={clearSelection} aria-label="Cancel selection">✕</button>
          <span className="selection-bar__count">{selectedIds.size} selected</span>
          <div className="selection-bar__actions">
            <button className="selection-bar__action" onClick={handlePinAction} title={allPinned ? 'Unpin' : 'Pin'}>
              {allPinned ? '📌' : '📌'}
              <span>{allPinned ? 'Unpin' : 'Pin'}</span>
            </button>
            <button className="selection-bar__action" onClick={handleMuteAction} title={allMuted ? 'Unmute' : 'Mute'}>
              {allMuted ? '🔔' : '🔕'}
              <span>{allMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            <button
              className="selection-bar__action selection-bar__action--danger"
              onClick={handleDeleteAction}
              disabled={!canDelete}
              title={canDelete ? 'Delete' : "Saved Messages can't be deleted"}
            >
              🗑️
              <span>Delete</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="sidebar__topbar">
          <div className="brand">
            <img className="brand__crest" src="/icons/brand-crest.png" alt="FairyChat" />
            <h1>FairyChat</h1>
          </div>
          <TopMenu
            onNewDirect={() => setNewChatMode('direct')}
            onNewGroup={() => setNewChatMode('group')}
            onNewChannel={() => setNewChatMode('channel')}
          />
        </div>
      )}

      {!selectionMode && (
        <div className="sidebar__search">
          <input placeholder="Search chats..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      <div className="chat-list">
        {chatsLoaded && filtered.length === 0 && (
          <div className="empty-state">
            <div className="glyph">💬</div>
            <div>No chats yet</div>
            <div style={{ fontSize: 12.5 }}>Use the ⋮ menu to start a new chat</div>
          </div>
        )}
        {filtered.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            active={chat.id === activeChatId && !selectionMode}
            currentUserId={user.id}
            selectionMode={selectionMode}
            selected={selectedIds.has(chat.id)}
            onClick={() => handleItemClick(chat.id)}
            onLongPress={() => handleLongPress(chat.id)}
          />
        ))}
      </div>

      {newChatMode && (
        <NewChatModal initialMode={newChatMode} onClose={() => setNewChatMode(null)} onChatReady={(chatId) => onSelectChat(chatId)} />
      )}
    </div>
  );
}
