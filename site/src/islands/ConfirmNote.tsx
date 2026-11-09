/** "We've emailed a confirmation to {0}…" under a form's success message (address kept LTR in Arabic). */
export default function ConfirmNote({ text, email }: { text: string; email: string }) {
  const [before = '', after = ''] = text.split('{0}');
  return (
    <p class="qf-done__mail" role="status">
      {before}
      <span dir="ltr" class="qf-done__addr">
        {email}
      </span>
      {after}
    </p>
  );
}
