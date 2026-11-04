(function () {
  // Keep this in sync with app.js's own API_URL.
  var API_URL = 'https://script.google.com/macros/s/AKfycbzOmxD4-mc6ZfcQOvojFifrOhC0CfulUSYwZbsqWD2JCGI4aD9bunW0ZCf0S6Ju102GfQ/exec';

  var statusLine = document.getElementById('statusLine');
  var tourIconNav = document.getElementById('tourIconNav');
  var toursRoot = document.getElementById('toursRoot');
  var editModal = document.getElementById('editModal');
  var editCancel = document.getElementById('editCancel');
  var editSave = document.getElementById('editSave');
  var editMsg = document.getElementById('editMsg');
  var fHero = document.getElementById('f-hero');
  var fDetail = document.getElementById('f-detail');
  var fLocation = document.getElementById('f-location');
  var fMapQuery = document.getElementById('f-map-query');
  var fActivitiesEl = document.getElementById('f-activities');
  var addActivityBtn = document.getElementById('addActivityBtn');

  var statusData = null;
  var editingActivities = []; // working copy of the open tour's activities while the modal is up

  function apiGet(params) {
    // _ts busts any browser/CDN caching of this GET request.
    var url = API_URL + '?' + Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&') + '&_ts=' + Date.now();
    return fetch(url, { cache: 'no-store' }).then(function (r) { return r.json(); });
  }

  function apiPost(body) {
    return fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }

  function loadStatus() {
    // `page` piggybacks this page's traffic ping on the status request
    // itself, instead of a separate POST — see Code.gs's doGet() comment.
    return apiGet({ action: 'status', page: 'tours-info' }).then(function (data) {
      statusData = data;
      statusLine.textContent = '';
      render();
    }).catch(function () {
      statusLine.textContent = 'Could not load tour data. Please check your connection and refresh.';
    });
  }

  var TOUR_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="8.5" cy="9.5" r="1.5"></circle><path d="M21 16l-5.5-5.5L7 18"></path></svg>';
  var TINTS = ['tint-1', 'tint-2', 'tint-3'];

  // Icons for the "What to expect" activity cards — same inline-SVG,
  // stroke-only style as TOUR_ICON/COURSE_ICON above, one per activity type.
  var ACTIVITY_ICONS = {
    robotDog:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="9" width="12" height="6" rx="2"></rect><circle cx="9" cy="7" r="1.4"></circle><path d="M18 10l3-2"></path><path d="M7 15l-1 4"></path><path d="M10 15l-1 4"></path><path d="M14 15l1 4"></path><path d="M17 15l1 4"></path></svg>',
    robotArm:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4"></path><path d="M6 20V13l6-3"></path><path d="M12 10l5 2"></path><path d="M17 12l2 3-2 2"></path><circle cx="6" cy="20" r="1.3"></circle></svg>',
    lift:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="1.5"></rect><path d="M11 8l1.5-2 1.5 2"></path><path d="M11 16l1.5 2 1.5-2"></path></svg>',
    trophy:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v4a4 4 0 0 1-8 0V4z"></path><path d="M8 5H5a3 3 0 0 0 3 4"></path><path d="M16 5h3a3 3 0 0 1-3 4"></path><path d="M12 12v4"></path><path d="M9 20h6"></path><path d="M10 16h4l1 4H9l1-4z"></path></svg>',
    gift:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="9" width="16" height="11" rx="1"></rect><path d="M4 13h16"></path><path d="M12 9v11"></path><path d="M12 9c-1.5-4-6-4-6-1.5S9 9 12 9z"></path><path d="M12 9c1.5-4 6-4 6-1.5S15 9 12 9z"></path></svg>',
    jet:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 14l9-2 2-7 2 .5-1 6.5 7 1v2l-7 1 1 6.5-2 .5-2-7-9-2v-2z"></path></svg>',
    vr:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="11" rx="4"></rect><circle cx="8" cy="12.5" r="1.6"></circle><circle cx="16" cy="12.5" r="1.6"></circle><path d="M10.5 12.5h3"></path></svg>',
    drone:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="5" r="2"></circle><circle cx="19" cy="5" r="2"></circle><circle cx="5" cy="19" r="2"></circle><circle cx="19" cy="19" r="2"></circle><path d="M7 6.5L10 10"></path><path d="M17 6.5L14 10"></path><path d="M7 17.5L10 14"></path><path d="M17 17.5L14 14"></path><rect x="9" y="9" width="6" height="6" rx="1.5"></rect></svg>',
    star:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.5 6 .7-4.4 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.4 9.2l6-.7z"></path></svg>',
  };

  var ICON_OPTIONS = ['robotDog', 'robotArm', 'lift', 'trophy', 'gift', 'jet', 'vr', 'drone', 'star'];
  var ICON_LABELS = {
    robotDog: 'Robot dog', robotArm: 'Robot arm', lift: 'Lift / elevator',
    trophy: 'Trophy / showcase', gift: 'Gift / souvenir', jet: 'Aircraft',
    vr: 'VR headset', drone: 'Drone', star: 'Star (generic)',
  };

  // Default "what to expect" content for the venue-hosted tours, used only
  // until the backend has its own saved location/activities for that tour
  // (older Tours-sheet rows predating this feature read back as empty) — see
  // highlightsHtml()'s fallback below. Once a tour is saved via the Edit
  // modal, its own location/activities (from the server) take over.
  // Placeholder photos (Picsum, free to hotlink, same convention the tour
  // hero images use elsewhere in this file) — a stand-in until real photos
  // of each activity are available; swap the `img` URL for a real one
  // per activity whenever you have it, via the Edit modal.
  var DEFAULT_HIGHLIGHTS = {
    eee: {
      location: 'T12101A-D',
      mapQuery: 'SP T12',
      activities: [],
    },
    mae: {
      location: 'Advance Manufacturing Centre W1314',
      mapQuery: 'W13',
      activities: [
        { icon: 'robotDog', img: 'https://picsum.photos/seed/mae-robot-dog/240/240', title: 'Hands-on Activity: Robot Dog', desc: 'Take the controls of a quadruped robot dog and see legged robotics in action.' },
        { icon: 'robotArm', img: 'https://picsum.photos/seed/mae-robot-arm/240/240', title: 'Hands-on Activity: Robot Arm', desc: 'Get behind the controls of an industrial robot arm and try a pick-and-place task yourself.' },
        { icon: 'lift', img: 'https://picsum.photos/seed/mae-lift-project/240/240', title: 'Project: Lift Concept', desc: 'See a student-built lift system in action, demonstrating mechanical design and control concepts.' },
        { icon: 'trophy', img: 'https://picsum.photos/seed/mae-project-showcase/240/240', title: 'Student Project Showcase', desc: 'Browse a showcase of final-year student projects across mechanical, mechatronics, and robotics engineering.' },
        { icon: 'gift', img: 'https://picsum.photos/seed/mae-door-gift/240/240', title: 'Souvenir', desc: 'Take home a souvenir to remember the day — while stocks last!' },
      ],
    },
    aero: {
      location: 'T18A212',
      mapQuery: 'SP Aerohub',
      activities: [
        { icon: 'jet', img: 'https://picsum.photos/seed/aero-aircraft-showcase/240/240', title: 'Aircraft & Flight Simulation Showcase', desc: 'See RSAF and commercial aircraft and helicopters up close, plus a live flight simulation showcase.' },
        { icon: 'vr', img: 'https://picsum.photos/seed/aero-vr-showcase/240/240', title: 'VR Project Showcase', desc: 'Experience student-built virtual reality projects exploring aerospace engineering concepts.' },
        { icon: 'drone', img: 'https://picsum.photos/seed/aero-drone-flying/240/240', title: 'Hands-on Activity: Drone Obstacle Flying', desc: 'Take the controls and fly a drone through an obstacle course.' },
        { icon: 'gift', img: 'https://picsum.photos/seed/aero-door-gift/240/240', title: 'Souvenir', desc: 'Take home a souvenir to remember the day — while stocks last!' },
      ],
    },
  };

  function tourLocation(tour) {
    return tour.location || (DEFAULT_HIGHLIGHTS[tour.id] && DEFAULT_HIGHLIGHTS[tour.id].location) || '';
  }

  // The Google Maps search term can differ from the displayed location text
  // (e.g. location shows a room number like "T18A212", but the map should
  // search for the building's common name, "SP Aerohub") — falls back to
  // the location text itself if no separate map query is set.
  function tourMapQuery(tour) {
    return tour.mapQuery || (DEFAULT_HIGHLIGHTS[tour.id] && DEFAULT_HIGHLIGHTS[tour.id].mapQuery) || tourLocation(tour);
  }

  function tourActivities(tour) {
    if (tour.activities && tour.activities.length) return tour.activities;
    return (DEFAULT_HIGHLIGHTS[tour.id] && DEFAULT_HIGHLIGHTS[tour.id].activities) || [];
  }

  function mapUrl(query) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  }

  function highlightsHtml(tour) {
    var location = tourLocation(tour);
    var activities = tourActivities(tour);
    var locationHtml = location
      ? '<p class="highlight-location"><a href="' + mapUrl(tourMapQuery(tour)) + '" target="_blank" rel="noopener">📍 ' + location + ' — view on Google Maps</a></p>'
      : '';
    if (!activities.length) return locationHtml;
    var cards = activities.map(function (a) {
      return '<div class="highlight-card">' +
        '<span class="highlight-media">' +
        '<img src="' + a.img + '" alt="" loading="lazy">' +
        '<span class="highlight-icon">' + (ACTIVITY_ICONS[a.icon] || ACTIVITY_ICONS.star) + '</span>' +
        '</span>' +
        '<span class="highlight-card-text">' +
        '<h3>' + a.title + '</h3>' +
        '<p>' + a.desc + '</p>' +
        '</span>' +
        '</div>';
    }).join('');
    return locationHtml +
      '<h3 class="highlight-heading">What to expect</h3>' +
      '<div class="highlight-grid">' + cards + '</div>';
  }

  function renderIconNav() {
    tourIconNav.innerHTML = '';
    statusData.tours.forEach(function (tour, i) {
      var tile = document.createElement('div');
      tile.className = 'home-card ' + TINTS[i % TINTS.length];
      tile.innerHTML =
        '<a class="home-card-link" href="#tour-' + tour.id + '">' +
        '<span class="home-card-icon">' + TOUR_ICON + '</span>' +
        '<span class="home-card-text"><h2>' + tour.name + '</h2></span>' +
        '</a>' +
        '<button type="button" class="btn ghost home-card-edit" data-tour-id="' + tour.id + '" title="Edit ' + tour.name + '">✎</button>';
      tourIconNav.appendChild(tile);
    });

    tourIconNav.querySelectorAll('.home-card-edit').forEach(function (btn) {
      btn.addEventListener('click', function (evt) {
        evt.preventDefault();
        openEditModal(btn.dataset.tourId);
      });
    });
  }

  function render() {
    renderIconNav();

    toursRoot.innerHTML = '';
    statusData.tours.forEach(function (tour) {
      var registerUrl = 'register.html?tour=' + encodeURIComponent(tour.id);
      var card = document.createElement('section');
      card.className = 'tour-card';
      card.id = 'tour-' + tour.id;
      card.innerHTML =
        '<div class="top"><h2>' + tour.name + '</h2>' +
        '<button type="button" class="btn ghost edit-tour-btn" data-tour-id="' + tour.id + '">✎ Edit</button></div>' +
        (tour.heroImageUrl ? '<img class="tour-detail-hero" src="' + tour.heroImageUrl + '" alt="">' : '') +
        '<p class="desc">' + (tour.detailDescription || tour.shortDescription || '') + '</p>' +
        highlightsHtml(tour) +
        '<p><a class="more-link" href="' + registerUrl + '">Register for this tour →</a></p>';
      toursRoot.appendChild(card);
    });

    toursRoot.querySelectorAll('.edit-tour-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { openEditModal(btn.dataset.tourId); });
    });
  }

  function currentTour(tourId) {
    return statusData.tours.find(function (t) { return t.id === tourId; });
  }

  function renderActivityRows() {
    fActivitiesEl.innerHTML = '';
    editingActivities.forEach(function (a, i) {
      var row = document.createElement('div');
      row.className = 'activity-row';
      row.innerHTML =
        '<div class="activity-row-top">' +
        '<select class="act-icon">' + ICON_OPTIONS.map(function (k) {
          return '<option value="' + k + '"' + (k === a.icon ? ' selected' : '') + '>' + ICON_LABELS[k] + '</option>';
        }).join('') + '</select>' +
        '<button type="button" class="btn ghost act-remove">✕ Remove</button>' +
        '</div>' +
        '<input type="text" class="act-img" placeholder="Picture URL">' +
        '<input type="text" class="act-title" placeholder="Title">' +
        '<textarea class="act-desc" placeholder="Description"></textarea>';
      row.querySelector('.act-img').value = a.img || '';
      row.querySelector('.act-title').value = a.title || '';
      row.querySelector('.act-desc').value = a.desc || '';
      row.querySelector('.act-icon').addEventListener('change', function () { editingActivities[i].icon = this.value; });
      row.querySelector('.act-img').addEventListener('input', function () { editingActivities[i].img = this.value; });
      row.querySelector('.act-title').addEventListener('input', function () { editingActivities[i].title = this.value; });
      row.querySelector('.act-desc').addEventListener('input', function () { editingActivities[i].desc = this.value; });
      row.querySelector('.act-remove').addEventListener('click', function () {
        editingActivities.splice(i, 1);
        renderActivityRows();
      });
      fActivitiesEl.appendChild(row);
    });
  }

  addActivityBtn.addEventListener('click', function () {
    editingActivities.push({ icon: 'star', img: '', title: '', desc: '' });
    renderActivityRows();
  });

  function openEditModal(tourId) {
    var pw = window.prompt('Enter the edit password:');
    if (pw === null) return;
    var tour = currentTour(tourId);
    editMsg.textContent = '';
    fHero.value = tour.heroImageUrl || '';
    fDetail.value = tour.detailDescription || '';
    fLocation.value = tourLocation(tour);
    fMapQuery.value = tour.mapQuery || (DEFAULT_HIGHLIGHTS[tourId] && DEFAULT_HIGHLIGHTS[tourId].mapQuery) || '';
    editingActivities = tourActivities(tour).map(function (a) {
      return { icon: a.icon || 'star', img: a.img || '', title: a.title || '', desc: a.desc || '' };
    });
    renderActivityRows();
    editModal.hidden = false;
    editModal.dataset.password = pw;
    editModal.dataset.tourId = tourId;
  }

  editCancel.addEventListener('click', function () { editModal.hidden = true; });

  editSave.addEventListener('click', function () {
    var pw = editModal.dataset.password;
    var tourId = editModal.dataset.tourId;
    editSave.disabled = true;
    editSave.textContent = 'Saving…';
    apiPost({
      action: 'editTour',
      password: pw,
      tourId: tourId,
      heroImageUrl: fHero.value,
      detailDescription: fDetail.value,
      location: fLocation.value,
      mapQuery: fMapQuery.value,
      activities: editingActivities,
    }).then(function (res) {
      editSave.disabled = false;
      editSave.textContent = 'Save changes';
      if (!res.ok) {
        editMsg.textContent = res.error || 'Save failed.';
        editMsg.className = 'form-msg error';
        return;
      }
      editMsg.textContent = 'Saved.';
      editMsg.className = 'form-msg ok';
      loadStatus().then(function () { editModal.hidden = true; });
    }).catch(function () {
      editSave.disabled = false;
      editSave.textContent = 'Save changes';
      editMsg.textContent = 'Network error — please try again.';
      editMsg.className = 'form-msg error';
    });
  });

  loadStatus();
})();
