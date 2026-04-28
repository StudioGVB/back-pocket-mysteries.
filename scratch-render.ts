import { render } from '@react-email/components';
import AccountConfirmationEmail from './src/emails/AccountConfirmationEmail';
import * as fs from 'fs';

async function main() {
  const html = await render(AccountConfirmationEmail());
  fs.writeFileSync('account-email.html', html);
  console.log('Saved to account-email.html');
}
main();
