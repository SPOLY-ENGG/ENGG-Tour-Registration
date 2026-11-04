(function () {
  // Keep this in sync with app.js's own API_URL — every page calls the same
  // Apps Script Web App, but there's no shared module system here.
  var API_URL = 'https://script.google.com/macros/s/AKfycbzOmxD4-mc6ZfcQOvojFifrOhC0CfulUSYwZbsqWD2JCGI4aD9bunW0ZCf0S6Ju102GfQ/exec';

  var params = new URLSearchParams(window.location.search);
  var tourId = params.get('tour');

  var statusData = null;
  var selections = []; // [{slot}] — this page only ever books the one tourId above

  var tourTitle = document.getElementById('tourTitle');
  var tourShortDesc = document.getElementById('tourShortDesc');
  var dayBadge = document.getElementById('dayBadge');
  var statusLine = document.getElementById('statusLine');
  var slotGrid = document.getElementById('slotGrid');
  var bookingPanel = document.getElementById('bookingPanel');
  var selectionList = document.getElementById('selectionList');
  var emailInput = document.getElementById('emailInput');
  var participantsInput = document.getElementById('participantsInput');
  var participantsWarning = document.getElementById('participantsWarning');
  var submitBtn = document.getElementById('submitBtn');
  var MAX_PARTICIPANTS = 5;
  var formMsg = document.getElementById('formMsg');
  var confirmPanel = document.getElementById('confirmPanel');
  var confirmMeeting = document.getElementById('confirmMeeting');
  var confirmList = document.getElementById('confirmList');
  var newRegBtn = document.getElementById('newRegBtn');
  var slotNotice = document.getElementById('slotNotice');

  var SLOT_FULL_MESSAGE = 'Thank you for your interest! This time slot is full — please choose a different time slot, or register for a different discovery.';

  function showSlotNotice(message) {
    slotNotice.textContent = message;
    slotNotice.hidden = false;
  }

  function hideSlotNotice() {
    slotNotice.hidden = true;
  }

  function formatSlot(slot) { return slot.slice(0, 2) + ':' + slot.slice(2) + ' hrs'; }

  function apiGet(p) {
    // _ts busts any browser/CDN caching of this GET request — without it,
    // vacancy counts can appear stale right after a registration.
    var url = API_URL + '?' + Object.keys(p).map(function (k) { return k + '=' + encodeURIComponent(p[k]); }).join('&') + '&_ts=' + Date.now();
    return fetch(url, { cache: 'no-store' }).then(function (r) { return r.json(); });
  }

  function apiPost(body) {
    return fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }

  function vacancyClass(vacancy, capacity) {
    if (vacancy <= 0) return 'full';
    if (vacancy / capacity <= 0.2) return 'low';
    return '';
  }

  function currentTour() {
    return statusData.tours.find(function (t) { return t.id === tourId; });
  }

  function render() {
    var tour = currentTour();
    if (!statusData.activeDay) {
      dayBadge.textContent = 'Not open today';
      slotGrid.innerHTML = '';
      bookingPanel.hidden = true;
      statusLine.textContent = 'Discovery registration is only open on 7–9 Jan 2027. Please come back during the event.';
      return;
    }
    dayBadge.textContent = 'Day ' + statusData.activeDay;
    slotGrid.innerHTML = '';
    statusData.slots.forEach(function (slot) {
      var booked = statusData.counts[statusData.activeDay][tour.id][slot] || 0;
      var vacancy = tour.capacity - booked;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot' + (vacancy <= 0 ? ' full' : '');
      var isSelected = selections.some(function (s) { return s.slot === slot; });
      if (isSelected) btn.classList.add('selected');
      var pct = Math.max(0, Math.min(100, (booked / tour.capacity) * 100));
      btn.innerHTML =
        '<span class="time">' + formatSlot(slot) + '</span>' +
        (vacancy <= 0 ? '<span class="vacancy-text full-warning">⚠ FULL</span>' : '') +
        '<span class="bar"><span class="bar-fill ' + vacancyClass(vacancy, tour.capacity) + '" style="width:' + pct + '%"></span></span>';
      btn.addEventListener('click', function () { toggleSlot(slot); });
      slotGrid.appendChild(btn);
    });
    renderSelections();
  }

  function toggleSlot(slot) {
    var existingIdx = selections.findIndex(function (s) { return s.slot === slot; });
    if (existingIdx !== -1) {
      selections.splice(existingIdx, 1);
      hideSlotNotice();
      render();
      return;
    }
    var tour = currentTour();
    var booked = statusData.counts[statusData.activeDay][tour.id][slot] || 0;
    var vacancy = tour.capacity - booked;
    if (vacancy <= 0) {
      showSlotNotice(SLOT_FULL_MESSAGE);
      return;
    }
    hideSlotNotice();
    selections.push({ slot: slot });
    render();
  }

  function renderSelections() {
    bookingPanel.hidden = selections.length === 0;
    selectionList.innerHTML = '';
    selections.forEach(function (s, i) {
      var li = document.createElement('li');
      li.innerHTML = '<span>' + formatSlot(s.slot) + '</span>';
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.textContent = '✕';
      rm.addEventListener('click', function () { selections.splice(i, 1); render(); });
      li.appendChild(rm);
      selectionList.appendChild(li);
    });
  }

  function loadStatus() {
    statusLine.textContent = 'Loading discovery information…';
    // `page` piggybacks this page's traffic ping on the status request
    // itself, instead of a separate POST — see Code.gs's doGet() comment.
    var params = { action: 'status' };
    if (tourId) params.page = 'register-' + tourId;
    return apiGet(params).then(function (data) {
      statusData = data;
      var tour = currentTour();
      if (!tour) {
        statusLine.textContent = 'Discovery not found.';
        return;
      }
      tourTitle.textContent = tour.name;
      document.title = tour.name + ' — Engineering Open House';
      tourShortDesc.textContent = tour.shortDescription || '';
      statusLine.textContent = '';
      render();
    }).catch(function () {
      statusLine.textContent = 'Could not load discovery data. Please check your connection and refresh.';
    });
  }

  if (!tourId) {
    statusLine.textContent = 'No discovery specified. Go back and pick a discovery to register for.';
  } else {
    loadStatus();
  }

  submitBtn.addEventListener('click', function () {
    var email = emailInput.value.trim();
    var participants = Math.max(1, Number(participantsInput.value) || 1);
    if (!email) {
      formMsg.textContent = 'Please enter your email address.';
      formMsg.className = 'form-msg error';
      return;
    }
    if (participants > MAX_PARTICIPANTS) {
      participantsWarning.hidden = false;
      formMsg.textContent = 'You can only enter up to ' + MAX_PARTICIPANTS + ' participants.';
      formMsg.className = 'form-msg error';
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering…';
    apiPost({
      action: 'register',
      email: email,
      bookings: selections.map(function (s) { return { tourId: tourId, slot: s.slot, participants: participants }; }),
    }).then(function (res) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Register';
      if (!res.ok && !(res.results && res.results.some(function (r) { return r.ok; }))) {
        var firstError = res.results && res.results.length && res.results[0].error;
        formMsg.textContent = res.error || firstError || 'Registration failed — please try again.';
        formMsg.className = 'form-msg error';
        return;
      }
      var failed = (res.results || []).filter(function (r) { return !r.ok; });
      if (failed.length) {
        formMsg.textContent = 'Some picks could not be booked: ' + failed.map(function (f) { return formatSlot(f.slot) + ' (' + f.error + ')'; }).join('; ');
        formMsg.className = 'form-msg error';
      }
      showConfirmation(res, email);
      selections = [];
      loadStatus();
    }).catch(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Register';
      formMsg.textContent = 'Network error — please try again.';
      formMsg.className = 'form-msg error';
    });
  });

  function showConfirmation(res, email) {
    var confirmed = (res.results || []).filter(function (r) { return r.ok; });
    if (!confirmed.length) return;
    bookingPanel.hidden = true;
    confirmPanel.hidden = false;
    confirmMeeting.textContent = 'Day ' + res.activeDay + ' — please gather at ' + (statusData.meetingPoint || 'T1621') +
      ', ' + (statusData.gatherMinutesBefore || 5) + ' minutes before each discovery start time. Please screenshot this page as your confirmation.';
    confirmList.innerHTML = '';
    confirmed.forEach(function (c) {
      var li = document.createElement('li');
      li.textContent = c.tourName + ' — ' + formatSlot(c.slot);
      confirmList.appendChild(li);
    });
  }

  participantsInput.addEventListener('input', function () {
    participantsWarning.hidden = Number(participantsInput.value) <= MAX_PARTICIPANTS;
  });

  newRegBtn.addEventListener('click', function () {
    confirmPanel.hidden = true;
    emailInput.value = '';
    participantsInput.value = '1';
    formMsg.textContent = '';
  });
})();
