export default async function handler(req, res) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API Key 未配置' });

  // 用北京时间
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  const day   = now.getUTCDay();
  const hour  = now.getUTCHours();
  const month = now.getUTCMonth() + 1;
  const date  = now.getUTCDate();
  const dayNames = ['周日','周一','周二','周三','周四','周五','周六'];

  const context = `${month}月${date}日，${dayNames[day]}，${hour}点`;

  const prompt = `现在是${context}。请为一个"废话生成器"网站生成7个主题词。
要求：
- 结合当前时间、星期、节日、天气心情等，有强烈的时间感和生活感
- 每个词2-6个字，简短有趣
- 不要出现"前任"这个词
- 风格：轻松、自嘲、当代年轻人视角
- 只输出 JSON 数组，格式：["词1","词2","词3","词4","词5","词6","词7"]
- 不要任何解释、不要 markdown`;

  try {
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
        temperature: 1.1
      })
    });

    if (!resp.ok) throw new Error(`DeepSeek ${resp.status}`);

    const data = await resp.json();
    let raw = data.choices?.[0]?.message?.content?.trim() || '[]';
    // 清理可能的 markdown 包裹
    raw = raw.replace(/```json|```/g, '').trim();
    const words = JSON.parse(raw);
    if (!Array.isArray(words) || words.length === 0) throw new Error('格式错误');

    res.setHeader('Cache-Control', 's-maxage=1800'); // Vercel 缓存30分钟，省 token
    return res.status(200).json({ words, context });
  } catch (e) {
    // 降级：根据时间返回静态词
    const fallback = getFallback(day, hour, month, date);
    return res.status(200).json({ words: fallback, context, fallback: true });
  }
}

function getFallback(day, hour, month, date) {
  const pool = [];
  if (month === 4  && date === 1)  pool.push('愚人节');
  if (month === 2  && date === 14) pool.push('情人节');
  if (month === 12 && date === 25) pool.push('圣诞节');
  if (day === 5)   pool.push('周五快放假');
  if (day === 0)   pool.push('星期天综合症', '明天就上班了');
  if (day === 1)   pool.push('星期一');
  if (hour < 6)    pool.push('深夜失眠');
  if (hour >= 6  && hour < 9)  pool.push('早八');
  if (hour >= 22)  pool.push('睡前焦虑');
  const base = ['人生意义','努力','摸鱼','减肥','开会','加班','躺平'];
  return [...new Set([...pool, ...base])].slice(0, 7);
}
