export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { question, cardBlocks } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing from Vercel Environment Variables."
      });
    }

    if (!cardBlocks || !Array.isArray(cardBlocks) || cardBlocks.length === 0) {
      return res.status(400).json({
        error: "No card data provided."
      });
    }

    const systemPrompt = `
You are MTG Judge Assistant, a certified-tournament-judge-style Magic: The Gathering rules expert.

Rules:
- Never invent card text.
- Use ONLY the verified card information provided.
- If information is missing, say so.
- Explain stack interactions carefully.
- Explain timing, priority, triggers, replacement effects and state-based actions when relevant.

IMPORTANT:
- Always complete all four sections.
- Never end a sentence halfway through.
- If nearing token limits, shorten explanations rather than truncating.
- The response must contain:
  ## Ruling
  ## Card Check
  ## Why
  ## Caveats

Always reply in exactly this format:

## Ruling
Direct answer.

## Card Check
Relevant card text and assumptions.

## Why
Step-by-step explanation.

## Caveats
Anything that could change the outcome.
`;

 const cleanCardBlocks = cardBlocks.map(block =>
  block
    .replace(/\$\\\{/g, "{")
    .replace(/\\\}/g, "}")
);
    
const userPrompt = `
SCENARIO / QUESTION:
${question}

VERIFIED CARD DATA:

${cleanCardBlocks.join("\n\n---\n\n")}
`;

const MODEL = "gemini-3.5-flash";

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemPrompt
              }
            ]
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: userPrompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 3000
          }
        })
      }
    );

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini Error:", geminiData);

      return res.status(geminiResponse.status).json({
        error:
          geminiData?.error?.message ||
          `Gemini API returned HTTP ${geminiResponse.status}`
      });
    }

    const text =
      geminiData?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("\n")
        .trim();

    if (!text) {
      return res.status(500).json({
        error: "Gemini returned an empty response."
      });
    }

    return res.status(200).json({
      content: [
        {
          type: "text",
          text
        }
      ]
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message || "Unexpected server error."
    });
  }
}
