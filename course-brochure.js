(function () {
  // Keep this in sync with app.js's own API_URL.
  var API_URL = 'https://script.google.com/macros/s/AKfycbzOmxD4-mc6ZfcQOvojFifrOhC0CfulUSYwZbsqWD2JCGI4aD9bunW0ZCf0S6Ju102GfQ/exec';

  var brochureTitle = document.getElementById('brochureTitle');
  var statusLine = document.getElementById('statusLine');
  var brochureRoot = document.getElementById('brochureRoot');
  var editBtn = document.getElementById('editBtn');
  var editModal = document.getElementById('editModal');
  var editCancel = document.getElementById('editCancel');
  var editSave = document.getElementById('editSave');
  var editMsg = document.getElementById('editMsg');
  var fTitle = document.getElementById('f-title');
  var fDescription = document.getElementById('f-description');
  var fPdf = document.getElementById('f-pdf');
  var fView = document.getElementById('f-view');

  var currentBrochure = null;

  function apiGet(params) {
    // _ts busts any browser/CDN caching of this GET request.
    var url = API_URL + '?' + Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&') + '&_ts=' + Date.now();
    return fetch(url, { cache: 'no-store' }).then(function (r) { return r.json(); });
  }

  function apiPost(body) {
    return fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }

  function render(brochure) {
    currentBrochure = brochure;
    brochureTitle.textContent = brochure.title || 'Course Brochure';
    document.title = (brochure.title || 'Course Brochure') + ' — Engineering Open House';
    // viewUrl drives the inline preview, pdfUrl drives the Download button —
    // these can point to different places (e.g. a Google Drive "preview"
    // link for viewing, a direct file link for downloading). Falls back to
    // pdfUrl for the preview if viewUrl isn't set, so older saved data (from
    // before viewUrl existed) still shows something.
    var viewUrl = brochure.viewUrl || brochure.pdfUrl;
    brochureRoot.innerHTML =
      '<p class="desc" style="white-space:pre-wrap; font-size:1.05rem;">' + (brochure.description || '') + '</p>' +
      (viewUrl ? '<div class="brochure-viewer"><iframe src="' + viewUrl + '" title="Course Brochure PDF" loading="lazy"></iframe></div>' : '') +
      (brochure.pdfUrl
        ? '<p><a class="btn primary" href="' + brochure.pdfUrl + '" target="_blank" rel="noopener" download>⬇ Download Brochure (PDF)</a></p>'
        : '') +
      (!viewUrl && !brochure.pdfUrl ? '<p class="muted">No brochure has been uploaded yet.</p>' : '');
  }

  // `page` piggybacks this page's traffic ping on the status request
  // itself, instead of a separate POST — see Code.gs's doGet() comment.
  apiGet({ action: 'status', page: 'course-brochure' }).then(function (data) {
    statusLine.textContent = '';
    render(data.brochure || {});
  }).catch(function () {
    statusLine.textContent = 'Could not load the brochure. Please check your connection and refresh.';
  });

  editBtn.addEventListener('click', function () {
    var pw = window.prompt('Enter the edit password:');
    if (pw === null) return;
    editMsg.textContent = '';
    fTitle.value = (currentBrochure && currentBrochure.title) || '';
    fDescription.value = (currentBrochure && currentBrochure.description) || '';
    fPdf.value = (currentBrochure && currentBrochure.pdfUrl) || '';
    fView.value = (currentBrochure && currentBrochure.viewUrl) || '';
    editModal.hidden = false;
    editModal.dataset.password = pw;
  });

  editCancel.addEventListener('click', function () { editModal.hidden = true; });

  editSave.addEventListener('click', function () {
    var pw = editModal.dataset.password;
    editSave.disabled = true;
    editSave.textContent = 'Saving…';
    apiPost({
      action: 'editBrochure',
      password: pw,
      title: fTitle.value,
      description: fDescription.value,
      pdfUrl: fPdf.value,
      viewUrl: fView.value,
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
      render({ title: fTitle.value, description: fDescription.value, pdfUrl: fPdf.value, viewUrl: fView.value });
      editModal.hidden = true;
    }).catch(function () {
      editSave.disabled = false;
      editSave.textContent = 'Save changes';
      editMsg.textContent = 'Network error — please try again.';
      editMsg.className = 'form-msg error';
    });
  });
})();
