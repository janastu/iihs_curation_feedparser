const express = require('express')
const app = express();
var cors = require('cors')
//Import feed parser to parse the xml feeds to json
var FeedParser = require('feedparser');
// Load the full build.
var _ = require('lodash');
// Load the core build.
//var _ = require('lodash/core');
// Load the FP build for immutable auto-curried iteratee-first data-last methods.
var fp = require('lodash/fp');
 
// Load method categories.
var array = require('lodash/array');
var object = require('lodash/fp/object');
 
// Cherry-pick methods for smaller browserify/rollup/webpack bundles.
var at = require('lodash/at');
var curryN = require('lodash/fp/curryN');
//Import and add btoa 
var btoa = require('btoa');
//Import and add cron 
//var cron = require('cron');
//Import request to make http requests
const request = require ("request");
//Import db protocol from environment and store in variable
var dbprotocol = process.env.dbprotocol;//for production environment
//var dbprotocol = 'http://';
//Import db port of feedparser service from environment and store in variable
var port=process.env.feedParserPort || 3500;


//connecting to couch db
//Import database host like 'mmcouch.test.openrun.net'
var dbhost=process.env.dbhost;
//Import database port like 5984 for couchdb in local (localhost:5984)
var dbport=process.env.dbPort;
//Import database username and password from the environment
var dbusername = process.env.dbuser; //for production environment
//var dbusername = 'admin';//for development environment
var dbpassword = process.env.dbpassword; //for production environment
//var dbpassword = 'admin';//for development environment
//The complete url of database host with protocol
var url = dbprotocol+dbhost; //for production environment
	//var url = 'http://localhost:5984';//for development environment
//Import database feeds from environment variable
var db = process.env.feeddbname; //for production environment
	//var db ='feeds';//for development environment
//Import client url to set cors	
	
//var clienturl='localhost:4200';
		var clienturl=process.env.clienturl;//for production environment

	var clienturlwithprotocol= dbprotocol + clienturl;
	//console.log(clienturlwithprotocol);

/*  The MIT License (MIT)
	Copyright (c) 2014-2017 Dave Winer
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
	*/
/*Cron job try*/
var cron = require('cron');

var job1 = new cron.CronJob({
  cronTime: '* * */3 * * 0-6',
  onTick: function() {
  	//console.log('running every minute 1, 2, 4 and 5');
    console.log('job 1 ticked');
    	getUsersSubscriptionsLinks(function(err,response){
    		console.log('Response updated',response);
    	});

    },
  start: false,
  timeZone: 'America/Los_Angeles'
});
//console.log('job1 status', job1.running); // job1 status undefined
job1.start();
console.log('job1 status running', job1.running); // job1 status undefined
//Get all user's subscription links and check for the last 	
function getUsersSubscriptionsLinks(callback){
	//options to get the user subsrciptions from the user's database
	const options = {
	  method: 'GET',
	  uri: 'http://stage-couch.test.openrun.net/supertest%24mediamonitor18/_all_docs?include_docs=true',
	  headers: {
	    'Content-Type': 'application/json',
	    'Authorization': 'Basic '+btoa(dbusername+':'+dbpassword)
	  }
	}
request(options, function(err, res, body) {
		if(body != undefined){
			//console.log(JSON.parse(body).rows)
		if(JSON.parse(body).rows.length > 0){	

		//Parse the result to json and store the user's link in an array
		JSON.parse(body).rows.map(link=>{
			//console.log("all",link.key[0],link.key[1]);
			link.doc.metadata.map(userlink=>{
				//console.log("all",userlink)
				//Hack only to update the mediamonitor subscriptions
				//Check if the xml rss link is null
				if(userlink.xmlurl == null){
					var feedlink=userlink.link;
				}	
				else{
					feedlink=userlink.xmlurl;
				}
				//Get feeds from the db by passing the feedname 
				getfeedsFromdb(userlink,function(err,feedsFromDb){
					  		console.log(feedsFromDb.length);
				  	//Get feeds from the newsrack by passing the link as parameter
					getFeed (feedlink,function (err, feedItems) {
						//console.log(feedItems);
					 //Check if feeds from database exists	
					  if(feedsFromDb.length>0){	
						if (!err) {
							
							var feedstoUpdate = differenceOfFeeds(feedsFromDb,feedItems);
							
							if(feedstoUpdate.length > 0){
								
								updateDB(feedstoUpdate,link.key[1],function(err,response){
									//console.log(response);
									if(response){
										callback(undefined,true);
									}
								})
							}
							else{
								callback(undefined,false);
							}	
						}
					  }	
					});
				  
				})
			  
				});
			});
	  	}	
	  	}
		});

}

//Fumction to get feeds from database on feedname
function getfeedsFromdb(feedname,callback) {
	//console.log(encodeURIComponent(feedname))
	/*request(url+'/' + db + '/_design/feeds/_view/categoryfeeds?key="'+encodeURIComponent(feedname)+'"', function(err, res, body) {
		console.log("catte",feedname,JSON.parse(body).rows.length);
		if(body != undefined){
			callback(undefined,JSON.parse(body).rows);				
		}
			  
	});*/
	//console.log(feedname);
	//Check if metacategory is defined and fetch the feeds
		if(feedname.categories[0] == undefined){
			//console.log(feed);
			request(url+'/' + db + '/_design/feeds/_view/categoryfeeds?key="'+feed.doc.feedname+'"', function(err, res, body) {
				console.log("catte",JSON.parse(body).rows.length);
				if(body != undefined){
					callback(undefined,JSON.parse(body).rows);				
				}
					  
			});
		}
		else{
			request(url+'/' + db + '/_design/feeds/_view/metacategoryfeeds?key="'+feedname.categories[0]+'"', function(err, res, body) {
				console.log("meta",JSON.parse(body).rows.length);
				if(body != undefined){
					callback(undefined,JSON.parse(body).rows);				
				}
					  
			});
		}
}
//Function to update the database
function updateDB(data,feedname,callback){
	//console.log(data);
	  data.map(feed=>{
	  	feed.feednme = feedname;
		request.post({
		    url: url +'/'+ db,
		    body: feed,
		    json: true,
		  }, function(err, resp, body) {
		  	callback(undefined,body);
		    //console.log(err,body);
		});

	  });

}
//Function to get the difference feeds from the feeds array from database and feeds array from newsrack
function differenceOfFeeds(feedsarray,feedItems) {
		//console.log("feedarr length",feedsarray.length);
	if(feedsarray.length>0){	
	var databasefeeds = feedsarray.map(value=>{
		//
		delete value.value._id;
		delete value.value._rev;	
		//console.log(value);
		return value.value;

	});
	var res = _.differenceBy(feedItems,databasefeeds,'title');
	//console.log("result",res.length)
	
	return res;


	}
	
}
//cors settings
app.use(function(req, res, next) {
  //var allowedOrigins = ['http://127.0.0.1:8020', 'http://localhost:8020', 'http://127.0.0.1:9000', 'http://localhost:9000'];
 	//console.log(clienturlwithprotocol);
   var allowedOrigins=clienturlwithprotocol;
  var origin = req.headers.origin;
  if(allowedOrigins.indexOf(origin) > -1){
       res.setHeader('Access-Control-Allow-Origin', origin);
  }
  //res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:8020');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Methods', 'POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', true);
  return next();
}); 
//Pull new feeds from newsrack
app.get('/',cors(),function(req, res) {
	var syncStatus;
	getUsersSubscriptionsLinks(function(err,response){
		console.log(response);

		if(response==true){
			console.log("up",res.headersSent)
			if(!res.headersSent){
				res.writeHead(201, { 'Content-Type': 'text/plain' });
				res.end('ok');
			}
		}
		else if(response == false){
			console.log("not up",res.headersSent)
			if(!res.headersSent){
				res.writeHead(304, { 'Content-Type': 'text/plain' });
				res.end('ok');
			}
		}

	}); 

});


//Fetch the feeds when user adds a new link
app.get('/first',cors(),function(req, res) {
	getFeed (req.query.id, function (err, feedItems) {
		if(err){
			//res.send(err);
		console.log("Some grave error", err);
		}
		if (!err) {
			console.log ("There are " + feedItems.length + " items in the feed.\n");
			res.send(feedItems);
		}
	});
});


//Function to get the parsed json feeds from an xml
function getFeed (urlfeed, callback) {
	//console.log(urlfeed);
	var req = request (urlfeed);
	var feedparser = new FeedParser ();
	var feedItems = new Array ();
	req.on ("response", function (response) {
		var stream = this;
		if (response.statusCode == 200) {
			stream.pipe (feedparser);
			}
		//console.log(response);
		});
	req.on ("error", function (err) {
		console.log ("getFeed: err.message == " + err.message);
		callback(err.message);
	});
	feedparser.on ("readable", function () {
		try {
			var item = this.read (), flnew;
			if (item !== null) { //2/9/17 by DW
				feedItems.push (item);
				}
			}
		catch (err) {
			console.log ("getFeed: err.message == " + err.message);
			}
		});
	feedparser.on ("end", function () {
		callback (undefined, feedItems);
		});
	feedparser.on ("error", function (err) {
		console.log ("getFeed: err.message ==" + err.message);
		callback (err.message);
	});
	}


app.listen(port, () => console.log('Example app listening on port '))

