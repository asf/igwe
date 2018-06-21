// Content script that gets injected into IG pages and extracts information
// Sends information to backend script for processing (downloading)

var pic_url_closest = '';
var pic_url_qs = '';
var vid_url_closest = '';
var vid_url_qs = '';
var vid_pic_url_qs = '';
var post_closest = '';
var post_qs = '';
var timestamp_closest = '';
var timestamp_qs = '';
var location_closest = '';
var location_qs = '';
var heart_icon_class = '';
var store_icon_class = '';
var bio_class = '';
var action_bar_qs = '';
var observer;
var write_log = false;
var storeIcon = '';

var se = document.createElement('script');
se.setAttribute('src', 'https://use.fontawesome.com/releases/v5.0.13/js/all.js');
se.setAttribute('integrity', 'sha384-xymdQtn1n3lH2wcu0qhcdaOpQwyoarkgLVxC/wZ5q7h9gHtxICrpcaSUfygqZGOe');
se.setAttribute('crossorigin', 'anonymous');
document.body.appendChild(se);

// Load config when we get injected into the page
loadOptions(function() {
  if (write_log) console.log(`igcs.js: initialize`);
  window.addEventListener("click", notifyExtension);
  addMutationObserver();
  addStoreIcon();
});

function addStoreIcon() {
  var x = document.body.querySelectorAll(action_bar_qs+':not([data-igsiadded])');
  storeIcon = storeIconElement();
  for(var i=0; i < x.length; i++ ) {
    x[i].setAttribute('data-igsiadded', '')
    x[i].appendChild(storeIcon.cloneNode(true));
    if (write_log) console.log(`igcs.js: adding store icon to ${x[i]}`);
  }
}

function storeIconElement() {
  var a = document.createElement('a');
  var cl = document.createAttribute('class');
  cl.value = 'fscHb';
  a.setAttributeNode(cl);

  var img = document.createElement('img');
  var src = document.createAttribute('src');
  var style = document.createAttribute('style');
  cl = document.createAttribute('class');
  src.value = browser.extension.getURL('floppy-o.png');
  style.value = 'width:24px;height:24px;';
  cl.value = 'storeimg';
  img.setAttributeNode(src);
  img.setAttributeNode(style);
  img.setAttributeNode(cl);
  a.appendChild(img);
  return a;
}

function addMutationObserver() {
  var targetNode = document.getElementsByTagName('body')[0];
  var config = { childList: true, subtree: true };
  var callback = function(mutationsList) {
      for(var mutation of mutationsList) {
          if (mutation.type == 'childList') {
              addStoreIcon();
          }
      }
  };

  observer = new MutationObserver(callback);
  observer.observe(targetNode, config);
  if (write_log) console.log(`igcs.js: added observer ${observer}`);
}

// Handle click on heart to download image
function notifyExtension(e) {
  if (write_log) console.log(`igcs.js: click on ${e}`);
  if (e.target.classList.contains(store_icon_class)
    || e.target.classList.contains(heart_icon_class)
    || e.target.classList.contains('storeimg')) {

    show_feedback_in_ui(e);
    collect_info_for_dl(e);
  }
}

function show_feedback_in_ui(e) {
  var img_cont;

  if (write_log) console.log(`igcs.js: entered show_feedback_in_ui (${getDomPath(e.target)})`);
  try {
    img_cont = e.target.closest(pic_url_closest).querySelector(pic_url_qs).parentNode.parentNode;
  } catch(ex) { console.warn(`igcs.js: could not find image: ${ex} (pic_url_closest: ${pic_url_closest}, pic_url_qs: ${pic_url_qs})`) }


  if (img_cont === undefined) {
    try {
      img_cont = e.target.closest(vid_url_closest).querySelector(vid_pic_url_qs).parentNode.parentNode;
      if (write_log) console.log(`igcs.js: show_feedback_in_ui: found video`);
    } catch(ex) { console.warn(`igcs.js: could not find video: ${ex}`) }
  }

  // clear notification section if it exists
  try {
    img_cont.parentNode.parentNode.querySelector('ul[class~="igcs-notice"]').remove();
  } catch (e) {}

  var notice = document.createElement('ul');
  notice.setAttribute('class', 'fa-ul igcs-notice');
  img_cont.parentNode.parentNode.appendChild(notice);
}

function collect_info_for_dl(e) {
  var parser = document.createElement('a');
  parser.href = e.target.closest("article").querySelector("header a").href;

  var bio = document.getElementsByClassName(bio_class);
  if (bio.length > 0) {
    bio = bio[0].textContent;
  } else {
    bio = '';
  }

  var pic_url = '';
  var vid_url = '';
  var vid_pic_url = '';
  var username = '';
  var post = '';
  var timestamp = '';
  var location = '';
  var article = '';

  try {
    pic_url = e.target.closest(pic_url_closest).querySelector(pic_url_qs).src;
  } catch (e) { console.warn(`igcs.js: couldn't find pic_url_qs ${e}`); }
  try {
    vid_url = e.target.closest(vid_url_closest).querySelector(vid_url_qs).src;
    vid_pic_url = e.target.closest(vid_url_closest).querySelector(vid_pic_url_qs).src;
  } catch (e) { console.warn(`igcs.js: couldn't find vid_url_qs or vid_pic_url_qs ${e}`); }
  try {
    username = parser.pathname.replace("/","").replace("/","");
  } catch (e) { console.error(`igcs.js: couldn't identify username ${e}`); }
  try {
    post = e.target.closest(post_closest).querySelector(post_qs).textContent;
  } catch (e) { console.warn(`igcs.js: couldn't find post_qs ${e}`); }
  try {
    timestamp = e.target.closest(timestamp_closest).querySelector(timestamp_qs).attributes["datetime"].value;
  } catch (e) { console.error(`igcs.js: couldn't find timestamp_qs ${e}`); }
  try {
    location = e.target.closest(location_closest).querySelector(location_qs).textContent;
  } catch (e) { console.warn(`igcs.js: couldn't find location_qs ${e}`); }

  sha256(pic_url+vid_url).then(function(digest) {
    if (write_log) console.log(`igcs.js: hash for current article ${digest}`);

    try {
      article = e.target.closest(pic_url_closest);
    } catch (e) { console.warn(`igcs.js: couldn't find pic_url_closest ${e}`); }
    var digest_attribute = document.createAttribute('data-igdl_id');
    digest_attribute.value = digest;
    article.setAttributeNode(digest_attribute);

    if (write_log) console.log(`igcs.js: sending download message`);
    browser.runtime.sendMessage({
      "msg": "store_pic",
      "url": pic_url || [vid_url, vid_pic_url],
      "user": username,
      "post": post,
      "bio": bio,
      "timestamp": timestamp,
      "location": location,
      "digest": digest
    });
  });
}

// Load config
function loadOptions(callback_function) {

  function setCurrentChoice(result) {
    if (write_log) console.log("igcs.js: loading config");
    pic_url_closest = result.pic_url_closest || "article";
    pic_url_qs = result.pic_url_qs || "img.FFVAD";
    vid_url_closest = result.vid_url_closest || "article";
    vid_url_qs = result.vid_url_qs || "video.tWeCl";
    vid_pic_url_qs = result.vid_pic_url_qs || "img._8jZFn";
    post_closest = result.post_closest || "article > div";
    post_qs = result.post_qs || "div > ul > li > span";
    timestamp_closest = result.timestamp_closest || "article";
    timestamp_qs = result.timestamp_qs || "time";
    location_closest = result.location_closest || "article";
    location_qs = result.location_qs || "header div.M30cS a";
    heart_icon_class = result.heart_icon_class || "coreSpriteHeartFull";
    store_icon_class = result.store_icon_class || "coreSpriteSaveFull";
    bio_class = result.bio_class || "-vDIg";
    action_bar_qs = result.action_bar_qs || ".Slqrh";
    write_log = result.write_log || false;
    if (callback_function != undefined) callback_function();
  }

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  var getting = browser.storage.local.get([
    "pic_url_closest",
    "pic_url_qs",
    "vid_url_closest",
    "vid_url_qs",
    "vid_pic_url_qs",
    "post_closest",
    "post_qs",
    "timestamp_closest",
    "timestamp_qs",
    "location_closest",
    "location_qs",
    "heart_icon_class",
    "store_icon_class",
    "bio_class",
    "action_bar_qs",
    "write_log"
  ]);
  getting.then(setCurrentChoice, onError);
}

// Listen to messages from the backend
browser.runtime.onMessage.addListener(request => {
  switch (request.msg) {
    case "reload_config":
      if (write_log) console.log("igcs.js: config changed");
      loadOptions();
      break;
    case "download_started":
      getNoticeSection(request.digest).appendChild(generateIcon(request));
      break;
    case "download_completed":
      var icon = document.body.querySelector('article[data-igdl_id="'+request.digest+'"] ul.igcs-notice li[class~="'+request.artefact_icon+'"] svg');
      if (write_log) console.log(`igcs.js: Download completed for: ${request.artefact_icon}`);
      icon.classList.remove('dl-waiting');
      icon.classList.add('dl-done');
      break;
    default:
      if (write_log) console.log(`igcs.js: Received unhandled message: ${request}`);
  }
});

function getNoticeSection(digest) {
  return document.body.querySelector('article[data-igdl_id="'+digest+'"] ul.igcs-notice');
}

function generateIcon(request) {
  var icon_div = document.createElement('li');
  icon_div.setAttribute('class', 'fa-li ' + request.artefact_icon);
  var icon = document.createElement('i');
  icon.setAttribute('class', 'dl-waiting far fa-fw fa-' + request.artefact_icon);
  icon.setAttribute('title', request.artefact_type);
  icon_div.appendChild(icon);
  return icon_div;
//  return icon_div.appendChild(icon.cloneNode(true)).cloneNode(true);
}

function sha256(str) {
  // We transform the string into an arraybuffer.
  var buffer = new TextEncoder("utf-8").encode(str);
  return crypto.subtle.digest("SHA-256", buffer).then(function (hash) {
    return hex(hash);
  });
}

function hex(buffer) {
  var hexCodes = [];
  var view = new DataView(buffer);
  for (var i = 0; i < view.byteLength; i += 4) {
    // Using getUint32 reduces the number of iterations needed (we process 4 bytes each time)
    var value = view.getUint32(i)
    // toString(16) will give the hex representation of the number without padding
    var stringValue = value.toString(16)
    // We use concatenation and slice for padding
    var padding = '00000000'
    var paddedValue = (padding + stringValue).slice(-padding.length)
    hexCodes.push(paddedValue);
  }

  // Join all the hex strings into one
  return hexCodes.join("");
}
