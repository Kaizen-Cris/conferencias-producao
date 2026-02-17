'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import Menu from '../components/menu'
import { onlyDigits } from '../lib/onlyDigits'
import { useRouter } from 'next/navigation'


type ItemRow = { id: string; nome: string }

export default function Home() {
  // login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<any>(null)
  const [authMsg, setAuthMsg] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const router = useRouter()

  

  // form movimentação
  const [lote, setLote] = useState('')
  const [caixas, setCaixas] = useState('')
  const [qtdPorCaixa, setQtdPorCaixa] = useState('')
  const [unidadesAvulsas, setUnidadesAvulsas] = useState('0')

  // itens (dropdown + busca)
  const [itens, setItens] = useState<ItemRow[]>([])
  const [itemId, setItemId] = useState('')
  const [itemBusca, setItemBusca] = useState('')

  const totalUnidades = useMemo(() => {
    const c = Number(caixas || 0)
    const q = Number(qtdPorCaixa || 0)
    const a = Number(unidadesAvulsas || 0)

    const cOk = Number.isFinite(c) ? c : 0
    const qOk = Number.isFinite(q) ? q : 0
    const aOk = Number.isFinite(a) ? a : 0

    return cOk * qOk + aOk
  }, [caixas, qtdPorCaixa, unidadesAvulsas])

  // carregar sessão atual (se já estiver logado)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  // carregar itens do catálogo (quando estiver logado)
  useEffect(() => {
    async function carregarItens() {
      if (!session) return

      const { data, error } = await supabase
        .from('itens')
        .select('id,nome')
        .eq('ativo', true)
        .order('nome', { ascending: true })

      console.log('ITENS DATA:', data)
      console.log('ITENS ERROR:', error)

      setItens((data as ItemRow[]) ?? [])
    }

    carregarItens()
  }, [session])

  async function handleLogin() {
    setAuthMsg(null)

    // validações básicas
    if (!email.trim() || !password.trim()) {
      setAuthMsg('Preencha email e senha.')
      return
    }

    setAuthLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setAuthLoading(false)

    if (error) {
      const msg = (error.message || '').toLowerCase()

      // Supabase tende a não diferenciar usuário inexistente vs senha errada
      if (msg.includes('invalid login credentials')) {
        setAuthMsg('Email ou senha inválidos.')
        return
      }

      if (msg.includes('email not confirmed')) {
        setAuthMsg('Seu email ainda não foi confirmado. Verifique sua caixa de entrada.')
        return
      }

      setAuthMsg(`Erro ao entrar: ${error.message}`)
      return
    }

    // sucesso
    if (data.session) {
      setAuthMsg(null)
    }
  }

  async function handleForgot() {
    if (!email.trim()) {
      setAuthMsg('Informe seu email para receber o link.')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/resetar-senha`,
    })

    if (error) setAuthMsg(`Erro: ${error.message}`)
    else setAuthMsg('Link enviado para seu email.')
  }


  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function handleSalvarMovimentacao() {
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id

    if (!userId) {
      alert('Você precisa estar logado.')
      return
    }

    // ✅ valida item pelo catálogo
    if (!itemId) {
      alert('Selecione um item.')
      return
    }

    const itemSelecionado = itens.find((x) => x.id === itemId)
    if (!itemSelecionado) {
      alert('Item inválido. Recarregue a página e tente novamente.')
      return
    }

    // valida lote
    if (!lote.trim()) {
      alert('Preencha o lote.')
      return
    }

    if (totalUnidades <= 0) {
      alert('Informe caixas e quantidade por caixa (e/ou unidades avulsas). O total deve ser maior que zero.')
      return
    }

    // números (agora que os inputs só aceitam dígitos)
    const caixasNum = Number(caixas || 0)
    const qtdPorCaixaNum = Number(qtdPorCaixa || 0)
    const avulsasNum = Number(unidadesAvulsas || 0)

    const { data, error } = await supabase.from('movimentacoes').insert([
      {
        // ✅ salva o NOME do item (opção A)
        item: itemSelecionado.nome,
        lote: lote.trim(),
        qtd_informada: totalUnidades,
        caixas: caixasNum,
        qtd_por_caixa: qtdPorCaixaNum,
        unidades_avulsas: avulsasNum,
        status: 'PENDENTE',
        criado_por: userId,
      },
    ])

    console.log('INSERT DATA:', data)
    console.log('INSERT ERROR:', error)

    if (error) {
      alert('Erro ao salvar movimentação. Veja o console.')
      return
    }

    alert('Movimentação salva com sucesso!')

    // limpar formulário
    setItemId('')
    setItemBusca('')
    setLote('')
    setCaixas('')
    setQtdPorCaixa('')
    setUnidadesAvulsas('0')
  }

  // Se não está logado, mostra tela de login
  if (!session) {
    return (
      <div className="container">
        <div className="card">
          <h1>Login</h1>

          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: 'block', marginBottom: 10, width: '100%' }}
          />

          <input
            className="input"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: 'block', marginBottom: 10, width: '100%' }}
          />
          <div className="login-actions">
          <button className="btn" onClick={handleLogin} disabled={authLoading}>
            {authLoading ? 'Entrando...' : 'Entrar'}
          </button>

          <button
            type="button"
            className="btn-link"
            onClick={() => router.push('/esqueci-senha')}
          >
            Esqueci minha senha
          </button>
        </div>


          {authMsg && <p className="authMsg">{authMsg}</p>}


          
        </div>
      </div>
    )
  }

  // Se está logado, mostra formulário de movimentação
  const itensFiltrados = itens.filter((x) =>
    x.nome.toLowerCase().includes(itemBusca.trim().toLowerCase())
  )

  return (
    <div>
      <Menu />

      <div className="container">
        <div className="card">
          <div className="hstack" style={{ marginBottom: 12 }}>
            <h1 style={{ margin: 0 }}>Registrar Movimentação</h1>
            <button className="btn" onClick={handleLogout}>Sair</button>
          </div>

          <p style={{ marginTop: 0, color: 'var(--muted)' }}>
            Status inicial será <b>PENDENTE</b>.
          </p>

          {/* ✅ ITEM: BUSCA + SELECT */}
          <label>Item</label>

          {/* Futuramente caso tenha muitos produtos, descomentar esse input */}
         {/* <input
            className="input"
            value={itemBusca}
            onChange={(e) => setItemBusca(e.target.value)}
            placeholder="Buscar item..."
          /> */}

          <select
            className="select"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            style={{ width: '100%', marginTop: 8, marginBottom: 12 }}
          >
            <option value="">Selecione um item</option>
            {itensFiltrados.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </select>

          <label>Lote</label>
          <input
            className="input"
            value={lote}
            onChange={(e) => setLote(onlyDigits(e.target.value))}
            placeholder="Ex: 6000"
          />

          <label>Caixas</label>
          <input
            className="input"
            value={caixas}
            onChange={(e) => setCaixas(onlyDigits(e.target.value))}
            placeholder="Ex: 4"
            inputMode="numeric"
          />

          <label>Quantidade por caixa</label>
          <input
            className="input"
            value={qtdPorCaixa}
            onChange={(e) => setQtdPorCaixa(onlyDigits(e.target.value))}
            placeholder="Ex: 12"
            inputMode="numeric"
          />

          <label>Unidades avulsas (opcional)</label>
          <input
            className="input"
            value={unidadesAvulsas}
            onChange={(e) => setUnidadesAvulsas(onlyDigits(e.target.value))}
            placeholder="Ex: 3"
            inputMode="numeric"
          />

          <p style={{ marginTop: 0, color: 'var(--muted)' }}>
            <b>Total em unidades:</b> {totalUnidades}
          </p>

          <button className="btn" onClick={handleSalvarMovimentacao} style={{ width: '100%' }}>
            Salvar movimentação
          </button>
        </div>
      </div>
    </div>
  )
}
