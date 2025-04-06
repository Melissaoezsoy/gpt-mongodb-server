const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const path = require("path");
const { Configuration, OpenAIApi } = require("openai");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let collection;

// GPT API-Key aus Umgebungsvariable
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function start() {
  await client.connect();
  const db = client.db("gptFeedbackDB");
  collection = db.collection("responses");

  app.listen(port, () =>
    console.log(`✅ Server läuft auf Port ${port}`)
  );
}
start();

// POST-Endpunkt für Feedback
app.post("/save-feedback", async (req, res) => {
  const { feedback } = req.body;
  if (!feedback) return res.status(400).send("Fehlendes Feedback");

  await collection.insertOne({ feedback, timestamp: new Date() });

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Du gibst konstruktives, freundliches Feedback auf Texte von Schüler*innen.",
        },
        {
          role: "user",
          content: feedback,
        },
      ],
    });

    const reply = completion.data.choices[0].message.content;
    res.send(reply);
  } catch (error) {
    console.error("GPT Fehler:", error.message);
    res.status(500).send("Fehler bei der GPT-Antwort");
  }
});

// Liefert HTML-Seite (optional)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
