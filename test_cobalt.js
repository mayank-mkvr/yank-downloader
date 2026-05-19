async function test() {
  const instances = [
    'https://cobalt.api.ryzetech.live/',
    'https://co.wuk.sh/',
    'https://cobalt.instavids.workers.dev/'
  ];
  for (const url of instances) {
    try {
      console.log('Testing:', url);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        body: JSON.stringify({
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          videoQuality: '720'
        })
      });
      const text = await res.text();
      console.log(url, 'Response:', text);
    } catch (err) {
      console.error(url, 'Error:', err.message);
    }
  }
}
test();
