'use client'
import { useState, useEffect } from 'react'
import { Users, Plus, Eye, EyeOff, UserCheck, UserX, Trash2, Crown, Shield, User } from 'lucide-react'

interface Usuario { id: string; nome: string; email: string; role: string; ativo: boolean; createdAt: string }

const ROLE_LABELS: Record<string, string> = { superadmin: 'SuperAdmin', admin: 'Admin', user: 'Usuário' }
const ROLE_LIMITS: Record<string, number> = { superadmin: 1, admin: 3, user: 12 }
const ROLE_HIERARCHY: Record<string, number> = { superadmin: 3, admin: 2, user: 1 }

function RoleBadge({ role }: { role: string }) {
  const classes: Record<string, string> = {
    superadmin: 'bg-amber-100 text-amber-800',
    admin: 'bg-purple-100 text-purple-700',
    user: 'bg-blue-100 text-blue-700',
  }
  const icons: Record<string, React.ReactNode> = {
    superadmin: <Crown className="w-3 h-3" />,
    admin: <Shield className="w-3 h-3" />,
    user: <User className="w-3 h-3" />,
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${classes[role] || 'bg-gray-100 text-gray-700'}`}>
      {icons[role]}
      {ROLE_LABELS[role] || role}
    </span>
  )
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'user' })
  const [showSenha, setShowSenha] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [currentRole, setCurrentRole] = useState<string>('user')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const fetchData = async () => {
    try {
      const [res, meRes] = await Promise.all([fetch('/api/admin/usuarios'), fetch('/api/auth/me')])
      if (res.ok) setUsuarios(await res.json())
      const me = await meRes.json()
      if (me.usuario) setCurrentRole(me.usuario.role)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Erro ao cadastrar.', 'error'); return }
      showToast('Usuário cadastrado com sucesso!')
      setModalOpen(false)
      setForm({ nome: '', email: '', senha: '', role: 'user' })
      fetchData()
    } catch { showToast('Erro de conexão.', 'error') }
    finally { setSaving(false) }
  }

  const toggleAtivo = async (id: string, ativo: boolean) => {
    const res = await fetch(`/api/admin/usuarios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !ativo })
    })
    if (res.ok) { showToast(`Usuário ${!ativo ? 'ativado' : 'desativado'}.`); fetchData() }
    else { const d = await res.json(); showToast(d.error || 'Erro', 'error') }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/usuarios/${id}`, { method: 'DELETE' })
    if (res.ok) { showToast('Usuário excluído.'); setDeleteConfirm(null); fetchData() }
    else { const d = await res.json(); showToast(d.error || 'Erro', 'error') }
  }

  const canManage = (targetRole: string) => {
    return (ROLE_HIERARCHY[currentRole] ?? 0) > (ROLE_HIERARCHY[targetRole] ?? 0)
  }

  const counts = {
    superadmin: usuarios.filter(u => u.role === 'superadmin').length,
    admin: usuarios.filter(u => u.role === 'admin').length,
    user: usuarios.filter(u => u.role === 'user').length,
  }

  const availableRoles = currentRole === 'superadmin'
    ? ['superadmin', 'admin', 'user'].filter(r => {
        if (r === 'superadmin') return counts.superadmin < ROLE_LIMITS.superadmin
        return true
      })
    : ['user']

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Users size={28} className="text-navy-700" />
          <div>
            <h1 className="text-2xl font-bold text-navy-800">Usuários do Sistema</h1>
            <p className="text-gray-500 text-sm">Gerencie os usuários com acesso ao sistema</p>
          </div>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      {/* Limits info */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {(['superadmin', 'admin', 'user'] as const).map(r => (
          <div key={r} className="flex items-center gap-1.5 text-xs text-navy-500 bg-white border border-cream-200 rounded-lg px-3 py-1.5">
            <RoleBadge role={r} />
            <span className="font-medium">{counts[r]}/{ROLE_LIMITS[r]}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">E-mail</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Perfil</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Criado em</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhum usuário cadastrado.</td></tr>
            ) : usuarios.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{u.nome}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {canManage(u.role) && (
                      <>
                        <button
                          onClick={() => toggleAtivo(u.id, u.ativo)}
                          title={u.ativo ? 'Desativar' : 'Ativar'}
                          className={`p-1.5 rounded-lg transition-colors ${u.ativo ? 'text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`}
                        >
                          {u.ativo ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(u.id)}
                          title="Excluir"
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-navy-800">Novo Usuário</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                <div className="relative">
                  <input type={showSenha ? 'text' : 'password'} value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} required minLength={8} placeholder="Mínimo 8 caracteres" className="input-field pr-10" />
                  <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil *</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="input-field">
                  {availableRoles.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5">{saving ? 'Salvando...' : 'Cadastrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-navy-800">Confirmar Exclusão</h3>
            <p className="text-sm text-navy-600">Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 btn-secondary">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
