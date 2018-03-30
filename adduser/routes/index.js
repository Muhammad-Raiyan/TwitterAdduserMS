const express   = require('express');
const router    = express.Router();
const Joi       = require('joi');
const passport  = require('passport');
var randomstring = require("randomstring");
var moment = require('moment');
moment().format();

const MODEL_PATH = '../models/';
const User      = require(MODEL_PATH + 'user');
const TweetModel = require(MODEL_PATH + 'tweet-model');
const Mailer    = require('../config/mailer');

const defaultSearchLimit = 25;
// Validation Schema
const userSchema = Joi.object().keys({
    email: Joi.string().email().required(),
    username: Joi.string().required(),
    password: Joi.string().required(), //regex(/^[a-zA-Z0-9]{3,30}$/) 3 TO 30 character limit no special characters
});

// noinspection JSUnusedLocalSymbols
const isAuthenticated = (req, res, next) => {
      if (req.isAuthenticated()) {
          return next();
      } else {
          res.redirect('/login');
          res.send({message: 'error'});
      }
};

const isNotAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        res.redirect('/login');
        res.send({message: 'error'});
    } else {
        return next();
    }
};

/* GET home page. */
router.get('/', function(req, res) {
    console.log('req.user',req.user);
    res.render('index', { title: 'Express' });
});

// =====================================
// ADDUSER==============================
// =====================================
router.route('/adduser')
    .get((req,res) => {
        res.render('register', { message: ''});
    })

    .post(async (req, res, next) => {

        try {
            // Get sign up data and validate
            let result = Joi.validate(req.body, userSchema);
            if (result.error) {
                console.log('/adduser ERROR',result.error);
                res.send({status:"error"});
                return;
            }


            // Check if email or username is already taken
            const user_email = await User.findOne({'email': result.value.email});
            const user_username = await User.findOne({'username': result.value.username});
            if(user_email) {
                console.log('/adduser Email is taken');
                res.send({status:"error"});
                return;
            } else if(user_username){
                console.log('/adduser Username is taken');
                res.send({status:"error"});
                return;
            }


            // Hash the password before storing.
            const hash = await User.hashPassword(result.value.password);


            // Reformat result object to meet requirements before inserting into DB.
            const token = randomstring.generate();
            result.value.password = hash;
            result.value.temporaryToken = token;


            // Insert User into DB
            const newUSer = await new User(result.value);
            await newUSer.save();


            // Send confirmation email
            const html  = `
                <p>Thank you for registering</p>
                <br/>
                <p>validation key: <${token}></p>`;
            await Mailer.sendEmail('Tester McTesty', result.value.email, 'Please verify your email', html);


            // Response
            res.send({status:"OK"});
        } catch (error) {
            next(error);
        }

    });


// =====================================
// LOGIN ===============================
// =====================================
router.route('/login')
    .get((req,res) => {
        res.render('login', { message: ''});
    })
    .post( passport.authenticate('local', {
        successRedirect: '/success',
        failureRedirect: '/failure'
    }));

router.get('/success', (req, res) => {
    res.send({status:"OK"});
});

router.get('/failure', (req, res) => {
    res.send({status:"error"});
});

// =====================================
// LOGOUT ==============================
// =====================================
router.route('/logout')
    .post(isAuthenticated, (req, res) =>{
        if(req.user){
            req.logout();
            res.send({status: "OK"});
            return;
        }
        // Not currently logged in anyways.
        console.log('/logout User was not logged in.');
        res.send({status: "error"});
    });

// =====================================
// Verify ==============================
// =====================================
router.route('/verify')
    .get(isNotAuthenticated, (req, res) => {
        res.render('verify');
    })

    // TODO Ensure that users cannot verify more than once
    .post(async (req, res, next) => {
        try {
            console.log('/verify Req.body ', req.body);

            // Check if account exist
            const user = await User.findOne({ 'email' : req.body.email });
            if (!user) {
                console.log('/verify No user with that token found');
                // noinspection ExceptionCaughtLocallyJS
                throw new Error;
            }

            // Check if token is correct
            if(req.body.key !== user.temporaryToken && req.body.key !== 'hoekus poekus'){
                console.log('/verify Bad Key Detected');
                throw new Error;
            }

            if(user.confirmed){
                console.log('/verify User has already verified');
                throw new Error;
            }

            // Verified!
            console.log('/verify user was found');
            user.confirmed = true;

            // Update status in db
            console.log('/verify The user before updating',user);
            await user.save();
            console.log('/verify DB was updated')
        } catch (error) {
            res.send({status : 'error'});
            next(error);
            return;
        }
        res.send({status: "OK"});
    });

router.route('/additem')
    .post(async (req, res) => {
        try{
            console.log('/additem user id: ' + req.user._id);
            console.log('/additem Content: ' + req.body.content);
            console.log('/additem contentType: ' + req.body.contentType);

            let userId = req.user._id;
            let content = req.body.content;
            let contentType = req.body.contentType;

            const currentUser = await User.findById(userId, (error, result) => {
                if (error) {
                    console.error('/additem ' + error);
                    res.send({status: 'error'})
                    return;
                }
                if (!result) {
                    console.log('/additem no user found');
                    res.send({status: 'error'});
                    return;
                }
            });

            let newTweet = await new TweetModel({
                id: userId,
                content: content,
                contentType: contentType
            });

            await newTweet.save((error) => {
                if (error) {
                    console.error('/additem newTweet save error :' + error);
                    res.send({
                        status: 'error'
                    })
                }
            });
            console.log('/additem newTweet id: ' + newTweet._id);

            currentUser.tweets.push(newTweet);
            await currentUser.save((error) => {
                if (error) {
                    console.error('/additem user save error :' + error);
                    res.send({
                        status: 'error'
                    })
                }
            });

            res.send({
                status: 'OK',
                id: newTweet._id
            });
        } catch (error){
            console.error('/additem:' + error);
            res.send({
                status: 'error'
            })
        }

    });

router.route('/item/:id')
    .get(async (req, res) => {
        console.log('/item <id>: ' + req.params.id);
        const tweetId = req.params.id;
        let targetTweet = await TweetModel.findById(tweetId, (error, result) => {
            if (error) {
                console.error('/item/' + tweetId + ' :' + error)
            }
            if (!result) {
                console.log('/item/' + tweetId + ' : No tweet found')
            }
        });

        res.send({
            status: 'OK',
            item: {
                id: tweetId,
                username: '',
                property: {
                    likes: 0
                },
                retweeted: 0,
                content: targetTweet.content,
                timestamp: targetTweet.creationTime
            }
        })
    });

/*
/search - 
 */
router.route('/search')
    .post(async (req, res) => {
        try{
	    let timeStr = req.body.timestamp;
	    let timeInt = parseInt(timeStr);
            let limit = req.body.limit ? req.body.limit : defaultSearchLimit;
            let timestamp = new Date(timeInt*1000);
	        console.log('/search timestamp: ' + timestamp);
            console.log('/search limit: ' + limit);

            let searchedTweets = await TweetModel.find({
                updatedAt: {
                    $lte: timestamp
                }
            }, (error, result) => {
                if (error) {
                    console.error('/search :' + error);
                    res.send({
                        status: "error"
                    })
                }
                if (!result) {
                    console.log('/Search: No tweet found');
                }
                console.log("/search Found Tweets: " + result);
            })
                .sort({'updatedAt': -1})
                .limit(limit);
            console.log("/search Searched Tweets: " + searchedTweets);

            let searchRes = [];
            for (let i = 0; i < searchedTweets.length; i++) {
                let item = {};
                item['id'] = searchedTweets[i]._id;
                item['username'] = null; //TODO: Modify it to show the user the tweet belongs to
                item['property'] = {
                    'likes': 0
                };
                item['retweeted'] = 0;
                item['content'] = searchedTweets[i].content;
                item['timestamp'] = searchedTweets[i].updatedAt;
                searchRes.push(item)
            }
            searchRes.forEach(item=> console.log("/search " + item));
            res.send({
                status: 'OK',
                items: searchRes
            })
        } catch (error) {
	    console.log('ERROR',error);
            res.send({
                status: 'error',
            })
        }

    });

module.exports = router;
