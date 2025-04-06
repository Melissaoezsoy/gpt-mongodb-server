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

// OpenAI-Client initialisieren
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// MongoDB starten
async function start() {
  await client.connect();
  const db = client.db("gptFeedbackDB");
  collection = db.collection("responses");

  app.listen(port, () => {
    console.log(`✅ Server läuft auf Port ${port}`);
  });
}
start();

// 🧠 POST-Route für GPT-Feedback mit Nachrichtenverlauf
app.post("/save-feedback", async (req, res) => {
  const { feedback, messages } = req
