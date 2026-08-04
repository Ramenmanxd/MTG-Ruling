export default async function handler(req, res) {

  try {

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );

    const models = await response.json();

    return res.status(200).json({
      content: [
        {
          type: "text",
          text: JSON.stringify(models, null, 2)
        }
      ]
    });

  } catch (err) {

    return res.status(500).json({
      error: err.message
    });

  }
}
