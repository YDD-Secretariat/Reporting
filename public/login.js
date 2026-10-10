(async () => {
  const message = document.getElementById('message');
  try {
    const response = await fetch('/api/reporting?action=config', { cache: 'no-store' });
    const config = await response.json();
    if (!response.ok) throw new Error(config.error);
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Google sign-in could not load. Check your connection.'));
      document.head.append(s);
    });
    google.accounts.id.initialize({
      client_id: config.clientId,
      nonce: config.nonce,
      callback: async ({ credential }) => {
        message.textContent = 'Checking your access…';
        try {
          const response = await fetch('/api/reporting?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential })
          });
          const data = await response.json();
          if (!response.ok) {
            if (data.email) {
              const account = document.getElementById('account');
              if (account) {
                account.style.display = 'block';
                account.textContent =
                  'Your Google email is not on the enabled Users list.\n' +
                  'Send this email to the secretariat to be enrolled:\n' +
                  data.email +
                  (data.accountId ? '\n(Optional lock ID: ' + data.accountId + ')' : '');
              }
            }
            throw new Error(data.error);
          }
          sessionStorage.removeItem('mancomReport');
          sessionStorage.removeItem('mancomMode');
          location.replace('/');
        } catch (e) {
          message.textContent = e.message;
        }
      }
    });
    google.accounts.id.renderButton(document.getElementById('google-button'), {
      theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill'
    });
    message.textContent = 'Access is controlled by the secretariat Users list (email + Active).';
  } catch (e) {
    message.textContent = e.message;
  }
})();
