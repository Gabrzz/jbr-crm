async function getTaxes() {
  const url = 'https://jbrimobiliaria.com.br/wp-json/wp/v2/taxonomies';
  const res = await fetch(url);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
getTaxes();
