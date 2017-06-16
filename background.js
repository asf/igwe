'use strict';

var dls = [];

browser.runtime.onMessage.addListener(download);
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
    notify(delta.id);
  }
}

function download(message) {
  var parser = document.createElement('a');
  parser.href = message.url;
  parser.filename = parser.pathname.substring(parser.pathname.lastIndexOf('/') + 1);
  console.log(`filename: ${message.user + "" + parser.pathname}`);

  var d_img = browser.downloads.download({
    url: message.url,
    filename: "ig_downloads/" +
               message.user + "/" +
               parser.filename,
    conflictAction: 'overwrite'
  });
  d_img.then(onStartedDownload, onFailed);

  // Set up post file for download
  var a = document.createElement('a');
  var file = new Blob([message.post], {type: 'text/plain', charset: 'utf-8'});
  a.href = URL.createObjectURL(file);
  a.download = "ig_downloads/" +
               message.user + "/" +
               parser.filename.substring(0, parser.filename.lastIndexOf('.')) + ".txt";

  console.log(`filename.txt: ${a.download}`);
  var d_post = browser.downloads.download({
    url: a.href,
    filename: a.download,
    conflictAction: 'overwrite'
  });
  d_post.then(onStartedDownload, onFailed);

  // Set up profile info file for download
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
