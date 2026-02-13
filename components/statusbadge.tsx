export default function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase()

  // mapear para as classes do CSS
  let cls = 'badge'
  if (s === 'pendente') cls += ' pendente'
  else if (s === 'reconferir') cls += ' reconferir'
  else if (s === 'divergente') cls += ' divergente'
  else if (s === 'aprovado') cls += ' aprovado'

  return <span className={cls}>{status}</span>
}
