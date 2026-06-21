const form = document.querySelector(".lead-form");
const message = document.querySelector(".form-message");
const siteHeader = document.querySelector(".site-header");
const dynamicCityEyebrow = document.querySelector("[data-dynamic-city-eyebrow]");
const dynamicCityHeading = document.querySelector("[data-dynamic-city-heading]");
const dynamicCitySubcopy = document.querySelector("[data-dynamic-city-subcopy]");

const DEFAULT_CITY = "South Florida";
const LOCATION_CACHE_KEY = "the_fridge_repair_city_v2";
const LOCATION_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const DEBUG_CITY_QUERY_PARAM = "debug_city";
const DEBUG_LAT_QUERY_PARAM = "debug_lat";
const DEBUG_LNG_QUERY_PARAM = "debug_lng";
const SOUTH_FLORIDA_BOUNDS = {
  minLat: 25.4,
  maxLat: 27.05,
  minLng: -80.65,
  maxLng: -79.9
};
const MAX_CITY_MATCH_DISTANCE_MILES = 24;

function syncHeaderShadow() {
  if (!siteHeader) return;
  siteHeader.classList.toggle("is-scrolled", window.scrollY > 4);
}

syncHeaderShadow();
window.addEventListener("scroll", syncHeaderShadow, { passive: true });

const supportedCityLookup = {
  aventura: "Aventura",
  "boca raton": "Boca Raton",
  "boynton beach": "Boynton Beach",
  "coconut creek": "Coconut Creek",
  "coral gables": "Miami",
  "coral springs": "Coral Springs",
  "dania beach": "Dania Beach",
  dania: "Dania Beach",
  "deerfield beach": "Deerfield Beach",
  "delray beach": "Delray Beach",
  "boynton beach": "Boynton Beach",
  "fort lauderdale": "Fort Lauderdale",
  "ft lauderdale": "Fort Lauderdale",
  "ft. lauderdale": "Fort Lauderdale",
  "fort lauderdale beach": "Fort Lauderdale",
  hallandale: "Hallandale Beach",
  "hallandale beach": "Hallandale Beach",
  hollywood: "Hollywood",
  "boca del mar": "Boca Del Mar",
  jupiter: "Jupiter",
  "lighthouse point": "Lighthouse Point",
  miami: "Miami",
  "miami beach": "Miami Beach",
  "mission bay": "Mission Bay",
  "north miami": "North Miami Beach",
  "north miami beach": "North Miami Beach",
  "oakland park": "Oakland Park",
  parkland: "Parkland",
  pembroke: "Pembroke Pines",
  "pembroke pines": "Pembroke Pines",
  plantation: "Plantation",
  "palm beach gardens": "Palm Beach Gardens",
  "sandalfoot cove": "Sandalfoot Cove",
  sunrise: "Sunrise",
  wellington: "Wellington",
  "west palm beach": "West Palm Beach",
  "wilton manors": "Wilton Manors",
  pompano: "Pompano Beach",
  "pompano beach": "Pompano Beach"
};

const southFloridaCities = [
  { name: "Miami", lat: 25.7617, lng: -80.1918 },
  { name: "Miami Beach", lat: 25.7907, lng: -80.13 },
  { name: "North Miami Beach", lat: 25.9331, lng: -80.1625 },
  { name: "Aventura", lat: 25.9565, lng: -80.1392 },
  { name: "Hallandale Beach", lat: 25.9812, lng: -80.1484 },
  { name: "Hollywood", lat: 26.0112, lng: -80.1495 },
  { name: "Dania Beach", lat: 26.0523, lng: -80.1439 },
  { name: "Fort Lauderdale", lat: 26.1224, lng: -80.1373 },
  { name: "Wilton Manors", lat: 26.1604, lng: -80.1389 },
  { name: "Oakland Park", lat: 26.1723, lng: -80.131 },
  { name: "Lighthouse Point", lat: 26.2756, lng: -80.0873 },
  { name: "Pompano Beach", lat: 26.2379, lng: -80.1248 },
  { name: "Deerfield Beach", lat: 26.3184, lng: -80.0998 },
  { name: "Coconut Creek", lat: 26.2517, lng: -80.1789 },
  { name: "Coral Springs", lat: 26.2712, lng: -80.2706 },
  { name: "Parkland", lat: 26.3104, lng: -80.2373 },
  { name: "Sunrise", lat: 26.1669, lng: -80.2564 },
  { name: "Plantation", lat: 26.1276, lng: -80.2331 },
  { name: "Pembroke Pines", lat: 26.0078, lng: -80.2963 },
  { name: "Boca Raton", lat: 26.3683, lng: -80.1289 },
  { name: "Boca Del Mar", lat: 26.3459, lng: -80.1598 },
  { name: "Mission Bay", lat: 26.3798, lng: -80.2262 },
  { name: "Sandalfoot Cove", lat: 26.3398, lng: -80.1862 },
  { name: "Delray Beach", lat: 26.4615, lng: -80.0728 },
  { name: "Boynton Beach", lat: 26.5318, lng: -80.0905 },
  { name: "Wellington", lat: 26.6618, lng: -80.2684 },
  { name: "West Palm Beach", lat: 26.7153, lng: -80.0534 },
  { name: "Palm Beach Gardens", lat: 26.8234, lng: -80.1387 },
  { name: "Jupiter", lat: 26.9342, lng: -80.0942 }
];

function setFormMessage(text, type = "") {
  if (!message) return;
  message.textContent = text;
  message.className = "form-message";
  if (type) {
    message.classList.add(`is-${type}`);
  }
}

function formatPhoneInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isGoogleAppsScriptEndpoint(url) {
  return /script\.google\.com|script\.googleusercontent\.com/i.test(url);
}

function normalizeCityName(city) {
  return String(city || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function getSupportedCity(city) {
  return supportedCityLookup[normalizeCityName(city)] || "";
}

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function isWithinSouthFlorida(lat, lng, region) {
  if (normalizeCityName(region) !== "florida") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  return (
    lat >= SOUTH_FLORIDA_BOUNDS.minLat &&
    lat <= SOUTH_FLORIDA_BOUNDS.maxLat &&
    lng >= SOUTH_FLORIDA_BOUNDS.minLng &&
    lng <= SOUTH_FLORIDA_BOUNDS.maxLng
  );
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function getDistanceMiles(lat1, lng1, lat2, lng2) {
  const earthRadiusMiles = 3958.8;
  const latDistance = toRadians(lat2 - lat1);
  const lngDistance = toRadians(lng2 - lng1);
  const a =
    Math.sin(latDistance / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(lngDistance / 2) ** 2;

  return 2 * earthRadiusMiles * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getNearestSouthFloridaCity(lat, lng) {
  let bestMatch = null;

  for (const city of southFloridaCities) {
    const distance = getDistanceMiles(lat, lng, city.lat, city.lng);
    if (!bestMatch || distance < bestMatch.distance) {
      bestMatch = { city: city.name, distance };
    }
  }

  if (!bestMatch || bestMatch.distance > MAX_CITY_MATCH_DISTANCE_MILES) {
    return "";
  }

  return bestMatch.city;
}

function getSupportedCityFromGeoData(data) {
  const lat = toNumber(data.latitude);
  const lng = toNumber(data.longitude);
  const region = data.region || data.region_code || data.state || "";

  if (isWithinSouthFlorida(lat, lng, region)) {
    const nearestCity = getNearestSouthFloridaCity(lat, lng);
    if (nearestCity) return nearestCity;
  }

  return getSupportedCity(data.city);
}

function getDebugHomepageCity() {
  const params = new URLSearchParams(window.location.search);
  const debugCity = getSupportedCity(params.get(DEBUG_CITY_QUERY_PARAM));
  if (debugCity) return debugCity;

  const debugLat = toNumber(params.get(DEBUG_LAT_QUERY_PARAM));
  const debugLng = toNumber(params.get(DEBUG_LNG_QUERY_PARAM));
  if (!Number.isFinite(debugLat) || !Number.isFinite(debugLng)) {
    return "";
  }

  if (!isWithinSouthFlorida(debugLat, debugLng, "Florida")) {
    return "";
  }

  return getNearestSouthFloridaCity(debugLat, debugLng);
}

function isHomepagePath() {
  const { pathname } = window.location;
  return pathname === "/" || pathname === "/index.html" || pathname === "";
}

function canUseDynamicHomepageCity() {
  if (!isHomepagePath()) return false;
  if (!dynamicCityEyebrow || !dynamicCityHeading || !dynamicCitySubcopy) return false;

  return (
    dynamicCityEyebrow.textContent.includes(DEFAULT_CITY) &&
    dynamicCityHeading.textContent.includes(DEFAULT_CITY)
  );
}

function applyHomepageCity(city) {
  const supportedCity = getSupportedCity(city);
  if (!supportedCity) return;

  dynamicCityEyebrow.textContent = `${supportedCity} Refrigerator Repair`;
  dynamicCityHeading.textContent = `${supportedCity} Licensed Refrigerator Repair - Same-Day Service Available`;
  dynamicCitySubcopy.textContent = `Same-day refrigerator repair with OEM-quality parts, licensed technicians, and guaranteed service throughout ${supportedCity}, Miami, Broward & Palm Beach.`;
}

function getCachedHomepageCity() {
  try {
    const raw = window.localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return "";

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.expiresAt < Date.now()) {
      window.localStorage.removeItem(LOCATION_CACHE_KEY);
      return "";
    }

    return getSupportedCity(parsed.city);
  } catch (error) {
    return "";
  }
}

function setCachedHomepageCity(city) {
  const supportedCity = getSupportedCity(city);
  if (!supportedCity) return;

  try {
    window.localStorage.setItem(
      LOCATION_CACHE_KEY,
      JSON.stringify({
        city: supportedCity,
        expiresAt: Date.now() + LOCATION_CACHE_TTL_MS
      })
    );
  } catch (error) {
    // Ignore storage failures and keep the default city in place.
  }
}

async function fetchHomepageCityFromIp() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 1800);

  try {
    const response = await fetch("https://get.geojs.io/v1/ip/geo.json", {
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) {
      return "";
    }

    const data = await response.json();
    return getSupportedCityFromGeoData(data);
  } catch (error) {
    return "";
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function enhanceHomepageCity() {
  if (!canUseDynamicHomepageCity()) return;

  const debugCity = getDebugHomepageCity();
  if (debugCity) {
    applyHomepageCity(debugCity);
    return;
  }

  const cachedCity = getCachedHomepageCity();
  if (cachedCity) {
    applyHomepageCity(cachedCity);
    return;
  }

  const detectedCity = await fetchHomepageCityFromIp();
  if (!detectedCity) return;

  applyHomepageCity(detectedCity);
  setCachedHomepageCity(detectedCity);
}

void enhanceHomepageCity();

document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
  link.addEventListener("click", () => {
    if (typeof window.gtag !== "function") return;

    window.gtag("event", "call_click", {
      event_category: "engagement",
      event_label: link.getAttribute("href") || "tel",
      value: 1,
      page_location: window.location.href
    });
  });
});

document.querySelectorAll('a[href^="sms:"]').forEach((link) => {
  link.addEventListener("click", () => {
    if (typeof window.gtag !== "function") return;

    window.gtag("event", "text_click", {
      event_category: "engagement",
      event_label: link.getAttribute("href") || "sms",
      value: 1,
      page_location: window.location.href
    });
  });
});

if (form) {
  const phoneInput = form.querySelector('input[name="phone"]');
  const serviceDayInput = form.querySelector('select[name="serviceDay"]');
  const serviceDateInput = form.querySelector('input[name="serviceDate"]');
  const calendarField = form.querySelector("[data-calendar-field]");

  if (serviceDateInput) {
    serviceDateInput.min = new Date().toISOString().slice(0, 10);
  }

  function syncCalendarField() {
    const needsCalendar = serviceDayInput?.value === "Calendar date";
    if (calendarField) {
      calendarField.hidden = !needsCalendar;
    }

    if (serviceDateInput) {
      serviceDateInput.required = Boolean(needsCalendar);
      if (!needsCalendar) {
        serviceDateInput.value = "";
      }
    }
  }

  syncCalendarField();

  phoneInput?.addEventListener("input", (event) => {
    event.target.value = formatPhoneInput(event.target.value);
  });

  serviceDayInput?.addEventListener("change", syncCalendarField);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFormMessage("");

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const serviceDay = String(formData.get("serviceDay") || "").trim();
    const serviceDate = String(formData.get("serviceDate") || "").trim();
    const serviceWindow = String(formData.get("serviceWindow") || "").trim();
    const issue = String(formData.get("issue") || "").trim();

    if (!name || !phone || !serviceDay || !serviceWindow || !issue) {
      setFormMessage("Please complete all fields before submitting.", "error");
      return;
    }

    if (serviceDay === "Calendar date" && !serviceDate) {
      setFormMessage("Please choose a calendar date for service.", "error");
      return;
    }

    if (phone.replace(/\D/g, "").length < 10) {
      setFormMessage("Please enter a valid mobile number.", "error");
      return;
    }

    const endpoint = form.dataset.endpoint || window.LEAD_ENDPOINT || "";
    const payload = new URLSearchParams({
      name,
      phone,
      serviceDay,
      serviceDate,
      serviceWindow,
      issue,
      page: window.location.href,
      source: "website",
      submittedAt: new Date().toISOString()
    });

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton?.setAttribute("disabled", "disabled");
    submitButton?.setAttribute("aria-busy", "true");

    try {
      if (!endpoint) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, 400);
        });
        form.reset();
        setFormMessage(
          "Thanks. Your request has been captured and the live form endpoint can be connected next.",
          "success"
        );
        return;
      }

      const requestOptions = {
        method: "POST",
        body: payload
      };

      const usesAppsScript = isGoogleAppsScriptEndpoint(endpoint);
      if (usesAppsScript) {
        requestOptions.mode = "no-cors";
      }

      const response = await fetch(endpoint, requestOptions);

      if (usesAppsScript) {
        form.reset();
        setFormMessage(
          "Thank you. Your request was sent and we will be in touch shortly.",
          "success"
        );
        return;
      }

      if (!response.ok) {
        throw new Error("Request failed");
      }

      form.reset();
      setFormMessage(
        "Thank you. We received your request and will be in touch shortly.",
        "success"
      );
    } catch (error) {
      setFormMessage(
        "Something went wrong while sending your request. Please call 645-224-9787 for the fastest response.",
        "error"
      );
    } finally {
      submitButton?.removeAttribute("disabled");
      submitButton?.removeAttribute("aria-busy");
    }
  });
}
