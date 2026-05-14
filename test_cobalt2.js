async function test() {
  try {
    const res = await fetch('https://co.wuk.sh/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    });
    const json = await res.json();
    console.log(json);
  } catch (err) {
    console.error(err);
  }
}
test();
