import { redirect } from 'next/navigation';
import { Locale } from '@/lib/i18n-config';

export const unstable_instant = false;

export default async function CreateWizardPage(props: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await props.params;
  redirect(`/${locale}/login`);
}
