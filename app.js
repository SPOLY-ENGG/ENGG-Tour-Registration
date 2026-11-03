(function () {
  // Paste your deployed Apps Script Web App URL here (see Code.gs header
  // comment for deployment steps). Ends in /exec.
  var API_URL = 'https://script.google.com/macros/s/AKfycbzOmxD4-mc6ZfcQOvojFifrOhC0CfulUSYwZbsqWD2JCGI4aD9bunW0ZCf0S6Ju102GfQ/exec';

  var EDIT_PASSWORD_HINT = 'Ask the tour organiser for the edit password.';
  var USER_PASSWORD_HINT = 'Ask the tour organiser for the user password.';

  var statusData = null; // last fetched /status response
  var selections = []; // [{tourId, slot}]

  var toursRoot = document.getElementById('toursRoot');
  var statusLine = document.getElementById('statusLine');
  var dayBadge = document.getElementById('dayBadge');
  var bookingPanel = document.getElementById('bookingPanel');
  var selectionList = document.getElementById('selectionList');
  var emailInput = document.getElementById('emailInput');
  var participantsInput = document.getElementById('participantsInput');
  var submitBtn = document.getElementById('submitBtn');
  var formMsg = document.getElementById('formMsg');
  var confirmPanel = document.getElementById('confirmPanel');
  var confirmMeeting = document.getElementById('confirmMeeting');
  var confirmList = document.getElementById('confirmList');
  var newRegBtn = document.getElementById('newRegBtn');

  function formatSlot(slot) { return slot.slice(0, 2) + ':' + slot.slice(2) + ' hrs'; }

  function apiGet(params) {
    var url = API_URL + '?' + Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
    return fetch(url).then(function (r) { return r.json(); });
  }

  function apiPost(body) {
    // text/plain avoids a CORS preflight against the Apps Script web app.
    return fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }

  function vacancyClass(vacancy, capacity) {
    if (vacancy <= 0) return 'full';
    if (vacancy / capacity <= 0.2) return 'low';
    return '';
  }

  function render() {
    if (!statusData) return;
    dayBadge.textContent = 'Day ' + statusData.activeDay;
    toursRoot.innerHTML = '';
    statusData.tours.forEach(function (tour) {
      var card = document.createElement('section');
      card.className = 'tour-card';
      var videoHtml = '';
      if (tour.videoUrl) {
        if (/youtube\.com|youtu\.be/.test(tour.videoUrl)) {
          var embed = tour.videoUrl.replace('watch?v=', 'embed/');
          videoHtml = '<iframe src="' + embed + '" allowfullscreen loading="lazy"></iframe>';
        } else {
          videoHtml = '<video src="' + tour.videoUrl + '" controls></video>';
        }
      }
      card.innerHTML =
        '<h2>' + tour.name + '</h2>' +
        videoHtml +
        '<p class="desc">' + (tour.description || '') + '</p>' +
        '<div class="slot-grid" data-tour="' + tour.id + '"></div>';
      toursRoot.appendChild(card);

      var grid = card.querySelector('.slot-grid');
      statusData.slots.forEach(function (slot) {
        var booked = statusData.counts[statusData.activeDay][tour.id][slot] || 0;
        var vacancy = tour.capacity - booked;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slot';
        btn.disabled = vacancy <= 0;
        var isSelected = selections.some(function (s) { return s.tourId === tour.id && s.slot === slot; });
        if (isSelected) btn.classList.add('selected');
        var pct = Math.max(0, Math.min(100, (booked / tour.capacity) * 100));
        btn.innerHTML =
          '<span class="time">' + formatSlot(slot) + '</span>' +
          '<span class="vacancy-text">' + (vacancy > 0 ? vacancy + ' vacancy left' : 'FULL') + '</span>' +
          '<span class="bar"><span class="bar-fill ' + vacancyClass(vacancy, tour.capacity) + '" style="width:' + pct + '%"></span></span>';
        btn.addEventListener('click', function () { toggleSlot(tour.id, tour.name, slot); });
        grid.appendChild(btn);
      });
    });
    renderSelections();
  }

  function toggleSlot(tourId, tourName, slot) {
    var existingIdx = selections.findIndex(function (s) { return s.tourId === tourId && s.slot === slot; });
    if (existingIdx !== -1) {
      selections.splice(existingIdx, 1);
    } else {
      var clashIdx = selections.findIndex(function (s) { return s.slot === slot; });
      if (clashIdx !== -1) {
        formMsg.textContent = 'You already picked ' + formatSlot(slot) + ' for another tour — pick a different time for this one.';
        formMsg.className = 'form-msg error';
        return;
      }
      selections.push({ tourId: tourId, tourName: tourName, slot: slot });
    }
    render();
  }

  function renderSelections() {
    bookingPanel.hidden = selections.length === 0;
    selectionList.innerHTML = '';
    selections.forEach(function (s, i) {
      var li = document.createElement('li');
      li.innerHTML = '<span>' + s.tourName + ' — ' + formatSlot(s.slot) + '</span>';
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.textContent = '✕';
      rm.addEventListener('click', function () { selections.splice(i, 1); render(); });
      li.appendChild(rm);
      selectionList.appendChild(li);
    });
  }

  function refreshStatus() {
    statusLine.textContent = 'Loading tour information…';
    return apiGet({ action: 'status' }).then(function (data) {
      statusData = data;
      statusLine.textContent = '';
      render();
    }).catch(function () {
      statusLine.textContent = 'Could not load tour data. Please check your connection and refresh.';
    });
  }

  submitBtn.addEventListener('click', function () {
    var email = emailInput.value.trim();
    var participants = Math.max(1, Number(participantsInput.value) || 1);
    if (!email) {
      formMsg.textContent = 'Please enter your email address.';
      formMsg.className = 'form-msg error';
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering…';
    apiPost({
      action: 'register',
      email: email,
      bookings: selections.map(function (s) { return { tourId: s.tourId, slot: s.slot, participants: participants }; }),
    }).then(function (res) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Register';
      if (!res.ok && !(res.results && res.results.some(function (r) { return r.ok; }))) {
        formMsg.textContent = (res.error) || 'Registration failed — please try again.';
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
      refreshStatus();
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
      ', ' + (statusData.gatherMinutesBefore || 5) + ' minutes before each tour start time. Please screenshot this page as your confirmation.';
    confirmList.innerHTML = '';
    confirmed.forEach(function (c) {
      var li = document.createElement('li');
      li.textContent = c.tourName + ' — ' + formatSlot(c.slot);
      confirmList.appendChild(li);
    });
  }

  newRegBtn.addEventListener('click', function () {
    confirmPanel.hidden = true;
    emailInput.value = '';
    participantsInput.value = '1';
    formMsg.textContent = '';
  });

  // --- Edit mode ---
  var editBtn = document.getElementById('editBtn');
  var editModal = document.getElementById('editModal');
  var editFields = document.getElementById('editFields');
  var editCancel = document.getElementById('editCancel');
  var editSave = document.getElementById('editSave');
  var editMsg = document.getElementById('editMsg');

  editBtn.addEventListener('click', function () {
    var pw = window.prompt('Enter the edit password:');
    if (pw === null) return;
    openEditModal(pw);
  });

  function openEditModal(pw) {
    editMsg.textContent = '';
    editFields.innerHTML = '';
    statusData.tours.forEach(function (tour) {
      var block = document.createElement('div');
      block.className = 'edit-tour-block';
      block.dataset.tourId = tour.id;
      block.innerHTML =
        '<div class="edit-field"><label>Name</label><input type="text" class="f-name" value="' + escapeHtml(tour.name) + '"></div>' +
        '<div class="edit-field"><label>Capacity per slot</label><input type="number" class="f-capacity" value="' + tour.capacity + '" min="1"></div>' +
        '<div class="edit-field"><label>Description</label><textarea class="f-desc">' + escapeHtml(tour.description || '') + '</textarea></div>' +
        '<div class="edit-field"><label>Video URL (YouTube or direct video link)</label><input type="text" class="f-video" value="' + escapeHtml(tour.videoUrl || '') + '"></div>';
      editFields.appendChild(block);
    });
    editModal.hidden = false;
    editModal.dataset.password = pw;
  }

  editCancel.addEventListener('click', function () { editModal.hidden = true; });

  editSave.addEventListener('click', function () {
    var pw = editModal.dataset.password;
    editSave.disabled = true;
    editSave.textContent = 'Saving…';
    var blocks = Array.prototype.slice.call(editFields.querySelectorAll('.edit-tour-block'));
    Promise.all(blocks.map(function (block) {
      return apiPost({
        action: 'editTour',
        password: pw,
        tourId: block.dataset.tourId,
        name: block.querySelector('.f-name').value,
        capacity: block.querySelector('.f-capacity').value,
        description: block.querySelector('.f-desc').value,
        videoUrl: block.querySelector('.f-video').value,
      });
    })).then(function (results) {
      editSave.disabled = false;
      editSave.textContent = 'Save changes';
      var bad = results.find(function (r) { return !r.ok; });
      if (bad) {
        editMsg.textContent = bad.error || 'Save failed.';
        editMsg.className = 'form-msg error';
        return;
      }
      editMsg.textContent = 'Saved.';
      editMsg.className = 'form-msg ok';
      refreshStatus().then(function () { editModal.hidden = true; });
    }).catch(function () {
      editSave.disabled = false;
      editSave.textContent = 'Save changes';
      editMsg.textContent = 'Network error — please try again.';
      editMsg.className = 'form-msg error';
    });
  });

  // --- User (admin) mode ---
  var userBtn = document.getElementById('userBtn');
  var userModal = document.getElementById('userModal');
  var userMsg = document.getElementById('userMsg');
  var userStatusRoot = document.getElementById('userStatusRoot');
  var setDayBtn = document.getElementById('setDayBtn');
  var userClose = document.getElementById('userClose');

  userBtn.addEventListener('click', function () {
    var pw = window.prompt('Enter the user password:');
    if (pw === null) return;
    userModal.dataset.password = pw;
    userMsg.textContent = '';
    renderUserStatus();
    userModal.hidden = false;
    var radios = userModal.querySelectorAll('input[name="dayPick"]');
    radios.forEach(function (r) { r.checked = Number(r.value) === statusData.activeDay; });
  });

  userClose.addEventListener('click', function () { userModal.hidden = true; });

  function renderUserStatus() {
    var html = '';
    [1, 2, 3].forEach(function (day) {
      html += '<h3>Day ' + day + (day === statusData.activeDay ? ' (active)' : '') + '</h3>';
      html += '<table class="status-table"><thead><tr><th>Slot</th>';
      statusData.tours.forEach(function (t) { html += '<th>' + t.name + '</th>'; });
      html += '</tr></thead><tbody>';
      statusData.slots.forEach(function (slot) {
        html += '<tr><td>' + formatSlot(slot) + '</td>';
        statusData.tours.forEach(function (t) {
          var booked = statusData.counts[day][t.id][slot] || 0;
          var vacancy = t.capacity - booked;
          var cls = vacancy <= 0 ? 'full' : (vacancy / t.capacity <= 0.2 ? 'low' : '');
          html += '<td class="' + cls + '">' + booked + '/' + t.capacity + '</td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
    });
    userStatusRoot.innerHTML = html;
  }

  setDayBtn.addEventListener('click', function () {
    var picked = userModal.querySelector('input[name="dayPick"]:checked');
    if (!picked) { userMsg.textContent = 'Pick a day first.'; userMsg.className = 'form-msg error'; return; }
    var pw = userModal.dataset.password;
    setDayBtn.disabled = true;
    apiPost({ action: 'setActiveDay', password: pw, day: picked.value }).then(function (res) {
      setDayBtn.disabled = false;
      if (!res.ok) {
        userMsg.textContent = res.error || 'Could not set active day.';
        userMsg.className = 'form-msg error';
        return;
      }
      userMsg.textContent = 'Active day set to Day ' + res.activeDay + '.';
      userMsg.className = 'form-msg ok';
      refreshStatus().then(renderUserStatus);
    }).catch(function () {
      setDayBtn.disabled = false;
      userMsg.textContent = 'Network error — please try again.';
      userMsg.className = 'form-msg error';
    });
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  refreshStatus();
})();
