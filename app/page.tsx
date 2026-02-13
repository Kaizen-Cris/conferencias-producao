'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Menu from '../components/menu'


export default function Home() {
  // login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState(null)

  // form movimentação
  const [item, setItem] = useState('')
  const [lote, setLote] = useState('')
  const [caixas, setCaixas] = useState('')
  const [qtdPorCaixa, setQtdPorCaixa] = useState('')
  const [unidadesAvulsas, setUnidadesAvulsas] = useState('0')

  const caixasInt = parseInt(caixas || '0', 10)
  const qtdPorCaixaInt = parseInt(qtdPorCaixa || '0', 10)
  const unidadesAvulsasInt = parseInt(unidadesAvulsas || '0', 10)

  const totalUnidades =
    (Number.isNaN(caixasInt) ? 0 : caixasInt) *
      (Number.isNaN(qtdPorCaixaInt) ? 0 : qtdPorCaixaInt) +
    (Number.isNaN(unidadesAvulsasInt) ? 0 : unidadesAvulsasInt)


  // carrega sessão atual (se já estiver logado)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  async function handleLogin() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('LOGIN DATA:', data)
    console.log('LOGIN ERROR:', error)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function handleSalvarMovimentacao() {
    // 1) pegar usuário logado
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id

    if (!userId) {
      alert('Você precisa estar logado.')
      return
    }

    // 2) validar campos
    if (!item || !lote) {
      alert('Preencha item e lote.')
      return
    }

    if (totalUnidades <= 0) {
      alert('Informe caixas e quantidade por caixa (e/ou unidades avulsas). O total deve ser maior que zero.')
      return
    }

    // 3) inserir no banco
    const { data, error } = await supabase.from('movimentacoes').insert([
      {
      item,
      lote,
      qtd_informada: totalUnidades,
      caixas: caixasInt,
      qtd_por_caixa: qtdPorCaixaInt,
      unidades_avulsas: unidadesAvulsasInt,
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

    // 4) limpar formulário
    setItem('')
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
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: 'block', marginBottom: 10, width: '100%' }}
          />

          <button className="btn" onClick={handleLogin} style={{ width: '100%' }}>
            Entrar
          </button>
        </div>
      </div>
    )
  }

  // Se está logado, mostra formulário de movimentação
  return (

    <div>
      <Menu /> 
        <div className="container">
          <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h1>Registrar Movimentação</h1>
          </div>

          <p style={{ marginTop: 0, opacity: 0.7 }}>
            Status inicial será <b>PENDENTE</b>.
          </p>

          <label>Item</label>
          <input
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="Ex: Item X"
            style={{ display: 'block', marginBottom: 10, width: '100%' }}
          />

          <label>Lote</label>
          <input
            value={lote}
            onChange={(e) => setLote(e.target.value)}
            placeholder="Ex: Lote Y"
            style={{ display: 'block', marginBottom: 10, width: '100%' }}
          />

          <label>Caixas</label>
          <input
            value={caixas}
            onChange={(e) => setCaixas(e.target.value)}
            placeholder="Ex: 4"
            inputMode="numeric"
            style={{ display: 'block', marginBottom: 10, width: '100%' }}
          />

          <label>Quantidade por caixa</label>
          <input
            value={qtdPorCaixa}
            onChange={(e) => setQtdPorCaixa(e.target.value)}
            placeholder="Ex: 12"
            inputMode="numeric"
            style={{ display: 'block', marginBottom: 10, width: '100%' }}
          />

          <label>Unidades avulsas (opcional)</label>
          <input
            value={unidadesAvulsas}
            onChange={(e) => setUnidadesAvulsas(e.target.value)}
            placeholder="Ex: 3"
            inputMode="numeric"
            style={{ display: 'block', marginBottom: 10, width: '100%' }}
          />

          <p style={{ marginTop: 0, opacity: 0.8 }}>
            <b>Total em unidades:</b> {totalUnidades}
          </p>


          <button onClick={handleSalvarMovimentacao} style={{ width: '100%' }}>
            Salvar movimentação
          </button>
        </div>
      </div>
  </div>
  )
}
