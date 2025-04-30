require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require("mongoose");
const bodyParser = require('body-parser');
const dns = require('dns');
const urlParser = require('url');

// DB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Database connected!"))
  .catch((err) => console.error("Database connection error:", err));

// Schema
const urlSchema = new mongoose.Schema({
  original: { type: String, required: true },
  short: Number
});

const Url = mongoose.model('Url', urlSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(`${process.cwd()}/public`));

// Home route
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// POST route - shorten URL
app.post("/api/shorturl", async (req, res) => {
  const originalUrl = req.body.url;

  let hostname;
  try {
    const urlObj = new URL(originalUrl); // ✅ This will throw if not valid URL
    hostname = urlObj.hostname;
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  // Check DNS to make sure host actually exists
  dns.lookup(hostname, async (err) => {
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    // Check if already exists
    let found = await Url.findOne({ original: originalUrl });
    if (found) {
      return res.json({
        original_url: found.original,
        short_url: found.short
      });
    }

    // Save new short URL
    const count = await Url.countDocuments();
    const newUrl = new Url({ original: originalUrl, short: count + 1 });
    await newUrl.save();
    res.json({
      original_url: newUrl.original,
      short_url: newUrl.short
    });
  });
});


// GET route - redirect to original
app.get("/api/shorturl/:short", async (req, res) => {
  const shortUrl = parseInt(req.params.short);
  const found = await Url.findOne({ short: shortUrl });

  if (found) {
    res.redirect(found.original);
  } else {
    res.json({ error: 'No short URL found for the given input' });
  }
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
