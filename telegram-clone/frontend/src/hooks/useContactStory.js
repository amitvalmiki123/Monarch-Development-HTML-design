import { useCallback, useState } from 'react';
import http from '../api/http';

// Shared by every place a contact's avatar can show a story ring (contacts
// list, chat list, chat header) — fetches that contact's still-active (last
// 24h) posts and hands back everything needed to render a <StoryViewer/>.
// Returns { viewer, openStory, closeStory } where `viewer` is either null
// or { user, stories }.
export default function useContactStory() {
  const [viewer, setViewer] = useState(null);

  const openStory = useCallback(async (userId) => {
    try {
      const res = await http.get(`/users/${userId}/stories`);
      if (!res.data.posts || res.data.posts.length === 0) return;
      setViewer({ user: res.data.user, stories: res.data.posts });
    } catch (err) {
      if (err.response?.status !== 403) {
        console.error('Could not load story', err);
      }
    }
  }, []);

  const closeStory = useCallback(() => setViewer(null), []);

  return { viewer, openStory, closeStory };
}
