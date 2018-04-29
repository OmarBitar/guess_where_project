# guess_where_project
author: Omar Bitar

in this read me i will give you a full descreption of how the app works.
please not that in post man there is description there as will if you click
on each folder.

follow along with the UI diagram that i posted on slack because i will try
to follow its oreder as i explain how everything works.

i also included a postman link at the bottom of this page. please read this
doucumentation and the discreption on postman collections. if you have any
question hit me up.

*NOTE for all the requests in the bodyto the api make sure it the data that is 
being sent is in 'x-www-form-urlencoded' format

****************************************************************************
SIGN UP ROUTE
****************************************************************************
new users will create new accounts, no duplicates is alowed, i included tests
in postman that tests for unsucessfull requests.

data requierd in the body is:-
name: string
username: string
password: string

see respones in postman
****************************************************************************
SIGN IN ROUTE
https://guesswhereproject.herokuapp.com/api/signup
****************************************************************************
in this rout here is where all the data about the user will be sent back.
so to get data for the profile page, THIS is the route that will provide
the data.
also note that the token will be provided only on THIS route. all other
routes will require this token. note that the token will note be stored
in the database. everytime a user signs in a new token will be provied.
and the token will expire in 24 hours.

data requierd in the body is:-
username: string
password: string

see respones in postman.
****************************************************************************
****************************************************************************
NOTE EVERY ROUTE UNDER HERE REQUIERS THE TOKEN FROM THE SIGN IN
****************************************************************************
****************************************************************************
CREATE CHALLENGE ROUTE
https://guesswhereproject.herokuapp.com/api/photos?photoUpload=<img url>
****************************************************************************
in the profile page, (refer to diagram) there is a button that says upload
photo(im thinking on renaming it to "create challenge"), this button should
call this route and sent to it the folowing:-

in body:-
username: string
pLongitude: int
pLatitude: in

in paramiters
a link to the image
*so i know we said we were going to send buffer data to the api, but i sill
having figue out how to convert that to a string. so DANIAL if you can send
me a link then we are good i am sure that there must be a way to do it in 
android , otherwise if you can send me an jpg or png we still good, otherwise
we need to find a way to convert the buffer data to a string somehow and append 
it with ".jpg:, for the time being use image links to test this route.

in the back end this route will genereat the some code and store it to the cloud
as a link. and everytime the user uploads the photo the upload count will 
increment in the backend, so there is no need to do anything in the front end.

see respones in postman.
****************************************************************************
LEADERBOARDS ROUTE
https://guesswhereproject.herokuapp.com/api/leaderboards
****************************************************************************
retuns an array of all the users acounts sorted by 'uploads'
nothing other than the tokens is required to send to that route.
see respones in postman.
****************************************************************************
WORLD PHOTOS ROUTE
https://guesswhereproject.herokuapp.com/api/worldPhoto
****************************************************************************
returns a list of all the photos with thiere location and url. they are 
sorted by date from newest to oldest.
nothing other than the token is requerd to send to it.
*NOTE so in the phone there is a slide of all photos if you click on one
you get the data about that photo, the data we need is long, lat, and url
from here the user is taken to the page where you post an image to compare,
you cant go to that page if you dont visit this rout first, this is VERY 
important.
****************************************************************************
DO CHALLENGE
https://guesswhereproject.herokuapp.com/api/gpscompare
****************************************************************************
over here is where the comparisons of the locations of the two photos happens
and an appropriate resonse will be sent back.
the location of image 1 will be provided from the WORLD PHOTOS ROUTE as explaind
earlier, and the location of image 2 will be handeld by the front end.
so to sum it up, location of two images will be sent to this path and 
results.

so for this is what sould be sent to the body:-

(image one location that wall provided from the WORLD PHOTOS ROUTE)
longA: int
latA: int

(new temporary image uploded by a challenger) (note this image will not be stored)
longB: int
latB: int

i provided some staring code for erik and chris, i proveded what you will recive
and what will you send, all what you guys have to do left is to create the code
that will implement the google api and determine the readius, i dont think
that you guys will need to access any other data from the server other than the
data that is proveded from the front end.

i havent created the postman for this route but i did create the route. if you 
scroll all the way down on the server.js page you will see a route called 
"/gpscompare", iv started a little on it, i hope you guys can pick off from there.

that's it folks good luck to you all

here is a link for the updated postman:-
[![Run in Postman](https://run.pstmn.io/button.svg)](https://app.getpostman.com/run-collection/d2fa42720e11027839cf)
