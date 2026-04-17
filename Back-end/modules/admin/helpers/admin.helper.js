export const formatAdminData = (admin) => ({
  id: admin.id,
  userName: admin.userName,
  email: admin.email,
  phone: admin.phone,
  role: admin.role,
  roleId: admin.roleId ?? null,
  roleName: admin.roleName ?? null,
  permissions: admin.permissions ?? {},
});

// Trim single value
export const normalize = (value) => {
  return typeof value === "string" ? value.trim() : value;
};