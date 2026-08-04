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
        error: "Missing GEMINI_API_KEY environment variable."
      });
    }

    if (!cardBlocks || !Array.isArray(cardBlocks) || cardBlocks.length === 0) {
      return res.status(400).json({
        error: "No card data received."
      });
    }

    const systemPrompt = `
You are MTG Judge Assistant, a certified-tournament-judge-style Magic: The Gathering rules assistant.

Rules:
- Never invent card text or rulings.
- Use ONLY the verified card data provided by the user.
- If information needed to answer is not in the verified data, say so clearly.
- Distinguish carefully between spells, copies, permanents, tokens, triggered abilities, activated abilities, and replacement effects.
- Explain stack interactions clearly.
- Consider Commander interactions only when relevant.
- Keep the answer concise but useful.

Always respond in exactly this format, with these four headers and nothing before or after:

## Ruling
Direct answer.

## Card Check
Relevant card text and assumptions from the verified data.

## Why
Step-by-step rules explanation.

## Caveats
Timing restrictions, commander interactions, replacement effects, legality issues, or missing information that could change the outcome.
`;

    const userPrompt = `
SCENARIO / QUESTION:
${question || "Explain how the selected card(s) work and any notable interaction or ruling between them."}

VERIFIED CARD DATA FROM SCRYFALL:

${cardBlocks.join("\n\n---\n\n")}
`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
            temperature: 0.2,
            maxOutputTokens: 1200
          }
        })
      }
    );

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return res.status(geminiResponse.status).json({
        error:
          geminiData.error?.message ||
          `Gemini API returned HTTP ${geminiResponse.status}`
      });
    }

    const text =
      geminiData.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
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
          text: text
        }
      ]
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message || "Unexpected server error."
    });
  }
}
