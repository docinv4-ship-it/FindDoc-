"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Loader2, Shield, Search, Plus, X, Check, User, Edit, Trash2
} from "lucide-react";
import type { Database } from "@/types/database";
import { useAdmin } from "../layout";

type AdminRole = Database["public"]["Tables"]["admin_roles"]["Row"];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  moderator: "bg-yellow-100 text-yellow-800",
  viewer: "bg-gray-100 text-gray-800",
};

const PERMISSIONS = [
  { key: "manage doctors", label: "Manage Doctors", description: "Create, edit, suspend doctors" },
  { key: "manage clinics", label: "Manage Clinics", description: "Create, edit, delete clinics" },
  { key: "manage verifications", label: "Manage Verifications", description: "Approve/reject doctor verifications" },
  { key: "manage subscriptions", label: "Manage Subscriptions", description: "Activate, suspend, extend subscriptions" },
  { key: "manage featured", label: "Manage Featured", description: "Activate/deactivate featured listings" },
  { key: "manage reports", label: "Manage Reports", description: "Handle user reports and complaints" },
  { key: "manage support", label: "Manage Support", description: "Respond to support tickets" },
  { key: "view audit", label: "View Audit Log", description: "View system audit trail" },
  { key: "manage settings", label: "Manage Settings", description: "Change platform settings" },
  { key: "manage roles", label: "Manage Roles", description: "Create and edit admin roles" },
];

export default function AdminRolesPage() {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();
  const { role: currentUserRole } = useAdmin();

  const [formData, setFormData] = useState({
    role: "viewer" as "super_admin" | "admin" | "moderator" | "viewer",
    permissions: {} as Record<string, boolean>,
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_roles")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error && data) setRoles(data);
    setLoading(false);
  };

  const filteredRoles = roles.filter((role) => {
    if (!searchQuery) return true;
    return role.role.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleCreate = async () => {
    setActionLoading(true);

    // For demo, use a placeholder user_id - in production you'd invite by email
    const placeholderUserId = crypto.randomUUID();

    await supabase.from("admin_roles").insert({
      role: formData.role,
      permissions: formData.permissions,
      user_id: placeholderUserId,
    });

    setShowCreateModal(false);
    setFormData({ role: "viewer", permissions: {} });
    fetchRoles();
    setActionLoading(false);
  };

  const handleUpdate = async () => {
    if (!selectedRole) return;
    setActionLoading(true);
    await supabase
      .from("admin_roles")
      .update({
        role: formData.role,
        permissions: formData.permissions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedRole.id);
    setSelectedRole(null);
    fetchRoles();
    setActionLoading(false);
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    setActionLoading(true);
    await supabase.from("admin_roles").delete().eq("id", roleId);
    fetchRoles();
    setActionLoading(false);
  };

  const canManageRoles = currentUserRole === "super_admin" || currentUserRole === "admin";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-600 mt-1">Manage admin access levels and permissions</p>
        </div>
        {canManageRoles && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-white font-medium rounded-lg"
            style={{ backgroundColor: "#36d1cf" }}
          >
            <Plus className="w-4 h-4" /> Add Role
          </button>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900">Role Hierarchy</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-purple-100 text-purple-700">Super Admin - Full access</span>
            <span className="px-2 py-1 rounded bg-blue-100 text-blue-700">Admin - Most actions</span>
            <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700">Moderator - Content moderation</span>
            <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">Viewer - Read only</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by role..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Roles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRoles.length > 0 ? (
          filteredRoles.map((role) => (
            <div key={role.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gray-100">
                    <Shield className="w-6 h-6 text-gray-500" />
                  </div>
                  <div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[role.role]}`}>
                      {role.role.replace("_", " ")}
                    </span>
                    <p className="text-xs text-gray-500 mt-1 font-mono">ID: {role.id.substring(0, 8)}</p>
                    <p className="text-xs text-gray-500 mt-1">Created: {new Date(role.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {canManageRoles && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedRole(role);
                        setFormData({
                          role: role.role as any,
                          permissions: role.permissions || {},
                        });
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit className="w-4 h-4 text-gray-500" />
                    </button>
                    {role.role !== "super_admin" && (
                      <button
                        onClick={() => handleDelete(role.id)}
                        className="p-2 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Permissions */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">PERMISSIONS</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(role.permissions || {}).filter(([, v]) => v).length > 0 ? (
                    Object.entries(role.permissions || {})
                      .filter(([, v]) => v)
                      .map(([key]) => (
                        <span key={key} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                          {key}
                        </span>
                      ))
                  ) : (
                    <span className="text-xs text-gray-400">No specific permissions (role-based)</span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100">
              <Shield className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-900 font-medium">No roles found</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || selectedRole) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => { setShowCreateModal(false); setSelectedRole(null); }}>
          <div className="bg-white rounded-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{selectedRole ? "Edit Role" : "Create Role"}</h2>
              <button onClick={() => { setShowCreateModal(false); setSelectedRole(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Type</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {PERMISSIONS.map((perm) => (
                    <label key={perm.key} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions[perm.key] || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, [perm.key]: e.target.checked },
                        })}
                        className="mt-1 w-4 h-4 rounded"
                        style={{ accentColor: "#36d1cf" }}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{perm.label}</p>
                        <p className="text-xs text-gray-500">{perm.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => { setShowCreateModal(false); setSelectedRole(null); }}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={selectedRole ? handleUpdate : handleCreate}
                  disabled={actionLoading}
                  className="flex-1 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: "#36d1cf" }}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : selectedRole ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
