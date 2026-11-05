(function () {
  // Keep this in sync with app.js's own API_URL.
  var API_URL = 'https://script.google.com/macros/s/AKfycbzOmxD4-mc6ZfcQOvojFifrOhC0CfulUSYwZbsqWD2JCGI4aD9bunW0ZCf0S6Ju102GfQ/exec';

  var statusLine = document.getElementById('statusLine');
  var tourIconNav = document.getElementById('tourIconNav');

  function apiGet(params) {
    // _ts busts any browser/CDN caching of this GET request.
    var url = API_URL + '?' + Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&') + '&_ts=' + Date.now();
    return fetch(url, { cache: 'no-store' }).then(function (r) { return r.json(); });
  }

  var TOUR_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="8.5" cy="9.5" r="1.5"></circle><path d="M21 16l-5.5-5.5L7 18"></path></svg>';
  var TINTS = ['tint-1', 'tint-2', 'tint-3'];

  // This page is now just a directory — each card links to that discovery's
  // own tour-detail.html page (content/edit logic lives there, see that
  // file), by request ("I would like to see EEE Discovery on a new page if
  // I press EEE... same as aero discovery").
  function render(statusData) {
    tourIconNav.innerHTML = '';
    statusData.tours.forEach(function (tour, i) {
      var link = document.createElement('a');
      link.className = 'home-card ' + TINTS[i % TINTS.length];
      link.href = 'tour-detail.html?tour=' + encodeURIComponent(tour.id);
      link.innerHTML =
        '<span class="home-card-icon">' + TOUR_ICON + '</span>' +
        '<span class="home-card-text"><h2>' + tour.name + '</h2><p>' + (tour.shortDescription || '') + '</p></span>';
      tourIconNav.appendChild(link);
    });
  }

  function loadStatus() {
    // `page` piggybacks this page's traffic ping on the status request
    // itself, instead of a separate POST — see Code.gs's doGet() comment.
    return apiGet({ action: 'status', page: 'tours-info' }).then(function (data) {
      statusLine.textContent = '';
      render(data);
    }).catch(function () {
      statusLine.textContent = 'Could not load discovery data. Please check your connection and refresh.';
    });
  }

  loadStatus();
})();
