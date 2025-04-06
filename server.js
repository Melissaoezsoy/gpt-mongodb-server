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

// MongoDB-Verbindung
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let collection;

// GPT-Konfiguration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Starte Mongo und Server
async function start() {
  await client.connect();
  const db = client.db("gptFeedbackDB");
  collection = db.collection("responses");

  app.listen(port, () =>
    console.log(`✅ Server läuft auf Port ${port}`)
  );
}
start();

// Feedback speichern
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
          content: "Du bist ein freundlicher KI-Coach, der Feedback auf studentische Antworten gibt.",
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
    console.error("OpenAI Fehler:", error.message);
