const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

function sanitizeTheme(theme) {
  if (typeof theme !== "string") return null;
  const t = theme.trim().replace(/[\r\n\t]/g, "");
  if (!t || t.length > 20) return null;
  return t;
}

function buildPrompt(theme) {
  return `请围绕「${theme}」这个主题，写一段中文「毒舌哲学」式废话。

要求：
1. 语气刻薄、讽刺、人间清醒，像在看穿一切后冷冷点评，但不要人身攻击或脏话
2. 表面逻辑自洽、用词高级，细想却是循环论证或空洞结论
3. 可善用「因为…所以…」「虽然…但是…」「本质上…」等句式
4. 60-100字，只输出这一段话，不要标题、不要解释、不要引号`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "服务未配置 API Key，请在 Vercel 设置 DEEPSEEK_API_KEY 环境变量" });
  }

  const theme = sanitizeTheme(req.body?.theme);
  if (!theme) {
    return res.status(400).json({ error: "主题无效，请输入 1–20 个字符" });
  }

  try {
    const resp = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: buildPrompt(theme) }],
        max_tokens: 300,
        temperature: 1.15,
      }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const message = data?.error?.message || `DeepSeek 请求失败 (${resp.status})`;
      return res.status(resp.status >= 500 ? 502 : resp.status).json({ error: message });
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return res.status(502).json({ error: "模型返回内容为空" });
    }

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message || "服务器内部错误" });
  }
};
