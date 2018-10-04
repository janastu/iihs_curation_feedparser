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
var fs = require("fs");
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
var port=process.env.feedParserPort || 3600;


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
//	var db ='feeds_new';//for development environment
//Import client url to set cors

//var clienturl='localhost:4200';
	var clienturl=process.env.clienturl;//for production environment

	var clienturlwithprotocol= dbprotocol + clienturl;
	console.log(clienturlwithprotocol);

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
  cronTime: '00 */3 * * * *',
  onTick: function() {
  	//console.log('running every minute 1, 2, 4 and 5');
    console.log('job 1 ticked');
    	pullFeedsAndUpdate(function(err,response){
    		//console.log('Response updated',response);
    	});

    },
  start: true	,
  timeZone: 'America/Los_Angeles'
});
//console.log('job1 status', job1.running); // job1 status undefined
job1.start();
console.log('job1 status running', job1.running); // job1 status undefined
function pullFeedsAndUpdate(callback) {
	var feedstoUpdate;
	fs.readFile('feeds.json', (err, data) => {
			var cachedFeeds = JSON.parse(data);
			var feedlink;
			//console.log(cachedFeeds)
				cachedFeeds.table.map(file=>{

						if(file.metadata.title){
							//console.log("".file.)
							if(file.metadata.xmlurl == null){
								feedlink=file.metadata.link;
							}
							else {
								feedlink=file.metadata.xmlurl;
							}
						}

						if(feedlink!=undefined){
							console.log("url",feedlink)
							getFeed (feedlink,function (err,feedItems,meta) {
							if(!err){
								console.log("items before update",meta.categories,file.items.length);
								if(meta.categories == undefined){
									//console.log("items",meta,file.metadata);
									if(meta.link==file.metadata.link){
											feedstoUpdate = differenceOfFeeds(feedItems,file.items);
											//console.log(feedstoUpdate);
											if(feedstoUpdate.length>0){
												feedstoUpdate.map(toUpdatefeed=>{
													file.items.push(toUpdatefeed);
												})

											//console.log("items after update",meta.categories[0],file.items.length);
											}


									}
								}
								else{
									//console.log(meta.categories[0],file.metadata.categories[0]);
								if(meta.categories[0]==file.metadata.categories[0]){
										feedstoUpdate = differenceOfFeeds(feedItems,file.items);
										//console.log(feedstoUpdate);
										if(feedstoUpdate.length>0){
											feedstoUpdate.map(toUpdatefeed=>{
												file.items.push(toUpdatefeed);
											})

										//console.log("items after update",meta.categories[0],file.items.length);
										}

									}
								}

								console.log("items after update",meta.categories,file.items.length);
								fs.writeFile('feeds.json', JSON.stringify(cachedFeeds), (err) => {
								if (err) {
									console.error(err);
									return;
								};
								//res.send(cachedFeeds);
									//callback(undefined,{'update':true,'category':meta.categories[0] || meta.title});
							});
							}
							});
						}
				});



	});
}


//Get all user's subscription links and check for the last
function getUsersSubscriptionsLinks(callback){

	//options to get the user subsrciptions from the user's database
		const options = {
		  method: 'GET',
		  uri: url + '/' + db +'/_design/feeds/_view/link?reduce=true&group_level=2',
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
				//link.doc.metadata.map(userlink=>{
					//console.log("all",	userlink)
					//Hack only to update the mediamonitor subscriptions
					//Check if the xml rss link is null
					/*if(userlink.xmlurl == null){
						var feedlink=userlink.link;
					}
					else{
						feedlink=userlink.xmlurl;
					}*/
					//Get feeds from the newsrack by passing the link as parameter
						getFeed (link.key[0],function (err, feedItems) {
							//console.log(err)
							//console.log("klin",link.key[0]);
							if (!err && feedItems[0]!= undefined && feedItems[feedItems.length-1]!=undefined) {
									getSortedfeeds(feedItems,function (err,sortedFeeds) {
											//console.log("sorted",sortedFeeds);

									//Get feeds from the db by passing the feedname
										getfeedsFromdb(link.key[1],sortedFeeds[feedItems.length-1].pubdate,sortedFeeds[0].pubdate,function(err,feedsFromDb){
						  		//console.log(feedsFromDb.length);
									//console.log("feedslink",link.key[0]);

						 			//Check if feeds from database exists
						  		if(feedsFromDb.length>0){


										var feedstoUpdate = differenceOfFeeds(feedsFromDb,sortedFeeds);

										if(feedstoUpdate.length > 0){
										//console.log(feedstoUpdate.length);;
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

								});
							})

						}
					});

				});
		  	}
		  	}
			});

}
//Function to fetch sorted feeds
function getSortedfeeds(feedItems,callback){
	var sortedFeeds = feedItems.sort(function(a, b) {
     // console.log("datea",a,b)
      return new Date(b.pubdate).getTime() - new Date(a.pubdate).getTime()
    });
		callback(undefined,sortedFeeds);
		//console.log("datea",sortedFeeds)
}

//Fumction to get feeds from database on feedname
function getfeedsFromdb(feedname,startkey,endkey,callback) {
	//console.log(feedname,startkey,endkey)
  //var d = new Date();
   //var previousweek= new Date(d.getTime() -   72 * 60 * 60 * 1000);
	 //console.log(url+'/' + db + '/_design/feeds/_view/feedsondate?startkey=["'+startkey.toISOString()+'"]&endkey=["'+endkey.toISOString()+'"]');
	request(url+'/' + db + '/_design/feeds/_view/feedsondate?startkey=["'+startkey.toISOString()+'"]&endkey=["'+endkey.toISOString()+'"]', function(err, res, body) {
			//console.log("catte",);
		if(body != undefined && JSON.parse(body).error!== 'query_parse_error'){
				//console.log("uncategroisedfeeds",body);
			//callback(undefined,JSON.parse(body).rows);

				var categorisedfeeds = JSON.parse(body).rows.filter(catname=>{
        	return catname.value.feedname === feedname;
      	})
				console.log("categroisedfeeds",feedname,categorisedfeeds.length);
     		callback(undefined,JSON.parse(body).rows);



		}

	});
	//console.log(feedname);
	//Check if metacategory is defined and fetch the feeds
		/*if(feedname.categories[0] == undefined){
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
		}*/
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
		console.log("feedarr length",feedsarray.length,feedItems.length);


	var res = _.differenceBy(feedsarray,feedItems,'title');
		console.log("result",res.length)

		return res;




}
//cors settings
//app.use(cors());
app.use(function(req, res, next) {
  //var allowedOrigins = ['http://127.0.0.1:8020', 'http://localhost:8020', 'http://127.0.0.1:9000', 'http://localhost:9000'];
 	console.log(clienturlwithprotocol, req.headers.origin, "client url with protocol");
   var allowedOrigins=clienturlwithprotocol;
  var origin = req.headers.origin;
  if(allowedOrigins === origin){
       res.setHeader('Access-Control-Allow-Origin', allowedOrigins);
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
app.get('/updatedfeeds',cors(),function(req, res) {

	var syncStatus;
	fs.readFile('feeds.json', (err, data) => {
			var cachedFeeds = JSON.parse(data);
			//res.send(cachedFeeds);
			//
		//	console.log(req.query.date)
			cachedFeeds.table.map(file=>{
					//console.log("res",syncStatus);
				if(file.metadata.categories){

					if(file.metadata.categories[0] == undefined){
							//console.log(req.query.user,file.metadata.title);
						if(req.query.channel == file.metadata.link){
								//console.log(file.metadata);
									var results = file.items.filter(feed=>{

										return feed.pubdate >= req.query.date;
									})
								//	console.log("undefe",results.length);
							 res.send(results);
						}
					}
					else{
					if(req.query.channel == file.metadata.categories[0]){

								var results = file.items.filter(feed=>{

									return feed.pubdate >= req.query.date;
								})
								console.log("cat",results.length);
					   res.send(results);
					}
				}
					//console.log("contents",file.metadata.categories[0],file.items.length)
				}

			})
	})
	/*getUsersSubscriptionsLinks(function(err,response){
		console.log(response);

		if(response==true){
			//console.log("up",res.headersSent)
			if(!res.headersSent){
				res.writeHead(201, { 'Content-Type': 'text/plain' });
				res.end('ok');
			}
		}
		else if(response == false){
			//console.log("not up",res.headersSent)
			if(!res.headersSent){
				res.writeHead(304, { 'Content-Type': 'text/plain' });
				res.end('ok');
			}
		}

	});*/

});


//Fetch the feeds when user adds a new link
app.get('/first',cors(),function(req, res) {
		var metadataFeeditems = new Array();
	getFeed (req.query.id, function (err, feedItems,meta) {
		if(err){
			//res.send(err);
		console.log("Some grave error", err);
		}
		if (!err) {

			//console.log(feedItems.length);

			//

			fs.readFile('feeds.json', (err, data) => {
					if (err) throw err;
					//console.log(data);
					metadataFeeditems = JSON.parse(data);
						 metadataFeeditems.table.push({'metadata':meta,'items':feedItems})
				 		 fs.writeFile('feeds.json', JSON.stringify(metadataFeeditems), (err) => {
			 				if (err) {
			 					console.error(err);
			 					return;
			 				};

							//console.log(metadataFeeditems);
						metadataFeeditems.table.map(file=>{
							if(file.metadata.categories){
								console.log("contents",file.metadata.categories[0],file.items.length)
								if(meta.categories[0] == file.metadata.categories[0]){
								res.send(file);
								}
								
							}

						})
				});
			});



				//console.log(feedItems.categories);

			//console.log ("There are " + feedItems.length + " items in the feed.\n");
			//console.log(feedItems);
			//res.send(feedItems);
		}
	});
});


//Function to get the parsed json feeds from an xml
function getFeed (urlfeed, callback) {
	//console.log(urlfeed);
	var req = request (urlfeed);
	var feedparser = new FeedParser ();
	var feedItems = new Array ();
	var meta ;

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
		 	meta = this.meta;
				//console.log("mer",this.meta);
			if (item !== null) { //2/9/17 by DW
				feedItems.push (item);

					//console.log(metadataFeeditems);

				}
			}
		catch (err) {
			console.log ("getFeed: err.message == " + err.message);
			}
		});
	//feedparser.on("close");
	feedparser.on ("end", function () {
		callback (undefined,feedItems,meta)
	})



	feedparser.on ("error", function (err) {
		console.log ("getFeed: err.message ==" + err.message);
		callback (err.message);
	});
	}


app.listen(port, () => {
	console.log('Example app listening on port:',port);
	var obj = {
   table: []
};


/*obj.table.push({'metadata':'metadata','items':'items'});

var json = JSON.stringify(obj);
fs.writeFile('feeds.json', json);*/

})
