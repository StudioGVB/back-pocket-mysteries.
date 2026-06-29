export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'Unknown Date';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Unknown Date';
  
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}
