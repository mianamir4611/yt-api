const express = require("express");
const ytdl = require("@distube/ytdl-core");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

// 🧠 Load your YouTube cookie
const YT_COOKIE = process.env.YT_COOKIE || fs.readFileSync("cookie.txt", "utf8");

app.get("/", (req, res) => {
  res.send("✅ YouTube Downloader with Cookies is running");
});

app.get("/download", async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl || !ytdl.validateURL(videoUrl)) {
    return res.status(400).send("❌ Invalid or missing YouTube URL");
  }

  try {
    // Add cookie header to request options
    const options = {
      requestOptions: {
        headers: {
          cookie: YT_COOKIE
        }
      },
      filter: "audioandvideo",
      quality: "highest"
    };

    const info = await ytdl.getBasicInfo(videoUrl, options);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, "_");
    res.header("Content-Disposition", `attachment; filename="${title}.mp4"`);

    ytdl(videoUrl, options).pipe(res);

  } catch (err) {
    console.error("❌ Download error:", err.message);
    res.status(500).send("❌ Failed to download video (check cookie or URL).");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
