# 🕌 Quran Data API - تحديثات التوقيت والتصميم الجديد

## 🎉 **التحديثات الجديدة (يونيو 2025)**

### ✨ **ميزات التوقيت الجديدة:**
- ✅ إضافة بيانات توقيت التلاوة لـ 4 قراء مشهورين
- ✅ أكثر من 20,000 توقيت للآيات
- ✅ API endpoints جديدة لجلب بيانات التوقيت
- ✅ دعم البحث في التوقيتات

### 🎨 **التصميم الجديد:**
- ✅ تصميم حديث ومتجاوب
- ✅ Hero section مع إحصائيات
- ✅ بطاقات API تفاعلية
- ✅ تحسينات في تجربة المستخدم
- ✅ دعم الوضع المظلم

### 🌐 **النشر على Render:**
- ✅ API منشور على: `https://quran-api-qklj.onrender.com`
- ✅ وثائق متاحة على: `https://quran-api-qklj.onrender.com/docs`
- ✅ أداء ممتاز (استجابة < 1 ثانية)

---

## 🎤 **القراء المتاحون:**

| القارئ | الاسم الإنجليزي | عدد التوقيتات |
|--------|-----------------|----------------|
| sudais | الشيخ السديس | 6,349 |
| Shuraym | الشيخ الشريم | 6,354 |
| Al-Juhaynee | الشيخ الجهني | 6,339 |
| Hudhaify | الشيخ الحذيفي | 1,633 |

---

## 🔗 **API Endpoints الجديدة للتوقيت:**

### 📋 **جلب جميع القراء:**
```http
GET /api/timing/reciters
```

### 🎵 **توقيت سورة معينة لقارئ محدد:**
```http
GET /api/timing/{reciter}/{surah_number}
```

### 🎯 **توقيت آية واحدة:**
```http
GET /api/timing/{reciter}/{surah_number}/{verse_number}
```

### 📖 **السور المتاحة لقارئ:**
```http
GET /api/timing/{reciter}/surahs
```

---

## 💡 **أمثلة عملية:**

### **جلب توقيت الفاتحة للسديس:**
```bash
curl https://quran-api-qklj.onrender.com/api/timing/sudais/1
```

**الاستجابة:**
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
      // ... باقي الآيات
    ]
  }
}
```

### **استخدام JavaScript:**
```javascript
const response = await fetch('https://quran-api-qklj.onrender.com/api/timing/sudais/1');
const data = await response.json();

// طباعة توقيت كل آية
data.data.verses.forEach(verse => {
    console.log(`الآية ${verse.verse_number}: ${verse.timing_seconds}s`);
});
```

---

## 📊 **الإحصائيات:**

- **114** سورة كاملة
- **6,236** آية مع النصوص
- **4** قراء مع التوقيتات
- **20,675** توقيت دقيق
- **99.9%** وقت التشغيل على Render

---

## 🚀 **التشغيل المحلي:**

```bash
# استنساخ المشروع
git clone https://github.com/Msr7799/Quran-Data.git
cd Quran-Data

# تثبيت المتطلبات
yarn install

# إضافة بيانات التوقيت إلى قاعدة البيانات
yarn run addTimingToSqlite

# تشغيل السيرفر
yarn dev
```

---

## 🌟 **أمثلة متقدمة:**

### **جلب توقيت عدة سور:**
```javascript
const reciters = ['sudais', 'Shuraym', 'Al-Juhaynee'];
const promises = reciters.map(reciter => 
    fetch(`https://quran-api-qklj.onrender.com/api/timing/${reciter}/1`)
);

const responses = await Promise.all(promises);
const timings = await Promise.all(responses.map(r => r.json()));

// مقارنة أوقات التلاوة
timings.forEach((timing, i) => {
    console.log(`${reciters[i]}: ${timing.data.total_duration_seconds}s`);
});
```

### **حساب متوسط وقت التلاوة:**
```javascript
const response = await fetch('https://quran-api-qklj.onrender.com/api/timing/sudais/1');
const data = await response.json();

const avgTime = data.data.verses.reduce((sum, verse) => 
    sum + verse.timing_seconds, 0) / data.data.verses.length;

console.log(`متوسط وقت الآية: ${avgTime.toFixed(2)}s`);
```

---

## 📱 **تطبيقات الاستخدام:**

- 🎧 **تطبيقات تشغيل القرآن** مع التوقيت المتزامن
- 📖 **تطبيقات التلاوة التفاعلية**
- 🎓 **منصات تعليم القرآن**
- 📊 **تحليل أنماط التلاوة**
- 🤖 **تطبيقات الذكاء الاصطناعي القرآنية**

---

## 🤝 **المساهمة:**

نرحب بمساهماتكم! يمكنكم:
- إضافة قراء جدد
- تحسين دقة التوقيتات
- إضافة ميزات جديدة
- الإبلاغ عن الأخطاء

---

## 📞 **التواصل:**

- **GitHub:** [Msr7799/Quran-Data](https://github.com/Msr7799/Quran-Data)
- **Telegram:** [@tqw24h](https://t.me/tqw24h)
- **قناة كنز الإسلام:** [@KanzislamNet](https://t.me/KanzislamNet)

---

## 🤲 **دعاء:**

**اللهم اجعل هذا العمل صدقة جارية لي ولوالدي ولأهل بيتي ولكل من ساهم أو دعم أو نشر هذا المشروع**

---

## 📄 **الرخصة:**

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.
