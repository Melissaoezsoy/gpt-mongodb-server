const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { Configuration, OpenAIApi } = require("openai");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let collection;

// 🔑 OpenAI API vorbereiten (nutzt Umgebungsvariable OPENAI_API_KEY)
const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

// Datenbankverbindung starten
async function start() {
  await client.connect();
  const db = client.db("gptFeedbackDB");
  collection = db.collection("responses");
  app.listen(port, () => console.log(`✅ Server läuft auf Port ${port}`));
}
start();

// 🧠 GPT-Feedback generieren und speichern
app.post("/gpt-feedback", async (req, res) =>
