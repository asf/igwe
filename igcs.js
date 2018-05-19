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

window.addEventListener("click", notifyExtension);
loadOptions(); // Load config when we get injected into the page
addStoreIcon();

function addStoreIcon() {
  var a = document.createElement('a');
  var cl = document.createAttribute('class');
  cl.value = '_p6oxf _6p9ga';
  a.setAttributeNode(cl);

  var img = document.createElement('img');
  var src = document.createAttribute('src');
  var style = document.createAttribute('style');
  cl = document.createAttribute('class');
  src.value = browser.extension.getURL('floppy-o.png');
  style.value = 'width:28px;height:28px;';
  cl.value = 'storeimg';
  img.setAttributeNode(src);
  img.setAttributeNode(style);
  img.setAttributeNode(cl);
  a.appendChild(img);

  var iterator = document.evaluate('//*[contains(@class, "_hmd6j")]',
                                   document, null,
                                   XPathResult.UNORDERED_NODE_ITERATOR_TYPE,
                                   null);

  var is = iterator.iterateNext();

  while (is) {
    is.appendChild(a);
    is = iterator.iterateNext();
  }
}

// Handle click on heart to download image
function notifyExtension(e) {
  console.log(`igcs.js: click on ${e}`);
  if (e.target.classList.contains("coreSpriteSaveFull") || e.target.classList.contains("coreSpriteHeartFull") || e.target.classList.contains('storeimg')) {
    var parser = document.createElement('a');
    parser.href = e.target.closest("article").querySelector("header a").href;

    var bio = document.getElementsByClassName("_bugdy");
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

    try {
      pic_url = e.target.closest(pic_url_closest).querySelector(pic_url_qs).src;
    } catch (e) {}
    try {
      vid_url = e.target.closest(vid_url_closest).querySelector(vid_url_qs).src;
      vid_pic_url = e.target.closest(vid_url_closest).querySelector(vid_pic_url_qs).src;
    } catch (e) {}
    try {
      username = parser.pathname.replace("/","").replace("/","");
    } catch (e) {}
    try {
      post = e.target.closest(post_closest).querySelector(post_qs).textContent;
    } catch (e) {}
    try {
      timestamp = e.target.closest(timestamp_closest).querySelector(timestamp_qs).attributes["datetime"].value;
    } catch (e) {}
    try {
      location = e.target.closest(location_closest).querySelector(location_qs).textContent;
    } catch (e) {}

    browser.runtime.sendMessage({
      "msg": "store_pic",
      "url": pic_url || [vid_url, vid_pic_url],
      "user": username,
      "post": post,
      "bio": bio,
      "timestamp": timestamp,
      "location": location
    });
  }
}

// Load config
function loadOptions() {

  function setCurrentChoice(result) {
    console.log("igcs.js: loading config");
    pic_url_closest = result.pic_url_closest || "article";
    pic_url_qs = result.pic_url_qs || "img._2di5p";
    vid_url_closest = result.vid_url_closest || "article";
    vid_url_qs = result.vid_url_qs || "video._l6uaz";
    vid_pic_url_qs = result.vid_pic_url_qs || "img._sajt6";
    post_closest = result.post_closest || "article > div";
    post_qs = result.post_qs || "div > ul > li > span";
    timestamp_closest = result.timestamp_closest || "article";
    timestamp_qs = result.timestamp_qs || "time";
    location_closest = result.location_closest || "article";
    location_qs = result.location_qs || "header div._60iqg a";
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
    "location_qs"
  ]);
  getting.then(setCurrentChoice, onError);
}

// Listen to changed in the configuration
browser.runtime.onMessage.addListener(request => {
  if (request.msg === "reload_config") {
    console.log("igcs.js: config changed");
    loadOptions();
  }
});
