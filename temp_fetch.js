fetch('https://jbrimobiliaria.com.br/wp-json/wp/v2/properties?per_page=1', {
  headers: {
    'Authorization': 'Basic ' + Buffer.from('admin:K0jP bvG8 Nagy 7g49 9cgp X96X').toString('base64')
  }
})
.then(res => res.json())
.then(data => {
  console.log(JSON.stringify(data[0], null, 2));
})
.catch(console.error);
