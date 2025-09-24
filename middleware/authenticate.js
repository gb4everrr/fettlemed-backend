// middleware/authenticate.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async function (req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(403).json({ message: 'Invalid user' });

    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Unauthorized', error: err.message });
  }
};
