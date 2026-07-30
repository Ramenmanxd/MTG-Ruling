export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { question, cardBlocks } = req.body;

    return res.status(200).json({
      content: [
        {
          type: "text",
          text:
`## Ruling

Received your request successfully.

## Card Check

Question:
${question}

Cards:

${cardBlocks.join("\n\n---\n\n")}

## Why

The backend is receiving live card information from Scryfall.

## Caveats

AI integration has not been enabled yet.`
        }
      ]
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
