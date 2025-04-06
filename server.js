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

// MongoDB-Verbindung
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let collection;

// OpenAI-Client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Serverstart + MongoDB-Init
async function start() {
  await client.connect();
  const db = client.db("gptFeedbackDB");
  collection = db.collection("responses");

  app.listen(port, () => {
    console.log(`✅ Server läuft auf Port ${port}`);
  });
}
start();

// POST-Endpunkt zum Speichern & GPT-Antwort holen
app.post("/save-feedback", async (req, res) => {
  const { feedback, messages } = req.body;

  if (!feedback || !messages) {
    return res.status(400).send("Feedback oder Nachrichtenverlauf fehlt.");
  }

  await collection.insertOne({ feedback, timestamp: new Date() });

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
    });

    const reply = chatCompletion.choices[0].message.content;
    res.send(reply);
  } catch (error) {
    console.error("❌ GPT-Fehler:", error);
    res.status(500).send("Fehler bei der GPT-Antwort");
  }
});

// HTML-Datei zurückgeben
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

