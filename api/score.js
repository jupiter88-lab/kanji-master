export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST メソッドのみ対応です' });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'サーバーに ANTHROPIC_API_KEY が設定されていません。' });
  }
  const { imageData, systemPrompt } = req.body || {};
  if (!imageData || !systemPrompt) {
    return res.status(400).json({ error: 'imageData と systemPrompt が必要です' });
  }
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageData } },
            { type: 'text', text: 'このテスト用紙を採点してください。必ず指定のJSON形式のみで返答してください。' }
          ]
        }]
      })
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || `Anthropic API エラー (${r.status})` });
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message || '不明なエラー' });
  }
}
