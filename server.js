const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const path = require("path"); // hinzugefügt für HTML-Datei

const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

// HTML-Dateien bereitstellen (damit index.html gefunden wird)
app.use(express.static(__dirname));

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let collection;

async function start() {
  await client.connect();
  const db = client.db("gptFeedbackDB");
  collection = db.collection("responses");
  app.listen(port, () => console.log(`✅ Server läuft auf Port ${port}`));
}
start();

app.post("/save-feedback", async (req, res) => {
  const { userId, feedback } = req.body;
  if (!userId || !feedback) return res.status(400).send("Fehlende Daten");
  await collection.insertOne({ userId, feedback, timestamp: new Date() });
  res.send("✅ Feedback gespeichert");
});

// Route zum Ausliefern der HTML-Datei
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
