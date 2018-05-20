function saveOptions(e) {
  e.preventDefault();
  browser.storage.local.set({
    pic_url_closest: document.querySelector("#pic_url_closest").value,
    pic_url_qs: document.querySelector("#pic_url_qs").value,
    vid_url_closest: document.querySelector("#vid_url_closest").value,
    vid_url_qs: document.querySelector("#vid_url_qs").value,
    vid_pic_url_qs: document.querySelector("#vid_pic_url_qs").value,
    post_closest: document.querySelector("#post_closest").value,
    post_qs: document.querySelector("#post_qs").value,
    timestamp_closest: document.querySelector("#timestamp_closest").value,
    timestamp_qs: document.querySelector("#timestamp_qs").value,
    location_closest: document.querySelector("#location_closest").value,
    location_qs: document.querySelector("#location_qs").value,
    heart_icon_class: document.querySelector("#heart_icon_class").value,
    store_icon_class: document.querySelector("#store_icon_class").value,
    bio_class: document.querySelector("#bio_class").value
  }).then(result =>  {
    // Let the backend know that we changed the configuration
    document.querySelector("#success_bar").style.display = "block";
    browser.runtime.sendMessage({"msg": "updated_config"});
  });
}

function restoreOptions() {

  function setCurrentChoice(result) {
    document.querySelector("#pic_url_closest").value = result.pic_url_closest || "article";
    document.querySelector("#pic_url_qs").value = result.pic_url_qs || "img._2di5p";
    document.querySelector("#vid_url_closest").value = result.vid_url_closest || "article";
    document.querySelector("#vid_url_qs").value = result.vid_url_qs || "video._l6uaz";
    document.querySelector("#vid_pic_url_qs").value = result.vid_pic_url_qs || "img.sajt6";
    document.querySelector("#post_closest").value = result.post_closest || "article > div";
    document.querySelector("#post_qs").value = result.post_qs || "div > ul > li > span";
    document.querySelector("#timestamp_closest").value = result.timestamp_closest || "article";
    document.querySelector("#timestamp_qs").value = result.timestamp_qs || "time";
    document.querySelector("#location_closest").value = result.location_closest || "article";
    document.querySelector("#location_qs").value = result.location_qs || "header div._60iqg a";
    document.querySelector("heart_icon_class").value = result.heart_icon_class || "coreSpriteHeartFull";
    document.querySelector("store_icon_class").value = result.store_icon_class || "coreSpriteSaveFull";
    document.querySelector("bio_class").value = result.bio_class || "_bugdy";
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

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);