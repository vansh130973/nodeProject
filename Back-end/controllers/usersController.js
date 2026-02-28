import bcrypt from "bcrypt";
import db from "../config/db.js";

export const registerUser = async (req, resp) => {
  try {
    const { firstName, lastName, userName, password, conformPassword, phone, email } = req.body;

    if (!firstName || !lastName || !userName || !password || !conformPassword || !phone || !email) {
      return resp.json({
        success: false,
        message: "All fields are mandatory",
      });
    }

    if (password !== conformPassword) {
      return resp.json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if(userName.length < 3 || userName.length > 20) {
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

    if (!/^\d{10}$/.test(phone)) {
      return resp.json({
        success: false,
        message: "Phone number must be 10 digits",
      });
    }

    db.query(
      "SELECT * FROM users WHERE email = ? OR userName = ?",
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

        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
          "INSERT INTO users (firstName, lastName, userName, password, phone, email) VALUES (?, ?, ?, ?, ?, ?)",
          [firstName, lastName, userName, hashedPassword, phone, email],
          (err, insertResult) => {
            if (err) {
              console.log("INSERT ERROR:", err);
              return resp.json({
                success: false,
                message: "Insert failed",
                error: err.sqlMessage,
              });
            }

            return resp.json({
              success: true,
              message: "User registered successfully",
              user: {
                id: insertResult.insertId,
                firstName,
                lastName,
                userName,
                email,
                phone,
              },
            });
          },
        );
      },
    );
  } catch (error) {
    resp.json({
      success: false,
      message: "Server error",
    });
  }
};

export const updateUserProfile = (req, resp) => {
  const userId = req.params.id
  const { firstName, lastName, userName, phone, email } = req.body

  db.query(
    "SELECT id FROM users WHERE (email = ? OR userName = ?) AND id != ?",
    [email, userName, userId],
    (err, result) => {

      if (err) {
        return resp.status(500).json({
          success: false,
          message: "DB connection error"
        })
      }

      if (result.length > 0) {
        return resp.status(409).json({
          success: false,
          message: "Email or Username already in use"
        })
      }

      db.query(
        "UPDATE users SET firstName=?, lastName=?, userName=?, phone=?, email=?, updatedAt=NOW() WHERE id=?",
        [firstName, lastName, userName, phone, email, userId],
        (err, updateResult) => {

          if (err) {
            return resp.status(500).json({
              success: false,
              message: "Update failed"
            })
          }

          if (updateResult.affectedRows === 0) {
            return resp.status(404).json({
              success: false,
              message: "User not found"
            })
          }

          return resp.status(200).json({
            success: true,
            message: "User profile updated successfully"
          })
        }
      )
    }
  )
};

export const userProfile = (req, resp) => {
  const userId = req.params.id;

  db.query(
    "SELECT id, firstName, lastName, userName, email, phone FROM users WHERE id = ?",
    [userId],
    (err, result) => {
      if (err) {
        return resp
          .status(500)
          .json({ success: false, message: "DB connection error" });
      }

      if (result.length === 0) {
        return resp
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      resp.status(200).json({
        success: true,
        user: result[0],
      });
    },
  );
};

export const loginUser = (req, resp) => {
  const { userName, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE userName = ?",
    [userName],
    async (err, result) => {
      if (err) {
        return resp.json({ success: false, message: "DB connection error" });
      }

      if (result.length === 0) {
        return resp.json({ success: false, message: "Username not valid" });
      }

      const user = result[0];

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return resp.json({ success: false, message: "Incorrect password" });
      } else {
        const { id, firstName, lastName, email, phone } = user;
        return resp.json({
          success: true,
          message: "Login successful",
          user: {
            id,
            firstName,
            lastName,
            userName,
            email,
            phone,
          },
        });
      }
    },
  );
};