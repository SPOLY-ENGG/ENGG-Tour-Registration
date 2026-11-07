(function () {
  // Keep this in sync with app.js's own API_URL.
  var API_URL = 'https://script.google.com/macros/s/AKfycbzOmxD4-mc6ZfcQOvojFifrOhC0CfulUSYwZbsqWD2JCGI4aD9bunW0ZCf0S6Ju102GfQ/exec';

  var params = new URLSearchParams(window.location.search);
  var tourId = params.get('tour');

  var pageTitle = document.getElementById('pageTitle');
  var tourTitle = document.getElementById('tourTitle');
  var tourShortDesc = document.getElementById('tourShortDesc');
  var statusLine = document.getElementById('statusLine');
  var tourRoot = document.getElementById('tourRoot');
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
  var editingActivities = []; // working copy of this tour's activities while the modal is up

  function apiGet(p) {
    // _ts busts any browser/CDN caching of this GET request.
    var url = API_URL + '?' + Object.keys(p).map(function (k) { return k + '=' + encodeURIComponent(p[k]); }).join('&') + '&_ts=' + Date.now();
    return fetch(url, { cache: 'no-store' }).then(function (r) { return r.json(); });
  }

  function apiPost(body) {
    return fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }

  // Icons for the "What to expect" activity cards — same inline-SVG,
  // stroke-only style used elsewhere on the site, one per activity type.
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
    diploma:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l10-5 10 5-10 5-10-5z"></path><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"></path><path d="M22 9v6"></path></svg>',
  };

  var ICON_OPTIONS = ['robotDog', 'robotArm', 'lift', 'trophy', 'gift', 'jet', 'vr', 'drone', 'star', 'diploma'];
  var ICON_LABELS = {
    robotDog: 'Robot dog', robotArm: 'Robot arm', lift: 'Lift / elevator',
    trophy: 'Trophy / showcase', gift: 'Gift / souvenir', jet: 'Aircraft',
    vr: 'VR headset', drone: 'Drone', star: 'Star (generic)', diploma: 'Diploma / course',
  };

  // Default "what to expect" content for the venue-hosted tours, used only
  // until the backend has its own saved location/activities for that tour
  // (older Tours-sheet rows predating this feature read back as empty) — see
  // highlightsHtml()'s fallback below. Once a tour is saved via the Edit
  // modal, its own location/activities (from the server) take over.
  var DEFAULT_HIGHLIGHTS = {
    eee: {
      location: 'T12101A-D',
      mapQuery: 'SP T12',
      activities: [
        { icon: 'diploma', img: 'https://spoly-engg.github.io/ENGG-Tour-Registration/dase-discovery.png', title: 'Diploma in Aerospace Electronics (DASE) Discovery', desc: 'Learn about the Diploma in Aerospace Electronics (DASE) — covering avionics, aircraft electrical systems, and aerospace electronic instrumentation.' },
        { icon: 'diploma', img: 'https://spoly-engg.github.io/ENGG-Tour-Registration/dcpe-discovery.jpg', title: 'Diploma in Computer Engineering (DCPE) Discovery', desc: 'Learn about the Diploma in Computer Engineering (DCPE) — covering embedded systems, software development, and computer hardware design.' },
        { icon: 'diploma', img: 'https://spoly-engg.github.io/ENGG-Tour-Registration/deb-discovery.png', title: 'Diploma in Engineering with Business (DEB) Discovery', desc: 'Learn about the Diploma in Engineering with Business (DEB) — combining core engineering fundamentals with business and management skills.' },
        { icon: 'diploma', img: 'https://spoly-engg.github.io/ENGG-Tour-Registration/deee-discovery.png', title: 'Diploma in Electrical and Electronic Engineering (DEEE) Discovery', desc: 'Learn about the Diploma in Electrical and Electronic Engineering (DEEE) — covering circuit design, power systems, and electronic systems.' },
        { icon: 'drone', img: 'https://spoly-engg.github.io/ENGG-Tour-Registration/drone-soccer.png', title: 'Hands-on Activity: Drone Soccer', desc: 'Join a drone soccer match and see competitive drone flying in action.' },
        { icon: 'vr', img: 'https://spoly-engg.github.io/ENGG-Tour-Registration/vr-flight-sim.png', title: 'Hands-on Activity: VR Flight Simulator', desc: 'Step into a VR flight simulator and experience what it\'s like to pilot an aircraft.' },
      ],
    },
    mae: {
      location: 'Advance Manufacturing Centre W1314',
      mapQuery: 'W13',
      activities: [
        { icon: 'diploma', img: 'https://spoly-engg.github.io/ENGG-Tour-Registration/dme-discovery.png', title: 'Diploma in Mechanical Engineering (DME) Discovery', desc: 'Learn about the Diploma in Mechanical Engineering (DME) — covering mechanical design, manufacturing, and engineering systems.' },
        { icon: 'diploma', img: 'https://spoly-engg.github.io/ENGG-Tour-Registration/dmro-discovery.png', title: 'Diploma in Mechatronics & Robotics (DMRO) Discovery', desc: 'Learn about the Diploma in Mechatronics & Robotics (DMRO) — combining mechanical, electrical, and software engineering for robotics and automation.' },
        { icon: 'lift', img: 'https://spoly-engg.github.io/ENGG-Tour-Registration/elevator-training.png', title: 'Project: Elevator Concept', desc: 'See a student-built elevator system in action, demonstrating mechanical design and control concepts.' },
        { icon: 'trophy', img: 'https://spoly-engg.github.io/ENGG-Tour-Registration/robot-ai.png', title: 'Student Project Showcase', desc: 'Browse a showcase of final-year student projects across mechanical, mechatronics, and robotics engineering.' },
        { icon: 'robotDog', img: 'https://spoly-engg.github.io/ENGG-Tour-Registration/robot-dog.png', title: 'Hands-on Activity: Robot Dog', desc: 'Take the controls of a quadruped robot dog and see legged robotics in action.' },
        { icon: 'robotArm', img: 'https://spoly-engg.github.io/ENGG-Tour-Registration/robot-arm.png', title: 'Hands-on Activity: Robot Arm', desc: 'Get behind the controls of an industrial robot arm and try a pick-and-place task yourself.' },
        { icon: 'gift', img: '', title: 'Souvenir', desc: 'Take home a souvenir to remember the day — while stocks last!' },
      ],
    },
    aero: {
      location: 'T18A212',
      mapQuery: 'SP Aerohub',
      activities: [
        { icon: 'diploma', img: 'https://spoly-engg.github.io/ENGG-Tour-Registration/dase-discovery.png', title: 'Diploma in Aerospace Electronics (DASE) Discovery', desc: 'Learn about the Diploma in Aerospace Electronics (DASE) — covering avionics, aircraft electrical systems, and aerospace electronic instrumentation.' },
        { icon: 'diploma', img: 'https://spoly-engg.github.io/ENGG-Tour-Registration/dare-discovery.jpg', title: 'Diploma in Aeronautical Engineering (DARE) Discovery', desc: 'Learn about the Diploma in Aeronautical Engineering (DARE) — covering aircraft maintenance, aerodynamics, and aviation systems.' },
        { icon: 'jet', img: '', title: 'Aircraft Hangar', desc: 'Walk through the hangar and see RSAF and commercial aircraft and helicopters up close.' },
        { icon: 'jet', img: 'https://spoly-engg.github.io/ENGG-Tour-Registration/flight-sim.png', title: 'Flight Simulation Showcase', desc: 'Catch a live flight simulation showcase in action.' },
        { icon: 'vr', img: '', title: 'VR Project Showcase', desc: 'Experience student-built virtual reality projects exploring aerospace engineering concepts.' },
        { icon: 'drone', img: 'https://spoly-engg.github.io/ENGG-Tour-Registration/drone-obstacle.png', title: 'Hands-on Activity: Drone Obstacle Flying', desc: 'Take the controls and fly a drone through an obstacle course.' },
        { icon: 'gift', img: '', title: 'Souvenir', desc: 'Take home a souvenir to remember the day — while stocks last!' },
      ],
    },
  };

  function currentTour() {
    return statusData.tours.find(function (t) { return t.id === tourId; });
  }

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
    // Title only, no description — the picture carries the content, the
    // heading overlays its bottom edge as a caption (by request: "the
    // heading on top of the picture while no explanation is needed").
    // Activities without a picture (e.g. Souvenir) skip the image block
    // entirely and show the title on its own, icon inline beside it.
    var cards = activities.map(function (a) {
      var iconHtml = ACTIVITY_ICONS[a.icon] || ACTIVITY_ICONS.star;
      var media = a.img
        ? '<span class="highlight-media">' +
          '<img src="' + a.img + '" alt="" loading="lazy">' +
          '<span class="highlight-caption">' + a.title + '</span>' +
          '<span class="highlight-icon">' + iconHtml + '</span>' +
          '</span>'
        : '';
      var inlineIcon = a.img ? '' : '<span class="highlight-icon-inline">' + iconHtml + '</span>';
      return '<div class="highlight-card' + (a.img ? '' : ' no-media') + '">' +
        media +
        (a.img ? '' : '<span class="highlight-card-text"><h3>' + inlineIcon + a.title + '</h3></span>') +
        '</div>';
    }).join('');
    return locationHtml +
      '<h3 class="highlight-heading">What to expect</h3>' +
      '<div class="highlight-grid">' + cards + '</div>';
  }

  function render() {
    var tour = currentTour();
    // "Register for this discovery" link hidden by request (registration
    // isn't launching yet — same reasoning as the homepage's register
    // tiles, which are commented out in index.html rather than deleted).
    // Kept here, just not rendered, so it's a one-line restore later:
    // var registerUrl = 'register.html?tour=' + encodeURIComponent(tour.id);
    tourRoot.className = 'tour-card';
    tourRoot.innerHTML =
      '<div class="top"><h2>' + tour.name + '</h2>' +
      '<button type="button" class="btn ghost" id="editTourBtn">✎ Edit</button></div>' +
      (tour.heroImageUrl ? '<img class="tour-detail-hero" src="' + tour.heroImageUrl + '" alt="">' : '') +
      '<p class="desc">' + (tour.detailDescription || tour.shortDescription || '') + '</p>' +
      highlightsHtml(tour);
    document.getElementById('editTourBtn').addEventListener('click', function () { openEditModal(); });
  }

  function loadStatus() {
    // `page` piggybacks this page's traffic ping on the status request
    // itself, instead of a separate POST — see Code.gs's doGet() comment.
    var p = { action: 'status' };
    if (tourId) p.page = 'tour-detail-' + tourId;
    return apiGet(p).then(function (data) {
      statusData = data;
      var tour = currentTour();
      if (!tour) {
        statusLine.textContent = 'Discovery not found.';
        return;
      }
      tourTitle.textContent = tour.name;
      pageTitle.textContent = tour.name + ' — Engineering Open House';
      document.title = pageTitle.textContent;
      tourShortDesc.textContent = tour.shortDescription || '';
      statusLine.textContent = '';
      render();
    }).catch(function () {
      statusLine.textContent = 'Could not load discovery data. Please check your connection and refresh.';
    });
  }

  function renderActivityRows() {
    fActivitiesEl.innerHTML = '';
    editingActivities.forEach(function (a, i) {
      var row = document.createElement('div');
      row.className = 'activity-row';
      row.innerHTML =
        '<div class="activity-row-top">' +
        '<span class="act-reorder">' +
        '<button type="button" class="btn ghost act-up" title="Move up"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="btn ghost act-down" title="Move down"' + (i === editingActivities.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '</span>' +
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
      row.querySelector('.act-up').addEventListener('click', function () {
        if (i === 0) return;
        var tmp = editingActivities[i - 1];
        editingActivities[i - 1] = editingActivities[i];
        editingActivities[i] = tmp;
        renderActivityRows();
      });
      row.querySelector('.act-down').addEventListener('click', function () {
        if (i === editingActivities.length - 1) return;
        var tmp = editingActivities[i + 1];
        editingActivities[i + 1] = editingActivities[i];
        editingActivities[i] = tmp;
        renderActivityRows();
      });
      fActivitiesEl.appendChild(row);
    });
  }

  addActivityBtn.addEventListener('click', function () {
    editingActivities.push({ icon: 'star', img: '', title: '', desc: '' });
    renderActivityRows();
  });

  function openEditModal() {
    var pw = window.prompt('Enter the edit password:');
    if (pw === null) return;
    var tour = currentTour();
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
  }

  editCancel.addEventListener('click', function () { editModal.hidden = true; });

  editSave.addEventListener('click', function () {
    var pw = editModal.dataset.password;
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

  if (!tourId) {
    statusLine.textContent = 'No discovery specified. Go back and pick a discovery.';
  } else {
    loadStatus();
  }
})();
