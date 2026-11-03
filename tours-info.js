(function () {
  // Keep this in sync with app.js's own API_URL.
  var API_URL = 'https://script.google.com/macros/s/AKfycbzOmxD4-mc6ZfcQOvojFifrOhC0CfulUSYwZbsqWD2JCGI4aD9bunW0ZCf0S6Ju102GfQ/exec';

  var statusLine = document.getElementById('statusLine');
  var toursRoot = document.getElementById('toursRoot');
  var editModal = document.getElementById('editModal');
  var editCancel = document.getElementById('editCancel');
  var editSave = document.getElementById('editSave');
  var editMsg = document.getElementById('editMsg');
  var fHero = document.getElementById('f-hero');
  var fVideo = document.getElementById('f-video');
  var fDetail = document.getElementById('f-detail');

  var statusData = null;

  function apiGet(params) {
    var url = API_URL + '?' + Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
    return fetch(url).then(function (r) { return r.json(); });
  }

  function apiPost(body) {
    return fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }

  function videoHtml(url) {
    if (!url) return '';
    if (/youtube\.com|youtu\.be/.test(url)) {
      var embed = url.replace('watch?v=', 'embed/');
      return '<iframe class="tour-detail-video" style="aspect-ratio:16/9" src="' + embed + '" allowfullscreen loading="lazy"></iframe>';
    }
    return '<video class="tour-detail-video" src="' + url + '" controls></video>';
  }

  function loadStatus() {
    return apiGet({ action: 'status' }).then(function (data) {
      statusData = data;
      statusLine.textContent = '';
      render();
    }).catch(function () {
      statusLine.textContent = 'Could not load tour data. Please check your connection and refresh.';
    });
  }

  function render() {
    toursRoot.innerHTML = '';
    statusData.tours.forEach(function (tour) {
      var registerUrl = 'register.html?tour=' + encodeURIComponent(tour.id);
      var card = document.createElement('section');
      card.className = 'tour-card';
      card.innerHTML =
        '<div class="top"><h2>' + tour.name + '</h2>' +
        '<button type="button" class="btn ghost edit-tour-btn" data-tour-id="' + tour.id + '">✎ Edit</button></div>' +
        (tour.heroImageUrl ? '<img class="tour-detail-hero" src="' + tour.heroImageUrl + '" alt="">' : '') +
        videoHtml(tour.videoUrl) +
        '<p class="desc">' + (tour.detailDescription || tour.shortDescription || '') + '</p>' +
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

  function openEditModal(tourId) {
    var pw = window.prompt('Enter the edit password:');
    if (pw === null) return;
    var tour = currentTour(tourId);
    editMsg.textContent = '';
    fHero.value = tour.heroImageUrl || '';
    fVideo.value = tour.videoUrl || '';
    fDetail.value = tour.detailDescription || '';
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
      videoUrl: fVideo.value,
      detailDescription: fDetail.value,
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
