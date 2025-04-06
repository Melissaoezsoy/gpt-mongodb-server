const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const path = require("path");
const OpenAI = require("openai");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let collection;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function start() {
  await client.connect();
  const db = client.db("gptFeedbackDB");
  collection = db.collection("responses");

  app.listen(port, () =>
    console.log(`✅ Server läuft auf Port ${port}`)
  );
}
start();

app.post("/save-feedback", async (req, res) => {
  const { feedback } = req.body;
  if (!feedback) return res.status(400).send("Fehlendes Feedback");

  await collection.insertOne({ feedback, timestamp: new Date() });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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

    const reply = completion.choices[0].message.content;
    res.send(reply);
  } catch (error) {
    console.error("GPT Fehler:", error.message);
    res.status(500).send("Fehler bei der GPT-Antwort");
  }
});

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).send("Fehlende Nachricht");
  }

  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: "user", content: message }],
      model: "gpt-3.5-turbo",
    });

    const reply = chatCompletion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("❌ Fehler bei der OpenAI-Anfrage:", error);
    res.status(500).send("Fehler bei der GPT-Antwort");
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
