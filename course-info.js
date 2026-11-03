(function () {
  // Keep this in sync with app.js's own API_URL.
  var API_URL = 'https://script.google.com/macros/s/AKfycbzOmxD4-mc6ZfcQOvojFifrOhC0CfulUSYwZbsqWD2JCGI4aD9bunW0ZCf0S6Ju102GfQ/exec';

  var courseTitle = document.getElementById('courseTitle');
  var statusLine = document.getElementById('statusLine');
  var courseRoot = document.getElementById('courseRoot');
  var editBtn = document.getElementById('editBtn');
  var editModal = document.getElementById('editModal');
  var editCancel = document.getElementById('editCancel');
  var editSave = document.getElementById('editSave');
  var editMsg = document.getElementById('editMsg');
  var fTitle = document.getElementById('f-title');
  var fHero = document.getElementById('f-hero');
  var fVideo = document.getElementById('f-video');
  var fBody = document.getElementById('f-body');

  var currentInfo = null;

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

  function render(info) {
    currentInfo = info;
    courseTitle.textContent = info.title || 'Course Information';
    document.title = (info.title || 'Course Information') + ' — Engineering Open House';
    courseRoot.innerHTML =
      (info.heroImageUrl ? '<img class="tour-detail-hero" src="' + info.heroImageUrl + '" alt="">' : '') +
      videoHtml(info.videoUrl) +
      '<p class="desc" style="white-space:pre-wrap; font-size:1.05rem;">' + (info.body || '') + '</p>';
  }

  apiGet({ action: 'status' }).then(function (data) {
    statusLine.textContent = '';
    render(data.courseInfo || {});
  }).catch(function () {
    statusLine.textContent = 'Could not load course information. Please check your connection and refresh.';
  });

  editBtn.addEventListener('click', function () {
    var pw = window.prompt('Enter the edit password:');
    if (pw === null) return;
    editMsg.textContent = '';
    fTitle.value = (currentInfo && currentInfo.title) || '';
    fHero.value = (currentInfo && currentInfo.heroImageUrl) || '';
    fVideo.value = (currentInfo && currentInfo.videoUrl) || '';
    fBody.value = (currentInfo && currentInfo.body) || '';
    editModal.hidden = false;
    editModal.dataset.password = pw;
  });

  editCancel.addEventListener('click', function () { editModal.hidden = true; });

  editSave.addEventListener('click', function () {
    var pw = editModal.dataset.password;
    editSave.disabled = true;
    editSave.textContent = 'Saving…';
    apiPost({
      action: 'editCourseInfo',
      password: pw,
      title: fTitle.value,
      heroImageUrl: fHero.value,
      videoUrl: fVideo.value,
      body: fBody.value,
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
      render({ title: fTitle.value, heroImageUrl: fHero.value, videoUrl: fVideo.value, body: fBody.value });
      editModal.hidden = true;
    }).catch(function () {
      editSave.disabled = false;
      editSave.textContent = 'Save changes';
      editMsg.textContent = 'Network error — please try again.';
      editMsg.className = 'form-msg error';
    });
  });
})();
