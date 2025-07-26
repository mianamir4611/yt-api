const express = require("express");
const { ytmp4 } = require("ruhend-scraper");
const ytSearch = require("yt-search");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// POST /download endpoint
app.post("/download", async (req, res) => {
  const { url } = req.body;
  if (!url || !url.includes("youtube.com") && !url.includes("youtu.be")) {
    return res.status(400).json({ error: "Please provide a valid YouTube URL" });
  }

  await processDownload(url, res);
});

// GET /download endpoint
app.get("/download", async (req, res) => {
  const url = req.query.url;
  if (!url || !url.includes("youtube.com") && !url.includes("youtu.be")) {
    return res.status(400).json({ error: "Please provide a valid YouTube URL as a query parameter (e.g., ?url=...)" });
  }

  await processDownload(url, res);
});

// Shared download logic
async function processDownload(url, res) {
  try {
    let videoId;
    if (url.includes("youtu.be")) {
      videoId = url.split("youtu.be/")[1].split("?")[0];
    } else if (url.includes("shorts")) {
      videoId = url.split("shorts/")[1].split("?")[0];
    } else {
      videoId = url.split("v=")[1]?.split("&")[0];
    }

    console.log("Extracted videoId:", videoId);
    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log("Constructed videoUrl:", videoUrl);

    // Verify video with yt-search
    const searchResults = await ytSearch(url);
    if (!searchResults.videos || !searchResults.videos.length) {
      console.log("yt-search with URL failed, trying with videoId");
      const videoIdSearch = await ytSearch({ videoId });
      if (!videoIdSearch.videos || !videoIdSearch.videos.length) {
        return res.status(404).json({ error: "Video not found" });
      }
    }

    const filename = `${videoId}.mp4`; // Simplified filename using videoId
    const filePath = path.join(__dirname, "temp", filename);

    if (!fs.existsSync(path.join(__dirname, "temp"))) {
      fs.mkdirSync(path.join(__dirname, "temp"));
    }

    // Fetch video data
    console.log("Attempting to fetch video with ytmp4...");
    const mediaData = await ytmp4(videoUrl);
    const downloadUrl = mediaData.video;

    if (!downloadUrl) {
      console.error("No video URL found in ytmp4 response");
      return res.status(500).json({ error: "Failed to find any playable video formats" });
    }

    console.log("Download URL found:", downloadUrl);

    const response = await axios.get(downloadUrl, {
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.youtube.com",
      },
      timeout: 10000, // Add timeout to avoid hanging
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on("finish", () => {
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on("end", () => {
        fs.unlink(filePath, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
      });
    });

    writer.on("error", (err) => {
      fs.unlink(filePath, () => {});
      res.status(500).json({ error: `Error writing file: ${err.message}` });
    });
  } catch (err) {
    console.error("Error in processDownload:", err.message);
    res.status(500).json({ error: `Error: ${err.message}` });
  }
}

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
