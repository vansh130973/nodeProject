import transporter from "../../../config/mailer.js";

export const formatUserData = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  userName: user.userName,
  email: user.email,
  phone: user.phone,
  gender: user.gender ?? null,
  profilePicture: user.profilePicture ?? null,
  status: user.status,
  role: "USER",
});

export const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const otpExpiryTime = (minutes = 10) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d;
};

export const sendOtpEmail = async (toEmail, otp) => {
  await transporter.sendMail({
    from: `"MyPanel" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: "Your Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1f2937; margin-bottom: 8px;">Password Reset Request</h2>
        <p style="color: #6b7280;">Use the OTP below to reset your password. It is valid for <strong>10 minutes</strong>.</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111827; text-align: center; padding: 24px 0;">
          ${otp}
        </div>
      </div>
    `,
  });
};