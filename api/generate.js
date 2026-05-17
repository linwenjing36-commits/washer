export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { theme } = req.body;
  if (!theme) return res.status(400).json({ error: '主题不能为空' });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API Key 未配置' });

  const prompt = `请围绕"${theme}"这个主题，生成一段听起来很有道理、但仔细一想完全是废话的句子。要求：
1. 用"因为...所以..."、"虽然...但是..."、"本质上来说..."等听起来很深刻的句式
2. 逻辑看似成立，但实际上是循环论证或者废话
3. 字数在60-100字之间
4. 语气要慵懒随意，像个哲学家在发呆
5. 只输出这段废话，不要任何解释或标题`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 1.2
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(502).json({ error: err.error?.message || 'DeepSeek 请求失败' });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    return res.status(200).json({ text });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
