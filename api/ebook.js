const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = req.query.id;
  if (!id) {
    return res.status(400).json({ error: 'Missing ebook ID. Use ?id=YOUR_ID' });
  }

  try {
    const data = await kv.get('ebook:' + id);
    if (!data) {
      return res.status(404).json({ error: 'Ebook not found or has been removed' });
    }

    res.setHeader('Cache-Control', 'public, s-maxage=3600, max-age=300');
    res.status(200).json(data);
  } catch (err) {
    console.error('Retrieve error:', err);
    res.status(500).json({ error: 'Failed to retrieve ebook' });
  }
};
