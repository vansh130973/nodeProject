const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

export const validateAdminLoginForm = (form) => {
  const errs = {};
  if (!form.userName.trim()) errs.userName = "Username is required";
  if (!form.password.trim()) errs.password = "Password is required";
  return errs;
};

export const validateAddAdminForm = (form) => {
  const errors = {};
  if (!form.userName.trim()) errors.userName = "Username is required";
  else if (form.userName.length < 3) errors.userName = "Username must be at least 3 characters";
  else if (form.userName.length > 20) errors.userName = "Username must not exceed 20 characters";

  if (!form.email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Invalid email format";

  if (!form.phone.trim()) errors.phone = "Phone number is required";
  else if (!/^[0-9]{10}$/.test(form.phone)) errors.phone = "Phone number must be exactly 10 digits";

  if (!form.password) errors.password = "Password is required";
  else if (!PASSWORD_REGEX.test(form.password))
    errors.password = "Must be 8+ chars with 1 uppercase, 1 number, 1 special character";

  if (!form.conformPassword) errors.conformPassword = "Confirm password is required";
  else if (form.password !== form.conformPassword) errors.conformPassword = "Passwords do not match";

  return errors;
};
