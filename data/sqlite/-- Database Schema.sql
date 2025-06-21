-- Database Schema
-- Generated on 2025-06-21T05:07:51.034Z

-- Total tables: 5

-- Table: surahs
-- Columns: 9
CREATE TABLE surahs (
    number INTEGER,
    name_ar TEXT,
    name_en TEXT,
    name_transliteration TEXT,
    revelation_place_ar TEXT,
    revelation_place_en TEXT,
    verses_count INTEGER,
    words_count INTEGER,
    letters_count INTEGER
);

-- Table: verses
-- Columns: 7
CREATE TABLE verses (
    surah_number INTEGER,
    number INTEGER,
    text_ar TEXT,
    text_en TEXT,
    juz INTEGER,
    page INTEGER,
    sajda BOOLEAN
);

-- Table: audio
-- Columns: 8
CREATE TABLE audio (
    id INTEGER,
    surah_number INTEGER,
    reciter_ar TEXT,
    reciter_en TEXT,
    rewaya_ar TEXT,
    rewaya_en TEXT,
    server TEXT,
    link TEXT
);

-- Table: ayat_timing
-- Columns: 6
CREATE TABLE ayat_timing (
    id INTEGER,
    reciter_name TEXT NOT NULL,
    reciter_display_name TEXT,
    surah_number INTEGER,
    verse_number INTEGER,
    timing_seconds REAL
);

-- Table: api_reference
-- Columns: 11
CREATE TABLE api_reference (
    id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    version TEXT,
    base_url TEXT,
    documentation_url TEXT,
    github_url TEXT,
    json_content TEXT NOT NULL,
    statistics TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

