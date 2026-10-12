/* Small compatibility shims, loaded BEFORE the authentication library. */
(function () {
  if (typeof window.globalThis === 'undefined') window.globalThis = window;
  if (typeof window.self === 'undefined') window.self = window;
  if (!String.prototype.padStart) {
    String.prototype.padStart = function (length, fill) {
      var text = String(this), padding = fill === undefined ? ' ' : String(fill);
      length = Number(length) || 0;
      if (!padding || text.length >= length) return text;
      var needed = length - text.length;
      while (padding.length < needed) padding += padding;
      return padding.slice(0, needed) + text;
    };
  }
  if (typeof Promise !== 'undefined' && !Promise.prototype.finally) {
    Promise.prototype.finally = function (callback) {
      if (typeof callback !== 'function') return this.then(callback, callback);
      var Constructor = this.constructor || Promise;
      return this.then(function (value) {
        return Constructor.resolve(callback()).then(function () { return value; });
      }, function (error) {
        return Constructor.resolve(callback()).then(function () { throw error; });
      });
    };
  }
  window.PORTAL_LOAD_ERRORS = [];
  window.addEventListener('error', function (event) {
    var source = event.target && event.target.src;
    if (source) {
      window.PORTAL_LOAD_ERRORS.push('Could not load ' + source.split('/').pop());
    } else if (event.message) {
      window.PORTAL_LOAD_ERRORS.push(event.message);
    }
  }, true);
}());
