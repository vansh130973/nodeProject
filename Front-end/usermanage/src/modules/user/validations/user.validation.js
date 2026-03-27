const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
const PHONE_REGEX = /^[0-9]{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegisterForm = (form) => {
  const errs = {};
  if (!form.firstName.trim()) errs.firstName = "First name is required";
  if (!form.lastName.trim()) errs.lastName = "Last name is required";
  if (!form.userName.trim()) errs.userName = "Username is required";
  if (!form.email.trim()) errs.email = "Email is required";
  else if (!EMAIL_REGEX.test(form.email)) errs.email = "Invalid email format";
  if (!PHONE_REGEX.test(form.phone)) errs.phone = "Phone must be exactly 10 digits";
  if (!form.gender) errs.gender = "Gender is required";
  if (!form.password) errs.password = "Password is required";
  else if (!PASSWORD_REGEX.test(form.password))
    errs.password = "Must be 8+ chars with 1 uppercase, 1 number, 1 special character";
  if (!form.confirmPassword) errs.confirmPassword = "Confirm password is required";
  else if (form.password !== form.confirmPassword)
    errs.confirmPassword = "Passwords do not match";
  return errs;
};

export const validateLoginForm = (form) => {
  const errs = {};
  if (!form.userName.trim()) errs.userName = "Username is required";
  if (!form.password.trim()) errs.password = "Password is required";
  return errs;
};

export const validateEditProfileForm = (form) => {
  const errs = {};
  if (!form.firstName.trim()) errs.firstName = "First name is required";
  if (!form.lastName.trim()) errs.lastName = "Last name is required";
  if (!PHONE_REGEX.test(form.phone)) errs.phone = "Phone must be exactly 10 digits";
  if (!form.gender) errs.gender = "Gender is required";
  return errs;
};

export const validateChangePasswordForm = (form) => {
  const errs = {};
  if (!form.newPassword) errs.newPassword = "New password is required";
  else if (!PASSWORD_REGEX.test(form.newPassword))
    errs.newPassword = "Must be 8+ chars with 1 uppercase, 1 number, 1 special character";
  if (!form.confirmNewPassword) errs.confirmNewPassword = "Please confirm your password";
  else if (form.newPassword !== form.confirmNewPassword)
    errs.confirmNewPassword = "Passwords do not match";
  return errs;
};

export const validateForgotPasswordForm = (form) => {
  const errs = {};
  if (!form.email.trim()) errs.email = "Email is required";
  else if (!EMAIL_REGEX.test(form.email)) errs.email = "Invalid email format";
  return errs;
};

export const validateOtpForm = (form) => {
  const errs = {};
  if (!form.otp.trim()) errs.otp = "OTP is required";
  else if (!/^[0-9]{6}$/.test(form.otp)) errs.otp = "OTP must be exactly 6 digits";
  return errs;
};

export const validateResetPasswordForm = (form) => {
  const errs = {};
  if (!form.newPassword) errs.newPassword = "New password is required";
  else if (!PASSWORD_REGEX.test(form.newPassword))
    errs.newPassword = "Must be 8+ chars with 1 uppercase, 1 number, 1 special character";
  if (!form.confirmNewPassword) errs.confirmNewPassword = "Please confirm your password";
  else if (form.newPassword !== form.confirmNewPassword)
    errs.confirmNewPassword = "Passwords do not match";
  return errs;
};