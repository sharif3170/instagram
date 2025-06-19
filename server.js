const express = require("express");
const cors = require("cors");
const fs = require("fs");
const https = require("https");
const path = require("path");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;
const COOKIES_PATH = path.join(__dirname, "cookies.json");

app.use(cors());
app.use("/videos", express.static(path.join(__dirname, "downloads")));

// ✅ Default Home Route
app.get("/", (req, res) => {
  res.send(`
    <h1>✅ Instagram Video Downloader</h1>
    <p>Use the endpoint like this:</p>
    <code>/insta?url=https://www.instagram.com/reel/VIDEO_ID/</code>
  `);
});

// ✅ /insta?url=INSTAGRAM_URL route
app.get("/insta", async (req, res) => {
  const postUrl = req.query.url;

  if (!postUrl || !postUrl.includes("instagram.com")) {
    return res.json({ success: false, message: "❌ Invalid Instagram URL." });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu"
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

    // ✅ Load cookies if available
    if (fs.existsSync(COOKIES_PATH)) {
      const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, "utf8"));
      await page.setCookie(...cookies);
    }

    // ✅ Go to the Instagram post
    await page.goto(postUrl, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    // ✅ Extract video URL
    const videoUrl = await page.evaluate(() => {
      const video = document.querySelector("video");
      return video ? video.src : null;
    });

    if (!videoUrl) {
      await browser.close();
      return res.json({ success: false, message: "❌ Video not found. Maybe Reel or private post." });
    }

    // ✅ Download the video
    const filename = `video_${Date.now()}.mp4`;
    const filepath = path.join(__dirname, "downloads", filename);
    const file = fs.createWriteStream(filepath);

    https.get(videoUrl, (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        browser.close();
        return res.json({
          success: true,
          videoUrl,
          file: filename,
          downloadLink: `/videos/${filename}`,
        });
      });
    }).on("error", (err) => {
      fs.unlink(filepath, () => {});
      browser.close();
      return res.status(500).json({ success: false, message: "❌ Video download failed." });
    });

  } catch (error) {
    console.error("❌ Scraping error:", error.message);
    return res.status(500).json({ success: false, message: "❌ Server error. See logs." });
  }
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
