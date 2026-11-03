(function () {
  // Keep this in sync with app.js's own API_URL — both files call the same
  // Apps Script Web App, but there's no shared module system here.
  var API_URL = 'https://script.google.com/macros/s/AKfycbzOmxD4-mc6ZfcQOvojFifrOhC0CfulUSYwZbsqWD2JCGI4aD9bunW0ZCf0S6Ju102GfQ/exec';

  var ADMIN_EDIT_PASSWORD_HINT = 'Ask the tour organiser for the edit password.';

  var params = new URLSearchParams(window.location.search);
  var tourId = params.get('id');

  var tourTitle = document.getElementById('tourTitle');
  var statusLine = document.getElementById('statusLine');
  var tourDetailRoot = document.getElementById('tourDetailRoot');
  var editBtn = document.getElementById('editBtn');
  var editModal = document.getElementById('editModal');
  var editCancel = document.getElementById('editCancel');
  var editSave = document.getElementById('editSave');
  var editMsg = document.getElementById('editMsg');
  var fHero = document.getElementById('f-hero');
  var fVideo = document.getElementById('f-video');
  var fDetail = document.getElementById('f-detail');

  var currentTour = null;

  function apiGet(params2) {
    var url = API_URL + '?' + Object.keys(params2).map(function (k) { return k + '=' + encodeURIComponent(params2[k]); }).join('&');
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

  function render(tour) {
    currentTour = tour;
    tourTitle.textContent = tour.name;
    document.title = tour.name + ' — Engineering Open House';
    tourDetailRoot.innerHTML =
      (tour.heroImageUrl ? '<img class="tour-detail-hero" src="' + tour.heroImageUrl + '" alt="">' : '') +
      videoHtml(tour.videoUrl) +
      '<p class="desc" style="white-space:pre-wrap; font-size:1.05rem;">' + (tour.detailDescription || tour.shortDescription || '') + '</p>';
  }

  if (!tourId) {
    statusLine.textContent = 'No tour specified. Go back and click a tour title.';
  } else {
    apiGet({ action: 'status' }).then(function (data) {
      var tour = data.tours.find(function (t) { return t.id === tourId; });
      if (!tour) {
        statusLine.textContent = 'Tour not found.';
        return;
      }
      render(tour);
    }).catch(function () {
      statusLine.textContent = 'Could not load tour data. Please check your connection and refresh.';
    });
  }

  editBtn.addEventListener('click', function () {
    var pw = window.prompt('Enter the edit password:');
    if (pw === null) return;
    if (!currentTour) return;
    editMsg.textContent = '';
    fHero.value = currentTour.heroImageUrl || '';
    fVideo.value = currentTour.videoUrl || '';
    fDetail.value = currentTour.detailDescription || '';
    editModal.hidden = false;
    editModal.dataset.password = pw;
  });

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
      render({
        id: tourId,
        name: currentTour.name,
        shortDescription: currentTour.shortDescription,
        heroImageUrl: fHero.value,
        videoUrl: fVideo.value,
        detailDescription: fDetail.value,
      });
      editModal.hidden = true;
    }).catch(function () {
      editSave.disabled = false;
      editSave.textContent = 'Save changes';
      editMsg.textContent = 'Network error — please try again.';
      editMsg.className = 'form-msg error';
    });
  });
})();
