(function () {
  // Keep this in sync with app.js's own API_URL.
  var API_URL = 'https://script.google.com/macros/s/AKfycbzOmxD4-mc6ZfcQOvojFifrOhC0CfulUSYwZbsqWD2JCGI4aD9bunW0ZCf0S6Ju102GfQ/exec';

  var statusLine = document.getElementById('statusLine');
  var toursRoot = document.getElementById('toursRoot');

  function apiGet(params) {
    var url = API_URL + '?' + Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
    return fetch(url).then(function (r) { return r.json(); });
  }

  apiGet({ action: 'status' }).then(function (data) {
    statusLine.textContent = '';
    toursRoot.innerHTML = '';
    data.tours.forEach(function (tour) {
      var tourUrl = 'tour.html?id=' + encodeURIComponent(tour.id);
      var registerUrl = 'register.html?tour=' + encodeURIComponent(tour.id);
      var card = document.createElement('section');
      card.className = 'tour-card';
      var thumbHtml = tour.heroImageUrl
        ? '<a href="' + tourUrl + '"><img class="tour-card-thumb" src="' + tour.heroImageUrl + '" alt=""></a>'
        : '';
      card.innerHTML =
        '<h2><a href="' + tourUrl + '">' + tour.name + '</a></h2>' +
        thumbHtml +
        '<p class="desc">' + (tour.shortDescription || '') + '</p>' +
        '<p><a class="more-link" href="' + tourUrl + '">Full details, photos &amp; video →</a> &nbsp; ' +
        '<a class="more-link" href="' + registerUrl + '">Register for this tour →</a></p>';
      toursRoot.appendChild(card);
    });
  }).catch(function () {
    statusLine.textContent = 'Could not load tour data. Please check your connection and refresh.';
  });
})();
