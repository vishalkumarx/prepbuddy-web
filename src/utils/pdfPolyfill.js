// Polyfill Uint8Array.prototype.toHex and Uint8Array.fromHex for mobile browsers (iOS Safari, mobile Chrome/Android webview)
if (typeof Uint8Array !== 'undefined') {
  if (!Uint8Array.prototype.toHex) {
    Uint8Array.prototype.toHex = function () {
      return Array.from(this).map(b => b.toString(16).padStart(2, '0')).join('');
    };
  }
  if (!Uint8Array.fromHex) {
    Uint8Array.fromHex = function (hex) {
      const cleanHex = (hex || '').replace(/\s+/g, '');
      const bytes = new Uint8Array(Math.floor(cleanHex.length / 2));
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
      }
      return bytes;
    };
  }
}
