import { decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
import type { HrlB64WithContext, HrlWithContext } from "@lightningrodlabs/we-applet";

export function onVisible(element, callback) {
    new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
        if(entry.intersectionRatio > 0) {
            callback(element);
        }
        });
    }).observe(element);
}

export function hrlWithContextToB64(hrl: HrlWithContext): HrlB64WithContext {
  return {
    hrl: [encodeHashToBase64(hrl.hrl[0]), encodeHashToBase64(hrl.hrl[1])],
    context: hrl.context,
  };
}
  
export function hrlB64WithContextToRaw(hrlB64: HrlB64WithContext): HrlWithContext {
  return {
    hrl: [decodeHashFromBase64(hrlB64.hrl[0]), decodeHashFromBase64(hrlB64.hrl[1])],
    context: hrlB64.context,
  };
}