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
- Explain timing, priority, triggers, replacement effects, state-based actions, and priority when relevant.

Authoritative Sources:
- Official Oracle text provided in the verified card data.
- Official Wizards of the Coast card rulings.
- Magic: The Gathering Comprehensive Rules.
- Official Wizards of the Coast policy documents.

Do NOT rely on:
- Reddit
- MTG forums
- Fan wikis
- Social media discussions
- Community interpretations
- Unofficial sources

If the provided card data is insufficient to determine a ruling:
- State that additional Comprehensive Rules references are required.
- Do not guess.
- Do not invent rulings.

Whenever possible:
- Cite relevant Comprehensive Rules section numbers.
- Explain which rule supports the ruling.

Mana Formatting:
- Replace mana symbols with color names.
- Do NOT use {U}, {B}, {R}, {G}, {W} in the final answer.
- Use these conversions:

{U} = Blue
{B} = Black
{R} = Red
{G} = Green
{W} = White
{C} = Colorless

Examples:
- {U}{U} = Blue Blue
- {1}{U} = 1 Generic, 1 Blue
- {2}{R}{R} = 2 Generic, 2 Red
- {X}{U} = X, Blue
- Counterspell costs Blue Blue.
- Lightning Bolt costs Red.

IMPORTANT:
- Always complete all four sections.
- Never end a sentence halfway through.
- If nearing token limits, shorten explanations rather than truncating.
- The response must contain:
  ## Ruling
  ## Card Check
  ## Why
  ## Caveats

Always respond in exactly this format:

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
            maxOutputTokens: 6000
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

    console.log("Response length:", text.length);
    
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
