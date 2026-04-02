const url = 'https://jbrimobiliaria.com.br/wp-json/wp/v2';

async function testEndpoint(endpoint) {
  try {
    const res = await fetch(`${url}/${endpoint}?per_page=1`);
    console.log(`[TEST] GET /${endpoint} - Status: ${res.status}`);
  } catch (e) {
    console.error(`[TEST] GET /${endpoint} - Error:`, e.message);
  }
}

async function testEndpoints() {
  await testEndpoint('tax_district');
  await testEndpoint('tax_city');
  await testEndpoint('tax_state');
}

testEndpoints();
