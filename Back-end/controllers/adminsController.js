import bcrypt from "bcrypt";
import db from "../config/db.js";

export const addAdmin = async (req, resp) => {
  try {
    const { userName, password, conformPassword, phone, email } = req.body;

    if (!userName || !password || !conformPassword || !phone || !email) {
      return resp.json({
        success: false,
        message: "All fields are mandatory",
      });
    }

    if (userName.length < 3 || userName.length > 20) {
      return resp.json({
        success: false,
        message: "Username must be between 3 and 20 characters",
      });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/;
    if (!passwordRegex.test(password)) {
      return resp.json({
        success: false,
        message:
          "Password must be at least 6 characters long and include 1 uppercase letter, 1 number, and 1 special character",
      });
    }

    if (password !== conformPassword) {
      return resp.json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (!/^\d{10}$/.test(phone)) {
      return resp.json({
        success: false,
        message: "Phone number must be 10 digits",
      });
    }

    db.query(
      "SELECT * FROM admins WHERE email = ? OR userName = ?",
      [email, userName],
      async (err, result) => {
        if (err) {
          return resp.json({ success: false, message: "DB connection error" });
        }

        if (result.length > 0) {
          return resp.json({
            success: false,
            message: "UserName and Email already exists",
          });
        }

        const hashedPassword = await bcrypt.hash(String(password), 10);

        if (role === MASTER_ADMIN) {
          db.query(
            "INSERT INTO admins (userName, password, email, phone) VALUES (?, ?, ?, ?)",
            [userName, hashedPassword, email, phone],
            (err, insertResult) => {
              if (err) {
                return resp.json({
                  success: false,
                  message: "Insert failed",
                  error: err.sqlMessage,
                });
              }

              return resp.json({
                success: true,
                message: "Admin registered successfully",
                admin: {
                  id: insertResult.insertId,
                  userName,
                  email,
                  phone,
                },
              });
            },
          );
        }
      },
    );
  } catch (error) {
    console.error("Error in registerAdmin:", error);
    return resp.json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const showAllUsers = (req, resp) => {
  db.query("SELECT id, userName, email, phone FROM users", (err, result) => {
    if (err) {
      return resp.json({ success: false, message: "DB connection error" });
    }

    return resp.json({
      success: true,
      users: result,
    });
  });
};

export const showAllAdmins = (req, resp) => {
  db.query("SELECT id, userName, email, phone FROM admins", (err, result) => {
    if (err) {
      return resp.json({ success: false, message: "DB connection error" });
    }

    return resp.json({
      success: true,
      users: result,
    });
  });
};

export const loginAdmin = (req, resp) => {
  const { userName, password } = req.body;

  db.query(
    "SELECT * FROM admins WHERE userName = ?",
    [userName],
    async (err, result) => {
      if (err) {
        return resp.json({ success: false, message: "DB connection error" });
      }

      if (result.length === 0) {
        return resp.json({ success: false, message: "Username not valid" });
      }

      const admin = result[0];
      const isPasswordValid = await bcrypt.compare(
        String(password),
        admin.password,
      );

      if (!isPasswordValid) {
        return resp.json({ success: false, message: "Invalid password" });
      }

      return resp.json({
        success: true,
        message: "Login successful",
        admin: {
          id: admin.id,
          userName: admin.userName,
          email: admin.email,
          phone: admin.phone,
        },
      });
    },
  );
};