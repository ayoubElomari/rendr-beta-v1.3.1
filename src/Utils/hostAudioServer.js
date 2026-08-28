const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const app = express();
const port = 3000;

app.use(cors());

app.get("/audio-timeline", (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing url");

  if (url.startsWith("http")) {
    res.redirect(url);
  } else {
    const fullPath = path.resolve(url);
    const audioData = fs.readFileSync(fullPath);
    res.setHeader("Content-Type", "audio/wav");
    res.send(audioData);
  }
});
app.get("/shutdown", (req, res) => {
  res.send("Shutting down server...");
  console.log("Shutting down server...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

const server = app.listen(port, () => {
  console.log(
    `Audio server running at http://localhost:${port}/audio-timeline`
  );
});
