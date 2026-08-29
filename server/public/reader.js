(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s),
    $$ = (s, r = document) => [...r.querySelectorAll(s)],
    ar = new Intl.NumberFormat("ar-EG");
  const el = {
    theme: $("#themeBtn"),
    reciter: $("#reciterSelect"),
    surah: $("#surahSelect"),
    translation: $("#translationSelect"),
    load: $("#loadBtn"),
    rimg: $("#reciterImage"),
    rname: $("#reciterName"),
    ren: $("#reciterEnglish"),
    rewaya: $("#reciterRewaya"),
    badges: $("#reciterBadges"),
    dot: $("#trackingDot"),
    audio: $("#audioPlayer"),
    play: $("#playSurahBtn"),
    prev: $("#prevAyahBtn"),
    next: $("#nextAyahBtn"),
    auto: $("#autoScrollToggle"),
    words: $("#wordTrackToggle"),
    note: $("#trackingNote"),
    now: $("#nowPlaying"),
    simg: $("#surahNameImage"),
    smini: $("#surahMiniName"),
    smeta: $("#surahMiniMeta"),
    shimg: $("#surahHeaderImage"),
    snum: $("#surahNumberBadge"),
    stitle: $("#surahTitle"),
    ssub: $("#surahSubtitle"),
    bism: $("#bismillah"),
    status: $("#readerStatus"),
    verses: $("#versesContainer"),
    statS: $("#statSurahs"),
    statR: $("#statReciters"),
    statT: $("#statTracked"),
    search: $("#reciterSearch"),
    grid: $("#recitersGrid"),
    more: $("#showMoreRecitersBtn"),
    epList: $("#endpointList"),
    ep: $("#activeEndpoint"),
    run: $("#runEndpointBtn"),
    copyEp: $("#copyEndpointBtn"),
    out: $("#apiOutput"),
    toast: $("#toast"),
  };
  const st = {
    surahs: [],
    reciters: [],
    tracked: [],
    trackedMap: new Map(),
    selected: null,
    surahNo: 1,
    surahData: null,
    trackData: null,
    trackSummary: null,
    currentAyah: null,
    currentWord: null,
    stopAt: null,
    mode: "idle",
    sequence: false,
    seqIndex: -1,
    galleryLimit: 20,
    apiKey: "surah",
    codeTab: "json",
    apiJson: null,
    lastAyah: null,
    token: 0,
  };
  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  const pad3 = (v) => String(v).padStart(3, "0");
  function toast(m) {
    el.toast.textContent = m;
    el.toast.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.toast.classList.remove("show"), 2200);
  }
  async function api(path) {
    const r = await fetch(path, { headers: { Accept: "application/json" } }),
      b = await r.json().catch(() => null);
    if (!r.ok) throw new Error(b?.message || b?.error || `HTTP ${r.status}`);
    return b;
  }
  function status(m, e = false) {
    el.status.textContent = m;
    el.status.classList.toggle("error", e);
  }
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    el.theme.textContent = t === "dark" ? "☀" : "☾";
    try {
      localStorage.setItem("quran-reader-theme", t);
    } catch {}
  }
  function initTheme() {
    let t;
    try {
      t = localStorage.getItem("quran-reader-theme");
    } catch {}
    setTheme(
      t ||
        (matchMedia?.("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"),
    );
  }
  function rid() {
    return Number(st.selected?.id || 0);
  }
  function tracked() {
    return st.trackedMap.get(rid()) || null;
  }
  function trackAyahs() {
    return Array.isArray(st.trackData?.ayahs) ? st.trackData.ayahs : [];
  }
  function trackAyah(n) {
    return trackAyahs().find((x) => Number(x.ayah) === Number(n)) || null;
  }
  function audioUrl() {
    const a = st.trackData?.audio;
    if (typeof a === "string") return a;
    if (a?.audio_url) return a.audio_url;
    if (a?.url) return a.url;
    const list = Array.isArray(st.surahData?.audio) ? st.surahData.audio : [];
    return list.find((x) => Number(x.id) === rid())?.link || null;
  }
  function fmtTime(s) {
    s = Number(s);
    if (!Number.isFinite(s)) return "—";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  }
  function fillSurahs() {
    el.surah.innerHTML = st.surahs
      .map(
        (s) =>
          `<option value="${s.number}">${ar.format(s.number)}. ${esc(s.name?.ar)} — ${esc(s.name?.transliteration || "")}</option>`,
      )
      .join("");
    el.surah.value = String(st.surahNo);
    el.statS.textContent = ar.format(st.surahs.length);
  }
  function fillReciters() {
    const tids = new Set(st.tracked.map((x) => Number(x.id)));
    el.reciter.innerHTML = st.reciters
      .map(
        (r) =>
          `<option value="${r.id}">${tids.has(Number(r.id)) ? "● " : ""}${esc(r.reciter?.ar || r.name || `قارئ ${r.id}`)}${r.rewaya?.ar ? ` — ${esc(r.rewaya.ar)}` : ""}</option>`,
      )
      .join("");
    const id = st.reciters.some((r) => Number(r.id) === 68)
      ? 68
      : Number(st.reciters[0]?.id || 0);
    el.reciter.value = String(id);
    st.selected =
      st.reciters.find((r) => Number(r.id) === id) || st.reciters[0];
    el.statR.textContent = ar.format(st.reciters.length);
    el.statT.textContent = ar.format(st.tracked.length);
  }
  function rImage(r) {
    return r?.image_url || r?.image?.url || "/quran-data-icon.svg";
  }
  function profile() {
    const r = st.selected,
      t = tracked();
    if (!r) return;
    el.rimg.src = rImage(r);
    el.rimg.alt = `صورة القارئ ${r.reciter?.ar || r.name || ""}`;
    el.rname.textContent = r.reciter?.ar || r.name || `قارئ ${r.id}`;
    el.ren.textContent = r.reciter?.en || "";
    el.rewaya.textContent = r.rewaya?.ar || "الرواية غير محددة";
    el.dot.classList.toggle("on", !!t?.tracking_available);
    const b = [`<span class="badge">ID ${r.id}</span>`];
    if (t) {
      b.push(
        `<span class="badge">${t.recitation_type === "ayah-by-ayah" ? "آية بآية" : "سورة كاملة"}</span>`,
      );
      if (t.source_recitation_id)
        b.push(`<span class="badge">QUL ${t.source_recitation_id}</span>`);
      b.push(
        `<span class="badge ${t.tracking_available ? "" : "gray"}">${t.tracking_available ? "تتبع متاح" : "بلا توقيت آيات"}</span>`,
      );
    } else b.push('<span class="badge gray">صوت سورة</span>');
    el.badges.innerHTML = b.join("");
    if (t?.tracking_available && t.recitation_type === "surah-by-surah")
      el.note.textContent =
        "تتبع الآية والكلمة داخل تسجيل السورة الكاملة متاح.";
    else if (t?.tracking_available)
      el.note.textContent =
        "لكل آية ملف صوت مستقل؛ تشغيل السورة ينتقل آليًا بين الآيات.";
    else if (t?.surah_audio_available)
      el.note.textContent =
        "صوت السورة متاح، لكن مصدر التوقيت لا يحتوي سجلات آيات.";
    else
      el.note.textContent =
        "تشغيل السورة متاح من المكتبة العامة. اختر قارئًا بعلامة ● للتتبع.";
  }
  function header() {
    const s = st.surahData;
    if (!s) return;
    const n = Number(s.number),
      img = `/data/suwer-name/${pad3(n)}.svg`,
      cnt = s.verses_count || s.verses?.length || 0,
      meta = `${s.name?.transliteration || s.name?.en || ""} · ${s.revelation_place?.ar || ""} · ${ar.format(cnt)} آيات`;
    el.snum.textContent = `سورة ${ar.format(n)}`;
    el.stitle.textContent = s.name?.ar || `سورة ${ar.format(n)}`;
    el.ssub.textContent = meta;
    el.shimg.src = img;
    el.simg.src = img;
    el.smini.textContent = s.name?.ar || "";
    el.smeta.textContent = `${ar.format(cnt)} آيات · ${s.revelation_place?.ar || ""}`;
    el.bism.hidden = n === 1 || n === 9;
  }
  function wordsHtml(txt) {
    return String(txt || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(
        (w, i) => `<span class="qword" data-word="${i + 1}">${esc(w)}</span>`,
      )
      .join(" ");
  }
  function renderVerses() {
    const vs = st.surahData?.verses || [],
      show = el.translation.value === "both",
      can = !!tracked()?.tracking_available,
      tm = new Map(trackAyahs().map((x) => [Number(x.ayah), x]));
    el.verses.innerHTML = vs
      .map((v) => {
        const n = Number(v.number),
          tr = tm.get(n),
          tim = tr
            ? tr.audio_url
              ? "ملف صوت مستقل"
              : Number.isFinite(Number(tr.timestamp_from))
                ? `${fmtTime(Number(tr.timestamp_from) / 1000)} – ${fmtTime(Number(tr.timestamp_to) / 1000)}`
                : ""
            : "";
        return `<article class="verse-card" id="ayah-${n}" data-ayah="${n}"><div class="verse-top"><span class="ayah-number">${ar.format(n)}</span><div class="verse-actions"><button data-action="play" data-ayah="${n}" ${can ? "" : "disabled"}>${can ? "▶ تشغيل الآية" : "لا يوجد توقيت"}</button><button data-action="copy" data-ayah="${n}">نسخ</button><button data-action="api" data-ayah="${n}">API</button></div></div><p class="ayah-text" lang="ar">${wordsHtml(v.text?.ar)}</p><p class="translation ${show ? "" : "hidden"}" lang="en">${esc(v.text?.en || "")}</p><div class="verse-meta">الجزء ${ar.format(v.juz || 0)} · الصفحة ${ar.format(v.page || 0)}${tim ? ` · ${esc(tim)}` : ""}</div></article>`;
      })
      .join("");
  }
  function setSrc(url) {
    if (!url) return false;
    const abs = new URL(url, location.origin).href;
    if (el.audio.src !== abs) {
      el.audio.src = url;
      el.audio.load();
    }
    return true;
  }
  function clearVerse() {
    $$(".verse-card.active", el.verses).forEach((x) =>
      x.classList.remove("active"),
    );
  }
  function clearWords() {
    $$(".qword.active-word", el.verses).forEach((x) =>
      x.classList.remove("active-word"),
    );
    st.currentWord = null;
  }
  function activeVerse(n, scroll = false) {
    n = Number(n);
    if (!n) return;
    if (st.lastAyah !== n) {
      clearVerse();
      const c = $(`#ayah-${n}`);
      c?.classList.add("active");
      st.lastAyah = n;
      st.currentAyah = n;
      el.now.textContent = `سورة ${st.surahData?.name?.ar || st.surahNo} — الآية ${ar.format(n)}`;
      if (scroll && el.auto.checked)
        c?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  function reset(clear = false) {
    st.sequence = false;
    st.seqIndex = -1;
    st.stopAt = null;
    st.mode = "idle";
    st.currentAyah = null;
    st.lastAyah = null;
    el.audio.pause();
    if (clear) {
      el.audio.removeAttribute("src");
      el.audio.load();
    }
    clearVerse();
    clearWords();
    el.now.textContent = "—";
  }
  function configure() {
    const t = st.trackSummary,
      u = audioUrl();
    if (t?.recitation_type === "ayah-by-ayah") {
      el.audio.removeAttribute("src");
      el.audio.load();
      el.play.textContent = "▶ تشغيل آية بآية";
    } else if (u) {
      setSrc(u);
      el.play.textContent = "▶ تشغيل السورة";
    } else {
      el.audio.removeAttribute("src");
      el.audio.load();
      el.play.textContent = "لا يوجد صوت";
    }
  }
  async function load() {
    const token = ++st.token;
    st.surahNo = Number(el.surah.value || 1);
    st.selected =
      st.reciters.find((r) => Number(r.id) === Number(el.reciter.value)) ||
      st.selected;
    st.trackSummary = tracked();
    reset(true);
    profile();
    status("جاري تحميل السورة وبيانات التلاوة…");
    el.load.disabled = true;
    try {
      const req = [api(`/api/surah/${st.surahNo}`)];
      if (st.trackSummary)
        req.push(
          api(`/api/ayah-bayah/${st.trackSummary.id}/${st.surahNo}`).catch(
            (e) => ({ __error: e }),
          ),
        );
      const res = await Promise.all(req);
      if (token !== st.token) return;
      st.surahData = res[0]?.result;
      st.trackData = res[1] && !res[1].__error ? res[1].data : null;
      if (!st.surahData) throw new Error("لم تصل بيانات السورة");
      header();
      renderVerses();
      configure();
      renderEndpoints();
      renderGallery();
      const n = trackAyahs().length;
      status(
        st.trackData
          ? n
            ? `تم تحميل ${ar.format(st.surahData.verses.length)} آيات و${ar.format(n)} سجلات تتبع.`
            : "تم تحميل السورة والصوت، ولا توجد سجلات توقيت آيات في هذا المصدر."
          : "تم تحميل النص وصوت القارئ من المكتبة العامة.",
      );
    } catch (e) {
      console.error(e);
      st.surahData = null;
      st.trackData = null;
      el.verses.innerHTML = "";
      status(`تعذر تحميل السورة: ${e.message}`, true);
    } finally {
      if (token === st.token) el.load.disabled = false;
    }
  }
  async function safePlay() {
    try {
      await el.audio.play();
    } catch {
      toast("اضغط زر التشغيل داخل مشغل الصوت للبدء.");
    }
  }
  async function playSurah() {
    if (!st.surahData) return;
    const t = st.trackSummary;
    st.stopAt = null;
    st.lastAyah = null;
    if (t?.recitation_type === "ayah-by-ayah" && trackAyahs().length) {
      st.sequence = true;
      st.seqIndex = 0;
      return playRecord(trackAyahs()[0], true);
    }
    const u = audioUrl();
    if (!u) return toast("لا يوجد رابط صوت لهذه السورة مع القارئ المختار.");
    st.sequence = false;
    st.mode = t?.tracking_available ? "surah" : "general";
    st.currentAyah = null;
    setSrc(u);
    el.audio.currentTime = 0;
    el.now.textContent = `${st.selected.reciter?.ar || st.selected.name} — سورة ${st.surahData.name?.ar}`;
    await safePlay();
  }
  async function playAyah(n) {
    const r = trackAyah(n);
    if (!r) return toast("لا توجد بيانات توقيت لهذه الآية.");
    st.sequence = false;
    st.seqIndex = trackAyahs().findIndex((x) => Number(x.ayah) === Number(n));
    return playRecord(r, false);
  }
  async function playRecord(r, keep) {
    if (!r) return;
    const n = Number(r.ayah);
    st.currentAyah = n;
    st.lastAyah = null;
    st.stopAt = null;
    st.sequence = !!(keep || st.sequence);
    activeVerse(n, true);
    if (r.audio_url) {
      st.mode = "ayah-file";
      setSrc(r.audio_url);
      el.audio.currentTime = 0;
      el.now.textContent = `سورة ${st.surahData.name?.ar} — الآية ${ar.format(n)}`;
      return safePlay();
    }
    const u = audioUrl(),
      from = Number(r.timestamp_from),
      to = Number(r.timestamp_to);
    if (!u || !Number.isFinite(from) || !Number.isFinite(to)) {
      st.sequence = false;
      return toast("لا يوجد ملف آية مستقل أو توقيت صالح لهذه الآية.");
    }
    st.mode = "single";
    st.stopAt = to;
    setSrc(u);
    el.audio.currentTime = Math.max(0, from / 1000);
    el.now.textContent = `سورة ${st.surahData.name?.ar} — الآية ${ar.format(n)}`;
    await safePlay();
  }
  function adjacent(d) {
    const vs = st.surahData?.verses || [];
    if (!vs.length) return;
    const n = Math.min(vs.length, Math.max(1, Number(st.currentAyah || 1) + d));
    playAyah(n);
  }
  function wordTrack(r, ms) {
    if (!el.words.checked || !r || !Array.isArray(r.segments)) {
      clearWords();
      return;
    }
    let wi = null;
    for (const s of r.segments) {
      if (!Array.isArray(s) || s.length < 3) continue;
      const [i, a, b] = s.map(Number);
      if (Number.isFinite(a) && Number.isFinite(b) && ms >= a && ms <= b) {
        wi = i;
        break;
      }
    }
    const key = `${r.ayah}:${wi}`;
    if (st.currentWord === key) return;
    clearWords();
    if (wi) {
      $(`#ayah-${r.ayah} .qword[data-word="${wi}"]`)?.classList.add(
        "active-word",
      );
      st.currentWord = key;
    }
  }
  function timeUpdate() {
    const ms = el.audio.currentTime * 1000;
    if (Number.isFinite(st.stopAt) && ms >= st.stopAt - 25) {
      el.audio.pause();
      st.stopAt = null;
      if (!st.sequence) st.mode = "idle";
      return;
    }
    if (st.mode === "surah") {
      const r = trackAyahs().find((x) => {
        const a = Number(x.timestamp_from),
          b = Number(x.timestamp_to);
        return Number.isFinite(a) && Number.isFinite(b) && ms >= a && ms <= b;
      });
      if (r) {
        const changed = Number(r.ayah) !== Number(st.currentAyah);
        activeVerse(r.ayah, changed);
        wordTrack(r, ms);
      } else clearWords();
    } else if (st.mode === "single" || st.mode === "ayah-file") {
      const r = trackAyah(st.currentAyah);
      if (r) wordTrack(r, ms);
    }
  }
  function ended() {
    clearWords();
    if (st.sequence && st.trackSummary?.recitation_type === "ayah-by-ayah") {
      const rs = trackAyahs(),
        i = st.seqIndex + 1;
      if (i < rs.length) {
        st.seqIndex = i;
        playRecord(rs[i], true);
      } else {
        st.sequence = false;
        toast("اكتملت السورة.");
      }
    }
  }
  function renderGallery() {
    const q = el.search.value.trim().toLowerCase(),
      ids = new Set(st.tracked.map((x) => Number(x.id))),
      f = st.reciters.filter(
        (r) =>
          !q ||
          `${r.reciter?.ar || ""} ${r.reciter?.en || ""} ${r.rewaya?.ar || ""}`
            .toLowerCase()
            .includes(q),
      ),
      show = f.slice(0, st.galleryLimit);
    el.grid.innerHTML = show
      .map(
        (r) =>
          `<button class="reciter-card ${Number(r.id) === rid() ? "selected" : ""}" data-reciter-id="${r.id}" type="button"><img loading="lazy" src="${esc(rImage(r))}" alt="${esc(r.reciter?.ar || "")}"><strong>${esc(r.reciter?.ar || r.name || `قارئ ${r.id}`)}</strong><small>${esc(r.reciter?.en || "")}</small>${ids.has(Number(r.id)) ? '<span class="track-label">● تتبع</span>' : ""}</button>`,
      )
      .join("");
    $$("#recitersGrid img").forEach((i) =>
      i.addEventListener(
        "error",
        () => {
          i.src = "/quran-data-icon.svg";
        },
        { once: true },
      ),
    );
    el.more.hidden = show.length >= f.length;
    el.more.textContent = `عرض المزيد (${ar.format(Math.max(0, f.length - show.length))})`;
  }
  function selectReciter(id) {
    const r = st.reciters.find((x) => Number(x.id) === Number(id));
    if (!r) return;
    st.selected = r;
    el.reciter.value = String(r.id);
    profile();
    renderGallery();
    load();
    $(".toolbar")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function defs() {
    const r = rid() || 68,
      s = st.surahNo || 1,
      a = Number(st.currentAyah || 1);
    return [
      { key: "surah", title: "السورة كاملة", path: `/api/surah/${s}` },
      { key: "reciters", title: "القراء والصور", path: "/api/reciter-images" },
      { key: "names", title: "صور أسماء السور", path: "/api/surah-names" },
      {
        key: "tracked",
        title: "قراء التتبع",
        path: "/api/ayah-bayah/reciters",
      },
      {
        key: "ts",
        title: "تتبع السورة الحالية",
        path: `/api/ayah-bayah/${r}/${s}`,
      },
      {
        key: "ta",
        title: "بيانات الآية الحالية",
        path: `/api/ayah-bayah/${r}/${s}/${a}`,
      },
      { key: "audio", title: "تلاوات السورة", path: `/api/audio/${s}` },
    ];
  }
  function currentDef() {
    return defs().find((x) => x.key === st.apiKey) || defs()[0];
  }
  function renderEndpoints() {
    if (!defs().some((x) => x.key === st.apiKey)) st.apiKey = "surah";
    el.epList.innerHTML = defs()
      .map(
        (d) =>
          `<button class="endpoint-btn ${d.key === st.apiKey ? "active" : ""}" data-api-key="${d.key}" type="button"><strong>${esc(d.title)}</strong><span>GET</span><code>${esc(d.path)}</code></button>`,
      )
      .join("");
    el.ep.textContent = `GET ${currentDef().path}`;
    renderOutput();
  }
  function renderOutput() {
    const d = currentDef(),
      abs = `${location.origin}${d.path}`;
    if (st.codeTab === "js")
      el.out.textContent = `const response = await fetch('${d.path}');\nif (!response.ok) throw new Error(\`HTTP \${response.status}\`);\nconst json = await response.json();\nconsole.log(json);`;
    else if (st.codeTab === "curl")
      el.out.textContent = `curl -H "Accept: application/json" \\\n  "${abs}"`;
    else
      el.out.textContent = st.apiJson
        ? JSON.stringify(st.apiJson, null, 2)
        : "اضغط «تشغيل» لمشاهدة JSON الفعلي.";
  }
  async function runEndpoint() {
    const d = currentDef();
    st.codeTab = "json";
    $$(".tab").forEach((x) =>
      x.classList.toggle("active", x.dataset.codeTab === "json"),
    );
    el.out.textContent = "Loading…";
    el.run.disabled = true;
    try {
      st.apiJson = await api(d.path);
    } catch (e) {
      st.apiJson = { success: false, error: e.message, endpoint: d.path };
    } finally {
      renderOutput();
      el.run.disabled = false;
    }
  }
  async function copyText(t, m = "تم النسخ") {
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      const a = document.createElement("textarea");
      a.value = t;
      a.style.position = "fixed";
      a.style.opacity = "0";
      document.body.append(a);
      a.select();
      document.execCommand("copy");
      a.remove();
    }
    toast(m);
  }
  async function boot() {
    initTheme();
    el.rimg.addEventListener(
      "error",
      () => {
        el.rimg.src = "/quran-data-icon.svg";
      },
      { once: true },
    );
    status("جاري تحميل فهارس السور والقراء…");
    try {
      const [s, r, t] = await Promise.all([
        api("/api/surahs"),
        api("/api/reciter-images"),
        api("/api/ayah-bayah/reciters"),
      ]);
      st.surahs = Array.isArray(s.result) ? s.result : [];
      st.reciters = Array.isArray(r.data) ? r.data : [];
      st.tracked = Array.isArray(t.data) ? t.data : [];
      st.trackedMap = new Map(
        st.tracked.filter((x) => x.id != null).map((x) => [Number(x.id), x]),
      );
      fillSurahs();
      fillReciters();
      profile();
      renderGallery();
      renderEndpoints();
      await load();
    } catch (e) {
      console.error(e);
      status(`تعذر بدء الموقع: ${e.message}`, true);
    }
  }
  el.theme.addEventListener("click", () =>
    setTheme(
      document.documentElement.dataset.theme === "dark" ? "light" : "dark",
    ),
  );
  el.load.addEventListener("click", load);
  el.reciter.addEventListener("change", load);
  el.surah.addEventListener("change", load);
  el.translation.addEventListener("change", renderVerses);
  el.play.addEventListener("click", playSurah);
  el.prev.addEventListener("click", () => adjacent(-1));
  el.next.addEventListener("click", () => adjacent(1));
  el.audio.addEventListener("timeupdate", timeUpdate);
  el.audio.addEventListener("ended", ended);
  el.words.addEventListener("change", () => {
    if (!el.words.checked) clearWords();
  });
  el.verses.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-action]");
    if (!b) return;
    const n = Number(b.dataset.ayah),
      v = st.surahData?.verses?.find((x) => Number(x.number) === n);
    if (b.dataset.action === "play") playAyah(n);
    if (b.dataset.action === "copy")
      copyText(`${v?.text?.ar || ""} ﴿${n}﴾`, `تم نسخ الآية ${n}`);
    if (b.dataset.action === "api") {
      st.currentAyah = n;
      st.apiKey = "ta";
      st.apiJson = null;
      renderEndpoints();
      runEndpoint();
      $("#api-lab")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  el.search.addEventListener("input", () => {
    st.galleryLimit = 20;
    renderGallery();
  });
  el.more.addEventListener("click", () => {
    st.galleryLimit += 20;
    renderGallery();
  });
  el.grid.addEventListener("click", (e) => {
    const c = e.target.closest("[data-reciter-id]");
    if (c) selectReciter(Number(c.dataset.reciterId));
  });
  el.epList.addEventListener("click", (e) => {
    const b = e.target.closest("[data-api-key]");
    if (!b) return;
    st.apiKey = b.dataset.apiKey;
    st.apiJson = null;
    renderEndpoints();
  });
  el.run.addEventListener("click", runEndpoint);
  el.copyEp.addEventListener("click", () =>
    copyText(`${location.origin}${currentDef().path}`, "تم نسخ رابط API"),
  );
  $$(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      st.codeTab = t.dataset.codeTab;
      $$(".tab").forEach((x) => x.classList.toggle("active", x === t));
      renderOutput();
    }),
  );
  boot();
})();
