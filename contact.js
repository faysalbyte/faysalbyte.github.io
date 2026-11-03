/* contact.js - Contact page: validation, placeholder animation, async submit to /api/contact (Vercel).
 * Menu / year / reduced-motion logic now lives in common.js. */
(function () {
  "use strict";

  var form = document.getElementById("contactForm");
  var submitButton = document.getElementById("submitButton");
  var statusEl = document.getElementById("formStatus");

  var fields = {};
  ["name", "email", "country", "message"].forEach(function (id) {
    fields[id] = { element: document.getElementById(id), error: document.getElementById(id + "Error") };
  });

  var wrapperOf = function (el) {
    return el ? el.closest(".form-row") || el.closest(".field") || el.parentElement : null;
  };

  function showError(field, message) {
    if (!field || !field.element) return;
    var wrap = wrapperOf(field.element);
    if (field.error) {
      field.error.textContent = message;
      field.element.setAttribute("aria-describedby", field.error.id);
    }
    field.element.setAttribute("aria-invalid", "true");
    if (wrap) wrap.classList.add("invalid");
  }

  function clearError(field) {
    if (!field || !field.element) return;
    var wrap = wrapperOf(field.element);
    if (field.error) field.error.textContent = "";
    field.element.removeAttribute("aria-invalid");
    if (wrap) wrap.classList.remove("invalid");
  }

  function validate(id) {
    var field = fields[id];
    if (!field || !field.element) return true;
    var value = field.element.value.trim();
    var message = "";
    if (id === "name" && value.length < 2) message = "Please enter your name.";
    else if (id === "email" && (value.length === 0 || !field.element.validity.valid)) message = "Please enter a valid email address.";
    else if (id === "country" && !value) message = "Please select your country.";
    else if (id === "message" && value.length < 10) message = "Please write at least 10 characters.";
    if (message) { showError(field, message); return false; }
    clearError(field);
    return true;
  }

  /* ---- animated placeholders (name / subject / message) ---- */
  var placeholders = [];
  function bindPlaceholder(input, label) {
    if (!input || !label) return;
    var sync = function () { label.classList.toggle("hidden", input.value.length > 0); };
    ["input", "focus", "blur", "change"].forEach(function (evt) { input.addEventListener(evt, sync); });
    placeholders.push(sync);
    sync();
  }
  bindPlaceholder(document.getElementById("name"), document.querySelector(".name-placeholder"));
  bindPlaceholder(document.getElementById("subject"), document.querySelector(".subject-placeholder"));
  bindPlaceholder(document.getElementById("message"), document.querySelector(".message-placeholder"));

  Object.keys(fields).forEach(function (id) {
    var field = fields[id];
    if (!field.element) return;
    field.element.addEventListener("blur", function () { validate(id); });
    field.element.addEventListener("input", function () { if (field.element.value.trim()) clearError(field); });
    field.element.addEventListener("change", function () { validate(id); });
  });

  /* WhatsApp field: digits, +, spaces, brackets and dashes only */
  var whatsapp = document.getElementById("whatsapp");
  if (whatsapp) {
    whatsapp.addEventListener("input", function () {
      whatsapp.value = whatsapp.value.replace(/[^\d+\s()-]/g, "");
    });
  }

  function setStatus(text, kind, role) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = kind ? "form-status " + kind : "form-status";
    if (role) statusEl.setAttribute("role", role);
  }

  var errorTimer = 0;
  function setButtonState(state) {
    if (!submitButton) return;
    clearTimeout(errorTimer);
    submitButton.classList.toggle("loading", state === "loading");
    submitButton.classList.toggle("done", state === "done");
    submitButton.classList.toggle("error", state === "error");
    if (state === "loading") {
      submitButton.setAttribute("aria-disabled", "true");
      submitButton.setAttribute("aria-label", "Sending message");
    } else if (state === "done") {
      submitButton.setAttribute("aria-disabled", "true");
      submitButton.setAttribute("aria-label", "Message sent");
    } else if (state === "error") {
      submitButton.removeAttribute("aria-disabled");
      submitButton.setAttribute("aria-label", "Sending failed. Send message again");
      errorTimer = setTimeout(function () { setButtonState("idle"); }, 3200);   // back to idle so it can be retried
    } else {
      submitButton.removeAttribute("aria-disabled");
      submitButton.setAttribute("aria-label", "Send message");
    }
  }

  /* click ripple: position handed to CSS through custom properties (CSSOM, so CSP-safe) */
  var ripple = submitButton ? submitButton.querySelector(".sb-ripple") : null;
  if (submitButton && ripple) {
    submitButton.addEventListener("pointerdown", function (e) {
      if (submitButton.classList.contains("loading") || submitButton.classList.contains("done")) return;
      var r = submitButton.getBoundingClientRect();
      ripple.style.setProperty("--rx", (e.clientX - r.left) + "px");
      ripple.style.setProperty("--ry", (e.clientY - r.top) + "px");
      ripple.classList.remove("go");
      void ripple.offsetWidth;                  // restart the animation
      ripple.classList.add("go");
    }, { passive: true });
  }

  /* ---- submission: async POST (JSON) to our own Vercel serverless function ---- */
  var ENDPOINT = form ? (form.getAttribute("data-endpoint") || "") : "";
  var REQUEST_TIMEOUT_MS = 20000;
  var renderedAt = Date.now();   // lets the server reject bots that submit instantly

  function collectPayload() {
    var val = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; };
    var trap = form.elements["company_website"];
    return {
      name: val("name"),
      email: val("email"),
      whatsapp: val("whatsapp"),
      country: val("country"),
      subject: val("subject"),
      message: val("message"),
      company_website: trap ? trap.value : "",   // honeypot: must stay empty
      elapsed: Date.now() - renderedAt
    };
  }

  function fail(message) {
    setButtonState("error");
    setStatus(message, "error", "alert");
  }

  if (form && submitButton) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();                      // never fall back to a native/GET submit
      if (submitButton.classList.contains("loading") || submitButton.classList.contains("done")) return;

      var valid = true, firstInvalid = null;
      Object.keys(fields).forEach(function (id) {
        if (!validate(id)) {
          valid = false;
          if (!firstInvalid) firstInvalid = fields[id].element;
        }
      });
      if (!valid) {
        if (firstInvalid) firstInvalid.focus();
        setStatus("Please correct the highlighted fields.", "error", "alert");
        return;
      }
      if (!ENDPOINT || !window.fetch) {
        fail("Sorry, the form is unavailable right now. Please email me directly.");
        return;
      }

      setButtonState("loading");
      setStatus("Sending your message...", "sending", "status");

      var controller = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (controller) controller.abort(); }, REQUEST_TIMEOUT_MS);

      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(collectPayload()),
        mode: "cors",
        credentials: "omit",
        signal: controller ? controller.signal : undefined
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          return { ok: response.ok, status: response.status, data: data };
        });
      }).then(function (result) {
        clearTimeout(timer);
        if (result.ok && result.data && result.data.success) {
          setButtonState("done");
          setStatus("Thank you! Your message has been sent.", "", "status");
          form.reset();
          placeholders.forEach(function (sync) { sync(); });
          setTimeout(function () { window.location.href = "thank-you"; }, 1600);
          return;
        }
        // Field-level errors returned by the server
        var errs = result.data && result.data.errors;
        if (result.status === 400 && errs && typeof errs === "object") {
          var focused = false;
          Object.keys(errs).forEach(function (id) {
            if (fields[id]) {
              showError(fields[id], String(errs[id]));
              if (!focused) { fields[id].element.focus(); focused = true; }
            }
          });
          fail((result.data && result.data.message) || "Please correct the highlighted fields.");
        } else if (result.status === 429) {
          fail("Too many attempts. Please wait a few minutes and try again.");
        } else {
          fail("Sorry, your message could not be sent. Please try again or email me directly.");
        }
      }).catch(function (err) {
        clearTimeout(timer);
        fail(err && err.name === "AbortError"
          ? "The request took too long. Please check your connection and try again."
          : "Network error. Please check your connection and try again, or email me directly.");
      });
    });
  }
})();

/* Load the Google Maps embed only when it is about to be seen (keeps ~450 KB of Maps JS off the critical load) */
(function () {
  var frame = document.querySelector("iframe[data-src]");
  if (!frame) return;
  var load = function () {
    if (frame.dataset.src) { frame.src = frame.dataset.src; frame.removeAttribute("data-src"); }
  };
  if (!("IntersectionObserver" in window)) { load(); return; }
  var io = new IntersectionObserver(function (entries) {
    if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); load(); }
  }, { rootMargin: "300px 0px" });
  io.observe(frame);
})();

/* ==========================================================================
 * Dual glassmorphism clocks + typing notice (pure client-side, no network,
 * no Geolocation API => no permission prompt).
 * Visitor location = IANA time zone from Intl (e.g. "America/New_York")
 *   -> city from the zone id, country from the embedded zone->country table.
 * ========================================================================== */
(function () {
  "use strict";
  var widget = document.getElementById("tzWidget");
  if (!widget || !window.Intl || !Intl.DateTimeFormat) return;

  var HOST_TZ = "Asia/Dhaka";
  var DAY_START = 6, DAY_END = 18;               // 06:00-17:59 = day

  /* region -> ISO country -> comma-separated zone ids (from tzdata zone.tab) */
  var ZONES = {"Europe":{"AD":"Andorra","AL":"Tirane","AT":"Vienna","AX":"Mariehamn","BA":"Sarajevo","BE":"Brussels","BG":"Sofia","BY":"Minsk","CH":"Zurich","CZ":"Prague","DE":"Berlin,Busingen","DK":"Copenhagen","EE":"Tallinn","ES":"Madrid","FI":"Helsinki","FR":"Paris","GB":"London","GG":"Guernsey","GI":"Gibraltar","GR":"Athens","HR":"Zagreb","HU":"Budapest","IE":"Dublin","IM":"Isle_of_Man","IT":"Rome","JE":"Jersey","LI":"Vaduz","LT":"Vilnius","LU":"Luxembourg","LV":"Riga","MC":"Monaco","MD":"Chisinau","ME":"Podgorica","MK":"Skopje","MT":"Malta","NL":"Amsterdam","NO":"Oslo","PL":"Warsaw","PT":"Lisbon","RO":"Bucharest","RS":"Belgrade","RU":"Kaliningrad,Moscow,Kirov,Volgograd,Astrakhan,Saratov,Ulyanovsk,Samara","UA":"Simferopol,Kyiv","SE":"Stockholm","SI":"Ljubljana","SK":"Bratislava","SM":"San_Marino","TR":"Istanbul","VA":"Vatican"},"Asia":{"AE":"Dubai","AF":"Kabul","AM":"Yerevan","AZ":"Baku","BD":"Dhaka","BH":"Bahrain","BN":"Brunei","BT":"Thimphu","CN":"Shanghai,Urumqi","CY":"Nicosia,Famagusta","GE":"Tbilisi","HK":"Hong_Kong","ID":"Jakarta,Pontianak,Makassar,Jayapura","IL":"Jerusalem","IN":"Kolkata","IQ":"Baghdad","IR":"Tehran","JO":"Amman","JP":"Tokyo","KG":"Bishkek","KH":"Phnom_Penh","KP":"Pyongyang","KR":"Seoul","KW":"Kuwait","KZ":"Almaty,Qyzylorda,Qostanay,Aqtobe,Aqtau,Atyrau,Oral","LA":"Vientiane","LB":"Beirut","LK":"Colombo","MM":"Yangon","MN":"Ulaanbaatar,Hovd","MO":"Macau","MY":"Kuala_Lumpur,Kuching","NP":"Kathmandu","OM":"Muscat","PH":"Manila","PK":"Karachi","PS":"Gaza,Hebron","QA":"Qatar","RU":"Yekaterinburg,Omsk,Novosibirsk,Barnaul,Tomsk,Novokuznetsk,Krasnoyarsk,Irkutsk,Chita,Yakutsk,Khandyga,Vladivostok,Ust-Nera,Magadan,Sakhalin,Srednekolymsk,Kamchatka,Anadyr","SA":"Riyadh","SG":"Singapore","SY":"Damascus","TH":"Bangkok","TJ":"Dushanbe","TL":"Dili","TM":"Ashgabat","TW":"Taipei","UZ":"Samarkand,Tashkent","VN":"Ho_Chi_Minh","YE":"Aden"},"America":{"AG":"Antigua","AI":"Anguilla","AR":"Argentina/Buenos_Aires,Argentina/Cordoba,Argentina/Salta,Argentina/Jujuy,Argentina/Tucuman,Argentina/Catamarca,Argentina/La_Rioja,Argentina/San_Juan,Argentina/Mendoza,Argentina/San_Luis,Argentina/Rio_Gallegos,Argentina/Ushuaia","AW":"Aruba","BB":"Barbados","BL":"St_Barthelemy","BO":"La_Paz","BQ":"Kralendijk","BR":"Noronha,Belem,Fortaleza,Recife,Araguaina,Maceio,Bahia,Sao_Paulo,Campo_Grande,Cuiaba,Santarem,Porto_Velho,Boa_Vista,Manaus,Eirunepe,Rio_Branco","BS":"Nassau","BZ":"Belize","CA":"St_Johns,Halifax,Glace_Bay,Moncton,Goose_Bay,Blanc-Sablon,Toronto,Iqaluit,Atikokan,Winnipeg,Resolute,Rankin_Inlet,Regina,Swift_Current,Edmonton,Cambridge_Bay,Inuvik,Creston,Dawson_Creek,Fort_Nelson,Whitehorse,Dawson,Vancouver","CL":"Santiago,Coyhaique,Punta_Arenas","CO":"Bogota","CR":"Costa_Rica","CU":"Havana","CW":"Curacao","DM":"Dominica","DO":"Santo_Domingo","EC":"Guayaquil","GD":"Grenada","GF":"Cayenne","GL":"Nuuk,Danmarkshavn,Scoresbysund,Thule","GP":"Guadeloupe","GT":"Guatemala","GY":"Guyana","HN":"Tegucigalpa","HT":"Port-au-Prince","JM":"Jamaica","KN":"St_Kitts","KY":"Cayman","LC":"St_Lucia","MF":"Marigot","MQ":"Martinique","MS":"Montserrat","MX":"Mexico_City,Cancun,Merida,Monterrey,Matamoros,Chihuahua,Ciudad_Juarez,Ojinaga,Mazatlan,Bahia_Banderas,Hermosillo,Tijuana","NI":"Managua","PA":"Panama","PE":"Lima","PM":"Miquelon","PR":"Puerto_Rico","PY":"Asuncion","SR":"Paramaribo","SV":"El_Salvador","SX":"Lower_Princes","TC":"Grand_Turk","TT":"Port_of_Spain","US":"New_York,Detroit,Kentucky/Louisville,Kentucky/Monticello,Indiana/Indianapolis,Indiana/Vincennes,Indiana/Winamac,Indiana/Marengo,Indiana/Petersburg,Indiana/Vevay,Chicago,Indiana/Tell_City,Indiana/Knox,Menominee,North_Dakota/Center,North_Dakota/New_Salem,North_Dakota/Beulah,Denver,Boise,Phoenix,Los_Angeles,Anchorage,Juneau,Sitka,Metlakatla,Yakutat,Nome,Adak","UY":"Montevideo","VC":"St_Vincent","VE":"Caracas","VG":"Tortola","VI":"St_Thomas"},"Africa":{"AO":"Luanda","BF":"Ouagadougou","BI":"Bujumbura","BJ":"Porto-Novo","BW":"Gaborone","CD":"Kinshasa,Lubumbashi","CF":"Bangui","CG":"Brazzaville","CI":"Abidjan","CM":"Douala","DJ":"Djibouti","DZ":"Algiers","EG":"Cairo","EH":"El_Aaiun","ER":"Asmara","ES":"Ceuta","ET":"Addis_Ababa","GA":"Libreville","GH":"Accra","GM":"Banjul","GN":"Conakry","GQ":"Malabo","GW":"Bissau","KE":"Nairobi","LR":"Monrovia","LS":"Maseru","LY":"Tripoli","MA":"Casablanca","ML":"Bamako","MR":"Nouakchott","MW":"Blantyre","MZ":"Maputo","NA":"Windhoek","NE":"Niamey","NG":"Lagos","RW":"Kigali","SD":"Khartoum","SL":"Freetown","SN":"Dakar","SO":"Mogadishu","SS":"Juba","ST":"Sao_Tome","SZ":"Mbabane","TD":"Ndjamena","TG":"Lome","TN":"Tunis","TZ":"Dar_es_Salaam","UG":"Kampala","ZA":"Johannesburg","ZM":"Lusaka","ZW":"Harare"},"Antarctica":{"AQ":"McMurdo,Casey,Davis,DumontDUrville,Mawson,Palmer,Rothera,Syowa,Troll,Vostok","AU":"Macquarie"},"Pacific":{"AS":"Pago_Pago","CK":"Rarotonga","CL":"Easter","EC":"Galapagos","FJ":"Fiji","FM":"Chuuk,Pohnpei,Kosrae","GU":"Guam","KI":"Tarawa,Kanton,Kiritimati","MH":"Majuro,Kwajalein","MP":"Saipan","NC":"Noumea","NF":"Norfolk","NR":"Nauru","NU":"Niue","NZ":"Auckland,Chatham","PF":"Tahiti,Marquesas,Gambier","PG":"Port_Moresby,Bougainville","PN":"Pitcairn","PW":"Palau","SB":"Guadalcanal","TK":"Fakaofo","TO":"Tongatapu","TV":"Funafuti","UM":"Midway,Wake","US":"Honolulu","VU":"Efate","WF":"Wallis","WS":"Apia"},"Australia":{"AU":"Lord_Howe,Hobart,Melbourne,Sydney,Broken_Hill,Brisbane,Lindeman,Adelaide,Darwin,Perth,Eucla"},"Atlantic":{"BM":"Bermuda","CV":"Cape_Verde","ES":"Canary","FK":"Stanley","FO":"Faroe","GS":"South_Georgia","IS":"Reykjavik","PT":"Madeira,Azores","SH":"St_Helena"},"Indian":{"CC":"Cocos","CX":"Christmas","IO":"Chagos","KM":"Comoro","MG":"Antananarivo","MU":"Mauritius","MV":"Maldives","RE":"Reunion","SC":"Mahe","TF":"Kerguelen","YT":"Mayotte"},"Arctic":{"SJ":"Longyearbyen"}};

  /* legacy ids that some browsers still report */
  var ALIAS = {
    "Asia/Calcutta": "Asia/Kolkata", "Asia/Katmandu": "Asia/Kathmandu", "Asia/Saigon": "Asia/Ho_Chi_Minh",
    "Asia/Rangoon": "Asia/Yangon", "Asia/Dacca": "Asia/Dhaka", "Asia/Thimbu": "Asia/Thimphu",
    "Asia/Ujung_Pandang": "Asia/Makassar", "Asia/Ulan_Bator": "Asia/Ulaanbaatar", "Asia/Macao": "Asia/Macau",
    "Asia/Chongqing": "Asia/Shanghai", "Asia/Chungking": "Asia/Shanghai", "Asia/Harbin": "Asia/Shanghai",
    "Asia/Kashgar": "Asia/Urumqi", "Asia/Istanbul": "Europe/Istanbul", "Asia/Tel_Aviv": "Asia/Jerusalem",
    "Europe/Kiev": "Europe/Kyiv", "Europe/Belfast": "Europe/London", "Atlantic/Faeroe": "Atlantic/Faroe",
    "America/Buenos_Aires": "America/Argentina/Buenos_Aires", "America/Cordoba": "America/Argentina/Cordoba",
    "America/Indianapolis": "America/Indiana/Indianapolis", "America/Louisville": "America/Kentucky/Louisville",
    "America/Godthab": "America/Nuuk", "America/Montreal": "America/Toronto", "America/Fort_Wayne": "America/Indiana/Indianapolis",
    "Pacific/Truk": "Pacific/Chuuk", "Pacific/Ponape": "Pacific/Pohnpei", "Pacific/Samoa": "Pacific/Pago_Pago",
    "Africa/Asmera": "Africa/Asmara", "Africa/Timbuktu": "Africa/Bamako",
    "Australia/ACT": "Australia/Sydney", "Australia/NSW": "Australia/Sydney", "Australia/Canberra": "Australia/Sydney",
    "Australia/Victoria": "Australia/Melbourne", "Australia/Queensland": "Australia/Brisbane", "Australia/West": "Australia/Perth",
    "Australia/South": "Australia/Adelaide", "Australia/North": "Australia/Darwin", "Australia/Tasmania": "Australia/Hobart",
    "US/Eastern": "America/New_York", "US/Central": "America/Chicago", "US/Mountain": "America/Denver",
    "US/Pacific": "America/Los_Angeles", "US/Alaska": "America/Anchorage", "US/Hawaii": "Pacific/Honolulu", "US/Arizona": "America/Phoenix",
    "Canada/Eastern": "America/Toronto", "Canada/Central": "America/Winnipeg", "Canada/Mountain": "America/Edmonton",
    "Canada/Pacific": "America/Vancouver", "Canada/Atlantic": "America/Halifax", "Canada/Newfoundland": "America/St_Johns",
    "GB": "Europe/London"
  };

  function countryOf(tz) {
    tz = ALIAS[tz] || tz;
    var i = tz.indexOf("/");
    if (i < 1) return "";
    var group = ZONES[tz.slice(0, i)];
    if (!group) return "";
    var rest = "," + tz.slice(i + 1) + ",";
    for (var cc in group) {
      if (("," + group[cc] + ",").indexOf(rest) !== -1) return cc;
    }
    return "";
  }

  function regionName(cc) {
    try { return new Intl.DisplayNames(["en"], { type: "region" }).of(cc) || cc; } catch (e) { return cc; }
  }

  /* ---- build a clock bound to one card ---- */
  function makeClock(card, tz) {
    var tf, df;
    function build(zone) {
      var z = zone ? { timeZone: zone } : {};
      tf = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: z.timeZone });
      df = new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: z.timeZone });
    }
    try { build(tz); } catch (e) { build(""); }          // bad zone id -> device zone

    var clockEl = card.querySelector(".tz-clock");
    var ampmEl = card.querySelector(".tz-ampm");
    var dateEl = card.querySelector(".tz-date");
    var pillEl = card.querySelector(".tz-pill-text");
    var last = { clock: "", ap: "", minute: "", date: "", day: null };

    return function render(now) {
      var p = tf.formatToParts(now), h = "", m = "", s = "", ap = "";
      for (var i = 0; i < p.length; i++) {
        var t = p[i].type;
        if (t === "hour") h = p[i].value; else if (t === "minute") m = p[i].value;
        else if (t === "second") s = p[i].value; else if (t === "dayPeriod") ap = p[i].value.toUpperCase();
      }
      var clock = h + ":" + m + ":" + s;
      if (clock !== last.clock) { clockEl.textContent = clock; last.clock = clock; }
      if (ap !== last.ap) { ampmEl.textContent = ap; last.ap = ap; }

      if (m !== last.minute) {                               // date only needs a refresh once per minute
        last.minute = m;
        var d = df.formatToParts(now), wd = "", dd = "", mo = "", yr = "";
        for (var j = 0; j < d.length; j++) {
          var k = d[j].type;
          if (k === "weekday") wd = d[j].value; else if (k === "day") dd = d[j].value;
          else if (k === "month") mo = d[j].value; else if (k === "year") yr = d[j].value;
        }
        var date = wd + ", " + dd + " " + mo + " " + yr;
        if (date !== last.date) { dateEl.textContent = date; last.date = date; }
      }

      var hr = (parseInt(h, 10) % 12) + (ap === "PM" ? 12 : 0);
      var day = hr >= DAY_START && hr < DAY_END;
      if (day !== last.day) {
        last.day = day;
        card.classList.toggle("is-day", day);
        card.classList.toggle("is-night", !day);
        pillEl.textContent = day ? "Day" : "Night";
      }
    };
  }

  /* ---- visitor zone / place (no permission, no network) ---- */
  var visitorTz = "";
  try { visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}

  var hostCard = document.getElementById("tzHost");
  var visitorCard = document.getElementById("tzVisitor");
  if (!hostCard || !visitorCard) return;

  var placeText = "Your local time";
  if (visitorTz) {
    var cc = countryOf(visitorTz);
    var city = (ALIAS[visitorTz] || visitorTz).split("/").pop().replace(/_/g, " ");
    var country = cc ? regionName(cc) : "";
    if (cc && city !== country) placeText = city + ", " + country;
    else if (cc) placeText = country;
    else placeText = city;                               // e.g. "UTC"
  }
  visitorCard.querySelector(".tz-place-text").textContent = placeText;
  visitorCard.setAttribute("aria-label", "Your current local time" + (placeText !== "Your local time" ? " in " + placeText : ""));

  var renders = [];
  try {
    renders.push(makeClock(hostCard, HOST_TZ));
    renders.push(makeClock(visitorCard, visitorTz));
  } catch (e) {
    widget.hidden = true;                                // never break the form if Intl misbehaves
    return;
  }

  function tick() {
    var now = new Date();
    for (var i = 0; i < renders.length; i++) renders[i](now);
  }
  tick();

  /* ---- 1 Hz ticker, aligned to the second, paused when hidden / off-screen ---- */
  var timer = 0, running = false, inView = true;
  function loop() { tick(); timer = setTimeout(loop, 1000 - (Date.now() % 1000) + 4); }
  function sync() {
    var should = inView && !document.hidden;
    widget.classList.toggle("is-paused", !inView);
    if (should && !running) { running = true; loop(); }
    else if (!should && running) { running = false; clearTimeout(timer); }
  }
  document.addEventListener("visibilitychange", sync);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[entries.length - 1].isIntersecting;
      sync();
    }, { rootMargin: "80px 0px" }).observe(widget);
  }
  sync();

  /* ---- typewriter ---- */
  var note = document.getElementById("tzNote");
  if (!note) return;
  var on = note.querySelector(".tz-t-on"), off = note.querySelector(".tz-t-off");
  if (!on || !off) return;
  var full = off.textContent;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  note.classList.add("is-ready");
  if (reduce) { on.textContent = full; off.textContent = ""; note.classList.add("is-done"); return; }
  on.textContent = ""; 

  var MS_PER_CHAR = 24, started = false;
  function typeIt() {
    if (started) return;
    started = true;
    var t0 = 0, shown = -1;
    (function step(ts) {
      if (!t0) t0 = ts;
      var n = Math.min(full.length, Math.floor((ts - t0) / MS_PER_CHAR));
      if (n !== shown) { shown = n; on.textContent = full.slice(0, n); off.textContent = full.slice(n); }
      if (n < full.length) requestAnimationFrame(step);
      else setTimeout(function () { note.classList.add("is-done"); }, 2200);   // caret rests, then disappears
    })(performance.now());
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); typeIt(); }
    }, { threshold: 0.6 });
    io.observe(note);
  } else { typeIt(); }
})();

/* ==========================================================================
 * Login-free AI chat widget (#aiChat)
 * - 100% async/await + fetch; nothing synchronous ever waits on the network.
 * - Hard 10 s AbortController timeout on every request (covers reading the body too).
 * - Send button / chips are disabled while a request or the typing effect is running.
 * - Errors are shown inline in the chat (with a Retry button); nothing throws out of this block.
 * - Typing effect is a time-based requestAnimationFrame loop writing into ONE text node.
 * - All boxes have fixed sizes in CSS and the log scrolls internally => zero layout shift.
 * ========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("aiChat");
  if (!root) return;

  var log = document.getElementById("aiLog");
  var form = document.getElementById("aiForm");
  var input = document.getElementById("aiInput");
  var sendBtn = document.getElementById("aiSend");
  var statusEl = document.getElementById("aiStatus");
  var countEl = document.getElementById("aiCount");
  var trap = document.getElementById("aiTrap");
  var chips = Array.prototype.slice.call(root.querySelectorAll(".ai-chip"));
  if (!log || !form || !input || !sendBtn) return;

  var TIMEOUT_MS = 12000;        // client gives up after 12 s (the backend gives up on the model after 9 s, Vercel at 10 s)
  var MAX_LEN = 500;
  var MAX_HISTORY = 6;           // last 3 exchanges are sent as context

  var busy = false;
  var history = [];              // completed exchanges only: [{role, content}, ...]
  var cooldownUntil = 0;
  var cooldownTimer = 0;
  var stick = true;              // auto-scroll only while the visitor is at the bottom

  function resolveEndpoint() {
    var own = root.getAttribute("data-endpoint");
    if (own) return own;
    var contact = document.getElementById("contactForm");
    var base = contact ? contact.getAttribute("data-endpoint") || "" : "";
    return base.replace(/\/api\/contact\/?$/, "/api/ai-voice-assistant/chat");
  }
  var ENDPOINT = resolveEndpoint();

  function reduceMotion() {
    return document.documentElement.classList.contains("reduce-motion") ||
      !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* ---------------------------- small helpers ---------------------------- */
  function setStatus(text, isError) {
    statusEl.textContent = text || "";
    statusEl.classList.toggle("is-error", !!isError);
  }

  function cleanInput(value) {
    return String(value || "")
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .replace(/\r\n?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, MAX_LEN);
  }

  function updateCount() {
    countEl.textContent = input.value.length + "/" + MAX_LEN;
  }

  function nearBottom() {
    return log.scrollHeight - log.scrollTop - log.clientHeight < 48;
  }
  function scrollDown(force) {
    if (force || stick) log.scrollTop = log.scrollHeight;
  }
  log.addEventListener("scroll", function () { stick = nearBottom(); }, { passive: true });

  function refreshControls() {
    var cooling = Date.now() < cooldownUntil;
    sendBtn.disabled = busy || cooling;
    sendBtn.setAttribute("aria-busy", busy ? "true" : "false");
    chips.forEach(function (c) { c.disabled = busy || cooling; });
    root.classList.toggle("is-busy", busy);
  }

  function setBusy(state) {
    busy = state;
    refreshControls();
  }

  function startCooldown(seconds) {
    var s = Math.max(1, Math.min(600, Number(seconds) || 30));
    cooldownUntil = Date.now() + s * 1000;
    clearTimeout(cooldownTimer);
    cooldownTimer = setTimeout(function () {
      cooldownUntil = 0;
      refreshControls();
      setStatus("");
    }, s * 1000);
    refreshControls();
  }

  /* ----------------------------- DOM builders ---------------------------- */
  function addMessage(kind) {                       // kind: user | bot | err
    var wrap = document.createElement("div");
    wrap.className = "ai-msg ai-msg--" + (kind === "user" ? "user" : kind === "err" ? "bot ai-msg--err" : "bot");
    var bubble = document.createElement("div");
    bubble.className = "ai-bubble";
    wrap.appendChild(bubble);
    log.appendChild(wrap);
    return { wrap: wrap, bubble: bubble };
  }

  function addUser(text) {
    var m = addMessage("user");
    m.bubble.textContent = text;                    // textContent only: model/user text is never parsed as HTML
    scrollDown(true);
    stick = true;
    return m;
  }

  function addThinking() {
    var m = addMessage("bot");
    m.bubble.innerHTML = '<span class="ai-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="ai-sr">The assistant is typing</span>';
    scrollDown(true);
    return m;
  }

  function addError(message, retryText) {
    var m = addMessage("err");
    m.bubble.setAttribute("role", "alert");
    m.bubble.appendChild(document.createTextNode(message));
    if (retryText) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ai-retry";
      btn.textContent = "Try again";
      btn.addEventListener("click", function () {
        if (busy) return;
        if (m.wrap.parentNode) m.wrap.parentNode.removeChild(m.wrap);
        ask(retryText, true);
      });
      m.bubble.appendChild(btn);
    }
    scrollDown(true);
    return m;
  }

  /* ----------------------------- typing effect --------------------------- */
  // Time-based (not frame-based): finishes on schedule even if frames are dropped, and a
  // setTimeout fallback completes it if rAF is paused (background tab) so the UI can never stay locked.
  function typeInto(bubble, text) {
    return new Promise(function (resolve) {
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        bubble.classList.remove("is-typing");
        bubble.textContent = text;
        scrollDown();
        resolve();
      }
      if (reduceMotion() || !window.requestAnimationFrame) { finish(); return; }

      var chars = Array.from(text);                 // keeps emoji / surrogate pairs intact
      var perChar = Math.max(6, Math.min(18, 6000 / Math.max(1, chars.length)));   // long answers stay under ~6 s
      var node = document.createTextNode("");
      bubble.textContent = "";
      bubble.appendChild(node);
      bubble.classList.add("is-typing");
      var t0 = performance.now(), shown = 0;

      setTimeout(finish, chars.length * perChar + 1500);

      (function step(ts) {
        if (done) return;
        var n = Math.min(chars.length, Math.floor((ts - t0) / perChar));
        if (n !== shown) {
          shown = n;
          node.nodeValue = chars.slice(0, n).join("");
          scrollDown();
        }
        if (n < chars.length) requestAnimationFrame(step); else finish();
      })(t0);
    });
  }

  /* ------------------------------- network ------------------------------- */
  function ChatError(kind, message, retryAfter) {
    this.kind = kind;
    this.message = message;
    this.retryAfter = retryAfter;
  }

  async function requestReply(text) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
    try {
      var response;
      try {
        response = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            message: text,
            history: history.slice(-MAX_HISTORY),
            lang: "en-US"
          }),
          mode: "cors",
          credentials: "omit",
          cache: "no-store",
          signal: controller.signal
        });
      } catch (err) {
        if (err && err.name === "AbortError") throw new ChatError("timeout", "The assistant took too long to answer.");
        throw new ChatError("network", "Network error. Please check your connection.");
      }

      var data = null;
      try { data = await response.json(); }          // still covered by the abort signal
      catch (err) {
        if (err && err.name === "AbortError") throw new ChatError("timeout", "The assistant took too long to answer.");
      }

      var code = data && typeof data.code === "string" ? data.code : "";
      if (response.status === 429) {
        var rate = code === "daily_limit" || code === "quota"
          ? "The assistant has reached its limit for now. Please use the contact form above."
          : "You're sending messages too quickly. Please wait a moment.";
        throw new ChatError("rate", rate, data && data.retryAfter);
      }
      if (response.status === 422 || code === "blocked") {
        throw new ChatError("client", "I can only help with questions about Faysal's work and services.");
      }
      if (response.status === 504 || code === "timeout") {
        throw new ChatError("timeout", "The assistant took too long to answer.");
      }
      if (response.status >= 400 && response.status < 500) {
        throw new ChatError("client", code === "empty" ? "Please type a question first." : "That message could not be processed.");
      }
      if (!response.ok || !data || typeof data.reply !== "string" || !data.reply) {
        throw new ChatError("server", "The assistant is unavailable right now.");
      }
      return data.reply;
    } finally {
      clearTimeout(timer);
    }
  }

  async function ask(rawText, isRetry) {
    if (busy) return;                                // blocks double submits
    var text = cleanInput(rawText);
    if (!text) { setStatus("Please type a question first.", true); return; }
    if (Date.now() < cooldownUntil) return;

    if (trap && trap.value) { setStatus("Message blocked.", true); return; }   // honeypot filled: a bot, never sent
    setBusy(true);
    setStatus("");
    var thinking = null;
    try {
      if (!isRetry) {
        addUser(text);
        input.value = "";
        updateCount();
      }
      thinking = addThinking();

      var reply = await requestReply(text);

      thinking.bubble.innerHTML = "";               // replace the dots with the typed answer
      var srCopy = document.createElement("span");  // screen readers get the whole answer once, not letter by letter
      srCopy.className = "ai-sr";
      srCopy.textContent = reply;
      var vis = document.createElement("span");
      vis.setAttribute("aria-hidden", "true");
      thinking.bubble.appendChild(srCopy);
      thinking.bubble.appendChild(vis);
      await typeInto(vis, reply);

      history.push({ role: "user", content: text }, { role: "assistant", content: reply });
      if (history.length > 12) history = history.slice(-12);
    } catch (err) {
      if (thinking && thinking.wrap.parentNode) thinking.wrap.parentNode.removeChild(thinking.wrap);
      var kind = err && err.kind;
      var message = (err && err.kind && err.message) || "Something went wrong. Please try again.";
      if (kind === "timeout") message += " Please try again.";
      if (kind === "network") message += " Then try again.";
      if (kind === "server") message += " Please try again, or use the contact form above.";
      addError(message, kind === "client" ? "" : text);
      if (kind === "rate") {
        startCooldown(err.retryAfter);
        setStatus("Slow down a little. You can send again in a moment.", true);
      } else {
        setStatus("");
      }
    } finally {
      setBusy(false);                                // the UI is ALWAYS unlocked, whatever happened above
    }
  }

  /* -------------------------------- wiring ------------------------------- */
  input.addEventListener("input", function () {
    updateCount();
    if (statusEl.classList.contains("is-error") && Date.now() >= cooldownUntil) setStatus("");
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      ask(input.value, false);
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();                              // never fall back to a native submit
    ask(input.value, false);
  });

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () { ask(chip.getAttribute("data-q") || chip.textContent, false); });
  });

  if (!window.fetch || !window.AbortController || !ENDPOINT) {
    setStatus("Chat is unavailable right now. Please use the contact form above.", true);
    return;                                          // controls stay disabled
  }
  updateCount();
  refreshControls();
})();
