exports.handler = async function(event) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Método não permitido." }) };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503, headers,
      body: JSON.stringify({ error: "A inteligência artificial ainda não foi ligada. Falta configurar a chave de API no servidor." })
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const message = String(payload.message || "").trim();
    if (!message) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Escreve uma pergunta." }) };
    }
    if (message.length > 4000) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "A pergunta é demasiado longa. Resume-a e tenta novamente." }) };
    }

    const history = Array.isArray(payload.history) ? payload.history.slice(-10) : [];
    const input = [];
    for (const item of history) {
      if (item && ["user", "assistant"].includes(item.role) && typeof item.content === "string") {
        input.push({ role: item.role, content: item.content.slice(0, 4000) });
      }
    }
    input.push({ role: "user", content: message });

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        instructions: "És o ANGO INFO, um assistente virtual que responde em português claro, com prioridade para Angola. Ajuda com história, cultura, geografia, documentos, emprego, educação, negócios, turismo, serviços públicos e legislação angolana. Dá respostas diretas, organizadas e úteis. Não inventes leis, taxas, prazos, moradas, contactos ou procedimentos. Quando a informação puder ter mudado ou exigir confirmação oficial, diz claramente que o utilizador deve confirmar junto da instituição competente e indica o nome da instituição quando souberes. Distingue factos confirmados de sugestões. Se a pergunta não for sobre Angola, responde normalmente, mas mantém a clareza. Não afirmes que consultaste fontes em tempo real se não o fizeste.",
        input
      })
    });

    const result = await aiResponse.json();
    if (!aiResponse.ok) {
      const message = result && result.error && result.error.message ? result.error.message : "Erro no serviço de inteligência artificial.";
      return { statusCode: 502, headers, body: JSON.stringify({ error: message }) };
    }

    const answer = (result.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n")
      .trim();

    return { statusCode: 200, headers, body: JSON.stringify({ answer: answer || "Não consegui gerar uma resposta. Tenta novamente." }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Ocorreu um erro inesperado. Tenta novamente." }) };
  }
};
