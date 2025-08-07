// Fallback Sumsub SDK Mock
// This is used when the real SDK cannot be loaded from CDN

console.log('Loading fallback Sumsub SDK mock...');

window.snsWebSdk = {
  init: function(token, refreshCallback) {
    console.log('Initializing fallback SDK with token:', token ? 'present' : 'missing');
    
    return {
      withConf: function(config) {
        console.log('withConf called with:', config);
        return this;
      },
      withOptions: function(options) {
        console.log('withOptions called with:', options);
        return this;
      },
      on: function(event, callback) {
        console.log('on called with event:', event);
        return this;
      },
      onMessage: function(callback) {
        console.log('onMessage called');
        return this;
      },
      build: function() {
        return {
          launch: function(selector) {
            const element = document.querySelector(selector);
            if (element) {
              element.innerHTML = `
                <div style="padding: 30px; border: 2px solid #e74c3c; border-radius: 8px; background: #fdf2f2; color: #c0392b;">
                  <h3 style="margin-top: 0; color: #e74c3c;">⚠️ Sumsub SDK Unavailable</h3>
                  <p><strong>Issue:</strong> The Sumsub SDK could not be loaded from their CDN.</p>
                  <p><strong>Possible causes:</strong></p>
                  <ul>
                    <li>Network firewall blocking external resources</li>
                    <li>Corporate network restrictions</li>
                    <li>Sumsub CDN temporarily unavailable</li>
                    <li>Geographic restrictions</li>
                  </ul>
                  <p><strong>Solutions:</strong></p>
                  <ul>
                    <li>Check your network connection</li>
                    <li>Try using a different network (mobile hotspot)</li>
                    <li>Contact your IT department about firewall rules</li>
                    <li>Wait and try again later</li>
                  </ul>
                  <div style="margin-top: 20px; padding: 15px; background: #ecf0f1; border-radius: 4px;">
                    <strong>Debug Info:</strong><br>
                    Token: ${token ? '✅ Present' : '❌ Missing'}<br>
                    Refresh Callback: ${refreshCallback ? '✅ Available' : '❌ Missing'}<br>
                    SDK Version: 2.0 (Fallback Mock)
                  </div>
                </div>
              `;
            }
          }
        };
      }
    };
  }
};

console.log('Fallback SDK 2.0 mock loaded successfully'); 