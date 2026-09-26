const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// Pluggable GIF/Sticker provider: set GIF_API_KEY (+ optionally
// GIF_PROVIDER=giphy|klipy) in the environment to enable the picker. Until a
// key is configured the endpoints just report configured:false so the UI can
// show a friendly "not set up yet" message instead of erroring.
//
// Both Giphy and Klipy expose a "stickers" collection with the exact same
// shape/semantics as their "gifs" collection (just a different content pool
// — Klipy's stickers are real transparent-background animated GIF/WEBP/WEBM
// stickers, same idea as Telegram's own sticker packs), so one function
// handles both by switching the `kind` segment of the URL.
const PROVIDER = (process.env.GIF_PROVIDER || 'giphy').toLowerCase();
const API_KEY = process.env.GIF_API_KEY || '';

function normalizeGiphy(items) {
  return (items || []).map((g) => ({
    id: g.id,
    url: g.images?.fixed_height?.url || g.images?.original?.url,
    previewUrl: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url || g.images?.fixed_height?.url,
    width: Number(g.images?.fixed_height?.width) || undefined,
    height: Number(g.images?.fixed_height?.height) || undefined,
    title: g.title || 'GIF'
  })).filter((g) => g.url);
}

function normalizeKlipy(items) {
  return (items || []).map((g) => ({
    id: g.id || g.slug,
    url: g.file?.md?.gif?.url || g.file?.hd?.gif?.url || g.url,
    previewUrl: g.file?.sm?.gif?.url || g.file?.xs?.gif?.url || g.file?.md?.gif?.url,
    width: g.file?.md?.gif?.width,
    height: g.file?.md?.gif?.height,
    title: g.title || 'GIF'
  })).filter((g) => g.url);
}

async function fetchMedia({ kind, query, limit }) {
  if (!API_KEY) return { configured: false, results: [] };

  if (PROVIDER === 'klipy') {
    const base = `https://api.klipy.com/api/v1/${API_KEY}/${kind}`;
    const url = query
      ? `${base}/search?q=${encodeURIComponent(query)}&per_page=${limit}`
      : `${base}/trending?per_page=${limit}`;
    const resp = await fetch(url);
    const data = await resp.json();
    return { configured: true, results: normalizeKlipy(data?.data?.data || data?.data || []) };
  }

  // default: giphy (supports /v1/gifs/* and /v1/stickers/* the same way)
  const base = `https://api.giphy.com/v1/${kind}`;
  const url = query
    ? `${base}/search?api_key=${API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&rating=pg-13`
    : `${base}/trending?api_key=${API_KEY}&limit=${limit}&rating=pg-13`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data?.meta?.status && data.meta.status !== 200) {
    return { configured: true, results: [], error: data.meta.msg };
  }
  return { configured: true, results: normalizeGiphy(data?.data || []) };
}

function register(kind, basePath) {
  router.get(`${basePath}/search`, auth, async (req, res) => {
    try {
      const q = (req.query.q || '').trim();
      const limit = Math.min(parseInt(req.query.limit) || 24, 40);
      const out = await fetchMedia({ kind, query: q, limit });
      res.json(out);
    } catch (e) {
      console.error(`${kind} search error`, e);
      res.status(500).json({ configured: !!API_KEY, results: [], error: `Could not search ${kind}` });
    }
  });

  router.get(`${basePath}/trending`, auth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 24, 40);
      const out = await fetchMedia({ kind, query: '', limit });
      res.json(out);
    } catch (e) {
      console.error(`${kind} trending error`, e);
      res.status(500).json({ configured: !!API_KEY, results: [], error: `Could not load ${kind}` });
    }
  });
}

// GET /api/gifs/search, /api/gifs/trending
register('gifs', '');
// GET /api/gifs/stickers/search, /api/gifs/stickers/trending — real animated
// stickers (Telegram-style), not plain emoji.
register('stickers', '/stickers');

module.exports = router;
