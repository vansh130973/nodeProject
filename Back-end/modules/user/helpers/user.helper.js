export const formatUserData = (user) => ({
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

export const resolveProfilePicture = (file, fallback = null) => {
  if (file) return `uploads/profiles/${file.filename}`;
  return fallback ?? null;
};