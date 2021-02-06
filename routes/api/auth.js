const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('config');
const { check, validationResult } = require('express-validator');

const User = require('../../models/User');

// @route   GET api/auth
// @desc    Test route
// @access  Public
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password'); // middleware set decoded to req.user so id is here. select() removes the password as don't want to access this.
    res.json(user);
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth
// @desc    Authenticate user and get token
// @access  Public
router.post(
  '/',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req); // checking for errors in the body
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body; // destructure to pull from req.body

    // Check the user
    try {
      let user = await User.findOne({ email });

      if (!user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid credentials' }] });
      }

      // Check password matches.
      const isMatch = await bcrypt.compare(password, user.password); // Checks password against encrypted password from Mongo.
      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Invalid credentials' }] }); // Don't show message where email or password have matched as that may be security issue (e.g. show user exists, keep trying).
      }

      // Return jsonwebtoken
      const payload = {
        user: {
          id: user.id, // mongo has _id but mongoose allows id to be accessed directly
        },
      };

      jwt.sign(
        payload,
        config.get('jwtSecret'), // pass in the secret
        { expiresIn: 360000 }, // expiration
        (err, token) => {
          // either get error or token back
          if (err) {
            throw err;
          } else {
            res.json({ token }); // if works, send token back to client.
          }
        }
      );
    } catch (err) {
      console.log(err);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
