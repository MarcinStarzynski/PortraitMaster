const Photo = require('../models/photo.model');
const Voter = require('../models/Voter.model');
const requestIp = require('request-ip');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {

  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;

    const emailPattern = new RegExp('^[a-zA-Z0-9][a-zA-Z0-9_.-]+@[a-zA-Z0-9][a-zA-Z0-9_.-]+\.{1,3}[a-zA-Z]{2,4}');
    const textPattern = new RegExp(/(\w|\s|\.)*/, 'g');

    const correctEmail = email.match(emailPattern).join('');
    const correctAuthor = author.match(textPattern).join('');
    const correctTitle = title.match(textPattern).join('');

    if((correctEmail.length < email.length) || (correctTitle.length < title.length) || (correctAuthor.length < author.length)) {
      throw new Error('Wrong characters used!');
    }

    if(title && author && email && file) { // if fields are not empty...

      const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const fileType = fileName.split('.').slice(-1)[0];

      console.log(fileType);

      if((fileType === 'jpg' || fileType === 'png' || fileType === 'gif') && title.length <= 25) {
        const newPhoto = new Photo({ title, author, email, src: fileName, votes: 0 });
        await newPhoto.save(); // ...save new photo in DB
        console.log('newPhoto',newPhoto)
        res.json(newPhoto);
      } else throw new Error('Wrong input!');
     
    } else {
      throw new Error('Wrong input!');
    }

  } catch(err) {
    res.status(500).json(err);
  }

};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {

  try {
    res.json(await Photo.find());
  } catch(err) {
    res.status(500).json(err);
  }

};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {

  try {
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });

   if(!photoToUpdate) res.status(404).json({ message: 'Not found' });
    const updatePhoto = () => {
      photoToUpdate.votes++;
      photoToUpdate.save();
      res.send({ message: 'OK' });
    }

    const voterIp = requestIp.getClientIp(req);
    const findUser = await Voter.findOne({user: voterIp});

    if(findUser) {
      const votes = findUser.votes.filter(el => el == req.params.id);
      if(votes < 1) {
        findUser.votes.push(req.params.id);
        await Voter.updateOne({user: voterIp}, {$set: {votes: findUser.votes}});
        updatePhoto();

      } else {
        res.status(500).json('You can`t vote again on this picture!');
      }
    } else {
      const newVoter = await Voter({user: voterIp, votes: req.params.id});
      await newVoter.save();
      updatePhoto();
    }

  } catch(err) {
    res.status(500).json(err);
  }

};
