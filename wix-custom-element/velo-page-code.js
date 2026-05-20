// Velo Page Code for the Fellépők page
// Paste this into the Page Code panel (bottom of Wix Editor) for the /program page.
//
// This passes the full page URL (including ?eloado= and ?tipus= query params) into
// the custom element, because the element runs in a cross-origin iframe and cannot
// read window.parent.location directly.

import wixLocation from 'wix-location';

$w.onReady(function () {
  // $w('#koloradoLineup') — replace with the actual element ID from your Wix page
  const el = $w('#koloradoLineup');

  // Pass the full current URL to the custom element as the "page-url" attribute
  el.setAttribute('page-url', wixLocation.url);
});
