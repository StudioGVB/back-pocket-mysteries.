import { ResponseCookies } from 'next/dist/server/web/spec-extension/cookies';

const cookies = new ResponseCookies(new Headers());
cookies.set('test', 'value', { expires: new Date(Date.now() + 100000), maxAge: 10 });
console.log(cookies.getAll());
