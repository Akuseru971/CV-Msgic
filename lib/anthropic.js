export async function callAnthropic(messages, system, maxTokens = 2000) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY manquant");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erreur Anthropic: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}
