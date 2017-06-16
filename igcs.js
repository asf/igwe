window.addEventListener("click", notifyExtension);

function notifyExtension(e) {
  console.log("igcs.js: click on ${e}");
  if (e.target.classList.contains("coreSpriteLikeHeartFull")) {
    var parser = document.createElement('a');
    parser.href = e.target.closest("article").querySelector("header a").href;

    var bio = document.getElementsByClassName("_bugdy");
    if (bio.length > 0) {
      bio = bio[0].textContent;
    } else {
      bio = '';
    }

    var pic_url = '';
    var username = '';
    var post = '';
    var timestamp = '';
    var location = '';

    try {
      pic_url = e.target.closest("article").querySelector("img._icyx7").src;
    } catch (e) {}
    try {
      username = parser.pathname.replace("/","").replace("/","");
    } catch (e) {}
    try {
      post = e.target.closest("article > div").querySelector("div > ul > li > span").textContent;
    } catch (e) {}
    try {
      timestamp = e.target.closest("article").querySelector("time").attributes['datetime'].value;
    } catch (e) {}
    try {
      location = e.target.closest('article').querySelector('header div div a').textContent;
    } catch (e) {}

    browser.runtime.sendMessage({
      "url": pic_url,
      "user": username,
      "post": post,
      "bio": bio,
      "timestamp": timestamp,
      "location": location
    });
  }
}
