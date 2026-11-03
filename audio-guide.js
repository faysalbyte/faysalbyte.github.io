/*! audio-guide.js - multilingual spoken guidance (native Web Speech API only).
 *
 * - No libraries, no network, no audio files, no DOM writes => no layout shift, no CSP changes.
 * - Reads nothing from forms or the DOM; only fixed, frozen strings are ever spoken.
 * - Every entry point is wrapped in try/catch: if anything fails the page simply stays silent.
 * - Triggers: home hero (after ~2.5 s), #reviews (IntersectionObserver), contact success
 *   (spoken on /thank-you, because contact.js redirects 1.6 s after success).
 * - Opt-out: localStorage.setItem("audioGuide", "off"). Any key press (Esc included) stops speech.
 */
(function () {
  "use strict";

  var RATE = 0.6;                 // calm, deliberate
  var PITCH = 0.8;                 // deeper timbre (some engines ignore pitch)
  var HERO_DELAY_MS = 2500;
  var REVIEW_DWELL_MS = 700;       // must stay in view this long before speaking
  var START_WATCHDOG_MS = 3000;    // no "start" event by then => treat as blocked
  var HANDOFF_KEY = "ag:thanks";
  var HANDOFF_TTL_MS = 120000;
  var PRIORITY = { hero: 1, review: 2, thanks: 3 };

  var MESSAGES = Object.freeze({
    en: { hero: "Welcome to my portfolio. Please scroll down gently to explore my work, skills, and services.",
          review: "Thank you for exploring my portfolio. If my work has impressed you, I would truly appreciate it if you shared your feedback in a review.",
          thanks: "Thank you! I have received your message, and I will be in touch with you very soon." },
    bn: { hero: "আমার পোর্টফোলিওতে আপনাকে স্বাগতম। আমার কাজ, দক্ষতা ও সেবাগুলো দেখতে অনুগ্রহ করে ধীরে ধীরে নিচে স্ক্রল করুন।",
          review: "আমার পোর্টফোলিও দেখার জন্য ধন্যবাদ। আমার কাজ ভালো লাগলে, অনুগ্রহ করে একটি রিভিউ দিয়ে আপনার মূল্যবান মতামত জানাবেন।",
          thanks: "ধন্যবাদ! আপনার বার্তাটি পেয়েছি, খুব শীঘ্রই আপনার সাথে যোগাযোগ করা হবে।" },
    hi: { hero: "मेरे पोर्टफोलियो में आपका स्वागत है। मेरा काम, कौशल और सेवाएँ देखने के लिए कृपया धीरे-धीरे नीचे स्क्रॉल करें।",
          review: "मेरा पोर्टफोलियो देखने के लिए धन्यवाद। यदि आपको मेरा काम पसंद आया हो, तो कृपया एक रिव्यू लिखकर अपनी राय साझा करें।",
          thanks: "धन्यवाद! मुझे आपका संदेश मिल गया है, और मैं बहुत जल्द आपसे संपर्क करूँगा।" },
    ur: { hero: "میرے پورٹ فولیو میں خوش آمدید۔ میرا کام، مہارتیں اور خدمات دیکھنے کے لیے براہِ کرم آہستہ آہستہ نیچے سکرول کریں۔",
          review: "میرا پورٹ فولیو دیکھنے کا شکریہ۔ اگر آپ کو میرا کام پسند آیا ہو تو براہِ کرم ایک ریویو لکھ کر اپنی رائے سے آگاہ کریں۔",
          thanks: "شکریہ! مجھے آپ کا پیغام موصول ہو گیا ہے، اور میں بہت جلد آپ سے رابطہ کروں گا۔" },
    ar: { hero: "مرحبًا بكم في معرض أعمالي. يُرجى التمرير إلى الأسفل ببطء لاستكشاف أعمالي ومهاراتي وخدماتي.",
          review: "شكرًا لاستكشافكم معرض أعمالي. إذا أعجبكم عملي، فسأكون ممتنًا لو شاركتم رأيكم في تقييم.",
          thanks: "شكرًا لكم! لقد استلمتُ رسالتكم، وسأتواصل معكم في أقرب وقت." },
    es: { hero: "Bienvenido a mi portafolio. Desplázate hacia abajo con calma para explorar mi trabajo, mis habilidades y mis servicios.",
          review: "Gracias por explorar mi portafolio. Si mi trabajo te ha gustado, te agradecería mucho que compartieras tu opinión con una reseña.",
          thanks: "¡Gracias! He recibido tu mensaje y me pondré en contacto contigo muy pronto." },
    fr: { hero: "Bienvenue sur mon portfolio. Faites défiler doucement la page pour découvrir mes réalisations, mes compétences et mes services.",
          review: "Merci d'avoir exploré mon portfolio. Si mon travail vous a plu, je vous serais très reconnaissant de partager votre avis dans un commentaire.",
          thanks: "Merci ! J'ai bien reçu votre message et je reviendrai vers vous très prochainement." },
    de: { hero: "Willkommen in meinem Portfolio. Bitte scrollen Sie langsam nach unten, um meine Arbeiten, Fähigkeiten und Leistungen zu entdecken.",
          review: "Vielen Dank für Ihren Besuch in meinem Portfolio. Wenn Ihnen meine Arbeit gefallen hat, würde ich mich sehr über Ihre Bewertung freuen.",
          thanks: "Vielen Dank! Ich habe Ihre Nachricht erhalten und melde mich sehr bald bei Ihnen." },
    pt: { hero: "Bem-vindo ao meu portfólio. Role a página para baixo com calma para conhecer meu trabalho, minhas habilidades e meus serviços.",
          review: "Obrigado por conhecer meu portfólio. Se gostou do meu trabalho, eu agradeceria muito se compartilhasse sua opinião em uma avaliação.",
          thanks: "Obrigado! Recebi sua mensagem e entrarei em contato com você em breve." },
    ru: { hero: "Добро пожаловать в моё портфолио. Пожалуйста, медленно прокрутите страницу вниз, чтобы ознакомиться с моими работами, навыками и услугами.",
          review: "Спасибо, что изучили моё портфолио. Если моя работа вам понравилась, буду очень признателен за ваш отзыв.",
          thanks: "Спасибо! Я получил ваше сообщение и очень скоро свяжусь с вами." },
    it: { hero: "Benvenuto nel mio portfolio. Scorri lentamente verso il basso per scoprire i miei lavori, le mie competenze e i miei servizi.",
          review: "Grazie per aver esplorato il mio portfolio. Se il mio lavoro ti è piaciuto, ti sarei molto grato se condividessi la tua opinione con una recensione.",
          thanks: "Grazie! Ho ricevuto il tuo messaggio e ti contatterò molto presto." },
    tr: { hero: "Portfolyoma hoş geldiniz. Çalışmalarımı, becerilerimi ve hizmetlerimi keşfetmek için lütfen yavaşça aşağı kaydırın.",
          review: "Portfolyomu incelediğiniz için teşekkür ederim. Çalışmalarımı beğendiyseniz, bir yorum bırakarak görüşlerinizi paylaşırsanız çok memnun olurum.",
          thanks: "Teşekkürler! Mesajınızı aldım ve çok yakında sizinle iletişime geçeceğim." },
    id: { hero: "Selamat datang di portofolio saya. Silakan gulir ke bawah perlahan untuk melihat karya, keahlian, dan layanan saya.",
          review: "Terima kasih telah menjelajahi portofolio saya. Jika Anda menyukai karya saya, saya akan sangat menghargai jika Anda membagikan ulasan Anda.",
          thanks: "Terima kasih! Pesan Anda sudah saya terima, dan saya akan segera menghubungi Anda." },
    ja: { hero: "私のポートフォリオへようこそ。ゆっくり下にスクロールして、作品やスキル、サービスをご覧ください。",
          review: "ポートフォリオをご覧いただき、ありがとうございます。私の仕事を気に入っていただけましたら、ぜひレビューでご意見をお聞かせください。",
          thanks: "ありがとうございます。メッセージを受け取りました。近日中にご連絡いたします。" },
    ko: { hero: "제 포트폴리오에 오신 것을 환영합니다. 천천히 아래로 스크롤하여 작업과 기술, 서비스를 살펴보세요.",
          review: "제 포트폴리오를 살펴봐 주셔서 감사합니다. 제 작업이 마음에 드셨다면 리뷰로 소중한 의견을 남겨 주시면 정말 감사하겠습니다.",
          thanks: "감사합니다! 메시지를 받았으며, 곧 연락드리겠습니다." },
    zh: { hero: "欢迎来到我的作品集。请缓缓向下滚动，浏览我的作品、技能和服务。",
          review: "感谢您浏览我的作品集。如果您喜欢我的作品，非常期待您留下评价，分享您的反馈。",
          thanks: "谢谢！我已收到您的消息，会尽快与您联系。" }
  });

  /* Browsers expose no gender field, so "male" is matched by well-known voice names. */
  var MALE = /\b(male|david|mark|george|guy|ryan|christopher|eric|davis|roger|steffan|brian|andrew|thomas|james|richard|alex|daniel|aaron|arthur|oliver|rishi|lee|gordon|jorge|diego|juan|pablo|raul|carlos|enrique|alvaro|antonio|tomas|claude|paul|henri|remy|thierry|jerome|stefan|markus|conrad|killian|luca|cosimo|giuseppe|fabio|valerio|donato|xander|pavel|dmitry|maxim|keita|ichiro|otoya|injoon|yunyang|yunxi|yunjian|kangkang|yunze|yunhao|ahmet|ardi|bashkar|pradeep|madhur|hemant|ravi|prabhat|hamed|shakir|naayf|asad|salman|maged|tarik)\b/i;
  var FEMALE = /\b(female|woman|samantha|karen|zira|hazel|susan|linda|heather|catherine|moira|tessa|tina|veena|victoria|fiona|kate|serena|allison|ava|aria|jenny|michelle|libby|sonia|natasha|clara|emma|hedda|katja|amelie|marie|paulina|helena|laura|sabina|monica|paloma|elvira|dalia|lucia|isabella|elsa|alice|milena|yuna|kyoko|nanami|haruka|ayumi|sayaka|xiaoxiao|xiaoyi|yaoyao|huihui|hanhan|hsiao|tracy|sin-ji|mei-jia|zariyah|salma|hoda|laila|zeina|nabanita|tanishaa|swara|kalpana|heera|neerja|joana|luciana|raquel|amalia|ioana|ivana|irina|svetlana|tatyana|yelda|emel|gadis|sari|jiyoung|sunhi|seoyeon|anna|ellen|petra|sara|nora|fatima|sakina|google us english)\b/i;
  var NOVELTY = /\b(fred|ralph|junior|albert|bruce|kathy|agnes|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|pipe organ|trinoids|whisper|zarvox|jester|wobble|superstar)\b/i;

  var synth = null;
  var current = null;              // active record; also keeps the utterance referenced (Chrome GC bug)
  var pending = null;              // a blocked key waiting for the first user gesture
  var seq = 0;
  var voiceCache = null;
  var spoken = {};
  var gestureArmed = false;
  var GESTURES = ["pointerdown", "touchend", "click"];

  /* ------------------------------ helpers ------------------------------ */
  function store(kind) { try { return window[kind]; } catch (e) { return null; } }
  function getItem(kind, k) { try { var s = store(kind); return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function setItem(kind, k, v) { try { var s = store(kind); if (!s) return false; s.setItem(k, v); return true; } catch (e) { return false; } }
  function removeItem(kind, k) { try { var s = store(kind); if (s) s.removeItem(k); } catch (e) {} }

  function enabled() {
    return !!synth && getItem("localStorage", "audioGuide") !== "off";
  }
  function isDone(key) { return !!spoken[key] || getItem("sessionStorage", "ag:" + key) === "1"; }
  function markDone(key) { spoken[key] = true; if (key !== "thanks") setItem("sessionStorage", "ag:" + key, "1"); }

  /* navigator.language is user-controlled input: strict allow-list pattern, then a hasOwnProperty lookup. */
  function cleanTag(tag) {
    var s = String(tag == null ? "" : tag).slice(0, 35).replace(/_/g, "-");
    return /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/.test(s) ? s : "";
  }
  function baseOf(tag) { return tag.split("-")[0].toLowerCase(); }
  function hasMessages(base) { return Object.prototype.hasOwnProperty.call(MESSAGES, base); }

  function preferredTags() {
    var raw = [], out = [], seen = {}, i;
    try {
      if (navigator.languages && navigator.languages.length) raw = Array.prototype.slice.call(navigator.languages, 0, 6);
      else raw = [navigator.language || navigator.userLanguage];
    } catch (e) {}
    raw.push("en");                                    // English fallback is always last
    for (i = 0; i < raw.length; i++) {
      var t = cleanTag(raw[i]);
      if (t && !seen[t.toLowerCase()]) { seen[t.toLowerCase()] = true; out.push(t); }
    }
    return out;
  }

  /* --------------------------- voice selection -------------------------- */
  function safeVoices() {
    try { return Array.prototype.slice.call(synth.getVoices() || []); } catch (e) { return []; }
  }

  function withVoices(cb) {
    if (voiceCache && voiceCache.length) { cb(voiceCache); return; }
    var v = safeVoices();
    if (v.length) { voiceCache = v; cb(v); return; }
    var done = false, timer = 0;
    function finish() {                                // Chrome fills the list asynchronously
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { if (synth.removeEventListener) synth.removeEventListener("voiceschanged", finish); } catch (e) {}
      voiceCache = safeVoices();
      cb(voiceCache);
    }
    timer = setTimeout(finish, 1200);
    try {
      if (synth.addEventListener) synth.addEventListener("voiceschanged", finish);
      else synth.onvoiceschanged = finish;
    } catch (e) {}
  }

  function scoreVoice(v, tagLower) {
    var n = String(v.name || "");
    if (NOVELTY.test(n) || FEMALE.test(n)) return -1;  // never pick a known-female / novelty voice
    var s = MALE.test(n) ? 100 : 0;
    if (/natural|neural/i.test(n)) s += 20;
    if (v.localService) s += 5;
    if (v["default"]) s += 1;
    if (String(v.lang || "").replace(/_/g, "-").toLowerCase() === tagLower) s += 30;
    return s;
  }

  function bestVoice(voices, tag) {
    var base = baseOf(tag), tagLower = tag.toLowerCase(), best = null, bestScore = -1;
    for (var i = 0; i < voices.length; i++) {
      var v = voices[i];
      if (!v || baseOf(String(v.lang || "").replace(/_/g, "-")) !== base) continue;
      var sc = scoreVoice(v, tagLower);
      if (sc > bestScore) { best = v; bestScore = sc; }
    }
    return best;
  }

  /* Walk the visitor's languages; first one that has BOTH a translation and an acceptable voice wins. */
  function resolve(key, voices) {
    var tags = preferredTags(), i;
    if (!voices.length) {                              // engine gave us nothing: let it choose by lang
      for (i = 0; i < tags.length; i++) {
        if (hasMessages(baseOf(tags[i]))) return { text: MESSAGES[baseOf(tags[i])][key], lang: tags[i], voice: null };
      }
    }
    for (i = 0; i < tags.length; i++) {
      var base = baseOf(tags[i]);
      if (!hasMessages(base)) continue;
      var voice = bestVoice(voices, tags[i]);
      if (voice) return { text: MESSAGES[base][key], lang: voice.lang || tags[i], voice: voice };
    }
    return { text: MESSAGES.en[key], lang: "en", voice: null };
  }

  /* ------------------------------ speaking ------------------------------ */
  function cancelSafe() {
    try { if (synth && (synth.speaking || synth.pending)) synth.cancel(); } catch (e) {}
  }

  function stopAll() {                                 // user-initiated stop: never auto-resume
    seq++;
    pending = null;
    if (current) { current.stopped = true; clearTimeout(current.watchdog); current = null; }
    cancelSafe();
  }

  function finish(rec, outcome) {
    if (rec.done) return;
    rec.done = true;
    clearTimeout(rec.watchdog);
    if (current === rec) current = null;
    if (outcome === "blocked" && !rec.stopped && !isDone(rec.key)) {
      if (!pending || PRIORITY[rec.key] >= PRIORITY[pending]) pending = rec.key;
      armGesture();                                    // autoplay policy: retry on the first real gesture
    }
  }

  function startSpeech(key, res) {
    var u = new window.SpeechSynthesisUtterance(res.text);
    u.lang = res.lang;
    if (res.voice) u.voice = res.voice;
    u.rate = RATE;
    u.pitch = PITCH;
    u.volume = 1;
    var rec = { key: key, utter: u, started: false, done: false, stopped: false, watchdog: 0 };
    u.onstart = function () { rec.started = true; clearTimeout(rec.watchdog); markDone(key); };
    u.onend = function () { finish(rec, "ended"); };
    u.onerror = function (ev) {
      var err = ev && ev.error;
      finish(rec, err === "not-allowed" ? "blocked" : "error");
    };
    rec.watchdog = setTimeout(function () {            // engine hung or silently refused (e.g. iOS)
      if (rec.started || rec.done) return;
      finish(rec, "blocked");
      cancelSafe();
    }, START_WATCHDOG_MS);
    current = rec;
    try { if (synth.paused) synth.resume(); } catch (e) {}
    synth.speak(u);
  }

  function say(key) {
    try {
      if (!enabled() || !PRIORITY[key] || spoken[key]) return;
      if (current) {
        if (current.key === key || PRIORITY[key] < PRIORITY[current.key]) return;
        stopAll();                                     // higher priority replaces the current message
      }
      var token = ++seq;
      withVoices(function (voices) {
        try {
          if (token !== seq || current) return;
          var res = resolve(key, voices);
          if (synth.speaking || synth.pending) {       // Chrome drops speak() issued right after cancel()
            cancelSafe();
            setTimeout(function () {
              try { if (token === seq && !current) startSpeech(key, res); } catch (e) {}
            }, 60);
          } else {
            startSpeech(key, res);                     // synchronous: keeps the user-gesture call stack intact
          }
        } catch (e) {}
      });
    } catch (e) {}
  }

  /* ---------------------- autoplay-policy gesture retry ---------------------- */
  function stillRelevant(key) {
    try {
      if (isDone(key)) return false;
      if (key === "hero") return (window.pageYOffset || 0) < window.innerHeight * 0.25 && !document.hidden;
      if (key === "review") {
        var el = document.getElementById("reviews");
        if (!el) return false;
        var r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < window.innerHeight;
      }
      return true;
    } catch (e) { return false; }
  }

  function onGesture() {
    try {
      disarmGesture();
      var key = pending;
      pending = null;
      if (key && stillRelevant(key)) say(key);
    } catch (e) {}
  }
  function armGesture() {
    if (gestureArmed) return;
    gestureArmed = true;
    for (var i = 0; i < GESTURES.length; i++) document.addEventListener(GESTURES[i], onGesture, { capture: true, passive: true });
  }
  function disarmGesture() {
    if (!gestureArmed) return;
    gestureArmed = false;
    for (var i = 0; i < GESTURES.length; i++) document.removeEventListener(GESTURES[i], onGesture, { capture: true });
  }

  /* ------------------------------- triggers ------------------------------- */
  function initHero() {
    if (isDone("hero")) return;
    var h = window.location.hash;
    if (h && h !== "#" && h !== "#top") return;        // visitor deep-linked somewhere: don't talk over them

    function onScroll() {                              // they started scrolling = they followed the advice
      if ((window.pageYOffset || 0) > 120) {
        window.removeEventListener("scroll", onScroll);
        if (current && current.key === "hero") stopAll();
        if (pending === "hero") pending = null;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    setTimeout(function () {
      try {
        if (!stillRelevant("hero")) { window.removeEventListener("scroll", onScroll); return; }
        say("hero");
      } catch (e) {}
    }, HERO_DELAY_MS);
  }

  function initReview() {
    var section = document.getElementById("reviews");
    if (!section || !("IntersectionObserver" in window) || isDone("review")) return;
    var visible = false, timer = 0, io = null;
    try {
      io = new IntersectionObserver(function (entries) {
        try {
          var e = entries[entries.length - 1];
          visible = !!(e && e.isIntersecting);
          clearTimeout(timer);
          if (!visible) return;
          timer = setTimeout(function () {             // dwell check: skip fly-bys
            if (!visible) return;
            io.disconnect();
            say("review");
          }, REVIEW_DWELL_MS);
        } catch (err) {}
      }, { root: null, rootMargin: "0px 0px -25% 0px", threshold: 0 });
      io.observe(section);
    } catch (e) {}
  }

  /* Contact success: contact.js flips #submitButton to .done only on a confirmed server success.
   * Observing that class needs no edit to contact.js and cannot touch the submit flow. */
  function initContact() {
    var btn = document.getElementById("submitButton");
    if (!btn || !window.MutationObserver) return;
    var fired = false;
    try {
      var mo = new MutationObserver(function () {
        try {
          if (fired || !btn.classList.contains("done")) return;
          fired = true;
          mo.disconnect();
          // contact.js navigates away after 1.6 s, which would cut the speech off: hand over to /thank-you.
          if (!setItem("sessionStorage", HANDOFF_KEY, String(Date.now()))) say("thanks");
        } catch (e) {}
      });
      mo.observe(btn, { attributes: true, attributeFilter: ["class"] });
    } catch (e) {}
  }

  function initThanks() {
    var ts = parseInt(getItem("sessionStorage", HANDOFF_KEY), 10);
    removeItem("sessionStorage", HANDOFF_KEY);         // one-shot: a refresh never repeats it
    if (!ts || Date.now() - ts > HANDOFF_TTL_MS || Date.now() < ts) return;
    setTimeout(function () { say("thanks"); }, 500);
  }

  /* -------------------------------- boot -------------------------------- */
  function boot() {
    try {
      var body = document.body;
      if (body && body.classList.contains("home")) { initHero(); initReview(); }
      if (document.querySelector(".thankyou-page")) initThanks();
    } catch (e) {}
  }

  function schedule(fn) {
    if ("requestIdleCallback" in window) window.requestIdleCallback(fn, { timeout: 2000 });
    else setTimeout(fn, 200);
  }

  try {
    synth = window.speechSynthesis || null;
    if (!synth || typeof window.SpeechSynthesisUtterance !== "function") return;   // unsupported: do nothing
    if (navigator.webdriver) return;                                                // keep tests / audits silent

    initContact();                                     // cheap observer, registered immediately

    document.addEventListener("keydown", function () { if (current) stopAll(); }, { passive: true });
    document.addEventListener("visibilitychange", function () { if (document.hidden && current) stopAll(); });
    window.addEventListener("pagehide", function () { stopAll(); });

    if (document.readyState === "complete") schedule(boot);
    else window.addEventListener("load", function () { schedule(boot); }, { once: true });
  } catch (e) { /* never let a speech problem reach the page */ }
})();
