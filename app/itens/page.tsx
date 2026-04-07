'use client'

import { useEffect, useMemo, useState } from 'react'
import Menu from '../../components/menu'
import { supabase } from '../../lib/supabase'
import { getMyRole } from '../../lib/auth'
import { sanitizeText } from '../../lib/sanitize'
import { onlyDigits } from '../../lib/onlyDigits'

type Role = 'ADMIN' | 'OPERADOR' | 'CONFERENTE' | 'SUPERVISOR'

type ItemRow = {
  id: string
  nome: string
  ativo: boolean
  qtd_por_caixa: number | null
}

type FiltroStatus = 'TODOS' | 'ATIVOS' | 'INATIVOS'

export default function ItensPage() {
  const [role, setRole] = useState<Role | null>(null)
  const [loadingRole, setLoadingRole] = useState(true)

  const [items, setItems] = useState<ItemRow[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [novoNome, setNovoNome] = useState('')
  const [novaQtdPorCaixa, setNovaQtdPorCaixa] = useState('')
  const [creating, setCreating] = useState(false)

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('ATIVOS')

  const [editId, setEditId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editQtdPorCaixa, setEditQtdPorCaixa] = useState('')

  const canAccess = role === 'ADMIN' || role === 'SUPERVISOR'

  async function loadItems() {
    setLoadingItems(true)
    setMsg(null)

    const { data, error } = await supabase
      .from('itens')
      .select('id,nome,ativo,qtd_por_caixa')
      .order('nome', { ascending: true })

    setLoadingItems(false)

    if (error) {
      console.log('ITENS LOAD ERROR:', error)
      setMsg('Erro ao carregar itens.')
      return
    }

    setItems((data as ItemRow[]) ?? [])
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoadingRole(true)
      const r = await getMyRole()
      if (!mounted) return
      setRole(r as Role | null)
      setLoadingRole(false)
      if (r === 'ADMIN') loadItems()
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function handleCreate() {
    setMsg(null)

    const nomeSanitizado = sanitizeText(novoNome, { maxLen: 80 })
    if (!nomeSanitizado) return setMsg('Informe o nome do item.')

    const qtdPorCaixaNum = Number(novaQtdPorCaixa)
    if (!Number.isInteger(qtdPorCaixaNum) || qtdPorCaixaNum <= 0) {
      return setMsg('Informe uma quantidade por caixa válida e maior que zero.')
    }

    setCreating(true)
    const { error } = await supabase
      .from('itens')
      .insert([{ nome: nomeSanitizado, ativo: true, qtd_por_caixa: qtdPorCaixaNum }])

    setCreating(false)

    if (error) {
      console.log('ITENS INSERT ERROR:', error)
      return setMsg('Erro ao criar item.')
    }

    setNovoNome('')
    setNovaQtdPorCaixa('')
    loadItems()
  }

  function startEdit(item: ItemRow) {
    setEditId(item.id)
    setEditNome(item.nome)
    setEditQtdPorCaixa(item.qtd_por_caixa != null ? String(item.qtd_por_caixa) : '')
  }

  function cancelEdit() {
    setEditId(null)
    setEditNome('')
    setEditQtdPorCaixa('')
  }

  async function saveEdit() {
    if (!editId) return

    const nomeSanitizado = sanitizeText(editNome, { maxLen: 80 })
    if (!nomeSanitizado) return setMsg('Informe o nome do item.')

    const qtdPorCaixaNum = Number(editQtdPorCaixa)
    if (!Number.isInteger(qtdPorCaixaNum) || qtdPorCaixaNum <= 0) {
      return setMsg('Informe uma quantidade por caixa válida e maior que zero.')
    }

    setMsg(null)

    const { error } = await supabase
      .from('itens')
      .update({ nome: nomeSanitizado, qtd_por_caixa: qtdPorCaixaNum })
      .eq('id', editId)

    if (error) {
      console.log('ITENS UPDATE ERROR:', error)
      return setMsg('Erro ao atualizar item.')
    }

    cancelEdit()
    loadItems()
  }

  async function toggleAtivo(item: ItemRow) {
    const nextAtivo = !item.ativo
    const ok = confirm(nextAtivo ? 'Ativar este item?' : 'Desativar este item?')
    if (!ok) return

    setMsg(null)

    const { error } = await supabase
      .from('itens')
      .update({ ativo: nextAtivo })
      .eq('id', item.id)

    if (error) {
      console.log('ITENS TOGGLE ERROR:', error)
      return setMsg('Erro ao atualizar status.')
    }

    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ativo: nextAtivo } : i)))
  }

  const buscaSanitizada = sanitizeText(busca, { maxLen: 80 }).toLowerCase()
  const itensFiltrados = useMemo(() => {
    return items.filter((i) => {
      if (filtroStatus === 'ATIVOS' && !i.ativo) return false
      if (filtroStatus === 'INATIVOS' && i.ativo) return false
      if (!buscaSanitizada) return true
      return i.nome.toLowerCase().includes(buscaSanitizada)
    })
  }, [items, filtroStatus, buscaSanitizada])

  if (loadingRole) {
    return (
      <>
        <Menu />
        <div className="container">
          <div className="card">Carregando...</div>
        </div>
      </>
    )
  }

  if (!canAccess) {
    return (
      <>
        <Menu />
        <div className="container">
          <div className="card">
            <h1>Itens</h1>
            <p>Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Menu />

      <div className="container">
        <div className="card">
          <div className="uHeader">
            <div>
              <h1>Itens</h1>
              <p className="uSub">Gerencie os itens usados no filtro e no cadastro de movimentações.</p>
            </div>

            <button className="uBtn" onClick={loadItems} disabled={loadingItems} type="button">
              {loadingItems ? 'Atualizando...' : 'Atualizar lista'}
            </button>
          </div>

          <h2 className="uTitle2">Cadastrar item</h2>

          <div className="uForm">
            <div className="uField">
              <label>Nome do item</label>
              <input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="ex: Produto X"
                autoComplete="off"
              />
            </div>

            <div className="uField">
              <label>Quantidade por caixa</label>
              <input
                value={novaQtdPorCaixa}
                onChange={(e) => setNovaQtdPorCaixa(onlyDigits(e.target.value))}
                placeholder="ex: 12"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="uActions">
            <button className="uBtn uBtnPrimary" onClick={handleCreate} disabled={creating} type="button">
              {creating ? 'Criando...' : 'Criar item'}
            </button>

            <button
              className="uBtn uBtnGhost"
              type="button"
              onClick={() => {
                setNovoNome('')
                setNovaQtdPorCaixa('')
                setMsg(null)
              }}
            >
              Limpar
            </button>
          </div>

          {msg && <div className="uAlert">{msg}</div>}

          <hr className="uHr" />

          <div className="filters-row" style={{ marginBottom: 12 }}>
            <input
              className="input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar item..."
            />

            <select
              className="select"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
            >
              <option value="TODOS">Todos</option>
              <option value="ATIVOS">Ativos</option>
              <option value="INATIVOS">Inativos</option>
            </select>
          </div>

          <h2 className="uTitle2">Itens cadastrados</h2>

          {itensFiltrados.length === 0 && !loadingItems && (
            <p style={{ color: 'var(--muted)' }}>Nenhum item encontrado com os filtros atuais.</p>
          )}

          <div className="uList">
            {itensFiltrados.map((item) => (
              <div key={item.id} className={`uRow ${item.ativo ? '' : 'isDisabled'}`}>
                <div className="uRowLeft">
                  {editId === item.id ? (
                    <>
                      <input
                        className="input"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        style={{ marginBottom: 8 }}
                      />
                      <input
                        className="input"
                        value={editQtdPorCaixa}
                        onChange={(e) => setEditQtdPorCaixa(onlyDigits(e.target.value))}
                        placeholder="Qtd por caixa"
                        inputMode="numeric"
                        style={{ marginBottom: 8 }}
                      />
                    </>
                  ) : (
                    <>
                      <div className="uEmail">{item.nome}</div>
                      <div className="uMeta">Qtd/caixa: {item.qtd_por_caixa ?? 'Não definido'}</div>
                    </>
                  )}
                  <div className="uMeta">
                    {item.ativo ? (
                      <span className="uBadge">ATIVO</span>
                    ) : (
                      <span className="uBadge uBadgeOff">INATIVO</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {editId === item.id ? (
                    <>
                      <button className="uBtn uBtnPrimary" type="button" onClick={saveEdit}>
                        Salvar
                      </button>
                      <button className="uBtn uBtnGhost" type="button" onClick={cancelEdit}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="uBtn" type="button" onClick={() => startEdit(item)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className={`uBtn ${item.ativo ? 'uBtnDanger' : 'uBtnOk'}`}
                        onClick={() => toggleAtivo(item)}
                      >
                        {item.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
