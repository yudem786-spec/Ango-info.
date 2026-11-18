
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método não permitido" })
    };
  }

  try {
    const { message } = JSON.parse(event.body || "{}");

    if (!message || !message.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Escreva uma pergunta." })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Chave Gemini não configurada.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction:
        "És o ANGO INFO AI, um assistente especializado em Angola. Responde em português claro, com informações úteis sobre Angola, incluindo história, cultura, províncias, municípios, turismo, economia e oportunidades. Não inventes informações. Quando não souberes algo, admite."
    });

    const result = await model.generateContent(message);
    const response = await result.response;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        answer: response.text()
      })
    };

  } catch (error) {
    console.error("Erro:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Não foi possível responder. Tenta novamente."
      })
    };
  }
};
      
