const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

exports.register = async (req, res) => {
  const { email, password, role, first_name, last_name, phone_number } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(409).json({ message: 'User already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password_hash,
      role,
      first_name,
      last_name,
      phone_number
    });
    //Checking for previous clinic entries
    if (user.role === 'patient') {
      await ClinicPatient.update(
        { global_patient_id: user.id },
        { where: { global_patient_id: null, phone_number: user.phone_number } }
    );
    } else if (user.role === 'doctor') {
      await ClinicDoctor.update(
        { global_doctor_id: user.id },
        { where: { global_doctor_id: null, phone_number: user.phone_number } }
    );
    }

    res.status(201).json({ user_id: user.id, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};