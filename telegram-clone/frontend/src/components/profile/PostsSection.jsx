import { resolveMediaUrl } from '../../utils/resolveUrl';
import { CameraGlyphIcon } from '../common/SettingsIcons';

// The Posts / Archived Posts tab switcher + grid + empty state, matching
// mobile-builds/profile-ui.jpg's bottom section.
export default function PostsSection({ tab, onTabChange, posts, loading, onAddPost, onOpenPost }) {
  return (
    <div className="posts-section">
      <div className="posts-section__tabs">
        <button className={`posts-section__tab ${tab === 'posts' ? 'is-active' : ''}`} onClick={() => onTabChange('posts')}>Posts</button>
        <button className={`posts-section__tab ${tab === 'archived' ? 'is-active' : ''}`} onClick={() => onTabChange('archived')}>Archived Posts</button>
      </div>

      {loading ? (
        <div className="posts-section__empty">Loading…</div>
      ) : posts.length === 0 ? (
        <div className="posts-section__empty">
          <div className="posts-section__empty-title">{tab === 'posts' ? 'No posts yet…' : 'No archived posts'}</div>
          {tab === 'posts' && (
            <>
              <div className="posts-section__empty-sub">Publish photos and videos to display on your profile page</div>
              <button className="posts-section__add-btn" onClick={onAddPost}>
                <CameraGlyphIcon /> Add a post
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="posts-section__grid">
            {posts.map((p) => (
              <button key={p.id} className="posts-section__thumb" onClick={() => onOpenPost(p)}>
                {p.type === 'video' ? (
                  <video src={resolveMediaUrl(p.fileUrl)} muted />
                ) : (
                  <img src={resolveMediaUrl(p.fileUrl)} alt="" />
                )}
                {p.type === 'video' && <span className="posts-section__thumb-badge">▶</span>}
              </button>
            ))}
          </div>
          {tab === 'posts' && (
            <button className="posts-section__add-btn posts-section__add-btn--inline" onClick={onAddPost}>
              <CameraGlyphIcon /> Add a post
            </button>
          )}
        </>
      )}
    </div>
  );
}
