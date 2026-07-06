// Test the Claude API response for website builder
async function testClaude() {
  try {
    const response = await fetch('http://localhost:9999/.netlify/functions/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'create a simple landing page',
        browserData: { isWebBuilder: true }
      })
    });

    const data = await response.json();
    console.log('Full response:', JSON.stringify(data, null, 2));

    if (data.response) {
      console.log('\n--- Response content ---');
      console.log(data.response.substring(0, 1000));
      console.log('...\n');

      // Try to find JSON markers
      const jsonStart = data.response.indexOf('<<<JSON_START>>>');
      const jsonEnd = data.response.indexOf('<<<JSON_END>>>');

      if (jsonStart !== -1 && jsonEnd !== -1) {
        console.log('Found JSON markers!');
        const jsonStr = data.response.substring(jsonStart + 16, jsonEnd);
        console.log('JSON string length:', jsonStr.length);

        try {
          const parsed = JSON.parse(jsonStr);
          console.log('Parsed successfully!');
          console.log('Files:', parsed.files?.map(f => f.name));
        } catch (e) {
          console.log('JSON parse error:', e.message);
          console.log('First 500 chars of JSON:', jsonStr.substring(0, 500));
        }
      } else {
        console.log('No JSON markers found');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testClaude();