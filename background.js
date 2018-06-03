'use strict';

var dls = [];

browser.runtime.onMessage.addListener(handleMessages);
browser.downloads.onChanged.addListener(handleChanged);

function notify(mes) {
  //var m = mes.toString().split('/');
  browser.notifications.create({
    "type": "basic",
    "title": "Your IG download has completed!",
    "message": `Download "${mes}" is done.`
  });
}

function onStartedDownload(id) {
  console.log(`Started downloading: ${id}`);
}

function onFailed(error) {
  console.log(`Download failed: ${error}`);
}

function handleChanged(delta) {
  if (delta.state && delta.state.current === "complete") {
    console.log(`Download ${delta.id} has completed.`);
    var search_dl = browser.downloads.search({"id": delta.id});
    search_dl.then(function(dls) {
      for (var dl of dls) {
        console.log(dl.url);
        if (dl.url.indexOf('cdninstagram.com') > 0) { notify(dl.url); }
      }
    });
  }
}

function downloadPic(message) {
  var vid_url;
  var pic_url;

  if (message.url.constructor === Array) {
    vid_url = message.url[0];
    pic_url = message.url[1];
  } else {
    pic_url = message.url;
  }

  var parser = document.createElement('a');
  parser.href = pic_url;
  parser.filename = parser.pathname.substring(parser.pathname.lastIndexOf('/') + 1);
  console.log(`background.js: pic filename: ${message.user + "" + parser.pathname}`);

  var d_img = browser.downloads.download({
    url: pic_url,
    filename: "ig_downloads/" +
               message.user + "/" +
               parser.filename,
    conflictAction: 'overwrite'
  });
  d_img.then(onStartedDownload, onFailed);

  var d_vid;
  if (vid_url) {
    parser.href = vid_url;
    parser.filename = parser.pathname.substring(parser.pathname.lastIndexOf('/') + 1);
    console.log(`background.js: vid filename: ${message.user + "" + parser.pathname}`);

    d_vid = browser.downloads.download({
      url: vid_url,
      filename: "ig_downloads/" +
                 message.user + "/" +
                 parser.filename,
      conflictAction: 'overwrite'
    });
    d_vid.then(onStartedDownload, onFailed);
  }

  // Set up post file for download
  var a = document.createElement('a');
  var obj = new Object();
  obj.post = message.post;
  obj.timestamp = message.timestamp;
  obj.location = message.location;
  obj.bio = message.bio;
  var file = new Blob([JSON.stringify(obj)], {type: 'text/json', charset: 'utf-8'});
  a.href = URL.createObjectURL(file);
  a.download = "ig_downloads/" +
               message.user + "/" +
               parser.filename.substring(0, parser.filename.lastIndexOf('.')) + ".json";

  console.log(`filename.txt: ${a.download}`);
  var d_post = browser.downloads.download({
    url: a.href,
    filename: a.download,
    conflictAction: 'overwrite'
  });
  d_post.then(onStartedDownload, onFailed);

  // Set up profile info file for download
  getProfile(message);
}

function handleMessages(message) {
  switch (message.msg) {
    case "store_pic":
      downloadPic(message);
      break;
    case "updated_config":
      var querying = browser.tabs.query({url: "*://*.instagram.com/*"});
      querying.then(notifyTabs, onError);
      break;
    default:
      console.log(`background.js: Received unhandled message: ${message}`);
  }
}

// notify tabs about new config
function notifyTabs(tabs) {
  for (let tab of tabs) {
    console.log(tab.url);
    browser.tabs.sendMessage(
      tab.id,
      {msg: "reload_config"}
    ).catch(onError);
  }
}

function onError(error) {
  console.log(`background.js: Error notifying tabs: ${error}`);
}

// get bio either from content page or from the profile page
function getProfile(message) {
  console.log(`background.js: do we have a bio? >${message.bio}<`);
  if (message.bio == '') {
    var oReq = new XMLHttpRequest();
    oReq.addEventListener("load", function(e) {
      console.log(`background.js: received profile response (${this.responseText})`);
      var profile_pic_url_hd;

      try {
        var re = /{"user":{"biography":"([^"]*)/;
        var f = this.responseText.match(re);
        message.bio = f[1];
        console.log(`background.js: bio (${f[1]})`);

        re = /"full_name":"([^"]*)/;
        f = this.responseText.match(re);
        message.bio = f[1] + ' - ' + message.bio;
        console.log(`background.js: full name (${f[1]})`);

        re = /"profile_pic_url_hd":"([^"]*)/
        f = this.responseText.match(re);
        profile_pic_url_hd = f[1];
      } catch (e) {
        console.log(`backhround.js: Error finding bio: ${e}`);
      }

      // save profile
      var ab = document.createElement('a');
      var fileb = new Blob([message.bio],
                           {type: 'text/plain', charset: 'utf-8'});
      ab.href = URL.createObjectURL(fileb);
      ab.download = "ig_downloads/" +
                    message.user +
                    `/profile__${new Date().toISOString().split('T')[0]}` + ".txt";

      console.log(`filename_profile.txt: ${ab.download}`);
      var d_bio = browser.downloads.download({
        url: ab.href,
        filename: ab.download,
        conflictAction: 'overwrite'
      });
      d_bio.then(onStartedDownload, onFailed);

      // save profile pic
      var parser = document.createElement('a');
      parser.href = profile_pic_url_hd;
      parser.filename = parser.pathname.substring(parser.pathname.lastIndexOf('/') + 1);
      var d_profile_pic = browser.downloads.download({
        url: profile_pic_url_hd,
        filename: "ig_downloads/" +
                   message.user + "/profile_pics/" +
                   parser.filename,
        conflictAction: 'overwrite'
      });
      d_profile_pic.then(onStartedDownload, onFailed);
    });
    oReq.open("GET", "https://www.instagram.com/" + message.user);
    oReq.send();
  } else {
    // save profile
    var ab = document.createElement('a');
    var fileb = new Blob([message.bio],
                         {type: 'text/plain', charset: 'utf-8'});
    ab.href = URL.createObjectURL(fileb);
    ab.download = "ig_downloads/" +
                  message.user +
                  `/profile__${new Date().toISOString().split('T')[0]}` + ".txt";

    console.log(`filename_profile.txt: ${ab.download}`);
    var d_bio = browser.downloads.download({
      url: ab.href,
      filename: ab.download,
      conflictAction: 'overwrite'
    });
    d_bio.then(onStartedDownload, onFailed);
  }
}
