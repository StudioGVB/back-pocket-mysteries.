const fd = new FormData();
fd.append('remember', 'on');
console.log(fd.get('remember') === 'on');
