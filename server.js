const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const path = require("path");
const { readFileSync } = require("fs");
const OpenAI = require("openai");
require("dotenv").config();

// 🔗 JSON-Daten einbinden
const fs = require('fs');

const digcompeduIndikatoren = JSON.parse(fs.readFileSync('./digcompedu_observe_teilkompetenzen_de_v1.json', 'utf-8'));
const peerFeedbackKriterien = JSON.parse(fs.readFileSync('./peerfeedback_kriterien_kerman2024.json', 'utf-8'));
const musterloesungen = JSON.parse(fs.readFileSync('./musterloesungen_praxisrepraesentationen_v1.json', 'utf-8'));

// Test, ob JSON geladen wurde:
console.log('DigCompEdu geladen:', !!digcompeduIndikatoren);
console.log('PeerFeedback Kriterien geladen:', !!peerFeedbackKriterien);
console.log('Musterlösungen geladen:', !!musterloesungen);

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

// 📄 Systemprompt aus Datei laden
const systemPrompt = readFileSync(
  path.join(__dirname, "gpt_feedback_prompt_v2_full"),
  "utf8"
);

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
  const { userId, videoId, feedback, messages } = req.body;

  if (!userId || !feedback || !messages) {
    return res.status(400).send("Fehlende Angaben (ID, Feedback oder Verlauf)");
  }

  // ⏺ Feedback in MongoDB speichern
  await collection.insertOne({
    userId,
    videoId,
    feedback,
    messages,
    timestamp: new Date()
  });

  try {
    // 🧠 GPT-Anfrage mit Systemprompt
    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: chatMessages
    });

    const reply = completion.choices[0].message.content;
    res.send(reply);
  } catch (error) {
    console.error("❌ GPT-Fehler:", error);
    res.status(500).send("Fehler bei der GPT-Antwort.");
  }
});

// 🔍 HTML-Datei ausliefern
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
