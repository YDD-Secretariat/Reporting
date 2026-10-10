(async()=>{
  const message=document.getElementById('message');
  try {
    const response=await fetch('/api/reporting?action=config',{cache:'no-store'}),config=await response.json();
    if(!response.ok)throw new Error(config.error);
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=resolve;s.onerror=()=>reject(new Error('Google sign-in could not load. Check your connection.'));document.head.append(s);});
    google.accounts.id.initialize({client_id:config.clientId,nonce:config.nonce,callback:async({credential})=>{
      message.textContent='Checking your access…';
      try {
        const response=await fetch('/api/reporting?action=login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential})});
        const data=await response.json();
        if(!response.ok){if(data.accountId){const account=document.getElementById('account');account.style.display='block';account.textContent='Send these enrolment details to your administrator:\nEmail: '+data.email+'\nGoogle Subject: '+data.accountId;}throw new Error(data.error);}
        sessionStorage.removeItem('mancomReport');location.replace('/');
      }catch(e){message.textContent=e.message;}
    }});
    google.accounts.id.renderButton(document.getElementById('google-button'),{theme:'outline',size:'large',text:'signin_with',shape:'pill'});
    message.textContent='Your access is set by the secretariat.';
  }catch(e){message.textContent=e.message;}
})();
