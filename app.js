(function () {
  // Paste your deployed Apps Script Web App URL here (see Code.gs header
  // comment for deployment steps). Ends in /exec.
  var API_URL = 'https://script.google.com/macros/s/AKfycbzOmxD4-mc6ZfcQOvojFifrOhC0CfulUSYwZbsqWD2JCGI4aD9bunW0ZCf0S6Ju102GfQ/exec';

  var statusData = null; // last fetched /status response

  var dayBadge = document.getElementById('dayBadge');

  function apiGet(params) {
    // _ts busts any browser/CDN caching of this GET request — without it, an
    // admin action (reset, edit, a new registration) can appear to have no
    // effect because the next status fetch returns a stale cached response.
    var url = API_URL + '?' + Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&') + '&_ts=' + Date.now();
    return fetch(url, { cache: 'no-store' }).then(function (r) { return r.json(); });
  }

  function apiPost(body) {
    // text/plain avoids a CORS preflight against the Apps Script web app.
    return fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }

  function formatSlot(slot) { return slot.slice(0, 2) + ':' + slot.slice(2) + ' hrs'; }

  function refreshStatus() {
    // `page` piggybacks this page's traffic ping on the status request
    // itself, instead of a separate POST — see Code.gs's doGet() comment.
    return apiGet({ action: 'status', page: 'home' }).then(function (data) {
      statusData = data;
      dayBadge.textContent = statusData.activeDayLabel || (statusData.activeDay ? 'Day ' + statusData.activeDay : 'Not open today');
      if (dayOverrideSelect) dayOverrideSelect.value = statusData.dayOverride || 'auto';
    }).catch(function () {
      dayBadge.textContent = 'Day –';
    });
  }

  // --- Edit mode (tour name/capacity/short description) — opened from
  // inside the User panel, so participants never see it. ---
  var editModal = document.getElementById('editModal');
  var editFields = document.getElementById('editFields');
  var editCancel = document.getElementById('editCancel');
  var editSave = document.getElementById('editSave');
  var editMsg = document.getElementById('editMsg');

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
        '<div class="edit-field"><label>Short description (shown on the registration page)</label><textarea class="f-desc">' + escapeHtml(tour.shortDescription || '') + '</textarea></div>';
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
        shortDescription: block.querySelector('.f-desc').value,
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
  var userClose = document.getElementById('userClose');

  userBtn.addEventListener('click', function () {
    var pw = window.prompt('Enter the user password:');
    if (pw === null) return;
    userModal.dataset.password = pw;
    userMsg.textContent = '';
    renderUserStatus();
    userModal.hidden = false;
  });

  userClose.addEventListener('click', function () { userModal.hidden = true; });

  // Day override — lets the team test registration without waiting for the
  // real 7–9 Jan 2027 dates (Day 1/2/3 force that day open, Trial opens as
  // Day 1 but labelled "Trial" so test bookings are never mistaken for real
  // ones, Not Open Today forces closed). Same edit password as the other
  // admin actions, since this controls whether real visitors can register.
  var dayOverrideSelect = document.getElementById('dayOverrideSelect');
  var setDayOverrideBtn = document.getElementById('setDayOverrideBtn');

  setDayOverrideBtn.addEventListener('click', function () {
    var pw = window.prompt('Enter the edit password:');
    if (pw === null) return;
    setDayOverrideBtn.disabled = true;
    setDayOverrideBtn.textContent = 'Setting…';
    apiPost({ action: 'setDayOverride', password: pw, value: dayOverrideSelect.value }).then(function (res) {
      setDayOverrideBtn.disabled = false;
      setDayOverrideBtn.textContent = 'Set';
      if (!res.ok) {
        userMsg.textContent = res.error || 'Could not set the registration day.';
        userMsg.className = 'form-msg error';
        return;
      }
      userMsg.textContent = 'Registration day updated.';
      userMsg.className = 'form-msg ok';
      refreshStatus().then(renderUserStatus);
    }).catch(function () {
      setDayOverrideBtn.disabled = false;
      setDayOverrideBtn.textContent = 'Set';
      userMsg.textContent = 'Network error — please try again.';
      userMsg.className = 'form-msg error';
    });
  });

  // Confirmation email template — editable the same way as tour content,
  // course info, and the brochure, stored in its own EmailTemplate sheet.
  var emailModal = document.getElementById('emailModal');
  var emailCancel = document.getElementById('emailCancel');
  var emailSave = document.getElementById('emailSave');
  var emailMsg = document.getElementById('emailMsg');
  var fEmailEnabled = document.getElementById('f-email-enabled');
  var fEmailFrom = document.getElementById('f-email-from');
  var fEmailSubject = document.getElementById('f-email-subject');
  var fEmailBody = document.getElementById('f-email-body');

  document.getElementById('openEmailBtn').addEventListener('click', function () {
    var pw = window.prompt('Enter the edit password:');
    if (pw === null) return;
    var tpl = statusData.emailTemplate || {};
    emailMsg.textContent = '';
    fEmailEnabled.checked = String(tpl.enabled) === 'true';
    fEmailFrom.value = tpl.fromAlias || '';
    fEmailSubject.value = tpl.subject || '';
    fEmailBody.value = tpl.body || '';
    emailModal.hidden = false;
    emailModal.dataset.password = pw;
  });

  emailCancel.addEventListener('click', function () { emailModal.hidden = true; });

  emailSave.addEventListener('click', function () {
    var pw = emailModal.dataset.password;
    emailSave.disabled = true;
    emailSave.textContent = 'Saving…';
    apiPost({
      action: 'editEmailTemplate',
      password: pw,
      enabled: fEmailEnabled.checked ? 'true' : 'false',
      fromAlias: fEmailFrom.value,
      subject: fEmailSubject.value,
      body: fEmailBody.value,
    }).then(function (res) {
      emailSave.disabled = false;
      emailSave.textContent = 'Save changes';
      if (!res.ok) {
        emailMsg.textContent = res.error || 'Save failed.';
        emailMsg.className = 'form-msg error';
        return;
      }
      emailMsg.textContent = 'Saved.';
      emailMsg.className = 'form-msg ok';
      refreshStatus().then(function () { emailModal.hidden = true; });
    }).catch(function () {
      emailSave.disabled = false;
      emailSave.textContent = 'Save changes';
      emailMsg.textContent = 'Network error — please try again.';
      emailMsg.className = 'form-msg error';
    });
  });

  // Edit/Download/Reset all require the separate, stricter edit password,
  // even though the viewer already unlocked the User panel with the user
  // password — a second confirmation layer for these destructive/admin
  // actions. Passwords are verified server-side only; nothing here checks
  // or stores the actual value.
  document.getElementById('openEditBtn').addEventListener('click', function () {
    var pw = window.prompt('Enter the edit password:');
    if (pw === null) return;
    openEditModal(pw);
  });

  document.getElementById('downloadBtn').addEventListener('click', function () {
    var pw = window.prompt('Enter the edit password:');
    if (pw === null) return;
    userMsg.textContent = 'Preparing download…';
    userMsg.className = 'form-msg';
    apiPost({ action: 'exportRegistrations', password: pw }).then(function (res) {
      if (!res.ok) {
        userMsg.textContent = res.error || 'Could not download registrations.';
        userMsg.className = 'form-msg error';
        return;
      }
      downloadRegistrationsCsv(res.rows);
      userMsg.textContent = 'Downloaded ' + res.rows.length + ' registration row(s).';
      userMsg.className = 'form-msg ok';
    }).catch(function () {
      userMsg.textContent = 'Network error — please try again.';
      userMsg.className = 'form-msg error';
    });
  });

  function downloadRegistrationsCsv(rows) {
    var header = ['Email', 'Date/Time of Registration', 'Day', 'Discovery', 'Time Slot', 'Participants'];
    function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
    var lines = [header.map(csvCell).join(',')];
    rows.forEach(function (r) {
      lines.push([r.email, r.timestamp, r.day, r.tourName, r.slot, r.participants].map(csvCell).join(','));
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'discovery-registrations.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  document.getElementById('resetBtn').addEventListener('click', function () {
    var pw = window.prompt('Enter the edit password:');
    if (pw === null) return;
    var sure = window.confirm('⚠ WARNING: This will permanently delete ALL registration data for every day and every tour. This cannot be undone.\n\nAre you absolutely sure you want to reset everything?');
    if (!sure) return;
    apiPost({ action: 'resetAllData', password: pw }).then(function (res) {
      if (!res.ok) {
        userMsg.textContent = res.error || 'Could not reset data.';
        userMsg.className = 'form-msg error';
        return;
      }
      userMsg.textContent = 'All registration data has been reset.';
      userMsg.className = 'form-msg ok';
      refreshStatus().then(renderUserStatus);
    }).catch(function () {
      userMsg.textContent = 'Network error — please try again.';
      userMsg.className = 'form-msg error';
    });
  });

  // Short tour names for the User panel's own tables/charts only — the
  // public pages (register.html, tours-info.html, etc.) keep the full
  // names. Falls back to the full name for any future tour id not listed.
  var SHORT_TOUR_NAMES = { eee: 'EEE', mae: 'MAE', aero: 'Aero' };
  function shortTourName(tour) {
    return SHORT_TOUR_NAMES[tour.id] || tour.name;
  }

  // Sum of visitors for one tour across every slot on a given day.
  function dayTourTotal(day, tourId) {
    var sum = 0;
    statusData.slots.forEach(function (slot) { sum += statusData.counts[day][tourId][slot] || 0; });
    return sum;
  }

  function renderUserStatus() {
    var html = '';
    [1, 2, 3].forEach(function (day) {
      html += '<h3>Day ' + day + (day === statusData.activeDay ? ' (active)' : '') + '</h3>';
      html += '<table class="status-table"><thead><tr><th>Slot</th>';
      statusData.tours.forEach(function (t) { html += '<th>' + shortTourName(t) + '</th>'; });
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
      // Total row — each tour's visitor count added up across the whole day.
      html += '<tr style="font-weight:700;"><td>Total</td>';
      statusData.tours.forEach(function (t) {
        html += '<td>' + dayTourTotal(day, t.id) + '</td>';
      });
      html += '</tr>';
      html += '</tbody></table>';
    });

    html += buildCompilationTable();

    html += '<h3 style="margin-top:28px;">Visitors per time slot</h3>';
    [1, 2, 3].forEach(function (day) {
      html += buildVisitorLineChart(day);
    });

    html += buildTrafficTable();

    userStatusRoot.innerHTML = html;
  }

  // Friendlier labels for the raw `page` tags sent by trackVisit() — falls
  // back to the raw tag itself for any page not listed (e.g. a future one).
  var PAGE_LABELS = {
    home: 'Home',
    'tours-info': 'Discovery Information',
    'tour-detail-eee': 'Discovery Info — EEE',
    'tour-detail-mae': 'Discovery Info — MAE',
    'tour-detail-aero': 'Discovery Info — Aero',
    'course-info': 'Course Information',
    'course-brochure': 'Course Brochure',
    'register-eee': 'Register — EEE',
    'register-mae': 'Register — MAE',
    'register-aero': 'Register — Aero',
  };

  // Page-visit counts, grouped by day then page, with a per-day total row —
  // same table shape as the registration-count tables above, for a quick
  // "how much traffic are we getting" read alongside "how many registered".
  function buildTrafficTable() {
    var traffic = statusData.traffic || [];
    if (!traffic.length) return '';
    var days = Array.from(new Set(traffic.map(function (t) { return t.date; }))).sort();
    var pages = Array.from(new Set(traffic.map(function (t) { return t.page; }))).sort();
    var countByDayPage = {};
    traffic.forEach(function (t) { countByDayPage[t.date + '|' + t.page] = t.count; });

    var html = '<h3 style="margin-top:28px;">Site Traffic (page visits per day)</h3>';
    html += '<table class="status-table"><thead><tr><th>Date</th>';
    pages.forEach(function (p) { html += '<th>' + (PAGE_LABELS[p] || p) + '</th>'; });
    html += '<th>Total</th></tr></thead><tbody>';
    days.forEach(function (day) {
      html += '<tr><td>' + day + '</td>';
      var dayTotal = 0;
      pages.forEach(function (p) {
        var c = countByDayPage[day + '|' + p] || 0;
        dayTotal += c;
        html += '<td>' + c + '</td>';
      });
      html += '<td style="font-weight:700;">' + dayTotal + '</td></tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  // One combined table: each tour's total across all 3 days, each day's
  // total across all tours, and the grand total of every tour on every day.
  function buildCompilationTable() {
    var html = '<h3 style="margin-top:28px;">Compilation — all 3 days</h3>';
    html += '<table class="status-table"><thead><tr><th>Day</th>';
    statusData.tours.forEach(function (t) { html += '<th>' + shortTourName(t) + '</th>'; });
    html += '<th>All Tours</th></tr></thead><tbody>';

    var tourGrandTotals = statusData.tours.map(function () { return 0; });
    var allDaysGrandTotal = 0;

    [1, 2, 3].forEach(function (day) {
      html += '<tr><td>Day ' + day + '</td>';
      var dayTotal = 0;
      statusData.tours.forEach(function (t, i) {
        var total = dayTourTotal(day, t.id);
        tourGrandTotals[i] += total;
        dayTotal += total;
        html += '<td>' + total + '</td>';
      });
      allDaysGrandTotal += dayTotal;
      html += '<td style="font-weight:700;">' + dayTotal + '</td></tr>';
    });

    html += '<tr style="font-weight:700;"><td>Total (all days)</td>';
    statusData.tours.forEach(function (t, i) { html += '<td>' + tourGrandTotals[i] + '</td>'; });
    html += '<td>' + allDaysGrandTotal + '</td></tr>';

    html += '</tbody></table>';
    return html;
  }

  // Categorical palette slots 1–3 (dark-mode steps), validated all-pairs
  // against this site's own --card navy surface via the dataviz skill's
  // validator (worst adjacent ΔE 9.4 CVD / 26.5 normal-vision, all ≥3:1
  // contrast) — one color per tour, in tour order, assigned by position
  // not cycled.
  var CHART_SERIES_COLORS = ['#3987e5', '#d95926', '#199e70'];

  function buildVisitorLineChart(day) {
    var W = 640, H = 220;
    var padL = 34, padR = 16, padT = 16, padB = 28;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var slots = statusData.slots;
    var tours = statusData.tours;

    var series = tours.map(function (t) {
      return slots.map(function (slot) { return statusData.counts[day][t.id][slot] || 0; });
    });
    var dataMax = Math.max(1, Math.max.apply(null, series.map(function (s) { return Math.max.apply(null, s); })));
    var yMax = Math.ceil(dataMax / 5) * 5 || 5;

    function xAt(i) { return padL + (slots.length === 1 ? 0 : (i / (slots.length - 1)) * plotW); }
    function yAt(v) { return padT + plotH - (v / yMax) * plotH; }

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%; height:auto; max-width:640px;" role="img" aria-label="Day ' + day + ' visitors per time slot">';

    // Gridlines + y ticks (0, 1/2, full), recessive hairlines
    [0, 0.5, 1].forEach(function (frac) {
      var y = yAt(yMax * frac);
      svg += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="var(--border)" stroke-width="1" opacity="0.5"></line>';
      svg += '<text x="' + (padL - 6) + '" y="' + (y + 3) + '" font-size="9" fill="var(--muted)" text-anchor="end">' + Math.round(yMax * frac) + '</text>';
    });

    // X ticks — every other slot, to avoid crowding 16 labels
    slots.forEach(function (slot, i) {
      if (i % 2 !== 0) return;
      svg += '<text x="' + xAt(i) + '" y="' + (H - padB + 12) + '" font-size="9" fill="var(--muted)" text-anchor="middle">' + formatSlot(slot).replace(' hrs', '') + '</text>';
    });

    // One 2px line per tour, round join/cap, in fixed categorical order
    series.forEach(function (values, si) {
      var color = CHART_SERIES_COLORS[si % CHART_SERIES_COLORS.length];
      var points = values.map(function (v, i) { return xAt(i) + ',' + yAt(v); }).join(' ');
      svg += '<polyline points="' + points + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>';
      values.forEach(function (v, i) {
        svg += '<circle cx="' + xAt(i) + '" cy="' + yAt(v) + '" r="3" fill="' + color + '" stroke="var(--card)" stroke-width="1.5">' +
          '<title>' + shortTourName(tours[si]) + ' — ' + formatSlot(slots[i]) + ': ' + v + ' visitor(s)</title></circle>';
      });
    });

    svg += '</svg>';

    var legend = '<div style="display:flex; gap:14px; flex-wrap:wrap; margin:6px 0 4px;">' +
      tours.map(function (t, i) {
        var color = CHART_SERIES_COLORS[i % CHART_SERIES_COLORS.length];
        return '<span style="display:inline-flex; align-items:center; gap:6px; font-size:0.82rem; color:var(--muted);">' +
          '<span style="width:10px; height:10px; border-radius:50%; background:' + color + '; display:inline-block;"></span>' + shortTourName(t) + '</span>';
      }).join('') + '</div>';

    return '<div style="margin-bottom:24px;"><p class="muted" style="margin:0 0 4px;">Day ' + day + '</p>' + legend + svg + '</div>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  refreshStatus();
})();
