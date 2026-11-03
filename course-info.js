(function () {
  // Keep this in sync with app.js's own API_URL.
  var API_URL = 'https://script.google.com/macros/s/AKfycbzOmxD4-mc6ZfcQOvojFifrOhC0CfulUSYwZbsqWD2JCGI4aD9bunW0ZCf0S6Ju102GfQ/exec';

  var courseTitle = document.getElementById('courseTitle');
  var statusLine = document.getElementById('statusLine');
  var courseRoot = document.getElementById('courseRoot');
  var courseIconNav = document.getElementById('courseIconNav');
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

  // The 8 SP School of Engineering full-time diplomas — full name and
  // course code confirmed directly from each course's own sp.edu.sg page
  // title, listed in alphabetical order by full name. Each tile links out
  // (new tab) to that course's own official sp.edu.sg landing page, using
  // the current "courses/schools/<cluster>/<slug>" URL structure — the
  // older "engineering-cluster/.../full-time-diplomas/..." paths used here
  // previously were broken (that structure appears to be deprecated/
  // inconsistent site-wide), confirmed one by one via fresh searches.
  var COURSE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l10-5 10 5-10 5-10-5z"></path><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"></path><path d="M22 9v6"></path></svg>';
  var TINTS = ['tint-1', 'tint-2', 'tint-3'];
  var COURSES = [
    { name: 'Common Engineering Programme', code: 'CEP', courseCode: 'S40', url: 'https://www.sp.edu.sg/courses/schools/mae/common-engineering-programme' },
    { name: 'Diploma in Aeronautical Engineering', code: 'DARE', courseCode: 'S88', url: 'https://www.sp.edu.sg/courses/schools/mae/aeronautical-engineering' },
    { name: 'Diploma in Aerospace Electronics', code: 'DASE', courseCode: 'S90', url: 'https://www.sp.edu.sg/courses/schools/eee/aerospace-electronics' },
    { name: 'Diploma in Computer Engineering', code: 'DCPE', courseCode: 'S53', url: 'https://www.sp.edu.sg/courses/schools/eee/computer-engineering' },
    { name: 'Diploma in Electrical & Electronic Engineering', code: 'DEEE', courseCode: 'S99', url: 'https://www.sp.edu.sg/courses/schools/eee/electrical-electronic-engineering' },
    { name: 'Diploma in Engineering with Business', code: 'DEB', courseCode: 'S42', url: 'https://www.sp.edu.sg/courses/schools/eee/engineering-with-business' },
    { name: 'Diploma in Mechanical Engineering', code: 'DME', courseCode: 'S91', url: 'https://www.sp.edu.sg/courses/schools/mae/mechanical-engineering' },
    { name: 'Diploma in Mechatronics & Robotics', code: 'DMRO', courseCode: 'S73', url: 'https://www.sp.edu.sg/courses/schools/mae/mechatronics-and-robotics' },
  ];

  COURSES.forEach(function (course, i) {
    var tile = document.createElement('a');
    tile.className = 'home-card ' + TINTS[i % TINTS.length];
    tile.href = course.url;
    tile.target = '_blank';
    tile.rel = 'noopener';
    tile.innerHTML =
      '<span class="home-card-icon">' + COURSE_ICON + '</span>' +
      '<span class="home-card-text">' +
      '<h2>' + course.name + '</h2>' +
      '<p>' + course.code + ' &middot; ' + course.courseCode + '</p>' +
      '</span>';
    courseIconNav.appendChild(tile);
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
