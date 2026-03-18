export const sendSuccessResponse = (res, message, data = {}, token = null) => {
  return res.json({ success: true, message, token, ...data });
};

export const sendErrorResponse = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({ success: false, message });
};

export const userData = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  userName: user.userName,
  email: user.email,
  phone: user.phone,
  gender: user.gender ?? null,
  profilePicture: user.profilePicture ?? null,
  role: "USER",
});

export const adminData = (admin) => ({
  id: admin.id,
  userName: admin.userName,
  email: admin.email,
  phone: admin.phone,
  role: admin.role,
});