const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    if (!data || !data.pages || !Array.isArray(data.pages)) {
      return res.status(400).json({ error: 'Invalid ebook data' });
    }

    // Generate unique ID
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 6);

    // Check payload size (~1MB KV limit)
    const payload = JSON.stringify(data);
    if (payload.length > 950000) {
      return res.status(413).json({
        error: 'Ebook too large for online hosting. Try reducing image count or quality.',
        size: payload.length
      });
    }

    // Store in Vercel KV (no expiry — persistent)
    await kv.set(`ebook:${id}`, data);

    // Also store in an index for listing
    const now = new Date().toISOString();
    const meta = {
      id,
      name: data.name || 'Untitled Ebook',
      pageCount: data.pages.length,
      date: now
    };
    // Get existing index or create new
    let index = await kv.get('ebook_index') || [];
    index.unshift(meta); // newest first
    if (index.length > 200) index = index.slice(0, 200); // cap at 200
    await kv.set('ebook_index', index);

    const host = req.headers.host || 'ebook-studio-pro.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const viewUrl = `${protocol}://${host}/view.html?id=${id}`;

    res.status(200).json({ success: true, id, viewUrl });
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ error: 'Failed to publish ebook. Please try again.' });
  }
};
