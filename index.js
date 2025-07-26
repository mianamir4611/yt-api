const express = require("express");
const ytdl = require("@distube/ytdl-core");
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
      videoId = url.split("shorts/")[1].split("?")[0].split("&")[0]; // Clean Shorts ID
    } else {
      videoId = url.split("v=")[1]?.split("&")[0];
    }

    console.log("Extracted videoId:", videoId);
    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log("Constructed videoUrl:", videoUrl);

    const filename = `${videoId}.mp4`;
    const filePath = path.join(__dirname, "temp", filename);

    if (!fs.existsSync(path.join(__dirname, "temp"))) {
      fs.mkdirSync(path.join(__dirname, "temp"));
    }

    // Get video info and select the best format
    console.log("Fetching video info with ytdl-core...");
    const info = await ytdl.getInfo(videoUrl);
    console.log("Video info:", info.videoDetails.title); // Log title for verification
    const format = ytdl.chooseFormat(info.formats, { quality: "highestvideo" });
    if (!format.url) {
      console.error("No playable format found, available formats:", info.formats);
      return res.status(500).json({ error: "Failed to find any playable video formats" });
    }

    console.log("Selected format URL:", format.url);

    // Stream the video
    const response = ytdl.downloadFromInfo(info, { format });
    const writer = fs.createWriteStream(filePath);
    response.pipe(writer);

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
    console.error("Error in processDownload:", err.message, "Stack:", err.stack);
    res.status(500).json({ error: `Error: ${err.message}` });
  }
}

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
