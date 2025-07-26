const express = require("express");
const ytdl = require("@distube/ytdl-core");
const app = express();

const PORT = process.env.PORT || 3000;

// Home route
app.get("/", (req, res) => {
  res.send("✅ YouTube Universal Downloader API is running.");
});

// Download route
app.get("/download", async (req, res) => {
  const videoUrl = req.query.url;

  // Check if URL is valid
  if (!videoUrl || !ytdl.validateURL(videoUrl)) {
    return res.status(400).send("❌ Please provide a valid YouTube video or Shorts URL.");
  }

  try {
    // Get video info
    const info = await ytdl.getBasicInfo(videoUrl);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, "_"); // clean filename

    // Set response headers to force download
    res.header("Content-Disposition", `attachment; filename="${title}.mp4"`);

    // Pipe combined audio+video to browser
    ytdl(videoUrl, {
      filter: "audioandvideo",
      quality: "highest"
    }).pipe(res);

  } catch (err) {
    console.error("❌ Error downloading video:", err.message);
    res.status(500).send("❌ Failed to download video.");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
