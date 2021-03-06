'use strict';

var dls = {};
var write_log = false;

browser.runtime.onMessage.addListener(handleMessages);
browser.downloads.onChanged.addListener(handleChanged);

loadOptions();

function parseDate(input) {
  // 2018-06-12T17:59:54.000Z
  return new Date(Date.UTC(
    parseInt(input.slice(0, 4), 10),
    parseInt(input.slice(5, 7), 10) - 1,
    parseInt(input.slice(8, 10), 10),
    parseInt(input.slice(11, 13), 10),
    parseInt(input.slice(14, 16), 10),
    parseInt(input.slice(17, 19), 10)
  ));
}

function notify(dl_id) {
  var mes = dls[dl_id];
  browser.notifications.create({
    "type": "basic",
    "iconUrl": getPicUrl(mes),
    "title": "Your IG download has completed!",
    "message": `Successfully downloaded ${mes.user}'s picture posted on ${
      parseDate(mes.timestamp).toLocaleString('en-US', { weekday: 'short',
                                                         year: 'numeric',
                                                         month: 'long',
                                                         day: 'numeric' })}.`
  }).catch(onError);
}

function onStartedDownload(message, id) {
  if (write_log) console.log(`Started downloading for ${message.user}: ${id} with ${message.artefact_icon}`);

  // store message based on id
  dls[id] = message;

  // notify content script
  browser.tabs.sendMessage(message.sender.tab.id, {
    msg: "download_started",
    digest: message.digest,
    artefact_type: message.artefact_type,
    artefact_icon: message.artefact_icon,
    artefact_id: id
  }).catch(onError);
}

function onFailed(error) {
  console.log(`Download failed: ${error}`);
}

function handleChanged(delta) {
  try {
    if (write_log) console.log(`background.js: dl_changes ${delta.id}, ${delta.state.current}, ${delta.bytesReceived}, ${delta.error.current}`);
  } catch(ex) {}

  if (delta.state && delta.state.current === "complete") {
    if (write_log) console.log(`background.js: Download ${delta.id} has completed. ${dls[delta.id].artefact_icon}`);

    // notify content script
    browser.tabs.sendMessage(dls[delta.id].sender.tab.id, {
      msg: "download_completed",
      digest: dls[delta.id].digest,
      artefact_type: dls[delta.id].artefact_type,
      artefact_icon: dls[delta.id].artefact_icon,
      artefact_id: delta.id
    }).catch(onError);

    // show browser notification
    try {
      if (dls[delta.id].artefact_icon == 'image' || dls[delta.id].artefact_icon == 'file-video') { notify(delta.id) }
    } catch(ex) {}

    // remove completed downloads from browser
    browser.downloads.erase({
      id: delta.id
    })
    .then(ids => {
      if (write_log) console.log(`background.js: Erased downloads: ${ids}`);
    }, error => {
      console.log(`background.js: Error erasing download: ${error}`);
    });

    if (write_log) console.log(`background.js: Content of DLs: ${Object.keys(dls).length}`);

    // remove message reference from download store
    dls[delta.id] = undefined;

    // remove stuck downloads
    if (write_log) console.log(`background.js: Checking for stuck downloads...`);
    browser.downloads.search({
      urlRegex: 'cdninstagram\.com',                            // downloads from instagram
      startedBefore: new Date(new Date().getTime() - 1000*60*5) // started more than 5 minutes ago
    })
    .then(downloads => {
      for (let download of downloads) {
        console.log(download.id);
        console.log(download.state);
        console.log(download.url);
        console.log(download.error);
        console.log(download.filename);
        browser.downloads.cancel(download.id).then(
          () => {
            if (write_log) console.log(`background.js: Cancelled stuck download`);
          },
          error => {
            if (write_log) console.log(`background.js: Error cancelling download: ${error}`);
          }
        );
      }
    }, error => {
      console.log(`background.js: Error removing stuck download: ${error}`);
    });

    // delete download from browser history
    //browser.browsingData.removeDownloads({ originTypes: "extension" }).catch(onError);
  }
}

function getPicUrl(message) {
  if (message.url.constructor === Array) {
    return message.url[1];
  } else {
    return message.url.split('|')[0];
  }
}

function getPicUrls(message) {
  if (message.url.constructor === Array) {
    return [message.url[1]];
  } else {
    return message.url.split('|');
  }
}

function getVidUrl(message) {
  if (message.url.constructor === Array) {
    return message.url[0];
  } else {
    return undefined;
  }
}

function downloadPic(message) {
  var vid_url = getVidUrl(message);
  var pic_url = getPicUrls(message);

  var parser = document.createElement('a');
  pic_url.forEach(function(el){
    parser.href = el;
    parser.filename = parser.pathname.substring(parser.pathname.lastIndexOf('/') + 1);
    if (write_log) console.log(`background.js: pic filename: ${message.user + "/" + parser.pathname}`);

    browser.downloads.download({
      url: el,
      filename: "ig_downloads/" +
                 message.user + "/" +
                 parser.filename,
      conflictAction: 'overwrite',
      allowHttpErrors: true,
      headers: [
        { name: "Accept", value: "image/webp,*/*" },
        { name: "Referer", value: "https://www.instagram.com/" }
      ]
    })
    .then(dl_id => onStartedDownload(Object.assign({}, message, {artefact_type: 'picture', artefact_icon: 'image'}), dl_id), onFailed);
  });

  var d_vid;
  if (vid_url) {
    parser.href = vid_url;
    parser.filename = parser.pathname.substring(parser.pathname.lastIndexOf('/') + 1);
    if (write_log) console.log(`background.js: vid filename: ${message.user + "" + parser.pathname}`);

    browser.downloads.download({
      url: vid_url,
      filename: "ig_downloads/" +
                 message.user + "/" +
                 parser.filename,
      conflictAction: 'overwrite'
    })
    .then(dl_id => onStartedDownload(Object.assign({}, message, {artefact_type: 'video', artefact_icon: 'file-video'}), dl_id), onFailed);
  }

  // Set up post file for download
  try {
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

    if (write_log) console.log(`filename.txt: ${a.download}`);
    browser.downloads.download({
      url: a.href,
      filename: a.download,
      conflictAction: 'overwrite'
    })
    .then(dl_id => onStartedDownload(Object.assign({}, message, {artefact_type: 'post data (json)', artefact_icon: 'file-code'}), dl_id), onFailed);
  } catch (e) {
    console.warn(`background.js: couldn't download post ${e}`);
  }

  // Set up profile info file for download
  getProfile(message);
}

function handleMessages(message, sender) {
  message.sender = sender;
  switch (message.msg) {
    case "store_pic":
      downloadPic(message);
      break;
    case "updated_config":
      loadOptions();
      browser.tabs.query({url: "*://*.instagram.com/*"}).then(notifyTabs, onError);
      break;
    default:
      if (write_log) console.log(`background.js: Received unhandled message: ${message}`);
  }
}

// notify tabs about new config
function notifyTabs(tabs) {
  for (let tab of tabs) {
    if (write_log) console.log(tab.url);
    browser.tabs.sendMessage(
      tab.id,
      {msg: "reload_config"}
    ).catch(onError);
  }
}

function onError(error) {
  console.log(`background.js: ${error}`);
}

function getProfileFromWeb(message, responseText) {
  if (write_log) console.log(`background.js: received profile response (${responseText})`);
  var profile_pic_url_hd;

  try {
    var re = /{"user":{"biography":"([^"]*)/;
    var f = responseText.match(re);
    message.bio = f[1];
    if (write_log) console.log(`background.js: bio (${f[1]})`);

    re = /"full_name":"([^"]*)/;
    f = responseText.match(re);
    message.bio = f[1] + ' - ' + message.bio;
    if (write_log) console.log(`background.js: full name (${f[1]})`);

    re = /"profile_pic_url_hd":"([^"]*)/
    f = responseText.match(re);
    profile_pic_url_hd = f[1];
  } catch (e) {
    console.log(`background.js: Error finding bio: ${e}`);
  }

  // save profile
  var ab = document.createElement('a');
  var fileb = new Blob([message.bio],
                       {type: 'text/plain', charset: 'utf-8'});
  ab.href = URL.createObjectURL(fileb);
  ab.download = "ig_downloads/" +
                message.user +
                `/profile__${new Date().toISOString().split('T')[0]}` + ".txt";

  if (write_log) console.log(`filename_profile.txt: ${ab.download}`);
  browser.downloads.download({
    url: ab.href,
    filename: ab.download,
    conflictAction: 'overwrite'
  })
  .then(dl_id => onStartedDownload(Object.assign({}, message, {artefact_type: 'profile', artefact_icon: 'address-card'}), dl_id), onFailed);

  // save profile pic
  var parser = document.createElement('a');
  parser.href = profile_pic_url_hd;
  parser.filename = parser.pathname.substring(parser.pathname.lastIndexOf('/') + 1);
  browser.downloads.download({
    url: profile_pic_url_hd,
    filename: "ig_downloads/" +
               message.user + "/profile_pics/" +
               parser.filename,
    conflictAction: 'overwrite'
  })
  .then(dl_id => onStartedDownload(Object.assign({}, message, {artefact_type: 'profile picture', artefact_icon: 'id-badge'}), dl_id), onFailed);
}

// get bio either from content page or from the profile page
function getProfile(message) {
  if (write_log) console.log(`background.js: do we have a bio? >${message.bio}<`);
  if (message.bio == '') {
    if (self.fetch) {
      fetch("https://www.instagram.com/" + message.user, {
        method: "GET",
        credentials: 'same-origin'
      })
      .then(response => response.text())
      .catch(error => console.error('Error:', error))
      .then(response => getProfileFromWeb(message, response));
    } else {
      try {
        var oReq = new XMLHttpRequest();
        oReq.addEventListener("load", function() { getProfileFromWeb(message, this.responseText) } );
        oReq.open("GET", "https://www.instagram.com/" + message.user);
        oReq.send();
      } catch (e) { console.log(`background.js: Couldn't retrieve profile: ${e}`); }
    }
  } else {
    // save profile
    var ab = document.createElement('a');
    var fileb = new Blob([message.bio],
                         {type: 'text/plain', charset: 'utf-8'});
    ab.href = URL.createObjectURL(fileb);
    ab.download = "ig_downloads/" +
                  message.user +
                  `/profile__${new Date().toISOString().split('T')[0]}` + ".txt";

    if (write_log) console.log(`filename_profile.txt: ${ab.download}`);
    browser.downloads.download({
      url: ab.href,
      filename: ab.download,
      conflictAction: 'overwrite'
    })
    .then(dl_id => onStartedDownload(Object.assign({}, message, {artefact_type: 'profile', artefact_icon: 'address-card'}), dl_id), onFailed);
  }
}

// Load config
function loadOptions() {
  browser.storage.local.get([
    "write_log"
  ])
  .then(result => {
    if (write_log) console.log("background.js: loading config");
    write_log = result.write_log || false;
  }, error => {
    console.log(`Error: ${error}`);
  });
}
