const url = "https://tlmgiveaotdhhvhebwvc.supabase.co/rest/v1/?apikey=sb_publishable_MoN-CPhkCwE3L8rMBGagOw_3qhDnP6O";
fetch(url)
  .then(r => r.json())
  .then(data => {
     const table = data.definitions.mysteries.properties;
     console.log(Object.keys(table));
  })
  .catch(console.error);
