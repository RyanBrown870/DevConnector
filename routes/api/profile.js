const express = require('express');
const request = require('request');
const config = require('config');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

const Profile = require('../../models/Profile');
const User = require('../../models/User');

// @route   GET api/profile/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.user.id, // auth brings in id token onto req
    }).populate('user', ['name', 'avatar']); // the name and avatar are on User model, not Profile so bring these in.

    if (!profile) {
      return res.status(400).json({ msg: 'There is no profile for this user' });
    }

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/profile
// @desc    Create or update a user profile
// @access  Private
router.post(
  '/',
  [
    auth, // auth middleware
    [
      check('status', 'Status is required').not().isEmpty(), // express validator middlewares
      check('skills', 'Skills is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req); // checking for errors in the body
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // destructuring
    const {
      company,
      website,
      location,
      bio,
      status,
      githubusername,
      skills,
      youtube,
      facebook,
      twitter,
      instagram,
      linkedin,
    } = req.body; // pulls data from req.body

    // Build profile object. Check if data exists first to then insert it in.
    const profileFields = {};
    profileFields.user = req.user.id; // from token id
    if (company) profileFields.company = company;
    if (website) profileFields.website = website;
    if (location) profileFields.location = location;
    if (bio) profileFields.bio = bio;
    if (status) profileFields.status = status;
    if (githubusername) profileFields.githubusername = githubusername;
    if (skills) {
      profileFields.skills = skills.split(',').map((skill) => skill.trim()); // sending skills as comma-separated json so need to make array and split by comma
    }

    // Build social object
    profileFields.social = {};
    if (youtube) profileFields.social.youtube = youtube;
    if (twitter) profileFields.social.twitter = twitter;
    if (facebook) profileFields.social.facebook = facebook;
    if (linkedin) profileFields.social.linkedin = linkedin;
    if (instagram) profileFields.social.instagram = instagram;

    try {
      let profile = await Profile.findOne({ user: req.user.id }); // check if profile exists in mongodb for this user (id on req.user.id)

      if (profile) {
        // Update
        // if profile exists, update it with new post data
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true }
        );

        return res.json(profile);
      }

      // Create
      // if no profile, then create one using new post data built into profileFields
      profile = new Profile(profileFields);

      await profile.save(); // save the profile instance
      res.json(profile); // send the saved profile
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route     GET api/profile
// @desc      Get all profiles
// @access    Public

router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().populate('user', ['name', 'avatar']); // want name from user collection
    res.json(profiles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route     GET api/profile/:user_id
// @desc      Get profile by user ID
// @access    Public

router.get('/user/:user_id', async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id,
    }).populate('user', ['name', 'avatar']); // want name from user collection

    if (!profile) return res.status(400).json({ msg: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    if (err.kind == 'ObjectId') {
      return res.status(400).json({ msg: 'Profile not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route     DELETE api/profile
// @desc      Delete profile, user and posts
// @access    Private

router.delete('/', auth, async (req, res) => {
  try {
    // @todo - remove user's posts

    // Remove profile
    await Profile.findOneAndRemove({ user: req.user.id }); // have access to this from auth middleware
    // Remove user
    await User.findOneAndRemove({ _id: req.user.id });

    res.json({ msg: 'User deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route     PUT api/profile/experience
// @desc      Add profile experience
// @access    Private

router.put(
  '/experience',
  [
    auth,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('company', 'Company is required').not().isEmpty(),
      check('from', 'From date is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      company,
      location,
      from,
      to,
      current,
      description,
    } = req.body;

    const newExp = {
      title,
      company,
      location,
      from,
      to,
      current,
      description,
    };

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      // add new experience to beginning of the experience array
      profile.experience.unshift(newExp);
      await profile.save();
      res.json(profile); //return the whole profile
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route     DELETE api/profile/experience/:exp_id
// @desc      Delete experience from rofile
// @access    Private

router.delete('/experience/:exp_id', auth, async (req, res) => {
  try {
    // get the correct user
    const profile = await Profile.findOne({ user: req.user.id });

    // Get experience index
    const removeIndex = profile.experience
      .map((item) => item.id)
      .indexOf(req.params.exp_id); // grab index of matching experience id

    profile.experience.splice(removeIndex, 1); // remove the experience using the array index

    await profile.save();

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route     PUT api/profile/education
// @desc      Add profile education
// @access    Private

router.put(
  '/education',
  [
    auth,
    [
      check('school', 'School is required').not().isEmpty(),
      check('degree', 'Degree is required').not().isEmpty(),
      check('fieldofstudy', 'Field of study is required').not().isEmpty(),
      check('from', 'From date is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description,
    } = req.body;

    const newEdu = {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description,
    };

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      // add new experience to beginning of the experience array
      profile.education.unshift(newEdu);
      await profile.save();
      res.json(profile); //return the whole profile
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route     DELETE api/profile/education/:edu_id
// @desc      Delete education from profile
// @access    Private

router.delete('/education/:edu_id', auth, async (req, res) => {
  try {
    // get the correct user
    const profile = await Profile.findOne({ user: req.user.id });

    // Get education index
    const removeIndex = profile.education
      .map((item) => item.id)
      .indexOf(req.params.edu_id); // grab index of matching education id

    profile.education.splice(removeIndex, 1); // remove the education using the array index

    await profile.save();

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route     GET api/profile/github/:username
// @desc      Get user repos from github
// @access    Public

router.get('/github/:username', (req, res) => {
  try {
    // make the request paramters for github api call
    const options = {
      uri: `https://api.github.com/users/${
        req.params.username
      }/repos?per_page=5&sort=created:asc%client_id=${config.get(
        'githubClientId'
      )}&client_secret=${config.get('githubSecret')}`,
      method: 'GET',
      headers: { 'user-agent': 'node.js' },
    };
    // Send the request and how to deal with response
    request(options, (error, response, body) => {
      if (error) {
        console.error(error);
      }
      if (response.statusCode !== 200) {
        return res.status(404).json({ msg: 'No Github profile found' });
      }

      res.json(JSON.parse(body)); // body will be raw so need to parse it.
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
