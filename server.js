//author: Omar Bitar
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
var multer  = require('multer');
var jwtDecode = require('jwt-decode');

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
	if (!req.body.username || !req.body.password || !req.body.passwordCheck) {
		res.json({success: false, msg: 'please pass required fields.'});
	}else{
			var user = new User();		        // create a new instance of the User model
			//get data from the request body
			user.name = req.body.name;          // set the users name (comes from the request)
			user.username = req.body.username;  // set the users username (comes from the request)
			user.password = req.body.password;  // set the users password (comes from the request)
			var passowordC = req.body.passwordCheck;
			if (user.password !== passowordC){
				res.json({
					success: false,
					message: 'password does not match'
				});
			} else {
				//save the user to the database
				user.discoveries = 0;                //defult to 0
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
						res.json({ 
							success: true,
							message: 'User created!' 
						});
				});
			}
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
					user: {
						name: user.name,
					username: user.username,
					discoveries: user.discoveries,
					uploads : user.uploads
					}
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
					message: 'Failed to authenticate token.'
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
			message: 'No token provided.'
		});
	}
});
//=============================================================================================
//UPLOAD PHOTOS
//=============================================================================================
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });
apiRouter.post('/photos', upload.single('avatar'), (req, res) => {

	if (!req.file) {
	  console.log("No file received");
	  return res.send({
		success: false
	  });
	} else {
		//save image to the cloud
		var tempName = req.query.username;
		var tempLong = req.query.pLongitude;
		var tempLat = req.query.pLatitude;
		//error check
		if(tempName === null){
			res.json({
				success: false,
				message: 'username field is empty'
			})
		}
		if(tempLong === null){
			res.json({
				success: false,
				message: 'longitude field is empty'
			})
		}
		if(tempLat === null){
			res.json({
				success: false,
				message: 'latitude field is empty'
			})
		}
		//check if the user exists in the db
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

				//// update user upload count
				var newUploads = 0;
				User.findOne({ username: userId.username }).select('uploads').exec(function(err,userTemp){
					newUploads = userTemp.uploads;
					newUploads = newUploads +1;	
					User.findOneAndUpdate({ username: tempName },{$set: {uploads: newUploads}},
						{returnOriginal:false},function(err) {
						if (err) {
							// duplicate entry
							if (err.code === 11000)
								return res.json({ success: false, message: 'no update was made.' });
							else
								return res.send(err);
						}
							//save image to the cloud
							cloudinary.v2.uploader.upload_stream( {resource_type: 'raw'}, (err, result) => {
						
								//save to image info to db 
								var tempPhoto = new Photos();
								tempPhoto.img_url = result.secure_url;
								tempPhoto.longitude = tempLong;
								tempPhoto.latitude = tempLat;
								tempPhoto.save(function(err){
									if (err) {
										return res.send(err);
									}
									else{
										res.json({
											success: true,
											message: 'image saved to db'
										})
									}
								})
								console.log('url is: ' + result.secure_url);
							}).end( req.file.buffer );

						console.log('upload incremented');
					});
				})	    
			}
		})	
	}
  });

//=============================================================================================
//GET AN ARRAY OF PHOTOS SORTED BY DATE
//=============================================================================================
apiRouter.get('/worldPhoto',function(req,res){
	
	//sort from newest to oldest
	Photos.find().sort('-time').exec(function(err, aPhoto) {
		if (err) return res.send(err);

		// return the users
		res.json(aPhoto);
	  })

});
//=============================================================================================
//GET AN ARRAY OF THE TOP LEADERBOARD RANKING
//=============================================================================================
apiRouter.get('/leaderboards',function(req,res){

	User.find().sort('-discoveries').exec(function(err,aUser){
		if (err) return res.send(err);
		res.json(aUser);
	})

});


//--------------------------------------------------------------------------------------------


function toRadians (angle) {
	return angle * (Math.PI / 180);
  }

function calcDistance(reqBody) {
	var lon1 = parseFloat(reqBody.longA);
	var	lat1 = parseFloat(reqBody.latA);

	//provide info for picture B
	var lon2 = parseFloat(reqBody.longB);
	var	lat2 = parseFloat(reqBody.latB);

	var win = false;
	
	var R = 6371; // metres
	var φ1 = toRadians(lat1);
	//console.log(φ1 + " phi1");
	var φ2 = toRadians(lat2);
	//console.log(φ2 + " phi2");
	var Δφ = toRadians(lat2-lat1);
	//console.log(Δφ + " dPhi");
	var Δλ = toRadians(lon2-lon1);
	//console.log(Δλ + " dLambda");

	var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
			Math.cos(φ1) * Math.cos(φ2) *
			Math.sin(Δλ/2) * Math.sin(Δλ/2);
	//console.log(a + " a");
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	//console.log(c + " c");

	var d = R * c;
	console.log(d);
	return d;
}

//=============================================================================================
//COMPARE GPS COORDINATES
//=============================================================================================
apiRouter.post('/gpscompare',function(req,res){

	var win = false;

    var authToken = req.body.token;
    var decoded = jwt.decode(authToken, process.env.superSecret);
	
	if(calcDistance(req.body) < 2){
		win = true;

		//var tempUsername = decoded.username;
		console.log(decoded.username);
		User.findOneAndUpdate({"username" : decoded.username}, {$inc: { "discoveries" : 1 }}, function(err, doc) {
			if(err) {throw err; }
			else { console.log('Updated')}
		});

	}

	if(win===true) res.json({success: true, message: 'correct guess'});
	else res.json({success: false, message: 'nope, incorrect guess'});

});

// REGISTER OUR ROUTES -------------------------------
app.use('/api', apiRouter);
// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);