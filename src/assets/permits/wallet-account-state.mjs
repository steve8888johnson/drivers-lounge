import {uuid} from './cloud-packet.mjs';
const KEY='dl-permit-wallet-last-account';
// Local display preference, never proof for remote requests. Device files are
// already plaintext IndexedDB data. Explicit sign-out removes this preference.
export function rememberWalletOwner(storage,owner){try{if(uuid(owner))storage?.setItem(KEY,owner);else storage?.removeItem(KEY);}catch{/* Browser may disallow preferences. */}}
export function offlineWalletOwner(storage,online){if(online!==false)return null;try{const id=storage?.getItem(KEY);return uuid(id)?id:null;}catch{return null;}}
