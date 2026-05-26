async function test() {
  const url = 'https://www.youtube.com/watch?v=y6120QOlsfU';
  console.log('Starting polling test to verify deployment is live and functioning...');
  
  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      console.log(`\n[Attempt ${attempt}/15] Sending POST request to live analyze API...`);
      const res = await fetch('https://ytdownloader-7c472.web.app/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, platform: 'youtube' })
      });
      
      console.log('Status:', res.status);
      const data = await res.json();
      
      if (res.status === 200) {
        if (data.qualities && data.qualities.length > 0) {
          console.log('🎉 SUCCESS! Video analyzed successfully on live production deployment!');
          console.log('Title:', data.title);
          console.log('Author:', data.author);
          console.log('Qualities Extracted:', data.qualities.length);
          console.log('First Quality:', data.qualities[0]);
          return;
        } else {
          console.log('Response returned 200, but qualities list is still empty (old build is still active or function is updating)...');
          console.log('Raw Data:', JSON.stringify(data));
        }
      } else {
        console.log('API returned error status:', res.status, data);
      }
    } catch (err) {
      console.log('Fetch error (deployment might be rebuilding/restarting):', err.message);
    }
    
    console.log('Waiting 20 seconds before next check...');
    await new Promise(resolve => setTimeout(resolve, 20000));
  }
  
  console.log('\n❌ Polling finished. Deployment is taking longer than expected to build. Please check Firebase console.');
}
test();
