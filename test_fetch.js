const url = "https://tlmgiveaotdhhvhebwvc.supabase.co/rest/v1/mysteries?id=eq.4b18b04c-3131-4a6b-9e36-a45cdc846769&select=id,created_by&apikey=sb_publishable_MoN-CPhkCwE3L8rMBGagOw_3qhDnP6O";
fetch(url)
  .then(r => r.json())
  .then(data => {
     console.log("Mystery Data:", data);
  })
  .catch(console.error);
