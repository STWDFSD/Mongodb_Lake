const config = require("../config/auth.config");
const db = require("../models");
const User = db.user;
const Role = db.role;

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Helper function to handle errors
const handleError = (res, err) => {
  res.status(500).send({ message: err });
  return;
};

// Helper function to save user and send success response
const saveUserAndRespond = async (user, res) => {
  try {
    await user.save();
    res.send({ message: "User was registered successfully!" });
  } catch (err) {
    handleError(res, err);
  }
};

exports.signup = async (req, res) => {
  try {
    const user = new User({
      username: req.body.username,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 8),
    });

    await user.save();

    if (req.body.roles) {
      const roles = await Role.find({
        name: { $in: req.body.roles },
      });

      user.roles = roles.map((role) => role._id);
      await saveUserAndRespond(user, res);
    } else {
      const role = await Role.findOne({ name: "user" });
      user.roles = [role._id];
      await saveUserAndRespond(user, res);
    }
  } catch (err) {
    handleError(res, err);
  }
};

exports.signin = async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.body.email,
    }).populate("roles", "-__v");

    if (!user) {
      return res.status(404).send({ message: "User Not found." });
    }

    const passwordIsValid = bcrypt.compareSync(
      req.body.password,
      user.password
    );

    if (!passwordIsValid) {
      return res.status(401).send({ message: "Invalid Password!" });
    }

    const token = jwt.sign(
      { id: user.id },
      config.secret,
      {
        algorithm: 'HS256',
        allowInsecureKeySizes: true,
        expiresIn: 86400, // 24 hours
      }
    );

    const authorities = user.roles.map(role => `ROLE_${role.name.toUpperCase()}`);

    req.session.token = token;

    res.status(200).send({
      id: user._id,
      username: user.username,
      email: user.email,
      roles: authorities,
    });
  } catch (err) {
    handleError(res, err);
  }
};

exports.signout = async (req, res) => {
  try {
    req.session = null;
    return res.status(200).send({ message: "You've been signed out!" });
  } catch (err) {
    res.status(500).send({ message: err });
  }
};
