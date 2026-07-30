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

This is a test ruling.

## Card Check

Question received:
${question}

Cards received:
${cardBlocks.length}

## Why

Your API endpoint is now working.

## Caveats

This is only a test response.`
        }
      ]
    });

  } catch (err) {

    return res.status(500).json({
      error: err.message
    });

  }
}
