import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Globe,
  Activity,
  BarChart3,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  UserX,
  FileText,
  Clock,
  Zap,
  UserPlus,
  X,
  Trash2,
} from 'lucide-react';
import { adminService } from '../services/admin.service';
import { AdminOverview, AdminUser, AdminWorkspace, AuditLogItem, AdminUsage } from '../types';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'workspaces' | 'audit' | 'usage'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [usage, setUsage] = useState<AdminUsage | null>(null);

  // Add Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [auditActionSearch, setAuditActionSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'overview') {
        const data = await adminService.getOverview();
        setOverview(data);
      } else if (activeTab === 'users') {
        const data = await adminService.getUsers();
        setUsers(data);
      } else if (activeTab === 'workspaces') {
        const data = await adminService.getWorkspaces();
        setWorkspaces(data);
      } else if (activeTab === 'audit') {
        const data = await adminService.getAuditLogs(auditPagination.page, 20, auditActionSearch);
        setAuditLogs(data.logs);
        setAuditPagination(data.pagination);
      } else if (activeTab === 'usage') {
        const data = await adminService.getUsage();
        setUsage(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, auditPagination.page]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggleAdmin = async (user: AdminUser) => {
    try {
      const updated = await adminService.updateUserStatus(user.id, { isOrgAdmin: !user.isOrgAdmin });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isOrgAdmin: updated.isOrgAdmin } : u)));
      showToast(
        updated.isOrgAdmin
          ? `${user.name} has been promoted to Org Admin`
          : `${user.name} has been demoted and notified`
      );
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update admin role', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }
    setCreatingUser(true);
    try {
      const created = await adminService.createUser({
        name: newName,
        email: newEmail,
        password: newPassword,
        isOrgAdmin: newIsAdmin,
      });
      setUsers((prev) => [created, ...prev]);
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewIsAdmin(false);
      showToast(`${created.name} has been added to the team`);
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Failed to create team member', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      const updated = await adminService.updateUserStatus(user.id, { isActive: !user.isActive });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: updated.isActive } : u)));
      showToast(
        updated.isActive
          ? `${user.name} has been activated`
          : `${user.name} has been suspended and notified`
      );
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update user status', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      await adminService.deleteUser(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setShowDeleteModal(false);
      setUserToDelete(null);
      showToast(`${userToDelete.name} has been permanently removed`);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete team member', 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  const handleAuditSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAuditPagination((prev) => ({ ...prev, page: 1 }));
    loadData();
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Shield size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Organization Admin</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Manage your team, workspaces, compliance audit trails, and platform usage metrics.
          </p>
        </div>
        <button
          onClick={() => loadData()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors self-start md:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'users', label: 'Team Members', icon: Users },
          { id: 'workspaces', label: 'Workspaces Health', icon: Globe },
          { id: 'audit', label: 'Audit Logs', icon: FileText },
          { id: 'usage', label: 'Usage & Cost', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="flex justify-center items-center py-16">
          <RefreshCw size={24} className="animate-spin text-indigo-400" />
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {!loading && activeTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* Tenant Banner */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-semibold text-indigo-400 tracking-wider">Tenant Profile</span>
              <h2 className="text-xl font-bold text-white mt-1">{overview.tenant.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">Slug: {overview.tenant.slug}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase">
                Plan: {overview.tenant.plan}
              </div>
              <div className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase">
                Status: {overview.tenant.subscriptionStatus}
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Total Organization Users</span>
                <Users size={18} className="text-indigo-400" />
              </div>
              <div className="text-3xl font-extrabold text-white mt-2">{overview.metrics.totalUsers}</div>
              <span className="text-xs text-slate-500 mt-1 block">Active team accounts</span>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Workspaces</span>
                <Globe size={18} className="text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-white mt-2">
                {overview.metrics.activeWorkspaces} / {overview.metrics.totalWorkspaces}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">Active connected workspaces</span>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Total Tool Calls</span>
                <Zap size={18} className="text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold text-white mt-2">
                {overview.metrics.totalToolCalls.toLocaleString()}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">Executed agent actions</span>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Period LLM Tokens</span>
                <BarChart3 size={18} className="text-purple-400" />
              </div>
              <div className="text-3xl font-extrabold text-white mt-2">
                {(overview.metrics.currentPeriod?.llmTokensUsed || 0).toLocaleString()}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">Current billing cycle tokens</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEAM MEMBERS */}
      {!loading && activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative max-w-md w-full">
              <Search size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search member name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
            >
              <UserPlus size={16} />
              Add Team Member
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Member</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Last Active</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{u.name}</div>
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.isOrgAdmin ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
                          <Shield size={12} />
                          Org Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-medium">
                          Member
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                          <CheckCircle2 size={14} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium">
                          <XCircle size={14} /> Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleAdmin(u)}
                          className="px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                          title={u.isOrgAdmin ? 'Demote to Member' : 'Promote to Admin'}
                        >
                          {u.isOrgAdmin ? 'Demote' : 'Make Admin'}
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                            u.isActive
                              ? 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                              : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                          }`}
                          title={u.isActive ? 'Suspend this member' : 'Activate this member'}
                        >
                          {u.isActive ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          onClick={() => {
                            setUserToDelete(u);
                            setShowDeleteModal(true);
                          }}
                          className="px-2.5 py-1 text-xs rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                          title="Permanently delete this member"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WORKSPACES HEALTH */}
      {!loading && activeTab === 'workspaces' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaces.map((ws) => (
            <div key={ws.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-indigo-400 font-bold uppercase text-xs">
                    {ws.provider}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{ws.name}</h3>
                    <p className="text-xs text-slate-400">{ws.providerEmail || 'Connected workspace'}</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    ws.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                  {ws.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block">Total Tool Calls</span>
                  <span className="text-slate-200 font-semibold text-sm">{ws.stats.totalCalls}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Call Success Rate</span>
                  <span className="text-emerald-400 font-semibold text-sm">
                    {ws.stats.successRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                <span>Permissions Granted: {ws.permissions?.length || 0}</span>
                <span>
                  Last Call:{' '}
                  {ws.lastSuccessfulCallAt
                    ? new Date(ws.lastSuccessfulCallAt).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {!loading && activeTab === 'audit' && (
        <div className="space-y-4">
          <form onSubmit={handleAuditSearch} className="flex items-center gap-3">
            <div className="relative max-w-md w-full">
              <Search size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by action name (e.g. USER_STATUS_UPDATED)..."
                value={auditActionSearch}
                onChange={(e) => setAuditActionSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Filter
            </button>
          </form>

          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Resource</th>
                  <th className="px-5 py-3.5">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5 text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-indigo-400 font-semibold">{log.action}</td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {log.resourceType || '-'} {log.resourceId ? `(${log.resourceId.slice(0, 8)})` : ''}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">{log.userId ? log.userId.slice(0, 8) : 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: USAGE & ANALYTICS */}
      {!loading && activeTab === 'usage' && usage && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Zap size={20} className="text-amber-400" />
              Most Frequently Executed Tools
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {usage.topTools.map((tool) => (
                <div
                  key={tool.toolName}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800"
                >
                  <span className="text-sm font-semibold text-slate-200 font-mono">{tool.toolName}</span>
                  <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-xs">
                    {tool.count} calls
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD TEAM MEMBER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <UserPlus size={18} />
                </div>
                <h3 className="font-bold text-white text-lg">Add Team Member</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Smith"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. alex@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter temporary password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="isOrgAdminCheck"
                  checked={newIsAdmin}
                  onChange={(e) => setNewIsAdmin(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="isOrgAdminCheck" className="text-xs text-slate-300 font-medium cursor-pointer select-none">
                  Grant Organization Admin privileges (`isOrgAdmin`)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                >
                  {creatingUser ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                <Trash2 size={18} />
              </div>
              <h3 className="font-bold text-white text-lg">Delete Team Member</h3>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-300">
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold text-white">{userToDelete.name}</span>?
              </p>
              <p className="text-xs text-slate-400">
                This action cannot be undone. The user’s account, sessions, and conversations will be
                permanently removed.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
              <div className="flex items-center gap-2 text-xs text-red-400">
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span>{userToDelete.email}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deletingUser}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
              >
                {deletingUser ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl border shadow-2xl text-sm font-medium animate-fade-in-up ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
          style={{ backdropFilter: 'blur(12px)' }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
