/**
 * ICB Wayland — Site Content Configuration
 * ==========================================
 * Edit this file to update prayer times, events, Friday speakers,
 * announcements, and contact details across the entire site.
 *
 * No HTML knowledge needed — just change the values between the quotes.
 */

const ICB = {

  // ------------------------------------------------------------------
  // PRAYER TIMES (Iqamah — when congregation starts, not Adhan)
  // Update these whenever the seasonal schedule changes.
  // ------------------------------------------------------------------
  prayers: {
    fajr:    "5:30 AM",
    zuhr:    "1:30 PM",
    asr:     "5:45 PM",
    maghrib: "7:40 PM",
    isha:    "9:00 PM",
    jumuah: {
      khutbah: "1:00 PM",
      iqamah:  "1:30 PM",
    },
    sundaySchoolZuhr: "12:45 PM",    // Zuhr during Sunday School season
    lastUpdated: "April 2026",
  },

  // ------------------------------------------------------------------
  // FRIDAY SPEAKER
  // Change the name and date before each Jumu'ah.
  // ------------------------------------------------------------------
  fridaySpeaker: {
    name: "Dr. Mohamed Lazzouni",
    date: "April 24, 2026",         // Display date, e.g. "May 2, 2026"
  },

  // ------------------------------------------------------------------
  // UPCOMING EVENTS
  // Add, remove, or edit events here.
  // Each event needs: month, day, tag, title, meta, and optionally featured: true
  // ------------------------------------------------------------------
  events: [
    {
      featured: true,
      month: "May",
      day: "1",
      tag: "Community Program",
      title: "Unlocking Door to Jannah with Imam Adnan Wood-Smith",
      meta: "Thursday · 6:30 – 9:00 PM · Dinner included · Registration required",
    },
    {
      month: "May",
      day: "9",
      tag: "Charity",
      title: "First Annual Humanitarian Walk",
      meta: "Saturday · 10:00 AM · Open to all",
    },
    {
      month: "Every Fri",
      day: "★",                      // Use ★ for recurring weekly events
      tag: "Weekly · Prayer",
      title: "Jumu'ah — Friday Congregational Prayer",
      meta: "Khutbah 1:00 PM · Iqamah 1:30 PM · All welcome",
    },
  ],

  // ------------------------------------------------------------------
  // ANNOUNCEMENTS (shown as a banner on the homepage, leave blank to hide)
  // ------------------------------------------------------------------
  announcement: {
    show: false,
    text: "",
    // Example: text: "Ramadan Mubarak! Tarawih prayers begin tonight at 9:30 PM."
  },

  // ------------------------------------------------------------------
  // CONTACT & LOCATION
  // ------------------------------------------------------------------
  contact: {
    address:    "126 Boston Post Road",
    city:       "Wayland, MA 01778",
    email:      "webmaster@icbwayland.org",
    facebook:   "https://www.facebook.com/icbwayland",
    youtube:    "https://www.youtube.com/@icbwayland",
    mapsUrl:    "https://maps.google.com/?q=126+Boston+Post+Road+Wayland+MA",
  },

  // ------------------------------------------------------------------
  // DONATE LINK  (update if payment platform changes)
  // ------------------------------------------------------------------
  donateUrl: "https://icbwayland.org/donate",

};

// ------------------------------------------------------------------
// RENDERER — writes content.js values into the page automatically.
// You do not need to edit anything below this line.
// ------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {

  // Prayer bar times
  _set("[data-prayer='fajr']",    ICB.prayers.fajr);
  _set("[data-prayer='zuhr']",    ICB.prayers.zuhr);
  _set("[data-prayer='asr']",     ICB.prayers.asr);
  _set("[data-prayer='maghrib']", ICB.prayers.maghrib);
  _set("[data-prayer='isha']",    ICB.prayers.isha);
  _set("[data-prayer='jumuah']",  ICB.prayers.jumuah.iqamah);

  // Friday speaker
  _set("[data-friday='speaker']", ICB.fridaySpeaker.name);
  _set("[data-friday='date']",    ICB.fridaySpeaker.date);
  _set("[data-friday='khutbah']", ICB.prayers.jumuah.khutbah);
  _set("[data-friday='iqamah']",  ICB.prayers.jumuah.iqamah);

  // Events grid — only on pages that have [data-events-container]
  const eventsContainer = document.querySelector("[data-events-container]");
  if (eventsContainer) {
    eventsContainer.innerHTML = ICB.events.map(ev => `
      <div class="event-card${ev.featured ? " event-card--featured" : ""}">
        <div class="event-card__date">
          <span class="event-card__month">${ev.month}</span>
          <span class="event-card__day">${ev.day}</span>
        </div>
        <div class="event-card__body">
          <div class="event-card__tag">${ev.tag}</div>
          <div class="event-card__title">${ev.title}</div>
          <div class="event-card__meta">${ev.meta}</div>
        </div>
      </div>
    `).join("");
  }

  // Announcement banner
  const banner = document.querySelector("[data-announcement]");
  if (banner) {
    if (ICB.announcement.show && ICB.announcement.text) {
      banner.textContent = ICB.announcement.text;
      banner.style.display = "block";
    } else {
      banner.style.display = "none";
    }
  }

  // Donate links
  document.querySelectorAll("[data-donate-link]").forEach(el => {
    el.href = ICB.donateUrl;
  });

  // Helper
  function _set(selector, value) {
    document.querySelectorAll(selector).forEach(el => el.textContent = value);
  }

});
