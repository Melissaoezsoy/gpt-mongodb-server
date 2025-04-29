const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const path = require("path");
const OpenAI = require("openai");
require("dotenv").config();
const fs = require("fs");

// 📥 JSON-Daten einbinden
const digcompeduIndikatoren = JSON.parse(fs.readFileSync('./digcompedu_observe_teilkompetenzen_de_v1.json', 'utf-8'));
const peerFeedbackKriterien = JSON.parse(fs.readFileSync('./peerfeedback_kriterien_kerman2024.json', 'utf-8'));
const musterloesungen = JSON.parse(fs.readFileSync('./musterloesungen_praxisrepraesentationen_v1.json', 'utf-8'));

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

const ASSISTANT_ID = "asst_5WP9TBLxu2VN23DkO77Rwnnb"; // 👉 Deine Assistant-ID hier 

async function start() {
  await client.connect();
  console.log("✅ MongoDB verbunden"); // ← HIER EINFÜGEN

  const db = client.db("gptFeedbackDB");
  collection = db.collection("responses");

  app.listen(port, () => {
    console.log(`✅ Server läuft auf Port ${port}`);
  });
}

start();

app.post("/save-feedback", async (req, res) => {
  const { userId, videoId, feedback, messages } = req.body;

  if (!userId || !feedback || !messages) {
    return res.status(400).send("Fehlende Angaben (ID, Feedback oder Verlauf)");
  }

  await collection.insertOne({
    userId,
    videoId,
    feedback,
    messages,
    timestamp: new Date()
  });

  try {
    // 🧠 GPT Assistant über Threads & Runs
    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: feedback, // Optional: du kannst auch `messages.map(...)` verwenden, falls komplex
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID
    });

    let runStatus;
    do {
      await new Promise(r => setTimeout(r, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    } while (runStatus.status !== "completed");

    const threadMessages = await openai.beta.threads.messages.list(thread.id);
    const reply = threadMessages.data[0].content[0].text.value;

    res.send(reply);
  } catch (error) {
    console.error("❌ GPT-Assistant-Fehler:", error);
    res.status(500).send("Fehler bei der GPT-Antwort.");
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
