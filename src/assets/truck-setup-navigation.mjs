import {mountSetupAccount} from './truck-setup-account.mjs';
const truck=window.DLTruckFirst;
const account=mountSetupAccount({element:document.getElementById('setup-account'),kind:'standard',read:truck.values,validate:truck.validate,apply:truck.applyAccount,reset:truck.resetAccount,automatic:()=>!truck.edited()});
window.addEventListener('dl-setup-confirmed',()=>void account.save());
