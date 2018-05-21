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
var observer;
var iconsAdded = [];

window.addEventListener("click", notifyExtension);
loadOptions(); // Load config when we get injected into the page
addMutationObserver();
addStoreIcon();

function addStoreIcon() {
  console.log('igcs.js: Entering addStoreIcon');
  var x = document.body.querySelectorAll('._hmd6j');
  var a;
  for(var i=0; i < x.length; i++ ) {
    if (a === undefined) a = storeIconElement();
    if (!iconsAdded.includes(x[i])) {
      x[i].appendChild(a.cloneNode(true));
      iconsAdded.push(x[i]);
      console.log(`igcs.js: adding store icon to ${x[i]}`);
    }
  }
}

function storeIconElement() {
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
  console.log(`igcs.js: added onserver ${observer}`);
}

// Handle click on heart to download image
function notifyExtension(e) {
  console.log(`igcs.js: click on ${e}`);
  if (e.target.classList.contains(store_icon_class) || e.target.classList.contains(heart_icon_class) || e.target.classList.contains('storeimg')) {
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
    heart_icon_class = result.heart_icon_class || "coreSpriteHeartFull";
    store_icon_class = result.store_icon_class || "coreSpriteSaveFull";
    bio_class = result.bio_class || "_bugdy";
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
    "bio_class"
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
