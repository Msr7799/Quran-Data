# 📚 Qu## 📊 API Statistics
- **9** Main Endpoints (including API Reference)
- **114** Surahs
- **6,236** Verses
- **158** Audio Reciters
- **4** Timing Reciters
- **20,675** Verse Timings
- **604** Quran Page ImagesDocumentation

## 🌐 Base URL
```
https://quran-api-qklj.onrender.com/api
```

## � API Statistics
- **8** Main Endpoints
- **114** Surahs
- **6,236** Verses
- **158** Audio Reciters
- **4** Timing Reciters
- **20,675** Verse Timings
- **604** Quran Page Images

## �📋 Available Endpoints

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
- `GET /timing/reciters` - Get all available reciters with timing data
- `GET /timing/:reciter/surahs` - Get available surahs for a reciter
- `GET /timing/:reciter/:surah_id` - Get verse timings for a surah
- `GET /timing/:reciter/:surah_id/:verse_id` - Get timing for specific verse

**Available Timing Reciters:**
- `sudais` - الشيخ عبد الرحمن السديس
- `Shuraym` - الشيخ سعود الشريم  
- `Hudhaify` - الشيخ علي الحذيفي
- `alafasy` - الشيخ مشاري العفاسي

### 🖼️ Images (الصور)
- `GET /data/quran_image/:page.png` - Get Quran page image (1-604)

### 📚 API Reference
- `GET /api-reference` - Get complete API documentation (from database)

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

// Get API reference documentation
const apiRef = await fetch('https://quran-api-qklj.onrender.com/api/api-reference');
const documentation = await apiRef.json();
```

### 📋 Timing API Detailed Examples

```javascript
// Example 1: Get all available reciters
const recitersResponse = await fetch('https://quran-api-qklj.onrender.com/api/timing/reciters');
const reciters = await recitersResponse.json();
console.log(reciters);
// Returns: List of all 4 reciters with timing data

// Example 2: Get timing for complete Al-Fatihah by Sudais
const timingResponse = await fetch('https://quran-api-qklj.onrender.com/api/timing/sudais/1');
const fatihahTiming = await timingResponse.json();
console.log(fatihahTiming);

// Example 3: Get timing for first verse only
const verseTimingResponse = await fetch('https://quran-api-qklj.onrender.com/api/timing/sudais/1/1');
const firstVerseTiming = await verseTimingResponse.json();
console.log(firstVerseTiming);

// Example 4: Get available surahs for Shuraym
const shurayimSurahs = await fetch('https://quran-api-qklj.onrender.com/api/timing/Shuraym/surahs');
const availableSurahs = await shurayimSurahs.json();
console.log(availableSurahs);
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

### 📚 API Reference Response Example

```json
{
  "success": true,
  "data": {
    "api_info": {
      "title": "Quran Data API - مرجع شامل",
      "description": "واجهة برمجة تطبيقات شاملة للقرآن الكريم",
      "version": "2.1.0",
      "base_url": "https://quran-api-qklj.onrender.com/api",
      "documentation_url": "https://quran-api-qklj.onrender.com/docs",
      "github_url": "https://github.com/Msr7799/Quran-Data"
    },
    "statistics": {
      "total_surahs": 114,
      "total_verses": 6236,
      "total_audio_reciters": 158,
      "timing_reciters": 4,
      "total_verse_timings": 20675
    },
    "endpoints": {
      "/surahs": {
        "method": "GET",
        "description": "جلب جميع السور",
        "example_url": "https://quran-api-qklj.onrender.com/api/surahs"
      },
      "/timing/reciters": {
        "method": "GET", 
        "description": "جلب جميع القراء المتاحين للتوقيت",
        "example_url": "https://quran-api-qklj.onrender.com/api/timing/reciters"
      }
    }
  }
}
```

## 🧪 Testing the API

You can test the API endpoints using the available methods:

```bash
# Visit documentation page
https://quran-api-qklj.onrender.com/docs

# Test API Reference endpoint
curl https://quran-api-qklj.onrender.com/api/api-reference

# Test timing endpoints
curl https://quran-api-qklj.onrender.com/api/timing/reciters
curl https://quran-api-qklj.onrender.com/api/timing/sudais/1
```

---

## Made with ❤️ for the Quran community
