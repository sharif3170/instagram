const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");

const COOKIES_PATH = path.join(__dirname, "cookies.json");

const INSTAGRAM_USERNAME = "shaiknagul5759";
const INSTAGRAM_PASSWORD = "Sharif786@";

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

  await page.goto("https://www.instagram.com/accounts/login/", {
    waitUntil: "domcontentloaded",
  });

  await page.waitForSelector("input[name='username']", { timeout: 10000 });
  await page.type("input[name='username']", INSTAGRAM_USERNAME, { delay: 50 });
  await page.type("input[name='password']", INSTAGRAM_PASSWORD, { delay: 50 });

  await Promise.all([
    page.click("button[type='submit']"),
    page.waitForNavigation({ waitUntil: "networkidle2" }),
  ]);

  // Save cookies
  const cookies = await page.cookies();
  fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
  console.log("✅ Cookies saved!");

  await browser.close();
})();
