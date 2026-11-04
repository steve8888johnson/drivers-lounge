import{readRoutingPolicy}from'../src/assets/routing/routing-policy.mjs';
import{readRoutingProviderReadiness}from'../src/assets/routing/provider-readiness.mjs';

const yes=value=>/^(?:1|true|yes|on)$/i.test(String(value||'').trim());
const release=yes(process.env.DL_RELEASE),policy=readRoutingPolicy(process.env);
const readiness=readRoutingProviderReadiness(process.env,policy);
console.log(`Routing provider readiness: ${readiness.status}.`);
for(const provider of readiness.providers){
 const source=provider.configured?` via ${provider.source}`:'';
 const issues=provider.issues.length?` (${provider.issues.join(', ')})`:'';
 const credential=`credential ${provider.credentialState}/${provider.credentialIssue}${provider.credentialNormalized?' normalized':''}`;
 console.log(`- ${provider.label}: ${provider.state} [${credential}]${source}${issues}`);
}
console.log(`Operational providers: ${readiness.activeProviderCount}; independent providers: ${readiness.independentProviderCount}; preview eligible: ${readiness.previewEligible}; release eligible: ${readiness.releaseEligible}.`);
if(readiness.blockers.length)console.log(`Blockers: ${readiness.blockers.join(', ')}.`);
const invalid=readiness.blockers.some(code=>['invalid_provider_credentials','conflicting_provider_aliases','duplicate_provider_credentials'].includes(code));
if(invalid&&release){console.error('Routing provider configuration is unsafe. Correct the server-side environment variables before releasing.');process.exit(1);}
if(invalid&&!release)console.warn('Routing provider configuration is invalid. Preview deployment may continue, but routing remains fail-closed.');
if(release&&!readiness.releaseEligible){
 console.error('Release routing gate failed. Production guidance requires two distinct, valid professional truck-routing provider credentials and no active kill switch.');
 process.exit(1);
}
if(!release&&!readiness.previewEligible)console.warn('Routing remains fail-closed; this build can be reviewed but cannot provide live guidance.');
else if(!release&&!readiness.crossCheckConfigured)console.warn('Preview has only one verified provider credential. Routes remain explicitly single-provider/unverified.');
else console.log('Routing provider gate passed.');
