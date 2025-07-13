// server.js (for Railway deployment) const express = require("express"); const fs = require("fs"); const axios = require("axios"); const path = require("path"); const HttpsProxyAgent = require("https-proxy-agent"); const { ytsearch, ytmp3 } = require("ruhend-scraper"); const { Downloader } = require("abot-scraper");

const app = express(); const PORT = process.env.PORT || 3000; const downloader = new Downloader();

// 🔁 Proxy list const proxies = [ "http://27.71.142.16:16000", "http://186.179.169.22:3128", "http://72.10.160.91:18749", "http://27.79.136.134:16000", "http://18.203.249.67:10010", "http://43.217.134.23:3128", "http://57.129.81.201:8080" ];

function getRandomProxy() { const proxy = proxies[Math.floor(Math.random() * proxies.length)]; return new HttpsProxyAgent(proxy); }

// API endpoint: /song?q=tum hi ho&type=audio or video app.get("/song", async (req, res) => { const query = req.query.q; const isVideo = req.query.type === "video";

if (!query) return res.status(400).json({ error: "Missing query ?q=..." });

try { const { video } = await ytsearch(query); if (!video || video.length === 0) { return res.status(404).json({ error: "No result found" }); }

const selected = video[0];
let downloadUrl = null;
let ext = isVideo ? "mp4" : "mp3";

if (isVideo) {
  const resVid = await downloader.youtubeDownloader(selected.url);
  if (!resVid || resVid.status !== 200 || !resVid.result?.video) {
    return res.status(500).json({ error: "Failed to fetch video URL" });
  }
  downloadUrl = resVid.result.video;
} else {
  const audioRes = await ytmp3(selected.url);
  if (!audioRes.audio || !audioRes.audio.startsWith("http")) {
    return res.status(500).json({ error: "Failed to fetch MP3 link" });
  }
  downloadUrl = audioRes.audio;
}

// Fetch with proxy (only outside replit)
const axiosOptions = {
  method: "GET",
  url: downloadUrl,
  responseType: "stream"
};

if (!process.env.REPL_ID) {
  axiosOptions.httpsAgent = getRandomProxy();
}

const response = await axios(axiosOptions);
res.setHeader("Content-Disposition", `attachment; filename=download.${ext}`);
response.data.pipe(res);

} catch (e) { console.error("Error:", e.message); res.status(500).json({ error: e.message }); } });

app.listen(PORT, () => console.log(✅ Server running on port ${PORT}));

