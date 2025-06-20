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

### 🖼️ Images (الصور)
- `GET /data/quran_image/:page.png` - Get Quran page image

## 🚀 Quick Start

```javascript
// Fetch all surahs
const response = await fetch('https://quran-api-qklj.onrender.com/api/surahs');
const surahs = await response.json();

// Fetch verses of Al-Fatihah
const verses = await fetch('https://quran-api-qklj.onrender.com/api/verses/1');
const fatihahVerses = await verses.json();
```

## 📊 Statistics
- **114** Surahs
- **6,236** Verses  
- **158** Audio Reciters
- **604** Pages
- **30** Juz

## 🛡️ Rate Limiting
- **Default:** 300 requests per minute per IP
- Configurable via `API_RATE_LIMIT` environment variable

## 🌍 CORS
API supports Cross-Origin Resource Sharing (CORS) for web applications.

---

**Made with ❤️ for the Quran community**
