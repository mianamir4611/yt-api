const express = require("express");
const fs = require("fs-extra");
const https = require("https");
const Tiktok = require("@tobyg74/tiktok-api-dl");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("🟢 TikTok API is running.");
});

// API route: /api/download?url=https://tiktok.com/...
app.get("/api/download", async (req, res) => {
  const tiktokUrl = req.query.url;

  if (!tiktokUrl) return res.status(400).json({ error: "No URL provided" });

  try {
    const result = await Tiktok.Downloader(tiktokUrl, { version: "v2" });
    const videoUrl = result?.video?.url;

    if (!videoUrl) return res.status(404).json({ error: "Video URL not found" });

    res.json({
      message: "✅ TikTok Video Found",
      title: result?.title || "No title",
      thumbnail: result?.cover,
      author: result?.author?.nickname || "Unknown",
      videoUrl: videoUrl
    });
  } catch (err) {
    console.error("❌ TikTok API Error:", err.message);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
