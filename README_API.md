# 📚 Quran API Documentation

## 🌐 Base URL
```
https://quran-api-qklj.onrender.com/api
```

## 📋 Available Endpoints

### 📘 Surahs (السور)
- `GET /surahs` - Get all surahs
- `GET /surah/:surah_id` - Get specific surah info

### 📖 Verses (الآيات)
- `GET /verses/:surah_id` - Get all verses of a surah
- `GET /verse/:surah_id/:verse_id` - Get specific verse

### 🧎‍♂️ Sajda (السجدة)
- `GET /sajda` - Get all sajda verses

### 🔊 Audio (الصوتيات)
- `GET /audio/:surah_id` - Get audio files for surah

### 📘 Juz (الأجزاء)
- `GET /juz/:juz_id` - Get all verses in a juz

### 📄 Pages (الصفحات)

- `GET /pages/:surah_id/:verse_id` - Get page number for verse

### ⏱️ Timing (التوقيت)

- `GET /timing/reciters` - Get all available reciters
- `GET /timing/:reciter/surahs` - Get available surahs for a reciter
- `GET /timing/:reciter/:surah_id` - Get verse timings for a surah
- `GET /timing/:reciter/:surah_id/:verse_id` - Get timing for specific verse

### 🖼️ Images (الصور)

- `GET /data/quran_image/:page.png` - Get Quran page image

## 🚀 Quick Start

### Basic Examples

```javascript
// Fetch all surahs
const response = await fetch('https://quran-api-qklj.onrender.com/api/surahs');
const surahs = await response.json();

// Fetch verses of Al-Fatihah
const verses = await fetch('https://quran-api-qklj.onrender.com/api/verses/1');
const fatihahVerses = await verses.json();

// Fetch available reciters for timing
const reciters = await fetch('https://quran-api-qklj.onrender.com/api/timing/reciters');
const allReciters = await reciters.json();

// Fetch verse timings for Al-Fatihah by Sudais
const timings = await fetch('https://quran-api-qklj.onrender.com/api/timing/sudais/1');
const fatihahTimings = await timings.json();
```

### Advanced Examples

```javascript
// Get timing for specific verse
const verseOneTiming = await fetch('https://quran-api-qklj.onrender.com/api/timing/sudais/1/1');
const firstVerse = await verseOneTiming.json();

// Get all available surahs for a reciter
const surahsForSudais = await fetch('https://quran-api-qklj.onrender.com/api/timing/sudais/surahs');
const availableSurahs = await surahsForSudais.json();

// Get audio files for a surah
const audioFiles = await fetch('https://quran-api-qklj.onrender.com/api/audio/1');
const fatihahAudio = await audioFiles.json();

// Get page information
const pageInfo = await fetch('https://quran-api-qklj.onrender.com/api/pages/1/1');
const page = await pageInfo.json();
```

### 📋 Timing API Response Example

```json
{
  "success": true,
  "data": {
    "reciter": "Sudais",
    "reciter_key": "sudais",
    "surah_number": 1,
    "verses_count": 8,
    "total_duration_seconds": 38.126,
    "verses": [
      {
        "verse_number": 1,
        "timing_seconds": 3.371,
        "reciter_display_name": "Sudais"
      }
    ]
  }
}
```

## 📊 Statistics

- **114** Surahs
- **6,236** Verses  
- **158** Audio Reciters
- **4** Timing Reciters (Sudais, Shuraym, Al-Juhaynee, Hudhaify)
- **20,675** Verse Timings
- **604** Pages
- **30** Juz

## 🛡️ Rate Limiting
- **Default:** 300 requests per minute per IP
- Configurable via `API_RATE_LIMIT` environment variable

## 🌍 CORS

API supports Cross-Origin Resource Sharing (CORS) for web applications.

## 🚀 Deployment

The API is deployed on **Render** and available at:

- **Production:** `https://quran-api-qklj.onrender.com/api`
- **Documentation:** `https://quran-api-qklj.onrender.com/docs`
- **Status:** ✅ Live and fully operational

### Performance Metrics (Render)

- **Response Time:** 300-800ms average
- **Uptime:** 99.9%
- **Cold Start:** ~3-5 seconds (if sleeping)
- **Region:** US-West

### Available Reciters for Timing

- **sudais** - الشيخ عبد الرحمن السديس
- **Shuraym** - الشيخ سعود الشريم  
- **Al-Juhaynee** - الشيخ عبد الله الجهني
- **Hudhaify** - الشيخ علي الحذيفي

---

## 🧪 Testing the API

You can test the API endpoints using the provided test scripts:

```bash
# Test local API
node scripts/simpleAPITest.mjs

# Test production API on Render
node scripts/testRenderAPI.mjs
```

---

## Made with ❤️ for the Quran community
