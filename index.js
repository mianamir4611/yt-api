const express = require("express");
const { ytmp4 } = require("ruhend-scraper");
const ytSearch = require("yt-search");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// API endpoint to download YouTube video
app.post("/download", async (req, res) => {
  const { url } = req.body;

  if (!url || !url.includes("youtube.com") && !url.includes("youtu.be")) {
    return res.status(400).json({ error: "Please provide a valid YouTube URL" });
  }

  try {
    // Extract video ID from URL (works for both regular and shorts URLs)
    let videoId;
    if (url.includes("youtu.be")) {
      videoId = url.split("youtu.be/")[1].split("?")[0];
    } else if (url.includes("shorts")) {
      videoId = url.split("shorts/")[1].split("?")[0];
    } else {
      videoId = url.split("v=")[1]?.split("&")[0];
    }

    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Fetch video metadata
    const searchResults = await ytSearch({ videoId });
    if (!searchResults) {
      return res.status(404).json({ error: "Video not found" });
    }

    const titleSafe = searchResults.title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40);
    const filename = `${titleSafe}.mp4`;
    const filePath = path.join(__dirname, "temp", filename);

    // Ensure temp directory exists
    if (!fs.existsSync(path.join(__dirname, "temp"))) {
      fs.mkdirSync(path.join(__dirname, "temp"));
    }

    // Download video using ruhend-scraper
    const mediaData = await ytmp4(videoUrl);
    const downloadUrl = mediaData.video;

    if (!downloadUrl) {
      return res.status(500).json({ error: "Unable to fetch video link" });
    }

    // Download the video
    const response = await axios.get(downloadUrl, {
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.youtube.com",
      },
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on("finish", () => {
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      // Clean up the file after streaming
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
    console.error(err);
    res.status(500).json({ error: `Error: ${err.message}` });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
