// CALL THE PACKAGES --------------------
var express    = require('express');		// call express
var app        = express(); 				// define our app using express
var bodyParser = require('body-parser'); 	// get body-parser
var morgan     = require('morgan'); 		// used to see requests
var mongoose   = require('mongoose');		// methods for mongo db
var jwt         = require('jsonwebtoken');	// for creating a web token
var dotenv      = require('dotenv').config();
var User        = require('./user');
var cloudinary  = require('cloudinary');    // for image hosting
var fs          = require('fs');            // for reading buffer data
var http        = require('http');
var Photos      = require('./photos');

var port        = process.env.PORT || 8080; // set the port for our app
var superSecret = process.env.superSecret;//this is for the webToken

// APP CONFIGURATION ---------------------
mongoose.connect(process.env.DB); // connect to our database 
cloudinary.config({ 
    cloud_name: process.env.cloudName, 
    api_key: process.env.cloudKey, 
    api_secret: process.env.cloudSecret
});                             // connect to the image cloud service
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
	next();
});
app.use(morgan('dev'));
var apiRouter = express.Router();

// ROUTES ----------------------------

apiRouter.get('/', function(req, res) {
	res.send('Welcome to the home page!');
});

//=============================================================================================
//CREATE A USER ACCOUNT, WITH NAME, PASS, USERNAME
//=============================================================================================
// create a user (accessed at POST http://localhost:8080/signup)
apiRouter.post('/signup',function(req, res) {
	if (!req.body.username || !req.body.password) {
		res.json({success: false, msg: 'Please pass username and password.'});
	}else{
			var user = new User();		        // create a new instance of the User model
			//get data from the request body
			user.name = req.body.name;          // set the users name (comes from the request)
			user.username = req.body.username;  // set the users username (comes from the request)
			user.password = req.body.password;  // set the users password (comes from the request)
			user.rank = 0;                      //defult to 0
            user.uploads = 0;                   //defult to 0
            
			user.save(function(err) {
				if (err) {
					// duplicate entry
					if (err.code == 11000) 
						return res.json({ success: false, message: 'A user with that username already exists. '});
					else 
						return res.send(err);
				}

				// return a message
				res.json({ message: 'User created!' });
			});
		};
});
//=============================================================================================
//FINDS THE USERNAME AND GRANT TOKEN IF USERNAME EXISTS
//=============================================================================================
//this rout checks if the username and passwror are correct in the data base
apiRouter.post('/signin', function(req,res){

	var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;
	//find the user
	//select the username and password explicitly
	User.findOne({
		username: req.body.username
	}).select('name username password discoveries uploads').exec(function(err,user){
		if(err) throw err;

		//no user with that username was found
		if(!user){
			res.json({
				success: false,
				message: 'Athentication faild. user not found.'
			});
		}else if (user){

			//check if password mathches, using a function declared in the user.js
			var validPassword = user.comparePassword(req.body.password);

			if (!validPassword){
				res.json({
					success: false,
					message: 'Authentication faild. worng passoword.'
				});
			}else{

				//if user is found and the password is right 
				//create a token
				var token = jwt.sign({
					//this is the payload
					username: user.username  
				},superSecret,{
					expiresIn: 86400//expires in 24 hrs
				});

				//return the information including token as JSON
				res.json({
					success: true,
                    token: token,
                    user
				});
			}
		}
	});
});

//=============================================================================================
//MIDDLEWARE THAT MAKES EVERY METHOD DECLARED UNDER IT ASK FOR A TOKEN
//=============================================================================================
// middleware to use for all requests after this middleware
apiRouter.use(function(req, res, next) {
	// do logging
	console.log('Somebody just came to our app!');

	// check header or url parameters or post parameters for token
	var token = req.body.token || req.query.token || req.headers['x-access-token'];

	//deocode token
	if(token){

		//verifies secret and check exp
		jwt.verify(token, superSecret, function(err,decoded){
			if(err){
				return res.status(403).send({
					success: false,
					message: 'Faild to uathenticate token.'
				});
			}else{
				//if everything is good , save to request for use in other routes
				req.decoded = decoded;
				next();//this means that the user will only continue forward only if they have the token
			}
		});
	}else{

		//if ther is no token
		// return an HTTP response of 403 (access forbidden) and an error message
		return res.status(403).send({
			success: false,
			message: 'no token provided.'
		});
	}
});
//=============================================================================================
//UPLOAD PHOTOS
//=============================================================================================
apiRouter.post('/photos', function(req,res){

    var photo = req.query.photoUpload;
    var tempName = req.body.username;
    var tempLong = req.body.pLongitude;
    var tempLat = req.body.pLatitude;
   //error check
    if(photo === null){
        res.json({
            success: false,
            message: 'photo field is empty'
        })
    }
    if(tempName === null){
        res.json({
            success: false,
            message: 'username field is empty'
        })
    }
    if(tempLong === null){
        res.json({
            success: false,
            message: 'logitued field is empty'
        })
    }
    if(tempLat === null){
        res.json({
            success: false,
            message: 'latitude field is empty'
        })
    }

    //save uploader forieng key and image link
    User.findOne({
        username: tempName
    }).select(' username ').exec(function(err,userId){
        if(err) throw err;

        //no user with that name
        if(!userId){
            res.json({
                success: false,
                message: 'user not found'
            });

        }else if(userId){
            var tempPhoto = new Photos();
               //create link
            var Tpublic_id= userId.username;
            var Tversion = new Date().getTime() / 1000;;
            var Tformat= 'jpg';
            var Tsecure_url= 'https://res.cloudinary.com/image/upload/d'+Tversion+'/'+Tpublic_id+'.'+Tformat;
            //save to db
            tempPhoto.img_url = Tsecure_url;
            tempPhoto.longitude = tempLong;
            tempPhoto.latitude = tempLat;
            //save to db and cloud
            tempPhoto.save(function(err){
                if (err) {
                    return res.send(err);
                }
                else{
                      //save to cloud
                    cloudinary.uploader.upload(photo, function(result) { 
                        console.log(result) 
                    },
                    {
                        public_id: Tpublic_id,
                        version: Tversion,
                        format: Tformat,
                        secure_url: Tsecure_url
                    });  

                    res.json({
                        success: true,
                        message: 'image saved to cloud'
                    })
                }
            })
            console.log('image saved to db');
        }
    })

})

//-----------------------------------------------------------------------------------------
.get(function(req,res){
    cloudinary.image("omar.jpg")
})



// REGISTER OUR ROUTES -------------------------------
app.use('/api', apiRouter);
// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);