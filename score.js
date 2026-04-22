// ===============================================================
// 漢字マスター AI ‒ 採点用サーバーレス関数（Vercel API ルート）
// ブラウザからはここに POST が飛んでくる。
// このファイル内で Anthropic API キーを取り出して転送するので、
// ブラウザ側には一切キーが漏れない。
// ===============================================================

// Vercel の bodyParser の上限を拡大（画像 Base64 が乗るので）
export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' }
  }
};

export default async function handler(req, res) {
  // ----- 1. POST 以外は拒否 -----
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST メソッドのみ対応です' });
  }

  // ----- 2. 環境変数からキーを取得 -----
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'サーバーに ANTHROPIC_API_KEY が設定されていません。Vercel の Settings → Environment Variables を確認してください。'
    });
  }

  // ----- 3. クライアントから受け取ったデータを検証 -----
  const { imageData, systemPrompt } = req.body || {};
  if (!imageData || !systemPrompt) {
    return res.status(400).json({ error: 'imageData と systemPrompt が必要です' });
  }

  // ----- 4. Anthropic API にリレー -----
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
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageData
              }
            },
            {
              type: 'text',
              text: 'このテスト用紙を採点してください。必ず指定のJSON形式のみで返答してください。'
            }
          ]
        }]
      })
    });

    const data = await r.json();

    if (!r.ok) {
      console.error('Anthropic API error:', r.status, data);
      return res.status(r.status).json({
        error: data?.error?.message || `Anthropic API エラー (${r.status})`
      });
    }

    // 成功：Anthropic のレスポンスをそのまま返す
    return res.status(200).json(data);

  } catch (e) {
    console.error('Serverless function error:', e);
    return res.status(500).json({ error: e.message || '不明なエラー' });
  }
}
